import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { PreviewController, PreviewMode, PreviewOptions } from "./types";
import {
  BEAD_COUNT,
  RING_RADIUS,
  drilledBeadGeometry,
  referenceBurner,
  referenceCones,
  surfaceTextures,
} from "./referenceModels";

const WOOD_COLORS = ["#ffffff", "#76664e", "#d7cfba"];

function smokeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(220,215,198,.25)");
  gradient.addColorStop(0.4, "rgba(220,215,198,.13)");
  gradient.addColorStop(1, "rgba(220,215,198,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function bracelet(wood: THREE.MeshStandardMaterial, small = false) {
  const group = new THREE.Group();
  const beadGeometry = drilledBeadGeometry();
  const beads: THREE.Object3D[] = [];
  const beadMesh = new THREE.InstancedMesh(beadGeometry, wood, BEAD_COUNT);
  beadMesh.castShadow = beadMesh.receiveShadow = true;
  for (let i = 0; i < BEAD_COUNT; i++) {
    const angle = (i / BEAD_COUNT) * Math.PI * 2;
    const bead = new THREE.Object3D();
    bead.position.set(
      Math.cos(angle) * RING_RADIUS,
      Math.sin(angle) * RING_RADIUS,
      0,
    );
    bead.scale.set(
      1 + Math.sin(i * 4.7) * 0.015,
      0.98 + Math.sin(i * 7.3) * 0.02,
      1,
    );
    bead.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0),
    );
    bead.rotateY(i * 1.73);
    bead.userData.angle = angle;
    beads.push(bead);
    bead.updateMatrix();
    beadMesh.setMatrixAt(i, bead.matrix);
    beadMesh.setColorAt(
      i,
      new THREE.Color().setScalar(0.91 + (Math.sin(i * 8.31) + 1) * 0.045),
    );
  }
  group.add(beadMesh);
  const cord = mesh(
    new THREE.TorusGeometry(RING_RADIUS, 0.012, 8, 120),
    new THREE.MeshStandardMaterial({ color: "#382419", roughness: 0.9 }),
  );
  group.add(cord);
  const spacer = mesh(
    new THREE.TorusGeometry(0.023, 0.006, 8, 16),
    new THREE.MeshStandardMaterial({ color: "#4a3622", roughness: 1 }),
    [RING_RADIUS, 0, 0],
  );
  spacer.rotation.y = Math.PI / 2;
  group.add(spacer);
  group.rotation.set(-0.55, -0.2, -0.25);
  if (small) group.scale.setScalar(0.53);
  return { group, beads, beadMesh, cord, spacer };
}

