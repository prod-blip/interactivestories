export class SceneOneUI {
  private readonly root = document.createElement('section');
  private readonly panel = document.createElement('div');
  private visible = false;
  private dismissed = false;

  constructor(parent: HTMLElement, private readonly onDismiss: () => void) {
    this.root.className = 'narrator-card';
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-label', 'Narrator');
    this.panel.className = 'narrator-card__panel';
    this.panel.innerHTML = `
      <span class="narrator-card__eyebrow">Narrator</span>
      <p class="narrator-card__text">Once upon a time, beside a beautiful forest river, lived a small but very clever tortoise.</p>
    `;
    this.root.appendChild(this.panel);
    parent.appendChild(this.root);
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  show(): void {
    if (this.dismissed || this.visible) return;
    this.visible = true;
    this.root.classList.add('is-visible');
  }

  reset(): void {
    this.visible = false;
    this.dismissed = false;
    this.root.classList.remove('is-visible');
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.root.remove();
  }

  private dismiss(): void {
    if (!this.visible || this.dismissed) return;
    this.visible = false;
    this.dismissed = true;
    this.root.classList.remove('is-visible');
    this.onDismiss();
  }

  private readonly handlePointerDown = (): void => this.dismiss();

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!event.repeat && (event.code === 'Enter' || event.code === 'Space')) this.dismiss();
  };
}
