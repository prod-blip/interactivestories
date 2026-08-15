import Link from 'next/link';
import {
  ArrowRight,
  BookOpenText,
  Brain,
  Clock3,
  HeartHandshake,
  Leaf,
  Moon,
  MousePointer2,
  Palette,
  Sparkles,
  VolumeX,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Starfield } from '@/components/Starfield';
import { StoryArtwork } from '@/components/StoryArtwork';
import { stories } from '@/lib/stories';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <Starfield />
        <Header />
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><Moon size={14} /> Made for winding down together</p>
            <h1>Small adventures for <em>quiet evenings.</em></h1>
            <p className="hero-lede">
              Gentle interactive stories for little ones—and the grown-ups beside them. Read, explore,
              wonder, and arrive softly at bedtime.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" href="#stories">
                Explore tonight’s story <ArrowRight size={17} />
              </Link>
              <Link className="text-link" href="#our-approach">Why quieter play?</Link>
            </div>
            <p className="soft-note"><Sparkles size={14} /> No ads. No scores to chase. No noisy surprises.</p>
          </div>
          <div className="hero-scene" aria-hidden="true">
            <div className="hero-orbit hero-orbit--one" />
            <div className="hero-orbit hero-orbit--two" />
            <div className="hero-moon">
              <span className="moon-crater moon-crater--one" />
              <span className="moon-crater moon-crater--two" />
              <span className="moon-crater moon-crater--three" />
            </div>
            <div className="reading-silhouette">
              <span className="reader reader--grown" />
              <span className="open-book" />
              <span className="reader reader--little" />
            </div>
            <span className="floating-star floating-star--one">✦</span>
            <span className="floating-star floating-star--two">✧</span>
          </div>
        </div>
        <div className="shell promise-row" aria-label="Our promises">
          <div><VolumeX size={19} /><span><strong>Gentle sound</strong> without loud music</span></div>
          <div><Palette size={19} /><span><strong>Soft colour</strong> without visual overload</span></div>
          <div><HeartHandshake size={19} /><span><strong>Together time</strong> made for co-play</span></div>
        </div>
      </section>

      <section className="section stories-section" id="stories">
        <div className="shell">
          <div className="section-heading heading-row">
            <div>
              <p className="eyebrow">The story shelf</p>
              <h2>Choose tonight’s little journey.</h2>
            </div>
            <p>Each tale is a small, lovingly made world for reading, wondering, and exploring together.</p>
          </div>

          <div className="story-list">
            {stories.map((story) => (
              <article className="featured-story" key={story.slug}>
                <Link className="story-art-link" href={`/stories/${story.slug}`} aria-label={`Open ${story.title}`}>
                  <StoryArtwork variant={story.slug === 'crow-and-pitcher' ? 'crow-and-pitcher' : story.slug === 'tortoise-and-rabbit' ? 'tortoise-and-rabbit' : 'mouse-and-lion'} />
                  <span className="story-status"><span /> Ready to play</span>
                </Link>
                <div className="story-copy">
                  <p className="eyebrow">{story.eyebrow}</p>
                  <h3>{story.title}</h3>
                  <p className="story-summary">{story.summary}</p>
                  <div className="story-meta">
                    <span><Clock3 size={15} /> {story.duration}</span>
                    <span><BookOpenText size={15} /> {story.ageRange}</span>
                    <span><MousePointer2 size={15} /> {story.participation}</span>
                  </div>
                  <blockquote>“{story.moral}”</blockquote>
                  <Link className="secondary-button" href={`/stories/${story.slug}`}>
                    Meet the story <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section approach-section" id="our-approach">
        <div className="shell approach-grid">
          <div className="approach-intro">
            <p className="eyebrow"><Leaf size={14} /> Thoughtfully mellow</p>
            <h2>Made with growing minds in mind.</h2>
            <p>
              The first years of life are a remarkable period of brain development. Attention, language,
              emotional processing, and self-regulation are all taking shape as young children respond to
              the experiences around them.
            </p>
            <p>
              Children need varied, interactive, and sensorially balanced experiences. Moonlit Stories is
              our small contribution: technology that invites participation without demanding constant attention.
            </p>
          </div>
          <div className="principle-grid">
            <article>
              <span className="principle-icon"><Brain size={21} /></span>
              <h3>Room to process</h3>
              <p>Unhurried pacing leaves space to listen, notice, ask questions, and anticipate what comes next.</p>
            </article>
            <article>
              <span className="principle-icon"><VolumeX size={21} /></span>
              <h3>Lower sensory load</h3>
              <p>No high-frequency reward loops, sudden loud music, flashing prompts, or frantic visual clutter.</p>
            </article>
            <article>
              <span className="principle-icon"><HeartHandshake size={21} /></span>
              <h3>Connection first</h3>
              <p>Stories are written for conversation and co-play—not for replacing the grown-up in the room.</p>
            </article>
            <article>
              <span className="principle-icon"><Sparkles size={21} /></span>
              <h3>Meaningful interaction</h3>
              <p>Every tap or movement helps the story unfold instead of simply producing more noise and colour.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section ritual-section" id="for-grown-ups">
        <Starfield />
        <div className="shell ritual-grid">
          <div>
            <p className="eyebrow">A simple evening ritual</p>
            <h2>Stay close. Read aloud.<br />Let them lead.</h2>
          </div>
          <ol className="ritual-steps">
            <li><span>01</span><div><h3>Settle in together</h3><p>Turn the sound low, get comfortable, and share the screen.</p></div></li>
            <li><span>02</span><div><h3>Give the words a voice</h3><p>Read the narration aloud and pause wherever curiosity appears.</p></div></li>
            <li><span>03</span><div><h3>Hand over the choices</h3><p>Let your child explore while you wonder about the story together.</p></div></li>
          </ol>
        </div>
      </section>

      <footer>
        <div className="shell footer-inner">
          <div>
            <p className="footer-brand"><Moon size={17} /> Moonlit Stories</p>
            <p>Mellow interactive tales for small minds and their favourite grown-ups.</p>
          </div>
          <p className="footer-note">Built for quiet curiosity, one story at a time.</p>
        </div>
      </footer>
    </main>
  );
}
