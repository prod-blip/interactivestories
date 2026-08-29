export class RiverCompassUI {
  private readonly root = document.createElement('section');
  private readonly arrow = document.createElement('div');
  private readonly distance = document.createElement('div');
  private visible = false;
  private distanceMetres = 0;

  constructor(parent: HTMLElement) {
    this.root.className = 'river-compass';
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-label', 'Safe riverbank direction');

    const compass = document.createElement('div');
    compass.className = 'river-compass__dial';
    this.arrow.className = 'river-compass__arrow';
    this.arrow.textContent = '↑';
    compass.appendChild(this.arrow);

    const copy = document.createElement('div');
    copy.className = 'river-compass__copy';
    const kicker = document.createElement('div');
    kicker.className = 'river-compass__kicker';
    kicker.textContent = 'River landmark';
    const label = document.createElement('div');
    label.className = 'river-compass__label';
    label.textContent = 'Safe riverbank';
    this.distance.className = 'river-compass__distance';
    copy.append(kicker, label, this.distance);

    this.root.append(compass, copy);
    parent.appendChild(this.root);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.classList.toggle('is-visible', visible);
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(
    player: { x: number; z: number },
    target: { x: number; z: number },
    cameraPosition: { x: number; z: number },
    cameraTarget: { x: number; z: number },
  ): void {
    if (!this.visible) return;
    const targetX = target.x - player.x;
    const targetZ = target.z - player.z;
    const cameraX = cameraTarget.x - cameraPosition.x;
    const cameraZ = cameraTarget.z - cameraPosition.z;
    const targetAngle = Math.atan2(targetX, -targetZ);
    const cameraAngle = Math.atan2(cameraX, -cameraZ);
    const relativeAngle = Math.atan2(
      Math.sin(targetAngle - cameraAngle),
      Math.cos(targetAngle - cameraAngle),
    );
    this.arrow.style.transform = `rotate(${relativeAngle}rad)`;
    this.distanceMetres = Math.hypot(targetX, targetZ);
    this.distance.textContent = `${Math.max(0, Math.ceil(this.distanceMetres))} m away`;
  }

  getDistance(): number {
    return this.distanceMetres;
  }

  dispose(): void {
    this.root.remove();
  }
}
