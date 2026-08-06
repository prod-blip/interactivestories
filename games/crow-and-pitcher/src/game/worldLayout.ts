import * as THREE from 'three';

export const PITCHER_POSITION = new THREE.Vector3(1.5, 0, -19);
export const GARDEN_WALL_POSITION = new THREE.Vector3(1.5, 0, -21.8);

// Shared by the visible sun and directional light so the sky and world lighting agree.
export const SUMMER_SUN_DIRECTION = new THREE.Vector3(0.36, 0.76, -0.54).normalize();
