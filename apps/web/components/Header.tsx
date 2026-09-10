import { Brand } from './Brand';
import { ShelfSoundControl } from './ShelfSoundControl';

export function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <div className="header-tools">
          <p className="header-whisper">Bedtime adventures · Ages 4–8</p>
          <ShelfSoundControl />
        </div>
      </div>
    </header>
  );
}
