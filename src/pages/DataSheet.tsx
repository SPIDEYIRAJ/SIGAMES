import { useEffect, useMemo, useState } from "react";
import { Copy, Download, ExternalLink, FileJson, Image, Link2, Lock, Server, Table2 } from "lucide-react";
import { games, type Game } from "@/data/games";
import { Link } from "react-router";

type Filter = "all" | "embedded" | "handover" | "servers" | "generated";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "embedded", label: "Embedded" },
  { value: "handover", label: "Hand-over" },
  { value: "servers", label: "Has mirrors" },
  { value: "generated", label: "Generated art" },
];

const isHandover = (game: Game) => Boolean(game.openInNewTab) || game.type === "external";
const isGeneratedArt = (game: Game) => game.thumbnail.startsWith("data:");

/** A copyable cell: the link stays in a title tooltip, never a visible anchor
 *  that could be opened by accident while reading the sheet. */
function LinkCell({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this link", value);
    }
  };

  return (
    <button type="button" className={`link-cell ${copied ? "is-copied" : ""}`} onClick={() => void copy()} title={value}>
      <span>{copied ? "Copied" : label}</span>
      <Copy size={12} />
    </button>
  );
}

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Game[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ["id", "title", "category", "tags", "type", "handover", "thumbnail", "sourceUrl", "servers"];
  const lines = rows.map((game) =>
    [
      game.id,
      game.title,
      game.category,
      game.tags.join(" | "),
      game.type,
      String(isHandover(game)),
      game.thumbnail,
      game.sourceUrl,
      (game.servers ?? []).map((server) => `${server.label} = ${server.url}`).join(" | "),
    ]
      .map((cell) => escape(cell))
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

/** What the private sheet exports: everything the shelf knows about a title. */
function toJson(rows: Game[]) {
  return JSON.stringify(
    rows.map((game) => ({
      id: game.id,
      title: game.title,
      category: game.category,
      tags: game.tags,
      type: game.type,
      htmlGame: Boolean(game.htmlGame),
      heavy: Boolean(game.heavy),
      handover: isHandover(game),
      thumbnail: game.thumbnail,
      sourceUrl: game.sourceUrl,
      servers: game.servers ?? [],
      media: game.media ?? null,
    })),
    null,
    2,
  );
}

/**
 * Unlisted owner sheet — every game's links, art URLs, mirrors and media in one
 * place, with CSV/JSON export. Deliberately absent from the nav, the sitemap
 * and search engines; reachable only by typing the address.
 */
export default function DataSheet() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [copiedAll, setCopiedAll] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "SI GAMES — private data sheet";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return games.filter((game) => {
      if (filter === "embedded" && isHandover(game)) return false;
      if (filter === "handover" && !isHandover(game)) return false;
      if (filter === "servers" && !(game.servers && game.servers.length > 1)) return false;
      if (filter === "generated" && !isGeneratedArt(game)) return false;
      if (!needle) return true;
      return [game.title, game.id, game.category, ...game.tags, game.sourceUrl].join(" ").toLowerCase().includes(needle);
    });
  }, [filter, query]);

  const stats = useMemo(() => {
    const handover = games.filter(isHandover).length;
    const mirrors = games.reduce((total, game) => total + Math.max(0, (game.servers?.length ?? 1) - 1), 0);
    return {
      total: games.length,
      embedded: games.length - handover,
      handover,
      mirrors,
      generated: games.filter(isGeneratedArt).length,
      realCovers: games.length - games.filter(isGeneratedArt).length,
    };
  }, []);

  const flash = (what: string) => {
    setCopiedAll(what);
    window.setTimeout(() => setCopiedAll(""), 2000);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(toJson(rows));
      flash("JSON copied");
    } catch {
      flash("Clipboard refused — download instead");
    }
  };

  return (
    <div className="sheet-page">
      <header className="sheet-topbar">
        <Link className="player-brand" to="/" aria-label="Back to the SI GAMES library">
          <span className="player-brand-mark">SI</span>
          <span>SI GAMES</span>
        </Link>
        <span className="sheet-private"><Lock size={12} /> PRIVATE · UNLISTED</span>
        <span className="sheet-stamp">////SPIDEY_IRAJ//// DATA SHEET</span>
      </header>

      <main className="sheet-main">
        <div className="sheet-heading">
          <div>
            <span className="section-kicker"><Table2 size={14} /> OWNER TOOLS</span>
            <h1>The game data sheet.</h1>
            <p>
              Every title, its art URL, source link, mirrors and media in one table. Export a copy, or hand a
              specific link to whoever needs it — nothing here is linked from the public site.
            </p>
          </div>
          <div className="sheet-actions">
            <button type="button" className="soft-button" onClick={() => void copyJson()}>
              <Copy size={15} /> Copy JSON
            </button>
            <button type="button" className="soft-button" onClick={() => download("si-games.json", toJson(games), "application/json")}>
              <FileJson size={15} /> JSON
            </button>
            <button type="button" className="soft-button" onClick={() => download("si-games.csv", toCsv(games), "text/csv")}>
              <Download size={15} /> CSV
            </button>
          </div>
        </div>

        <div className="sheet-stats">
          <div className="sheet-stat"><b>{stats.total}</b><span>Titles</span></div>
          <div className="sheet-stat"><b>{stats.embedded}</b><span>Embedded</span></div>
          <div className="sheet-stat"><b>{stats.handover}</b><span>Hand-over</span></div>
          <div className="sheet-stat"><b>{stats.mirrors}</b><span>Mirrors</span></div>
          <div className="sheet-stat"><b>{stats.realCovers}</b><span>Hosted art</span></div>
          <div className="sheet-stat"><b>{stats.generated}</b><span>Generated art</span></div>
        </div>

        <div className="sheet-toolbar">
          <label className="sheet-search" htmlFor="sheet-search">
            <Link2 size={15} />
            <input
              id="sheet-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles, ids, categories, links…"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="sheet-filters" role="tablist" aria-label="Filter the sheet">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                className={filter === item.value ? "is-active" : ""}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="sheet-count" aria-live="polite">{rows.length} rows</span>
        </div>

        <div className="sheet-table-scroll">
          <div className="sheet-table" role="table" aria-label="SI GAMES game data">
            <div className="sheet-row sheet-row-head" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">Game</span>
              <span role="columnheader">Type</span>
              <span role="columnheader"><Image size={12} /> Art link</span>
              <span role="columnheader"><ExternalLink size={12} /> Source link</span>
              <span role="columnheader"><Server size={12} /> Servers</span>
            </div>

            {rows.map((game) => (
              <div className="sheet-row" role="row" key={game.id}>
                <span className="sheet-index" role="cell">{String(games.indexOf(game) + 1).padStart(3, "0")}</span>
                <span className="sheet-game" role="cell">
                  <span className="sheet-thumb">
                    {isGeneratedArt(game) ? <span className="sheet-thumb-generated">◈</span> : <img src={game.thumbnail} alt="" loading="lazy" />}
                  </span>
                  <span>
                    <b>{game.title}</b>
                    <small>{game.id} · {game.category}</small>
                    <small className="sheet-tags">{game.tags.join(" · ")}</small>
                  </span>
                </span>
                <span role="cell" className={`sheet-type ${isHandover(game) ? "is-handover" : ""}`}>
                  {isHandover(game) ? "Hand-over" : "Embedded"}
                </span>
                <span role="cell" className="sheet-linkpair">
                  <LinkCell value={game.thumbnail} label={isGeneratedArt(game) ? "generated star art" : game.thumbnail} />
                  <a className="sheet-open" href={game.thumbnail} target="_blank" rel="noreferrer" aria-label={`Open ${game.title} cover art`}>
                    <ExternalLink size={11} />
                  </a>
                </span>
                <span role="cell" className="sheet-linkpair">
                  <LinkCell value={game.sourceUrl} label={game.sourceUrl} />
                  <a className="sheet-open" href={game.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ${game.title} source link`}>
                    <ExternalLink size={11} />
                  </a>
                </span>
                <span role="cell" className="sheet-servers">
                  <b>{game.servers?.length ?? 1}</b>
                  <span title={game.servers?.map((server) => `${server.label} — ${server.url}`).join("\n")}>
                    {game.servers?.map((server) => `${server.label.replace(/^Server \d+ — /, "")} · ${server.url}`).join("  |  ") ?? "own link"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="sheet-footnote">
          {copiedAll || `${rows.length} of ${games.length} rows shown`} · Keep this address to yourself. Image links
          point at the hosts the shelf already uses; generated art rows fall back to the built-in star covers.
        </p>
      </main>
    </div>
  );
}
