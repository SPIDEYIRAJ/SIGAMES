import { useCallback, useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { useLocation } from "react-router";
import { useQuery } from "convex/react";
import { ChevronDown, ChevronUp, FolderPlus, Loader2, Music2, RefreshCw, Trash2, Upload, Volume2, VolumeX, X } from "lucide-react";
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
  LOCAL_TRACK_EVENT,
  resumeLocalMusicAfterGame,
  setLocalPlaylist,
  startLocalMusic,
  stopLocalMusic,
  unduckLocalMusic,
} from "@/lib/local-music";
import {
  addFoldersFromFileList,
  addSongsFromFileList,
  flattenLibraryTracks,
  folderTrackCount,
  forgetFolder,
  MUSIC_LIBRARY_EVENT,
  pickFolder,
  readLibrary,
  reconnectSavedFolders,
  saveFolder,
  supportsFolderPicker,
  type LibraryFolder,
  type TrackFile,
} from "@/lib/music-library";
import { readTrackMetadata, type TrackMetadata } from "@/lib/audio-metadata";

const INTRO_SESSION_KEY = "si-games-intro-session";
const SOUND_MODE_KEY = "si-games-sound-mode";

type SoundMode = "theme" | "local";

function introAlreadyDone(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

function readSoundMode(): SoundMode {
  try {
    return localStorage.getItem(SOUND_MODE_KEY) === "theme" ? "theme" : "local";
  } catch {
    return "local";
  }
}

/** Every route that hands the screen to a game gets the ducked soundtrack. */
function isGamePage(pathname: string): boolean {
  return pathname.startsWith("/play/") || pathname === "/gta-v" || pathname === "/gta-vicecity";
}

/** One browsable track with its real ID3 title, artist, album and cover art. */
function TrackRow({ track }: { track: TrackFile }) {
  const [meta, setMeta] = useState<TrackMetadata>({});
  useEffect(() => {
    let live = true;
    void readTrackMetadata(track.file).then((next) => {
      if (live) setMeta(next);
    });
    return () => {
      live = false;
    };
  }, [track.file]);

  return (
    <li className="soundtrack-track">
      {meta.artworkUrl ? (
        <img className="soundtrack-track-art" src={meta.artworkUrl} alt="" loading="lazy" />
      ) : (
        <span className="soundtrack-track-art soundtrack-track-art--empty"><Music2 size={12} /></span>
      )}
      <span className="soundtrack-track-copy">
        <b>{meta.title ?? track.name}</b>
        <small>{[meta.artist, meta.album].filter(Boolean).join(" · ") || "Audio file"}</small>
      </span>
    </li>
  );
}

/**
 * The one soundtrack control for the whole site.
 *
 * Collapsed it is a single music button; expanded it holds the SI theme /
 * local-folder source selector, the four music actions and a browsable library
 * with real metadata and cover art. Local folders take over from the Convex
 * theme whenever they contain tracks, and ducking/fading is shared by both.
 */
export default function ThemeSong() {
  const { pathname } = useLocation();
  const media = useQuery(api.media.themeSong);
  const [enabled, setEnabled] = useState(isThemeSongEnabled);
  const [introDone, setIntroDone] = useState(introAlreadyDone);
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [mode, setMode] = useState<SoundMode>(readSoundMode);
  const [libraryReady, setLibraryReady] = useState(false);
  const [trackName, setTrackName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const songInputRef = useRef<HTMLInputElement>(null);
  const onGamePage = isGamePage(pathname);
  const localCount = folderTrackCount(folders);
  const playlist = flattenLibraryTracks(folders);
  const duplicatesSkipped = localCount - playlist.length;

  const refreshLibrary = useCallback(async () => {
    const next = await readLibrary(false);
    setFolders(next);
    setLocalPlaylist(flattenLibraryTracks(next));
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
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setMode(detail === "theme" ? "theme" : "local");
    };
    window.addEventListener("si-games-sound-source", sync);
    return () => window.removeEventListener("si-games-sound-source", sync);
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

  /** The chosen source plays; folders are the default whenever they exist. */
  useEffect(() => {
    if (!enabled) {
      stopLocalMusic(600);
      return;
    }
    if (!introDone || !libraryReady) return;
    const useLocal = mode === "local" && localCount > 0;
    if (useLocal) {
      silenceThemeSong(600);
      startLocalMusic();
    } else {
      stopLocalMusic(500);
      startThemeSong();
    }
  }, [introDone, enabled, libraryReady, localCount, folders, mode]);

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

  const chooseMode = (next: SoundMode) => {
    setMode(next);
    try {
      localStorage.setItem(SOUND_MODE_KEY, next);
    } catch {
      // Storage can be unavailable in private modes; the session still works.
    }
    setNote(next === "theme" ? "SI theme set as the soundtrack." : "Your imported folders are the soundtrack.");
    if (next === "local" && !localCount) setNote("Import a folder first to use your own soundtrack.");
  };

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setThemeSongEnabled(next);
    if (!next) {
      stopLocalMusic(600);
      return;
    }
    if (mode === "local" && localCount > 0) {
      silenceThemeSong(0);
      startLocalMusic();
    }
  };

  const importFolder = async (multiple = false) => {
    setBusy(true);
    setNote("");
    try {
      if (!supportsFolderPicker()) {
        fileInputRef.current?.click();
        return;
      }
      const handle = await pickFolder();
      await saveFolder(handle);
      setNote(
        multiple
          ? "Folder imported. Run “Import multiple folders” again to combine another."
          : "Folder imported into SI GAMES."
      );
    } catch (error) {
      const name = (error as DOMException | undefined)?.name;
      if (name === "AbortError") return;
      setNote("The system folder picker is blocked here. Use “Pick from this device” instead.");
    } finally {
      setBusy(false);
    }
  };

  const uploadSongs = () => {
    setNote("");
    songInputRef.current?.click();
  };

  const reconnect = async () => {
    setBusy(true);
    setNote("");
    try {
      const granted = await reconnectSavedFolders();
      if (!granted) setNote("No folders were reconnected. Import them again to play.");
    } finally {
      setBusy(false);
    }
  };

  const removeFolder = async (id: string) => {
    setBusy(true);
    try {
      await forgetFolder(id);
      setNote("Folder removed from SI GAMES. Your files were not touched.");
    } finally {
      setBusy(false);
    }
  };

  const needsPermission = folders.some((folder) => folder.stored && folder.tracks.length === 0);
  const menu = [
    { id: "theme", label: "Set theme song", detail: mode === "theme" ? "SI theme active" : "Use the SI theme", icon: Music2, run: () => chooseMode("theme") },
    { id: "upload", label: "Upload song", detail: "Add individual audio files", icon: Upload, run: uploadSongs },
    { id: "folder", label: "Import music folder", detail: "Scan a folder on this device", icon: FolderPlus, run: () => void importFolder(false) },
    { id: "multi", label: "Import multiple folders", detail: "Combine several folders", icon: FolderPlus, run: () => void importFolder(true) },
  ];

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
        <div id="soundtrack-panel" className="soundtrack-panel" role="dialog" aria-label="Soundtrack controls">
          <div className="soundtrack-head">
            <span className="soundtrack-kicker"><Music2 size={12} /> SI · SOUNDTRACK</span>
            <button type="button" className="soundtrack-close" onClick={() => setOpen(false)} aria-label="Close soundtrack controls">
              <X size={14} />
            </button>
          </div>

          <div className="soundtrack-theme-row">
            <span className="soundtrack-label">SOUNDTRACK</span>
            <button
              type="button"
              className={`soundtrack-switch ${enabled ? "is-on" : ""}`}
              aria-pressed={enabled}
              onClick={toggle}
            >
              {enabled ? <><Volume2 size={12} /> ON</> : <><VolumeX size={12} /> OFF</>}
            </button>
          </div>

          <div className="soundtrack-source" role="group" aria-label="Choose the soundtrack source">
            <button type="button" className={mode === "theme" ? "is-on" : ""} onClick={() => chooseMode("theme")}>SI THEME</button>
            <button type="button" className={mode === "local" ? "is-on" : ""} onClick={() => chooseMode("local")} disabled={!localCount}>
              MY FOLDERS {localCount > 0 && <b>{localCount}</b>}
            </button>
          </div>

          {trackName && enabled && mode === "local" && localCount > 0 && (
            <p className="soundtrack-now">NOW PLAYING · {trackName}</p>
          )}

          <div className="soundtrack-menu">
            {menu.map((item) => (
              <button key={item.id} type="button" onClick={item.run} disabled={busy}>
                <item.icon size={14} />
                <span>{item.label}<small>{item.detail}</small></span>
                {busy && item.id !== "theme" && item.id !== "upload" ? <Loader2 size={12} className="spin" /> : <i aria-hidden="true">+</i>}
              </button>
            ))}
          </div>

          <div className="soundtrack-divider" />

          <div className="soundtrack-local">
            <div className="soundtrack-local-head">
              <span className="soundtrack-label">IMPORTED MUSIC</span>
              <span className="soundtrack-count">{playlist.length} tracks</span>
            </div>

            {folders.length > 0 ? (
              <ul className="soundtrack-folders">
                {folders.map((folder) => {
                  const isOpen = expanded === folder.id;
                  return (
                    <li key={folder.id} className={folder.tracks.length ? "" : "needs-permission"}>
                      <button
                        type="button"
                        className="soundtrack-folder-open"
                        onClick={() => setExpanded(isOpen ? null : folder.id)}
                        disabled={!folder.tracks.length}
                        aria-expanded={isOpen}
                      >
                        <span className="soundtrack-folder-icon"><Music2 size={13} /></span>
                        <span className="soundtrack-folder-name">
                          {folder.name}
                          <small>{folder.tracks.length ? `${folder.tracks.length} songs` : folder.stored ? "needs permission" : "empty"}</small>
                        </span>
                        {folder.tracks.length > 0 && (isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                      </button>
                      <button type="button" className="soundtrack-folder-remove" onClick={() => void removeFolder(folder.id)} aria-label={`Remove ${folder.name} from SI GAMES`} disabled={busy}>
                        <Trash2 size={12} />
                      </button>
                      {isOpen && (
                        <div className="soundtrack-browse">
                          <ul>
                            {folder.tracks.slice(0, 40).map((track, index) => <TrackRow key={`${folder.id}-${index}`} track={track} />)}
                          </ul>
                          {folder.tracks.length > 40 && <small>Showing 40 of {folder.tracks.length} tracks.</small>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="soundtrack-empty">No folders yet. Import a music folder to build your soundtrack.</p>
            )}

            {duplicatesSkipped > 0 && <p className="soundtrack-dup">{duplicatesSkipped} duplicate track{duplicatesSkipped === 1 ? "" : "s"} skipped.</p>}

            {needsPermission && (
              <button type="button" className="soundtrack-reconnect" onClick={() => void reconnect()} disabled={busy}>
                {busy ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />} Reconnect saved folders
              </button>
            )}

            <div className="soundtrack-add-row">
              <button type="button" className="soundtrack-add" onClick={() => void importFolder(true)} disabled={busy}>
                {busy ? <Loader2 size={14} className="spin" /> : <FolderPlus size={14} />}
                Add more folders
              </button>
              <button type="button" className="soundtrack-upload" onClick={() => fileInputRef.current?.click()} disabled={busy} title="Pick a folder from this device for this tab">
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
                if (files?.length) {
                  const added = addFoldersFromFileList(files);
                  setNote(added ? `${added} songs added for this visit.` : "No playable songs found.");
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
                    setNote(added ? `${added} songs uploaded.` : "Those songs are already imported.");
                  });
                }
                event.target.value = "";
              }}
            />

            {note && <p className="soundtrack-note" role="status">{note}</p>}
            <p className="soundtrack-hint">
              Files stay on this device. Chromium remembers folders; other browsers reload them for this tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
