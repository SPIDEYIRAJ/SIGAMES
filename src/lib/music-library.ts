/**
 * Local soundtrack library.
 *
 * Players can point SI GAMES at song folders on their own device. Chromium
 * browsers expose the File System Access API, so folder handles are stored in
 * IndexedDB and reconnected on later visits. Everywhere else (and whenever an
 * embedded preview blocks the picker) the same folders can be loaded through
 * the browser's folder input for the current tab only.
 */

export interface TrackFile {
  name: string;
  file: File;
}

export interface LibraryFolder {
  id: string;
  name: string;
  stored: boolean;
  tracks: TrackFile[];
}

export interface SavedFolderRecord {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
}

type PermissionName = "granted" | "denied" | "prompt";

type HandleWithPermissions = FileSystemHandle & {
  queryPermission?: (options?: { mode?: "read" }) => Promise<PermissionName>;
  requestPermission?: (options?: { mode?: "read" }) => Promise<PermissionName>;
};

type DirectoryWithEntries = FileSystemDirectoryHandle & {
  values: () => AsyncIterableIterator<FileSystemHandle>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: "read" }) => Promise<FileSystemDirectoryHandle>;
  }
}

const DB_NAME = "si-games-music";
const DB_VERSION = 1;
const STORE = "folders";
const MAX_TRACKS = 400;
const AUDIO_PATTERN = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

/** Fires whenever the library changes (folder added, removed, reconnected). */
export const MUSIC_LIBRARY_EVENT = "si-games-music-library-change";

/** Session-only folders loaded through the fallback file input. */
let sessionFolders: Array<{ id: string; name: string; tracks: TrackFile[] }> = [];

export function supportsFolderPicker(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export function isAudioFile(name: string): boolean {
  return AUDIO_PATTERN.test(name);
}

function prettyName(name: string): string {
  return name.replace(/\.[^./]+$/, "").replace(/[_-]+/g, " ").trim() || name;
}

function announce(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MUSIC_LIBRARY_EVENT));
  }
}

