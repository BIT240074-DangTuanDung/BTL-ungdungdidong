import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Alert } from 'react-native';
import { initDatabase, loadAppData, saveAppData } from '@/lib/database';
import { validateInvoice } from '@/lib/business';
import { createId } from '@/lib/ids';
import { seedData } from '@/lib/seed';
import type {
  AppData,
  Contract,
  Inquiry,
  Invoice,
  InvoiceStatus,
  RepairRequest,
  RepairStatus,
  Room,
  RoomStatus,
  Tenant,
  User,
  UserRole,
} from '@/lib/types';

const STORAGE_KEY = '@hethongquanlytro/v1';
const USERS_KEY = '@hethongquanlytro/users';

// Đọc danh sách tài khoản đã đăng ký trên thiết bị
async function loadUsers(): Promise<User[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as User[]) : [];
  } catch (error) {
    console.warn('Không đọc được danh sách tài khoản', error);
    return [];
  }
}

// Ghi danh sách tài khoản xuống thiết bị để lần sau đăng nhập lại vẫn còn
async function persistUsers(users: User[]): Promise<void> {
  try {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.warn('Không lưu được danh sách tài khoản', error);
  }
}

// Dữ liệu cũ (đã lưu trên máy) vẫn mang tên/địa chỉ "Nhà trọ Bình Thạnh".
// Cập nhật một lần sang "Phòng trọ CMC" tại Hà Nội khi tải lên.
const LEGACY_PROPERTY_NAME = 'Nhà trọ Bình Thạnh';
const PROPERTY_UPDATE = {
  name: seedData.properties[0]?.name ?? 'Phòng trọ CMC',
  address: seedData.properties[0]?.address ?? '',
};

function applyMigrations(data: AppData): AppData {
  const canonicalById = new Map(seedData.rooms.map((room) => [room.id, room]));

  // Chuẩn hoá phòng đã có: bổ sung loại/ảnh mặc định và đồng bộ mã phòng theo sơ đồ tầng.
  const uniqueRooms = [...new Map(data.rooms.filter((room) => room?.id).map((room) => [String(room.id), room])).values()];
  const rooms = uniqueRooms.map((room) => {
    const canonical = canonicalById.get(room.id);
    const images = (room.images ?? []).filter((uri) =>
      !uri.startsWith('https://coresg-normal.trae.ai/api/ide/v1/text_to_image?')
    );
    if (!canonical) {
      return { ...room, type: room.type ?? 'standard', images };
    }
    return {
      ...room,
      type: room.type ?? canonical.type,
      code: room.code,
      floor: room.floor,
      images,
    };
  });

  return {
    ...data,
    invoices: data.invoices.map(i => ({...i, electricityRate:i.electricityRate ?? data.rooms.find(r=>r.id===i.roomId)?.electricityRate ?? 0, waterRate:i.waterRate ?? data.rooms.find(r=>r.id===i.roomId)?.waterRate ?? 0})),
    rooms,
    properties: data.properties.map((item) =>
      item.name === LEGACY_PROPERTY_NAME ? { ...item, ...PROPERTY_UPDATE } : item
    ),
  };
}

