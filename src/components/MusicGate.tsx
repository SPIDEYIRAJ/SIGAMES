import { useCallback, useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FolderPlus, FolderSearch, Loader2, Music2, Play, ScanLine, Sparkles, Upload } from "lucide-react";
import { setThemeSongEnabled, silenceThemeSong } from "@/lib/theme-song";
import { startLocalMusic } from "@/lib/local-music";
import {
  addFoldersFromFileList,
  addSongsFromFileList,
  folderTrackCount,
  MUSIC_LIBRARY_EVENT,
  pickFolder,
  readLibrary,
  reconnectSavedFolders,
  saveFolder,
  supportsFolderPicker,
  type LibraryFolder,
  type ScanProgress,
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
 * The mandatory start-of-visit welcome screen.
 *
 * Every fresh page load stops here and asks for the player's music folders
 * before ENTER SI GAMES unlocks. Saved folders are scanned only when the
 * browser still authorises their handles; otherwise the player reconnects or
 * picks folders again. Scan progress and discovered song counts are real.
 */
export default function MusicGate() {
  const reduceMotion = useReducedMotion();
  const [introDone, setIntroDone] = useState(introAlreadyDone);
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [scanning, setScanning] = useState(true);
  const [progress, setProgress] = useState<ScanProgress>({ foldersDone: 0, foldersTotal: 0, tracks: 0 });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [multiMode, setMultiMode] = useState(false);
  const shown = useRef(false);
  const scanId = useRef(0);
  const lastTick = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const songInputRef = useRef<HTMLInputElement>(null);
  const localCount = folderTrackCount(folders);
  const ready = localCount > 0;
  const needsPermission = folders.some((folder) => folder.stored && folder.tracks.length === 0);

  const scan = useCallback(async (requestAccess = false) => {
    const id = ++scanId.current;
    setScanning(true);
    const publish = (next: ScanProgress) => {
      const now = performance.now();
      if (now - lastTick.current < 90 && next.foldersDone < next.foldersTotal) return;
      lastTick.current = now;
      setProgress(next);
    };
    const next = await readLibrary(requestAccess, publish);
    if (id !== scanId.current) return;
    setFolders(next);
    setProgress({ foldersDone: next.length, foldersTotal: next.length, tracks: folderTrackCount(next) });
    setScanning(false);
  }, []);

  useEffect(() => {
    void scan(false);
    const sync = () => void scan(false);
    window.addEventListener(MUSIC_LIBRARY_EVENT, sync);
    return () => window.removeEventListener(MUSIC_LIBRARY_EVENT, sync);
  }, [scan]);

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

  /** The welcome screen is mandatory, so the page behind it cannot scroll. */
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const importFolder = async (multiple = false) => {
    setBusy(true);
    setNote("");
    setMultiMode(multiple);
    try {
      if (!supportsFolderPicker()) {
        setNote("This browser has no folder picker here. Use “Pick a folder from this device”.");
        fileInputRef.current?.click();
        return;
      }
      const handle = await pickFolder();
      await saveFolder(handle);
      await scan(false);
      setNote(
        multiple
          ? "Folder added. Import another folder to combine more music, then press ENTER."
          : "Folder added to your SI GAMES library."
      );
    } catch (error) {
      const name = (error as DOMException | undefined)?.name;
      if (name !== "AbortError") {
        setNote("The system folder picker is blocked here. Use the device folder button instead.");
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
      await scan(false);
      if (!granted) setNote("No saved folder access was granted. Pick the folders again to continue.");
    } finally {
      setBusy(false);
    }
  };

  const enter = () => {
    if (!ready || scanning) return;
    // The player just chose folders, so their library is the soundtrack.
    try {
      localStorage.setItem("si-games-sound-mode", "local");
    } catch {
      // Private modes can block storage; the session still works.
    }
    window.dispatchEvent(new CustomEvent("si-games-sound-source", { detail: "local" }));
    setThemeSongEnabled(true);
    // Start inside the click itself so browser autoplay policy allows it.
    silenceThemeSong(0);
    startLocalMusic();
    setOpen(false);
  };

  const folderLabel = (folder: LibraryFolder) => {
    if (folder.tracks.length) return `${folder.tracks.length} songs`;
    if (folder.stored) return "needs permission";
    return "empty";
  };

  const currentStep = ready ? 3 : localCount > 0 || folders.length > 0 ? 2 : 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="music-gate-backdrop si-welcome-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.4 }}
        >
          <div className="si-welcome-aura" aria-hidden="true" />
          <motion.div
            className="music-gate si-welcome"
            role="dialog"
            aria-modal="true"
            aria-labelledby="music-gate-title"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="si-welcome-head">
              <span className="si-welcome-kicker"><Sparkles size={13} /> SI OS · SYSTEM START</span>
              <h2 id="music-gate-title">Welcome to <b>SI GAMES</b></h2>
              <p>
                Before the platform starts, connect the song folders on this device. Your music becomes the
                soundtrack, and the library is scanned every visit so nothing plays from a folder you did not choose.
              </p>
            </div>

            <div className="si-welcome-steps" aria-label="Setup progress">
              <span className={currentStep >= 1 ? "is-active" : ""}><i>01</i> Connect folders</span>
              <span className={currentStep >= 2 ? "is-active" : ""}><i>02</i> Scan library</span>
              <span className={currentStep >= 3 ? "is-active" : ""}><i>03</i> Enter platform</span>
            </div>

            <div className={`si-welcome-scan ${scanning ? "is-scanning" : ready ? "is-ready" : ""}`}>
              <div className="si-welcome-scan-head">
                <span>
                  {scanning ? <><ScanLine size={13} /> SCANNING MUSIC LIBRARY</> : ready ? <><Music2 size={13} /> LIBRARY READY</> : <><FolderSearch size={13} /> WAITING FOR A FOLDER</>}
                </span>
                <b>{scanning ? progress.tracks : localCount} SONGS</b>
              </div>
              <div className="si-welcome-track" aria-hidden="true">
                <i style={{ width: scanning ? `${Math.max(8, Math.min(96, (progress.foldersDone / Math.max(1, progress.foldersTotal)) * 100))}%` : "100%" }} />
              </div>
              <small>
                {scanning && progress.currentFolder
                  ? `Reading ${progress.currentFolder}…`
                  : ready
                    ? `${folders.length} folder${folders.length === 1 ? "" : "s"} connected · duplicate songs are skipped automatically`
                    : "Select at least one song folder to unlock SI GAMES."}
              </small>
            </div>

            {folders.length > 0 && (
              <ul className="si-welcome-folders">
                {folders.map((folder) => (
                  <li key={folder.id} className={folder.tracks.length ? "" : "is-missing"}>
                    <Music2 size={13} />
                    <span>{folder.name}</span>
                    <small>{folderLabel(folder)}</small>
                  </li>
                ))}
              </ul>
            )}

            <div className="si-welcome-actions">
              <button type="button" className="music-gate-primary si-welcome-import" onClick={() => void importFolder(false)} disabled={busy}>
                {busy ? <Loader2 size={16} className="spin" /> : <FolderPlus size={16} />}
                Import music folder
              </button>
              <button type="button" className="music-gate-secondary" onClick={() => void importFolder(true)} disabled={busy}>
                <FolderPlus size={15} /> Import multiple folders
              </button>
              <button type="button" className="music-gate-secondary" onClick={() => songInputRef.current?.click()} disabled={busy}>
                <Upload size={15} /> Upload songs
              </button>
              {needsPermission && (
                <button type="button" className="music-gate-secondary" onClick={() => void reconnect()} disabled={busy}>
                  <Music2 size={15} /> Reconnect saved folders
                </button>
              )}
              <button type="button" className="si-welcome-device" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                Pick a folder from this device
              </button>
            </div>

            {multiMode && (
              <p className="si-welcome-multi">Pick one folder at a time — run “Import multiple folders” again for each extra folder.</p>
            )}

            <input
              ref={fileInputRef}
              className="soundtrack-file"
              type="file"
              accept="audio/*"
              multiple
              {...({ webkitdirectory: "true", directory: "true" } as unknown as InputHTMLAttributes<HTMLInputElement>)}
              onChange={(event) => {
                const files = event.target.files;
                if (files?.length) {
                  const added = addFoldersFromFileList(files);
                  setNote(added ? `${added} songs added from this device for this visit.` : "No playable songs were found in that selection.");
                }
                event.target.value = "";
              }}
            />
            <input
              ref={songInputRef}
              className="soundtrack-file"
              type="file"
              accept="audio/*"
              multiple
              onChange={(event) => {
                const files = event.target.files;
                if (files?.length) {
                  void addSongsFromFileList(files).then((added) => {
                    setNote(added ? `${added} songs uploaded. Duplicates were skipped.` : "Those songs are already in your library.");
                  });
                }
                event.target.value = "";
              }}
            />

            {note && <p className="music-gate-note" role="status">{note}</p>}

            <button type="button" className="si-welcome-enter" onClick={enter} disabled={!ready || scanning}>
              {scanning ? <Loader2 size={16} className="spin" /> : <Play size={16} fill="currentColor" />}
              {scanning ? "Scanning…" : ready ? "ENTER SI GAMES" : "Select a folder to enter"}
            </button>
            <p className="si-welcome-require">
              {localCount > 0
                ? `${localCount} songs ready · your files never leave this device`
                : "SI GAMES needs at least one song folder on this visit."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
