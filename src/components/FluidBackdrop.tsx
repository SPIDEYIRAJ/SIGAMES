/** Slow liquid colour fields behind every route, plus a fine console grain. */
export default function FluidBackdrop() {
  return (
    <div className="fluid-aurora" aria-hidden="true">
      <i className="fluid-blob fluid-blob-a" />
      <i className="fluid-blob fluid-blob-b" />
      <i className="fluid-blob fluid-blob-c" />
      <span className="fluid-grid" />
      <span className="fluid-grain" />
    </div>
  );
}
