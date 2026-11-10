import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, GitCommitHorizontal, History } from "lucide-react";
import { changeItemCount, changelog } from "@/data/changelog";
import Pager from "@/components/Pager";

const PER_PAGE = 1;

const KIND_LABEL: Record<string, string> = {
  ADD: "Added",
  FIX: "Fixed",
  CHG: "Changed",
  DEL: "Removed",
};

/** The change list: releases newest first, each one page of its own. */
export default function Changelog() {
  const [params, setParams] = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(changelog.length / PER_PAGE));
  const requested = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), pageCount) : 1;
  const visible = useMemo(() => changelog.slice((page - 1) * PER_PAGE, page * PER_PAGE), [page]);

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
          <ArrowLeft size={15} /> <span>Back to the library</span>
        </Link>
      </header>

      <main className="shelf-main">
        <span className="section-kicker"><History size={14} /> CHANGE LIST</span>
        <h1 className="shelf-title">What changed, and when.</h1>
        <p className="shelf-lead">
          {changelog.length} releases and {changeItemCount} individual changes, newest first. The markers match the
          developer log: added, fixed, changed, removed.
        </p>

        {visible.map((release, index) => (
          <article className="release" key={release.date}>
            <header className="release-head">
              <span className="release-date">{release.date}</span>
              <div>
                <h2>{release.title}</h2>
                <p>{release.summary}</p>
              </div>
              <span className="release-count">
                {String((page - 1) * PER_PAGE + index + 1).padStart(2, "0")} / {String(changelog.length).padStart(2, "0")}
              </span>
            </header>
            <ul className="change-list">
              {release.items.map((item) => (
                <li className={`change-item change-item--${item.kind.toLowerCase()}`} key={item.title}>
                  <span className="change-kind">{KIND_LABEL[item.kind] ?? item.kind}</span>
                  <div className="change-copy">
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}

        <Pager page={page} pageCount={pageCount} onChange={goTo} label="Change list pages" />

        <p className="shelf-footnote">
          <GitCommitHorizontal size={13} /> Release {page} of {changelog.length}. The full developer log also ships with
          the site as changes.log.
        </p>
      </main>
    </div>
  );
}
