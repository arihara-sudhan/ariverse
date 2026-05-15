import Link from 'next/link';

export default function Header({ subPage = false }) {
  const navItems = subPage
    ? [{ label: 'Home', href: '/' }]
    : [
        { label: 'Home', href: '#home' },
        { label: 'About', href: '#about' },
        { label: 'Contact', href: '#contact' },
      ];

  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Ariverse home">
        ARIVERSE
      </Link>
      <nav className="nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <a key={item.label} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
