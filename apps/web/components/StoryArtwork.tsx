export function StoryArtwork({ compact = false, variant = 'mouse-and-lion' }: { compact?: boolean; variant?: 'mouse-and-lion' | 'crow-and-pitcher' | 'tortoise-and-rabbit' }) {
  if (variant === 'tortoise-and-rabbit') {
    return (
      <div className={`story-artwork story-artwork--race${compact ? ' story-artwork--compact' : ''}`} aria-hidden="true">
        <div className="art-sun" />
        <div className="art-hill art-hill--back" />
        <div className="art-hill art-hill--front" />
        <div className="art-tree art-tree--left"><span /><span /><span /></div>
        <div className="art-tree art-tree--right"><span /><span /></div>
        <div className="art-rabbit"><span className="rabbit-ear rabbit-ear--one" /><span className="rabbit-ear rabbit-ear--two" /><span className="rabbit-head" /><span className="rabbit-body" /><span className="rabbit-tail" /></div>
        <div className="art-tortoise"><span className="tortoise-head" /><span className="tortoise-shell" /><span className="tortoise-feet" /></div>
        <div className="art-finish"><span /><span /><i>FINISH</i></div>
        <div className="art-glow" />
      </div>
    );
  }

  if (variant === 'crow-and-pitcher') {
    return (
      <div className={`story-artwork story-artwork--crow${compact ? ' story-artwork--compact' : ''}`} aria-hidden="true">
        <div className="art-sun" />
        <div className="art-hill art-hill--back" />
        <div className="art-hill art-hill--front" />
        <div className="art-tree art-tree--left"><span /><span /><span /></div>
        <div className="art-tree art-tree--right"><span /><span /></div>
        <div className="art-pitcher"><span className="pitcher-neck" /><span className="pitcher-water" /><span className="pitcher-handle" /></div>
        <div className="art-crow"><span className="crow-body" /><span className="crow-head" /><span className="crow-beak" /><span className="crow-wing" /></div>
        <div className="art-pebbles"><span /><span /><span /></div>
        <div className="art-glow" />
      </div>
    );
  }

  return (
    <div className={`story-artwork${compact ? ' story-artwork--compact' : ''}`} aria-hidden="true">
      <div className="art-moon" />
      <div className="art-star art-star--one">✦</div>
      <div className="art-star art-star--two">·</div>
      <div className="art-hill art-hill--back" />
      <div className="art-hill art-hill--front" />
      <div className="art-tree art-tree--left"><span /><span /><span /></div>
      <div className="art-tree art-tree--right"><span /><span /></div>
      <div className="art-lion"><span className="lion-mane" /><span className="lion-body" /><span className="lion-tail" /></div>
      <div className="art-mouse"><span className="mouse-ear" /><span className="mouse-body" /><span className="mouse-tail" /></div>
      <div className="art-glow" />
    </div>
  );
}
