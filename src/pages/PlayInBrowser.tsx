import { useMemo, useState } from "react";
import { ArrowRight, ExternalLink, X } from "lucide-react";
import { useNavigate } from "react-router";
import { browserLinks } from "@/data/games";

type SortValue = "az" | "za";

const SORTS: { value: SortValue; label: string }[] = [
  { value: "az", label: "A to Z" },
  { value: "za", label: "Z to A" },
];

export default function PlayInBrowser() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("az");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let items = browserLinks;
    if (normalized) {
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(normalized) ||
          item.url.toLowerCase().includes(normalized) ||
          (item.note && item.note.toLowerCase().includes(normalized)),
      );
    }
    if (sortBy === "az") return items.slice().sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "za") return items.slice().sort((a, b) => b.title.localeCompare(a.title));
    return items;
  }, [query, sortBy]);

  return (
    <div className="si-app">
      <div className="browser-links-shell">
        <header className="browser-links-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true"><span>SI</span></span>
            <span>SI GAMES</span>
          </div>
          <a className="browser-links-back" href="/">
            <ExternalLink size={14} /> Back to the library
          </a>
        </header>

        <main className="browser-links-main">
          <div className="browser-links-hero">
            <span className="section-kicker">
              <ExternalLink size={14} /> PLAY-IN-BROWSER LINKS
            </span>
            <h1>Play these games in your own browser tab</h1>
            <p>
              Direct links to fan browser builds of classic PC and console titles.
              Each one opens in its own page — not inside this site — so pick a link,
              open it, and play. GitHub repositories are excluded from this list.
            </p>
          </div>

          <div className="browser-links-toolbar">
            <label className="search-box" htmlFor="browser-link-search">
              <ExternalLink size={18} />
              <input
                id="browser-link-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by game or link…"
                aria-label="Search browser links"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="search-clear"
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <div className="sort-box">
              <span className="sort-label">Sort</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortValue)}
                aria-label="Sort browser links"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length > 0 ? (
            <ul className="browser-links-list">
              {filtered.map((item, index) => (
                <li key={`${item.title}-${item.url}-${index}`} className="browser-link-row">
                  <div className="browser-link-title">
                    <ArrowRight size={14} className="browser-link-arrow" />
                    <ExternalLink size={14} className="browser-link-ext" />
                    <div>
                      <span className="browser-link-name">{item.title}</span>
                      {item.note && <span className="browser-link-note">{item.note}</span>}
                    </div>
                  </div>
                  <a
                    className="browser-link-url"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.url}
                  </a>
                  <a
                    className="browser-link-open"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open link <ArrowRight size={14} />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="browser-links-empty">
              <ExternalLink size={22} />
              <h3>No links found</h3>
              <p>Try a different search term.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSortBy("az");
                }}
              >
                Reset the list
              </button>
            </div>
          )}

          <p className="browser-links-fineprint">
            These are community browser builds and mirrors. SI GAMES does not host or
            control them. Open each link at your own discretion.
          </p>
        </main>
      </div>
    </div>
  );
}
