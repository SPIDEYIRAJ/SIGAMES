import { useCallback, useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FolderPlus, Loader2, Music2, Play, Sparkles, VolumeX, X } from "lucide-react";
import { setThemeSongEnabled } from "@/lib/theme-song";
import {
  addFoldersFromFileList,
  folderTracks,
  MUSIC_LIBRARY_EVENT,
  pickFolder,
  readLibrary,
  reconnectSavedFolders,
  saveFolder,
  supportsFolderPicker,
  type LibraryFolder,
} from "@/lib/music-library";

const INTRO_SESSION_KEY = "si-games-intro-session";

function introAlreadyDone(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * Start-of-visit soundtrack setup.
 *
 * Appears once per page load, right after the startup cinema: the player can
 * reconnect / add song folders, keep the SI theme, or go silent. Nothing about
 * the choice is permanent — the gate returns on the next visit.
 */
export default function MusicGate() {
  const reduceMotion = useReducedMotion();
  const [introDone, setIntroDone] = useState(introAlreadyDone);
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const shown = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localCount = folders.reduce((total, folder) => total + folder.tracks.length, 0);
  const needsPermission = folders.some((folder) => folder.stored && folder.tracks.length === 0);

  const refresh = useCallback(async () => {
    setFolders(await readLibrary(false));
  }, []);

  useEffect(() => {
    void refresh();
    const sync = () => void refresh();
    window.addEventListener(MUSIC_LIBRARY_EVENT, sync);
    return () => window.removeEventListener(MUSIC_LIBRARY_EVENT, sync);
  }, [refresh]);

  useEffect(() => {
    const handleDone = () => setIntroDone(true);
    window.addEventListener("si-games-intro-done", handleDone);
    return () => window.removeEventListener("si-games-intro-done", handleDone);
  }, []);

  useEffect(() => {
    if (!introDone || shown.current) return;
    shown.current = true;
    setOpen(true);
  }, [introDone]);

  /** Dismiss without touching the player's current sound choice. */
  const dismiss = () => {
    setOpen(false);
    setNote("");
  };

  const close = (silent = false) => {
    setThemeSongEnabled(!silent);
    setOpen(false);
    setNote("");
  };

  const addFolder = async () => {
    setBusy(true);
    setNote("");
    try {
      if (!supportsFolderPicker()) {
        fileInputRef.current?.click();
        return;
      }
      const handle = await pickFolder();
      await saveFolder(handle);
      const tracks = await folderTracks(handle, false);
      if (!tracks.length) {
        setNote("No playable songs in that folder — mp3, m4a, ogg, wav and flac work.");
      }
    } catch (error) {
      const name = (error as DOMException | undefined)?.name;
      if (name !== "AbortError") {
        setNote("The folder picker is blocked here — use the device folder button instead.");
      }
    } finally {
      setBusy(false);
    }
  };

  const reconnect = async () => {
    setBusy(true);
    setNote("");
    try {
      const granted = await reconnectSavedFolders();
      if (!granted) setNote("Folder access was not granted. Add the folder again to use it.");
    } finally {
      setBusy(false);
    }
  };

  const enter = () => close(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="music-gate-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.35 }}
        >
          <motion.div
            className="music-gate"
            role="dialog"
            aria-modal="true"
            aria-labelledby="music-gate-title"
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <button type="button" className="music-gate-close" onClick={dismiss} aria-label="Close the soundtrack setup">
              <X size={16} />
            </button>

            <span className="music-gate-kicker"><Sparkles size={13} /> SI OS // SOUND CHECK</span>
            <h2 id="music-gate-title">Set the soundtrack.</h2>
            <p>
              Point SI GAMES at the song folders on this device and your music becomes the theme.
              Choose folders again on each visit so the browser can reconnect them.
            </p>

            {folders.length > 0 && (
              <ul className="music-gate-folders">
                {folders.map((folder) => (
                  <li key={folder.id}>
                    <Music2 size={14} />
                    <span>{folder.name}</span>
                    <small>{folder.tracks.length ? `${folder.tracks.length} songs` : folder.stored ? "permission needed" : "empty"}</small>
                  </li>
                ))}
              </ul>
            )}

            <div className="music-gate-actions">
              <button type="button" className="music-gate-primary" onClick={() => void addFolder()} disabled={busy}>
                {busy ? <Loader2 size={16} className="spin" /> : <FolderPlus size={16} />}
                Choose song folder
              </button>
              {needsPermission && (
                <button type="button" className="music-gate-secondary" onClick={() => void reconnect()} disabled={busy}>
                  <Music2 size={15} /> Reconnect saved folders
                </button>
              )}
              <button type="button" className="music-gate-secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                <FolderPlus size={15} /> Pick from this device
              </button>
            </div>

            <input
              ref={fileInputRef}
              className="soundtrack-file"
              type="file"
              accept="audio/*"
              multiple
              {...({ webkitdirectory: "true", directory: "true" } as unknown as InputHTMLAttributes<HTMLInputElement>)}
              onChange={(event) => {
                const files = event.target.files;
                if (files?.length) addFoldersFromFileList(files);
                event.target.value = "";
              }}
            />

            <div className="music-gate-links">
              <button type="button" onClick={enter}>
                <Play size={13} fill="currentColor" /> {localCount > 0 ? "Start with my music" : "Use the SI theme"}
              </button>
              <button type="button" onClick={() => close(true)}>
                <VolumeX size={13} /> Continue silent
              </button>
            </div>

            {localCount > 0 && <p className="music-gate-count">{localCount} songs ready from your folders</p>}
            {note && <p className="music-gate-note" role="status">{note}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
