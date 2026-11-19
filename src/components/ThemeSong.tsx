import { useCallback, useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { useLocation } from "react-router";
import { useQuery } from "convex/react";
import { FolderPlus, Loader2, Music2, Upload, Volume2, VolumeX, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  duckThemeSong,
  fadeThemeSongForGame,
  isThemeSongEnabled,
  resumeThemeSongAfterGame,
  setThemeSongEnabled,
  setThemeSongUrl,
  silenceThemeSong,
  startThemeSong,
  unduckThemeSong,
} from "@/lib/theme-song";
import {
  duckLocalMusic,
  fadeLocalMusicForGame,
  hasLocalPlaylist,
  LOCAL_TRACK_EVENT,
  resumeLocalMusicAfterGame,
  setLocalPlaylist,
  startLocalMusic,
  stopLocalMusic,
  unduckLocalMusic,
} from "@/lib/local-music";
import {
  addFoldersFromFileList,
  folderTracks,
  forgetFolder,
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

/** Every route that hands the screen to a game gets the ducked soundtrack. */
function isGamePage(pathname: string): boolean {
  return pathname.startsWith("/play/") || pathname === "/gta-v" || pathname === "/gta-vicecity";
}

/**
 * The one soundtrack control for the whole site.
 *
 * Collapsed it is a single music button; expanded it holds the SI theme toggle
 * and the player's own song folders. Local folders take over from the Convex
 * theme whenever they contain tracks, and the opening rise, game duck and
 * game-load fade-out are shared by both players.
 */
export default function ThemeSong() {
  const { pathname } = useLocation();
  const media = useQuery(api.media.themeSong);
  const [enabled, setEnabled] = useState(isThemeSongEnabled);
  const [introDone, setIntroDone] = useState(introAlreadyDone);
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [trackName, setTrackName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onGamePage = isGamePage(pathname);
  const localCount = folders.reduce((total, folder) => total + folder.tracks.length, 0);

  const refreshLibrary = useCallback(async () => {
    const next = await readLibrary(false);
    setFolders(next);
    setLocalPlaylist(next.flatMap((folder) => folder.tracks));
    setLibraryReady(true);
  }, []);

  /** Resolve the Convex storage URL once, then keep it for the session. */
  useEffect(() => {
    setThemeSongUrl(media?.url);
  }, [media?.url]);

  useEffect(() => {
    const handleDone = () => setIntroDone(true);
    window.addEventListener("si-games-intro-done", handleDone);
    return () => window.removeEventListener("si-games-intro-done", handleDone);
  }, []);

  useEffect(() => {
    const sync = () => setEnabled(isThemeSongEnabled());
    window.addEventListener("si-games-theme-song-change", sync);
    return () => window.removeEventListener("si-games-theme-song-change", sync);
  }, []);

  useEffect(() => {
    void refreshLibrary();
    const sync = () => void refreshLibrary();
    window.addEventListener(MUSIC_LIBRARY_EVENT, sync);
    return () => window.removeEventListener(MUSIC_LIBRARY_EVENT, sync);
  }, [refreshLibrary]);

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string }>).detail;
      setTrackName(detail?.name ?? "");
    };
    window.addEventListener(LOCAL_TRACK_EVENT, update);
    return () => window.removeEventListener(LOCAL_TRACK_EVENT, update);
  }, []);

  /** The local folders, when present, are the soundtrack; the theme is the fallback. */
  useEffect(() => {
    if (!enabled) {
      stopLocalMusic(600);
      return;
    }
    if (!introDone || !libraryReady) return;
    if (localCount > 0) {
      silenceThemeSong(600);
      startLocalMusic();
    } else {
      stopLocalMusic(500);
      startThemeSong();
    }
  }, [introDone, enabled, libraryReady, localCount, folders]);

  useEffect(() => {
    if (onGamePage) {
      duckThemeSong();
      duckLocalMusic();
      return;
    }
    unduckThemeSong();
    unduckLocalMusic();
    resumeThemeSongAfterGame();
    resumeLocalMusicAfterGame();
  }, [onGamePage]);

  useEffect(() => {
    if (!onGamePage) return;
    const handleLoaded = () => {
      fadeThemeSongForGame();
      fadeLocalMusicForGame();
    };
    window.addEventListener("si-games-game-loaded", handleLoaded);
    return () => window.removeEventListener("si-games-game-loaded", handleLoaded);
  }, [onGamePage]);

  /** Escape and stray outside taps close the expanded panel. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".soundtrack-fab, .soundtrack-panel")) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setThemeSongEnabled(next);
    if (!next) {
      stopLocalMusic(600);
      return;
    }
    if (localCount > 0) {
      silenceThemeSong(0);
      startLocalMusic();
    }
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
        setNote("That folder has no playable songs (mp3, m4a, ogg, wav, flac).");
      }
    } catch (error) {
      const name = (error as DOMException | undefined)?.name;
      if (name === "AbortError") return;
      setNote("The system folder picker is blocked here. Use the browser folder button below.");
    } finally {
      setBusy(false);
    }
  };

  const addFromInput = () => {
    setNote("");
    fileInputRef.current?.click();
  };

  const reconnect = async () => {
    setBusy(true);
    setNote("");
    try {
      const granted = await reconnectSavedFolders();
      if (!granted) setNote("No folders were reconnected. Choose them again to play.");
    } finally {
      setBusy(false);
    }
  };

  const removeFolder = async (id: string) => {
    setBusy(true);
    try {
      await forgetFolder(id);
    } finally {
      setBusy(false);
    }
  };

  const needsPermission = folders.some((folder) => folder.stored && folder.tracks.length === 0);

  return (
    <div className="soundtrack">
      <button
        type="button"
        className={`soundtrack-fab ${enabled ? "is-on" : ""} ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls="soundtrack-panel"
        aria-label={open ? "Close soundtrack controls" : "Open soundtrack controls"}
        title={open ? "Close soundtrack" : "Soundtrack"}
        onClick={() => setOpen((value) => !value)}
      >
        {enabled ? <Music2 size={18} /> : <VolumeX size={18} />}
        <span className="soundtrack-bars" aria-hidden="true"><i /><i /><i /></span>
      </button>

      {open && (
        <div id="soundtrack-panel" ref={panelRef} className="soundtrack-panel" role="dialog" aria-label="Soundtrack controls">
          <div className="soundtrack-head">
            <span className="soundtrack-kicker"><Music2 size={12} /> SI · SOUNDTRACK</span>
            <button type="button" className="soundtrack-close" onClick={() => setOpen(false)} aria-label="Close soundtrack controls">
              <X size={14} />
            </button>
          </div>

          <div className="soundtrack-theme-row">
            <span className="soundtrack-label">SI THEME SONG</span>
            <button
              type="button"
              className={`soundtrack-switch ${enabled ? "is-on" : ""}`}
              aria-pressed={enabled}
              onClick={toggle}
            >
              {enabled ? <><Volume2 size={12} /> ON</> : <><VolumeX size={12} /> OFF</>}
            </button>
          </div>

          <div className="soundtrack-divider" />

          <div className="soundtrack-local">
            <div className="soundtrack-local-head">
              <span className="soundtrack-label">YOUR SONG FOLDERS</span>
              <span className="soundtrack-count">{localCount} tracks</span>
            </div>

            {trackName && enabled && localCount > 0 && (
              <p className="soundtrack-now">NOW PLAYING · {trackName}</p>
            )}

            {folders.length > 0 ? (
              <ul className="soundtrack-folders">
                {folders.map((folder) => (
                  <li key={folder.id} className={folder.tracks.length ? "" : "needs-permission"}>
                    <span className="soundtrack-folder-icon"><FolderPlus size={13} /></span>
                    <span className="soundtrack-folder-name">
                      {folder.name}
                      <small>{folder.tracks.length ? `${folder.tracks.length} songs` : folder.stored ? "needs permission" : "empty"}</small>
                    </span>
                    <button type="button" onClick={() => void removeFolder(folder.id)} aria-label={`Remove ${folder.name}`} disabled={busy}>
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="soundtrack-empty">Add your own song folders and they play instead of the SI theme.</p>
            )}

            {needsPermission && (
              <button type="button" className="soundtrack-reconnect" onClick={() => void reconnect()} disabled={busy}>
                {busy ? <Loader2 size={12} className="spin" /> : <Music2 size={12} />} Reconnect saved folders
              </button>
            )}

            <div className="soundtrack-add-row">
              <button type="button" className="soundtrack-add" onClick={() => void addFolder()} disabled={busy}>
                {busy ? <Loader2 size={14} className="spin" /> : <FolderPlus size={14} />}
                Add song folder
              </button>
              <button type="button" className="soundtrack-upload" onClick={addFromInput} disabled={busy} title="Pick a folder from this device for this tab">
                <Upload size={14} />
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

            {note && <p className="soundtrack-note" role="status">{note}</p>}
            <p className="soundtrack-hint">
              Folders stay on this device. Chromium browsers remember them; other browsers reload them for this tab only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
