import * as THREE from 'three';

type ModelMaterial = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function createClothTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  const random = seededRandom(117);

  context.fillStyle = '#8b826f';
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 1800; index += 1) {
    const value = Math.floor(70 + random() * 85);
    context.fillStyle = `rgba(${value}, ${value - 5}, ${value - 15}, ${0.025 + random() * 0.08})`;
    context.fillRect(random() * size, random() * size, 1 + random() * 5, 1 + random() * 10);
  }

  context.strokeStyle = 'rgba(37, 35, 29, 0.76)';
  context.lineCap = 'round';
  for (let column = 0; column < 5; column += 1) {
    const baseX = 125 + column * 175 + random() * 40;
    const startY = 145 + random() * 120;
    const glyphCount = 4 + Math.floor(random() * 3);
    for (let glyph = 0; glyph < glyphCount; glyph += 1) {
      const y = startY + glyph * 130;
      context.lineWidth = 10 + random() * 16;
      context.beginPath();
      context.moveTo(baseX - 28 + random() * 30, y);
      context.quadraticCurveTo(baseX + 38, y + 30 + random() * 25, baseX - 8 + random() * 25, y + 88);
      context.stroke();
      context.lineWidth *= 0.55;
      context.beginPath();
      context.moveTo(baseX - 42, y + 45);
      context.lineTo(baseX + 48, y + 28 + random() * 32);
      context.stroke();
    }
  }

  const stain = context.createRadialGradient(size * 0.52, size * 0.67, 15, size * 0.52, size * 0.67, size * 0.5);
  stain.addColorStop(0, 'rgba(38, 34, 27, 0.34)');
  stain.addColorStop(0.55, 'rgba(55, 51, 41, 0.12)');
  stain.addColorStop(1, 'rgba(92, 83, 67, 0)');
  context.fillStyle = stain;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 1);
  return texture;
}

function createClothBump(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  context.fillStyle = '#777';
  context.fillRect(0, 0, size, size);
  context.strokeStyle = 'rgba(210,210,210,.3)';
  context.lineWidth = 1;
  for (let line = 0; line < size; line += 5) {
    context.beginPath();
    context.moveTo(0, line);
    context.lineTo(size, line + size * 0.08);
    context.stroke();
    context.beginPath();
    context.moveTo(line, 0);
    context.lineTo(line - size * 0.08, size);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 7);
  return texture;
}

function createSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  const gradient = context.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, '#79684a');
  gradient.addColorStop(0.45, '#ab9569');
  gradient.addColorStop(1, '#69593f');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 512);
  context.strokeStyle = 'rgba(58,44,30,.55)';
  context.lineWidth = 3;
  for (let x = 12; x < 256; x += 14) {
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(x + 8, 140, x - 7, 350, x + 4, 512);
    context.stroke();
  }
  context.fillStyle = '#171713';
  context.font = 'bold 116px serif';
  context.textAlign = 'center';
  context.fillText('自', 128, 185);
  context.fillText('然', 128, 355);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: ModelMaterial,
  name: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addEllipsoid(
  parent: THREE.Object3D,
  material: ModelMaterial,
  name: string,
  position: THREE.Vector3,
  scale: THREE.Vector3,
  segments = 24,
): THREE.Mesh {
  const mesh = addMesh(parent, new THREE.SphereGeometry(1, segments, Math.max(12, segments / 2)), material, name);
  mesh.position.copy(position);
  mesh.scale.copy(scale);
  return mesh;
}

function addCylinderBetween(
  parent: THREE.Object3D,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: ModelMaterial,
  name: string,
  radiusTop = radius,
  segments = 10,
): THREE.Mesh {
  const direction = end.clone().sub(start);
  const mesh = addMesh(
    parent,
    new THREE.CylinderGeometry(radiusTop, radius, direction.length(), segments),
    material,
    name,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function addCurveTube(
  parent: THREE.Object3D,
  points: THREE.Vector3[],
  radius: number,
  material: ModelMaterial,
  name: string,
  tubularSegments = 32,
  radialSegments = 7,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points);
  return addMesh(parent, new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false), material, name);
}

