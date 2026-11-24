// Crash Roulette craps bonus: two golden 3D dice that are thrown, tumble, bounce
// and settle on the given faces, with spark particles and glowing halos.
//
// SOURCE for pages/vendor/craps3d.min.js. Bundle with `npm run build:craps3d`
// (esbuild tree-shakes three.js down to what is used here). The page loads the
// bundle lazily, only when a craps round starts.
//
// The dice only SHOW a result the game engine already decided: roll([a, b])
// animates towards faces a and b, it never picks them.
import {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, Color, Vector3, Quaternion,
  MeshPhysicalMaterial, Mesh, CanvasTexture, SRGBColorSpace, DirectionalLight, PointLight,
  HemisphereLight, PlaneGeometry, ShadowMaterial, PCFShadowMap, Sprite, SpriteMaterial,
  AdditiveBlending, BufferGeometry, BufferAttribute, Points, PointsMaterial, ACESFilmicToneMapping,
  CustomBlending, AddEquation, SrcAlphaFactor, OneFactor,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// BoxGeometry face order is +X, -X, +Y, -Y, +Z, -Z. Opposite faces add up to 7.
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const FACE_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(v => new Vector3(...v));
const PIPS = {
  1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]],
  4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]],
  6: [[.27, .23], [.73, .23], [.27, .5], [.73, .5], [.27, .77], [.73, .77]],
};

function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return [c, c.getContext('2d')]; }

// Gold face with engraved pips (colour map), and the matching height map so
// the pips catch the light like real recesses.
function faceTextures(value) {
  const S = 256, [c, g] = canvas(S), [b, h] = canvas(S);
  const grad = g.createRadialGradient(S * .35, S * .3, S * .05, S * .5, S * .5, S * .75);
  grad.addColorStop(0, '#ffe7a0'); grad.addColorStop(.45, '#f0b545'); grad.addColorStop(1, '#a8650f');
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  h.fillStyle = '#fff'; h.fillRect(0, 0, S, S);
  const r = value === 1 ? S * .13 : S * .085;
  for (const [x, y] of PIPS[value]) {
    const px = x * S, py = y * S;
    const pg = g.createRadialGradient(px - r * .3, py - r * .3, r * .1, px, py, r);
    pg.addColorStop(0, value === 1 ? '#7a0f12' : '#2a1604'); pg.addColorStop(.8, value === 1 ? '#3d0507' : '#140a02'); pg.addColorStop(1, '#6b4310');
    g.fillStyle = pg; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,236,170,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(px, py, r + 2, Math.PI * .9, Math.PI * 1.9); g.stroke();
    const hg = h.createRadialGradient(px, py, 0, px, py, r * 1.08);
    hg.addColorStop(0, '#000'); hg.addColorStop(.85, '#222'); hg.addColorStop(1, '#fff');
    h.fillStyle = hg; h.beginPath(); h.arc(px, py, r * 1.08, 0, Math.PI * 2); h.fill();
  }
  const map = new CanvasTexture(c); map.colorSpace = SRGBColorSpace; map.anisotropy = 4;
  return { map, bump: new CanvasTexture(b) };
}

function glowTexture(inner, outer) {
  const S = 128, [c, g] = canvas(S), grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, inner); grad.addColorStop(.35, outer); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  return new CanvasTexture(c);
}

const easeOut = t => 1 - Math.pow(1 - t, 3);
const rand = (a, b) => a + Math.random() * (b - a);

// Orientation that puts `value` on top, turned a little around the vertical so
// the two dice do not look identical.
function restQuaternion(value) {
  const n = FACE_NORMALS[FACE_VALUES.indexOf(value)];
  const align = new Quaternion().setFromUnitVectors(n, new Vector3(0, 1, 0));
  return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rand(-.6, .6)).multiply(align);
}

