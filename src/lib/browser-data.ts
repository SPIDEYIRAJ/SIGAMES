/**
 * Browser data helpers for the settings screen.
 *
 * Everything here stays on this origin. Two scopes are offered:
 * - preferences: localStorage + sessionStorage only.
 * - everything: preferences plus Cache Storage, IndexedDB and the service
 *   worker — the game builds share this origin, so their saved data goes too.
 */

type DatabaseInfo = { name?: string };

/** Wipes saved preferences and session flags without touching caches. */
export function clearLocalStorage(): void {
  try {
    localStorage.clear();
  } catch {
    // Storage can be blocked by the browser.
  }
  try {
    sessionStorage.clear();
  } catch {
    // Private mode may deny session storage too.
  }
}

/** Full reset: localStorage, sessionStorage, caches, IndexedDB and SW. */
export async function clearEverythingForSiteAndGames(): Promise<void> {
  clearLocalStorage();

  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // Cache Storage is unavailable in some browsers.
  }

  try {
    const factory = indexedDB as IDBFactory & { databases?: () => Promise<DatabaseInfo[]> };
    const databases = factory.databases ? await factory.databases() : [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = request.onerror = request.onblocked = () => resolve();
          }),
      ),
    );
  } catch {
    // IndexedDB may not exist, or another tab may hold a database open.
  }

  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((registrations ?? []).map((registration) => registration.unregister()));
  } catch {
    // No service worker support; nothing to unregister.
  }
}

/** Approximate bytes this origin is using, when the browser reports it. */
export async function readStorageUsage(): Promise<{ used: string; quota: string } | null> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate) return null;
    const format = (bytes?: number) => {
      if (!bytes) return "0 B";
      const units = ["B", "KB", "MB", "GB"];
      const power = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
      return `${(bytes / 1024 ** power).toFixed(power > 1 ? 1 : 0)} ${units[power]}`;
    };
    return { used: format(estimate.usage), quota: format(estimate.quota) };
  } catch {
    return null;
  }
}