type RentalContextValue = AppData & {
  ready: boolean;
  currentUser: User | null;
  userRole: UserRole;
  currentTenantId?: string;
  login: (username: string, password: string) => Promise<User | null>;
  register: (input: Omit<User, 'id' | 'isDepositPaid'>) => Promise<User | null>;
  logout: () => void;
  verifyHostCode: (code: string) => boolean;
  payDeposit: () => Promise<void>;
  setUserRole: (role: UserRole, tenantId?: string) => void;
  toggleFavorite: (roomId: string) => void;
  property: AppData['properties'][number] | undefined;
  addRoom: (input: Omit<Room, 'id' | 'propertyId'>) => void;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  addTenant: (input: Omit<Tenant, 'id'>) => string;
  updateTenant: (id: string, patch: Partial<Tenant>) => void;
  rentOut: (roomId: string, tenantId: string, startDate: string) => void;
  createContract: (input: {
    roomId: string;
    tenantId: string;
    startDate: string;
    endDate?: string;
    monthlyRent: number;
    deposit: number;
  }) => void;
  vacateRoom: (roomId: string) => void;
  setRoomStatus: (roomId: string, status: RoomStatus, listed?: boolean) => void;
  addInvoice: (input: Omit<Invoice, 'id' | 'createdAt' | 'paidAt'>) => void;
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  addInquiry: (input: Omit<Inquiry, 'id' | 'createdAt' | 'status'>) => void;
  markInquiryContacted: (id: string) => void;
  addRepairRequest: (input: Omit<RepairRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateRepairStatus: (id: string, status: RepairStatus) => void;
  resolveInquiry: (id: string, status: 'accepted' | 'rejected' | 'cancelled') => void;
  resetDemo: () => void;
  activeContractForRoom: (roomId: string) => Contract | undefined;
  tenantById: (id: string) => Tenant | undefined;
  roomById: (id: string) => Room | undefined;
};

const RentalContext = createContext<RentalContextValue | null>(null);

export function RentalProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(seedData);
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRoleState] = useState<UserRole>('viewer'); // Mặc định là Người xem
  const [currentTenantId, setCurrentTenantId] = useState<string | undefined>(undefined);


  const login = useCallback(async (username: string, password: string): Promise<User | null> => {
    const name = username.trim().toLowerCase();

    // 1. Tài khoản chủ trọ mặc định của hệ thống
    if (name === 'admin' && password === '123456') {
      const hostUser: User = {
        id: 'user_host',
        username: 'admin',
        role: 'host',
        fullName: 'Chủ Trọ CMC',
        phone: '0987654321',
        isDepositPaid: true,
      };
      setCurrentUser(hostUser);
      setUserRoleState('host');
      setCurrentTenantId(undefined);
      return hostUser;
    }

    // 2. Tài khoản đã đăng ký trên thiết bị này
    const users = await loadUsers();
    const registered = users.find((item) => item.username === name && item.password === password);
    if (registered) {
      setCurrentUser({...registered, password: undefined});
      setUserRoleState(registered.role);
      setCurrentTenantId(registered.tenantId);
      return registered;
    }

    return null;
  }, []);

  const register = useCallback(
    async (input: Omit<User, 'id' | 'isDepositPaid'>): Promise<User | null> => {
      const username = input.username.trim().toLowerCase();
      const users = await loadUsers();

      // Không cho trùng tên đăng nhập (kể cả tài khoản admin mặc định)
      if (username === 'admin' || users.some((item) => item.username === username)) {
        return null;
      }

      const newUser: User = {
        ...input,
        username,
        id: `user_${Date.now()}`,
        // Người thuê phải đóng cọc mới có đầy đủ quyền, chủ trọ thì không cần
        isDepositPaid: false,
      };

      if (newUser.role === 'tenant') {
        newUser.tenantId = `tenant_${newUser.id}`;
        setData(prev => ({...prev, tenants: [...prev.tenants, {id:newUser.tenantId!,fullName:newUser.fullName,phone:newUser.phone,idNumber:'',note:''}]}));
      }
      await persistUsers([...users, newUser]);
      return newUser;
    },
    []
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setUserRoleState('viewer');
    setCurrentTenantId(undefined);
  }, []);

  const verifyHostCode = useCallback((code: string) => {
    return code === 'CMC2026'; // Mã xác thực chủ trọ cố định cho demo
  }, []);

  const payDeposit = useCallback(async () => {
    if (!currentUser) return;
    const updated: User = { ...currentUser, isDepositPaid: true };
    const users = await loadUsers();
    await persistUsers(users.map((item) => (item.id === updated.id ? { ...item, ...updated, password: item.password } : item)));
    setCurrentUser(updated);
  }, [currentUser]);

  const setUserRole = useCallback((role: UserRole, tenantId?: string) => {
    if (currentUser?.role !== role) return;
    setUserRoleState(role);
    setCurrentTenantId(currentUser.tenantId ?? tenantId);
  }, [currentUser]);

  const toggleFavorite = useCallback(async (roomId: string) => {
    if (!currentUser) return;
    const currentFavorites = currentUser.favorites ?? [];
    const nextFavorites = currentFavorites.includes(roomId)
      ? currentFavorites.filter((id) => id !== roomId)
      : [...currentFavorites, roomId];
    
    const updated: User = { ...currentUser, favorites: nextFavorites };
    const users = await loadUsers();
    await persistUsers(users.map((item) => (item.id === updated.id ? { ...item, ...updated, password: item.password } : item)));
    setCurrentUser(updated);
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as AppData;
          if (Array.isArray(parsed.rooms) && Array.isArray(parsed.tenants)) {
            if (!cancelled) setData(applyMigrations(parsed));
            return;
          }
        }
        // 2. Fallback to SQLite
        const _db = await initDatabase();
        if (!cancelled) setDb(_db);

        const loaded = await loadAppData(_db);
        if (loaded && !cancelled) {
          setData(applyMigrations(loaded));
        } else if (!cancelled) {
          // 3. Fallback to AsyncStorage
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw && !cancelled) {
            const parsed = JSON.parse(raw) as AppData;
            if (parsed?.rooms && parsed?.tenants) {
              const updated = applyMigrations(parsed);
              setData(updated);
            }
          } else {
            setData(seedData);
          }
        }
      } catch (e) {
        console.error('Failed to init data', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveQueue = useRef(Promise.resolve());
  useEffect(() => {
    if (!ready) return;
    saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (db) await saveAppData(db, data);
    }).catch(() => Alert.alert('Chưa lưu được dữ liệu', 'Vui lòng kiểm tra dung lượng thiết bị và thử lại.'));
  }, [data, ready, db]);

  const roleRef = useRef(userRole);
  roleRef.current = userRole;
  const mutate = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => updater(prev));
  }, []);

  const addRoom = useCallback(
    (input: Omit<Room, 'id' | 'propertyId'>) => {
      if (currentUser?.role !== 'host' || userRole !== 'host') return;
      const id = createId('room');
      const propertyId = data.properties[0]?.id ?? 'prop_bt';
      const newRoom: Room = { ...input, id, propertyId };

      mutate((prev) => ({
        ...prev,
        rooms: [...prev.rooms, newRoom],
      }));

    },
    [mutate, data.properties, currentUser, userRole]
  );

  const updateRoom = useCallback(
    (id: string, patch: Partial<Room>) => {
      if (currentUser?.role !== 'host' || userRole !== 'host') return;
      mutate((prev) => ({
        ...prev,
        rooms: prev.rooms.map((room) => (room.id === id ? { ...room, ...patch } : room)),
      }));

    },
    [mutate, currentUser, userRole]
  );

  const deleteRoom = useCallback(
    (id: string) => {
      if (roleRef.current !== 'host') return ;
      mutate((prev) => ({
        ...prev,
        rooms: prev.rooms.filter((room) => room.id !== id),
      }));
    },
    [mutate]
  );

  const addTenant = useCallback(
    (input: Omit<Tenant, 'id'>) => {
      if (roleRef.current !== 'host') return '';
      const id = createId('tenant');
      const newTenant: Tenant = { ...input, id };
      mutate((prev) => ({
        ...prev,
        tenants: [...prev.tenants, newTenant],
      }));
      return id;
    },
    [mutate]
  );

  const updateTenant = useCallback(
    (id: string, patch: Partial<Tenant>) => {
      if (roleRef.current !== 'host') return ;
      mutate((prev) => ({
        ...prev,
        tenants: prev.tenants.map((tenant) => (tenant.id === id ? { ...tenant, ...patch } : tenant)),
      }));
    },
    [mutate]
  );

  // Lập hợp đồng thuê với đầy đủ thông tin (giá thuê, tiền cọc, ngày bắt đầu, ngày kết thúc).
  const createContract = useCallback(
    (input: {
      roomId: string;
      tenantId: string;
      startDate: string;
      endDate?: string;
      monthlyRent: number;
      deposit: number;
    }) => {
      if (roleRef.current !== 'host') return;
      mutate((prev) => {
        if (!prev.rooms.some((item) => item.id === input.roomId && ['vacant', 'reserved'].includes(item.status)) || prev.contracts.some(c => c.roomId === input.roomId && c.active)) return prev;

        const newContract: Contract = {
          id: createId('ct'),
          roomId: input.roomId,
          tenantId: input.tenantId,
          startDate: input.startDate,
          endDate: input.endDate,
          monthlyRent: input.monthlyRent,
          deposit: input.deposit,
          active: true,
        };

        // Đồng bộ thông tin khách thuê và hợp đồng lên API.


        return {
          ...prev,
          rooms: prev.rooms.map((item) =>
            item.id === input.roomId ? { ...item, status: 'occupied' as const, listed: false } : item
          ),
          contracts: [
            ...prev.contracts.map((contract) =>
              contract.roomId === input.roomId && contract.active ? { ...contract, active: false } : contract
            ),
            newContract,
          ],
        };
      });
    },
    [mutate]
  );

  const addRepairRequest = useCallback(
    (input: Omit<RepairRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
      const id = createId('rep');
      const now = new Date().toISOString();
      const newRequest: RepairRequest = {
        ...input,
        id,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      mutate((prev) => ({
        ...prev,
        repairRequests: [newRequest, ...prev.repairRequests],
      }));
    },
    [mutate]
  );

  const updateRepairStatus = useCallback(
    (id: string, status: RepairStatus) => {
      if (roleRef.current !== 'host') return ;
      mutate((prev) => ({
        ...prev,
        repairRequests: prev.repairRequests.map((req) =>
          req.id === id ? { ...req, status, updatedAt: new Date().toISOString() } : req
        ),
      }));
    },
    [mutate]
  );

  const rentOut = useCallback(
    (roomId: string, tenantId: string, startDate: string) => {
      const room = data.rooms.find((item) => item.id === roomId);
      if (!room) return;
      createContract({
        roomId,
        tenantId,
        startDate,
        monthlyRent: room.price,
        deposit: room.deposit,
      });
    },
    [data.rooms, createContract]
  );

  const vacateRoom = useCallback(
    (roomId: string) => {
      if (roleRef.current !== 'host') return ;
      mutate((prev) => {
        // API calls

        return {
          ...prev,
          rooms: prev.rooms.map((room) =>
            room.id === roomId ? { ...room, status: 'vacant' as const, listed: true } : room
          ),
          contracts: prev.contracts.map((contract) =>
            contract.roomId === roomId && contract.active ? { ...contract, active: false } : contract
          ),
        };
      });
    },
    [mutate]
  );

  const setRoomStatus = useCallback(
    (roomId: string, status: RoomStatus, listed?: boolean) => {
      if (roleRef.current !== 'host') return ;
      const finalListed = listed ?? (status === 'vacant');
      mutate((prev) => ({
        ...prev,
        rooms: prev.rooms.map((room) =>
          room.id === roomId
            ? { ...room, status, listed: finalListed }
            : room
        ),
      }));
    },
    [mutate]
  );

  const addInvoice = useCallback(
    (input: Omit<Invoice, 'id' | 'createdAt' | 'paidAt'>) => {
      const id = createId('inv');
      const createdAt = new Date().toISOString();
      const paidAt = input.status === 'paid' ? new Date().toISOString() : undefined;
      if (roleRef.current !== 'host') return;
      const error = validateInvoice(input, data.invoices);
      if (error) { Alert.alert('Không thể lập hóa đơn', error); return; }
      const room = data.rooms.find(r => r.id === input.roomId);
      const newInvoice: Invoice = { ...input, electricityRate: room?.electricityRate, waterRate: room?.waterRate, id, createdAt, paidAt };

      mutate((prev) => ({
        ...prev,
        invoices: [newInvoice, ...prev.invoices],
      }));
    },
    [mutate, data.rooms, data.invoices]
  );

  const setInvoiceStatus = useCallback(
    (id: string, status: InvoiceStatus) => {
      if (roleRef.current !== 'host') return ;
      if (data.invoices.find(i => i.id === id)?.status === 'paid') return;
      const paidAt = status === 'paid' ? new Date().toISOString() : undefined;
      mutate((prev) => ({
        ...prev,
        invoices: prev.invoices.map((invoice) =>
          invoice.id === id
            ? {
                ...invoice,
                status,
                paidAt,
              }
            : invoice
        ),
      }));
    },
    [mutate, data.invoices]
  );

  const addInquiry = useCallback(
    (input: Omit<Inquiry, 'id' | 'createdAt' | 'status'>) => {
      const id = createId('inq');
      const createdAt = new Date().toISOString();
      if (!currentUser) return;
      if (data.rooms.find(r=>r.id===input.roomId)?.status !== 'vacant' || data.inquiries.some(i=>i.roomId===input.roomId && i.userId===currentUser.id && ['new','contacted','accepted'].includes(i.status))) return;
      const newInquiry: Inquiry = { ...input, userId: currentUser.id, id, createdAt, status: 'new' };

      mutate((prev) => ({
        ...prev,
        inquiries: [newInquiry, ...prev.inquiries],

      }));

    },
    [mutate, currentUser, data.rooms, data.inquiries]
  );

  const markInquiryContacted = useCallback(
    (id: string) => {
      if (roleRef.current !== 'host') return ;
      mutate((prev) => ({
        ...prev,
        inquiries: prev.inquiries.map((inquiry) =>
          inquiry.id === id ? { ...inquiry, status: 'contacted' } : inquiry
        ),
      }));
    },
    [mutate]
  );

  const resolveInquiry = useCallback((id: string, status: 'accepted' | 'rejected' | 'cancelled') => {
    mutate(prev => {
      const request = prev.inquiries.find(i => i.id === id);
      if (!request || !['new', 'contacted'].includes(request.status)) return prev;
      if (status === 'cancelled' ? request.userId !== currentUser?.id : roleRef.current !== 'host') return prev;
      if (status === 'accepted' && prev.rooms.find(r => r.id === request.roomId)?.status !== 'vacant') return prev;
      return { ...prev,
        inquiries: prev.inquiries.map(i => i.id === id ? { ...i, status } : status === 'accepted' && i.roomId === request.roomId && ['new','contacted'].includes(i.status) ? { ...i, status: 'rejected' as const } : i),
        rooms: prev.rooms.map(r => status === 'accepted' && r.id === request.roomId ? { ...r, status: 'reserved' as const, listed: false } : r),
      };
    });
  }, [mutate, currentUser]);

  const resetDemo = useCallback(() => {
    if (roleRef.current !== 'host') return;
    setData(seedData);
  }, []);

  const activeContractForRoom = useCallback(
    (roomId: string) => data.contracts.find((contract) => contract.roomId === roomId && contract.active),
    [data.contracts]
  );

  const tenantById = useCallback(
    (id: string) => data.tenants.find((tenant) => tenant.id === id),
    [data.tenants]
  );

  const roomById = useCallback(
    (id: string) => data.rooms.find((room) => room.id === id),
    [data.rooms]
  );

  const value = useMemo<RentalContextValue>(
    () => ({
      ...data,
      ready,
      currentUser,
      userRole,
      currentTenantId,
      login,
      register,
      logout,
      verifyHostCode,
      payDeposit,
      setUserRole,
      toggleFavorite,
      property: data.properties[0],
      addRoom,
      updateRoom,
      deleteRoom,
      addTenant,
      updateTenant,
      rentOut,
      createContract,
      vacateRoom,
      setRoomStatus,
      addInvoice,
      setInvoiceStatus,
      addInquiry,
      markInquiryContacted,
      addRepairRequest,
      updateRepairStatus,
      resolveInquiry,
      resetDemo,
      activeContractForRoom,
      tenantById,
      roomById,
    }),
    [
      data,
      ready,
      currentUser,
      userRole,
      currentTenantId,
      login,
      register,
      logout,
      verifyHostCode,
      payDeposit,
      setUserRole,
      toggleFavorite,
      addRoom,
      updateRoom,
      deleteRoom,
      addTenant,
      updateTenant,
      rentOut,
      createContract,
      vacateRoom,
      setRoomStatus,
      addInvoice,
      setInvoiceStatus,
      addInquiry,
      markInquiryContacted,
      addRepairRequest,
      updateRepairStatus,
      resolveInquiry,
      resetDemo,
      activeContractForRoom,
      tenantById,
      roomById,
    ]
  );

  return <RentalContext.Provider value={value}>{children}</RentalContext.Provider>;
}

export function useRental() {
  const ctx = useContext(RentalContext);
  if (!ctx) {
    throw new Error('useRental must be used within RentalProvider');
  }
  return ctx;
}
