import type { AppData, Room } from './types';

const PROPERTY_ID = 'prop_bt';

// Sinh phòng từ tầng 1 đến tầng 5, mỗi tầng 10 phòng.
// Mã phòng = số tầng + số phòng (101, 102, ..., 510).
function buildRooms(): Room[] {
  const rooms: Room[] = [];
  for (let floor = 1; floor <= 5; floor += 1) {
    for (let index = 1; index <= 10; index += 1) {
      const code = `${floor}${String(index).padStart(2, '0')}`;
      const isPremium = floor >= 4;
      // Giữ 2 phòng đầu đã có khách thuê để khớp hợp đồng mẫu.
      const isOccupied = code === '101' || code === '102';

      rooms.push({
        id: `room_${code}`,
        propertyId: PROPERTY_ID,
        type: isPremium ? 'premium' : 'standard',
        code,
        floor,
        area: isPremium ? 26 : 20,
        price: isPremium ? 3800000 : 3000000,
        deposit: isPremium ? 3800000 : 3000000,
        electricityRate: 3800,
        waterRate: 20000,
        status: isOccupied ? 'occupied' : 'vacant',
        amenities: isPremium
          ? ['Máy lạnh', 'Nóng lạnh', 'Wifi', 'Ban công']
          : ['Quạt', 'Nóng lạnh', 'Wifi'],
        description: `Phòng ${code} tầng ${floor}, ${
          isPremium ? 'cao cấp, rộng rãi có ban công' : 'gọn gàng, thoáng mát'
        }, phù hợp 1–2 người.`,
        listed: !isOccupied,
        maxOccupants: isPremium ? 3 : 2,
        currentOccupantsCount: isOccupied ? 1 : 0,
        images: [],
      });
    }
  }
  return rooms;
}

export const seedData: AppData = {
  properties: [
    {
      id: PROPERTY_ID,
      name: 'Phòng trọ CMC',
      address: 'Số 12 Nguyễn Trãi, Phường Thượng Đình, Quận Thanh Xuân, Hà Nội',
    },
  ],
  rooms: buildRooms(),
  tenants: [
    {
      id: 'tenant_lan',
      fullName: 'Nguyễn Thị Lan',
      phone: '0903123456',
      idNumber: '079301012345',
      note: 'Làm văn phòng, thanh toán đúng hạn.',
    },
    {
      id: 'tenant_minh',
      fullName: 'Trần Quốc Minh',
      phone: '0918111222',
      idNumber: '079199009876',
      note: 'Sinh viên năm 3.',
    },
  ],
  contracts: [
    {
      id: 'ct_101',
      roomId: 'room_101',
      tenantId: 'tenant_lan',
      startDate: '2026-03-01',
      endDate: '2027-03-01',
      monthlyRent: 3500000,
      deposit: 3500000,
      active: true,
    },
    {
      id: 'ct_102',
      roomId: 'room_102',
      tenantId: 'tenant_minh',
      startDate: '2026-06-15',
      endDate: '2026-12-15',
      monthlyRent: 3200000,
      deposit: 3200000,
      active: true,
    },
  ],
  invoices: [
    {
      id: 'inv_101_09',
      roomId: 'room_101',
      tenantId: 'tenant_lan',
      period: '2026-09',
      rent: 3500000,
      electricityOld: 120,
      electricityNew: 165,
      waterOld: 10,
      waterNew: 14,
      other: 0,
      otherNote: '',
      status: 'paid',
      createdAt: '2026-09-30T08:00:00.000Z',
      paidAt: '2026-10-03T09:00:00.000Z',
    },
    {
      id: 'inv_101_10',
      roomId: 'room_101',
      tenantId: 'tenant_lan',
      period: '2026-10',
      rent: 3500000,
      electricityOld: 165,
      electricityNew: 208,
      waterOld: 14,
      waterNew: 18,
      other: 50000,
      otherNote: 'Phí internet',
      status: 'unpaid',
      createdAt: '2026-10-25T08:00:00.000Z',
    },
    {
      id: 'inv_102_10',
      roomId: 'room_102',
      tenantId: 'tenant_minh',
      period: '2026-10',
      rent: 3200000,
      electricityOld: 80,
      electricityNew: 112,
      waterOld: 6,
      waterNew: 9,
      other: 0,
      otherNote: '',
      status: 'overdue',
      createdAt: '2026-10-05T08:00:00.000Z',
    },
  ],
  inquiries: [
    {
      id: 'inq_201',
      roomId: 'room_201',
      name: 'Lê Hoàng Nam',
      phone: '0987654321',
      message: 'Em muốn xem phòng P201 chiều nay được không ạ?',
      createdAt: '2026-10-24T11:20:00.000Z',
      status: 'new',
    },
  ],
  repairRequests: [
    {
      id: 'rep_101',
      roomId: 'room_101',
      tenantId: 'tenant_lan',
      description: 'Vòi nước bồn rửa mặt bị rò rỉ.',
      status: 'pending',
      createdAt: '2026-10-26T14:00:00.000Z',
      updatedAt: '2026-10-26T14:00:00.000Z',
    },
  ],
  isPremiumUser: true,
};
