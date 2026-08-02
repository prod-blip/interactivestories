export function StoryArtwork({ compact = false }: { compact?: boolean }) {
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
