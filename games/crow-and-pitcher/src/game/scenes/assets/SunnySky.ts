import * as THREE from 'three';
import { SUMMER_SUN_DIRECTION } from '../../worldLayout';

export class SunnySky {
  readonly group = new THREE.Group();
  private readonly clouds: Array<{ group: THREE.Group; origin: THREE.Vector3; phase: number; speed: number }> = [];
  private elapsed = 0;

  constructor() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(72, 32, 18),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x8eb3c5) },
          horizonColor: { value: new THREE.Color(0xd5dccc) },
          groundGlow: { value: new THREE.Color(0xe5cfa6) },
        },
        vertexShader: `varying vec3 vSkyDirection;
          void main() {
            vSkyDirection = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `uniform vec3 topColor;
          uniform vec3 horizonColor;
          uniform vec3 groundGlow;
          varying vec3 vSkyDirection;
          void main() {
            float height = normalize(vSkyDirection).y;
            vec3 color = mix(horizonColor, topColor, smoothstep(-0.05, 0.72, height));
            color = mix(groundGlow, color, smoothstep(-0.18, 0.12, height));
            gl_FragColor = vec4(color, 1.0);
          }`,
      }),
    );
    this.group.add(sky);

    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffe7ad, toneMapped: false, fog: false });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(2.8, 24, 16), sunMaterial);
    sun.position.copy(SUMMER_SUN_DIRECTION).multiplyScalar(43);
    const innerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(4.3, 20, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffedbe,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    );
    innerGlow.position.copy(sun.position);
    const outerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(6.4, 20, 12),
      new THREE.MeshBasicMaterial({
        color: 0xfff0cb,
        transparent: true,
        opacity: 0.055,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    );
    outerGlow.position.copy(sun.position);
    this.group.add(outerGlow, innerGlow, sun);

    const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xf0eee3, transparent: true, opacity: 0.68, fog: false });
    const cloudPositions: Array<[number, number, number, number]> = [
      [-18, 20, -34, 1.4], [2, 24, -43, 1.8], [23, 18, -35, 1.25], [-30, 16, -20, 0.9],
    ];
    cloudPositions.forEach(([x, y, z, scale], cloudIndex) => {
      const cloud = new THREE.Group();
      for (let index = 0; index < 6; index += 1) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.8 + (index % 3) * 0.45, 12, 8), cloudMaterial);
        puff.scale.y = 0.62;
        puff.position.set((index - 2.5) * 1.55, Math.sin(index * 1.7) * 0.55, (index % 2) * 0.45);
        cloud.add(puff);
      }
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(scale);
      cloud.rotation.y = cloudIndex * 0.42;
      this.group.add(cloud);
      this.clouds.push({
        group: cloud,
        origin: cloud.position.clone(),
        phase: cloudIndex * 1.73,
        speed: 0.055 + cloudIndex * 0.008,
      });
    });
  }

  update(delta: number, reducedMotion: boolean): void {
    this.elapsed += delta;
    const motionScale = reducedMotion ? 0.18 : 1;
    this.clouds.forEach((cloud, index) => {
      const travel = Math.sin(this.elapsed * cloud.speed + cloud.phase) * (3.2 + index * 0.45) * motionScale;
      cloud.group.position.x = cloud.origin.x + travel;
      cloud.group.position.y = cloud.origin.y + Math.sin(this.elapsed * 0.035 + cloud.phase) * 0.22 * motionScale;
    });
  }
}
