import * as THREE from 'three';

const COLORS = {
  bodyDark: 0x16161d,
  paint: 0xd91a75,
  cyan: 0x45e3ff,
  pink: 0xff2fa0,
  tire: 0x0c0c10,
};

// Общие материалы — шасси/панели тёмный металлик, поверх — неоновые рёбра
const bodyMat = new THREE.MeshStandardMaterial({
  color: COLORS.bodyDark,
  metalness: 0.85,
  roughness: 0.32,
});
const darkMat = new THREE.MeshStandardMaterial({ color: 0x101016, metalness: 0.6, roughness: 0.5 });
const tireMat = new THREE.MeshStandardMaterial({ color: COLORS.tire, metalness: 0.1, roughness: 0.9 });
const rimMat = new THREE.MeshStandardMaterial({
  color: 0x222230,
  metalness: 0.9,
  roughness: 0.2,
  emissive: COLORS.cyan,
  emissiveIntensity: 0.55,
});
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x0a1418,
  metalness: 0.95,
  roughness: 0.08,
  transparent: true,
  opacity: 0.85,
});
const headlightMat = new THREE.MeshStandardMaterial({
  color: 0x101016,
  emissive: 0x9ff2ff,
  emissiveIntensity: 0.05,
});
const taillightMat = new THREE.MeshStandardMaterial({
  color: 0x14060e,
  emissive: COLORS.pink,
  emissiveIntensity: 0.15,
});
const cyanLineMat = new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.8 });
const pinkLineMat = new THREE.LineBasicMaterial({ color: COLORS.pink, transparent: true, opacity: 0.8 });

function withEdges(geometry, material, lineMat = cyanLineMat, threshold = 18) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  group.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, threshold), lineMat);
  group.add(edges);
  return group;
}

// Нижняя часть кузова — боковой силуэт седана с вырезами под арки
function lowerBodyShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.3, 0.32);
  s.lineTo(-1.94, 0.32);
  s.absarc(-1.5, 0.32, 0.44, Math.PI, 0, true); // задняя арка
  s.lineTo(1.06, 0.32);
  s.absarc(1.5, 0.32, 0.44, Math.PI, 0, true); // передняя арка
  s.lineTo(2.35, 0.32);
  s.lineTo(2.45, 0.55);
  s.lineTo(2.4, 0.75);
  s.lineTo(1.15, 0.88);   // линия капота
  s.lineTo(-1.4, 0.92);   // подоконная линия
  s.lineTo(-2.25, 0.88);  // багажник
  s.lineTo(-2.4, 0.7);
  s.closePath();
  return s;
}

// Гринхаус — крыша и стойки
function cabinShape() {
  const s = new THREE.Shape();
  s.moveTo(1.12, 0.86);
  s.lineTo(0.6, 1.32);    // лобовое
  s.lineTo(-0.85, 1.34);  // крыша
  s.lineTo(-1.42, 0.88);  // задняя стойка
  s.closePath();
  return s;
}

function makeWheel() {
  const wheel = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 24);
  tireGeo.rotateX(Math.PI / 2);
  wheel.add(new THREE.Mesh(tireGeo, tireMat));

  // диск — на обеих внешних плоскостях колеса, чтобы неон было видно с любой стороны
  const makeFace = () => {
    const face = new THREE.Group();
    face.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 24), rimMat));
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.04), rimMat);
      spoke.rotation.z = (i / 5) * Math.PI * 2;
      face.add(spoke);
    }
    face.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12).rotateX(Math.PI / 2), darkMat));
    return face;
  };
  for (const z of [0.125, -0.125]) {
    const face = makeFace();
    face.position.z = z;
    wheel.add(face);
  }
  return wheel;
}

/**
 * Собирает Toyota Mark II (JZX100) из отдельных частей.
 * Возвращает { group, parts } — parts с userData.home для анимации сборки.
 */