/* ------------------------------------------------------------------ */
/* IndexedDB: persisted folder handles                                  */
/* ------------------------------------------------------------------ */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function listSavedFolders(): Promise<SavedFolderRecord[]> {
  try {
    const rows = await withStore<SavedFolderRecord[]>("readonly", (store) => store.getAll() as IDBRequest<SavedFolderRecord[]>);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function saveFolder(handle: FileSystemDirectoryHandle): Promise<SavedFolderRecord> {
  // Re-picking the same folder should not create a duplicate row.
  const existing = await listSavedFolders();
  const duplicate = existing.find((folder) => folder.name === handle.name);
  if (duplicate) {
    announce();
    return duplicate;
  }

  const record: SavedFolderRecord = {
    // Handles have no useful id; the name plus a timestamp identifies the row.
    id: `${handle.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: handle.name,
    handle,
  };
  await withStore("readwrite", (store) => store.put(record) as IDBRequest<IDBValidKey>);
  announce();
  return record;
}

export async function removeSavedFolder(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id) as IDBRequest<undefined>);
  announce();
}

async function permissionState(handle: FileSystemDirectoryHandle): Promise<PermissionName> {
  const target = handle as HandleWithPermissions;
  try {
    if (typeof target.queryPermission === "function") {
      return await target.queryPermission({ mode: "read" });
    }
  } catch {
    // Older builds: assume the handle is usable and let enumeration decide.
  }
  return "granted";
}

async function ensurePermission(handle: FileSystemDirectoryHandle, request: boolean): Promise<boolean> {
  const state = await permissionState(handle);
  if (state === "granted") return true;
  if (state === "denied" || !request) return false;
  const target = handle as HandleWithPermissions;
  try {
    return (await target.requestPermission?.({ mode: "read" })) === "granted";
  } catch {
    return false;
  }
}

async function collectTracks(
  directory: FileSystemDirectoryHandle,
  depth: number,
  out: TrackFile[],
  onTrack?: (count: number) => void
): Promise<void> {
  if (out.length >= MAX_TRACKS) return;
  const dir = directory as DirectoryWithEntries;
  if (typeof dir.values !== "function") return;
  try {
    for await (const entry of dir.values()) {
      if (out.length >= MAX_TRACKS) return;
      if (entry.kind === "file") {
        const fileHandle = entry as FileSystemFileHandle;
        if (!isAudioFile(fileHandle.name)) continue;
        try {
          out.push({ name: prettyName(fileHandle.name), file: await fileHandle.getFile() });
          onTrack?.(out.length);
        } catch {
          // A file can vanish between listing and reading; skip it.
        }
      } else if (depth < 2) {
        await collectTracks(entry as FileSystemDirectoryHandle, depth + 1, out, onTrack);
      }
    }
  } catch {
    // Permission or platform limits: whatever was collected is still usable.
  }
}

export async function folderTracks(
  handle: FileSystemDirectoryHandle,
  requestAccess: boolean,
  onTrack?: (count: number) => void
): Promise<TrackFile[]> {
  if (!(await ensurePermission(handle, requestAccess))) return [];
  const tracks: TrackFile[] = [];
  await collectTracks(handle, 0, tracks, onTrack);
  return tracks.sort((a, b) => a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------------ */
/* Public library actions                                               */
/* ------------------------------------------------------------------ */

/** Opens the native folder picker; throws when the browser blocks it. */
export async function pickFolder(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) throw new Error("unsupported");
  return window.showDirectoryPicker({ mode: "read" });
}

export interface ScanProgress {
  foldersDone: number;
  foldersTotal: number;
  tracks: number;
  currentFolder?: string;
}

/** Every folder (saved + session) with the tracks it can currently read. */
export async function readLibrary(
  requestAccess = false,
  onProgress?: (progress: ScanProgress) => void
): Promise<LibraryFolder[]> {
  const saved = await listSavedFolders();
  const folders: LibraryFolder[] = [];
  let scanned = 0;
  for (const record of saved) {
    onProgress?.({ foldersDone: scanned, foldersTotal: saved.length, tracks: countTracks(folders), currentFolder: record.name });
    const tracks = await folderTracks(record.handle, requestAccess, (count) =>
      onProgress?.({
        foldersDone: scanned,
        foldersTotal: saved.length,
        tracks: countTracks(folders) + count,
        currentFolder: record.name,
      })
    );
    folders.push({ id: record.id, name: record.name, stored: true, tracks });
    scanned += 1;
    onProgress?.({ foldersDone: scanned, foldersTotal: saved.length, tracks: countTracks(folders) });
  }
  for (const folder of sessionFolders) {
    folders.push({ ...folder, stored: false });
  }
  onProgress?.({ foldersDone: saved.length, foldersTotal: saved.length, tracks: countTracks(folders) });
  return folders;
}

function countTracks(folders: LibraryFolder[]): number {
  return folders.reduce((total, folder) => total + folder.tracks.length, 0);
}

export function folderTrackCount(folders: LibraryFolder[]): number {
  return countTracks(folders);
}

/** All tracks from every folder, de-duplicated across folders. */
export function flattenLibraryTracks(folders: LibraryFolder[]): TrackFile[] {
  const seen = new Set<string>();
  const tracks: TrackFile[] = [];
  for (const folder of folders) {
    for (const track of folder.tracks) {
      const key = `${track.name}-${track.file.size}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tracks.push(track);
    }
  }
  return tracks.slice(0, MAX_TRACKS);
}

export async function readLibraryTracks(requestAccess = false): Promise<TrackFile[]> {
  return flattenLibraryTracks(await readLibrary(requestAccess));
}

export async function reconnectSavedFolders(): Promise<boolean> {
  const saved = await listSavedFolders();
  let granted = false;
  for (const record of saved) {
    if (await ensurePermission(record.handle, true)) granted = true;
  }
  announce();
  return granted;
}

export async function forgetFolder(id: string): Promise<void> {
  const session = sessionFolders.find((folder) => folder.id === id);
  if (session) {
    sessionFolders = sessionFolders.filter((folder) => folder.id !== id);
    announce();
    return;
  }
  await removeSavedFolder(id);
}

/** Builds session folders from a `webkitdirectory` input selection. */
export function addFoldersFromFileList(files: FileList): number {
  const groups = new Map<string, TrackFile[]>();
  for (const file of Array.from(files)) {
    if (!isAudioFile(file.name)) continue;
    const path = file.webkitRelativePath || file.name;
    const parts = path.split("/");
    const folder = parts.length > 1 ? parts[0] : "Selected songs";
    const list = groups.get(folder) ?? [];
    list.push({ name: prettyName(file.name), file });
    groups.set(folder, list);
  }

  let added = 0;
  for (const [name, tracks] of groups) {
    if (!tracks.length) continue;
    // Re-importing the same folder replaces the session copy instead of
    // stacking a second identical list, and duplicate songs inside the
    // selection are dropped.
    sessionFolders = sessionFolders.filter((folder) => folder.name !== name);
    const seen = new Set<string>();
    const unique = tracks.filter((track) => {
      const key = `${track.name}-${track.file.size}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    sessionFolders.push({
      id: `session-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      tracks: unique.sort((a, b) => a.name.localeCompare(b.name)),
    });
    added += unique.length;
  }
  if (added) announce();
  return added;
}

/**
 * Adds individual songs (Upload Song) as an "Uploaded songs" session folder.
 * Returns how many new songs were added; duplicates are skipped.
 */
export async function addSongsFromFileList(files: FileList): Promise<number> {
  const incoming: TrackFile[] = [];
  for (const file of Array.from(files)) {
    if (!isAudioFile(file.name)) continue;
    incoming.push({ name: prettyName(file.name), file });
  }
  if (!incoming.length) return 0;

  const existingKeys = new Set<string>();
  for (const folder of sessionFolders) {
    for (const track of folder.tracks) existingKeys.add(`${track.name}-${track.file.size}`);
  }
  // Also catch songs that already live in reconnected on-disk folders.
  const saved = await listSavedFolders();
  for (const record of saved) {
    for (const track of await folderTracks(record.handle, false)) {
      existingKeys.add(`${track.name}-${track.file.size}`);
    }
  }

  let folder = sessionFolders.find((entry) => entry.name === "Uploaded songs");
  if (!folder) {
    folder = { id: `session-uploaded-${Date.now()}`, name: "Uploaded songs", tracks: [] };
    sessionFolders.push(folder);
  }

  let added = 0;
  for (const track of incoming) {
    const key = `${track.name}-${track.file.size}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    folder.tracks.push(track);
    added += 1;
  }
  folder.tracks.sort((a, b) => a.name.localeCompare(b.name));
  if (added) announce();
  return added;
}

export function sessionTrackCount(): number {
  return sessionFolders.reduce((total, folder) => total + folder.tracks.length, 0);
}
