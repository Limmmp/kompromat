import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { buildMarkII, COLORS } from './car.js';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ══════════ 3D сцена ══════════ */
const canvas = document.getElementById('car-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b10);
scene.fog = new THREE.Fog(0x0b0b10, 11, 26);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x0b0b10, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.5, 0.28);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// свет
scene.add(new THREE.AmbientLight(0x8888aa, 0.5));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(4, 6, 3);
scene.add(key);
const rimPink = new THREE.PointLight(COLORS.pink, 30, 25, 1.8);
rimPink.position.set(-6, 3, -5);
scene.add(rimPink);
const rimCyan = new THREE.PointLight(COLORS.cyan, 30, 25, 1.8);
rimCyan.position.set(6, 2.5, 5);
scene.add(rimCyan);

// неоновая сетка-пол
const grid = new THREE.GridHelper(60, 60, COLORS.cyan, 0x1c1c28);
grid.material.transparent = true;
grid.material.opacity = 0.28;
scene.add(grid);

const { group: car, parts, materials, glowLight } = buildMarkII();
scene.add(car);

/* камера по орбите — параметры крутит таймлайн */
const cam = { theta: 0.45, radius: 8.2, height: 2.8, targetY: 0.6 };
function updateCamera() {
  camera.position.set(
    Math.cos(cam.theta) * cam.radius,
    cam.height,
    Math.sin(cam.theta) * cam.radius,
  );
  camera.lookAt(0, cam.targetY, 0);
}

