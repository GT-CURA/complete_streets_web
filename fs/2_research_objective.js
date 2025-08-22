// ---------- KNOBS  ----------
let CURRENT_CYCLE = 0;               // guards async across loops
let HAS_SPUN_THIS_CYCLE = false;     // prevents non-zero before spin

const HOLD_BEFORE_START_MS = 1500;   // idle before first action
const HOLD_AFTER_FILL_MS   = 1500;   // hold after table filled (wheels still spin)

// Table
const PER_ELEMENT_MS = 1000;         // table typing per row
const PRE_SPIN_MS    = 200;          // pre-jitter inside each row’s time
const PAUSE_BETWEEN  = 5000;         // 87 is visible (not used for video sync here)

// Slot machine
const SPIN_SPEED_MS    = 1800;       // base shuffle speed
const ROLL_BASE_MS     = 1100;       // land duration for first wheel (leftmost)
const ROLL_STAGGER_MS  = 550;        // added per subsequent wheel

// Per-wheel speed multiplier (left→right). Tens slower than ones.
const SPIN_MULTIPLIERS = [1.7, 1.0];

// Visual row height for each digit (must match CSS .digit span height)
const ROW_HEIGHT = 72;

// ---------- HELPERS ----------
const $  = (q, sc = document) => sc.querySelector(q);
const $$ = (q, sc = document) => Array.from(sc.querySelectorAll(q));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const inView = (el) => {
  const r = el.getBoundingClientRect();
  return r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.3;
};
const escapeHTML = (s) =>
  s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function setProgress(f) {
  const bar  = document.querySelector(".rf-progress .bar");
  const fill = document.querySelector(".rf-progress .fill");
  if (!bar || !fill) return;
  const pct = Math.max(0, Math.min(1, f));
  fill.style.height = (pct * 100) + "%";
  bar.setAttribute("aria-valuenow", String(Math.round(pct * 100)));
  bar.dataset.full = (pct >= 1) ? "true" : "false";
}
function setProgressIdle(idle) {
  const bar = document.querySelector(".rf-progress .bar");
  if (!bar) return;
  bar.dataset.idle = idle ? "true" : "false";
}
function resetProgress() { setProgress(0); }


// -----------------------------------------------------------------
// ---------- Video (sync: start-of-fill → landing-on-87) ----------
function getRowsCount() { return $$("#rf-diagram .row").length || 0; }
function getFillDurationMs() { return getRowsCount() * PER_ELEMENT_MS; }
function getWheelCount() { return $$("#odo .digit").length || 0; }
function getLandingDurationMs() {
  const wheels = Math.max(1, getWheelCount());
  return ROLL_BASE_MS + (wheels - 1) * ROLL_STAGGER_MS;
}
function getVideoWindowMs() {
  return getFillDurationMs() + HOLD_AFTER_FILL_MS + getLandingDurationMs();
}
function resetVideo() {
  const v = $("#rf-video");
  if (!v) return;
  try {
    v.pause();
    v.currentTime = 0;
    v.playbackRate = 1;
    v.loop = false;
    v.muted = true;
  } catch (_) {}
}
function ensureVideoMetadata(v) {
  return new Promise((res) => {
    if (v.readyState >= 1 && !Number.isNaN(v.duration)) return res();
    v.addEventListener("loadedmetadata", () => res(), { once: true });
  });
}
/** Start video now and stretch it (slower/faster) to end exactly at windowMs. */
async function startVideoForWindow(windowMs) {
  const v = $("#rf-video");
  if (!v) return;
  await ensureVideoMetadata(v);

  const desiredSeconds = Math.max(0.25, windowMs / 1000);
  const clipSeconds    = Math.max(0.25, v.duration || desiredSeconds);

  let rate = clipSeconds / desiredSeconds;

  rate = Math.max(0.25, Math.min(4.0, rate));

  v.pause();
  v.currentTime = 0;
  v.playbackRate = rate;
  v.loop = false;
  v.muted = true;
  try { await v.play(); } catch (e) { console.warn("Autoplay blocked?", e); }
}
function finishVideoNow() {
  const v = $("#rf-video");
  if (!v) return;
  try {
    if (!Number.isNaN(v.duration) && isFinite(v.duration)) v.currentTime = v.duration;
    v.pause();
  } catch (_) {}
}

