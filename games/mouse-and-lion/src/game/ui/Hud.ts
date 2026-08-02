export class Hud {
  private readonly root = document.createElement('div');
  private readonly title = document.createElement('div');
  private readonly objective = document.createElement('div');
  private readonly objectiveCompass = document.createElement('div');
  private readonly objectiveArrow = document.createElement('div');
  private readonly objectiveCopy = document.createElement('div');
  private readonly objectiveKicker = document.createElement('div');
  private readonly objectiveLabel = document.createElement('div');
  private readonly objectiveDistance = document.createElement('div');
  private readonly movementHint = document.createElement('div');

  constructor(parent: HTMLElement) {
    this.root.className = 'hud';
    this.title.className = 'hud__title';
    this.objective.className = 'hud__objective';
    this.objectiveCompass.className = 'hud__objective-compass';
    this.objectiveArrow.className = 'hud__objective-arrow';
    this.objectiveArrow.textContent = '↑';
    this.objectiveCopy.className = 'hud__objective-copy';
    this.objectiveKicker.className = 'hud__objective-kicker';
    this.objectiveKicker.textContent = 'Follow the trail';
    this.objectiveLabel.className = 'hud__objective-label';
    this.objectiveDistance.className = 'hud__objective-distance';
    this.objectiveCompass.appendChild(this.objectiveArrow);
    this.objectiveCopy.append(this.objectiveKicker, this.objectiveLabel, this.objectiveDistance);
    this.objective.append(this.objectiveCompass, this.objectiveCopy);

    this.movementHint.className = 'hud__move-coach hud__move-coach--hidden';
    this.movementHint.setAttribute('aria-live', 'polite');
    this.movementHint.innerHTML = `
      <div class="hud__move-coach-desktop">
        <span class="hud__move-coach-kicker">Begin exploring</span>
        <div class="hud__move-keys"><kbd>W</kbd><span>or</span><kbd>↑</kbd></div>
        <strong>Move forward</strong>
        <small>Follow the golden trail</small>
      </div>
      <div class="hud__move-coach-touch">
        <span class="hud__joystick-pointer" aria-hidden="true">↓</span>
        <strong>Drag the joystick</strong>
        <small>Move forward into the forest</small>
      </div>
    `;
    this.root.classList.add('hud--hidden');

    this.title.textContent = 'The Mouse and the Lion';

    this.root.append(this.title, this.objective, this.movementHint);
    parent.appendChild(this.root);
  }

  setVisible(visible: boolean): void {
    this.root.classList.toggle('hud--hidden', !visible);
  }

  updateObjective(
    playerPosition: { x: number; z: number },
    targetPosition: { x: number; z: number },
    label = 'Sleeping lion',
  ): void {
    const dx = targetPosition.x - playerPosition.x;
    const dz = targetPosition.z - playerPosition.z;
    const distance = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, -dz);
    this.objectiveArrow.style.transform = `rotate(${angle}rad)`;
    this.objectiveLabel.textContent = label;
    this.objectiveDistance.textContent = `${Math.ceil(distance)} m away`;
  }

  setObjectiveVisible(visible: boolean): void {
    this.objective.classList.toggle('hud__objective--hidden', !visible);
  }

  showMovementHint(): void {
    this.movementHint.classList.remove('hud__move-coach--hidden');
    this.root.parentElement?.classList.add('is-movement-coached');
  }

  hideMovementHint(): void {
    this.movementHint.classList.add('hud__move-coach--hidden');
    this.root.parentElement?.classList.remove('is-movement-coached');
  }

  dispose(): void {
    this.root.parentElement?.classList.remove('is-movement-coached');
    this.root.remove();
  }
}
