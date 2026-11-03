export type RoomStatus = 'vacant' | 'occupied' | 'reserved' | 'maintenance';
export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue';
export type InquiryStatus = 'new' | 'contacted' | 'accepted' | 'rejected' | 'cancelled';
export type UserRole = 'host' | 'tenant' | 'viewer';
export type RepairStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type User = {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  fullName: string;
  phone: string;
  isDepositPaid: boolean; // Trạng thái đã đóng cọc cho Người thuê
  tenantId?: string; // Liên kết với bảng Tenant nếu là Người thuê
  favorites?: string[]; // Danh sách ID phòng yêu thích
};

export type Property = {
  id: string;
  name: string;
  address: string;
};

export type RoomType = 'premium' | 'standard';

export type Room = {
  id: string;
  propertyId: string;
  type: RoomType;
  code: string;
  floor: number;
  area: number;
  price: number;
  deposit: number;
  electricityRate: number;
  waterRate: number;
  status: RoomStatus;
  amenities: string[];
  description: string;
  listed: boolean;
  maxOccupants: number;
  currentOccupantsCount: number;
  images: string[]; // Danh sách ảnh chi tiết của phòng để người thuê xem
};

export type Tenant = {
  id: string;
  fullName: string;
  phone: string;
  idNumber: string;
  note: string;
};

export type Contract = {
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate?: string; // Ngày kết thúc hợp đồng
  monthlyRent: number;
  deposit: number;
  active: boolean;
};

export type RepairRequest = {
  id: string;
  roomId: string;
  tenantId: string;
  description: string;
  images?: string[];
  status: RepairStatus;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  electricityRate?: number;
  waterRate?: number;
  id: string;
  roomId: string;
  tenantId: string;
  period: string;
  rent: number;
  electricityOld: number;
  electricityNew: number;
  waterOld: number;
  waterNew: number;
  other: number;
  otherNote: string;
  status: InvoiceStatus;
  createdAt: string;
  paidAt?: string;
};

export type Inquiry = {
  userId?: string;
  id: string;
  roomId: string;
  name: string;
  phone: string;
  message: string;
  createdAt: string;
  status: InquiryStatus;
};

export type AppData = {
  properties: Property[];
  rooms: Room[];
  tenants: Tenant[];
  contracts: Contract[];
  invoices: Invoice[];
  inquiries: Inquiry[];
  repairRequests: RepairRequest[];
  isPremiumUser: boolean;
};