export function buildMarkII() {
  const group = new THREE.Group();
  const parts = [];

  const addPart = (obj, name, home = { x: 0, y: 0, z: 0 }, rot = { x: 0, y: 0, z: 0 }) => {
    obj.name = name;
    obj.userData.home = { pos: home, rot };
    obj.position.set(home.x, home.y, home.z);
    obj.rotation.set(rot.x, rot.y, rot.z);
    group.add(obj);
    parts.push(obj);
    return obj;
  };

  // ── шасси ──
  const chassis = new THREE.Group();
  const pan = withEdges(new THREE.BoxGeometry(4.3, 0.1, 1.55), darkMat, cyanLineMat);
  pan.position.y = 0.34;
  chassis.add(pan);
  for (const z of [-0.55, 0.55]) {
    const rail = withEdges(new THREE.BoxGeometry(4.0, 0.12, 0.1), darkMat, cyanLineMat);
    rail.position.set(0, 0.26, z);
    chassis.add(rail);
  }
  addPart(chassis, 'chassis');

  // ── кузов (низ) ──
  const lowerGeo = new THREE.ExtrudeGeometry(lowerBodyShape(), {
    depth: 1.7, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1, steps: 1,
  });
  lowerGeo.translate(0, 0, -0.85 - 0.04);
  const lower = withEdges(lowerGeo, bodyMat, cyanLineMat, 20);
  addPart(lower, 'body');

  // ── кабина ──
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape(), {
    depth: 1.42, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, steps: 1,
  });
  cabinGeo.translate(0, 0, -0.71 - 0.03);
  const cabin = withEdges(cabinGeo, glassMat, pinkLineMat, 20);
  addPart(cabin, 'cabin');

  // ── бамперы ──
  const frontBumper = withEdges(new THREE.BoxGeometry(0.42, 0.34, 1.8), bodyMat, cyanLineMat);
  addPart(frontBumper, 'frontBumper', { x: 2.34, y: 0.46, z: 0 });
  const rearBumper = withEdges(new THREE.BoxGeometry(0.42, 0.34, 1.8), bodyMat, cyanLineMat);
  addPart(rearBumper, 'rearBumper', { x: -2.34, y: 0.46, z: 0 });

  // ── пороги ──
  for (const [i, z] of [-0.86, 0.86].entries()) {
    const skirt = withEdges(new THREE.BoxGeometry(2.0, 0.14, 0.08), bodyMat, pinkLineMat);
    addPart(skirt, `skirt${i}`, { x: 0, y: 0.3, z });
  }

  // ── спойлер ──
  const spoiler = new THREE.Group();
  const wing = withEdges(new THREE.BoxGeometry(0.26, 0.05, 1.5), bodyMat, pinkLineMat);
  wing.position.y = 0.16;
  spoiler.add(wing);
  for (const z of [-0.5, 0.5]) {
    const leg = withEdges(new THREE.BoxGeometry(0.1, 0.16, 0.07), darkMat, pinkLineMat);
    leg.position.set(0, 0.06, z);
    spoiler.add(leg);
  }
  addPart(spoiler, 'spoiler', { x: -2.05, y: 0.94, z: 0 });

  // ── колёса ──
  const wheelPos = [
    { x: 1.5, z: 0.82 }, { x: 1.5, z: -0.82 },
    { x: -1.5, z: 0.82 }, { x: -1.5, z: -0.82 },
  ];
  wheelPos.forEach((p, i) => {
    addPart(makeWheel(), `wheel${i}`, { x: p.x, y: 0.34, z: p.z });
  });

  // ── оптика ──
  const lights = new THREE.Group();
  for (const z of [-0.52, 0.52]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.55), headlightMat);
    hl.position.set(2.43, 0.63, z);
    lights.add(hl);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 1.55), taillightMat);
  tail.position.set(-2.44, 0.66, 0);
  lights.add(tail);
  addPart(lights, 'lights');

  // ── зеркала ──
  for (const [i, z] of [-0.92, 0.92].entries()) {
    const mirror = withEdges(new THREE.BoxGeometry(0.1, 0.08, 0.14), bodyMat, cyanLineMat);
    addPart(mirror, `mirror${i}`, { x: 0.95, y: 1.0, z });
  }

  // ── неоновая подсветка днища (включается в финале) ──
  // радиальный градиент, чтобы свечение мягко гасло к краям
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 256;
  const ctx = glowCanvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,47,160,1)');
  grad.addColorStop(0.55, 'rgba(255,47,160,0.45)');
  grad.addColorStop(1, 'rgba(255,47,160,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const glowGeo = new THREE.PlaneGeometry(5.4, 2.8);
  const glowMat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(glowCanvas),
    transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.02;
  group.add(glow);
  const glowLight = new THREE.PointLight(COLORS.pink, 0, 6, 1.6);
  glowLight.position.set(0, 0.25, 0);
  group.add(glowLight);

  return {
    group,
    parts,
    materials: { bodyMat, headlightMat, taillightMat, glowMat },
    glowLight,
  };
}

export { COLORS };
