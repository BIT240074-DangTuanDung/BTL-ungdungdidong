import type { InvoiceStatus, RoomStatus } from './types';

export function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function currentPeriod(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  return `Tháng ${Number(month)}/${year}`;
}

export function calcInvoiceTotal(
  invoice: {
    electricityRate?: number;
    waterRate?: number;
    rent: number;
    electricityOld: number;
    electricityNew: number;
    waterOld: number;
    waterNew: number;
    other: number;
  },
  electricityRate: number,
  waterRate: number
): number {
  const kwh = Math.max(0, invoice.electricityNew - invoice.electricityOld);
  const m3 = Math.max(0, invoice.waterNew - invoice.waterOld);
  return invoice.rent + kwh * (invoice.electricityRate ?? electricityRate) + m3 * (invoice.waterRate ?? waterRate) + invoice.other;
}

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  vacant: 'Trống',
  occupied: 'Đang thuê',
  reserved: 'Giữ chỗ',
  maintenance: 'Sửa chữa',
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  unpaid: 'Chưa thu',
  paid: 'Đã thu',
  overdue: 'Quá hạn',
};
