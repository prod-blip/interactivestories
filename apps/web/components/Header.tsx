import Link from 'next/link';
import { Brand } from './Brand';

export function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <nav aria-label="Primary navigation">
          <Link href="/#stories">Stories</Link>
          <Link href="/#our-approach">Our approach</Link>
          <Link className="nav-note" href="/#for-grown-ups">For grown-ups</Link>
        </nav>
      </div>
    </header>
  );
}