// -----------------------------------------------------------------
// ---------- Table ----------
async function typeOverDuration(el, rawText, durationMs, onProgress) {
  let text = rawText.replace(/^(Yes|No),\s*/, "$1,\n");
  const htmlReady = escapeHTML(text).replaceAll('\n','<br>');
  el.innerHTML = "";
  if (!htmlReady || durationMs <= 0) {
    el.innerHTML = htmlReadyBold(htmlReady);
    onProgress && onProgress(1);
    return;
  }
  const steps = Math.max(htmlReady.length, 1);
  const stepDelay = Math.max(Math.floor(durationMs / steps), 4);

  for (let i = 1; i <= steps; i++) {
    el.innerHTML = htmlReadyBold(htmlReady.slice(0, i));
    onProgress && onProgress(i / steps);
    await sleep(stepDelay);
  }
}
function htmlReadyBold(html) {
  return html
    .replace(/^(Yes|No)(,?)/, "<strong>$1</strong>$2")
    .replace(/(<br>\s*)(Yes|No)(,?)/, (m, br, yn, comma) => `${br}<strong>${yn}</strong>${comma}`);
}
async function fillTablePerElement({ startSpinAtLabel = "Amenities", cycle } = {}) {
  const rows = $$("#rf-diagram .row");
  if (!rows.length) return;

  const cells  = rows.map(r => r.querySelector(".typing"));
  const labels = rows.map(r => r.querySelector(".label")?.textContent.trim() || "");
  const total  = cells.length;

  const startIdx = labels.findIndex(
    t => t.toLowerCase() === String(startSpinAtLabel).toLowerCase()
  );
  let spun = false;

  for (let i = 0; i < total; i++) {
    // start the odometer spin exactly once at the trigger label
    if (!spun && i === (startIdx >= 0 ? startIdx : 2)) {
      if (cycle && cycle !== CURRENT_CYCLE) return;  // another cycle took over
      setupOdometerSpin();
      spun = true;
    }

    const cell = cells[i];
    const txt  = cell?.getAttribute("data-text") || "";

    const glyphs = " ░▒▓█|/\\-";
    const pre = Math.min(PRE_SPIN_MS, PER_ELEMENT_MS - 40);
    const end = performance.now() + pre;
    while (performance.now() < end) {
      if (cycle && cycle !== CURRENT_CYCLE) return;
      if (cell) cell.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      const base = i / total;
      setProgress(base * 0.995);
      await sleep(16);
    }

    if (cell) {
      await typeOverDuration(cell, txt, Math.max(0, PER_ELEMENT_MS - pre), (frac) => {
        setProgress((i + frac) / total);
      });
    }
  }

  setProgress(1);
}

// -----------------------------------------------------------------
// ---------- odometer core ----------
function cancelAllAnimations(el) {
  const arr = el.getAnimations?.() || [];
  arr.forEach(a => a.cancel());
}
function buildStacks(d, rows = 10) {
  d.innerHTML = Array.from({ length: rows }, (_, k) => `<span>${k % 10}</span>`).join("");
}

function showImmediateDigit(d, digit) {
  cancelAllAnimations(d);
  d.classList.remove("spin");
  d.style.removeProperty("animationDuration");
  d.style.transform = "translateY(0)";
  d.innerHTML = `<span>${digit}</span>`;   // ONE row only → no residual scroll
  d.dataset.target = String(digit);
}
function showImmediateNumber(n) {
  const s = String(n).padStart($$("#odo .digit").length, "0");
  $$("#odo .digit").forEach((d, i) => showImmediateDigit(d, s[i]));
}

// Show "00" at rest (no spin) before anything starts
function primeOdometerAtZero() { showImmediateNumber(0); }

// Strong reset used at the start of each cycle
function hardResetOdometer() { showImmediateNumber(0); }

// Set final number (ignored unless we've spun this cycle)
function setOdometerTo(n) {
  if (!HAS_SPUN_THIS_CYCLE && n !== 0) return;   // ignore stray non-zero
  const s = String(n).padStart($$("#odo .digit").length, "0");
  $$("#odo .digit").forEach((d, i) => { d.dataset.target = s[i]; });
}

// Spin while the table fills — with per-wheel speeds
function setupOdometerSpin() {
  HAS_SPUN_THIS_CYCLE = true;
  const wheels = $$("#odo .digit");
  wheels.forEach((d, i) => {
    cancelAllAnimations(d);
    d.classList.remove("spin");
    d.style.removeProperty("transform");
    buildStacks(d, 20);                     // double stack for seamless loop
    void d.offsetHeight;                    // reflow
    const mult = SPIN_MULTIPLIERS[i] ?? 1.0;
    d.style.animationDuration = (SPIN_SPEED_MS * mult) + "ms";
    d.classList.add("spin");
  });
}

