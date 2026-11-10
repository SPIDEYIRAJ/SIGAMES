import { ChevronLeft, ChevronRight } from "lucide-react";

type PagerProps = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  /** Names the navigation landmark, e.g. "New games pages". */
  label: string;
};

/** First page, last page and the page either side of the current one, with an
 *  ellipsis wherever the run skips. Keeps the control short on long lists. */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const wanted = [1, pageCount, page - 1, page, page + 1]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);
  const unique = [...new Set(wanted)];
  const result: (number | "gap")[] = [];
  unique.forEach((value, index) => {
    if (index > 0 && value - unique[index - 1] > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

/** The shared page navigator: previous / numbered pages / next. */
export default function Pager({ page, pageCount, onChange, label }: PagerProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className="pager" aria-label={label}>
      <button
        type="button"
        className="pager-step"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} /> Prev
      </button>
      <div className="pager-numbers">
        {pageWindow(page, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} className="pager-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              className={`pager-number ${entry === page ? "is-current" : ""}`}
              onClick={() => onChange(entry)}
              aria-current={entry === page ? "page" : undefined}
              aria-label={`Page ${entry}`}
            >
              {String(entry).padStart(2, "0")}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        className="pager-step"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        Next <ChevronRight size={16} />
      </button>
      <span className="pager-caption" aria-live="polite">
        Page {page} of {pageCount}
      </span>
    </nav>
  );
}
