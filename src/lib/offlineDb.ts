// IndexedDB wrapper for offline support
const DB_NAME = 'phone_directory_offline';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('session')) db.createObjectStore('session');
      if (!db.objectStoreNames.contains('data')) db.createObjectStore('data');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putItem(store: string, key: string, value: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getItem<T = any>(store: string, key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function removeItem(store: string, key: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Session management
export async function saveSession(accessCode: any) {
  await putItem('session', 'current_user', accessCode);
  // Also save to known codes cache for offline login after logout
  const known = (await getItem<any[]>('session', 'known_codes')) || [];
  const exists = known.find((k: any) => k.code === accessCode.code);
  if (!exists) {
    known.push(accessCode);
  } else {
    Object.assign(exists, accessCode);
  }
  await putItem('session', 'known_codes', known);
}

export async function loadSession() {
  return getItem('session', 'current_user');
}

// Find a known code from cache (for offline login after logout)
export async function findKnownCode(code: string) {
  const known = (await getItem<any[]>('session', 'known_codes')) || [];
  return known.find((k: any) => k.code === code && k.is_active) || null;
}

export async function clearSession() {
  // Only clear active session, keep known_codes for offline login
  await removeItem('session', 'current_user');
}

// Data cache - REMOVED - Only using Supabase now
// export async function saveDataCache(offices: any[], depts: any[], entries: any[]) { }
// export async function loadDataCache(): Promise<...> { }
// export async function clearDataCache() { }

// Check online status
export function isOnline(): boolean {
  return navigator.onLine;
}