function addTaperedCurve(
  parent: THREE.Object3D,
  curve: THREE.CatmullRomCurve3,
  startRadius: number,
  endRadius: number,
  material: ModelMaterial,
  name: string,
  segments = 28,
): void {
  let previous = curve.getPoint(0);
  for (let index = 1; index <= segments; index += 1) {
    const t = index / segments;
    const point = curve.getPoint(t);
    const radius = THREE.MathUtils.lerp(startRadius, endRadius, t);
    addCylinderBetween(parent, previous, point, radius, material, `${name}-${index}`, radius * 0.94, 8);
    previous = point;
  }
}

export class PilgrimRatReconstruction {
  readonly group = new THREE.Group();

  private readonly headPivot = new THREE.Group();
  private readonly tailPivot = new THREE.Group();
  private readonly staffPivot = new THREE.Group();
  private readonly materials: ModelMaterial[] = [];
  private readonly textures: THREE.Texture[] = [];
  private time = 0;

  constructor() {
    this.group.name = 'PilgrimRatReconstruction';
    this.group.userData.sculptRuntime = {
      nodes: {
        root: this.group,
        head: this.headPivot,
        tail: this.tailPivot,
        staff: this.staffPivot,
      },
      sockets: {
        crown: this.headPivot,
        tailBase: this.tailPivot,
        staffGrip: this.staffPivot,
      },
      colliders: {
        body: { type: 'capsule', radius: 0.78, height: 2.85, offset: [0, 1.65, 0] },
      },
      destructionGroups: {
        detachableAccessories: [this.staffPivot],
      },
      sandboxOnly: true,
    };

    const clothMap = createClothTexture();
    const clothBump = createClothBump();
    const signMap = createSignTexture();
    this.textures.push(clothMap, clothBump, signMap);

    const fur = new THREE.MeshPhysicalMaterial({
      color: 0x211f1a,
      roughness: 0.9,
      sheen: 0.22,
      sheenColor: new THREE.Color(0x665d50),
      flatShading: true,
    });
    const furMid = new THREE.MeshStandardMaterial({ color: 0x3d382e, roughness: 0.94, flatShading: true });
    const muzzle = new THREE.MeshStandardMaterial({ color: 0x968e7e, roughness: 0.96, flatShading: true });
    const skin = new THREE.MeshStandardMaterial({ color: 0x9f735f, roughness: 0.76, flatShading: true });
    const innerEar = new THREE.MeshStandardMaterial({ color: 0x765043, roughness: 0.88, side: THREE.DoubleSide });
    const nose = new THREE.MeshPhysicalMaterial({ color: 0xb7836c, roughness: 0.18, clearcoat: 0.55, clearcoatRoughness: 0.2 });
    const eye = new THREE.MeshPhysicalMaterial({ color: 0x080706, roughness: 0.08, clearcoat: 1 });
    const catchlight = new THREE.MeshBasicMaterial({ color: 0xfff4d5 });
    const robe = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: clothMap,
      bumpMap: clothBump,
      bumpScale: 0.035,
      roughness: 0.98,
      side: THREE.DoubleSide,
    });
    const robeEdge = new THREE.MeshStandardMaterial({ color: 0x5c574a, roughness: 1, flatShading: true });
    const ink = new THREE.MeshStandardMaterial({ color: 0x292720, roughness: 1, side: THREE.DoubleSide });
    const straw = new THREE.MeshStandardMaterial({ color: 0x8b734c, roughness: 0.96, flatShading: true, side: THREE.DoubleSide });
    const strawDark = new THREE.MeshStandardMaterial({ color: 0x4d3d29, roughness: 1, flatShading: true, side: THREE.DoubleSide });
    const wood = new THREE.MeshStandardMaterial({ color: 0x443323, roughness: 1, flatShading: true });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x211a14, roughness: 1, flatShading: true });
    const sign = new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.96 });
    const rope = new THREE.MeshStandardMaterial({ color: 0x715a3a, roughness: 1, flatShading: true });
    const gourd = new THREE.MeshPhysicalMaterial({ color: 0x443228, roughness: 0.34, clearcoat: 0.22, flatShading: true });
    const claw = new THREE.MeshStandardMaterial({ color: 0xc9b398, roughness: 0.72, flatShading: true });
    const whisker = new THREE.MeshBasicMaterial({ color: 0xd9d0bc });
    this.materials.push(
      fur, furMid, muzzle, skin, innerEar, nose, eye, catchlight, robe, robeEdge, ink,
      straw, strawDark, wood, woodDark, sign, rope, gourd, claw, whisker,
    );

    const bodyPivot = new THREE.Group();
    bodyPivot.name = 'BodyPivot';
    bodyPivot.scale.x = -1;
    this.group.add(bodyPivot);

    const torso = addEllipsoid(
      bodyPivot,
      fur,
      'TorsoCore',
      new THREE.Vector3(0, 2.12, 0.08),
      new THREE.Vector3(0.7, 1.2, 0.56),
      28,
    );
    torso.rotation.z = -0.015;

    const robeBody = addMesh(
      bodyPivot,
      new THREE.CylinderGeometry(0.73, 1.02, 2.35, 36, 3, true),
      robe,
      'LayeredRobeBody',
    );
    robeBody.position.set(0, 1.48, 0.02);
    robeBody.scale.z = 0.72;

    const underRobe = addMesh(
      bodyPivot,
      new THREE.CylinderGeometry(0.65, 0.9, 2.14, 28, 2, false),
      robeEdge,
      'UnderRobeShadow',
    );
    underRobe.position.set(0, 1.43, 0.16);
    underRobe.scale.z = 0.66;

    for (const side of [-1, 1]) {
      const lapel = addMesh(
        bodyPivot,
        new THREE.BoxGeometry(0.16, 1.38, 0.075, 1, 8, 1),
        side < 0 ? robeEdge : robe,
        `Lapel-${side}`,
      );
      lapel.position.set(side * 0.22, 2.32, -0.68);
      lapel.rotation.z = side * -0.39;
      lapel.rotation.x = -0.04;
    }

    for (let index = 0; index < 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2;
      const frontBias = Math.cos(angle);
      const strip = addMesh(
        bodyPivot,
        new THREE.ConeGeometry(0.07 + (index % 3) * 0.015, 0.22 + (index % 4) * 0.055, 5),
        index % 2 === 0 ? robe : robeEdge,
        `FrayedHem-${index}`,
      );
      strip.position.set(Math.sin(angle) * 0.87, 0.27 - (index % 3) * 0.025, frontBias * 0.48 + 0.03);
      strip.rotation.z = Math.sin(angle) * 0.16;
    }

    const sleeveEndpoints = [
      { side: -1, shoulder: new THREE.Vector3(-0.56, 2.78, -0.02), wrist: new THREE.Vector3(-0.86, 1.92, -0.34) },
      { side: 1, shoulder: new THREE.Vector3(0.56, 2.76, -0.02), wrist: new THREE.Vector3(0.86, 1.62, -0.34) },
    ];
    for (const sleeveData of sleeveEndpoints) {
      const direction = sleeveData.wrist.clone().sub(sleeveData.shoulder);
      const sleeve = addMesh(
        bodyPivot,
        new THREE.CylinderGeometry(0.28, 0.43, direction.length(), 18, 2, true),
        robe,
        `BroadSleeve-${sleeveData.side}`,
      );
      sleeve.position.copy(sleeveData.shoulder).add(sleeveData.wrist).multiplyScalar(0.5);
      sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      sleeve.scale.z = 0.84;

      const cuff = addMesh(
        bodyPivot,
        new THREE.TorusGeometry(0.37, 0.035, 6, 20),
        robeEdge,
        `SleeveCuff-${sleeveData.side}`,
      );
      cuff.position.copy(sleeveData.wrist);
      cuff.quaternion.copy(sleeve.quaternion);
    }

    const crest = new THREE.Group();
    crest.name = 'SleeveCrest';
    crest.position.set(0.72, 2.28, -0.54);
    crest.rotation.set(-0.15, 0.1, -0.22);
    bodyPivot.add(crest);
    addMesh(crest, new THREE.RingGeometry(0.19, 0.235, 32), ink, 'CrestRing');
    for (let index = 0; index < 3; index += 1) {
      const angle = index * Math.PI * 2 / 3 - Math.PI / 2;
      const comma = addMesh(crest, new THREE.CircleGeometry(0.07, 18), ink, `CrestComma-${index}`);
      comma.position.set(Math.cos(angle) * 0.095, Math.sin(angle) * 0.095, 0.006);
      comma.scale.set(1, 0.55, 1);
      comma.rotation.z = angle + 0.6;
    }

    for (let coil = 0; coil < 3; coil += 1) {
      const belt = addMesh(bodyPivot, new THREE.TorusGeometry(0.73, 0.043, 8, 44), rope, `BeltCoil-${coil}`);
      belt.position.set(0, 1.58 + coil * 0.065, -0.01);
      belt.rotation.x = Math.PI / 2;
      belt.scale.z = 0.72;
    }
    const knot = addMesh(bodyPivot, new THREE.TorusGeometry(0.14, 0.045, 8, 22), rope, 'BeltKnot');
    knot.position.set(0.13, 1.55, -0.69);
    knot.rotation.z = 0.35;
    addCurveTube(
      bodyPivot,
      [new THREE.Vector3(0.06, 1.5, -0.7), new THREE.Vector3(-0.02, 1.16, -0.72), new THREE.Vector3(0.05, 0.82, -0.65)],
      0.025,
      rope,
      'BeltCordLeft',
      20,
      6,
    );
    addCurveTube(
      bodyPivot,
      [new THREE.Vector3(0.18, 1.5, -0.7), new THREE.Vector3(0.27, 1.16, -0.71), new THREE.Vector3(0.19, 0.73, -0.62)],
      0.024,
      rope,
      'BeltCordRight',
      20,
      6,
    );

    const gourdGroup = new THREE.Group();
    gourdGroup.name = 'GourdFlask';
    gourdGroup.position.set(0.55, 1.31, -0.6);
    gourdGroup.rotation.z = -0.14;
    bodyPivot.add(gourdGroup);
    addEllipsoid(gourdGroup, gourd, 'GourdLower', new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0.21, 0.25, 0.16), 18);
    addEllipsoid(gourdGroup, gourd, 'GourdUpper', new THREE.Vector3(0, 0.14, 0), new THREE.Vector3(0.14, 0.15, 0.12), 16);
    const gourdNeck = addMesh(gourdGroup, new THREE.CylinderGeometry(0.065, 0.085, 0.12, 10), rope, 'GourdNeck');
    gourdNeck.position.y = 0.29;

    const makeHand = (side: number, position: THREE.Vector3, gripping: boolean): void => {
      const handGroup = new THREE.Group();
      handGroup.name = gripping ? 'StaffGripHand' : 'RelaxedHand';
      handGroup.position.copy(position);
      bodyPivot.add(handGroup);
      addEllipsoid(handGroup, skin, 'Palm', new THREE.Vector3(), new THREE.Vector3(0.16, 0.22, 0.13), 16);
      for (let finger = 0; finger < 4; finger += 1) {
        const x = (finger - 1.5) * 0.065;
        const start = new THREE.Vector3(x, -0.07, -0.04);
        const end = gripping
          ? new THREE.Vector3(x + side * 0.02, -0.25 + finger * 0.012, -0.1)
          : new THREE.Vector3(x, -0.29 - finger * 0.008, -0.05);
        addCylinderBetween(handGroup, start, end, 0.029, skin, `Finger-${finger}`, 0.025, 7);
        const clawMesh = addMesh(handGroup, new THREE.ConeGeometry(0.027, 0.095, 7), claw, `HandClaw-${finger}`);
        clawMesh.position.copy(end).add(new THREE.Vector3(0, -0.045, -0.018));
        clawMesh.rotation.x = -0.28;
      }
    };
    makeHand(-1, new THREE.Vector3(-0.82, 1.96, -0.4), true);
    makeHand(1, new THREE.Vector3(0.86, 1.58, -0.39), false);

    for (const side of [-1, 1]) {
      const footGroup = new THREE.Group();
      footGroup.name = `SplayedFoot-${side}`;
      footGroup.position.set(side * 0.42, 0.14, -0.32);
      footGroup.rotation.y = side * 0.1;
      bodyPivot.add(footGroup);
      addEllipsoid(footGroup, skin, 'FootPad', new THREE.Vector3(), new THREE.Vector3(0.28, 0.12, 0.42), 18);
      for (let toe = 0; toe < 5; toe += 1) {
        const angle = (toe - 2) * 0.14;
        const toeMesh = addEllipsoid(
          footGroup,
          skin,
          `Toe-${toe}`,
          new THREE.Vector3((toe - 2) * 0.075, -0.015, -0.35 - Math.abs(toe - 2) * 0.015),
          new THREE.Vector3(0.055, 0.05, 0.16),
          12,
        );
        toeMesh.rotation.y = angle;
        const toeClaw = addMesh(footGroup, new THREE.ConeGeometry(0.035, 0.13, 7), claw, `FootClaw-${toe}`);
        toeClaw.position.set((toe - 2) * 0.075, -0.01, -0.49 - Math.abs(toe - 2) * 0.015);
        toeClaw.rotation.x = -Math.PI / 2;
        toeClaw.rotation.z = -angle;
      }
    }

    this.headPivot.name = 'HeadPivot';
    this.headPivot.position.set(0, 3.24, -0.06);
    this.headPivot.rotation.y = -0.38;
    bodyPivot.add(this.headPivot);

    addEllipsoid(this.headPivot, fur, 'Cranium', new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.56, 0.53, 0.65), 30);
    addEllipsoid(this.headPivot, furMid, 'CheekRuffLeft', new THREE.Vector3(-0.34, -0.17, -0.22), new THREE.Vector3(0.28, 0.42, 0.3), 15);
    addEllipsoid(this.headPivot, furMid, 'CheekRuffRight', new THREE.Vector3(0.34, -0.17, -0.22), new THREE.Vector3(0.28, 0.42, 0.3), 15);
    for (const side of [-1, 1]) {
      const ear = addEllipsoid(
        this.headPivot,
        furMid,
        `EarOuter-${side}`,
        new THREE.Vector3(side * 0.43, 0.38, 0.02),
        new THREE.Vector3(0.27, 0.35, 0.12),
        20,
      );
      ear.rotation.z = side * -0.22;
      const earInset = addEllipsoid(
        this.headPivot,
        innerEar,
        `EarInner-${side}`,
        new THREE.Vector3(side * 0.43, 0.38, -0.095),
        new THREE.Vector3(0.2, 0.27, 0.025),
        18,
      );
      earInset.rotation.z = side * -0.22;
    }

    for (const side of [-1, 1]) {
      addEllipsoid(
        this.headPivot,
        muzzle,
        `MuzzlePad-${side}`,
        new THREE.Vector3(side * 0.105, -0.1, -0.6),
        new THREE.Vector3(0.2, 0.18, 0.38),
        22,
      );
      const eyeMesh = addEllipsoid(
        this.headPivot,
        eye,
        `Eye-${side}`,
        new THREE.Vector3(side * 0.25, 0.14, -0.54),
        new THREE.Vector3(0.09, 0.095, 0.068),
        18,
      );
      eyeMesh.rotation.y = side * 0.08;
      addEllipsoid(
        this.headPivot,
        catchlight,
        `EyeCatchlight-${side}`,
        new THREE.Vector3(side * 0.235 - 0.012, 0.18, -0.608),
        new THREE.Vector3(0.021, 0.021, 0.011),
        8,
      );
    }
    addEllipsoid(this.headPivot, nose, 'WetNose', new THREE.Vector3(0, -0.13, -0.91), new THREE.Vector3(0.115, 0.09, 0.11), 20);

    for (const side of [-1, 1]) {
      for (let index = 0; index < 6; index += 1) {
        const y = -0.19 + index * 0.058;
        const start = new THREE.Vector3(side * 0.16, y, -0.79);
        const end = new THREE.Vector3(
          side * (0.79 + index * 0.045),
          y + (index - 2.5) * 0.055,
          -0.88 + Math.abs(index - 2.5) * 0.012,
        );
        addCurveTube(
          this.headPivot,
          [start, start.clone().lerp(end, 0.55).add(new THREE.Vector3(0, 0.025, -0.03)), end],
          0.0038,
          whisker,
          `Whisker-${side}-${index}`,
          12,
          4,
        );
      }
    }

    const hatGroup = new THREE.Group();
    hatGroup.name = 'WovenHat';
    hatGroup.position.set(0, 0.58, 0.03);
    hatGroup.rotation.set(-0.035, 0, 0.04);
    this.headPivot.add(hatGroup);
    const hatCone = addMesh(hatGroup, new THREE.ConeGeometry(1.08, 0.45, 64, 6, true), straw, 'HatCone');
    hatCone.position.y = 0.04;
    hatCone.scale.z = 0.9;
    const underside = addMesh(hatGroup, new THREE.CircleGeometry(1.075, 64), strawDark, 'HatUnderside');
    underside.rotation.x = -Math.PI / 2;
    underside.position.y = -0.185;
    underside.scale.y = 0.9;
    for (let ringIndex = 0; ringIndex < 8; ringIndex += 1) {
      const t = (ringIndex + 1) / 9;
      const radius = THREE.MathUtils.lerp(0.12, 1.02, t);
      const y = THREE.MathUtils.lerp(0.235, -0.16, t);
      const ring = addMesh(hatGroup, new THREE.TorusGeometry(radius, 0.009, 5, 64), strawDark, `HatWeaveRing-${ringIndex}`);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      ring.scale.z = 0.9;
    }
    for (let rib = 0; rib < 24; rib += 1) {
      const angle = rib / 24 * Math.PI * 2;
      const start = new THREE.Vector3(Math.sin(angle) * 0.07, 0.27, Math.cos(angle) * 0.06);
      const end = new THREE.Vector3(Math.sin(angle) * 1.04, -0.17, Math.cos(angle) * 0.94);
      addCylinderBetween(hatGroup, start, end, 0.007, strawDark, `HatRib-${rib}`, 0.004, 5);
    }
    const hatCap = addMesh(hatGroup, new THREE.CylinderGeometry(0.035, 0.055, 0.09, 9), strawDark, 'HatApexCap');
    hatCap.position.y = 0.31;

    this.tailPivot.name = 'TailPivot';
    this.tailPivot.position.set(0.58, 0.72, 0.34);
    bodyPivot.add(this.tailPivot);
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.42, -0.06, 0.2),
      new THREE.Vector3(0.85, -0.18, 0.02),
      new THREE.Vector3(1.18, -0.08, -0.36),
      new THREE.Vector3(1.08, 0.25, -0.62),
      new THREE.Vector3(0.76, 0.42, -0.58),
    ]);
    addTaperedCurve(this.tailPivot, tailCurve, 0.105, 0.035, skin, 'SegmentedTail', 32);
    for (let ringIndex = 1; ringIndex < 14; ringIndex += 1) {
      const t = ringIndex / 15;
      const point = tailCurve.getPoint(t);
      const tangent = tailCurve.getTangent(t).normalize();
      const ring = addMesh(
        this.tailPivot,
        new THREE.TorusGeometry(THREE.MathUtils.lerp(0.096, 0.04, t), 0.008, 5, 14),
        muzzle,
        `TailRing-${ringIndex}`,
      );
      ring.position.copy(point);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    }

    this.staffPivot.name = 'StaffPivot';
    this.staffPivot.position.set(-1.06, 0.02, -0.08);
    bodyPivot.add(this.staffPivot);
    const staffCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.03, 1.25, 0.015),
      new THREE.Vector3(0.02, 2.45, -0.02),
      new THREE.Vector3(-0.04, 3.7, 0.01),
      new THREE.Vector3(0.015, 4.8, 0),
    ]);
    addTaperedCurve(this.staffPivot, staffCurve, 0.09, 0.075, wood, 'SplitStaff', 34);
    for (const offset of [-0.045, 0.035]) {
      addCurveTube(
        this.staffPivot,
        [
          new THREE.Vector3(offset, 0.08, -0.035),
          new THREE.Vector3(offset * 0.4, 2.1, -0.07),
          new THREE.Vector3(offset, 4.72, -0.035),
        ],
        0.012,
        woodDark,
        `StaffBarkRidge-${offset}`,
        30,
        5,
      );
    }
    for (let wrapIndex = 0; wrapIndex < 12; wrapIndex += 1) {
      const wrap = addMesh(this.staffPivot, new THREE.TorusGeometry(0.095, 0.018, 6, 16), rope, `StaffWrap-${wrapIndex}`);
      wrap.rotation.x = Math.PI / 2;
      wrap.rotation.z = (wrapIndex % 3 - 1) * 0.11;
      wrap.position.set(-0.015, 3.72 + wrapIndex * 0.055, 0);
    }
    addCylinderBetween(
      this.staffPivot,
      new THREE.Vector3(-0.055, 4.73, 0),
      new THREE.Vector3(-0.04, 5.08, 0.02),
      0.052,
      woodDark,
      'SplitStaffCrownLeft',
      0.035,
      7,
    );
    addCylinderBetween(
      this.staffPivot,
      new THREE.Vector3(0.02, 4.72, 0),
      new THREE.Vector3(0.08, 5.0, -0.02),
      0.045,
      wood,
      'SplitStaffCrownRight',
      0.028,
      7,
    );

    const signGroup = new THREE.Group();
    signGroup.name = 'HangingSign';
    signGroup.position.set(-0.31, 3.37, -0.02);
    signGroup.rotation.z = 0.07;
    this.staffPivot.add(signGroup);
    const signBoard = addMesh(signGroup, new THREE.BoxGeometry(0.42, 0.72, 0.055, 1, 1, 2), sign, 'CalligraphicSign');
    signBoard.position.y = -0.15;
    for (const x of [-0.14, 0.14]) {
      addCurveTube(
        signGroup,
        [new THREE.Vector3(x, 0.45, 0), new THREE.Vector3(x * 0.75, 0.31, 0.01), new THREE.Vector3(x, 0.19, 0)],
        0.018,
        rope,
        `SignTie-${x}`,
        12,
        5,
      );
    }
    for (let charmIndex = 0; charmIndex < 4; charmIndex += 1) {
      const charmX = -0.34 - charmIndex * 0.08;
      addCurveTube(
        this.staffPivot,
        [
          new THREE.Vector3(-0.08, 3.8, 0),
          new THREE.Vector3(charmX, 3.52 - charmIndex * 0.08, 0.04),
          new THREE.Vector3(charmX + 0.04, 3.12 - charmIndex * 0.1, 0.02),
        ],
        0.009,
        rope,
        `HangingCharmCord-${charmIndex}`,
        18,
        4,
      );
      addEllipsoid(
        this.staffPivot,
        woodDark,
        `HangingCharm-${charmIndex}`,
        new THREE.Vector3(charmX + 0.04, 3.08 - charmIndex * 0.1, 0.02),
        new THREE.Vector3(0.035, 0.075, 0.025),
        8,
      );
    }

    const pedestal = addMesh(
      this.group,
      new THREE.CylinderGeometry(1.7, 1.82, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0x3d4439, roughness: 1, flatShading: true }),
      'SandboxStonePedestal',
    );
    this.materials.push(pedestal.material as THREE.MeshStandardMaterial);
    pedestal.position.y = -0.11;
    pedestal.receiveShadow = true;
  }

  update(delta: number): void {
    this.time += delta;
    const breath = Math.sin(this.time * 1.45);
    this.headPivot.rotation.x = breath * 0.008;
    this.headPivot.rotation.z = breath * 0.004;
    this.tailPivot.rotation.y = Math.sin(this.time * 0.72) * 0.045;
    this.staffPivot.rotation.z = Math.sin(this.time * 0.58) * 0.004;
  }

  dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) geometries.add(object.geometry);
    });
    geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
  }
}
