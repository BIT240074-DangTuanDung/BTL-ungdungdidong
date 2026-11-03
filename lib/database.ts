import * as SQLite from 'expo-sqlite';
import { AppData, Contract, Inquiry, Invoice, Property, RepairRequest, Room, Tenant } from './types';

const DB_NAME = 'hethongquanlytro.db';

export async function initDatabase() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY NOT NULL,
      propertyId TEXT NOT NULL,
      type TEXT NOT NULL,
      code TEXT NOT NULL,
      floor INTEGER NOT NULL,
      area REAL NOT NULL,
      price REAL NOT NULL,
      deposit REAL NOT NULL,
      electricityRate REAL NOT NULL,
      waterRate REAL NOT NULL,
      status TEXT NOT NULL,
      amenities TEXT NOT NULL,
      description TEXT,
      listed INTEGER NOT NULL,
      maxOccupants INTEGER NOT NULL DEFAULT 1,
      currentOccupantsCount INTEGER NOT NULL DEFAULT 1,
      images TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY NOT NULL,
      fullName TEXT NOT NULL,
      phone TEXT NOT NULL,
      idNumber TEXT NOT NULL,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY NOT NULL,
      roomId TEXT NOT NULL,
      tenantId TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT,
      monthlyRent REAL NOT NULL,
      deposit REAL NOT NULL,
      active INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS repair_requests (
      id TEXT PRIMARY KEY NOT NULL,
      roomId TEXT NOT NULL,
      tenantId TEXT NOT NULL,
      description TEXT NOT NULL,
      images TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY NOT NULL,
      roomId TEXT NOT NULL,
      tenantId TEXT NOT NULL,
      period TEXT NOT NULL,
      rent REAL NOT NULL,
      electricityOld REAL NOT NULL,
      electricityNew REAL NOT NULL,
      waterOld REAL NOT NULL,
      waterNew REAL NOT NULL,
      other REAL NOT NULL,
      otherNote TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      paidAt TEXT
    );
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY NOT NULL,
      roomId TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);

  // Migration: Add missing columns to rooms table if they don't exist
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>("PRAGMA table_info(rooms)");
    const columnNames = tableInfo.map(c => c.name);
    
    if (!columnNames.includes('maxOccupants')) {
      await db.execAsync("ALTER TABLE rooms ADD COLUMN maxOccupants INTEGER NOT NULL DEFAULT 1");
    }
    if (!columnNames.includes('currentOccupantsCount')) {
      await db.execAsync("ALTER TABLE rooms ADD COLUMN currentOccupantsCount INTEGER NOT NULL DEFAULT 1");
    }
    if (!columnNames.includes('images')) {
      await db.execAsync("ALTER TABLE rooms ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
    }

    const contractInfo = await db.getAllAsync<{ name: string }>("PRAGMA table_info(contracts)");
    if (!contractInfo.map(c => c.name).includes('endDate')) {
      await db.execAsync("ALTER TABLE contracts ADD COLUMN endDate TEXT");
    }
  } catch (e) {
    console.error('Migration failed:', e);
  }

  return db;
}

