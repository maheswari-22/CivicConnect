import { Link } from 'react-router-dom';
import logoIcon from '../../assets/logo-icon.png';
import logoFull from '../../assets/logo.png';
import './Logo.css';

/**
 * Renders the official Civic Connect mark.
 * variant="icon" (default) — the circular emblem only, for compact
 *   spaces like the header, sidebar, and auth cards. Pair with
 *   withWordmark to add the "CIVIC CONNECT" text alongside it.
 * variant="full" — the complete logo lockup (emblem + wordmark +
 *   tagline), for hero/splash moments like the Welcome screen.
 * The logo asset itself is never cropped in a way that loses detail,
 * distorted, or recolored — only its container size changes.
 */
export default function Logo({ size = 40, withWordmark = false, to = '/', dark = false, variant = 'icon', card = true }) {
  const content =
    variant === 'full' ? (
      <span className={`logo ${card ? 'logo__full-card' : ''}`}>
        <img src={logoFull} alt="Civic Connect — Together for a better city" style={{ height: size }} className="logo__full-img" />
      </span>
    ) : (
      <span className="logo">
        <img src={logoIcon} alt="Civic Connect" style={{ width: size, height: size }} className="logo__mark" />
        {withWordmark && (
          <span className={`logo__wordmark ${dark ? 'logo__wordmark--dark' : ''}`}>
            CIVIC<span>CONNECT</span>
          </span>
        )}
      </span>
    );

  return to ? <Link to={to} className="logo-link" aria-label="Civic Connect home">{content}</Link> : content;
}
