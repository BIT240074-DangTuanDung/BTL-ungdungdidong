import type { Invoice } from './types';
export function validateInvoice(input: Omit<Invoice, 'id' | 'createdAt' | 'paidAt'>, existing: Invoice[]): string | undefined {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) return 'Kỳ hóa đơn phải có dạng YYYY-MM.';
  if ([input.rent,input.electricityOld,input.electricityNew,input.waterOld,input.waterNew,input.other].some(n=>!Number.isFinite(n)||n<0)) return 'Các khoản tiền và chỉ số phải là số không âm.';
  if (input.electricityNew<input.electricityOld || input.waterNew<input.waterOld) return 'Chỉ số mới không được nhỏ hơn chỉ số cũ.';
  if (existing.some(i=>i.roomId===input.roomId&&i.period===input.period)) return 'Phòng đã có hóa đơn trong kỳ này.';
}
export function paymentMonth(iso?: string): string | undefined {
  if (!iso || !Number.isFinite(Date.parse(iso))) return undefined;
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).formatToParts(new Date(iso));
  return `${parts.find(p=>p.type==='year')?.value}-${parts.find(p=>p.type==='month')?.value}`;
}
