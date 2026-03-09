// ═══════════════════════════════════════════════════════
//  GT-SQR v2.0 — GnuTux Short Quran Reels
//  Author: SalehGNUTUX | License: GPLv2
//  آخر تحديث: 2026 - إصلاح شامل للمشاكل
// ═══════════════════════════════════════════════════════
"use strict";

// ── RECITERS REGISTRY ──────────────────────────────────
const RECITERS_LIST = [
  { id: "alafasy",    name: "مشاري العفاسي",            flag: "🇰🇼", folder: "Alafasy_128kbps" },
  { id: "ghamdi",     name: "سعد الغامدي",               flag: "🇸🇦", folder: "Ghamadi_40kbps" },
  { id: "minshawi",   name: "المنشاوي مرتل",             flag: "🇪🇬", folder: "Minshawy_Murattal_128kbps" },
  { id: "husary",     name: "محمود الحصري",              flag: "🇪🇬", folder: "Husary_128kbps" },
  { id: "shaatri",    name: "أبو بكر الشاطري",           flag: "🇸🇦", folder: "abu_bakr_ash-shaatree_128kbps" },
  { id: "maher",      name: "ماهر المعيقلي",             flag: "🇸🇦", folder: "MaherAlMuaiqly128kbps" },
  // ── رواية ورش ──
  { id: "yassin_w",   name: "ياسين الجزائري (ورش)",      flag: "🇩🇿", folder: "warsh/warsh_yassin_al_jazaery_64kbps" },
  { id: "hussary_w",  name: "الحصري مرتل (ورش)",         flag: "🇪🇬", folder: "warsh/Husary_Murattal_warsh_128kbps" },
];

// دالة مساعدة: بناء URL الصوت مع تنظيف الشرطات الزائدة
function buildAudioUrl(folder, surahNum, ayaNum) {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, ''); // إزالة / من البداية والنهاية
  return `${AUDIO_BASE}/${cleanFolder}/${String(surahNum).padStart(3,"0")}${String(ayaNum).padStart(3,"0")}.mp3`;
}

const BUILT_IN_FONTS = [
  { id: "amiri",     name: "Amiri Quran",     css: "'Amiri Quran'",       sample: "بِسْمِ اللَّهِ" },
  { id: "reem",      name: "Reem Kufi",        css: "'Reem Kufi'",         sample: "بِسْمِ اللَّهِ" },
  { id: "scheher",   name: "Scheherazade",     css: "'Scheherazade New'",  sample: "بِسْمِ اللَّهِ" },
  { id: "cairo",     name: "Cairo Bold",       css: "'Cairo'",             sample: "بِسْمِ اللَّهِ" },
  { id: "noto",      name: "Noto Naskh",       css: "'Noto Naskh Arabic'", sample: "بِسْمِ اللَّهِ" },
  { id: "lateef",    name: "Lateef",           css: "'Lateef'",            sample: "بِسْمِ اللَّهِ" },
  { id: "harmattan", name: "Harmattan",        css: "'Harmattan'",         sample: "بِسْمِ اللَّهِ" },
  { id: "markazi",   name: "Markazi Text",     css: "'Markazi Text'",      sample: "بِسْمِ اللَّهِ" },
  { id: "ruqaa",     name: "Aref Ruqaa",       css: "'Aref Ruqaa'",        sample: "بِسْمِ اللَّهِ" },
];

const THEMES = {
  emerald: { gc1: "#0a2e1e", gc2: "#020d06", tc: "#ffffff", oc: "#c9a227" },
  gold:    { gc1: "#2a1a00", gc2: "#0d0800", tc: "#f5e6b0", oc: "#f0c842" },
  night:   { gc1: "#050a1e", gc2: "#020510", tc: "#e0e8ff", oc: "#4a9fd5" },
  rose:    { gc1: "#2a0d18", gc2: "#0d0408", tc: "#ffe0ef", oc: "#e85d8a" },
  ocean:   { gc1: "#002233", gc2: "#00080f", tc: "#d0f0ff", oc: "#00bcd4" },
  desert:  { gc1: "#2e1e06", gc2: "#100900", tc: "#f0e0c0", oc: "#d4a017" },
  purple:  { gc1: "#1a0a2e", gc2: "#08020f", tc: "#e8d8ff", oc: "#9c5cd4" },
  dark:    { gc1: "#111111", gc2: "#000000", tc: "#ffffff", oc: "#888888" },
};

const QURAN_API  = "https://api.alquran.cloud/v1";
const AUDIO_BASE = "https://everyayah.com/data";

// ── GLOBAL STATE ───────────────────────────────────────
const S = {
  surahs: [], verses: [], translations: [],
  currentAya: 0, playing: false,
  elapsed: 0, lastRafTs: null,
  ayaDurations: [],
  bgImg: null, bgVid: null,
  bgMotionT: 0,
  audioCtx: null, analyser: null, exportDest: null,
  recAudioEl: null, recAudioSource: null, recGainNode: null,
  logoVid: null,
  bgAudioEl: null, bgAudioSource: null,
  waveData: new Uint8Array(64).fill(0),
  stars: [], bokeh: [],
  exportCancel: false, mediaRecorder: null, exportChunks: [],
  exporting: false, exportSources: [],
  templates: [], reciters: [...RECITERS_LIST],
  allFonts: [...BUILT_IN_FONTS],
  rafId: null,
  logoImg: null,
};

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  initThemeChips();
  renderFontGrid();
  renderReciters();
  loadTemplates();
  generateParticles();
  initCanvas();
  checkOffline();
  startRenderLoop();
  await loadLocalFonts(false);
  await loadSurahList();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { });
  initMobileLayout();
});

// ══════════════════════════════════════════════════════
//  ALWAYS-RUNNING RENDER LOOP
// ══════════════════════════════════════════════════════
function startRenderLoop() {
  function loop(ts) {
    S.rafId = requestAnimationFrame(loop);
    const dt = S.lastRafTs ? Math.min((ts - S.lastRafTs) / 1000, .1) : 0;
    S.lastRafTs = ts;
    if (S.playing) {
      S.elapsed += dt;
      S.bgMotionT += dt;
      checkAyaAdvance();
      updateProgressUI();
    }
    drawFrame(ts / 1000);
  }
  S.rafId = requestAnimationFrame(loop);
}

function checkAyaAdvance() {
  if (S.exporting) return; // لا تقاطع مع جدولة التصدير
  const dur = S.ayaDurations[S.currentAya] || parseFloat(gv("aya-dur")) || 6;
  if (S.elapsed >= dur) {
    if (S.currentAya < S.verses.length - 1) {
      S.currentAya++;
      S.elapsed = 0;
      playRecitationAudio();
      updateAyaUI();
    } else {
      pausePlayer();
      S.currentAya = 0; S.elapsed = 0;
      updateAyaUI();
    }
  }
}

// ══════════════════════════════════════════════════════
//  CANVAS SETUP
// ══════════════════════════════════════════════════════
function initCanvas() { onFmtChange(); }

function onFmtChange() {
  const fmt = radioVal("fmt");
  const cv = $("cv");
  const sizes = { "9:16": { w: 720, h: 1280 }, "16:9": { w: 1280, h: 720 }, "1:1": { w: 1080, h: 1080 } };
  const sz = sizes[fmt] || sizes["9:16"];
  cv.width = sz.w; cv.height = sz.h;
  $("fmt-lbl").textContent = fmt;
  fitCanvas();
}

function fitCanvas() {
  const preview = $("preview");
  const cv = $("cv");
  if (!preview || !cv) return;
  const maxH = preview.clientHeight - 90;
  const maxW = preview.clientWidth - 20;
  if (maxH <= 0 || maxW <= 0) return;
  const ratio = cv.width / cv.height;
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  cv.style.width = Math.floor(w) + "px";
  cv.style.height = Math.floor(h) + "px";
}
window.addEventListener("resize", fitCanvas);

// ══════════════════════════════════════════════════════
//  MAIN DRAW
// ══════════════════════════════════════════════════════
function drawFrame(ts) {
  const cv = $("cv");
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);

  drawBg(ctx, W, H, ts);
  applyColorFilter(ctx, W, H);
  if (ge("fx-bokeh")) drawBokeh(ctx, W, H, ts);
  applyDim(ctx, W, H);
  applyOvColor(ctx, W, H);
  drawOrnament(ctx, W, H, ts);
  if (ge("fx-stars")) drawStars(ctx, W, H, ts);
  if (ge("fx-rays")) drawRays(ctx, W, H, ts);
  if (S.verses.length) drawVerse(ctx, W, H, ts);
  drawWave(ctx, W, H, ts);
  drawLogo(ctx, W, H);
  drawWatermark(ctx, W, H);
  if (ge("fx-vig")) drawVignette(ctx, W, H);
  if (ge("fx-gold")) drawGoldBorder(ctx, W, H, ts);
  if (ge("fx-grain")) drawGrain(ctx, W, H);
}

// ══════════════════════════════════════════════════════
//  BACKGROUND
// ══════════════════════════════════════════════════════
function drawBg(ctx, W, H, ts) {
  const bgt = radioVal("bgt");
  const bgm = radioVal("bgm");
  const bright = gv("bright") / 100;

  ctx.save();
  ctx.filter = `brightness(${bright}) saturate(${gv("satur") / 100})`;

  if (bgt === "gradient" || (!S.bgImg && !S.bgVid)) {
    drawGradient(ctx, W, H);
  } else if (bgt === "image" && S.bgImg) {
    ctx.save();
    applyBgMotion(ctx, W, H, bgm, ts);
    imgCover(ctx, S.bgImg, 0, 0, W, H);
    ctx.restore();
  } else if (bgt === "video" && S.bgVid) {
    if (S.bgVid.readyState >= 2) {
      ctx.save();
      applyBgMotion(ctx, W, H, bgm, ts);
      imgCover(ctx, S.bgVid, 0, 0, W, H);
      ctx.restore();
    } else {
      drawGradient(ctx, W, H);
    }
  } else {
    drawGradient(ctx, W, H);
  }
  ctx.restore();
  ctx.filter = "none";
}

