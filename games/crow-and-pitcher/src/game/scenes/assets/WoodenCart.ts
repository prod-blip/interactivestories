import * as THREE from 'three';

export class WoodenCart extends THREE.Group {
  constructor() {
    super();
    this.name = 'Old_Wooden_Cart';
    const wood = new THREE.MeshStandardMaterial({ color: 0x72451f, roughness: 1 });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x4d2d17, roughness: 1 });

    const bed = new THREE.Group();
    for (let index = 0; index < 6; index += 1) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 0.48), index % 2 ? wood : darkWood);
      plank.position.z = (index - 2.5) * 0.49;
      plank.castShadow = true;
      bed.add(plank);
    }
    bed.position.y = 1.2;
    bed.rotation.x = 0.17;
    this.add(bed);

    [-1, 1].forEach((side) => {
      const wheel = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.13, 8, 28), darkWood);
      rim.rotation.y = Math.PI / 2;
      wheel.add(rim);
      for (let spokeIndex = 0; spokeIndex < 8; spokeIndex += 1) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.95, 0.09), wood);
        spoke.rotation.x = spokeIndex * Math.PI / 4;
        wheel.add(spoke);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.45, 10), darkWood);
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      wheel.position.set(side * 2.05, 1.05, 0.2);
      wheel.rotation.x = 0.08 * side;
      wheel.traverse((child) => { if (child instanceof THREE.Mesh) child.castShadow = true; });
      this.add(wheel);
    });

    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 5.4), wood);
      rail.position.set(side * 1.25, 0.75, 3.3);
      rail.rotation.x = -0.08;
      rail.castShadow = true;
      this.add(rail);
    }
    this.rotation.set(-0.08, -0.58, 0.08);
  }
}
