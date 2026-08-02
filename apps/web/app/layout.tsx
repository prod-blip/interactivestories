import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Moonlit Stories — Gentle interactive stories for children',
    template: '%s · Moonlit Stories',
  },
  description:
    'Mellow, interactive bedtime stories created for children and the grown-ups who read with them.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