function drawGradient(ctx, W, H) {
  const c1 = $("gc1").value, c2 = $("gc2").value;
  const dir = $("grad-dir").value;
  let gr;
  if (dir === "radial") {
    gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .75);
  } else {
    const map = { tb: [W / 2, 0, W / 2, H], bt: [W / 2, H, W / 2, 0], diag: [0, 0, W, H], rdiag: [W, 0, 0, H] };
    const [x0, y0, x1, y1] = map[dir] || map.tb;
    gr = ctx.createLinearGradient(x0, y0, x1, y1);
  }
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
}

function applyBgMotion(ctx, W, H, bgm, ts) {
  const t = S.bgMotionT;
  if (bgm === "drift") { const d = t * 12 % 80; ctx.translate(d * .5, d * .3); ctx.scale(1.15, 1.15); ctx.translate(-W * .075, -H * .06); }
  if (bgm === "zoom") { const sc = 1 + ((t * .04) % 0.15); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2); }
  if (bgm === "pan") { const p = (Math.sin(t * .25) + 1) / 2; ctx.translate(-p * 60, 0); ctx.scale(1.12, 1); }
}

function imgCover(ctx, src, x, y, w, h) {
  const sw = src.naturalWidth || src.videoWidth || w;
  const sh = src.naturalHeight || src.videoHeight || h;
  if (!sw || !sh) return;
  const ir = sw / sh, cr = w / h;
  let dw, dh, dx, dy;
  if (ir > cr) { dh = h; dw = dh * ir; dx = x - (dw - w) / 2; dy = y; }
  else { dw = w; dh = dw / ir; dy = y - (dh - h) / 2; dx = x; }
  ctx.drawImage(src, dx, dy, dw, dh);
}

// ══════════════════════════════════════════════════════
//  COLOR FILTER
// ══════════════════════════════════════════════════════
function applyColorFilter(ctx, W, H) {
  const cf = radioVal("cf");
  if (cf === "none") return;
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (cf === "bw") { const g = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; d[i] = d[i + 1] = d[i + 2] = g; }
    if (cf === "warm") { d[i] = Math.min(255, d[i] * 1.12); d[i + 2] = Math.max(0, d[i + 2] * .88); }
    if (cf === "cold") { d[i] = Math.max(0, d[i] * .88); d[i + 2] = Math.min(255, d[i + 2] * 1.12); }
  }
  ctx.putImageData(id, 0, 0);
}

function applyDim(ctx, W, H) {
  const d = gv("dim") / 100;
  if (d > 0) { ctx.fillStyle = `rgba(0,0,0,${d})`; ctx.fillRect(0, 0, W, H); }
}

function applyOvColor(ctx, W, H) {
  const op = gv("ov-op") / 100;
  if (op <= 0) return;
  const [r, g, b] = hex2rgb($("ov-col").value);
  ctx.fillStyle = `rgba(${r},${g},${b},${op})`; ctx.fillRect(0, 0, W, H);
}

// ══════════════════════════════════════════════════════
//  ORNAMENTS
// ══════════════════════════════════════════════════════
function drawOrnament(ctx, W, H, ts) {
  const type = radioVal("orn"); if (type === "none") return;
  const op = gv("orn-op") / 100, col = $("orn-col").value;
  ctx.save(); ctx.globalAlpha = op;
  if (type === "hex") drawHexGrid(ctx, W, H, col);
  if (type === "geo") drawGeoPattern(ctx, W, H, col);
  if (type === "stars") drawIslamicStars(ctx, W, H, col);
  if (type === "arch") drawArch(ctx, W, H, col);
  if (type === "frame") drawOrnateFrame(ctx, W, H, col, ts);
  ctx.restore();
}

function drawHexGrid(ctx, W, H, col) {
  const s = 45, h = s * Math.sqrt(3) / 2;
  ctx.strokeStyle = col; ctx.lineWidth = .8;
  for (let r = -1; r < H / h + 2; r++) for (let c = -1; c < W / (s * 1.5) + 2; c++) {
    const x = c * s * 1.5, y = r * h * 2 + (c % 2 === 0 ? 0 : h);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 6; ctx.lineTo(x + s * .9 * Math.cos(a), y + s * .9 * Math.sin(a)); }
    ctx.closePath(); ctx.stroke();
  }
}

function drawGeoPattern(ctx, W, H, col) {
  const s = 55; ctx.strokeStyle = col; ctx.lineWidth = .7;
  for (let r = 0; r < H / s + 2; r++) for (let c = 0; c < W / s + 2; c++) {
    const x = c * s, y = r * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s / 2, y + s); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s / 2, y + s); ctx.lineTo(x + s / 2, y + s); ctx.closePath(); ctx.stroke();
  }
}

function drawIslamicStars(ctx, W, H, col) {
  ctx.strokeStyle = col; ctx.lineWidth = .8;
  for (let r = -1; r < H / 80 + 2; r++) for (let c = -1; c < W / 80 + 2; c++) {
    const x = c * 80 + (r % 2) * 40, y = r * 80;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 === 0 ? 32 : 14; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.stroke();
  }
}

function drawArch(ctx, W, H, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 1.5;
  const cx = W / 2, aw = W * .6;
  ctx.beginPath(); ctx.moveTo(cx - aw / 2, H * .86); ctx.lineTo(cx - aw / 2, H * .4);
  ctx.arc(cx, H * .4, aw / 2, Math.PI, 0); ctx.lineTo(cx + aw / 2, H * .86); ctx.stroke();
  ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(cx, H * .37, 14, 0, Math.PI * 2); ctx.stroke();
}

function drawOrnateFrame(ctx, W, H, col, ts) {
  const p = 12, pulse = 1 + Math.sin(ts * .8) * .012;
  ctx.strokeStyle = col; ctx.lineWidth = 1.5 * pulse;
  rRect(ctx, p, p, W - p * 2, H - p * 2, 14); ctx.stroke();
  ctx.lineWidth = .6; rRect(ctx, p + 7, p + 7, W - (p + 7) * 2, H - (p + 7) * 2, 8); ctx.stroke();
  const cs = 28;
  [[p, p], [W - p, p], [p, H - p], [W - p, H - p]].forEach(([x, y]) => {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-cs, 0); ctx.lineTo(0, 0); ctx.lineTo(0, -cs);
    ctx.stroke(); ctx.restore();
  });
}

function rRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

// ══════════════════════════════════════════════════════
//  FX
// ══════════════════════════════════════════════════════
function generateParticles() {
  S.stars = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * .9 + .2, alpha: Math.random() * .6 + .3, phase: Math.random() * Math.PI * 2 }));
  S.bokeh = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 35 + 10, alpha: Math.random() * .1 + .03, vy: Math.random() * .0003 + .0001 }));
}

function drawStars(ctx, W, H, ts) {
  S.stars.forEach(s => {
    const a = s.alpha * (.5 + .5 * Math.sin(ts * 1.8 + s.phase));
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,220,${a})`; ctx.fill();
  });
}

function drawRays(ctx, W, H, ts) {
  ctx.save(); ctx.globalCompositeOperation = "screen";
  const cx = W / 2, cy = H * .2;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + ts * .04, len = Math.max(W, H) * 1.2;
    const alpha = .025 + .015 * Math.sin(ts * .7 + i);
    const gr = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    gr.addColorStop(0, `rgba(255,235,170,${alpha})`); gr.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - .02) * len, cy + Math.sin(a - .02) * len);
    ctx.lineTo(cx + Math.cos(a + .02) * len, cy + Math.sin(a + .02) * len);
    ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
  }
  ctx.restore();
}

function drawBokeh(ctx, W, H, ts) {
  S.bokeh.forEach(p => {
    const y = ((p.y + ts * p.vy) % 1) * H;
    const gr = ctx.createRadialGradient(p.x * W, y, 0, p.x * W, y, p.r);
    gr.addColorStop(0, `rgba(200,220,200,${p.alpha})`); gr.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.arc(p.x * W, y, p.r, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
  });
}

function drawVignette(ctx, W, H) {
  const str = gv("vig-str") / 100;
  const gr = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75);
  gr.addColorStop(0, "transparent"); gr.addColorStop(1, `rgba(0,0,0,${str * .85})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
}

function drawGoldBorder(ctx, W, H, ts) {
  const pulse = .5 + .5 * Math.sin(ts * 1.5);
  const [r, g, b] = hex2rgb($("orn-col").value);
  ctx.save();
  ctx.shadowColor = `rgba(${r},${g},${b},${.5 + pulse * .3})`; ctx.shadowBlur = 20 + pulse * 10;
  ctx.strokeStyle = `rgba(${r},${g},${b},.85)`; ctx.lineWidth = 2;
  rRect(ctx, 8, 8, W - 16, H - 16, 13); ctx.stroke();
  ctx.restore();
}

function drawGrain(ctx, W, H) {
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - .5) * 28;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(id, 0, 0);
}

