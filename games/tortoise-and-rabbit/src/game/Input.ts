export type Movement = { forward: number; sideways: number };

export class Input {
  private readonly keys = new Set<string>();
  private readonly buttons = new Map<string, boolean>();
  private readonly listeners = new AbortController();

  constructor() {
    const options = { signal: this.listeners.signal };
    window.addEventListener('keydown', this.onKeyDown, options);
    window.addEventListener('keyup', this.onKeyUp, options);
    window.addEventListener('blur', this.reset, options);
    document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => {
      const direction = button.dataset.move ?? '';
      const down = (event: PointerEvent) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.buttons.set(direction, true);
        button.classList.add('is-active');
      };
      const up = () => {
        this.buttons.set(direction, false);
        button.classList.remove('is-active');
      };
      button.addEventListener('pointerdown', down, options);
      button.addEventListener('pointerup', up, options);
      button.addEventListener('pointercancel', up, options);
      button.addEventListener('lostpointercapture', up, options);
    });
  }

  read(): Movement {
    const pressed = (key: string, direction: string) => this.keys.has(key) || this.buttons.get(direction) === true;
    const forward = Number(pressed('ArrowUp', 'forward') || this.keys.has('KeyW') || this.keys.has('Space'))
      - Number(pressed('ArrowDown', 'back') || this.keys.has('KeyS'));
    const sideways = Number(pressed('ArrowRight', 'right') || this.keys.has('KeyD'))
      - Number(pressed('ArrowLeft', 'left') || this.keys.has('KeyA'));
    return { forward, sideways };
  }

  dispose(): void {
    this.reset();
    this.listeners.abort();
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.code.startsWith('Arrow') || event.code.startsWith('Key') || event.code === 'Space') this.keys.add(event.code);
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
  };

  private readonly onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.code);
  private readonly reset = () => {
    this.keys.clear();
    this.buttons.clear();
  };
}
