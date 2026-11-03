import { createHash } from "node:crypto";
import { seedData } from "../../lib/seed";

// Stable IDs let subsequent runs recognize this exact demo without overwriting edits.
export function demoId(key: string): string {
  const bytes = createHash("sha256").update("trohome-demo-v1:" + key).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

export const accounts = [
  { key: "host", username: "demo.host", role: "host" as const, fullName: "Chủ trọ CMC (Demo)", phone: "0900000000", tenantId: null },
  { key: "lan", username: "demo.lan", role: "tenant" as const, fullName: seedData.tenants[0].fullName, phone: seedData.tenants[0].phone, tenantId: demoId("tenant_lan") },
  { key: "minh", username: "demo.minh", role: "tenant" as const, fullName: seedData.tenants[1].fullName, phone: seedData.tenants[1].phone, tenantId: demoId("tenant_minh") },
  { key: "viewer", username: "demo.viewer", role: "viewer" as const, fullName: seedData.inquiries[0].name, phone: seedData.inquiries[0].phone, tenantId: null },
];

export const favorites = [
  { id: demoId("favorite_viewer_201"), userId: demoId("user_viewer"), roomId: demoId("room_201") },
  { id: demoId("favorite_lan_401"), userId: demoId("user_lan"), roomId: demoId("room_401") },
];
export const expectedIds = {
  user: accounts.map(a => demoId("user_" + a.key)),
  property: seedData.properties.map(p => demoId(p.id)),
  room: seedData.rooms.map(r => demoId(r.id)),
  tenant: seedData.tenants.map(t => demoId(t.id)),
  contract: seedData.contracts.map(c => demoId(c.id)),
  invoice: seedData.invoices.map(i => demoId(i.id)),
  inquiry: seedData.inquiries.map(i => demoId(i.id)),
  repairRequest: seedData.repairRequests.map(r => demoId(r.id)),
  favorite: favorites.map(f => f.id),
};
export { seedData };