// ══════════════════════════════════════════════════════
//  LOGO (صورة + فيديو MOV شفاف)
// ══════════════════════════════════════════════════════
function onLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const isVideo = /\.(mov|mp4|webm)$/i.test(file.name) || file.type.startsWith("video/");

  // أوقف شعار الفيديو السابق إن وجد
  if (S.logoVid) { try { S.logoVid.pause(); } catch (_) {} S.logoVid = null; }
  S.logoImg = null;

  if (isVideo) {
    const vid = document.createElement("video");
    vid.src        = url;
    vid.loop       = true;
    vid.muted      = true;
    vid.playsInline= true;
    vid.autoplay   = true;
    // MOV/ProRes4444 يدعم قناة ألفا في Safari/Chrome
    vid.onloadeddata = () => {
      S.logoVid = vid;
      vid.play().catch(() => {});
      $("logo-preview").style.display = "block";
      $("logo-img-preview").src = "";
      $("logo-vid-preview").src = url;
      $("logo-vid-preview").style.display = "block";
      $("logo-img-preview").style.display = "none";
      toast("✅ شعار فيديو MOV تم تحميله", "success");
    };
    vid.onerror = () => toast("❌ فشل تحميل الفيديو", "error");
    vid.load();
  } else {
    const img = new Image();
    img.onload = () => {
      S.logoImg = img;
      $("logo-preview").style.display = "block";
      $("logo-img-preview").src = url;
      $("logo-img-preview").style.display = "block";
      $("logo-vid-preview").style.display = "none";
      toast("✅ تم تحميل الشعار", "success");
    };
    img.onerror = () => toast("❌ فشل تحميل الصورة", "error");
    img.src = url;
  }
}

function removeLogo() {
  if (S.logoVid) { try { S.logoVid.pause(); } catch (_) {} S.logoVid = null; }
  S.logoImg = null;
  $("logo-preview").style.display = "none";
  $("logo-upload").value = "";
  toast("🗑️ تمت إزالة الشعار", "info");
}

function drawLogo(ctx, W, H) {
  const src = S.logoVid || S.logoImg;
  if (!src) return;

  const pos     = $("logo-pos").value;
  const size    = parseInt(gv("logo-size")) || 60;
  const opacity = (parseInt(gv("logo-opacity")) || 80) / 100;

  // تحقق من جاهزية الفيديو
  if (S.logoVid && S.logoVid.readyState < 2) return;

  const natW = src.naturalWidth  || src.videoWidth  || size;
  const natH = src.naturalHeight || src.videoHeight || size;

  let drawW = size;
  let drawH = natH / natW * size;
  if (drawH > size * 2.5) { drawH = size; drawW = natW / natH * size; }

  let x, y;
  const pad = 15;
  switch (pos) {
    case "br": x = W - drawW - pad; y = H - drawH - pad; break;
    case "bl": x = pad;             y = H - drawH - pad; break;
    case "tr": x = W - drawW - pad; y = pad;             break;
    case "tl": x = pad;             y = pad;             break;
    case "center": x = (W - drawW) / 2; y = (H - drawH) / 2; break;
    default:   x = W - drawW - pad; y = H - drawH - pad;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  // استخدم destination-out لحذف الخلفية في MOV إذا كانت قناة ألفا موجودة
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(src, x, y, drawW, drawH);
  ctx.restore();
}

// ══════════════════════════════════════════════════════
//  VERSE RENDERING
// ══════════════════════════════════════════════════════
function drawVerse(ctx, W, H, ts) {
  const aya = S.verses[S.currentAya]; if (!aya) return;
  const font = fontVal();
  const txtCol = $("txt-col").value;
  const shdCol = $("shd-col").value;
  const fsz = W * .062 * (gv("fsize") / 100);
  const lh = parseFloat(gv("lh"));
  const tpos = radioVal("tpos");
  const textEff = radioVal("te");
  const animType = radioVal("tanim");

  // Animation alpha
  let alpha = 1;
  if (animType !== "none") {
    const dur = S.ayaDurations[S.currentAya] || 6;
    const w = (S.elapsed % dur) / dur;
    if (w < .1) alpha = w / .1;
    else if (w > .88) alpha = (1 - w) / .12;
  }

  ctx.save();
  ctx.textAlign = "center"; ctx.direction = "rtl";
  ctx.globalAlpha = alpha;
  setTextFx(ctx, textEff, txtCol, shdCol);

  // Arabic text
  const lines = wrapText(ctx, aya.text, W * .85, fsz, font);
  const lineH = fsz * lh, totalH = lines.length * lineH;
  const hasT = S.translations[S.currentAya];
  let startY;
  if (tpos === "top") startY = H * .1 + fsz;
  else if (tpos === "bottom") startY = H * .82 - totalH + fsz;
  else startY = H * .5 - totalH * (hasT ? .4 : .5) + fsz;

  ctx.font = `${fsz}px ${font}`; ctx.fillStyle = txtCol;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, startY + i * lineH));

  // Translation
  if (hasT) {
    const tfsPct = gv("tfs") / 100;
    const tfs = W * .03 * tfsPct * 1.6;
    ctx.font = `${tfs}px 'Cairo',sans-serif`;
    ctx.fillStyle = $("trans-col").value;
    ctx.globalAlpha = alpha * .75;
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 8;
    const tLines = wrapText(ctx, hasT, W * .8, tfs, "Cairo");
    const tStart = startY + totalH + tfs * 1.2;
    tLines.forEach((tl, i) => ctx.fillText(tl, W / 2, tStart + i * tfs * 1.4));
  }

  // Aya number badge
  ctx.globalAlpha = alpha * .6;
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  ctx.font = `bold ${W * .022}px 'Cairo'`;
  ctx.fillStyle = $("orn-col").value;
  ctx.fillText(`❴ ${aya.numberInSurah} ❵`, W / 2, startY + totalH + (hasT ? 0 : W * .04));

  ctx.restore();
}

function setTextFx(ctx, eff, txtCol, shdCol) {
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  const [sr, sg, sb] = hex2rgb(shdCol);
  const fx = {
    none: () => { ctx.shadowColor = `rgba(${sr},${sg},${sb},.7)`; ctx.shadowBlur = 12; },
    glow: () => { ctx.shadowColor = "#f0c842"; ctx.shadowBlur = 28; },
    neon: () => { ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 22; },
    shadow3d: () => { ctx.shadowColor = `rgba(0,0,0,.85)`; ctx.shadowBlur = 0; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 5; },
    emboss: () => { ctx.shadowColor = "rgba(255,255,255,.25)"; ctx.shadowBlur = 0; ctx.shadowOffsetX = -2; ctx.shadowOffsetY = -2; },
    outline: () => { ctx.shadowColor = "rgba(0,0,0,.9)"; ctx.shadowBlur = 0; ctx.lineWidth = 2; /* strokeText done separately */ },
  };
  (fx[eff] || fx.none)();
}

function wrapText(ctx, text, maxW, fsz, font) {
  ctx.font = `${fsz}px ${font}`;
  const words = text.split(" ");
  const lines = []; let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ══════════════════════════════════════════════════════
//  WAVEFORM
// ══════════════════════════════════════════════════════
function getWaveData(ts) {
  if (S.analyser) {
    const full = new Uint8Array(S.analyser.frequencyBinCount); // 256 bins
    S.analyser.getByteFrequencyData(full);
    if (full.some(v => v > 15)) {
      // استخراج نطاق الصوت البشري فقط: 80Hz–3000Hz
      // كل bin ≈ sampleRate/fftSize ≈ 86Hz
      // bin 1 ≈ 86Hz  |  bin 35 ≈ 3010Hz
      const voiceStart = 1;
      const voiceEnd   = Math.min(35, full.length - 1);
      const voiceBins  = full.slice(voiceStart, voiceEnd + 1); // ~35 قيمة
      // تمديدها لـ 64 نقطة (حجم waveData المعروض)
      const out = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        const srcIdx = Math.floor(i / 64 * voiceBins.length);
        out[i] = voiceBins[srcIdx];
      }
      S.waveData = out;
      return;
    }
  }
  const n = 64;
  const data = new Uint8Array(n);
  const active = S.playing || (S.bgAudioEl && !S.bgAudioEl.paused);
  if (active) {
    // محاكاة نطاق الصوت البشري (80Hz–3kHz): أساسيات + هارمونيكس القراءة
    for (let i = 0; i < n; i++) {
      const f = i / n;
      // قمة واضحة في منتصف النطاق (الصوت البشري الأساسي ~300Hz–1kHz)
      const fund    = Math.exp(-Math.pow(f - 0.25, 2) / 0.018) * 0.90;
      const harm1   = Math.exp(-Math.pow(f - 0.48, 2) / 0.022) * 0.70;
      const harm2   = Math.exp(-Math.pow(f - 0.70, 2) / 0.025) * 0.45;
      const sublow  = f < 0.10 ? (1 - f / 0.10) * 0.55 : 0; // ديناميكية الصدر
      const envelope = fund + harm1 + harm2 + sublow;
      const pulse = 0.65 + 0.35 * Math.sin(ts * 4.2 + i * 0.4);
      const slow  = 0.55 + 0.45 * Math.sin(ts * 1.3 + i * 0.2 + 1.1);
      const noise = Math.random() * 0.05;
      const val = (pulse * 0.50 + slow * 0.40 + noise + 0.10) * envelope;
      data[i] = Math.min(255, Math.floor(val * 300));
    }
  }
  S.waveData = data;
}

