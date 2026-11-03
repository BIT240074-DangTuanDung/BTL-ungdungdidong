import { z } from "zod";
export const id = z.string().uuid();
export const text = z.string().trim().min(1).max(200);
export const phone = z.string().trim().min(5).max(30);
export const password = z
  .string()
  .min(12)
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password must not exceed 72 UTF-8 bytes.",
  );
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9_.-]+$/);
export const money = z.string().regex(/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/);
export const meter = z.string().regex(/^(0|[1-9]\d{0,10})(\.\d{1,3})?$/);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Invalid calendar date");
export const pagination = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
export const pageQuery = z.object(pagination).strict();
export const propertyBody = z
  .object({ name: text, address: z.string().trim().min(1).max(500) })
  .strict();
export const profileBody = z
  .object({ fullName: text.optional(), phone: phone.optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0);
const urls = z
  .array(
    z
      .string()
      .url()
      .max(2048)
      .refine((v) => v.startsWith("https://"), "HTTPS URL required"),
  )
  .max(20);
export const roomBody = z
  .object({
    propertyId: id,
    type: z.enum(["standard", "premium"]).default("standard"),
    code: text,
    floor: z.number().int().min(-10).max(200),
    area: z
      .string()
      .regex(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/)
      .refine((v) => Number(v) > 0),
    price: money,
    deposit: money,
    electricityRate: money,
    waterRate: money,
    amenities: z.array(text).max(50).default([]),
    description: z.string().max(5000).default(""),
    listed: z.boolean().default(false),
    maxOccupants: z.number().int().min(1).max(100).default(1),
    images: urls.default([]),
  })
  .strict();
export const roomPatch = roomBody
  .omit({ propertyId: true })
  // PATCH must never inject create defaults into fields the caller omitted.
  .extend({
    type: roomBody.shape.type.removeDefault(),
    amenities: roomBody.shape.amenities.removeDefault(),
    description: roomBody.shape.description.removeDefault(),
    listed: roomBody.shape.listed.removeDefault(),
    maxOccupants: roomBody.shape.maxOccupants.removeDefault(),
    images: roomBody.shape.images.removeDefault(),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0);
export const roomQuery = z
  .object({
    ...pagination,
    propertyId: id.optional(),
    q: z.string().max(100).optional(),
    type: z.enum(["standard", "premium"]).optional(),
    minPrice: money.optional(),
    maxPrice: money.optional(),
  })
  .strict();
export const contractBody = z
  .object({
    roomId: id,
    tenantId: id,
    startDate: date,
    endDate: date.optional(),
    monthlyRent: money.refine((v) => Number(v) > 0),
    deposit: money,
  })
  .strict()
  .refine(
    (v) => !v.endDate || v.endDate > v.startDate,
    "End must be after start",
  );
export const invoiceBody = z
  .object({
    contractId: id,
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    electricityOld: meter,
    electricityNew: meter,
    waterOld: meter,
    waterNew: meter,
    other: money.default("0"),
    otherNote: z.string().max(1000).default(""),
  })
  .strict()
  .refine(
    (v) =>
      Number(v.electricityNew) >= Number(v.electricityOld) &&
      Number(v.waterNew) >= Number(v.waterOld),
    "Meters must not decrease",
  );
export const inquiryBody = z
  .object({ roomId: id, message: z.string().max(2000).default("") })
  .strict();
export const repairBody = z
  .object({
    roomId: id,
    description: z.string().trim().min(1).max(5000),
    images: urls.default([]),
  })
  .strict();
export function paging(q: z.infer<typeof pageQuery>) {
  return { skip: (q.page - 1) * q.limit, take: q.limit };
}
