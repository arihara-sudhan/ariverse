import Link from 'next/link';

export default function Header({ subPage = false }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="ARIVERSE home">
        <span className="brand-text">ARIVERSE</span>
      </Link>
      <nav className="nav nav-social" aria-label="Social links">
        <a href="https://www.linkedin.com/in/arihara-sudhan/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.94 8.5v9.56H3.78V8.5h3.16zM5.36 3.94a1.83 1.83 0 1 1 0 3.66 1.83 1.83 0 0 1 0-3.66zM20.22 12.61v5.45h-3.15v-5.08c0-1.27-.45-2.14-1.58-2.14-.86 0-1.37.58-1.6 1.15-.08.2-.1.47-.1.74v5.33h-3.16V8.5h3.16v1.34c.46-.7 1.28-1.7 3.11-1.7 2.27 0 3.97 1.48 3.97 4.67z"/></svg>
        </a>
        <a href="https://github.com/arihara-sudhan" target="_blank" rel="noreferrer" aria-label="GitHub">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.61-3.37-1.18-3.37-1.18-.45-1.15-1.1-1.45-1.1-1.45-.9-.62.07-.61.07-.61 1 .07 1.52 1.03 1.52 1.03.89 1.52 2.33 1.08 2.9.82.09-.64.35-1.08.63-1.33-2.22-.25-4.56-1.1-4.56-4.94 0-1.1.39-2 1.03-2.7-.1-.25-.45-1.27.1-2.64 0 0 .85-.27 2.78 1.03A9.7 9.7 0 0 1 12 6.83c.85 0 1.7.12 2.5.36 1.93-1.3 2.77-1.03 2.77-1.03.56 1.37.21 2.39.11 2.64.64.7 1.03 1.6 1.03 2.7 0 3.85-2.34 4.69-4.57 4.93.36.31.67.92.67 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>
        </a>
        <a href="https://x.com/ariverXe" target="_blank" rel="noreferrer" aria-label="X">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.77 7.73L23.2 22h-6.25l-4.9-6.45L6.4 22H3.3l7.24-8.28L.8 2h6.4l4.43 5.85L18.9 2zm-1.1 18h1.73L6.23 3.9H4.37L17.8 20z"/></svg>
        </a>
        <a href="https://www.youtube.com/@ai_with_ari" target="_blank" rel="noreferrer" aria-label="YouTube">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>
        </a>
        <a href="https://instagram.com/aravind_ariharasudhan" target="_blank" rel="noreferrer" aria-label="Instagram">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8zm5.35-2.15a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3z"/></svg>
        </a>
      </nav>
    </header>
  );
}