function drawWave(ctx, W, H, ts) {
  if (!ge("wave-on")) return;
  getWaveData(ts);
  const shape = radioVal("ws");
  const col = $("wave-col").value;
  const pos = $("wave-pos").value;
  const wh = parseInt(gv("wave-h"));
  const n = S.waveData.length;
  const [cr, cg, cb] = hex2rgb(col);

  ctx.save();

  // ── قاعدة موحدة: كل الأشكال تنمو من الأسفل لأعلى ──
  // الخط الأساسي (baseline): أسفل = H-4 | أعلى = 4
  // كل bh تُطرح من الـbaseline لأعلى

  const BASE  = pos === "top" ? 4 + wh : H - 4;  // نقطة الانطلاق الثابتة
  const SIGN  = pos === "top" ? 1 : -1;           // +1 أسفل-لأعلى | -1 أعلى-لأسفل
  // SIGN=-1 لأن y في canvas تزيد للأسفل، فالنمو للأعلى = ناقص

  if (shape === "bars") {
    // ── أعمدة: قاعدة ثابتة، القمة تتحرك للأعلى ──────
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh    = (S.waveData[i] / 255) * wh;
      const alpha = 0.4 + 0.55 * (S.waveData[i] / 255);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      const yTop = BASE + SIGN * bh;   // قمة العمود
      ctx.fillRect(i * bw, yTop, bw * 0.78, bh);
    }

  } else if (shape === "wave") {
    // ── موجة: الخط الأساسي ثابت، الموجة ترتفع عنه ──
    ctx.lineWidth = 2.2; ctx.globalAlpha = 0.85;
    ctx.strokeStyle = col;
    // خط الأساس (شبه شفاف)
    ctx.globalAlpha = 0.18;
    ctx.beginPath(); ctx.moveTo(0, BASE); ctx.lineTo(W, BASE); ctx.stroke();
    // الموجة الفعلية
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const x  = i * (W / n);
      const y  = BASE + SIGN * bh;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // تعبئة المساحة بين الخط الأساسي والموجة
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = col;
    ctx.lineTo(W, BASE); ctx.lineTo(0, BASE); ctx.closePath(); ctx.fill();

  } else if (shape === "dots") {
    // ── نقاط: ترتفع من الخط الأساسي ──────────────────
    for (let i = 0; i < n; i += 2) {
      const bh = (S.waveData[i] / 255) * wh;
      const x  = i * (W / n) + (W / n);
      const y  = BASE + SIGN * bh;     // النقطة عند قمة الارتفاع
      const r  = 1.8 + (S.waveData[i] / 255) * 3.2;
      ctx.globalAlpha = 0.55 + 0.4 * (S.waveData[i] / 255);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      // ذيل خفيف للنقطة
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x - 1, Math.min(y, BASE), 2, bh);
    }

  } else if (shape === "mirror") {
    // ── مرآة: المنتصف ثابت، النصفان ينموان للخارج ──
    const cy = pos === "top" ? 4 + wh / 2 : H - 4 - wh / 2;
    const hw = wh / 2;
    ctx.lineWidth = 1.8;
    // نصف علوي (للأعلى)
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.9)`;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy - bh);
    }
    ctx.stroke();
    // نصف سفلي (للأسفل)
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.6)`;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy + bh);
    }
    ctx.stroke();
    // تعبئة بين النصفين
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, cy);
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy - bh);
    }
    for (let i = n - 1; i >= 0; i--) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy + bh);
    }
    ctx.closePath(); ctx.fill();

  } else if (shape === "circle") {
    // ── دائرة: تنبثق للخارج من المركز ────────────────
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.09;
    ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx   = i % n;
      const amp   = (S.waveData[idx] / 255) * wh * 0.5;
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = baseR + amp;
      i === 0 ? ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
              : ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.closePath();
    const gr = ctx.createRadialGradient(cx, cy, baseR * 0.4, cx, cy, baseR + wh * 0.55);
    gr.addColorStop(0, `rgba(${cr},${cg},${cb},0.25)`);
    gr.addColorStop(1, `rgba(${cr},${cg},${cb},0.9)`);
    ctx.strokeStyle = gr; ctx.stroke();
    ctx.globalAlpha = 0.06; ctx.fillStyle = col; ctx.fill();

  } else if (shape === "spectrum") {
    // ── طيف: أعمدة تنمو من الأسفل لأعلى + توهج ──────
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh    = (S.waveData[i] / 255) * wh;
      const hue   = (i / n) * 200 + 140;
      const alpha = 0.35 + 0.6 * (S.waveData[i] / 255);
      ctx.fillStyle = `hsla(${hue},80%,62%,${alpha})`;
      const yTop = BASE + SIGN * bh;
      ctx.fillRect(i * bw, yTop, bw * 0.82, bh);
      // خط توهج عند قمة كل عمود
      if (bh > 4) {
        ctx.fillStyle = `hsla(${hue},100%,90%,${alpha * 0.75})`;
        ctx.fillRect(i * bw, yTop, bw * 0.82, 2);
      }
    }
  }

  ctx.restore();
}

// ══════════════════════════════════════════════════════
//  WATERMARK
// ══════════════════════════════════════════════════════
function drawWatermark(ctx, W, H) {
  const text = $("wm-text").value.trim(); if (!text) return;
  const sz = parseInt(gv("wm-size")), pos = $("wm-pos").value, col = $("wm-col").value;
  ctx.save(); ctx.font = `bold ${sz}px 'Cairo'`; ctx.fillStyle = col; ctx.globalAlpha = .72;
  ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 6;
  const pad = sz + 8;
  const pm = { br: ["right", W - pad, H - pad], bl: ["left", pad, H - pad], tr: ["right", W - pad, pad + sz], tl: ["left", pad, pad + sz] };
  const [align, x, y] = pm[pos] || pm.br;
  ctx.textAlign = align; ctx.fillText(text, x, y);
  ctx.restore();
}

// ══════════════════════════════════════════════════════
//  AUDIO (معالجة CORS)
// ══════════════════════════════════════════════════════
function ensureAudioCtx() {
  if (!S.audioCtx || S.audioCtx.state === "closed") {
    S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    S.exportDest = S.audioCtx.createMediaStreamDestination();
    S.analyser = S.audioCtx.createAnalyser();
    S.analyser.fftSize = 512;
    S.analyser.smoothingTimeConstant = .82;
    // analyser → exportDest فقط (بدون destination لتجنب الصدى)
    S.analyser.connect(S.exportDest);
  }
  return S.audioCtx;
}

async function resumeAudioCtx() {
  const ctx = ensureAudioCtx();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

// عداد الجيل: كل استدعاء جديد يُبطل الاستدعاءات السابقة الجارية
let _recGen = 0;

async function playRecitationAudio() {
  if (S.exporting) return;            // التصدير يدير الصوت بنفسه
  stopRecitationAudio();
  if (!S.verses.length || !S.playing) return;
  const aya = S.verses[S.currentAya];
  if (!aya) return;

  const myGen = ++_recGen;            // رقم جيل هذا الاستدعاء
  const surahNum = parseInt($("surah-sel").value) || 1;
  const reciter = S.reciters.find(r => r.id === radioVal("reciter")) || S.reciters[0];
  const url = buildAudioUrl(reciter.folder, surahNum, aya.numberInSurah);
  $("audio-status").textContent = `⏳ جاري التحميل — ${reciter.name} الآية ${aya.numberInSurah}`;

  const onEnded = () => {
    if (!S.playing || myGen !== _recGen) return; // تجاهل إذا صدر استدعاء أحدث
    if (S.currentAya < S.verses.length - 1) {
      S.currentAya++; S.elapsed = 0; playRecitationAudio(); updateAyaUI();
    } else {
      pausePlayer(); S.currentAya = 0; S.elapsed = 0; updateAyaUI();
    }
  };

  // ── الطريقة الأساسية: fetch + AudioBuffer ──────────────
  // نُضيف { cache: 'force-cache' } لتجنب إعادة جلب نفس الملف
  try {
    const ctx = await resumeAudioCtx();
    if (myGen !== _recGen) return;    // تحقق بعد await

    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const arrayBuf = await res.arrayBuffer();
    if (myGen !== _recGen) return;    // تحقق بعد كل await

    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    if (myGen !== _recGen) return;

    S.ayaDurations[S.currentAya] = audioBuf.duration;

    const gainNode = ctx.createGain();
    gainNode.gain.value = gv("rec-vol") / 100;
    const source = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.connect(S.analyser);
    source.start(0);
    source.onended = onEnded;
    S.recAudioSource = source;
    S.recGainNode = gainNode;
    $("audio-status").textContent = `▶️ ${reciter.name} — الآية ${aya.numberInSurah}`;
  } catch (err) {
    if (myGen !== _recGen) return;
    // ── Fallback: HTMLAudioElement ──────────────────────
    console.warn("AudioBuffer fetch failed, using HTMLAudioElement:", err.message);
    const a = new Audio();
    a.crossOrigin = null;             // لا نُجبر CORS في الـfallback
    a.volume = gv("rec-vol") / 100;
    a.onloadedmetadata = () => {
      if (myGen === _recGen) S.ayaDurations[S.currentAya] = a.duration || 6;
    };
    a.onended = onEnded;
    a.onerror = () => {
      if (myGen !== _recGen) return;
      S.ayaDurations[S.currentAya] = parseFloat(gv("aya-dur")) || 6;
      $("audio-status").textContent = `❌ فشل التحميل — ${reciter.name} الآية ${aya.numberInSurah}`;
    };
    a.src = url;
    a.play().catch(() => {});
    S.recAudioEl = a;
    $("audio-status").textContent = `▶️ ${reciter.name} — الآية ${aya.numberInSurah}`;
  }
}

function stopRecitationAudio() {
  if (S.recAudioSource) {
    try { S.recAudioSource.onended = null; S.recAudioSource.stop(); } catch (e) { }
    S.recAudioSource = null;
  }
  if (S.recGainNode) {
    try { S.recGainNode.disconnect(); } catch (e) { }
    S.recGainNode = null;
  }
  if (S.recAudioEl) {
    S.recAudioEl.pause();
    S.recAudioEl.src = "";
    S.recAudioEl = null;
  }
}

function onBgAudio(input) {
  const file = input.files[0];
  if (!file) return;
  if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.src = ""; }
  const url = URL.createObjectURL(file);
  const a = new Audio(url);
  a.loop = ge("bg-loop");
  a.volume = gv("bg-vol") / 100;
  S.bgAudioEl = a;
  // ربط الصوت المحلي بـ AudioContext للتصدير (لا توجد مشكلة CORS لأنه من نفس المصدر)
  resumeAudioCtx().then(ctx => {
    try {
      const src = ctx.createMediaElementSource(a);
      src.connect(ctx.destination);
      src.connect(S.analyser);
      src.connect(S.exportDest);
      S.bgAudioSource = src;
    } catch (e) {
      console.warn("Could not connect background audio to context", e);
    }
  }).catch(console.warn);
  $("bg-audio-info").textContent = `✅ ${file.name} (${(file.size / 1e6).toFixed(1)}MB)`;
  toast("🎵 تم تحميل صوت الخلفية", "success");
}

