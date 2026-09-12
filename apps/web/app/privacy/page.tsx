import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/Header';
import { Starfield } from '@/components/Starfield';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for the Moonlit Stories app.',
};

export default function PrivacyPolicy() {
  return (
    <main className="privacy-page">
      <Starfield />
      <Header />
      <article className="shell privacy-policy">
        <Link className="privacy-back" href="/">
          <ArrowLeft size={15} /> Back to the story shelf
        </Link>

        <header className="privacy-heading">
          <p className="eyebrow"><ShieldCheck size={14} /> Privacy policy</p>
          <h1>A quiet, private place for stories.</h1>
          <p>Effective date: September 12, 2026</p>
        </header>

        <section>
          <h2>Our approach</h2>
          <p>
            Moonlit Stories is a children&apos;s interactive story app designed for children ages 4–8
            and the grown-ups who read with them. We do not require an account, show advertising,
            use analytics, or collect personal information from children or other users.
          </p>
        </section>

        <section>
          <h2>Information stored on your device</h2>
          <p>
            The app stores limited settings and activity locally on your device, such as sound
            volume, completed-story indicators, and whether premium stories are available. This
            information is not sent to Moonlit Stories or stored on our servers. You can remove it
            by clearing the app&apos;s data or uninstalling the app.
          </p>
        </section>

        <section>
          <h2>Purchases and Google Play</h2>
          <p>
            If a grown-up chooses to unlock premium stories, the purchase is processed by Google
            Play. Moonlit Stories does not receive or store payment-card or bank-account details.
            Google may process purchase and device information under its own privacy policy. The
            app checks purchase status through Google Play only to unlock or restore paid content.
          </p>
        </section>

        <section>
          <h2>Sharing, advertising, and tracking</h2>
          <p>
            We do not sell or share personal information. The app contains no third-party ads,
            behavioural advertising, social features, or cross-app tracking.
          </p>
        </section>

        <section>
          <h2>Children&apos;s privacy</h2>
          <p>
            Moonlit Stories is intended for families and does not knowingly collect personal
            information from children. If you believe personal information has been provided to us,
            contact us so that we can investigate and delete it where applicable.
          </p>
        </section>

        <section>
          <h2>Changes to this policy</h2>
          <p>
            We may update this policy if the app&apos;s features or data practices change. The current
            version and effective date will always be published on this page.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>Questions about privacy can be sent to:</p>
          <a className="privacy-email" href="mailto:project.atul.91@gmail.com">
            <Mail size={15} /> project.atul.91@gmail.com
          </a>
        </section>
      </article>
    </main>
  );
}
