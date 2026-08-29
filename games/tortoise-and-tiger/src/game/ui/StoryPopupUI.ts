export type StoryPopupKind = 'narrator' | 'dialogue';

export class StoryPopupUI {
  private readonly narratorRoot = document.createElement('section');
  private readonly narratorText = document.createElement('p');
  private readonly dialogueRoot = document.createElement('section');
  private readonly dialogueSpeaker = document.createElement('div');
  private readonly dialogueText = document.createElement('div');
  private visibleKind: StoryPopupKind | undefined;
  private onDismiss: (() => void) | undefined;

  constructor(parent: HTMLElement, private readonly onInteract: () => void) {
    this.narratorRoot.className = 'narrator-card';
    this.narratorRoot.setAttribute('aria-live', 'polite');
    this.narratorRoot.setAttribute('aria-label', 'Narrator');
    const narratorPanel = document.createElement('div');
    narratorPanel.className = 'narrator-card__panel';
    const narratorSpeaker = document.createElement('span');
    narratorSpeaker.className = 'narrator-card__eyebrow';
    narratorSpeaker.textContent = 'Narrator';
    this.narratorText.className = 'narrator-card__text';
    narratorPanel.append(narratorSpeaker, this.narratorText);
    this.narratorRoot.appendChild(narratorPanel);

    this.dialogueRoot.className = 'encounter-dialogue';
    this.dialogueRoot.setAttribute('aria-live', 'polite');
    const dialoguePanel = document.createElement('div');
    dialoguePanel.className = 'encounter-dialogue__panel';
    this.dialogueSpeaker.className = 'encounter-dialogue__speaker';
    this.dialogueText.className = 'encounter-dialogue__text';
    dialoguePanel.append(this.dialogueSpeaker, this.dialogueText);
    this.dialogueRoot.appendChild(dialoguePanel);

    parent.append(this.narratorRoot, this.dialogueRoot);
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  showNarrator(text: string, onDismiss?: () => void): void {
    this.hide(false);
    this.visibleKind = 'narrator';
    this.onDismiss = onDismiss;
    this.narratorText.textContent = text;
    this.narratorRoot.classList.add('is-visible');
  }

  showDialogue(speaker: string, text: string, onDismiss?: () => void): void {
    this.hide(false);
    this.visibleKind = 'dialogue';
    this.onDismiss = onDismiss;
    this.dialogueSpeaker.textContent = speaker;
    this.dialogueText.textContent = text;
    this.dialogueRoot.setAttribute('aria-label', speaker);
    this.dialogueRoot.classList.add('is-visible');
  }

  getVisibleKind(): StoryPopupKind | undefined {
    return this.visibleKind;
  }

  reset(): void {
    this.hide(false);
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.narratorRoot.remove();
    this.dialogueRoot.remove();
  }

  private hide(notify: boolean): void {
    if (!this.visibleKind && !this.onDismiss) return;
    const callback = notify ? this.onDismiss : undefined;
    this.visibleKind = undefined;
    this.onDismiss = undefined;
    this.narratorRoot.classList.remove('is-visible');
    this.dialogueRoot.classList.remove('is-visible');
    callback?.();
  }

  private dismiss(): void {
    if (!this.visibleKind) return;
    this.onInteract();
    this.hide(true);
  }

  private readonly handlePointerDown = (): void => this.dismiss();

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!event.repeat && (event.code === 'Enter' || event.code === 'Space')) this.dismiss();
  };
}