function updateVolumes() {
  if (S.recGainNode) S.recGainNode.gain.value = gv("rec-vol") / 100;
  if (S.recAudioEl) S.recAudioEl.volume = gv("rec-vol") / 100;
  if (S.bgAudioEl) S.bgAudioEl.volume = gv("bg-vol") / 100;
}

// ══════════════════════════════════════════════════════
//  MEDIA BACKGROUNDS
// ══════════════════════════════════════════════════════
function onBgMedia(input, type) {
  const file = input.files[0]; if (!file) return;
  const url = URL.createObjectURL(file);
  if (type === "image") {
    const img = new Image();
    img.onload = () => { S.bgImg = img; toast("🖼️ تم تحميل الصورة", "success"); };
    img.onerror = () => toast("❌ فشل تحميل الصورة", "error");
    img.src = url;
    const thumb = $("bg-img-thumb");
    $("bg-img-preview").src = url;
    thumb.style.display = "block";
  } else {
    const vid = document.createElement("video");
    vid.src = url; vid.loop = true; vid.muted = true; vid.playsInline = true;
    vid.onloadeddata = () => {
      S.bgVid = vid;
      vid.play().catch(() => { });
      toast("🎥 تم تحميل الفيديو", "success");
    };
    vid.onerror = () => toast("❌ فشل تحميل الفيديو", "error");
    const thumb = $("bg-vid-thumb");
    $("bg-vid-preview").src = url;
    $("bg-vid-info").textContent = `${file.name} (${(file.size / 1e6).toFixed(1)}MB)`;
    thumb.style.display = "block";
    $("bg-vid-preview").src = url;
  }
}

function onBgTypeChange() {
  const v = radioVal("bgt");
  $("bg-grad-ctrl").style.display = v === "gradient" ? "block" : "none";
  $("bg-img-ctrl").style.display = v === "image" ? "block" : "none";
  $("bg-vid-ctrl").style.display = v === "video" ? "block" : "none";
}

// ══════════════════════════════════════════════════════
//  PLAY / PAUSE
// ══════════════════════════════════════════════════════
function togglePlay() {
  if (S.playing) pausePlayer(); else startPlayer();
}

function startPlayer() {
  if (!S.verses.length) { toast("⚠️ لا توجد آيات مُحمَّلة", "error"); return; }
  S.playing = true;
  $("btn-play").textContent = "⏸️";
  // تنشيط AudioContext إذا كان متوقفاً (لصوت الخلفية)
  resumeAudioCtx().catch(console.warn);
  if (S.bgAudioEl) { S.bgAudioEl.loop = ge("bg-loop"); S.bgAudioEl.play().catch(() => { }); }
  playRecitationAudio();
}

function pausePlayer() {
  S.playing = false;
  $("btn-play").textContent = "▶️";
  stopRecitationAudio();
  if (S.bgAudioEl) S.bgAudioEl.pause();
}

function prevAya() { if (S.currentAya > 0) { S.currentAya--; S.elapsed = 0; updateAyaUI(); if (S.playing) playRecitationAudio(); } }
function nextAya() { if (S.currentAya < S.verses.length - 1) { S.currentAya++; S.elapsed = 0; updateAyaUI(); if (S.playing) playRecitationAudio(); } }

function seekClick(e) {
  const bar = $("pbar"), ratio = e.offsetX / bar.offsetWidth;
  const total = S.verses.length * (S.ayaDurations[0] || 6);
  let acc = 0;
  for (let i = 0; i < S.verses.length; i++) {
    const d = S.ayaDurations[i] || 6;
    if (acc + d >= ratio * total) { S.currentAya = i; S.elapsed = (ratio * total - acc); break; }
    acc += d;
  }
  updateAyaUI();
  if (S.playing) playRecitationAudio();
}

function updateProgressUI() {
  const totalDur = S.verses.length * (S.ayaDurations[0] || 6) || 1;
  const passed = S.ayaDurations.slice(0, S.currentAya).reduce((a, b) => a + b, 0) + S.elapsed;
  const pct = Math.min(100, (passed / totalDur) * 100);
  $("pfill").style.width = pct + "%";
  $("ptime").textContent = `${fmt(passed)} / ${fmt(totalDur)}`;
}

