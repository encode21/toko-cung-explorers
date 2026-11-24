// Injected by scripts/record-intro.mjs before the game loads (capture browser only; production code is untouched).
// Captures the three.js renderer via its devtools hook, adds a virtual clock, a camera override and a label allow-list.
(() => {
  try {
    const k = "toko-cung-game-settings";
    const cur = JSON.parse(localStorage.getItem(k) || "null") || { state: {}, version: 1 };
    cur.state.graphics = "HIGH";
    localStorage.setItem(k, JSON.stringify(cur));
  } catch {}
  const cine = (window.__cine = {
    renderers: [],
    scenes: [],
    cam: null,
    main: null,
    manual: false,
    calls: new Map(),
  });
  // Avatar meshes are skinned; name-badge pills are not.
  const hasSkin = (o) => {
    let skin = false;
    o.traverse((c) => (skin ||= !!c.isSkinnedMesh));
    return skin;
  };
  const hook = new EventTarget();
  hook.addEventListener("observe", (e) => {
    const o = e.detail;
    if (o && o.isWebGLRenderer && !o.__cine) {
      o.__cine = true;
      cine.renderers.push(o);
      const render = o.render.bind(o);
      o.render = (scene, camera) => {
        cine.calls.set(camera, (cine.calls.get(camera) || 0) + 1);
        camera.__cineRenderer = o;
        // Privacy: only reviewed static city signs stay visible; player/NPC names and player warung names are hidden.
        if (cine.allow && scene.isScene)
          scene.traverse((o) => {
            if (typeof o.text !== "string") return;
            o.visible = cine.allow.has(o.text);
            // Name badges are a text + pill pair; hide the pill with the name.
            if (!o.visible && o.parent && o.parent.children.length <= 3)
              for (const sib of o.parent.children)
                if (sib !== o && !hasSkin(sib)) sib.visible = false;
          });
        if (camera === cine.main)
          cine.gameDir = camera.getWorldDirection(camera.position.clone()).toArray();
        if (cine.cam && camera === cine.main) {
          const c = cine.cam;
          camera.position.set(...c.p);
          camera.up.set(0, 1, 0);
          camera.lookAt(...c.l);
          if (c.fov) camera.fov = c.fov;
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld(true);
        }
        return render(scene, camera);
      };
    } else if (o && o.isScene) cine.scenes.push(o);
  });
  Object.defineProperty(window, "__THREE_DEVTOOLS__", { value: hook, configurable: true });
  const realDate = Date.now.bind(Date);
  const GAME_DAY_MS = 48 * 60 * 1000;
  let dateOffset = 0,
    dateFrozen = 0,
    baseAtFreeze = 0;
  cine.dateRate = 1; // >1 = time-lapse of the sky while recording
  Date.now = () =>
    cine.manual ? dateFrozen + (base - baseAtFreeze) * cine.dateRate : realDate() + dateOffset;
  // Moves the page clock back only (never forward), so session tokens never look expired.
  cine.setWorldMinutes = (m) => {
    const cur = ((Date.now() % GAME_DAY_MS) / GAME_DAY_MS) * 1440;
    dateOffset -= (((((cur - m) % 1440) + 1440) % 1440) / 1440) * GAME_DAY_MS;
  };
  const realNow = performance.now.bind(performance);
  const realRaf = window.requestAnimationFrame.bind(window);
  let base = 0,
    offset = 0,
    queue = [],
    id = 1e6;
  performance.now = () => (cine.manual ? base : realNow() + offset);
  window.requestAnimationFrame = (cb) => {
    if (!cine.manual) return realRaf(() => cb(performance.now()));
    queue.push([++id, cb]);
    return id;
  };
  const realCancel = window.cancelAnimationFrame.bind(window);
  window.cancelAnimationFrame = (n) => {
    queue = queue.filter(([i]) => i !== n);
    realCancel(n);
  };
  cine.manualOn = () => {
    base = performance.now();
    dateFrozen = Date.now();
    baseAtFreeze = base;
    cine.manual = true;
  };
  cine.manualOff = () => {
    if (!cine.manual) return; // a second call would rewind performance.now and freeze the game clock
    dateOffset = Date.now() - realDate();
    offset = base - realNow();
    cine.manual = false;
    const q = queue;
    queue = [];
    q.forEach(([, cb]) => realRaf(() => cb(performance.now())));
  };
  cine.pickMain = () => {
    let best = null;
    // The game camera sees far (view distance); avatar previews and cube cameras do not.
    for (const [c, n] of cine.calls)
      if (c.isPerspectiveCamera && c.far > 100 && (!best || n > cine.calls.get(best))) best = c;
    if (best) best.__cineRenderer.domElement.dataset.cine = "main";
    return (cine.main = best);
  };
  cine.find = (text) => {
    let p = null;
    cine.scenes[0]?.traverse((o) => {
      if (o.text === text) p = o.getWorldPosition(o.position.clone()).toArray();
    });
    return p;
  };
  cine.step = (dt = 1000 / 30) => {
    base += dt;
    const q = queue;
    queue = [];
    q.forEach(([, cb]) => cb(base));
  };
  const style = document.createElement("style");
  style.textContent =
    "html.cine * { visibility: hidden !important; } html.cine canvas[data-cine] { visibility: visible !important; }";
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
})();
