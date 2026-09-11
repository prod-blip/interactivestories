import type { Metadata, Viewport } from 'next';
import { NativeAppBridge } from '@/components/NativeAppBridge';
import { LaunchExperience } from '@/components/LaunchExperience';
import { StoryAccessProvider } from '@/components/StoryAccessProvider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Moonlit Stories — Gentle interactive stories for children',
    template: '%s · Moonlit Stories',
  },
  description:
    'Mellow, interactive bedtime stories created for children and the grown-ups who read with them.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#090c18',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <NativeAppBridge />
        <LaunchExperience />
        <StoryAccessProvider>{children}</StoryAccessProvider>
      </body>
    </html>
  );
}
