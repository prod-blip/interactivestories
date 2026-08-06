import type { DialogueLine } from '../../story/script';

type EndingActions = {
  onRestart: () => void;
  onExplore: () => void;
  onMenu: () => void;
};

export class Hud {
  private readonly root = document.createElement('div');
  private readonly objective = document.createElement('div');
  private readonly compassArrow = document.createElement('span');
  private readonly objectiveKicker = document.createElement('span');
  private readonly objectiveLabel = document.createElement('strong');
  private readonly objectiveDistance = document.createElement('small');
  private readonly objectiveToast = document.createElement('div');
  private readonly hint = document.createElement('div');
  private readonly thought = document.createElement('div');
  private readonly thoughtSpeaker = document.createElement('span');
  private readonly thoughtText = document.createElement('span');
  private readonly counter = document.createElement('div');
  private readonly dialogue = document.createElement('section');
  private readonly dialoguePanel = document.createElement('div');
  private readonly dialogueSpeaker = document.createElement('div');
  private readonly dialogueText = document.createElement('div');
  private readonly ending = document.createElement('section');
  private dialogueChain: Promise<void> = Promise.resolve();
  private objectiveTimer = 0;
  private hintTimer = 0;
  private thoughtTimer = 0;
  private lineResolver: (() => void) | null = null;
  private disposed = false;

  constructor(parent: HTMLElement) {
    this.root.className = 'hud';
    this.objective.className = 'hud__objective';
    this.objective.innerHTML = '<span class="hud__compass"><span class="hud__compass-ring"></span></span><span class="hud__objective-copy"></span>';
    this.compassArrow.className = 'hud__compass-arrow';
    this.compassArrow.textContent = '↑';
    this.objective.querySelector('.hud__compass')?.append(this.compassArrow);
    this.objectiveKicker.className = 'hud__objective-kicker';
    this.objectiveLabel.className = 'hud__objective-label';
    this.objectiveDistance.className = 'hud__objective-distance';
    this.objective.querySelector('.hud__objective-copy')?.append(this.objectiveKicker, this.objectiveLabel, this.objectiveDistance);

    this.objectiveToast.className = 'hud__objective-toast';
    this.hint.className = 'hud__hint';
    this.thought.className = 'crow-thought';
    this.thoughtSpeaker.className = 'crow-thought__speaker';
    this.thoughtText.className = 'crow-thought__text';
    this.thought.append(this.thoughtSpeaker, this.thoughtText);
    this.counter.className = 'hud__counter';

    this.dialogue.className = 'story-dialogue';
    this.dialogue.setAttribute('aria-live', 'polite');
    this.dialoguePanel.className = 'story-dialogue__panel';
    this.dialogueSpeaker.className = 'story-dialogue__speaker';
    this.dialogueText.className = 'story-dialogue__text';
    this.dialoguePanel.append(this.dialogueSpeaker, this.dialogueText);
    this.dialogue.append(this.dialoguePanel);

    this.ending.className = 'story-card story-card--ending';
    this.ending.setAttribute('role', 'dialog');
    this.root.append(this.objective, this.objectiveToast, this.hint, this.thought, this.counter);
    parent.append(this.root, this.dialogue, this.ending);
  }

  setObjective(text: string, kicker = 'Current objective'): void {
    this.objectiveKicker.textContent = kicker;
    this.objectiveLabel.textContent = text;
  }

  setObjectiveVisible(visible: boolean): void {
    this.objective.classList.toggle('is-hidden', !visible);
  }

  showObjective(text: string, duration = 3400): void {
    clearTimeout(this.objectiveTimer);
    this.objectiveToast.textContent = text;
    this.objectiveToast.classList.add('is-visible');
    this.objectiveTimer = window.setTimeout(() => this.objectiveToast.classList.remove('is-visible'), duration);
  }

  showHint(text: string, duration = 3800): void {
    clearTimeout(this.hintTimer);
    this.hint.textContent = text;
    this.hint.classList.add('is-visible');
    this.hintTimer = window.setTimeout(() => this.hint.classList.remove('is-visible'), duration);
  }

  showThought(speaker: string, text: string, duration = 3200): void {
    clearTimeout(this.thoughtTimer);
    this.thoughtSpeaker.textContent = speaker;
    this.thoughtText.textContent = `“${text}”`;
    this.thought.classList.add('is-visible');
    this.thoughtTimer = window.setTimeout(() => this.thought.classList.remove('is-visible'), duration);
  }

  setCounter(collected: number, total: number, carrying = false): void {
    this.counter.innerHTML = `<span aria-hidden="true">●</span> Pebbles: <strong>${collected} / ${total}</strong>${carrying ? '<small>Pebble in beak</small>' : ''}`;
    this.counter.classList.toggle('is-visible', collected < total || carrying);
  }

  hideCounter(): void {
    this.counter.classList.remove('is-visible');
  }

  updateCompass(angle: number, distance: number, visible = true, assisted = false): void {
    this.objective.classList.toggle('has-compass', visible);
    this.objective.classList.toggle('is-assisted', assisted);
    this.compassArrow.style.transform = `rotate(${angle}rad)`;
    this.objectiveDistance.textContent = visible && distance >= 0 ? `${Math.max(1, Math.round(distance))} steps away` : '';
  }

