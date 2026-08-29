export class ShellHideUI {
  private readonly objective = document.createElement('section');
  private readonly objectiveText = document.createElement('p');
  private readonly action = document.createElement('section');
  private readonly coach = document.createElement('div');
  private readonly coachInstruction = document.createElement('strong');
  private readonly button = document.createElement('button');
  private readonly count = document.createElement('span');
  private readonly markers = document.createElement('div');
  private readonly secondaryDialogue = document.createElement('div');
  private readonly secondarySpeaker = document.createElement('strong');
  private readonly secondaryText = document.createElement('span');
  private tapHandler: (() => void) | undefined;
  private total = 1;

  constructor(parent: HTMLElement, private readonly onInteract: () => void) {
    this.objective.className = 'shell-objective';
    this.objective.setAttribute('aria-live', 'polite');
    const objectivePanel = document.createElement('div');
    objectivePanel.className = 'shell-objective__panel';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'shell-objective__eyebrow';
    eyebrow.textContent = 'Objective';
    this.objectiveText.className = 'shell-objective__text';
    objectivePanel.append(eyebrow, this.objectiveText);
    this.objective.appendChild(objectivePanel);

    this.action.className = 'shell-action';
    this.coach.className = 'shell-action__coach';
    this.coach.id = 'shell-hide-coach';
    const coachKicker = document.createElement('span');
    coachKicker.className = 'shell-action__coach-kicker';
    coachKicker.textContent = 'Quick action';
    this.coachInstruction.className = 'shell-action__coach-instruction';
    const coachDetail = document.createElement('small');
    coachDetail.textContent = 'Fill the shell meter';
    this.coach.append(coachKicker, this.coachInstruction, coachDetail);
    this.button.className = 'shell-action__button';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', 'Hide inside your shell');
    this.button.setAttribute('aria-describedby', this.coach.id);
    const label = document.createElement('span');
    label.className = 'shell-action__label';
    label.textContent = 'HIDE!';
    this.count.className = 'shell-action__count';
    this.markers.className = 'shell-action__markers';
    this.markers.setAttribute('aria-hidden', 'true');
    this.button.append(label, this.count, this.markers);
    this.action.append(this.coach, this.button);

    this.secondaryDialogue.className = 'shell-secondary-dialogue';
    this.secondaryDialogue.setAttribute('role', 'status');
    this.secondaryDialogue.setAttribute('aria-live', 'polite');
    this.secondaryDialogue.append(this.secondarySpeaker, this.secondaryText);
    parent.append(this.objective, this.action, this.secondaryDialogue);
    this.button.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  showObjective(text: string): void {
    this.objectiveText.textContent = text;
    this.objective.classList.add('is-visible');
  }

  hideObjective(): void {
    this.objective.classList.remove('is-visible');
  }

  showAction(total: number, onTap: () => void): void {
    this.total = Math.max(1, total);
    this.tapHandler = onTap;
    this.coachInstruction.textContent = `Tap HIDE ${this.total} times`;
    this.markers.replaceChildren(...Array.from({ length: this.total }, () => {
      const marker = document.createElement('i');
      marker.className = 'shell-action__marker';
      return marker;
    }));
    this.setProgress(0);
    this.action.classList.add('is-visible');
    this.button.focus({ preventScroll: true });
  }

  setProgress(value: number): void {
    const completed = Math.round(Math.min(this.total, Math.max(0, value)));
    const progress = completed / this.total;
    this.button.style.setProperty('--hide-progress', `${progress * 360}deg`);
    this.button.setAttribute('aria-valuemin', '0');
    this.button.setAttribute('aria-valuemax', String(this.total));
    this.button.setAttribute('aria-valuenow', String(completed));
    this.count.textContent = `${completed} / ${this.total}`;
    [...this.markers.children].forEach((marker, index) => {
      marker.classList.toggle('is-filled', index < completed);
    });
    this.button.classList.remove('is-pulsing');
    void this.button.offsetWidth;
    this.button.classList.add('is-pulsing');
  }

  hideAction(): void {
    this.tapHandler = undefined;
    this.action.classList.remove('is-visible');
    this.button.blur();
  }

  showSecondaryDialogue(speaker: string, text: string): void {
    this.secondaryDialogue.classList.remove('is-sound-effect', 'is-ambient-effect');
    this.secondarySpeaker.textContent = speaker;
    this.secondaryText.textContent = text;
    this.secondaryDialogue.classList.add('is-visible');
  }

  showSoundEffect(text: string): void {
    this.secondarySpeaker.textContent = '';
    this.secondaryText.textContent = text;
    this.secondaryDialogue.classList.remove('is-sound-effect', 'is-ambient-effect');
    this.secondaryDialogue.classList.add('is-sound-effect', 'is-visible');
  }

  showAmbientEffect(text: string): void {
    this.secondarySpeaker.textContent = '';
    this.secondaryText.textContent = text;
    this.secondaryDialogue.classList.remove('is-sound-effect');
    this.secondaryDialogue.classList.add('is-ambient-effect', 'is-visible');
  }

  hideSecondaryDialogue(): void {
    this.secondaryDialogue.classList.remove('is-visible', 'is-sound-effect', 'is-ambient-effect');
  }

  isActionVisible(): boolean {
    return this.action.classList.contains('is-visible');
  }

  reset(): void {
    this.hideObjective();
    this.hideAction();
    this.hideSecondaryDialogue();
  }

  dispose(): void {
    this.button.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.objective.remove();
    this.action.remove();
    this.secondaryDialogue.remove();
  }

  private activate(): void {
    if (!this.tapHandler) return;
    this.onInteract();
    this.tapHandler();
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    this.activate();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || !this.tapHandler || (event.code !== 'Space' && event.code !== 'Enter')) return;
    event.preventDefault();
    event.stopPropagation();
    this.activate();
  };
}