function resize() {
  const w = canvas.clientWidth || canvas.parentElement.clientWidth;
  const h = canvas.clientHeight || canvas.parentElement.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  // на узких экранах шире угол, чтобы машина влезала в кадр
  camera.fov = camera.aspect < 1 ? 55 : camera.aspect < 1.5 ? 46 : 38;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

/* разброс деталей перед сборкой */
const scatter = {
  chassis: { pos: { x: 0, y: -3.5, z: 0 }, rot: { x: 0, y: 0, z: 0 } },
  body: { pos: { x: 0, y: 5.5, z: 0 }, rot: { x: -0.5, y: 0.4, z: 0.2 } },
  cabin: { pos: { x: -1, y: 7, z: 2 }, rot: { x: 0.6, y: -0.5, z: 0.3 } },
  frontBumper: { pos: { x: 9, y: 1.5, z: 0 }, rot: { x: 0, y: 0.8, z: 0.5 } },
  rearBumper: { pos: { x: -9, y: 1.5, z: 0 }, rot: { x: 0, y: -0.8, z: -0.5 } },
  skirt0: { pos: { x: 0, y: 1.2, z: -6 }, rot: { x: 1, y: 0, z: 0 } },
  skirt1: { pos: { x: 0, y: 1.2, z: 6 }, rot: { x: -1, y: 0, z: 0 } },
  spoiler: { pos: { x: -7, y: 5, z: -2 }, rot: { x: 0.8, y: 1.2, z: 0 } },
  wheel0: { pos: { x: 6, y: 1, z: 6 }, rot: { x: 0, y: 0, z: 4 } },
  wheel1: { pos: { x: 6, y: 1, z: -6 }, rot: { x: 0, y: 0, z: -4 } },
  wheel2: { pos: { x: -6, y: 1, z: 6 }, rot: { x: 0, y: 0, z: 4 } },
  wheel3: { pos: { x: -6, y: 1, z: -6 }, rot: { x: 0, y: 0, z: -4 } },
  lights: { pos: { x: 0, y: 4, z: -5 }, rot: { x: 0.5, y: 0, z: 0 } },
  mirror0: { pos: { x: 3, y: 4, z: -4 }, rot: { x: 2, y: 1, z: 0 } },
  mirror1: { pos: { x: 3, y: 4, z: 4 }, rot: { x: -2, y: -1, z: 0 } },
};

/* фазы для HUD */
const phases = [
  { at: 0.0, kana: '診断', title: 'Диагностика', text: 'Осматриваем геометрию кузова и составляем честную смету.' },
  { at: 0.22, kana: '板金・溶接', title: 'Рихтовка и сварка', text: 'Панель за панелью возвращаем кузову заводскую форму.' },
  { at: 0.52, kana: '塗装', title: 'Покраска', text: 'Подбор цвета, покраска в камере, полировка до глубины.' },
  { at: 0.8, kana: '完成', title: 'Готово к выдаче', text: 'Оптика, неон, идеальный глянец. Забирай — и в ночь.' },
];
const phaseKana = document.getElementById('phase-kana');
const phaseTitle = document.getElementById('phase-title');
const phaseText = document.getElementById('phase-text');
const buildBar = document.getElementById('build-bar');
let currentPhase = -1;
function setPhase(i) {
  if (i === currentPhase) return;
  currentPhase = i;
  const p = phases[i];
  gsap.fromTo([phaseKana, phaseTitle, phaseText],
    { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, overwrite: 'auto' });
  phaseKana.textContent = p.kana;
  phaseTitle.textContent = p.title;
  phaseText.textContent = p.text;
}
setPhase(0);

function applyScatter() {
  for (const part of parts) {
    const s = scatter[part.name];
    if (!s) continue;
    part.position.set(s.pos.x, s.pos.y, s.pos.z);
    part.rotation.set(s.rot.x, s.rot.y, s.rot.z);
  }
}

function buildTimeline() {
  applyScatter();

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: '.build',
      start: 'top top',
      end: '+=3600',
      pin: '.build__pin',
      scrub: 1,
      onUpdate(self) {
        buildBar.style.width = `${(self.progress * 100).toFixed(1)}%`;
        let i = 0;
        for (let k = phases.length - 1; k >= 0; k--) {
          if (self.progress >= phases[k].at) { i = k; break; }
        }
        setPhase(i);
      },
    },
  });

  const fly = (name, pos, dur) => {
    const part = parts.find((p) => p.name === name);
    const home = part.userData.home;
    tl.to(part.position, { ...home.pos, duration: dur }, pos);
    tl.to(part.rotation, { ...home.rot, duration: dur }, pos);
  };

  // фаза 1 — диагностика: шасси
  fly('chassis', 0, 1);

  // фаза 2 — рихтовка и сварка: кузов, кабина, пороги, зеркала
  fly('body', 0.8, 1.2);
  fly('cabin', 1.4, 1.1);
  fly('skirt0', 1.9, 0.8);
  fly('skirt1', 1.9, 0.8);
  fly('mirror0', 2.3, 0.7);
  fly('mirror1', 2.3, 0.7);

  // фаза 3 — покраска: цвет + бамперы, спойлер, колёса
  const paint = new THREE.Color(COLORS.paint);
  tl.to(materials.bodyMat.color, { r: paint.r, g: paint.g, b: paint.b, duration: 1.4 }, 2.9);
  const glowTint = new THREE.Color(0x47041f);
  tl.to(materials.bodyMat.emissive, { r: glowTint.r, g: glowTint.g, b: glowTint.b, duration: 1.4 }, 2.9);
  tl.to(materials.bodyMat, { roughness: 0.18, duration: 1.4 }, 2.9);
  fly('frontBumper', 3.3, 0.9);
  fly('rearBumper', 3.3, 0.9);
  fly('spoiler', 3.8, 0.9);
  fly('wheel0', 4.2, 0.8);
  fly('wheel1', 4.35, 0.8);
  fly('wheel2', 4.5, 0.8);
  fly('wheel3', 4.65, 0.8);

  // фаза 4 — финал: оптика, неон, поворот к камере
  fly('lights', 5.4, 0.7);
  tl.to(materials.headlightMat, { emissiveIntensity: 2.2, duration: 0.5 }, 5.9);
  tl.to(materials.taillightMat, { emissiveIntensity: 1.8, duration: 0.5 }, 5.9);
  tl.to(materials.glowMat, { opacity: 0.75, duration: 0.8 }, 6.0);
  tl.to(glowLight, { intensity: 14, duration: 0.8 }, 6.0);

  // камера всю дорогу плавно облетает машину
  tl.to(cam, { theta: Math.PI * 1.75, radius: 7.6, height: 1.7, ease: 'none', duration: tl.duration() }, 0);

  return tl;
}

let stopped = false;
try {
  if (reducedMotion) {
    // без анимации: собранная машина, статичная камера
    materials.bodyMat.color.set(COLORS.paint);
    materials.bodyMat.emissive.set(0x47041f);
    materials.headlightMat.emissiveIntensity = 2.2;
    materials.taillightMat.emissiveIntensity = 1.8;
    materials.glowMat.opacity = 0.75;
    glowLight.intensity = 14;
    cam.theta = 0.6; cam.radius = 7.6; cam.height = 1.7;
    buildBar.style.width = '100%';
    setPhase(phases.length - 1);
  } else {
    buildTimeline();
  }
} catch (e) {
  console.error('3D init failed:', e);
  stopped = true;
}

renderer.setAnimationLoop(() => {
  if (stopped) return;
  updateCamera();
  composer.render();
});

/* ══════════ появление карточек услуг ══════════ */
if (!reducedMotion) {
  gsap.set('.service-card', { opacity: 0, y: 40 });
  ScrollTrigger.batch('.service-card', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', overwrite: true }),
  });

  gsap.from('.contacts__phone', {
    scale: 0.9,
    opacity: 0,
    duration: 0.7,
    ease: 'back.out(1.6)',
    scrollTrigger: { trigger: '.contacts', start: 'top 70%' },
  });
}

/* шрифты могли сдвинуть layout — пересчитать триггеры */
document.fonts?.ready.then(() => ScrollTrigger.refresh());