function updateAyaUI() {
  $("aya-ind").textContent = `الآية ${S.currentAya + 1}/${S.verses.length}`;
}
function fmt(s) { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`; }

// ══════════════════════════════════════════════════════
//  EXPORT — مدة دقيقة عبر جدولة الصوت مسبقاً + تخطي الإطارات
// ══════════════════════════════════════════════════════
async function startExport(type) {
  if (!S.verses.length) { toast("⚠️ لا توجد آيات", "error"); return; }

  S.exportCancel = false;
  S.exportChunks = [];
  S.exporting = true;           // ← يوقف checkAyaAdvance وplayRecitationAudio العادي
  stopRecitationAudio();        // ← أوقف أي صوت عادي جارٍ
  if (S.bgAudioEl) S.bgAudioEl.pause();

  $("rec-ov").classList.add("on");
  $("rec-fill").style.width = "0%";
  $("rec-pct").textContent = "0%";
  $("rec-sub").textContent = "⏳ جاري تحميل الصوتيات…";

  // ── 1. تجهيز AudioContext ──────────────────────────
  const ctx = await resumeAudioCtx();
  const manualDur = parseFloat(gv("aya-dur")) || 6;
  const getDur  = (i) => (S.ayaDurations[i] && S.ayaDurations[i] > 0.5) ? S.ayaDurations[i] : manualDur;

  // ── 2. تحميل AudioBuffers لجميع الآيات ────────────
  const surahNum = parseInt($("surah-sel").value) || 1;
  const reciter  = S.reciters.find(r => r.id === radioVal("reciter")) || S.reciters[0];
  const gainVal  = gv("rec-vol") / 100;
  let loaded = 0;

  const audioBuffers = await Promise.all(S.verses.map(async (aya, i) => {
    const url = buildAudioUrl(reciter.folder, surahNum, aya.numberInSurah);
    try {
      // محاولة أولى: fetch مع cache للسرعة
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const ab  = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      loaded++;
      $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length}`;
      return buf;
    } catch (e1) {
      // محاولة ثانية: fetch بدون cache (قد يحل بعض مشاكل CORS)
      try {
        const res2 = await fetch(url, { cache: "no-store", mode: "cors" });
        if (!res2.ok) throw new Error("HTTP " + res2.status);
        const ab2  = await res2.arrayBuffer();
        const buf2 = await ctx.decodeAudioData(ab2);
        loaded++;
        $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length}`;
        return buf2;
      } catch (e2) {
        // محاولة ثالثة: HTMLAudioElement → MediaElementSource
        // هذه تعمل دائماً حتى بدون CORS لكن لا تُعيد AudioBuffer
        // نستخدمها فقط للحصول على المدة ونضع null للـ buffer
        try {
          const dur = await new Promise((res, rej) => {
            const a = new Audio();
            a.crossOrigin = "anonymous";
            a.onloadedmetadata = () => res(a.duration);
            a.onerror = () => {
              // جرب بدون crossOrigin كملاذ أخير
              const a2 = new Audio(url);
              a2.onloadedmetadata = () => res(a2.duration);
              a2.onerror = () => rej(new Error("audio load failed"));
              a2.load();
            };
            a.src = url;
            a.load();
            setTimeout(() => rej(new Error("timeout")), 8000);
          });
          if (dur > 0) S.ayaDurations[i] = dur;
        } catch (_) {}
        loaded++;
        $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length} ⚠️`;
        return null;
      }
    }
  }));

  // تحقق: هل نجح تحميل أي buffer؟
  const loadedCount = audioBuffers.filter(b => b !== null).length;
  if (loadedCount === 0) {
    // جميع الملفات فشلت CORS — استخدم HTMLAudioElement للتصدير
    toast("⚠️ تعذر جلب الصوت عبر fetch — سيتم التصدير بالصوت الأساسي", "info");
    // استمر بدون صوت مجدول (MediaRecorder يلتقط ما يصله من AudioContext)
  }

  if (S.exportCancel) { $("rec-ov").classList.remove("on"); return; }

  // ── 3. تحديث مدد الآيات من الـ AudioBuffers ───────
  audioBuffers.forEach((buf, i) => { if (buf) S.ayaDurations[i] = buf.duration; });

  // بناء جدول دقيق لبداية كل آية
  const ayaStarts = [];
  let acc = 0;
  for (let i = 0; i < S.verses.length; i++) {
    ayaStarts.push(acc);
    acc += getDur(i);
  }
  const totalDuration = acc;
  const FPS           = parseInt(gv("export-fps") || "30") || 30;
  const FRAME_MS      = 1000 / FPS;
  const totalFrames   = Math.ceil(totalDuration * FPS);

  // ── 4. إعداد MediaRecorder ─────────────────────────
  const cv      = $("cv");
  const stream  = cv.captureStream(FPS);
  const tracks  = [...stream.getTracks()];
  if (S.exportDest && S.exportDest.stream.getAudioTracks().length)
    tracks.push(...S.exportDest.stream.getAudioTracks());

  const mime4  = 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"';
  const mime_w = "video/webm;codecs=vp9,opus";
  const mimeT  = type === "mp4" ? mime4 : mime_w;
  const mime   = MediaRecorder.isTypeSupported(mimeT) ? mimeT : "video/webm";

  const vbrMbps = parseInt(gv("export-vbr") || "8") || 8;
  const mr = new MediaRecorder(new MediaStream(tracks), {
    mimeType: mime, videoBitsPerSecond: vbrMbps * 1_000_000, audioBitsPerSecond: 128_000
  });
  S.mediaRecorder = mr;
  mr.ondataavailable = e => { if (e.data.size > 0) S.exportChunks.push(e.data); };
  mr.onstop = () => {
    stopExportSources(); // أوقف الصوت فوراً عند الإيقاف (إلغاء أو اكتمال)
    if (S.exportCancel) { $("rec-ov").classList.remove("on"); return; }
    const blob = new Blob(S.exportChunks, { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `GT-SQR_${Date.now()}.${type === "mp4" ? "mp4" : "webm"}`;
    a.click();
    $("rec-ov").classList.remove("on");
    toast("✅ تم التصدير بنجاح!", "success");
  };

  // ── 5. جدولة الصوت مسبقاً (مستقل عن سرعة الرسم) ─
  mr.start(100);

  await new Promise(r => setTimeout(r, 150));
  if (S.exportCancel) { mr.stop(); return; }

  const audioStartTime = ctx.currentTime + 0.05;
  S.exportSources = [];

  const hasBuffers = audioBuffers.some(b => b !== null);

  if (hasBuffers) {
    // ── المسار الأفضل: AudioBuffers مجدولة مسبقاً ──────
    audioBuffers.forEach((buf, i) => {
      if (!buf) return;
      const gain = ctx.createGain();
      gain.gain.value = gainVal;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      gain.connect(ctx.destination);
      gain.connect(S.analyser);
      src.start(audioStartTime + ayaStarts[i]);
      S.exportSources.push({ src, gain });
    });
  } else {
    // ── المسار البديل: تشغيل تسلسلي بـ HTMLAudioElement ──
    // يُستخدم عندما تفشل fetch (CORS محدود)
    // نشغل الآية الأولى الآن، والبقية يُشغَّلن عبر onEnded
    console.warn("Export: using HTMLAudioElement fallback (fetch CORS failed)");
    $("rec-sub").textContent = "⚠️ وضع الصوت البديل (CORS) — الجودة ستنخفض قليلاً";

    const playExportAya = (idx) => {
      if (idx >= S.verses.length || S.exportCancel) return;
      const aya2 = S.verses[idx];
      const url2 = buildAudioUrl(reciter.folder, surahNum, aya2.numberInSurah);
      const a2 = new Audio(url2);
      a2.volume = gainVal;
      // توصيل HTMLAudioElement بـ AudioContext للتسجيل
      try {
        const msrc = ctx.createMediaElementSource(a2);
        const gain2 = ctx.createGain();
        gain2.gain.value = gainVal;
        msrc.connect(gain2);
        gain2.connect(ctx.destination);
        gain2.connect(S.analyser);
        S.exportSources.push({ src: { stop: () => { try{a2.pause();}catch(_){} }, onended: null }, gain: gain2 });
      } catch (_) {}
      a2.onended = () => playExportAya(idx + 1);
      a2.play().catch(() => {});
    };
    // ابدأ بعد 50ms لضمان جاهزية MediaRecorder
    setTimeout(() => playExportAya(0), 50);
  }

  // صوت الخلفية (من البداية)
  if (S.bgAudioEl) { S.bgAudioEl.currentTime = 0; S.bgAudioEl.play().catch(() => {}); }

  // ── 6. حلقة الرسم — AudioContext كساعة رئيسية ────────
  //
  // المبدأ الذهبي:
  //   ctx.currentTime يتقدم دائماً (حتى في خلفية التبويب)
  //   نحسب وقت المشروع = ctx.currentTime - audioStartTime
  //   ونرسم الإطار المناسب لكل لحظة حقيقية
  //   MediaRecorder يسجل الوقت الحقيقي تلقائياً → المدة صحيحة دائماً
  //
  const savedAya     = S.currentAya;
  const savedElapsed = S.elapsed;
  const savedPlaying = S.playing;
  S.playing = true;

  const getAyaAt = (t) => {
    let idx = S.verses.length - 1;
    for (let i = 0; i < S.verses.length; i++) {
      if (t < ayaStarts[i] + getDur(i)) { idx = i; break; }
    }
    return idx;
  };

  let exportTimer     = null;
  let lastDrawnFrame  = -1;   // آخر إطار رُسم — نتجنب إعادة رسم نفس الإطار
  let exportDone      = false;

  const doExportFrame = () => {
    if (S.exportCancel || exportDone) return;

    // ── الوقت الحقيقي للمشروع من ساعة AudioContext ──
    const projectTime = ctx.currentTime - audioStartTime;

    if (projectTime >= totalDuration) {
      // اكتملت الآيات — أوقف الخلفية فوراً
      exportDone = true;
      if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; }
      // أعطِ 200ms لـ MediaRecorder يفرغ البيانات الأخيرة ثم أوقف
      setTimeout(() => { mr.stop(); restoreExportState(); }, 200);
      return;
    }

    // ── ارسم الإطار المناسب للوقت الحالي ──
    const targetFrame = Math.floor(projectTime * FPS);

    if (targetFrame > lastDrawnFrame) {
      const t  = targetFrame / FPS;
      const ci = getAyaAt(Math.min(t, totalDuration - 0.001));
      S.currentAya = ci;
      S.elapsed    = Math.max(0, t - ayaStarts[ci]);
      drawFrame(t);
      lastDrawnFrame = targetFrame;

      // ── تحديث واجهة التقدم ──
      const pct = Math.min(99, Math.round((projectTime / totalDuration) * 100));
      $("rec-fill").style.width = pct + "%";
      $("rec-pct").textContent  = pct + "%";
      $("rec-sub").textContent  =
        `🎬 ${targetFrame}/${totalFrames} — الآية ${ci + 1}/${S.verses.length} — ${fmt(projectTime)} / ${fmt(totalDuration)}`;
      updateAyaUI();
    }

    // ── جدول الدورة القادمة ──
    // نستخدم setTimeout(fn,1000/FPS) كـ fallback للخلفية
    // ونضيف rAF عند العودة للتبويب لاستئناف التحديث البصري
    const msToNextFrame = Math.max(4, FRAME_MS - ((projectTime * 1000) % FRAME_MS));
    exportTimer = setTimeout(doExportFrame, msToNextFrame);
  };

  // استئناف فوري عند العودة للتبويب (visibility change)
  const onVisChange = () => {
    if (!document.hidden && !exportDone && !S.exportCancel) {
      if (exportTimer) { clearTimeout(exportTimer); exportTimer = null; }
      doExportFrame();
    }
  };
  document.addEventListener("visibilitychange", onVisChange);

  // ابدأ
  exportTimer = setTimeout(doExportFrame, 0);

  function restoreExportState() {
    exportDone = true;
    if (exportTimer !== null) { clearTimeout(exportTimer); exportTimer = null; }
    document.removeEventListener("visibilitychange", onVisChange);
    S.exporting    = false;
    S.playing      = savedPlaying;
    S.currentAya   = savedAya;
    S.elapsed      = savedElapsed;
    $("rec-ov").classList.remove("on");
    updateAyaUI();
  }
}

// ── دالة مساعدة لإيقاف جميع مصادر صوت التصدير فوراً ──
function stopExportSources() {
  S.exportSources.forEach(s => {
    try { s.src.onended = null; s.src.stop(0); } catch (_) {}
    try { s.gain.disconnect(); } catch (_) {}
  });
  S.exportSources = [];
}

function cancelExport() {
  S.exportCancel = true;
  S.exporting    = false;
  // أوقف الصوت المجدول فوراً
  stopExportSources();
  stopRecitationAudio();
  if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; }
  // أوقف MediaRecorder — سيستدعي onstop تلقائياً
  if (S.mediaRecorder && S.mediaRecorder.state !== "inactive") {
    try { S.mediaRecorder.stop(); } catch (_) {}
  }
  $("rec-ov").classList.remove("on");
  toast("تم إلغاء التصدير", "info");
}

