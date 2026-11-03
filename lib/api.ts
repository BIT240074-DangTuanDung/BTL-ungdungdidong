import { AppData, Contract, Inquiry, Invoice, Property, Room, Tenant } from './types';

// Sử dụng Mock API Online (mockapi.io)
const API_BASE_URL = 'https://6ae0527abe3bc8fead96e4cf.mockapi.io'; 

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  // Lấy toàn bộ dữ liệu từ 2 Resource: rooms và invoices
  getAllData: async (): Promise<AppData> => {
    const fetchResource = async <T>(path: string): Promise<T[]> => {
      try {
        return await request<T[]>(path);
      } catch (e: any) {
        // Nếu không tìm thấy resource, trả về mảng rỗng thay vì báo lỗi sập app
        console.warn(`Resource ${path} not found on MockAPI, using empty array.`);
        return [];
      }
    };

    const [roomsRaw, invoices] = await Promise.all([
      fetchResource<any>('/rooms'),
      fetchResource<Invoice>('/invoices'),
    ]);

    const tenants: Tenant[] = [];
    const contracts: Contract[] = [];
    
    // Tách dữ liệu khách thuê và hợp đồng từ trong rooms ra
    const rooms: Room[] = roomsRaw.map(r => {
      if (r.currentTenant) tenants.push(r.currentTenant);
      if (r.currentContract) contracts.push(r.currentContract);
      
      const { currentTenant, currentContract, ...roomData } = r;
      return roomData as Room;
    });

    return { 
      properties: [{
        id: 'prop_bt',
        name: 'Phòng trọ CMC',
        address: 'Số 12 Nguyễn Trãi, Phường Thượng Đình, Quận Thanh Xuân, Hà Nội'
      }], 
      rooms, 
      tenants, 
      contracts, 
      invoices, 
      inquiries: [],
      repairRequests: [],
      isPremiumUser: true
    };
  },

  // Room operations - Cập nhật thông tin phòng kèm khách/hợp đồng nếu có
  addRoom: (room: Room) => request<Room>('/rooms', { method: 'POST', body: JSON.stringify(room) }),
  updateRoom: async (id: string, patch: any) => {
    try {
      return await request<Room>(`/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    } catch (error: any) {
      if (error.message.includes('Not Found') || error.message.includes('not found')) {
        return await request<Room>('/rooms', { method: 'POST', body: JSON.stringify({ ...patch, id }) });
      }
      throw error;
    }
  },
  deleteRoom: (id: string) => request<void>(`/rooms/${id}`, { method: 'DELETE' }),
  
  // Các thao tác khác sẽ được map vào rooms hoặc invoices
  addTenant: async (tenant: Tenant) => {
    // Lưu khách thuê vào bộ nhớ máy hoặc xử lý lồng trong room sau
    return tenant;
  },
  updateTenant: async (id: string, patch: Partial<Tenant>) => {
    return { id, fullName: '', phone: '', idNumber: '', note: '', ...patch };
  },

  addInvoice: (invoice: Invoice) => request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(invoice) }),
  updateInvoice: (id: string, patch: Partial<Invoice>) => request<Invoice>(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  addContract: async (contract: Contract) => {
    return contract;
  },

  addInquiry: async (inquiry: Inquiry) => {
    return inquiry;
  },
  updateInquiry: async (id: string, patch: Partial<Inquiry>) => {
    return { id, roomId: '', name: '', phone: '', message: '', createdAt: '', status: 'new', ...patch };
  },
  
  updateProperty: async (id: string, patch: Partial<Property>) => {
    return { id, name: '', address: '', ...patch };
  },

  // Hàm bổ trợ để đồng bộ khách/hợp đồng vào room
  syncRoomWithDetails: (roomId: string, tenant?: Tenant, contract?: Contract) => {
    return request<any>(`/rooms/${roomId}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ currentTenant: tenant, currentContract: contract }) 
    });
  }
};
