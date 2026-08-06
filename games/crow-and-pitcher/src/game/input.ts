import type { InputState } from './types';

const keyMap: Record<string, keyof Pick<InputState, 'left' | 'right' | 'up' | 'down' | 'action'>> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'action', Enter: 'action',
};

export class InputController {
  readonly state: InputState = {
    left: false, right: false, up: false, down: false, action: false, wheelBoost: 0, moveX: 0, moveY: 0,
  };
  private readonly root = document.createElement('div');
  private readonly joystick = document.createElement('div');
  private readonly knob = document.createElement('span');
  private readonly actionButton = document.createElement('button');
  private pointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private enabled = false;
  private wheelTimer = 0;

  private readonly onKeyDown = (event: KeyboardEvent) => this.setKey(event, true);
  private readonly onKeyUp = (event: KeyboardEvent) => this.setKey(event, false);
  private readonly onPointerMove = (event: PointerEvent) => {
    if (event.pointerId === this.pointerId) this.updateJoystick(event.clientX, event.clientY);
  };
  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.enabled || event.pointerType !== 'touch' || event.clientX > innerWidth * 0.65) return;
    event.preventDefault();
    this.pointerId = event.pointerId;
    this.centerX = event.clientX;
    this.centerY = event.clientY;
    this.joystick.style.left = `${event.clientX - 55}px`;
    this.joystick.style.top = `${event.clientY - 55}px`;
    this.root.classList.add('is-engaged');
    this.updateJoystick(event.clientX, event.clientY);
  };
  private readonly onPointerUp = (event: PointerEvent) => {
    if (event.pointerId === this.pointerId) this.releaseJoystick();
  };
  private readonly onWheel = (event: WheelEvent) => {
    if (!this.enabled || event.deltaY >= 0) return;
    event.preventDefault();
    this.state.wheelBoost = Math.min(1, this.state.wheelBoost + Math.max(0.35, Math.abs(event.deltaY) / 180));
    clearTimeout(this.wheelTimer);
    this.wheelTimer = window.setTimeout(() => { this.state.wheelBoost = 0; }, 650);
  };

  constructor(parent: HTMLElement) {
    this.root.className = 'touch-input';
    this.joystick.className = 'touch-input__joystick';
    this.knob.className = 'touch-input__knob';
    this.actionButton.className = 'touch-input__action';
    this.actionButton.type = 'button';
    this.actionButton.textContent = 'Drop';
    this.actionButton.setAttribute('aria-label', 'Drop pebble');
    this.joystick.appendChild(this.knob);
    this.root.append(this.joystick, this.actionButton);
    parent.appendChild(this.root);
    addEventListener('keydown', this.onKeyDown);
    addEventListener('keyup', this.onKeyUp);
    parent.addEventListener('pointerdown', this.onPointerDown);
    parent.addEventListener('pointermove', this.onPointerMove);
    parent.addEventListener('wheel', this.onWheel, { passive: false });
    addEventListener('pointerup', this.onPointerUp);
    addEventListener('pointercancel', this.onPointerUp);
    this.actionButton.addEventListener('pointerdown', this.pressAction);
    this.actionButton.addEventListener('pointerup', this.releaseAction);
    this.actionButton.addEventListener('pointercancel', this.releaseAction);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.root.classList.toggle('is-visible', enabled);
    if (!enabled) {
      this.releaseJoystick();
      clearTimeout(this.wheelTimer);
      this.state.left = false;
      this.state.right = false;
      this.state.up = false;
      this.state.down = false;
      this.state.action = false;
      this.state.wheelBoost = 0;
    }
  }

  setActionVisible(visible: boolean): void {
    this.actionButton.classList.toggle('is-visible', visible);
  }

  setActionLabel(label: string): void {
    this.actionButton.textContent = label;
    this.actionButton.setAttribute('aria-label', label);
  }

  dispose(): void {
    removeEventListener('keydown', this.onKeyDown);
    removeEventListener('keyup', this.onKeyUp);
    this.root.parentElement?.removeEventListener('pointerdown', this.onPointerDown);
    this.root.parentElement?.removeEventListener('pointermove', this.onPointerMove);
    this.root.parentElement?.removeEventListener('wheel', this.onWheel);
    removeEventListener('pointerup', this.onPointerUp);
    removeEventListener('pointercancel', this.onPointerUp);
    this.actionButton.removeEventListener('pointerdown', this.pressAction);
    this.actionButton.removeEventListener('pointerup', this.releaseAction);
    this.actionButton.removeEventListener('pointercancel', this.releaseAction);
    clearTimeout(this.wheelTimer);
    this.root.remove();
  }

  private readonly pressAction = (event: PointerEvent) => {
    event.stopPropagation();
    this.state.action = true;
  };
  private readonly releaseAction = (event: PointerEvent) => {
    event.stopPropagation();
    this.state.action = false;
  };

  private setKey(event: KeyboardEvent, pressed: boolean): void {
    const key = keyMap[event.code];
    if (!key || !this.enabled) return;
    event.preventDefault();
    this.state[key] = pressed;
  }

  private updateJoystick(x: number, y: number): void {
    const radius = 42;
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const scale = Math.min(1, radius / length);
    const moveX = dx * scale;
    const moveY = dy * scale;
    this.state.moveX = moveX / radius;
    this.state.moveY = moveY / radius;
    this.knob.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
  }

  private releaseJoystick(): void {
    this.pointerId = null;
    this.state.moveX = 0;
    this.state.moveY = 0;
    this.root.classList.remove('is-engaged');
    this.joystick.removeAttribute('style');
    this.knob.removeAttribute('style');
  }
}
