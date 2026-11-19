/**
 * Lightweight audio metadata reader.
 *
 * Reads ID3v2.3 / ID3v2.4 tags (the common case for mp3 folders) for title,
 * artist, album and embedded cover art. Other containers simply return an
 * empty result; the UI falls back to the cleaned-up filename.
 */

export interface TrackMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
}

const cache = new Map<string, Promise<TrackMetadata>>();
const MAX_TAG_BYTES = 900_000;

function cacheKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function readTrackMetadata(file: File): Promise<TrackMetadata> {
  const key = cacheKey(file);
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = parseFile(file).catch((): TrackMetadata => ({}));
  cache.set(key, pending);
  return pending;
}

async function parseFile(file: File): Promise<TrackMetadata> {
  const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  if (head.length < 10 || head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) {
    return {};
  }
  const major = head[3];
  const tagSize = syncSafe(head, 6);
  const end = Math.min(file.size, 10 + tagSize, MAX_TAG_BYTES);
  const bytes = new Uint8Array(await file.slice(0, end).arrayBuffer());
  if (major < 3) return {};

  const view = new DataView(bytes.buffer);
  let offset = 10;
  const result: TrackMetadata = {};
  let artwork: { mime: string; data: Uint8Array } | null = null;

  while (offset + 10 <= bytes.length) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const frameSize = major === 4 ? syncSafe(bytes, offset + 4) : view.getUint32(offset + 4);
    if (!frameSize || offset + 10 + frameSize > bytes.length) break;
    const body = bytes.subarray(offset + 10, offset + 10 + frameSize);

    if (id === "TIT2") result.title = decodeText(body);
    else if (id === "TPE1") result.artist = decodeText(body);
    else if (id === "TALB") result.album = decodeText(body);
    else if (id === "APIC" && !artwork) artwork = decodePicture(body);

    offset += 10 + frameSize;
  }

  if (artwork) {
    const image = artwork.data.slice();
    result.artworkUrl = URL.createObjectURL(new Blob([image], { type: artwork.mime || "image/jpeg" }));
  }
  return result;
}

function syncSafe(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function decodeText(body: Uint8Array): string | undefined {
  if (!body.length) return undefined;
  const encoding = body[0];
  const rest = body.subarray(1);
  let text = "";
  try {
    if (encoding === 0) text = new TextDecoder("windows-1252").decode(rest);
    else if (encoding === 1) text = decodeUtf16(rest, true);
    else if (encoding === 2) text = new TextDecoder("utf-16be").decode(rest);
    else text = new TextDecoder("utf-8").decode(rest);
  } catch {
    return undefined;
  }
  const clean = text.replace(/\u0000+$/g, "").replace(/\u0000/g, " / ").trim();
  return clean || undefined;
}

function decodeUtf16(bytes: Uint8Array, withBom: boolean): string {
  if (bytes.length >= 2) {
    const bom = (bytes[0] << 8) | bytes[1];
    if (bom === 0xfffe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
    if (bom === 0xfefe) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  return new TextDecoder(withBom ? "utf-16le" : "utf-16be").decode(bytes);
}

function decodePicture(body: Uint8Array): { mime: string; data: Uint8Array } | null {
  if (body.length < 4) return null;
  const encoding = body[0];
  let offset = 1;
  let mimeEnd = offset;
  while (mimeEnd < body.length && body[mimeEnd] !== 0) mimeEnd += 1;
  const mime = new TextDecoder("windows-1252").decode(body.subarray(offset, mimeEnd)) || "image/jpeg";
  offset = mimeEnd + 1;
  if (offset >= body.length) return null;
  offset += 1; // picture type

  if (encoding === 1 || encoding === 2) {
    while (offset + 1 < body.length && !(body[offset] === 0 && body[offset + 1] === 0)) offset += 2;
    offset += 2;
  } else {
    while (offset < body.length && body[offset] !== 0) offset += 1;
    offset += 1;
  }

  if (offset >= body.length) return null;
  return { mime, data: body.subarray(offset) };
}