// ══════════════════════════════════════════════════════
//  QURAN DATA
// ══════════════════════════════════════════════════════
async function loadSurahList() {
  const sel = $("surah-sel");
  sel.innerHTML = `<option>⏳ جاري التحميل…</option>`;
  try {
    let surahs = JSON.parse(sessionStorage.getItem("gt_surahs") || "null");
    if (!surahs) {
      const r = await fetch(`${QURAN_API}/surah`);
      const d = await r.json();
      surahs = d.data;
      sessionStorage.setItem("gt_surahs", JSON.stringify(surahs));
    }
    S.surahs = surahs;
    sel.innerHTML = surahs.map(s => `<option value="${s.number}">${s.number}. ${s.name} — ${s.englishName}</option>`).join("");
    await loadVerses();
  } catch (e) {
    sel.innerHTML = `<option value="1">1. سورة الفاتحة</option>`;
    loadOfflineFallback();
  }
}

function loadOfflineFallback() {
  S.verses = [
    { numberInSurah: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
    { numberInSurah: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
    { numberInSurah: 3, text: "الرَّحْمَٰنِ الرَّحِيمِ" },
    { numberInSurah: 4, text: "مَالِكِ يَوْمِ الدِّينِ" },
    { numberInSurah: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
    { numberInSurah: 6, text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ" },
    { numberInSurah: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" },
  ];
  $("aya-info").textContent = "⚠️ وضع غير متصل — سورة الفاتحة";
  updateAyaUI();
}

function onSurahChange() { loadVerses(); }
async function loadVerses() {
  const surahNum = parseInt($("surah-sel").value) || 1;
  const from = parseInt($("from-aya").value) || 1;
  const to = parseInt($("to-aya").value) || 7;
  const surah = S.surahs.find(s => s.number === surahNum);
  if (surah) { const max = surah.numberOfAyahs; if (to > max) $("to-aya").value = max; }
  $("aya-info").textContent = "⏳ جاري تحميل الآيات…";
  try {
    const ck = `gt_v_${surahNum}_${from}_${to}`;
    let verses = JSON.parse(sessionStorage.getItem(ck) || "null");
    if (!verses) {
      const r = await fetch(`${QURAN_API}/surah/${surahNum}/quran-uthmani`);
      const d = await r.json();
      verses = d.data.ayahs.filter(a => a.numberInSurah >= from && a.numberInSurah <= to);
      sessionStorage.setItem(ck, JSON.stringify(verses));
    }
    S.verses = verses; S.currentAya = 0; S.elapsed = 0; S.ayaDurations = [];
    $("aya-info").textContent = `✅ ${verses.length} آية من سورة ${surah?.name || ""}`;
    updateAyaUI();
    await loadTranslations();
  } catch (e) {
    $("aya-info").textContent = "⚠️ فشل التحميل"; if (!S.verses.length) loadOfflineFallback();
  }
}

function onTransChange() {
  const v = $("trans-sel").value;
  $("trans-opts").style.display = v === "none" ? "none" : "block";
  loadTranslations();
}
async function loadTranslations() {
  const edition = $("trans-sel").value; if (edition === "none") { S.translations = []; return; }
  const surahNum = parseInt($("surah-sel").value) || 1;
  const from = parseInt($("from-aya").value) || 1;
  const to = parseInt($("to-aya").value) || 7;
  try {
    const ck = `gt_t_${surahNum}_${from}_${to}_${edition}`;
    let trans = JSON.parse(sessionStorage.getItem(ck) || "null");
    if (!trans) {
      const r = await fetch(`${QURAN_API}/surah/${surahNum}/${edition}`);
      const d = await r.json();
      trans = d.data.ayahs.filter(a => a.numberInSurah >= from && a.numberInSurah <= to).map(a => a.text);
      sessionStorage.setItem(ck, JSON.stringify(trans));
    }
    S.translations = trans;
  } catch (e) { S.translations = []; }
}

// ══════════════════════════════════════════════════════
//  FONTS (مع إصلاح المسافات باستخدام encodeURI)
// ══════════════════════════════════════════════════════
function renderFontGrid() {
  const grid = $("font-grid"); grid.innerHTML = "";
  S.allFonts.forEach((f, i) => {
    const div = document.createElement("div"); div.className = "font-card";
    div.innerHTML = `<input type="radio" name="font" id="fn${i}" value="${f.css}" ${i === 0 ? "checked" : ""}>
    <label for="fn${i}"><span class="fs" style="font-family:${f.css}">${f.sample || "بِسْمِ اللَّهِ"}</span><span class="fn">${f.name}</span></label>`;
    grid.appendChild(div);
  });
}

async function loadLocalFonts(showToast = false) {
  try {
    const r = await fetch("./fonts/fonts.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const list = await r.json();
    if (!Array.isArray(list)) return;
    let added = 0;
    for (const item of list) {
      if (!item.name || !item.file) continue;
      if (S.allFonts.find(x => x.name === item.name)) continue;
      try {
        // نُرمِّز مرة واحدة بعد فك أي ترميز سابق لتجنب %2520
        let rawFile = item.file;
        try { rawFile = decodeURIComponent(rawFile); } catch(_) {}
        // encodeURIComponent يُرمّز المسافات كـ %20 — صحيح لمكونات URL
        const fontUrl = `./fonts/${rawFile.split('/').map(encodeURIComponent).join('/')}`;
        const face = new FontFace(item.name, `url(${fontUrl})`);
        await face.load();
        document.fonts.add(face);
        S.allFonts.push({
          id: "local_" + item.name,
          name: item.name,
          css: `'${item.name}'`,
          sample: item.sample || "بِسْمِ اللَّهِ"
        });
        added++;
      } catch (e) {
        console.warn("Font load failed:", item.name, e);
      }
    }
    renderFontGrid();
    if (showToast) toast(added > 0 ? `✅ تم تحميل ${added} خطوط محلية` : "لا توجد خطوط جديدة في fonts/", "info");
  } catch (e) {
    console.warn("fonts.json error:", e);
    if (showToast) toast("📁 تأكد من وجود ملف fonts/fonts.json", "info");
  }
}

function loadCustomFonts(input) {
  Array.from(input.files).forEach(file => {
    const name = file.name.replace(/\.[^.]+$/, "");
    const reader = new FileReader();
    reader.onload = e => {
      const face = new FontFace(name, e.target.result);
      face.load().then(ff => {
        document.fonts.add(ff);
        if (!S.allFonts.find(x => x.name === name)) {
          S.allFonts.push({ id: "custom_" + name, name, css: `'${name}'`, sample: "بِسْمِ اللَّهِ" });
          renderFontGrid();
        }
        toast(`✅ خط: ${name}`, "success");
      }).catch(() => toast(`❌ فشل: ${file.name}`, "error"));
    };
    reader.readAsArrayBuffer(file);
  });
}

// ══════════════════════════════════════════════════════
//  RECITERS (جميع القراء قابلة للتعديل والحذف)
// ══════════════════════════════════════════════════════
function renderReciters() {
  const grid = $("reciters-grid");
  grid.innerHTML = "";
  S.reciters.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "rctr-card";
    div.innerHTML = `
      <input type="radio" name="reciter" id="rc${i}" value="${r.id}" ${i === 0 ? "checked" : ""}>
      <label for="rc${i}">
        <span class="rf">${r.flag}</span>${r.name}
        <span class="edit-reciter" data-id="${r.id}" data-name="${r.name}" data-flag="${r.flag}" data-folder="${r.folder}">✏️</span>
        <span class="del-reciter" data-id="${r.id}">🗑️</span>
      </label>
    `;
    grid.appendChild(div);
  });
  document.querySelectorAll(".del-reciter").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      deleteReciter(btn.dataset.id);
    });
  });
  document.querySelectorAll(".edit-reciter").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      openEditReciterForm(btn.dataset);
    });
  });
}

function deleteReciter(id) {
  if (S.reciters.length <= 1) {
    toast("⚠️ لا يمكن حذف آخر قارئ", "error");
    return;
  }
  S.reciters = S.reciters.filter(r => r.id !== id);
  renderReciters();
  toast("🗑️ تم حذف القارئ", "info");
}

function openEditReciterForm(data) {
  $("ar-name").value = data.name;
  const flagSelect = $("ar-flag");
  for (let opt of flagSelect.options) if (opt.value === data.flag) { opt.selected = true; break; }
  $("ar-folder").value = data.folder;
  $("add-reciter-form").classList.add("on");
  $("add-reciter-form").dataset.editId = data.id;
}

function addCustomReciter() {
  const name = $("ar-name").value.trim();
  const flag = $("ar-flag").value;
  const folder = $("ar-folder").value.trim();
  if (!name || !folder) { toast("⚠️ أدخل الاسم والمجلد", "error"); return; }
  const editId = $("add-reciter-form").dataset.editId;
  if (editId) {
    const index = S.reciters.findIndex(r => r.id === editId);
    if (index !== -1) S.reciters[index] = { ...S.reciters[index], name, flag, folder };
    delete $("add-reciter-form").dataset.editId;
    toast(`✅ تم تحديث: ${name}`, "success");
  } else {
    const id = "custom_" + Date.now();
    S.reciters.push({ id, name, flag, folder });
    toast(`✅ تمت إضافة: ${name}`, "success");
  }
  renderReciters();
  $("add-reciter-form").classList.remove("on");
  $("ar-name").value = ""; $("ar-folder").value = "";
}

function toggleAddReciter() {
  const f = $("add-reciter-form");
  f.classList.toggle("on");
  if (f.classList.contains("on")) {
    delete f.dataset.editId;
    $("ar-name").value = ""; $("ar-folder").value = "";
  }
}

// ══════════════════════════════════════════════════════
//  THEMES
// ══════════════════════════════════════════════════════
const THEME_LABELS = { emerald: "💚 زمرد", gold: "👑 ذهبي", night: "🌌 ليلي", rose: "🌸 وردي", ocean: "🌊 محيط", desert: "🏜️ صحراء", purple: "🔮 بنفسجي", dark: "⚫ أسود" };

