export type Movement = { forward: number; sideways: number };

export class Input {
  private readonly keys = new Set<string>();
  private readonly listeners = new AbortController();
  private readonly target: HTMLElement;
  private readonly controls: HTMLElement | null;
  private readonly base: HTMLElement | null;
  private readonly knob: HTMLElement | null;
  private pointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private touchX = 0;
  private touchY = 0;

  constructor() {
    this.target = document.querySelector<HTMLElement>('#app') ?? document.body;
    this.controls = document.querySelector<HTMLElement>('#race-controls');
    this.base = this.controls?.querySelector<HTMLElement>('.race-controls__base') ?? null;
    this.knob = this.controls?.querySelector<HTMLElement>('.race-controls__knob') ?? null;
    const options = { signal: this.listeners.signal };
    window.addEventListener('keydown', this.onKeyDown, options);
    window.addEventListener('keyup', this.onKeyUp, options);
    window.addEventListener('blur', this.reset, options);
    this.target.addEventListener('pointerdown', this.onPointerDown, options);
    this.target.addEventListener('pointermove', this.onPointerMove, options);
    window.addEventListener('pointerup', this.onPointerUp, options);
    window.addEventListener('pointercancel', this.onPointerUp, options);
  }

  read(): Movement {
    const keyboardForward = Number(
      this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('Space'),
    );
    const keyboardSideways = Number(this.keys.has('ArrowRight') || this.keys.has('KeyD'))
      - Number(this.keys.has('ArrowLeft') || this.keys.has('KeyA'));
    const touchForward = this.touchY < -0.12 ? Math.min(1, -this.touchY) : 0;
    return {
      forward: Math.max(keyboardForward, touchForward),
      sideways: Math.max(-1, Math.min(1, keyboardSideways + this.touchX)),
    };
  }

  dispose(): void {
    this.reset();
    this.listeners.abort();
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.code.startsWith('Arrow') || event.code.startsWith('Key') || event.code === 'Space') {
      this.keys.add(event.code);
    }
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
  };

  private readonly onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.code);

  private readonly onPointerDown = (event: PointerEvent) => {
    if (
      event.pointerType !== 'touch'
      || !this.controls?.classList.contains('is-visible')
      || event.clientX > window.innerWidth * 0.72
    ) return;
    event.preventDefault();
    this.pointerId = event.pointerId;
    this.centerX = event.clientX;
    this.centerY = event.clientY;
    if (this.base) {
      const halfSize = this.base.offsetWidth / 2 || 58;
      this.base.style.left = `${event.clientX - halfSize}px`;
      this.base.style.top = `${event.clientY - halfSize}px`;
      this.base.style.bottom = 'auto';
    }
    this.controls.classList.add('is-engaged');
    this.target.setPointerCapture(event.pointerId);
    this.updateJoystick(event.clientX, event.clientY);
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) return;
    event.preventDefault();
    this.updateJoystick(event.clientX, event.clientY);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    if (event.pointerId === this.pointerId) this.releaseJoystick();
  };

  private updateJoystick(clientX: number, clientY: number): void {
    const radius = 44;
    const rawX = clientX - this.centerX;
    const rawY = clientY - this.centerY;
    const distance = Math.max(1, Math.hypot(rawX, rawY));
    const scale = Math.min(1, radius / distance);
    const x = rawX * scale;
    const y = rawY * scale;
    this.touchX = x / radius;
    this.touchY = y / radius;
    if (this.knob) {
      this.knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
  }

  private releaseJoystick(): void {
    this.pointerId = null;
    this.touchX = 0;
    this.touchY = 0;
    this.controls?.classList.remove('is-engaged');
    this.base?.style.removeProperty('left');
    this.base?.style.removeProperty('top');
    this.base?.style.removeProperty('bottom');
    if (this.knob) this.knob.style.transform = 'translate(-50%, -50%)';
  }

  private readonly reset = () => {
    this.keys.clear();
    this.releaseJoystick();
  };
}