export function createPreviewScene(
  canvas: HTMLCanvasElement,
  mode: PreviewMode,
  initial: PreviewOptions,
  onSelect: (index: number) => void,
  onContextLost: () => void,
  presentation: "default" | "studio" = "default",
): PreviewController {
  let options = { ...initial };
  let disposed = false;
  let visible = true;
  let frame = 0;
  let warming = presentation === "studio";
  let previous = performance.now();
  let elapsed = 0;
  let restUntil = 0;
  let resumeTimer = 0;
  let galleryTarget = 0;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !coarse,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      coarse || presentation === "studio" ? 1.25 : 1.75,
    ),
  );
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = presentation !== "studio";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#181c1d");
  scene.fog = new THREE.Fog("#181c1d", 11, 25);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 50);
  const initialCamera = new THREE.Vector3(0, 2.2, 6.7);
  camera.position.copy(initialCamera);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.2, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI * 0.78;
  canvas.style.touchAction = "pan-y pinch-zoom";

  const environment =
    presentation === "studio"
      ? null
      : (() => {
          const pmrem = new THREE.PMREMGenerator(renderer);
          const room = new RoomEnvironment();
          const result = pmrem.fromScene(room, 0.04);
          room.dispose();
          pmrem.dispose();
          return result;
        })();
  if (environment) scene.environment = environment.texture;
  scene.environmentIntensity = 0.3;
  const ambient = new THREE.HemisphereLight("#ece7d3", "#172119", 0.75);
  const key = new THREE.DirectionalLight("#ffdfad", 4);
  key.position.set(-3, 6, 4);
  key.castShadow = presentation !== "studio";
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.bias = -0.0005;
  key.shadow.radius = 3;
  key.shadow.normalBias = 0.012;
  const rim = new THREE.DirectionalLight("#c4dacb", 2.5);
  rim.position.set(4, 3, -3);
  scene.add(ambient, key, rim);

  const woodMaps = mode !== "ritual" ? surfaceTextures("wood", schedule) : null;
  const powderMaps =
    mode === "gallery" ? surfaceTextures("powder", schedule) : null;
  const ceramicMaps =
    mode !== "bracelet" ? surfaceTextures("ceramic", schedule) : null;
  const grain = woodMaps?.map ?? null,
    bump = woodMaps?.bump ?? null;
  const wood = new THREE.MeshStandardMaterial({
    color: WOOD_COLORS[0],
    map: grain,
    bumpMap: bump,
    bumpScale: 0.012,
    roughness: 0.96,
    roughnessMap: woodMaps?.roughness ?? null,
    side: THREE.DoubleSide,
    metalness: 0,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: "#c29a52",
    metalness: 0.85,
    roughness: 0.28,
  });
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: "#88a5ac",
    map: ceramicMaps?.map ?? null,
    bumpMap: ceramicMaps?.bump ?? null,
    bumpScale: 0.0015,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.42,
    clearcoatRoughness: 0.25,
  });
  const powder = new THREE.MeshStandardMaterial({
    map: powderMaps?.map ?? null,
    bumpMap: powderMaps?.bump ?? null,
    bumpScale: 0.015,
    roughness: 1,
    roughnessMap: powderMaps?.roughness ?? null,
  });
  const trayMaterial = new THREE.MeshStandardMaterial({
    color: "#27231e",
    roughness: 0.72,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#121a15",
    roughness: 0.85,
  });
  const floor = mesh(new THREE.PlaneGeometry(200, 200), dark, [0, -1.05, 0]);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  scene.add(floor);
  const plinth = mesh(
    new THREE.CylinderGeometry(2.15, 2.2, 0.16, 96),
    new THREE.MeshStandardMaterial({ color: "#2b3030", roughness: 0.9 }),
    [0, -0.94, 0],
  );
  scene.add(plinth);
  const plinthEdge = mesh(
    new THREE.TorusGeometry(2.15, 0.009, 8, 120),
    gold,
    [0, -0.855, 0],
  );
  plinthEdge.rotation.x = Math.PI / 2;
  scene.add(plinthEdge);
  if (presentation === "studio") {
    scene.background = null;
    scene.fog = null;
    floor.visible = plinth.visible = plinthEdge.visible = false;
  }

  const exhibit = new THREE.Group();
  scene.add(exhibit);
  const mainBracelet = bracelet(wood);
  const smoke: THREE.Sprite[] = [];
  const galleryGroups: THREE.Group[] = [];
  const smokeMap = smokeTexture();
  if (mode === "bracelet") {
    mainBracelet.group.position.y = 0.45;
    exhibit.add(mainBracelet.group);
  } else if (mode === "ritual") {
    const vessel = referenceBurner(ceramic);
    vessel.scale.setScalar(1.25);
    vessel.position.y = -0.855;
    exhibit.add(vessel);
    // A quiet tea companion gives the scene a sense of scale.
    const cupProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.14, 0),
      new THREE.Vector2(0.18, 0.08),
      new THREE.Vector2(0.25, 0.3),
      new THREE.Vector2(0.235, 0.31),
      new THREE.Vector2(0.21, 0.28),
      new THREE.Vector2(0.15, 0.08),
      new THREE.Vector2(0, 0.07),
    ];
    const cup = mesh(
      new THREE.LatheGeometry(
        new THREE.SplineCurve(cupProfile).getPoints(40),
        48,
      ),
      ceramic,
      [-1.03, -0.855, 0.35],
    );
    const tea = mesh(
      new THREE.CircleGeometry(0.185, 32),
      new THREE.MeshStandardMaterial({ color: "#4b2b11", roughness: 0.2 }),
      [-1.03, -0.635, 0.35],
    );
    tea.rotation.x = -Math.PI / 2;
    exhibit.add(cup, tea);
    for (let i = 0; i < 24; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: smokeMap,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        }),
      );
      sprite.userData.phase = i / 24;
      smoke.push(sprite);
      exhibit.add(sprite);
    }
  } else {
    plinth.visible = plinthEdge.visible = false;
    for (let i = 0; i < 5; i++) {
      const group = new THREE.Group();
      const a = (i / 5) * Math.PI * 2;
      group.position.set(Math.sin(a) * 2.05, -0.25, Math.cos(a) * 2.05);
      group.rotation.y = a;
      group.userData.slot = i;
      const stand = mesh(
        new THREE.CylinderGeometry(0.78, 0.83, 0.25, 48),
        dark,
        [0, -0.47, 0],
      );
      const standTop = mesh(
        new THREE.CylinderGeometry(0.785, 0.785, 0.015, 48),
        new THREE.MeshStandardMaterial({ color: "#53604a", roughness: 0.85 }),
        [0, -0.335, 0],
      );
      group.add(stand, standTop);
      const edge = mesh(
        new THREE.TorusGeometry(0.78, 0.009, 8, 64),
        gold,
        [0, -0.325, 0],
      );
      edge.rotation.x = Math.PI / 2;
      group.add(edge);
      let item: THREE.Group;
      if (i === 0 || i === 3) {
        item = bracelet(wood, true).group;
        item.position.y = 0.48;
      } else if (i === 1 || i === 4) {
        item = referenceBurner(ceramic);
        item.scale.setScalar(0.68);
        item.position.y = -0.33;
      } else {
        item = referenceCones(powder, trayMaterial);
        item.position.y = -0.3;
      }
      group.add(item);
      exhibit.add(group);
      galleryGroups.push(group);
    }
    camera.position.set(0, 2.6, 8.6);
    initialCamera.copy(camera.position);
  }

  function schedule() {
    if (!disposed && !warming && !frame && visible && !document.hidden)
      frame = requestAnimationFrame(render);
  }
  function render(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    elapsed += delta;
    const moving =
      options.autoRotate &&
      !reduced.matches &&
      now > restUntil &&
      mode !== "gallery";
    if (moving) exhibit.rotation.y += delta * 0.13;
    if (mode === "bracelet") {
      const radius = options.expanded ? 1.72 : RING_RADIUS;
      for (const bead of mainBracelet.beads) {
        const a = bead.userData.angle as number;
        if (reduced.matches) {
          bead.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
          continue;
        }
        bead.position.x = THREE.MathUtils.damp(
          bead.position.x,
          Math.cos(a) * radius,
          8,
          delta,
        );
        bead.position.y = THREE.MathUtils.damp(
          bead.position.y,
          Math.sin(a) * radius,
          8,
          delta,
        );
      }
      mainBracelet.cord.scale.setScalar(radius / RING_RADIUS);
      mainBracelet.beads.forEach((bead, index) => {
        bead.updateMatrix();
        mainBracelet.beadMesh.setMatrixAt(index, bead.matrix);
      });
      mainBracelet.beadMesh.instanceMatrix.needsUpdate = true;
      mainBracelet.spacer.position.x = radius;
    }
    if (mode === "gallery") {
      const target = galleryTarget;
      exhibit.rotation.y = reduced.matches
        ? target
        : THREE.MathUtils.damp(exhibit.rotation.y, target, 5, delta);
    }
    if (mode === "ritual") {
      for (let i = 0; i < smoke.length; i++) {
        const p = ((reduced.matches ? 0 : elapsed * 0.07) + i / 24) % 1;
        smoke[i].visible = options.smoke;
        smoke[i].position.set(
          Math.sin(p * 8 + (reduced.matches ? 0 : elapsed) * 0.3) * p * 0.22,
          0.79 + p * 1.65,
          Math.cos(p * 7) * p * 0.12,
        );
        smoke[i].scale.setScalar(0.16 + p * 0.75);
        (smoke[i].material as THREE.SpriteMaterial).opacity = (1 - p) * 0.28;
      }
    }
    controls.update();
    renderer.render(scene, camera);
    const calls = String(renderer.info.render.calls);
    if (canvas.dataset.drawCalls !== calls) canvas.dataset.drawCalls = calls;
    const easingBracelet =
      mode === "bracelet" &&
      Math.abs(
        mainBracelet.beads[0].position.x -
          (options.expanded ? 1.72 : RING_RADIUS),
      ) > 0.001;
    const easingGallery =
      mode === "gallery" &&
      Math.abs(exhibit.rotation.y - galleryTarget) > 0.001;
    if (
      moving ||
      (mode === "ritual" && options.smoke && !reduced.matches) ||
      easingBracelet ||
      easingGallery
    )
      schedule();
  }
  const onChange = () => schedule();
  const onStart = () => {
    restUntil = performance.now() + 8000;
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(schedule, 8100);
    schedule();
  };
  controls.addEventListener("change", onChange);
  controls.addEventListener("start", onStart);
  const observer = new ResizeObserver(() => {
    const { width, height } = canvas.parentElement!.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 520 ? 47 : 37;
    camera.updateProjectionMatrix();
    schedule();
  });
  observer.observe(canvas.parentElement!);
  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        previous = performance.now();
        schedule();
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { threshold: 0.01 },
  );
  intersection.observe(canvas);
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      previous = performance.now();
      schedule();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  reduced.addEventListener("change", schedule);

  let pointerStart = [0, 0];
  const pointerDown = (event: PointerEvent) => {
    pointerStart = [event.clientX, event.clientY];
  };
  const pointerUp = (event: PointerEvent) => {
    if (
      mode !== "gallery" ||
      Math.hypot(
        event.clientX - pointerStart[0],
        event.clientY - pointerStart[1],
      ) > 6
    )
      return;
    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(galleryGroups, true)[0];
    if (hit) {
      let object: THREE.Object3D | null = hit.object;
      while (object && object.userData.slot === undefined)
        object = object.parent;
      if (object) onSelect(object.userData.slot as number);
    }
  };
  const lost = (event: Event) => {
    event.preventDefault();
    if (!disposed) onContextLost();
  };
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("webglcontextlost", lost);

  const update = (next: PreviewOptions) => {
    if (next.galleryIndex !== options.galleryIndex) {
      const target = (-next.galleryIndex / 5) * Math.PI * 2;
      galleryTarget =
        exhibit.rotation.y +
        THREE.MathUtils.euclideanModulo(
          target - exhibit.rotation.y + Math.PI,
          Math.PI * 2,
        ) -
        Math.PI;
    }
    options = { ...next };
    controls.enableDamping = !reduced.matches;
    wood.color.set(WOOD_COLORS[next.tone] || WOOD_COLORS[0]);
    const warm = next.light === 0;
    key.color.set(warm ? "#ffdfad" : next.light === 1 ? "#e7f1ff" : "#ffc588");
    key.intensity = next.light === 2 ? 1.8 : 2.6;
    rim.intensity = next.light === 2 ? 0.65 : 1.35;
    renderer.toneMappingExposure = next.light === 2 ? 0.9 : 1.05;
    camera.zoom = next.zoom;
    camera.updateProjectionMatrix();
    schedule();
  };
  update(initial);
  controls.update();
  if (warming) {
    void renderer
      .compileAsync(scene, camera)
      .catch(() => {
        // The regular render path remains available without parallel compilation.
      })
      .finally(() => {
        warming = false;
        schedule();
      });
  } else schedule();
  return {
    update,
    setScrollProgress: (progress: number) => {
      const p = THREE.MathUtils.clamp(progress, 0, 1);
      controls.enabled = false;
      options.autoRotate = false;
      options.expanded = p > 0.3 && p < 0.7;
      exhibit.rotation.y = -0.35 + Math.min(p, 0.72) * Math.PI * 1.1;
      const closeup = THREE.MathUtils.smoothstep(p, 0.72, 0.98);
      camera.zoom =
        presentation === "studio"
          ? 1 + closeup * 1.1
          : 0.65 + Math.sin(p * Math.PI) * 0.1;
      controls.target.set(0, 0.2, 0);
      if (presentation === "studio" && mode === "bracelet" && closeup > 0) {
        exhibit.updateMatrixWorld(true);
        const beadMatrix = new THREE.Matrix4();
        mainBracelet.beadMesh.getMatrixAt(2, beadMatrix);
        const beadPosition = new THREE.Vector3()
          .setFromMatrixPosition(beadMatrix)
          .applyMatrix4(mainBracelet.beadMesh.matrixWorld);
        controls.target.lerp(beadPosition, closeup);
      }
      controls.update();
      camera.updateProjectionMatrix();
      schedule();
    },
    resetCamera: () => {
      camera.position.copy(initialCamera);
      controls.target.set(0, 0.2, 0);
      exhibit.rotation.y = 0;
      controls.update();
      schedule();
    },
    dispose: () => {
      disposed = true;
      window.clearTimeout(resumeTimer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", schedule);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("webglcontextlost", lost);
      controls.removeEventListener("change", onChange);
      controls.removeEventListener("start", onStart);
      controls.dispose();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          for (const mat of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(mat);
        }
        if (object instanceof THREE.Sprite) materials.add(object.material);
      });
      geometries.forEach((g) => g.dispose());
      const textures = new Set<THREE.Texture>();
      materials.forEach((material) =>
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) textures.add(value);
        }),
      );
      textures.forEach((texture) => texture.dispose());
      materials.forEach((m) => m.dispose());
      // Materials created for other preview modes still belong to this session.
      wood.dispose();
      gold.dispose();
      ceramic.dispose();
      dark.dispose();
      powder.dispose();
      trayMaterial.dispose();
      mainBracelet.group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const mat = object.material;
          if (!Array.isArray(mat)) mat.dispose();
        }
      });
      grain?.dispose();
      bump?.dispose();
      for (const maps of [woodMaps, powderMaps, ceramicMaps]) {
        if (!maps) continue;
        maps.map.dispose();
        maps.bump?.dispose();
        maps.roughness.dispose();
      }
      smokeMap.dispose();
      environment?.dispose();
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      delete canvas.dataset.drawCalls;
    },
  };
}
