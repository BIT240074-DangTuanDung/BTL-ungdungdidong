import { AppData } from './types';

// Trên Web chúng ta không sử dụng SQLite
export async function initDatabase() {
  return null;
}

export async function saveAppData(db: any, data: AppData) {
  // No-op on web
}

export async function loadAppData(db: any): Promise<AppData | null> {
  return null;
}
