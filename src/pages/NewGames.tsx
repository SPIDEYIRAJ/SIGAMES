import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { captureLaunchSource } from "@/lib/launch";
import { ArrowRight, CornerDownRight, Gamepad2, Sparkles } from "lucide-react";
import { newGames } from "@/data/games";
import Pager from "@/components/Pager";

const PAGE_SIZE = 12;

/** The latest drop, one address-addressable page at a time. */
export default function NewGames() {
  const [params, setParams] = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(newGames.length / PAGE_SIZE));
  const requested = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), pageCount) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const visible = useMemo(() => newGames.slice(start, start + PAGE_SIZE), [start]);

  const goTo = (next: number) => {
    setParams(next <= 1 ? {} : { page: String(next) });
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div className="shelf-page">
      <header className="player-topbar">
        <Link className="player-brand" to="/" aria-label="SI GAMES home">
          <span className="player-brand-mark" aria-hidden="true">SI</span>
          <span>SI GAMES</span>
        </Link>
        <Link className="player-back" to="/">
          <Gamepad2 size={15} /> <span>Back to the library</span>
        </Link>
      </header>

      <main className="shelf-main">
        <span className="section-kicker"><Sparkles size={14} /> NEW GAMES</span>
        <h1 className="shelf-title">The latest drop.</h1>
        <p className="shelf-lead">
          {newGames.length} titles arrived in the newest batch, checked against the shelf first so nothing here is a
          duplicate. Newest at the top — the page number lives in the address, so any page can be linked or reloaded.
        </p>

        <div className="shelf-grid">
          {visible.map((game, index) => (
            <Link
              key={game.id}
              to={game.standalone ? `/${game.id}` : `/play/${game.id}`}
              className="shelf-card"
              onClick={(event) => captureLaunchSource(game.id, game.thumbnail, event.currentTarget)}
            >
              <div className="shelf-art">
                <img src={game.thumbnail} alt="" loading="lazy" />
                <span className="category-pill">{game.category}</span>
                <span className="shelf-number">{String(start + index + 1).padStart(2, "0")}</span>
              </div>
              <div className="shelf-body">
                <h2>{game.title}</h2>
                <p>{game.tags.join(" · ")}</p>
                <span className="shelf-open">
                  {game.openInNewTab ? "Opens in its own tab" : "Play in this frame"} <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <Pager page={page} pageCount={pageCount} onChange={goTo} label="New games pages" />

        <p className="shelf-footnote">
          <CornerDownRight size={13} /> Showing {start + 1}–{Math.min(start + PAGE_SIZE, newGames.length)} of{" "}
          {newGames.length}. Browse everything on the <Link to="/">full library</Link>.
        </p>
      </main>
    </div>
  );
}
