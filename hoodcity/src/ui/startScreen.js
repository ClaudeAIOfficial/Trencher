import * as THREE from 'three';
import { createRobinHoodCharacter } from '../scene/character.js';
import { skyGradientTexture, grassTexture } from '../scene/textures.js';

export function initHeroPreview() {
  const canvas = document.getElementById('hero-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = skyGradientTexture();

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.55, 3.4);
  camera.lookAt(0, 1.05, 0);

  const hemi = new THREE.HemisphereLight(0xbcd7ea, 0x2f2b1c, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.4);
  sun.position.set(3, 5, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(80, 40),
    new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const fogColor = 0xd9c48d;
  scene.fog = new THREE.Fog(fogColor, 6, 30);

  const { root, parts } = createRobinHoodCharacter({});
  root.position.y = 0;
  scene.add(root);

  const bow = new THREE.Group();
  const bowMat = new THREE.MeshStandardMaterial({ color: 0x4a2f18, roughness: 0.7 });
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.4, 0),
    new THREE.Vector3(0.09, 0, 0.03),
    new THREE.Vector3(0, -0.4, 0),
  ]);
  const bowMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.018, 6, false), bowMat);
  bow.add(bowMesh);
  parts.leftArm.hand.add(bow);
  bow.position.set(0, -0.08, 0.05);
  bow.rotation.set(0.1, 0, 0.15);

  let raf = null;
  let t = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function animate() {
    raf = requestAnimationFrame(animate);
    t += 0.012;
    root.rotation.y = Math.sin(t * 0.5) * 0.5 + 0.3;
    parts.hips.position.y = 0.95 + Math.sin(t * 2) * 0.008;
    parts.leftArm.shoulder.rotation.x = -1.1 + Math.sin(t * 1.3) * 0.03;
    parts.rightArm.shoulder.rotation.x = 0.3 + Math.sin(t * 1.3 + 1) * 0.05;
    parts.rightArm.elbow.rotation.x = -0.4;
    parts.cape.rotation.x = 0.18 + Math.sin(t * 1.1) * 0.05;
    renderer.render(scene, camera);
  }
  animate();

  return {
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
}
