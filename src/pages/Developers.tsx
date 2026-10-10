import { Link } from "react-router";
import { Code2, ExternalLink } from "lucide-react";

export default function Developers() {
  return (
    <div className="dev-page">
      <header className="dev-topbar">
        <Link className="brand" to="/" aria-label="SI GAMES home">
          <span className="brand-mark" aria-hidden="true"><span>SI</span></span>
          <span className="brand-name">SI GAMES</span>
        </Link>
        <Link className="dev-back" to="/"><ExternalLink size={14} /> Back to the library</Link>
      </header>

      <main className="dev-main">
        <span className="section-kicker"><Code2 size={14} /> DEVELOPER HUB</span>
        <h1>This site is not embeddable.</h1>
        <p className="dev-lead">
          SI GAMES does not expose an iframe embed. Sharing is limited to the direct game-link page,
          and will never open an external embed of this site.
        </p>

        <p className="dev-signature">
          Powered by <span>SI GAMES</span> ////SPIDEY_IRAJ////
        </p>
      </main>
    </div>
  );
}
