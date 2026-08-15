import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type HeroAction = 'hero' | 'idle' | 'wave' | 'run' | 'webShot';
type Mat = THREE.Material;

function addMesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: Mat, name: string): THREE.Mesh {
  const item = new THREE.Mesh(geometry, material);
  item.name = name;
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

function oval(
  parent: THREE.Object3D,
  material: Mat,
  name: string,
  position: [number, number, number],
  scale: [number, number, number],
  segments = 24,
): THREE.Mesh {
  const item = addMesh(parent, new THREE.SphereGeometry(1, segments, Math.max(12, segments / 2)), material, name);
  item.position.set(...position);
  item.scale.set(...scale);
  return item;
}

function capsule(parent: THREE.Object3D, material: Mat, name: string, length: number, radius: number): THREE.Mesh {
  const item = addMesh(parent, new THREE.CapsuleGeometry(radius, length - radius * 2, 8, 16), material, name);
  item.position.y = -length / 2;
  return item;
}

function line(
  parent: THREE.Object3D,
  material: Mat,
  name: string,
  points: Array<[number, number, number]>,
  radius = 0.009,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return addMesh(parent, new THREE.TubeGeometry(curve, 16, radius, 5, false), material, name);
}

function suitTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  context.fillStyle = '#c42530';
  context.fillRect(0, 0, 512, 512);
  context.strokeStyle = '#161b20';
  context.lineWidth = 4;
  for (let x = -180; x <= 680; x += 72) {
    context.beginPath();
    context.moveTo(256, 256);
    context.lineTo(x, -20);
    context.stroke();
    context.beginPath();
    context.moveTo(256, 256);
    context.lineTo(x, 532);
    context.stroke();
  }
  for (const radius of [52, 105, 165, 230, 300]) {
    context.beginPath();
    context.ellipse(256, 256, radius, radius * 0.72, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = 'rgba(255,255,255,.13)';
  for (let y = 0; y < 512; y += 9) {
    for (let x = y % 18 ? 4 : 0; x < 512; x += 9) context.fillRect(x, y, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.25, 1.7);
  return texture;
}

/** Standalone, articulated child hero made specifically for the Character Lab. */
export class WebWarriorBoy {
  readonly group = new THREE.Group();

  private readonly materials: Mat[] = [];
  private readonly textures: THREE.Texture[] = [];
  private readonly joints = {
    hips: new THREE.Group(),
    chest: new THREE.Group(),
    neck: new THREE.Group(),
    head: new THREE.Group(),
    shoulderL: new THREE.Group(), shoulderR: new THREE.Group(),
    elbowL: new THREE.Group(), elbowR: new THREE.Group(),
    wristL: new THREE.Group(), wristR: new THREE.Group(),
    hipL: new THREE.Group(), hipR: new THREE.Group(),
    kneeL: new THREE.Group(), kneeR: new THREE.Group(),
    ankleL: new THREE.Group(), ankleR: new THREE.Group(),
  };
  private action: HeroAction = 'hero';
  private elapsed = 0;

  constructor() {
    this.group.name = 'AryaanWebWarriorBoy';
    const map = suitTexture();
    this.textures.push(map);
    const red = new THREE.MeshPhysicalMaterial({ color: 0xd32a34, map, roughness: 0.54, clearcoat: 0.18 });
    const redPlain = new THREE.MeshStandardMaterial({ color: 0xbd202b, roughness: 0.6 });
    const blue = new THREE.MeshPhysicalMaterial({ color: 0x123e75, roughness: 0.64, sheen: 0.4, sheenColor: new THREE.Color(0x4c7fae) });
    const black = new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 0.5 });
    const charcoal = new THREE.MeshStandardMaterial({ color: 0x252b31, roughness: 0.72 });
    const skin = new THREE.MeshPhysicalMaterial({ color: 0xa85d3c, roughness: 0.7, sheen: 0.15, sheenColor: new THREE.Color(0xffb28b) });
    const noseSkin = new THREE.MeshStandardMaterial({ color: 0xb96d49, roughness: 0.72 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x100b08, roughness: 0.78 });
    const hairWarm = new THREE.MeshStandardMaterial({ color: 0x2c1810, roughness: 0.74 });
    const white = new THREE.MeshPhysicalMaterial({ color: 0xfffaf0, roughness: 0.22, clearcoat: 0.35 });
    const brown = new THREE.MeshPhysicalMaterial({ color: 0x21130d, roughness: 0.12, clearcoat: 1 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lips = new THREE.MeshStandardMaterial({ color: 0x642b26, roughness: 0.78 });
    const sole = new THREE.MeshStandardMaterial({ color: 0x15191d, roughness: 0.86 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x4f5961, metalness: 0.55, roughness: 0.4 });
    this.materials.push(red, redPlain, blue, black, charcoal, skin, noseSkin, hair, hairWarm, white, brown, shine, lips, sole, metal);

    const j = this.joints;
    Object.entries(j).forEach(([key, joint]) => { joint.name = `${key}Joint`; });
    j.hips.position.y = 1.62;
    this.group.add(j.hips);

    // Body is intentionally generic; every limb section has its own pivot.
    oval(j.hips, blue, 'Pelvis', [0, 0.03, 0], [0.4, 0.32, 0.26]);
    const belt = addMesh(j.hips, new THREE.CylinderGeometry(0.41, 0.42, 0.12, 28), black, 'UtilityBelt');
    belt.position.y = 0.2;
    belt.scale.z = 0.76;
    const buckle = addMesh(j.hips, new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8), redPlain, 'HeroBuckle');
    buckle.rotation.x = Math.PI / 2;
    buckle.position.set(0, 0.2, -0.28);
    for (const side of [-1, 1]) {
      const pouch = addMesh(j.hips, new THREE.BoxGeometry(0.16, 0.15, 0.11), charcoal, 'BeltPouch');
      pouch.position.set(side * 0.31, 0.18, -0.13);
      const clasp = addMesh(pouch, new THREE.BoxGeometry(0.06, 0.025, 0.014), metal, 'PouchClasp');
      clasp.position.z = -0.063;
    }

    j.chest.position.y = 0.2;
    j.hips.add(j.chest);
    oval(j.chest, blue, 'TorsoBlue', [0, 0.58, 0.02], [0.51, 0.65, 0.3]);
    oval(j.chest, red, 'TorsoRedPanel', [0, 0.66, -0.245], [0.43, 0.54, 0.075]);
    for (const side of [-1, 1]) {
      const cap = oval(j.chest, red, 'ShoulderSuitPanel', [side * 0.42, 0.77, -0.06], [0.22, 0.27, 0.28]);
      cap.rotation.z = side * 0.16;
      line(j.chest, black, 'SuitEdge', [[side * 0.04, 0.19, -0.3], [side * 0.25, 0.34, -0.3], [side * 0.45, 0.67, -0.19]], 0.012);
    }
    this.addSpider(j.chest, black);

    j.neck.position.set(0, 1.12, 0);
    j.chest.add(j.neck);
    const neck = addMesh(j.neck, new THREE.CylinderGeometry(0.17, 0.19, 0.25, 20), red, 'SuitNeck');
    neck.position.y = 0.04;
    j.head.position.y = 0.15;
    j.neck.add(j.head);
    this.buildFace(j.head, skin, noseSkin, hair, hairWarm, white, brown, black, shine, lips);
    this.loadDetailedFace(j.head);

    this.buildArm(-1, j.shoulderL, j.elbowL, j.wristL, red, blue, black);
    this.buildArm(1, j.shoulderR, j.elbowR, j.wristR, red, blue, black);
    j.shoulderL.position.set(-0.49, 0.9, 0);
    j.shoulderR.position.set(0.49, 0.9, 0);
    j.chest.add(j.shoulderL, j.shoulderR);

    this.buildLeg(j.hipL, j.kneeL, j.ankleL, blue, red, black, sole);
    this.buildLeg(j.hipR, j.kneeR, j.ankleR, blue, red, black, sole);
    j.hipL.position.set(-0.22, 0.02, 0);
    j.hipR.position.set(0.22, 0.02, 0);
    j.hips.add(j.hipL, j.hipR);

    this.group.userData.sculptRuntime = {
      nodes: { root: this.group, ...j },
      sockets: { head: j.head, leftHand: j.wristL, rightHand: j.wristR, leftFoot: j.ankleL, rightFoot: j.ankleR },
      colliders: {
        body: { type: 'capsule', radius: 0.46, height: 2.75, offset: [0, 1.52, 0] },
        head: { type: 'sphere', radius: 0.45, offset: [0, 3.2, 0] },
      },
      articulated: true,
      sandboxOnly: true,
    };
    this.setAction('hero');
  }

  setAction(action: HeroAction): void {
    this.action = action;
    this.elapsed = 0;
    this.pose(0);
  }

  update(delta: number): void {
    this.elapsed += delta;
    this.pose(this.elapsed);
  }

  private buildFace(head: THREE.Group, skin: Mat, noseSkin: Mat, hair: Mat, hairWarm: Mat, white: Mat, brown: Mat, black: Mat, shine: Mat, lips: Mat): void {
    const fallback = new THREE.Group();
    fallback.name = 'ProceduralFaceFallback';
    head.add(fallback);
    head = fallback;
    // Broad forehead, small tapered chin and oversized eyes match the supplied six-year-old reference.
    oval(head, skin, 'Face', [0, 0.34, 0], [0.42, 0.51, 0.38], 40);
    oval(head, skin, 'LeftCheek', [-0.21, 0.2, -0.31], [0.19, 0.18, 0.09], 24);
    oval(head, skin, 'RightCheek', [0.21, 0.2, -0.31], [0.19, 0.18, 0.09], 24);
    oval(head, skin, 'LeftEar', [-0.405, 0.35, 0], [0.065, 0.13, 0.06], 20);
    oval(head, skin, 'RightEar', [0.405, 0.35, 0], [0.065, 0.13, 0.06], 20);
    oval(head, noseSkin, 'Nose', [0, 0.29, -0.38], [0.07, 0.09, 0.05], 20);
    for (const side of [-1, 1]) {
      const eye = oval(head, white, side < 0 ? 'LeftEye' : 'RightEye', [side * 0.17, 0.4, -0.35], [0.115, 0.13, 0.044], 26);
      eye.rotation.z = side * -0.08;
      oval(head, brown, 'DarkBrownIris', [side * 0.17, 0.4, -0.392], [0.063, 0.072, 0.022], 20);
      oval(head, black, 'Pupil', [side * 0.17, 0.4, -0.411], [0.038, 0.044, 0.012], 16);
      oval(head, shine, 'EyeCatchlight', [side * 0.148, 0.438, -0.425], [0.016, 0.02, 0.008], 10);
      line(head, hair, 'Eyebrow', [[side * 0.27, 0.55, -0.33], [side * 0.17, 0.575, -0.37], [side * 0.07, 0.55, -0.37]], 0.016);
    }
    line(head, lips, 'Smile', [[-0.16, 0.16, -0.35], [-0.08, 0.115, -0.39], [0, 0.105, -0.4], [0.08, 0.115, -0.39], [0.16, 0.16, -0.35]], 0.014);
    const lipHighlight = new THREE.MeshBasicMaterial({ color: 0xf1d0bd });
    this.materials.push(lipHighlight);
    line(head, lipHighlight, 'LowerLipHighlight', [[-0.09, 0.1, -0.389], [0, 0.08, -0.398], [0.09, 0.1, -0.389]], 0.007);

    // Dense asymmetrical side-part, swept up and right as in the close-up.
    oval(head, hair, 'HairCap', [0, 0.72, 0.02], [0.42, 0.27, 0.37], 30);
    const locks: Array<[number, number, number, number, number]> = [
      [-.31,.76,-.2,-.42,.16],[-.21,.86,-.25,-.3,.19],[-.08,.91,-.27,-.18,.21],[.06,.92,-.26,-.08,.22],
      [.2,.88,-.23,.08,.2],[.31,.79,-.18,.22,.17],[.36,.68,-.1,.3,.15],[-.29,.7,-.31,-.35,.14],
      [-.13,.77,-.36,-.22,.15],[.03,.8,-.37,-.08,.15],[.18,.78,-.34,.1,.15],[.3,.72,-.27,.22,.14],
    ];
    locks.forEach(([x, y, z, rz, size], index) => {
      const lock = oval(head, index % 3 ? hair : hairWarm, `SweptHairLock${index + 1}`, [x, y, z], [size, size * .4, size * .36], 14);
      lock.rotation.z = rz;
      lock.rotation.y = rz * .5;
    });
    line(head, hairWarm, 'SidePart', [[-.25,.77,-.35],[-.12,.82,-.38],[.02,.82,-.39],[.17,.78,-.36]], .013);
  }

  private loadDetailedFace(headJoint: THREE.Group): void {
    const loader = new GLTFLoader();
    loader.load(
      `${import.meta.env.BASE_URL}models/Aryaan_Face_Only.glb`,
      (gltf) => {
        const object = gltf.scene;
        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = true;
          child.receiveShadow = true;
          const loadedMaterials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of loadedMaterials) {
            if (!this.materials.includes(material)) this.materials.push(material);
            if (!(material instanceof THREE.MeshStandardMaterial)) continue;
            for (const texture of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap]) {
              if (texture && !this.textures.includes(texture)) this.textures.push(texture);
            }
          }
        });

        const bounds = new THREE.Box3().setFromObject(object);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        object.position.copy(center).multiplyScalar(-1);

        const detailedFace = new THREE.Group();
        detailedFace.name = 'DetailedGlbFace';
        detailedFace.position.set(0, 0.31, 0);
        detailedFace.scale.setScalar(1.08 / size.y);
        detailedFace.add(object);
        headJoint.add(detailedFace);

        const fallback = headJoint.getObjectByName('ProceduralFaceFallback');
        if (fallback) fallback.visible = false;
      },
      undefined,
      (error) => console.warn('Could not load detailed Aryaan face; retaining procedural fallback.', error),
    );
  }

  private addSpider(parent: THREE.Object3D, black: Mat): void {
    oval(parent, black, 'ChestSpiderBody', [0, .66, -.33], [.065,.15,.025], 14);
    oval(parent, black, 'ChestSpiderHead', [0, .84, -.33], [.05,.065,.024], 12);
    for (const side of [-1, 1]) for (let index = 0; index < 4; index += 1) {
      const y = .77 - index * .07;
      line(parent, black, 'ChestSpiderLeg', [[side*.025,y,-.335],[side*(.11+index*.017),y+(index<2?.065:-.05),-.34],[side*(.18+index*.012),y+(index<2?.005:-.11),-.32]], .012);
    }
  }

  private buildArm(side: number, shoulder: THREE.Group, elbow: THREE.Group, wrist: THREE.Group, red: Mat, blue: Mat, black: Mat): void {
    capsule(shoulder, blue, 'UpperArm', .58, .16);
    oval(shoulder, red, 'ShoulderArmor', [0,-.05,0], [.17,.19,.165]);
    elbow.position.y = -.55;
    shoulder.add(elbow);
    capsule(elbow, red, 'ForearmGauntlet', .54, .14);
    const cuff = addMesh(elbow, new THREE.CylinderGeometry(.16,.16,.08,16), black, 'GauntletCuff');
    cuff.position.y = -.46;
    wrist.position.y = -.53;
    elbow.add(wrist);
    oval(wrist, red, 'GlovedHand', [0,-.11,-.02], [.14,.18,.13], 18);
    for (let finger = 0; finger < 4; finger += 1) oval(wrist, red, `Finger${finger+1}`, [(finger-1.5)*.04,-.22,-.055],[.028,.075,.033],10);
    line(wrist, black, 'GloveWeb', [[-.09,-.06,-.14],[0,-.13,-.16],[.09,-.06,-.14]], .007);
    shoulder.userData.side = side;
  }

  private buildLeg(hip: THREE.Group, knee: THREE.Group, ankle: THREE.Group, blue: Mat, red: Mat, black: Mat, sole: Mat): void {
    capsule(hip, blue, 'UpperLeg', .76, .2);
    knee.position.y = -.72;
    hip.add(knee);
    capsule(knee, blue, 'LowerLeg', .7, .16);
    const shin = capsule(knee, red, 'RedShinArmor', .47, .17);
    shin.position.y = -.48;
    oval(knee, red, 'KneeGuard', [0,-.04,-.15],[.18,.13,.065],16);
    ankle.position.y = -.68;
    knee.add(ankle);
    const boot = oval(ankle, red, 'Boot', [0,-.1,-.12],[.19,.19,.34],20);
    boot.rotation.x = -.2;
    const base = addMesh(ankle, new THREE.BoxGeometry(.34,.085,.52), sole, 'BootSole');
    base.position.set(0,-.25,-.13);
    oval(ankle, black, 'ToeCap', [0,-.15,-.37],[.17,.1,.14],14);
    for (const y of [-.02,-.11,-.19]) {
      const strap = addMesh(ankle, new THREE.BoxGeometry(.32,.04,.055), black, 'BootStrap');
      strap.position.set(0,y,-.29);
    }
  }

  private pose(time: number): void {
    const j = this.joints;
    Object.values(j).forEach((joint) => joint.rotation.set(0, 0, 0));
    const breathe = Math.sin(time * 2.1);
    j.hips.position.y = 1.62;
    j.chest.position.y = .2 + breathe * .008;
    j.neck.position.set(0, 1.12, 0);
    j.head.position.y = .15;
    if (this.action === 'hero' || this.action === 'idle') {
      const hero = this.action === 'hero' ? 1 : 0;
      j.shoulderL.rotation.z = -.12 - hero*.52;
      j.shoulderR.rotation.z = .12 + hero*.52;
      j.elbowL.rotation.z = .12 + hero*1.05;
      j.elbowR.rotation.z = -.12 - hero*1.05;
      j.hipL.rotation.z = .035;
      j.hipR.rotation.z = -.035;
      j.head.rotation.y = Math.sin(time*.7) * (hero ? .025 : .055);
    } else if (this.action === 'wave') {
      j.shoulderL.rotation.z=-.25; j.elbowL.rotation.z=.35;
      j.shoulderR.rotation.z=2.65; j.elbowR.rotation.z=-.2+Math.sin(time*5)*.22; j.wristR.rotation.z=Math.sin(time*7)*.25;
      j.head.rotation.set(0,-.12,-.06);
    } else if (this.action === 'run') {
      const stride=Math.sin(time*6.4), liftL=Math.max(0,-stride), liftR=Math.max(0,stride);
      j.hips.position.y += Math.abs(Math.cos(time*6.4))*.04;
      j.chest.rotation.x=.1; j.hipL.rotation.x=stride*.7; j.hipR.rotation.x=-stride*.7;
      j.kneeL.rotation.x=liftL; j.kneeR.rotation.x=liftR;
      j.shoulderL.rotation.x=-stride*.7; j.shoulderR.rotation.x=stride*.7;
      j.elbowL.rotation.x=-.5; j.elbowR.rotation.x=-.5;
    } else {
      j.hips.rotation.y=-.2; j.chest.rotation.y=.32;
      j.shoulderL.rotation.set(-1.05,-.15,.7); j.elbowL.rotation.set(-.25,0,-.4);
      j.shoulderR.rotation.set(-1.32,.1,-.68); j.elbowR.rotation.set(-.2,0,.16); j.wristR.rotation.x=-.35;
      j.head.rotation.y=-.18; j.hipL.rotation.z=.09; j.hipR.rotation.z=-.09;
    }
  }

  dispose(): void {
    this.group.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    this.materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
  }
}

export type { HeroAction };