function initThemeChips() {
  const wrap = $("theme-chips");
  Object.keys(THEMES).forEach((k, i) => {
    const d = document.createElement("div"); d.className = "tc-chip" + (i === 0 ? " on" : ""); d.dataset.t = k;
    d.textContent = THEME_LABELS[k] || k;
    d.onclick = () => applyTheme(d, k);
    wrap.appendChild(d);
  });
}

function applyTheme(el, key) {
  document.querySelectorAll(".tc-chip").forEach(c => c.classList.remove("on")); el.classList.add("on");
  const t = THEMES[key];
  setCol("gc1", t.gc1); setCol("gc2", t.gc2);
  setCol("txt-col", t.tc); setCol("orn-col", t.oc);
  if ($("gc1t")) $("gc1t").value = t.gc1;
  if ($("gc2t")) $("gc2t").value = t.gc2;
}

// ══════════════════════════════════════════════════════
//  TEMPLATES
// ══════════════════════════════════════════════════════
function openModal(id) { $(id).classList.add("on"); }
function closeModal(id) { $(id).classList.remove("on"); }

function confirmSaveTemplate() {
  const name = $("tpl-name-inp").value.trim() || "قالب " + new Date().toLocaleDateString("ar");
  S.templates.push({ name, date: new Date().toLocaleDateString("ar-SA"), state: captureState() });
  persistTemplates(); renderTemplates();
  closeModal("tpl-modal"); $("tpl-name-inp").value = "";
  toast(`✅ تم حفظ: ${name}`, "success");
}

function captureState() {
  return {
    surah: $("surah-sel").value, from: $("from-aya").value, to: $("to-aya").value,
    reciter: radioVal("reciter"), fmt: radioVal("fmt"),
    gc1: $("gc1").value, gc2: $("gc2").value,
    font: radioVal("font"), txtCol: $("txt-col").value,
    wm: $("wm-text").value, orn: radioVal("orn"),
    fxVig: ge("fx-vig"), fxGold: ge("fx-gold"), fxStars: ge("fx-stars"),
    theme: document.querySelector(".tc-chip.on")?.dataset?.t || "emerald",
  };
}

function applyState(st) {
  setV("surah-sel", st.surah); setV("from-aya", st.from); setV("to-aya", st.to);
  setR("reciter", st.reciter); setR("fmt", st.fmt); setR("orn", st.orn);
  setCol("gc1", st.gc1); setCol("gc2", st.gc2);
  if ($("gc1t")) $("gc1t").value = st.gc1 || ""; if ($("gc2t")) $("gc2t").value = st.gc2 || "";
  setCol("txt-col", st.txtCol);
  if ($("wm-text")) $("wm-text").value = st.wm || "";
  if (st.fxVig) ge_el("fx-vig").checked = true;
  if (st.fxGold) ge_el("fx-gold").checked = true;
  if (st.fxStars) ge_el("fx-stars").checked = true;
  document.querySelectorAll(".tc-chip").forEach(c => c.classList.toggle("on", c.dataset.t === st.theme));
  loadVerses(); onFmtChange();
}

function renderTemplates() {
  const grid = $("tpl-grid"), emp = $("tpl-empty");
  if (!S.templates.length) { grid.innerHTML = ""; emp.style.display = "block"; return; }
  emp.style.display = "none";
  grid.innerHTML = S.templates.map((t, i) => `
  <div class="tpl-card">
  <div class="tpl-name">📁 ${t.name}</div>
  <div class="tpl-date">${t.date}</div>
  <div class="tpl-actions">
  <button class="btn btn-p bsm" onclick="applyState(S.templates[${i}].state);goTab('rec')">✅ تطبيق</button>
  <button class="btn btn-d bsm" onclick="delTemplate(${i})">🗑️</button>
  </div>
  </div>`).join("");
}

function delTemplate(i) { S.templates.splice(i, 1); persistTemplates(); renderTemplates(); toast("🗑️ تم الحذف", "info"); }
function loadTemplates() { try { S.templates = JSON.parse(localStorage.getItem("gt_sqr_tpls") || "[]"); } catch (e) { S.templates = []; } renderTemplates(); }
function persistTemplates() { try { localStorage.setItem("gt_sqr_tpls", JSON.stringify(S.templates)); } catch (e) { } }

// ══════════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════════
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      goTab(btn.dataset.tab);
      // على المحمول: افتح الـpanel عند النقر على تبويب
      if (window.innerWidth <= 760) openMobilePanel();
    });
  });
}
function goTab(name) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("on", b.dataset.tab === name));
  document.querySelectorAll(".tp").forEach(p => p.classList.toggle("on", p.id === "tab-" + name));
}

// ── MOBILE PANEL ────────────────────────────────────
let _mobLayout = localStorage.getItem("mob_layout") || "vert";
let _panelSize = parseInt(localStorage.getItem("panel_size") || "62");

function initMobileLayout() {
  if (window.innerWidth > 760) return;
  setMobLayout(_mobLayout, false);
  applyPanelSize(_panelSize);
  const sl = $("panel-size-slider");
  const lb = $("panel-size-lbl");
  if (sl) sl.value = _panelSize;
  if (lb) lb.textContent = _panelSize + "٪";
}

function setMobLayout(mode, save = true) {
  _mobLayout = mode;
  if (save) localStorage.setItem("mob_layout", mode);
  document.body.classList.remove("mob-horiz");
  ["lay-vert","lay-horiz","lay-full"].forEach(id => {
    const btn = $(id); if (btn) btn.classList.remove("on");
  });
  if (mode === "horiz") {
    document.body.classList.add("mob-horiz");
    const btn = $("lay-horiz"); if (btn) btn.classList.add("on");
  } else if (mode === "full") {
    applyPanelSize(90);
    const btn = $("lay-full"); if (btn) btn.classList.add("on");
    openMobilePanel();
    return;
  } else {
    const btn = $("lay-vert"); if (btn) btn.classList.add("on");
  }
  applyPanelSize(_panelSize);
}

function applyPanelSize(pct) {
  const isHoriz = document.body.classList.contains("mob-horiz");
  if (isHoriz) {
    document.documentElement.style.setProperty("--panel-w", pct + "vw");
  } else {
    document.documentElement.style.setProperty("--panel-h", pct + "vh");
  }
}

function onPanelSizeChange(val) {
  _panelSize = parseInt(val);
  localStorage.setItem("panel_size", _panelSize);
  const lb = $("panel-size-lbl");
  if (lb) lb.textContent = _panelSize + "٪";
  applyPanelSize(_panelSize);
}

function toggleMobilePanel() {
  const panel = $("panel");
  if (panel.classList.contains("mob-open")) closeMobilePanel();
  else openMobilePanel();
}
function openMobilePanel() {
  $("panel").classList.add("mob-open");
  $("mob-backdrop").classList.add("on");
  const t = $("mob-toggle");
  if (t) { t.textContent = "✕ إغلاق"; t.classList.add("active"); }
}
function closeMobilePanel() {
  $("panel").classList.remove("mob-open");
  $("mob-backdrop").classList.remove("on");
  const t = $("mob-toggle");
  if (t) { t.textContent = "🛠 الأدوات"; t.classList.remove("active"); }
}

// ── سحب لإغلاق الـ Panel ──────────────────────────
function initPanelSwipe(e) {
  const startY = e.touches[0].clientY;
  const panel  = $("panel");
  let   diff   = 0;
  const onMove = ev => {
    diff = ev.touches[0].clientY - startY;
    if (diff > 0) panel.style.transform = `translateY(${diff}px)`;
  };
  const onEnd = () => {
    panel.style.transform = "";
    if (diff > 70) closeMobilePanel();
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend",  onEnd);
  };
  document.addEventListener("touchmove", onMove, { passive: true });
  document.addEventListener("touchend",  onEnd);
}

// ── SETTINGS FUNCTIONS ───────────────────────────────
function resetAllSettings() {
  if (!confirm("⚠️ سيتم إعادة جميع الإعدادات للافتراضي — هل تريد المتابعة؟")) return;
  localStorage.clear();
  location.reload();
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function $(id) { return document.getElementById(id); }
function ge(id) { const e = $(id); return e && e.checked; }
function ge_el(id) { return $(id); }
function gv(id) { const e = $(id); return e ? e.value : 0; }
function radioVal(name) { const e = document.querySelector(`input[name="${name}"]:checked`); return e ? e.value : ""; }
function fontVal() { return radioVal("font") || "'Amiri Quran'"; }
function sv(el, outId, unit = "") { $(outId).textContent = el.value + unit; }
function setCol(id, val) { const e = $(id); if (e) e.value = val; }
function setV(id, val) { const e = $(id); if (e) e.value = val; }
function setR(name, val) { const e = document.querySelector(`input[name="${name}"][value="${val}"]`); if (e) e.checked = true; }
function syncCP(pickId, txtId) { const e = $(pickId); if (e && $(txtId)) $(txtId).value = e.value; }
function syncCT(pickId, txtId) { const val = $(txtId).value; if (/^#[0-9a-fA-F]{6}$/.test(val)) { setCol(pickId, val); } }
function hex2rgb(hex) { const h = hex.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function toggleManualDur() { $("manual-dur").style.display = ge("auto-dur") ? "none" : "block"; }
function checkOffline() {
  const u = () => document.body.classList.toggle("offline", !navigator.onLine);
  window.addEventListener("online", u); window.addEventListener("offline", u); u();
}

function toast(msg, type = "info") {
  const el = document.createElement("div"); el.className = `toast ${type}`; el.textContent = msg;
  $("toast-c").appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