export function createCraps(host, { onBounce = () => {}, onSettle = () => {} } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const camera = new PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(0, 7.2, 6.4); camera.lookAt(0, 0, .35);

  scene.add(new HemisphereLight(0xfff1d0, 0x1a0f05, .6));
  const key = new DirectionalLight(0xffe2a8, 2.4); key.position.set(-3, 9, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); key.shadow.radius = 6;
  scene.add(key);
  const rim = new PointLight(0xffb347, 30, 14, 2); rim.position.set(0, 2.5, -2.5); scene.add(rim);
  const floor = new Mesh(new PlaneGeometry(30, 30), new ShadowMaterial({ opacity: .45 }));
  floor.material.depthWrite = false;   /* the glow halos sit partly below the floor: do not let it clip them */
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const faces = FACE_VALUES.map(faceTextures);
  const materials = faces.map(f => new MeshPhysicalMaterial({
    color: 0xffffff, map: f.map, bumpMap: f.bump, bumpScale: 2.2, metalness: .92, roughness: .24,
    clearcoat: .7, clearcoatRoughness: .15, emissive: new Color(0x4a2a00), emissiveIntensity: .35, envMapIntensity: 1.5,
  }));
  const geo = new RoundedBoxGeometry(1, 1, 1, 6, .13);
  const haloTex = glowTexture('rgba(255,236,170,1)', 'rgba(255,170,40,.35)');
  const dice = [0, 1].map(i => {
    const mesh = new Mesh(geo, materials); mesh.castShadow = true;
    mesh.position.set(i ? 6 : -6, 3, 6);
    const halo = new Sprite(new SpriteMaterial({ map: haloTex, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: .55 }));
    halo.scale.set(3.2, 3.2, 1); scene.add(halo); scene.add(mesh);
    return { mesh, halo, anim: null, glow: .55 };
  });

  // Sparks: one pooled Points cloud with RGBA vertex colours. They fade out
  // through alpha: the canvas is transparent, so a spark faded to black but
  // still opaque would show as a dark dot over the page behind it.
  const N = 1400, pos = new Float32Array(N * 3), col = new Float32Array(N * 4);
  const parts = Array.from({ length: N }, () => ({ life: 0, max: 1, v: new Vector3(), c: [1, .8, .3] }));
  const pgeo = new BufferGeometry();
  pgeo.setAttribute('position', new BufferAttribute(pos, 3)); pgeo.setAttribute('color', new BufferAttribute(col, 4));
  const points = new Points(pgeo, new PointsMaterial({ size: .32, map: glowTexture('rgba(255,255,255,1)', 'rgba(255,200,90,.5)'), vertexColors: true, transparent: true, depthWrite: false,
    blending: CustomBlending, blendEquation: AddEquation, blendSrc: SrcAlphaFactor, blendDst: OneFactor, blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor }));
  points.frustumCulled = false; scene.add(points);
  let next = 0;
  function emit(at, count, { speed = 3, up = 2, life = [.5, 1.2], spread = 1 } = {}) {
    for (let k = 0; k < count; k++) {
      const p = parts[next], i = next; next = (next + 1) % N;
      pos[i * 3] = at.x + rand(-.3, .3) * spread; pos[i * 3 + 1] = at.y + rand(-.2, .3); pos[i * 3 + 2] = at.z + rand(-.3, .3) * spread;
      const a = Math.random() * Math.PI * 2, s = rand(.3, 1) * speed;
      p.v.set(Math.cos(a) * s, rand(.4, 1) * up + rand(0, 1), Math.sin(a) * s);
      p.max = p.life = rand(life[0], life[1]);
      p.c = Math.random() < .25 ? [1, 1, .85] : [1, rand(.6, .85), rand(.15, .35)];
    }
  }

  let shake = 0, celebrate = 0, running = true, last = performance.now();
  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // keep both dice in frame on narrow (portrait) screens
    camera.position.set(0, w < h ? 8.2 : 5.6, w < h ? 7.4 : 5.1); camera.lookAt(0, .2, .35);
    camera.updateProjectionMatrix();
  }
  resize(); const ro = new ResizeObserver(resize); ro.observe(host);

  function frame(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    for (const d of dice) {
      const a = d.anim;
      if (a) {
        const u = Math.min(1, (now - a.t0) / a.ms), e = easeOut(u);
        d.mesh.position.lerpVectors(a.from, a.to, e);
        // decaying bounces: impacts at u = 1/7, 3/7, 5/7 and rest at 1
        const hgt = a.h * Math.pow(1 - u, 2) * Math.abs(Math.sin(Math.PI * (3.5 * u + .5)));
        d.mesh.position.y = .5 + hgt + (1 - u) * a.lift;
        const spin = a.spin * Math.pow(1 - u, 2.2);
        d.mesh.quaternion.copy(a.q).multiply(new Quaternion().setFromAxisAngle(a.axis, spin));
        for (const b of [1 / 7, 3 / 7, 5 / 7]) if (a.prev < b && u >= b) { emit(d.mesh.position.clone().setY(.1), b < .3 ? 26 : 16, { speed: 2.6, up: 1.6 }); shake = Math.max(shake, b < .3 ? .07 : .04); onBounce(); }
        if (u < .85 && Math.random() < .7) emit(d.mesh.position, 2, { speed: .5, up: .4, life: [.3, .7], spread: .6 });
        a.prev = u;
        if (u >= 1) { d.anim = null; emit(d.mesh.position, 70, { speed: 3.4, up: 2.6 }); d.glow = 1.2; a.done(); }
      }
      d.glow += ((celebrate > 0 ? 1.25 : d.dim ? .12 : .55) - d.glow) * Math.min(1, dt * 3);
      d.halo.position.copy(d.mesh.position).add(new Vector3(0, -.1, -.35));
      d.halo.material.opacity = d.glow * (.85 + .15 * Math.sin(now / 180 + (d === dice[0] ? 0 : 2)));
      for (const m of materials) m.emissiveIntensity = .2 + .25 * Math.max(dice[0].glow, dice[1].glow);
    }
    if (celebrate > 0) { celebrate -= dt; for (const d of dice) emit(d.mesh.position, 9, { speed: 2.4, up: 5, life: [.8, 1.9] }); }
    for (let i = 0; i < N; i++) {
      const p = parts[i];
      if (p.life <= 0) { col[i * 4 + 3] = 0; continue; }
      p.life -= dt; p.v.y -= 4.2 * dt; p.v.multiplyScalar(1 - 1.1 * dt);
      pos[i * 3] += p.v.x * dt; pos[i * 3 + 1] = Math.max(.02, pos[i * 3 + 1] + p.v.y * dt); pos[i * 3 + 2] += p.v.z * dt;
      const f = Math.max(0, p.life / p.max);
      col[i * 4] = p.c[0]; col[i * 4 + 1] = p.c[1]; col[i * 4 + 2] = p.c[2]; col[i * 4 + 3] = f;
    }
    pgeo.attributes.position.needsUpdate = true; pgeo.attributes.color.needsUpdate = true;
    if (shake > 0) { camera.position.x = rand(-1, 1) * shake; shake = Math.max(0, shake - dt * .35); } else camera.position.x = 0;
    rim.intensity = 30 + 40 * Math.max(0, dice[0].glow - .55);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    // Throw both dice; resolves when they have settled on `values`.
    roll(values, ms = 1700) {
      celebrate = 0;
      return Promise.all(dice.map((d, i) => new Promise(done => {
        d.dim = false;
        const to = new Vector3(i ? 1.05 : -1.05, .5, rand(.1, .6));
        const from = d.mesh.position.clone();
        if (from.distanceTo(to) < 2) from.set(i ? rand(2.5, 4) : rand(-4, -2.5), 1, rand(3.5, 4.5));   // re-throw: pick them up first
        d.anim = { t0: performance.now() + i * 90, ms, from, to, h: rand(2.2, 2.8), lift: 1.5, prev: 0,
          q: restQuaternion(values[i]), axis: new Vector3(rand(-1, 1), rand(-.3, .3), rand(-1, 1)).normalize(), spin: rand(5, 7) * Math.PI, done };
      }))).then(() => onSettle());
    },
    win() { celebrate = 2.4; shake = .07; for (const d of dice) emit(d.mesh.position, 260, { speed: 5, up: 5.5, life: [1, 2.4] }); },
    lose() { for (const d of dice) d.dim = true; },
    dispose() {
      running = false; ro.disconnect();
      geo.dispose(); pgeo.dispose(); points.material.dispose(); haloTex.dispose(); pmrem.dispose();
      for (const m of materials) m.dispose(); for (const f of faces) { f.map.dispose(); f.bump.dispose(); }
      for (const d of dice) d.halo.material.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