  playDialogue(lines: readonly DialogueLine[], onLine?: (line: DialogueLine, index: number) => void): Promise<void> {
    const sequence = this.dialogueChain.then(() => this.runDialogue(lines, onLine));
    this.dialogueChain = sequence.catch(() => undefined);
    return sequence;
  }

  playOpeningNarration(lines: readonly DialogueLine[]): Promise<void> {
    const sequence = this.dialogueChain.then(() => this.runOpeningNarration(lines));
    this.dialogueChain = sequence.catch(() => undefined);
    return sequence;
  }

  showEnding(moral: string, explanation: string, actions: EndingActions): void {
    this.ending.innerHTML = `
      <div class="story-ending__card">
        <p class="story-ending__eyebrow">The crow found a way.</p>
        <h2>${moral}</h2>
        <p class="story-ending__moral">${explanation}</p>
        <div class="story-ending__actions">
          <button type="button" data-action="restart">Play Again</button>
          <button type="button" data-action="explore">Explore the World</button>
          <button type="button" data-action="menu">Main Menu</button>
        </div>
      </div>
    `;
    this.ending.classList.add('is-visible');
    this.ending.querySelector('[data-action="restart"]')?.addEventListener('click', actions.onRestart, { once: true });
    this.ending.querySelector('[data-action="explore"]')?.addEventListener('click', actions.onExplore, { once: true });
    this.ending.querySelector('[data-action="menu"]')?.addEventListener('click', actions.onMenu, { once: true });
  }

  hideEnding(): void {
    this.ending.classList.remove('is-visible');
  }

  dispose(): void {
    this.disposed = true;
    clearTimeout(this.objectiveTimer);
    clearTimeout(this.hintTimer);
    clearTimeout(this.thoughtTimer);
    this.lineResolver?.();
    this.root.remove();
    this.dialogue.remove();
    this.ending.remove();
  }

  private async runDialogue(lines: readonly DialogueLine[], onLine?: (line: DialogueLine, index: number) => void): Promise<void> {
    if (this.disposed || lines.length === 0) return;
    this.dialogue.classList.add('is-visible');
    for (const [index, line] of lines.entries()) {
      if (this.disposed) return;
      onLine?.(line, index);
      this.dialogue.classList.remove('is-ready');
      this.dialogue.dataset.speaker = line.speaker.toLowerCase();
      this.dialogueSpeaker.textContent = line.speaker;
      const text = line.speaker === 'Crow' ? `“${line.text}”` : line.text;
      this.dialogueText.textContent = text;
      await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
      this.dialogue.classList.add('is-ready');
      await this.waitForAdvance();
    }
    this.dialogue.classList.remove('is-visible', 'is-ready');
    await new Promise<void>((resolve) => window.setTimeout(resolve, 380));
  }

  private async runOpeningNarration(lines: readonly DialogueLine[]): Promise<void> {
    if (this.disposed || lines.length === 0) return;
    this.dialogue.classList.add('is-opening-narration', 'is-visible');
    this.dialogue.dataset.speaker = 'narrator';
    this.dialogueSpeaker.textContent = 'Narrator';
    this.dialogueText.textContent = '';

    for (const [index, line] of lines.entries()) {
      if (this.disposed) return;
      const paragraph = document.createElement('span');
      paragraph.className = 'story-dialogue__opening-line';
      paragraph.textContent = line.text;
      this.dialogueText.append(paragraph);
      await new Promise<void>((resolve) => requestAnimationFrame(() => {
        paragraph.classList.add('is-visible');
        resolve();
      }));
      const wordCount = line.text.trim().split(/\s+/).length;
      const readingTime = Math.max(3200, Math.min(6500, 1600 + wordCount * 260));
      const isFinalLine = index === lines.length - 1;
      if (isFinalLine) await this.waitForAdvance();
      else await this.waitForAdvanceOrDelay(readingTime);
    }

    this.dialogue.classList.remove('is-visible', 'is-opening-narration');
    await new Promise<void>((resolve) => window.setTimeout(resolve, 380));
  }

  private waitForAdvanceOrDelay(duration: number): Promise<void> {
    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('keydown', onKeyDown);
        this.lineResolver = null;
        resolve();
      };
      const onPointerDown = (event: PointerEvent) => {
        event.preventDefault();
        finish();
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (['Space', 'Enter', 'KeyW', 'ArrowUp'].includes(event.code) && !event.repeat) finish();
      };
      const timer = window.setTimeout(finish, duration);
      this.lineResolver = finish;
      window.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('keydown', onKeyDown);
    });
  }

  private waitForAdvance(): Promise<void> {
    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('keydown', onKeyDown);
        this.lineResolver = null;
        resolve();
      };
      const onPointerDown = (event: PointerEvent) => {
        event.preventDefault();
        finish();
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (['Space', 'Enter', 'KeyW', 'ArrowUp'].includes(event.code) && !event.repeat) finish();
      };
      this.lineResolver = finish;
      window.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('keydown', onKeyDown);
    });
  }

}
