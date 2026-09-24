import { ArrowLeft, Home, Radar, Sparkles } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-stars" aria-hidden="true" />
      <header className="not-found-nav">
        <Link className="brand" to="/" aria-label="SI GAMES home">
          <span className="brand-mark" aria-hidden="true"><span>SI</span></span>
          <span>SI GAMES</span>
        </Link>
        <span className="not-found-signal"><span className="status-dot" /> SIGNAL LOST</span>
      </header>
      <main className="not-found-content">
        <div className="not-found-radar" aria-hidden="true"><Radar size={28} /></div>
        <span className="section-kicker"><Sparkles size={14} /> UNCHARTED SECTOR</span>
        <h1>404<span>.</span></h1>
        <p>That game is not on this map. The good news: your library is still right where you left it.</p>
        <div className="not-found-actions">
          <Link className="primary-button" to="/"><Home size={16} /> Return to library</Link>
          <button className="soft-button" type="button" onClick={() => window.history.back()}><ArrowLeft size={16} /> Go back</button>
        </div>
      </main>
      <footer className="not-found-footer"><span>////SPIDEY_IRAJ////</span><span>PLAY. DISCOVER. ENJOY.</span></footer>
    </div>
  );
}
