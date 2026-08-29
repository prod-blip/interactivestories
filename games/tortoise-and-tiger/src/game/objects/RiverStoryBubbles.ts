import * as THREE from 'three';

type BubbleBurst = {
  group: THREE.Group;
  bubbles: THREE.Mesh[];
  ripple: THREE.Mesh;
  elapsed: number;
  active: boolean;
};

export class RiverStoryBubbles {
  readonly group = new THREE.Group();
  private readonly bursts: BubbleBurst[] = [];
  private nextBurst = 0;

  constructor() {
    this.group.name = 'SceneElevenRiverBubbles';
    for (let burstIndex = 0; burstIndex < 3; burstIndex += 1) {
      const burstGroup = new THREE.Group();
      const bubbles: THREE.Mesh[] = [];
      for (let index = 0; index < 4; index += 1) {
        const material = new THREE.MeshBasicMaterial({
          color: 0xe8ffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.07 + index * 0.018, 10, 7), material);
        bubble.position.set((index - 1.5) * 0.11, -0.38 - index * 0.08, (index % 2) * 0.08);
        bubbles.push(bubble);
        burstGroup.add(bubble);
      }
      const ripple = new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.17, 24),
        new THREE.MeshBasicMaterial({
          color: 0xdbffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.y = 0.16;
      burstGroup.add(ripple);
      burstGroup.visible = false;
      this.group.add(burstGroup);
      this.bursts.push({ group: burstGroup, bubbles, ripple, elapsed: 0, active: false });
    }
  }

  trigger(position: THREE.Vector3): void {
    const burst = this.bursts[this.nextBurst]!;
    this.nextBurst = (this.nextBurst + 1) % this.bursts.length;
    burst.elapsed = 0;
    burst.active = true;
    burst.group.visible = true;
    burst.group.position.copy(position);
    burst.group.position.y = 0;
    burst.ripple.scale.setScalar(0.35);
  }

  update(delta: number): void {
    this.bursts.forEach((burst) => {
      if (!burst.active) return;
      burst.elapsed += delta;
      const progress = THREE.MathUtils.clamp(burst.elapsed / 1.15, 0, 1);
      burst.bubbles.forEach((bubble, index) => {
        const local = THREE.MathUtils.clamp(progress * 1.45 - index * 0.09, 0, 1);
        bubble.position.y = -0.4 + local * (0.56 + index * 0.035);
        bubble.position.x = (index - 1.5) * 0.11 + Math.sin(progress * 7 + index) * 0.035;
        (bubble.material as THREE.MeshBasicMaterial).opacity = Math.sin(local * Math.PI) * 0.82;
      });
      const rippleProgress = THREE.MathUtils.smoothstep(progress, 0.5, 1);
      burst.ripple.scale.setScalar(0.35 + rippleProgress * 2.4);
      (burst.ripple.material as THREE.MeshBasicMaterial).opacity = (1 - rippleProgress) * 0.68;
      if (progress >= 1) {
        burst.active = false;
        burst.group.visible = false;
      }
    });
  }

  reset(): void {
    this.bursts.forEach((burst) => {
      burst.active = false;
      burst.elapsed = 0;
      burst.group.visible = false;
    });
  }

  getActiveCount(): number {
    return this.bursts.filter((burst) => burst.active).length;
  }
}
