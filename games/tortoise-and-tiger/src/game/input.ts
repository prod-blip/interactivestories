export type MovementState = {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
  moveX: number;
  moveY: number;
};

const keyMap: Record<string, keyof Pick<MovementState, 'left' | 'right' | 'forward' | 'backward'>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'forward',
  KeyW: 'forward',
  ArrowDown: 'backward',
  KeyS: 'backward',
};

export class Input {
  private readonly touchControls = document.createElement('div');
  private readonly joystickBase = document.createElement('div');
  private readonly joystickKnob = document.createElement('div');
  private touchPointerId: number | null = null;
  private touchCenterX = 0;
  private touchCenterY = 0;
  private movementEnabled = false;

  readonly state: MovementState = {
    left: false,
    right: false,
    forward: false,
    backward: false,
    moveX: 0,
    moveY: 0,
  };

  constructor(
    private readonly target: HTMLElement,
    private readonly onGesture: () => void,
  ) {
    this.touchControls.className = 'touch-controls touch-controls--disabled';
    this.joystickBase.className = 'touch-controls__base';
    this.joystickKnob.className = 'touch-controls__knob';
    this.joystickBase.appendChild(this.joystickKnob);
    this.touchControls.appendChild(this.joystickBase);
    this.target.appendChild(this.touchControls);

    this.target.addEventListener('pointerdown', this.handlePointerDown);
    this.target.addEventListener('pointermove', this.handlePointerMove);
    // Older iOS Safari versions do not consistently dispatch Pointer Events
    // inside an iframe. Keep a touch gesture fallback solely for audio unlock.
    window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerCancel);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.releaseAll);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  setMovementEnabled(enabled: boolean): void {
    this.movementEnabled = enabled;
    this.touchControls.classList.toggle('touch-controls--disabled', !enabled);
    if (!enabled) this.releaseAll();
  }

  isMovementEnabled(): boolean {
    return this.movementEnabled;
  }

  dispose(): void {
    this.target.removeEventListener('pointerdown', this.handlePointerDown);
    this.target.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerCancel);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.releaseAll);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.touchControls.remove();
  }

  private registerGesture(): void {
    // Retry on every genuine interaction. Some browsers can reject an initial
    // audio resume during iframe/visibility transitions; one failed attempt
    // must not leave the whole story silent for the rest of the session.
    this.onGesture();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.registerGesture();
    const key = keyMap[event.code];
    if (!key || !this.movementEnabled) return;
    event.preventDefault();
    this.state[key] = true;
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const key = keyMap[event.code];
    if (!key) return;
    this.state[key] = false;
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.registerGesture();
    if (event.pointerType !== 'touch' || !this.movementEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    this.touchPointerId = event.pointerId;
    this.touchCenterX = event.clientX;
    this.touchCenterY = event.clientY;
    this.joystickBase.style.left = `${event.clientX - 56}px`;
    this.joystickBase.style.top = `${event.clientY - 56}px`;
    this.joystickBase.style.bottom = 'auto';
    this.touchControls.classList.add('is-engaged');
    this.target.setPointerCapture(event.pointerId);
    this.updateJoystick(event.clientX, event.clientY);
  };

  private readonly handleTouchStart = (): void => this.registerGesture();

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.touchPointerId) return;
    event.preventDefault();
    this.updateJoystick(event.clientX, event.clientY);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId === this.touchPointerId) this.releaseJoystick();
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.touchPointerId) this.releaseJoystick();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.releaseAll();
  };

  private updateJoystick(clientX: number, clientY: number): void {
    const radius = 42;
    const rawX = clientX - this.touchCenterX;
    const rawY = clientY - this.touchCenterY;
    const distance = Math.hypot(rawX, rawY);
    const scale = distance > radius ? radius / distance : 1;
    const x = rawX * scale;
    const y = rawY * scale;
    this.state.moveX = x / radius;
    this.state.moveY = y / radius;
    this.joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  private releaseJoystick(): void {
    if (this.touchPointerId !== null && this.target.hasPointerCapture(this.touchPointerId)) {
      this.target.releasePointerCapture(this.touchPointerId);
    }
    this.touchPointerId = null;
    this.state.moveX = 0;
    this.state.moveY = 0;
    this.touchControls.classList.remove('is-engaged');
    this.joystickBase.style.removeProperty('left');
    this.joystickBase.style.removeProperty('top');
    this.joystickBase.style.removeProperty('bottom');
    this.joystickKnob.style.transform = 'translate(-50%, -50%)';
  }

  private readonly releaseAll = (): void => {
    this.state.left = false;
    this.state.right = false;
    this.state.forward = false;
    this.state.backward = false;
    this.releaseJoystick();
  };
}