export async function saveAppData(db: SQLite.SQLiteDatabase, data: AppData) {
  try {
    await db.withTransactionAsync(async () => {
      // Clear existing data
      await db.runAsync('DELETE FROM properties');
      await db.runAsync('DELETE FROM rooms');
      await db.runAsync('DELETE FROM tenants');
      await db.runAsync('DELETE FROM contracts');
      await db.runAsync('DELETE FROM invoices');
      await db.runAsync('DELETE FROM inquiries');
      await db.runAsync('DELETE FROM repair_requests');

      // Insert fresh data
      for (const p of data.properties) {
        await db.runAsync(
          'INSERT OR REPLACE INTO properties (id, name, address) VALUES (?, ?, ?)',
          [p.id, p.name, p.address]
        );
      }
      for (const r of data.rooms) {
        await db.runAsync(
          'INSERT OR REPLACE INTO rooms (id, propertyId, type, code, floor, area, price, deposit, electricityRate, waterRate, status, amenities, description, listed, maxOccupants, currentOccupantsCount, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            r.id,
            r.propertyId,
            r.type,
            r.code,
            r.floor,
            r.area,
            r.price,
            r.deposit,
            r.electricityRate,
            r.waterRate,
            r.status,
            JSON.stringify(r.amenities),
            r.description,
            r.listed ? 1 : 0,
            r.maxOccupants || 1,
            r.currentOccupantsCount || 1,
            JSON.stringify(r.images ?? []),
          ]
        );
      }
      for (const t of data.tenants) {
        await db.runAsync(
          'INSERT OR REPLACE INTO tenants (id, fullName, phone, idNumber, note) VALUES (?, ?, ?, ?, ?)',
          [t.id, t.fullName, t.phone, t.idNumber, t.note]
        );
      }
      for (const c of data.contracts) {
        await db.runAsync(
          'INSERT OR REPLACE INTO contracts (id, roomId, tenantId, startDate, endDate, monthlyRent, deposit, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [c.id, c.roomId, c.tenantId, c.startDate, c.endDate || null, c.monthlyRent, c.deposit, c.active ? 1 : 0]
        );
      }
      for (const i of data.invoices) {
        await db.runAsync(
          'INSERT OR REPLACE INTO invoices (id, roomId, tenantId, period, rent, electricityOld, electricityNew, waterOld, waterNew, other, otherNote, status, createdAt, paidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [i.id, i.roomId, i.tenantId, i.period, i.rent, i.electricityOld, i.electricityNew, i.waterOld, i.waterNew, i.other, i.otherNote, i.status, i.createdAt, i.paidAt || null]
        );
      }
      for (const inq of data.inquiries) {
        await db.runAsync(
          'INSERT OR REPLACE INTO inquiries (id, roomId, name, phone, message, createdAt, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [inq.id, inq.roomId, inq.name, inq.phone, inq.message, inq.createdAt, inq.status]
        );
      }
      for (const rr of data.repairRequests) {
        await db.runAsync(
          'INSERT OR REPLACE INTO repair_requests (id, roomId, tenantId, description, images, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [rr.id, rr.roomId, rr.tenantId, rr.description, JSON.stringify(rr.images ?? []), rr.status, rr.createdAt, rr.updatedAt]
        );
      }
    });
  } catch (error) {
    console.error('Database transaction failed:', error);
    throw error;
  }
}

export async function loadAppData(db: SQLite.SQLiteDatabase): Promise<AppData | null> {
  const properties = await db.getAllAsync<Property>('SELECT * FROM properties');
  if (properties.length === 0) return null;

  const roomsRaw = await db.getAllAsync<any>('SELECT * FROM rooms');
  const rooms: Room[] = roomsRaw.map(r => ({
    ...r,
    amenities: JSON.parse(r.amenities),
    listed: !!r.listed,
    images: r.images ? JSON.parse(r.images) : []
  }));

  const tenants = await db.getAllAsync<Tenant>('SELECT * FROM tenants');
  
  const contractsRaw = await db.getAllAsync<any>('SELECT * FROM contracts');
  const contracts: Contract[] = contractsRaw.map(c => ({
    ...c,
    active: !!c.active
  }));

  const invoices = await db.getAllAsync<Invoice>('SELECT * FROM invoices');
  const inquiries = await db.getAllAsync<Inquiry>('SELECT * FROM inquiries');
  const repairRequestsRaw = await db.getAllAsync<any>('SELECT * FROM repair_requests');
  const repairRequests: RepairRequest[] = repairRequestsRaw.map(rr => ({
    ...rr,
    images: JSON.parse(rr.images)
  }));

  return {
    properties,
    rooms,
    tenants,
    contracts,
    invoices,
    inquiries,
    repairRequests,
    isPremiumUser: true
  };
}
