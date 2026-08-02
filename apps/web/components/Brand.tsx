import Link from 'next/link';
import { MoonStar } from 'lucide-react';

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Moonlit Stories home">
      <span className="brand-mark" aria-hidden="true">
        <MoonStar size={18} strokeWidth={1.7} />
      </span>
      <span>Moonlit Stories</span>
    </Link>
  );
}