// Land on each digit’s target (e.g., "87")
function stopSpinAndRoll() {
  return new Promise(resolve => {
    const wheels = $$("#odo .digit");
    let done = 0;
    wheels.forEach((d, i) => {
      const target = parseInt(d.dataset.target, 10) || 0;
      cancelAllAnimations(d);
      d.classList.remove("spin");
      buildStacks(d, 10); // single 0..9
      d.style.removeProperty("transform");
      const duration = ROLL_BASE_MS + i * ROLL_STAGGER_MS; // left lands first
      const anim = d.animate(
        [{ transform: "translateY(0)" },
         { transform: `translateY(-${target * ROW_HEIGHT}px)` }],
        { duration, easing: "cubic-bezier(.18,.9,.16,1)", fill: "forwards" }
      );
      anim.onfinish = () => { if (++done === wheels.length) resolve(); };
    });
  });
}

// Animate back from current target to "00" and lock it to single-row '0'
function rollBackToZero() {
  return new Promise(resolve => {
    const wheels = $$("#odo .digit");
    let done = 0;
    wheels.forEach((d, i) => {
      const target = parseInt(d.dataset.target, 10) || 0;
      cancelAllAnimations(d);
      d.classList.remove("spin");
      buildStacks(d, 10);
      const start = -target * ROW_HEIGHT;
      d.style.transform = `translateY(${start}px)`;
      const duration = ROLL_BASE_MS + i * ROLL_STAGGER_MS;
      const anim = d.animate(
        [{ transform: `translateY(${start}px)` }, { transform: "translateY(0)" }],
        { duration, easing: "cubic-bezier(.18,.9,.16,1)", fill: "forwards" }
      );
      anim.onfinish = () => {
        // Snap to single '0' row so next cycle can't reveal old digits
        showImmediateDigit(d, 0);
        if (++done === wheels.length) {
          HAS_SPUN_THIS_CYCLE = false;      // back to pre-spin state
          resolve();
        }
      };
    });
  });
}

// -----------------------------------------------------------------
// ---------- reset & loop ----------
function resetDiagramTextOnly() {
  $$("#rf-diagram .typing").forEach(td => { td.textContent = ""; td.innerHTML = ""; });
}

async function runCycle() {
  const myCycle = ++CURRENT_CYCLE; 

  resetDiagramTextOnly();
  hardResetOdometer();                // forces “00”
  resetVideo();                       // reset the video to t=0, rate=1, paused
  resetProgress();
  setProgressIdle(true);
  HAS_SPUN_THIS_CYCLE = false;

  await sleep(HOLD_BEFORE_START_MS);
  if (myCycle !== CURRENT_CYCLE) return;

  // Start video EXACTLY when table fill begins, and stretch it to end at landing
  const windowMs = getVideoWindowMs();
  startVideoForWindow(windowMs);

  // 1) Fill table (spin starts at "Amenities")
  await fillTablePerElement({ startSpinAtLabel: "Amenities", cycle: myCycle });
  if (myCycle !== CURRENT_CYCLE) return;

  // 2) Hold after table full (wheels still spinning)
  await sleep(HOLD_AFTER_FILL_MS);
  if (myCycle !== CURRENT_CYCLE) return;

  // 3) Land on 87 (landing time is included in windowMs)
  setOdometerTo(87);
  if (myCycle !== CURRENT_CYCLE) return;

  await stopSpinAndRoll();         
  if (myCycle !== CURRENT_CYCLE) return;

  // Ensure the clip is finished even if timing drifted a bit
  finishVideoNow();

  // 4) Keep 87 visible for a bit (this no longer affects the video)
  await sleep(PAUSE_BETWEEN);
  if (myCycle !== CURRENT_CYCLE) return;

  // 5) Roll back to 00
  await rollBackToZero();             // ends with single-row “00” lock
  if (myCycle !== CURRENT_CYCLE) return;

  await sleep(600);
  if (myCycle !== CURRENT_CYCLE) return;

  runCycle();                          // loop
}

// Wrap cycle so a thrown error doesn't freeze everything
async function safeRunCycle() {
  try { await runCycle(); }
  catch (e) {
    console.error("[framework] cycle aborted:", e);
    setTimeout(() => { CURRENT_CYCLE++; safeRunCycle(); }, 1500);
  }
}

// -----------------------------------------------------------------
// ---------- nav highlighting (placeholders; keep your originals) ----------
function computeActiveGroup() { /* ... as in your file ... */ }
function updateNavHighlight()   { /* ... as in your file ... */ }
function bindNavObservers()     { /* ... as in your file ... */ }

// -----------------------------------------------------------------
// ---------- init ----------
function initFramework() {
  const sec = $("#methodology");
  if (!sec) return;

  // Show "00" before anything starts (single-row lock)
  primeOdometerAtZero();

  let started = false;
  const maybeStart = () => { if (!started && inView(sec)) { started = true; safeRunCycle(); } };

  (document.querySelector("main") || window).addEventListener("scroll", maybeStart, { passive: true });
  window.addEventListener("load", () => { requestAnimationFrame(maybeStart); updateNavHighlight(); });
  bindNavObservers();
}

initFramework();
