// ═══════════════════════════════════════════════════════
//  GT-SQR v2.0 — GnuTux Short Quran Reels
//  Author: SalehGNUTUX | License: GPLv3
//  آخر تحديث: 2026 - نسخة الويب مع مزايا سطح المكتب
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
{ id: "yassin_w",   name: "ياسين الجزائري (ورش)",      flag: "🇩🇿", folder: "warsh/warsh_yassin_al_jazaery_64kbps" },
{ id: "hussary_w",  name: "الحصري مرتل (ورش)",         flag: "🇪🇬", folder: "warsh/Husary_Murattal_warsh_128kbps" },
];

function buildAudioUrl(folder, surahNum, ayaNum) {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
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

// ── PWA Install Banner ───────────────────────────────
let _pwaPrompt = null;
function initPwaInstall() {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    _pwaPrompt = e;
    showPwaBanner();
    console.log("[PWA] Install prompt captured");
  });
  window.addEventListener("appinstalled", () => {
    _pwaPrompt = null;
    hidePwaBanner();
    toast("✅ تم تثبيت GT-SQR بنجاح!", "success");
  });
}
function showPwaBanner() {
  const bar = document.getElementById("pwa-bar");
  if (bar) bar.style.display = "flex";
}
function hidePwaBanner() {
  const bar = document.getElementById("pwa-bar");
  if (bar) bar.style.display = "none";
}
async function installPwa() {
  if (!_pwaPrompt) {
    toast("⚠️ التثبيت غير متاح في هذا المتصفح أو التطبيق مثبت مسبقاً", "info");
    return;
  }
  _pwaPrompt.prompt();
  const { outcome } = await _pwaPrompt.userChoice;
  if (outcome === "accepted") toast("⏳ جاري التثبيت…", "info");
  else                         toast("تم الإلغاء", "info");
  _pwaPrompt = null;
  hidePwaBanner();
}

// ── نظام كتم المعاينة + كتم التصدير (مماثل للمكتبية) ───
function togglePreviewMute() {
  S.previewMuted = !S.previewMuted;
  _applyPreviewMute();
  const btn = document.getElementById("mute-preview-btn");
  if (btn) {
    btn.textContent = S.previewMuted ? "🔇" : "🔊";
    btn.title       = S.previewMuted ? "رفع كتم المعاينة" : "كتم صوت المعاينة";
    btn.classList.toggle("btn-muted", S.previewMuted);
  }
}
function _applyPreviewMute() {
  const muted = !!S.previewMuted;
  // كتم/رفع الصوت لمصادر التلاوة وصوت الخلفية الموسيقي
  if (S.recAudioEl) S.recAudioEl.muted = muted;
  if (S.bgAudioEl)  S.bgAudioEl.muted  = muted;
  // كتم صوت فيديوهات الخلفية (مع احترام تفعيل صوت كل مقطع)
  if (Array.isArray(S.bgVidItems)) {
    S.bgVidItems.forEach(it => {
      if (it.vid) it.vid.muted = muted || !it.audioEnabled;
    });
  }
}

function initExportMuteState() {
  // اقرأ الإعداد من checkbox وطبّقه على المسار MediaRecorder القديم
  const cb = document.getElementById("mute-on-export");
  S.exportMuted = (cb && cb.checked) || S.muteOnExport;
  _applyExportMute();
}
function cleanupExportMute() {
  S.exportMuted = false;
  _applyExportMute();
}
function _applyExportMute() {
  // المسار V2 صامت دائماً (لا audio playback)؛ هذه للـ MediaRecorder fallback
  if (S.recAudioEl) S.recAudioEl.muted = S.exportMuted || S.previewMuted;
  if (S.bgAudioEl)  S.bgAudioEl.muted  = S.exportMuted || S.previewMuted;
}

// ── GLOBAL STATE ───────────────────────────────────────
const S = {
  surahs: [], verses: [], translations: [],
  currentAya: 0, playing: false,
  elapsed: 0, lastRafTs: null,
  ayaDurations: [],
  bgImg: null, bgVid: null,
  bgVidItems: [], // [{file, vid, name, dur, url}] — playlist لخلفية الفيديو
  mixedAnimsOrder: [],  // ترتيب التأثيرات المُفعَّلة في وضع "مختلط"
  bgVidActiveIdx: 0,
  bgVidNext: null,
  bgVidFadeProgress: 0,
  bgMotionT: 0,
  audioCtx: null, analyser: null, exportDest: null,
  recAudioEl: null, recAudioSource: null, recGainNode: null,
  logoVid: null,
  bgAudioEl: null, bgAudioSource: null,
  waveData: new Uint8Array(64).fill(0),
  stars: [], bokeh: [],
  exportCancel: false, mediaRecorder: null, exportChunks: [],
  exportCancelRef: null, // مرجع إلغاء محرك WebCodecs V2
  muteOnExport: false,     // الإعداد من checkbox
  exportMuted:  false,     // الحالة الحالية
  previewMuted: false,     // كتم المعاينة فقط
  exporting: false, exportSources: [],
  templates: [], reciters: [...RECITERS_LIST],
  allFonts: [...BUILT_IN_FONTS],
  rafId: null,
  logoImg: null,
  filteredSurahs: [],
};

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  initThemeChips();
  renderFontGrid();
  restoreReciters();
  renderReciters();
  loadTemplates();
  generateParticles();
  initCanvas();
  checkOffline();
  startRenderLoop();
  await loadLocalFonts(false);
  await loadSurahList();
  // ⚠️ الترتيب: سجّل المستمعين أولاً، ثم استعد الإعدادات حتى تصل أحداث change إلى المعالجات
  initEventListeners();
  restoreAllSettings();
  restoreLogo();
  restoreMixedAnimsOrder();
  initAutoSave();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => { });
  }
  initMobileLayout();
  initPwaInstall();
  // حمّل فهرس القرآن الكامل في الخلفية للعمل دون اتصال
  preloadQuranIndex();
});

// ══════════════════════════════════════════════════════
//  EVENT LISTENERS
// ══════════════════════════════════════════════════════
function initEventListeners() {
  // أزرار التبويبات
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      goTab(e.currentTarget.dataset.tab);
      if (window.innerWidth <= 760) openMobilePanel();
    });
  });

  // أزرار التحكم
  const loadVersesBtn = $("load-verses-btn");
  if (loadVersesBtn) loadVersesBtn.addEventListener("click", loadVerses);

  const toggleAddReciterBtn = $("toggle-add-reciter-btn");
  if (toggleAddReciterBtn) toggleAddReciterBtn.addEventListener("click", toggleAddReciter);

  const addCustomReciterBtn = $("add-custom-reciter-btn");
  if (addCustomReciterBtn) addCustomReciterBtn.addEventListener("click", addCustomReciter);

  const refreshFontsBtn = $("refresh-fonts-btn");
  if (refreshFontsBtn) refreshFontsBtn.addEventListener("click", () => loadLocalFonts(true));

  const customFontsInput = $("custom-fonts-input");
  if (customFontsInput) customFontsInput.addEventListener("change", (e) => loadCustomFonts(e.target));

  const togglePlayBtn = $("toggle-play-btn");
  if (togglePlayBtn) togglePlayBtn.addEventListener("click", togglePlay);
  const mutePreviewBtn = $("mute-preview-btn");
  if (mutePreviewBtn) mutePreviewBtn.addEventListener("click", togglePreviewMute);
  const muteOnExportCb = $("mute-on-export");
  if (muteOnExportCb) muteOnExportCb.addEventListener("change", (e) => { S.muteOnExport = e.target.checked; });

  // PWA install banner
  const installPwaBtn = $("install-pwa-btn");
  if (installPwaBtn) installPwaBtn.addEventListener("click", installPwa);
  const hidePwaBtn = $("hide-pwa-banner-btn");
  if (hidePwaBtn) hidePwaBtn.addEventListener("click", hidePwaBanner);
  const btnPlay = $("btn-play");
  if (btnPlay) btnPlay.addEventListener("click", togglePlay);

  const prevAyaBtn = $("prev-aya-btn");
  if (prevAyaBtn) prevAyaBtn.addEventListener("click", prevAya);
  const nextAyaBtn = $("next-aya-btn");
  if (nextAyaBtn) nextAyaBtn.addEventListener("click", nextAya);
  // v3.3.2 — زرّ إعادة من البداية
  const restartAllBtn = $("restart-all-btn");
  if (restartAllBtn) restartAllBtn.addEventListener("click", restartAll);

  const pbar = $("pbar");
  if (pbar) pbar.addEventListener("click", seekClick);

  const openTplModalBtn = $("open-tpl-modal-btn");
  if (openTplModalBtn) openTplModalBtn.addEventListener("click", () => openModal("tpl-modal"));
  const openTplModalFromTab = $("open-tpl-modal-from-tab");
  if (openTplModalFromTab) openTplModalFromTab.addEventListener("click", () => openModal("tpl-modal"));
  const closeTplModalBtn = $("close-tpl-modal-btn");
  if (closeTplModalBtn) closeTplModalBtn.addEventListener("click", () => closeModal("tpl-modal"));
  const confirmSaveTemplateBtn = $("confirm-save-template-btn");
  if (confirmSaveTemplateBtn) confirmSaveTemplateBtn.addEventListener("click", confirmSaveTemplate);

  const cancelExportBtn = $("cancel-export-btn");
  if (cancelExportBtn) cancelExportBtn.addEventListener("click", cancelExport);

  const resetSettingsBtn = $("reset-settings-btn");
  if (resetSettingsBtn) resetSettingsBtn.addEventListener("click", resetAllSettings);

  // Radio buttons
  document.querySelectorAll('input[name="fmt"]').forEach(radio => {
    radio.addEventListener("change", onFmtChange);
  });
  document.querySelectorAll('input[name="bgt"]').forEach(radio => {
    radio.addEventListener("change", onBgTypeChange);
  });
  document.querySelectorAll('input[name="tanim"]').forEach(radio => {
    radio.addEventListener("change", onTanimChange);
  });
  document.querySelectorAll(".mix-anim").forEach(cb => {
    cb.addEventListener("change", onMixAnimChange);
  });
  // قالب جاهز
  const presetSel = $("preset-sel");
  if (presetSel) presetSel.addEventListener("change", onPresetChange);

  // إظهار/إخفاء لوحة إعدادات اسم السورة
  const snameOn = $("sname-on");
  if (snameOn) snameOn.addEventListener("change", (e) => {
    const ctrl = $("sname-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });

  // v3.1 — لوحة عنوان المقطع
  const vtitleOn = $("vtitle-on");
  if (vtitleOn) vtitleOn.addEventListener("change", (e) => {
    const ctrl = $("vtitle-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });

  // v3.2 — Chromakey
  const chromaOn = $("chromakey-on");
  if (chromaOn) chromaOn.addEventListener("change", (e) => {
    const ctrl = $("chromakey-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });
  $("chromakey-preset-green")?.addEventListener("click", () => { const inp = $("chromakey-color"); if (inp) { inp.value = "#00b140"; inp.dispatchEvent(new Event("change")); } });
  $("chromakey-preset-blue")?.addEventListener("click", () => { const inp = $("chromakey-color"); if (inp) { inp.value = "#0047bb"; inp.dispatchEvent(new Event("change")); } });

  // v3.3 — recvid: تفعيل/إلغاء يُلغي مصادر القرآن تلقائياً
  const recvidOn = $("recvid-on");
  if (recvidOn) recvidOn.addEventListener("change", (e) => {
    const ctrl = $("recvid-ctrl");
    const wrap = $("quran-sources-wrap");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
    if (wrap) wrap.style.display = e.target.checked ? "none" : "block";
    if (e.target.checked) {
      if (typeof stopRecitationAudio === "function") { try { stopRecitationAudio(); } catch (_) {} }
      if (typeof _recGen !== "undefined") { try { _recGen++; } catch (_) {} }
      if (S.playing) { try { togglePlay(); } catch (_) {} }
      const hasQuran = S.verses?.some(v => !v.free);
      if (hasQuran) {
        S.verses = []; S.translations = []; S.ayaDurations = []; S.currentAya = 0; S.elapsed = 0;
        if (typeof updateAyaUI === "function") updateAyaUI();
      }
      toast("🎥 وضع فيديو التلاوة مُفعَّل — مصادر القرآن مُعطَّلة مؤقّتاً", "info", 2500);
    } else {
      if (S.recVidEl) { try { S.recVidEl.pause(); } catch (_) {} }
      if (typeof onSurahChange === "function") { try { onSurahChange(); } catch (_) {} }
      toast("📖 وضع فيديو التلاوة مُعطَّل — عودة لمصادر القرآن", "info", 1800);
    }
  });
  const recvidFile = $("recvid-file");
  if (recvidFile) recvidFile.addEventListener("change", (e) => onRecVidFile(e.target));
  $("recvid-remove")?.addEventListener("click", () => { removeRecVid(); toast("🗑️ تمّت إزالة الفيديو", "info", 1500); });
  const setRecvidBg = (hex) => { const inp = $("recvid-bgcolor"); if (inp) { inp.value = hex; inp.dispatchEvent(new Event("change")); } };
  $("recvid-bgcolor-black")?.addEventListener("click", () => setRecvidBg("#000000"));
  $("recvid-bgcolor-white")?.addEventListener("click", () => setRecvidBg("#ffffff"));
  $("recvid-bgcolor-green")?.addEventListener("click", () => setRecvidBg("#00b140"));
  $("recvid-bgcolor-blue")?.addEventListener("click", () => setRecvidBg("#0047bb"));

  // v3.2 — Chromakey للشعار
  const logoChromaOn = $("logo-chroma-on");
  if (logoChromaOn) logoChromaOn.addEventListener("change", (e) => {
    const ctrl = $("logo-chroma-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });
  const setLogoChroma = (hex) => { const inp = $("logo-chroma-color"); if (inp) { inp.value = hex; inp.dispatchEvent(new Event("change")); } };
  $("logo-chroma-white")?.addEventListener("click", () => setLogoChroma("#ffffff"));
  $("logo-chroma-black")?.addEventListener("click", () => setLogoChroma("#000000"));
  $("logo-chroma-green")?.addEventListener("click", () => setLogoChroma("#00b140"));
  const surahSel = $("surah-sel");
  if (surahSel) surahSel.addEventListener("change", onSurahChange);
  const transSel = $("trans-sel");
  if (transSel) transSel.addEventListener("change", onTransChange);
  const autoDur = $("auto-dur");
  if (autoDur) autoDur.addEventListener("change", toggleManualDur);

  // Range sliders
  const sliders = [
    { id: "aya-dur", outId: "aya-dur-v", unit: "s" },
    { id: "trans-dur", outId: "trans-dur-v", unit: "s" },
    { id: "aya-gap", outId: "aya-gap-v", unit: "s" },
    { id: "wave-gain", outId: "wave-gain-v", unit: "%" },
    { id: "vtitle-y", outId: "vtitle-y-v", unit: "%" },
    { id: "vtitle-size", outId: "vtitle-size-v", unit: "%" },
    { id: "chromakey-similarity", outId: "chromakey-similarity-v", unit: "" },
    { id: "chromakey-smoothness", outId: "chromakey-smoothness-v", unit: "" },
    { id: "chromakey-spill", outId: "chromakey-spill-v", unit: "" },
    { id: "recvid-x", outId: "recvid-x-v", unit: "%" },
    { id: "recvid-y", outId: "recvid-y-v", unit: "%" },
    { id: "recvid-scale", outId: "recvid-scale-v", unit: "%" },
    { id: "recvid-threshold", outId: "recvid-threshold-v", unit: "" },
    { id: "recvid-softness", outId: "recvid-softness-v", unit: "" },
    { id: "logo-chroma-threshold", outId: "logo-chroma-threshold-v", unit: "" },
    { id: "logo-chroma-softness", outId: "logo-chroma-softness-v", unit: "" },
    { id: "sname-y", outId: "sname-y-v", unit: "%" },
    { id: "sname-size", outId: "sname-size-v", unit: "%" },
    { id: "orn-op", outId: "orn-op-v", unit: "%" },
    { id: "dim", outId: "dim-v", unit: "%" },
    { id: "bright", outId: "bright-v", unit: "%" },
    { id: "satur", outId: "satur-v", unit: "%" },
    { id: "fsize", outId: "fsize-v", unit: "%" },
    { id: "lh", outId: "lh-v", unit: "" },
    { id: "wm-size", outId: "wm-size-v", unit: "px" },
    { id: "rec-vol", outId: "rec-vol-v", unit: "%" },
    { id: "bg-vol", outId: "bg-vol-v", unit: "%" },
    { id: "logo-size", outId: "logo-size-v", unit: "px" },
    { id: "logo-opacity", outId: "logo-opacity-v", unit: "%" },
    { id: "wave-h", outId: "wave-h-v", unit: "px" },
    { id: "vig-str", outId: "vig-str-v", unit: "%" },
    { id: "ov-op", outId: "ov-op-v", unit: "%" },
    { id: "export-vbr", outId: "export-vbr-v", unit: " Mbps" },
    { id: "pixel-size", outId: "pixel-size-v", unit: "" },
    { id: "mosaic-size", outId: "mosaic-size-v", unit: "" },
    { id: "ripple-amp", outId: "ripple-amp-v", unit: "" },
    { id: "wave-amp", outId: "wave-amp-v", unit: "" },
    { id: "swirl-factor", outId: "swirl-factor-v", unit: "" },
    { id: "kaleido-segments", outId: "kaleido-segments-v", unit: "" },
    { id: "glitch-intensity", outId: "glitch-intensity-v", unit: "" },
    { id: "word-fade-ms", outId: "word-fade-ms-v", unit: "ms" },
    { id: "bg-crossfade-ms", outId: "bg-crossfade-ms-v", unit: "ms" },
  ];
  sliders.forEach(s => {
    const el = $(s.id);
    if (el) {
      el.addEventListener("input", (e) => sv(e.target, s.outId, s.unit));
      sv(el, s.outId, s.unit);
    }
  });

  // Color picker + text sync
  const syncPairs = [
    { pick: "gc1", text: "gc1t" },
    { pick: "gc2", text: "gc2t" },
  ];
  syncPairs.forEach(p => {
    const pick = $(p.pick);
    const text = $(p.text);
    if (pick && text) {
      pick.addEventListener("input", () => syncCP(p.pick, p.text));
      text.addEventListener("input", () => syncCT(p.pick, p.text));
    }
  });

  // File inputs
  const bgImgInput = $("bg-img-input");
  if (bgImgInput) bgImgInput.addEventListener("change", (e) => onBgMedia(e.target, "image"));
  const bgVidInput = $("bg-vid-input");
  if (bgVidInput) bgVidInput.addEventListener("change", (e) => onBgMedia(e.target, "video"));
  const bgAudioInput = $("bg-audio-input");
  if (bgAudioInput) bgAudioInput.addEventListener("change", (e) => onBgAudio(e.target));

  // تقطيع زمني للوسائط المحلية (نفس النهج في النسختين)
  const bgVidTrimOn = $("bg-vid-trim-on");
  if (bgVidTrimOn) bgVidTrimOn.addEventListener("change", (e) => {
    const row = $("bg-vid-trim-row");
    if (row) row.style.display = e.target.checked ? "block" : "none";
    if (e.target.checked && S.bgVid) applyBgVidTrim();
  });
  ["bg-vid-trim-start","bg-vid-trim-end"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", () => { if (ge("bg-vid-trim-on")) applyBgVidTrim(); });
  });
  const bgAudioTrimOn = $("bg-audio-trim-on");
  if (bgAudioTrimOn) bgAudioTrimOn.addEventListener("change", (e) => {
    const row = $("bg-audio-trim-row");
    if (row) row.style.display = e.target.checked ? "block" : "none";
    if (e.target.checked && S.bgAudioEl) applyBgAudioTrim();
  });
  ["bg-audio-trim-start","bg-audio-trim-end"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", () => { if (ge("bg-audio-trim-on")) applyBgAudioTrim(); });
  });
  const logoUpload = $("logo-upload");
  if (logoUpload) logoUpload.addEventListener("change", (e) => onLogoUpload(e.target));
  const removeLogoBtn = $("remove-logo-btn");
  if (removeLogoBtn) removeLogoBtn.addEventListener("click", removeLogo);

  // Search (surah name + verse content)
  const surahSearch = $("surah-search");
  if (surahSearch) surahSearch.addEventListener("input", (e) => filterSurahs(e.target.value));

  const verseSearchInp = $("verse-search-inp");
  if (verseSearchInp) {
    const debouncedSearch = debounce(onVerseSearchInput, 200);
    verseSearchInp.addEventListener("input", debouncedSearch);
    verseSearchInp.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { clearVerseSearch(); verseSearchInp.blur(); }
    });
  }
  const verseSearchClear = $("verse-search-clear-btn");
  if (verseSearchClear) verseSearchClear.addEventListener("click", clearVerseSearch);

  // Mobile
  const panelSizeSlider = $("panel-size-slider");
  if (panelSizeSlider) panelSizeSlider.addEventListener("input", (e) => onPanelSizeChange(e.target.value));
  const layVert = $("lay-vert");
  if (layVert) layVert.addEventListener("click", () => setMobLayout("vert"));
  const layHoriz = $("lay-horiz");
  if (layHoriz) layHoriz.addEventListener("click", () => setMobLayout("horiz"));
  const layFull = $("lay-full");
  if (layFull) layFull.addEventListener("click", () => setMobLayout("full"));
  const mobToggle = $("mob-toggle");
  if (mobToggle) mobToggle.addEventListener("click", toggleMobilePanel);
  const panelHandle = $("panel-handle");
  if (panelHandle) panelHandle.addEventListener("touchstart", initPanelSwipe);
  const mobBackdrop = $("mob-backdrop");
  if (mobBackdrop) mobBackdrop.addEventListener("click", closeMobilePanel);

  // Export
  const exportWebmBtn = $("export-webm-btn");
  if (exportWebmBtn) exportWebmBtn.addEventListener("click", () => startExport("webm"));
  const exportMp4Btn = $("export-mp4-btn");
  if (exportMp4Btn) exportMp4Btn.addEventListener("click", () => startExport("mp4"));
}

// ══════════════════════════════════════════════════════
//  حفظ واستعادة الإعدادات
// ══════════════════════════════════════════════════════
const SETTINGS_KEY = "gt_sqr_settings_v2";
const RECITERS_KEY = "gt_sqr_reciters_v2";

const SETTINGS_SKIP = new Set([
  "tpl-name-inp","surah-sel","from-aya","to-aya","surah-search","verse-search-inp","preset-sel",
  "bg-img-input","bg-vid-input","bg-audio-input",
  "custom-fonts-input","logo-upload",
  "ar-name","ar-flag","ar-folder",
  "f1","f2","f3","panel-size-slider"
]);

function saveAllSettings() {
  const saved = {};
  document.querySelectorAll("input, select, textarea").forEach(el => {
    if (!el.id || SETTINGS_SKIP.has(el.id)) return;
    if (el.type === "checkbox") saved[el.id] = el.checked;
    else if (el.type === "radio") { if (el.checked) saved["__radio_" + el.name] = el.value; }
    else saved[el.id] = el.value;
  });
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved)); } catch(e) {}
}

function restoreAllSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch(e) {}
  if (!Object.keys(saved).length) return;

  Object.entries(saved).forEach(([key, val]) => {
    if (key.startsWith("__radio_")) {
      const name = key.replace("__radio_", "");
      const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event("change")); }
    } else {
      const el = $(key);
      if (!el) return;
      if (el.type === "file") return;
      if (el.type === "checkbox") {
        el.checked = !!val;
        el.dispatchEvent(new Event("change"));
      } else {
        el.value = val;
        el.dispatchEvent(new Event("input"));
        el.dispatchEvent(new Event("change"));
      }
    }
  });
}

function saveReciters() {
  try { localStorage.setItem(RECITERS_KEY, JSON.stringify(S.reciters)); } catch(e) {}
}

function restoreReciters() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECITERS_KEY) || "null");
    if (saved && Array.isArray(saved) && saved.length > 0) {
      S.reciters = saved;
      renderReciters();
    }
  } catch(e) {}
}

function initAutoSave() {
  const debouncedSave = debounce(saveAllSettings, 500);
  document.addEventListener("input", debouncedSave, true);
  document.addEventListener("change", debouncedSave, true);
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

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

// ── فاصل صمت بين الآيات ──────────────────────────────
function getAyaGap() {
  return Math.max(0, parseFloat(gv("aya-gap")) || 0);
}
function getEffectiveDur(i) {
  const audioDur = (S.ayaDurations[i] && S.ayaDurations[i] > 0.5) ? S.ayaDurations[i] : (parseFloat(gv("aya-dur")) || 6);
  return audioDur + getAyaGap();
}

function checkAyaAdvance() {
  if (S.exporting) return;
  const dur = getEffectiveDur(S.currentAya);
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

const FMT_SIZES = {
  "9:16": { w: 720,  h: 1280 },
  "16:9": { w: 1280, h: 720  },
  "1:1":  { w: 1080, h: 1080 },
  "4:5":  { w: 1080, h: 1350 },
};

function onFmtChange() {
  const fmt = radioVal("fmt");
  const cv = $("cv");
  const sz = FMT_SIZES[fmt] || FMT_SIZES["9:16"];
  cv.width = sz.w; cv.height = sz.h;
  const lbl = $("fmt-lbl");
  if (lbl) lbl.textContent = fmt;
  fitCanvas();
}

// ── القوالب الجاهزة للمنصات الشهيرة ──────────────────
const PRESETS = {
  "reel-fhd": { fmt: "9:16", w: 1080, h: 1920, fps: 30, vbr: 10, label: "Reels/Shorts/TikTok 1080×1920" },
  "reel-hd":  { fmt: "9:16", w: 720,  h: 1280, fps: 30, vbr: 6,  label: "Reels 720×1280 (سريع)" },
  "yt-fhd":   { fmt: "16:9", w: 1920, h: 1080, fps: 30, vbr: 12, label: "YouTube 1920×1080" },
  "yt-hd":    { fmt: "16:9", w: 1280, h: 720,  fps: 30, vbr: 8,  label: "YouTube 1280×720" },
  "ig-sq":    { fmt: "1:1",  w: 1080, h: 1080, fps: 30, vbr: 8,  label: "Instagram Square 1080" },
  "ig-port":  { fmt: "4:5",  w: 1080, h: 1350, fps: 30, vbr: 8,  label: "Instagram Portrait 1080×1350" },
  "cinema":   { fmt: "16:9", w: 2560, h: 1080, fps: 30, vbr: 15, label: "Cinema 2560×1080 (21:9)" },
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  FMT_SIZES[p.fmt] = { w: p.w, h: p.h };
  const fmtRadio = document.querySelector(`input[name="fmt"][value="${p.fmt}"]`);
  if (fmtRadio) fmtRadio.checked = true;
  const cv = $("cv");
  cv.width = p.w; cv.height = p.h;
  const lbl = $("fmt-lbl");
  if (lbl) lbl.textContent = p.fmt;
  fitCanvas();
  const fpsEl = $("export-fps");
  if (fpsEl) fpsEl.value = String(p.fps);
  const vbrEl = $("export-vbr");
  if (vbrEl) { vbrEl.value = String(p.vbr); if (typeof sv === "function") sv(vbrEl, "export-vbr-v", " Mbps"); }
  toast(`✅ تم تطبيق قالب: ${p.label}`, "success", 3000);
}

function onPresetChange(e) {
  const v = e.target.value;
  if (!v) return;
  applyPreset(v);
  setTimeout(() => { e.target.value = ""; }, 100);
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
  // التأثيرات الإضافية (per-pixel — قد تكون ثقيلة)
  if (ge("fx-pixel"))   applyPixelate(ctx, W, H);
  if (ge("fx-mosaic"))  applyMosaic(ctx, W, H);
  if (ge("fx-ripple"))  applyRipple(ctx, W, H, ts);
  if (ge("fx-wave"))    applyWave(ctx, W, H, ts);
  if (ge("fx-swirl"))   applySwirl(ctx, W, H);
  if (ge("fx-kaleido")) applyKaleido(ctx, W, H);
  if (ge("fx-glitch"))  applyGlitch(ctx, W, H);
  if (ge("fx-oldfilm")) applyOldFilm(ctx, W, H, ts);
  // v3.2 — فيديو التلاوة الجاهز يستبدل النصّ/الآيات
  const recvidActive = ge("recvid-on") && S.recVidEl;
  if (recvidActive) drawRecitationVideo(ctx, W, H);
  else if (S.verses.length) drawVerse(ctx, W, H, ts);
  drawSurahName(ctx, W, H);
  drawVideoTitle(ctx, W, H);
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
  const chromaOn = ge("chromakey-on");

  ctx.save();
  ctx.filter = `brightness(${bright}) saturate(${gv("satur") / 100})`;

  const drawMediaToCanvas = (targetCtx, applyMotion) => {
    if (bgt === "image" && S.bgImg) {
      targetCtx.save();
      if (applyMotion) applyBgMotion(targetCtx, W, H, bgm, ts);
      imgCover(targetCtx, S.bgImg, 0, 0, W, H);
      targetCtx.restore();
      return true;
    } else if (bgt === "video" && S.bgVid && S.bgVid.readyState >= 2) {
      updateBgVidCrossfade();
      const alpha = S.bgVidFadeProgress;
      targetCtx.save();
      if (applyMotion) applyBgMotion(targetCtx, W, H, bgm, ts);
      targetCtx.globalAlpha = 1 - alpha;
      imgCover(targetCtx, S.bgVid, 0, 0, W, H);
      if (S.bgVidNext && S.bgVidNext.readyState >= 2 && alpha > 0) {
        targetCtx.globalAlpha = alpha;
        imgCover(targetCtx, S.bgVidNext, 0, 0, W, H);
      }
      targetCtx.restore();
      return true;
    }
    return false;
  };

  const hasMedia = (bgt === "image" && S.bgImg) || (bgt === "video" && S.bgVid && S.bgVid.readyState >= 2);
  if (bgt === "gradient" || !hasMedia) {
    drawGradient(ctx, W, H);
  } else if (chromaOn) {
    drawGradient(ctx, W, H);
    const tmp = getChromakeyCanvas(W, H);
    const tctx = tmp.getContext("2d", { willReadFrequently: true });
    tctx.clearRect(0, 0, W, H);
    tctx.filter = ctx.filter;
    const drawn = drawMediaToCanvas(tctx, true);
    tctx.filter = "none";
    if (drawn) {
      applyChromakeyToCanvas(tctx, W, H);
      ctx.filter = "none";
      ctx.drawImage(tmp, 0, 0);
    }
  } else {
    drawMediaToCanvas(ctx, true) || drawGradient(ctx, W, H);
  }
  ctx.restore();
  ctx.filter = "none";
}

// v3.2 — Chromakey
let _chromakeyCanvas = null;
function getChromakeyCanvas(W, H) {
  if (!_chromakeyCanvas) _chromakeyCanvas = document.createElement("canvas");
  if (_chromakeyCanvas.width !== W) _chromakeyCanvas.width = W;
  if (_chromakeyCanvas.height !== H) _chromakeyCanvas.height = H;
  return _chromakeyCanvas;
}
function hexToRgb(hex) {
  const m = (hex || "#00b140").replace("#", "");
  return { r: parseInt(m.substr(0, 2), 16), g: parseInt(m.substr(2, 2), 16), b: parseInt(m.substr(4, 2), 16) };
}
function applyChromakeyToCanvas(ctx, W, H) {
  const colorHex = $("chromakey-color")?.value || "#00b140";
  const { r: kR, g: kG, b: kB } = hexToRgb(colorHex);
  const similarity = (parseFloat(gv("chromakey-similarity")) || 30);
  const smoothness = (parseFloat(gv("chromakey-smoothness")) || 15);
  const spill = (parseFloat(gv("chromakey-spill")) || 20) / 100;
  const keyCb = -0.168736 * kR - 0.331264 * kG + 0.5 * kB + 128;
  const keyCr = 0.5 * kR - 0.418688 * kG - 0.081312 * kB + 128;
  const sim = similarity * 1.5;
  const smooth = Math.max(0.5, smoothness * 1.5);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
    const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
    const dx = cb - keyCb, dy = cr - keyCr;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let alpha = 1;
    if (dist < sim) alpha = 0;
    else if (dist < sim + smooth) alpha = (dist - sim) / smooth;
    d[i + 3] = d[i + 3] * alpha;
    if (alpha > 0 && spill > 0) {
      if (kG > kR && kG > kB) { const avg = (r + b) / 2; if (g > avg) d[i + 1] = g + (avg - g) * spill; }
      else if (kB > kR && kB > kG) { const avg = (r + g) / 2; if (b > avg) d[i + 2] = b + (avg - b) * spill; }
      else if (kR > kG && kR > kB) { const avg = (g + b) / 2; if (r > avg) d[i] = r + (avg - r) * spill; }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function removeBgColorFromRegion(ctx, x, y, w, h, opts) {
  const colorHex = opts.colorHex || "#000000";
  const { r: kR, g: kG, b: kB } = hexToRgb(colorHex);
  const threshold = opts.threshold ?? 25;
  const softness = opts.softness ?? 10;
  const maxCh = Math.max(kR, kG, kB), minCh = Math.min(kR, kG, kB);
  const isGrayscale = (maxCh - minCh) < 25;
  const isDark = isGrayscale && maxCh < 60;
  const isLight = isGrayscale && minCh > 195;
  let mode, lo, hi, range, keyCb, keyCr, sim, smooth;
  if (isDark) { mode = "dark"; lo = threshold * 2.55; hi = lo + softness * 2.55; range = Math.max(0.5, hi - lo); }
  else if (isLight) { mode = "light"; hi = 255 - threshold * 2.55; lo = hi - softness * 2.55; range = Math.max(0.5, hi - lo); }
  else { mode = "ycbcr"; keyCb = -0.168736 * kR - 0.331264 * kG + 0.5 * kB + 128; keyCr = 0.5 * kR - 0.418688 * kG - 0.081312 * kB + 128; sim = threshold * 1.5; smooth = Math.max(0.5, softness * 1.5); }
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let alpha;
    if (mode === "dark") { const lum = Math.max(r, g, b); if (lum <= lo) alpha = 0; else if (lum >= hi) alpha = 1; else alpha = (lum - lo) / range; }
    else if (mode === "light") { const lum = Math.min(r, g, b); if (lum >= hi) alpha = 0; else if (lum <= lo) alpha = 1; else alpha = (hi - lum) / range; }
    else {
      const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
      const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
      const dx = cb - keyCb, dy = cr - keyCr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < sim) alpha = 0; else if (dist < sim + smooth) alpha = (dist - sim) / smooth; else alpha = 1;
    }
    d[i + 3] = d[i + 3] * alpha;
  }
  ctx.putImageData(img, x, y);
}

// v3.2 — فيديو التلاوة الجاهز
// v3.3.3 — ضبط الكانفاس على نسبة فيديو التلاوة
function autoFitCanvasToVideo(vw, vh) {
  if (!vw || !vh) return;
  const aspect = vw / vh;
  const presets = { "9:16": 9 / 16, "16:9": 16 / 9, "1:1": 1, "4:5": 4 / 5 };
  let bestKey = "9:16", bestDiff = Infinity;
  for (const [k, ratio] of Object.entries(presets)) {
    const diff = Math.abs(aspect - ratio);
    if (diff < bestDiff) { bestDiff = diff; bestKey = k; }
  }
  const cv = $("cv");
  if (!cv) return;
  if (bestDiff < 0.05) {
    const radio = document.querySelector(`input[name="fmt"][value="${bestKey}"]`);
    if (radio && !radio.checked) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    }
    toast?.(`📐 ضُبط الكانفاس على ${bestKey} (${cv.width}×${cv.height})`, "info", 1800);
  } else {
    cv.width = vw;
    cv.height = vh;
    if (typeof fitCanvas === "function") fitCanvas();
    toast?.(`📐 ضُبط الكانفاس على أبعاد الفيديو ${vw}×${vh}`, "info", 1800);
  }
}

let _recVidCanvas = null;
function getRecVidCanvas(W, H) {
  if (!_recVidCanvas) _recVidCanvas = document.createElement("canvas");
  if (_recVidCanvas.width !== W) _recVidCanvas.width = W;
  if (_recVidCanvas.height !== H) _recVidCanvas.height = H;
  return _recVidCanvas;
}
function drawRecitationVideo(ctx, W, H) {
  const v = S.recVidEl;
  if (!v || v.readyState < 2) return;
  const sw = v.videoWidth, sh = v.videoHeight;
  if (!sw || !sh) return;
  const fit = $("recvid-fit")?.value || "contain";
  const xPct = parseFloat(gv("recvid-x")) || 0;
  const yPct = parseFloat(gv("recvid-y")) || 0;
  const scale = (parseFloat(gv("recvid-scale")) || 100) / 100;
  let dw, dh;
  const ir = sw / sh, cr = W / H;
  if (fit === "stretch") { dw = W; dh = H; }
  else if (fit === "actual") { dw = sw; dh = sh; }
  else if (fit === "cover") { if (ir > cr) { dh = H; dw = dh * ir; } else { dw = W; dh = dw / ir; } }
  else { if (ir > cr) { dw = W; dh = dw / ir; } else { dh = H; dw = dh * ir; } }
  dw *= scale; dh *= scale;
  const dx = (W - dw) / 2 + (xPct / 100) * W;
  const dy = (H - dh) / 2 + (yPct / 100) * H;
  const tmp = getRecVidCanvas(W, H);
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  tctx.clearRect(0, 0, W, H);
  tctx.drawImage(v, dx, dy, dw, dh);
  const rx = Math.max(0, Math.floor(dx)), ry = Math.max(0, Math.floor(dy));
  const rw = Math.min(W - rx, Math.ceil(dw)), rh = Math.min(H - ry, Math.ceil(dh));
  if (rw > 0 && rh > 0) {
    removeBgColorFromRegion(tctx, rx, ry, rw, rh, {
      colorHex: $("recvid-bgcolor")?.value || "#000000",
      threshold: parseFloat(gv("recvid-threshold")) || 25,
      softness: parseFloat(gv("recvid-softness")) || 10,
    });
  }
  ctx.drawImage(tmp, 0, 0);
}
function onRecVidFile(input) {
  const file = input.files[0];
  if (!file) return;
  removeRecVid();
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.src = url; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous";
  v.onloadedmetadata = () => {
    const sec = isFinite(v.duration) ? v.duration : 0;
    const info = $("recvid-info");
    if (info) info.textContent = `✅ ${file.name} · ${v.videoWidth}×${v.videoHeight} · ${sec.toFixed(1)}s · ${(file.size / 1e6).toFixed(1)}MB`;
    resumeAudioCtx().then(ctx => {
      try {
        const src = ctx.createMediaElementSource(v);
        src.connect(ctx.destination);
        src.connect(S.analyser);
        src.connect(S.exportDest);
        S.recVidAudioSource = src;
      } catch (_) {}
    }).catch(console.warn);
    S.verses = [{ text: "", numberInSurah: 1, number: 1, audio: null, audioSecondary: [], manualDuration: sec, free: true, recvid: true }];
    S.ayaDurations = [sec];
    S.currentAya = 0; S.elapsed = 0;
    // v3.3.3
    autoFitCanvasToVideo(v.videoWidth, v.videoHeight);
    if (typeof updateAyaUI === "function") updateAyaUI();
    toast(`🎥 تمّ تحميل فيديو التلاوة (${sec.toFixed(1)}s)`, "success", 2200);
  };
  v.onerror = () => toast("❌ فشل تحميل الفيديو", "error", 2500);
  S.recVidEl = v;
  S.recVidFile = file;
  if (typeof markProjectDirty === "function") markProjectDirty();
  input.value = "";
}
function removeRecVid() {
  if (S.recVidAudioSource) { try { S.recVidAudioSource.disconnect(); } catch (_) {} S.recVidAudioSource = null; }
  if (S.recVidEl) { try { S.recVidEl.pause(); S.recVidEl.src = ""; } catch (_) {} S.recVidEl = null; }
  S.recVidFile = null;
  const info = $("recvid-info"); if (info) info.textContent = "";
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
  const len = d.length;
  switch (cf) {
    case "bw":
      for (let i = 0; i < len; i += 4) {
        const g = d[i] * .3 + d[i+1] * .59 + d[i+2] * .11;
        d[i] = d[i+1] = d[i+2] = g;
      }
      break;
    case "warm":
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.min(255, d[i] * 1.12);
        d[i+2] = Math.max(0,   d[i+2] * .88);
      }
      break;
    case "cold":
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.max(0,   d[i] * .88);
        d[i+2] = Math.min(255, d[i+2] * 1.12);
      }
      break;
    case "sepia":
      for (let i = 0; i < len; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        d[i]   = Math.min(255, r * .393 + g * .769 + b * .189);
        d[i+1] = Math.min(255, r * .349 + g * .686 + b * .168);
        d[i+2] = Math.min(255, r * .272 + g * .534 + b * .131);
      }
      break;
    case "negative":
      for (let i = 0; i < len; i += 4) {
        d[i]   = 255 - d[i];
        d[i+1] = 255 - d[i+1];
        d[i+2] = 255 - d[i+2];
      }
      break;
    case "saturated":
      for (let i = 0; i < len; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const gray = r * .3 + g * .59 + b * .11;
        d[i]   = Math.min(255, Math.max(0, gray + (r - gray) * 1.6));
        d[i+1] = Math.min(255, Math.max(0, gray + (g - gray) * 1.6));
        d[i+2] = Math.min(255, Math.max(0, gray + (b - gray) * 1.6));
      }
      break;
    case "faded":
      for (let i = 0; i < len; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const gray = r * .3 + g * .59 + b * .11;
        d[i]   = Math.min(255, gray + (r - gray) * 0.4 + 20);
        d[i+1] = Math.min(255, gray + (g - gray) * 0.4 + 20);
        d[i+2] = Math.min(255, gray + (b - gray) * 0.4 + 20);
      }
      break;
    case "dreamy":
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.min(255, d[i]   * 0.85 + 38);
        d[i+1] = Math.min(255, d[i+1] * 0.85 + 38);
        d[i+2] = Math.min(255, d[i+2] * 0.85 + 50);
      }
      break;
    case "night":
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.max(0, d[i]   * 0.55);
        d[i+1] = Math.max(0, d[i+1] * 0.65);
        d[i+2] = Math.min(255, d[i+2] * 0.85 + 25);
      }
      break;
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
  // اللون مستقل عن لون الزخرفة — gold-col أولاً ثم orn-col للتوافق
  const goldEl = $("gold-col");
  const colorHex = (goldEl && goldEl.value) || $("orn-col").value || "#f0c842";
  const [r, g, b] = hex2rgb(colorHex);
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

// ===== التأثيرات الجديدة (per-pixel — قد تبطئ الواجهة عند تفعيل عدة منها معاً) =====
function applyPixelate(ctx, W, H) {
  const size = parseInt(gv("pixel-size")) || 8;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  for (let y = 0; y < H; y += size) {
    for (let x = 0; x < W; x += size) {
      const idx = (y * W + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < W && ny < H) {
            const nidx = (ny * W + nx) * 4;
            data[nidx] = r; data[nidx + 1] = g; data[nidx + 2] = b;
          }
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyMosaic(ctx, W, H) {
  const size = parseInt(gv("mosaic-size")) || 10;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  for (let y = 0; y < H; y += size) {
    for (let x = 0; x < W; x += size) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < W && ny < H) {
            const nidx = (ny * W + nx) * 4;
            rSum += data[nidx]; gSum += data[nidx + 1]; bSum += data[nidx + 2]; count++;
          }
        }
      }
      const rAvg = Math.round(rSum / count), gAvg = Math.round(gSum / count), bAvg = Math.round(bSum / count);
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < W && ny < H) {
            const nidx = (ny * W + nx) * 4;
            data[nidx] = rAvg; data[nidx + 1] = gAvg; data[nidx + 2] = bAvg;
          }
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyRipple(ctx, W, H, ts) {
  const amp = parseFloat(gv("ripple-amp")) || 5;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  const centerX = W / 2, centerY = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - centerX, dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) + Math.sin(dist * 0.05 + ts * 5) * amp * 0.1;
      const srcX = Math.round(centerX + Math.cos(angle) * dist);
      const srcY = Math.round(centerY + Math.sin(angle) * dist);
      if (srcX >= 0 && srcX < W && srcY >= 0 && srcY < H) {
        const srcIdx = (srcY * W + srcX) * 4, dstIdx = (y * W + x) * 4;
        newData[dstIdx] = data[srcIdx];
        newData[dstIdx + 1] = data[srcIdx + 1];
        newData[dstIdx + 2] = data[srcIdx + 2];
        newData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applyWave(ctx, W, H, ts) {
  const amp = parseFloat(gv("wave-amp")) || 10;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const offsetX = Math.sin(y * 0.05 + ts * 5) * amp;
      const srcX = Math.min(W - 1, Math.max(0, x + offsetX));
      const srcIdx = (y * W + srcX) * 4, dstIdx = (y * W + x) * 4;
      newData[dstIdx] = data[srcIdx];
      newData[dstIdx + 1] = data[srcIdx + 1];
      newData[dstIdx + 2] = data[srcIdx + 2];
      newData[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applySwirl(ctx, W, H) {
  const factor = parseFloat(gv("swirl-factor")) || 3;
  const centerX = W / 2, centerY = H / 2;
  const maxDist = Math.min(centerX, centerY);
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - centerX, dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const amount = (maxDist - dist) / maxDist * factor;
        const angle = Math.atan2(dy, dx) + amount;
        const srcX = Math.round(centerX + Math.cos(angle) * dist);
        const srcY = Math.round(centerY + Math.sin(angle) * dist);
        if (srcX >= 0 && srcX < W && srcY >= 0 && srcY < H) {
          const srcIdx = (srcY * W + srcX) * 4, dstIdx = (y * W + x) * 4;
          newData[dstIdx] = data[srcIdx];
          newData[dstIdx + 1] = data[srcIdx + 1];
          newData[dstIdx + 2] = data[srcIdx + 2];
          newData[dstIdx + 3] = data[srcIdx + 3];
          continue;
        }
      }
      const dstIdx = (y * W + x) * 4;
      newData[dstIdx]     = data[dstIdx];
      newData[dstIdx + 1] = data[dstIdx + 1];
      newData[dstIdx + 2] = data[dstIdx + 2];
      newData[dstIdx + 3] = data[dstIdx + 3];
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applyKaleido(ctx, W, H) {
  const segments = parseInt(gv("kaleido-segments")) || 6;
  const centerX = W / 2, centerY = H / 2;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  const angleStep = (Math.PI * 2) / segments;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - centerX, dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let angle = Math.atan2(dy, dx);
      angle = angle % (angleStep * 2);
      if (angle < 0) angle += angleStep * 2;
      if (angle > angleStep) angle = angleStep * 2 - angle;
      const srcX = Math.round(centerX + Math.cos(angle) * dist);
      const srcY = Math.round(centerY + Math.sin(angle) * dist);
      if (srcX >= 0 && srcX < W && srcY >= 0 && srcY < H) {
        const srcIdx = (srcY * W + srcX) * 4, dstIdx = (y * W + x) * 4;
        newData[dstIdx] = data[srcIdx];
        newData[dstIdx + 1] = data[srcIdx + 1];
        newData[dstIdx + 2] = data[srcIdx + 2];
        newData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applyGlitch(ctx, W, H) {
  const intensity = parseInt(gv("glitch-intensity")) || 5;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const shift = Math.floor(intensity / 2);
  for (let y = 0; y < H; y += intensity * 2) {
    const offset = (Math.random() - 0.5) * shift;
    for (let x = 0; x < W; x++) {
      const srcX = Math.min(W - 1, Math.max(0, x + offset));
      const srcIdx = (y * W + srcX) * 4, dstIdx = (y * W + x) * 4;
      data[dstIdx]     = data[srcIdx];
      data[dstIdx + 1] = data[srcIdx + 1];
      data[dstIdx + 2] = data[srcIdx + 2];
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyOldFilm(ctx, W, H, ts) {
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, data[i]     * 0.9 + 20);
    data[i + 1] = Math.min(255, data[i + 1] * 0.7 + 10);
    data[i + 2] = Math.min(255, data[i + 2] * 0.5 + 5);
    data[i]     += (Math.random() - 0.5) * 15;
    data[i + 1] += (Math.random() - 0.5) * 15;
    data[i + 2] += (Math.random() - 0.5) * 15;
  }
  if (Math.random() < 0.02) {
    const scratchY = Math.floor(Math.random() * H);
    for (let x = 0; x < W; x++) {
      const idx = (scratchY * W + x) * 4;
      for (let c = 0; c < 3; c++) data[idx + c] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ══════════════════════════════════════════════════════
//  LOGO
// ══════════════════════════════════════════════════════
const LOGO_PERSIST_KEY = "gt_sqr_logo_v1";

function onLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const isVideo = /\.(mov|mp4|webm)$/i.test(file.name) || file.type.startsWith("video/");

  if (S.logoVid) { try { S.logoVid.pause(); } catch (_) {} S.logoVid = null; }
  S.logoImg = null;

  if (isVideo) {
    const vid = document.createElement("video");
    vid.src = url;
    vid.loop = true; vid.muted = true; vid.playsInline = true; vid.autoplay = true;
    vid.onloadeddata = () => {
      S.logoVid = vid;
      vid.play().catch(() => {});
      $("logo-preview").style.display = "block";
      $("logo-img-preview").src = "";
      $("logo-vid-preview").src = url;
      $("logo-vid-preview").style.display = "block";
      $("logo-img-preview").style.display = "none";
      toast("✅ شعار فيديو تم تحميله (الفيديو لا يُحفظ — حجمه كبير)", "info", 5000);
      try { localStorage.removeItem(LOGO_PERSIST_KEY); } catch (_) {}
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
      toast("✅ تم تحميل الشعار — سيُحفظ تلقائياً للمشاريع القادمة", "success");
    };
    img.onerror = () => toast("❌ فشل تحميل الصورة", "error");
    img.src = url;

    // احفظ الشعار كـ dataURL لاستعادته في الجلسات القادمة
    const fr = new FileReader();
    fr.onload = () => {
      try { localStorage.setItem(LOGO_PERSIST_KEY, fr.result); }
      catch (e) {
        console.warn("Logo too large for localStorage:", e);
        toast("⚠️ الشعار يعمل لهذه الجلسة لكن حجمه يتجاوز سعة الحفظ — لن يُستعاد لاحقاً", "info", 4000);
      }
    };
    fr.readAsDataURL(file);
  }
}

function removeLogo() {
  if (S.logoVid) { try { S.logoVid.pause(); } catch (_) {} S.logoVid = null; }
  S.logoImg = null;
  $("logo-preview").style.display = "none";
  $("logo-upload").value = "";
  try { localStorage.removeItem(LOGO_PERSIST_KEY); } catch (_) {}
  toast("🗑️ تمت إزالة الشعار", "info");
}

function restoreLogo() {
  let dataUrl = null;
  try { dataUrl = localStorage.getItem(LOGO_PERSIST_KEY); } catch (_) {}
  if (!dataUrl) return;
  const img = new Image();
  img.onload = () => {
    S.logoImg = img;
    const prevEl = $("logo-preview");
    const imgPrev = $("logo-img-preview");
    const vidPrev = $("logo-vid-preview");
    if (prevEl) prevEl.style.display = "block";
    if (imgPrev) { imgPrev.src = dataUrl; imgPrev.style.display = "block"; }
    if (vidPrev) vidPrev.style.display = "none";
  };
  img.onerror = () => { try { localStorage.removeItem(LOGO_PERSIST_KEY); } catch (_) {} };
  img.src = dataUrl;
}

function drawLogo(ctx, W, H) {
  const src = S.logoVid || S.logoImg;
  if (!src) return;

  const pos = $("logo-pos").value;
  const size = parseInt(gv("logo-size")) || 60;
  const opacity = (parseInt(gv("logo-opacity")) || 80) / 100;

  if (S.logoVid && S.logoVid.readyState < 2) return;

  const natW = src.naturalWidth || src.videoWidth || size;
  const natH = src.naturalHeight || src.videoHeight || size;

  let drawW = size;
  let drawH = natH / natW * size;
  if (drawH > size * 2.5) { drawH = size; drawW = natW / natH * size; }

  let x, y;
  const pad = 15;
  switch (pos) {
    case "br": x = W - drawW - pad; y = H - drawH - pad; break;
    case "bl": x = pad; y = H - drawH - pad; break;
    case "tr": x = W - drawW - pad; y = pad; break;
    case "tl": x = pad; y = pad; break;
    case "center": x = (W - drawW) / 2; y = (H - drawH) / 2; break;
    default: x = W - drawW - pad; y = H - drawH - pad;
  }

  // v3.2 — Chromakey للشعار
  const chromaOn = ge("logo-chroma-on");
  if (chromaOn) {
    const tmp = getLogoChromaCanvas(Math.ceil(drawW), Math.ceil(drawH));
    const tctx = tmp.getContext("2d", { willReadFrequently: true });
    tctx.clearRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(src, 0, 0, drawW, drawH);
    removeBgColorFromRegion(tctx, 0, 0, Math.ceil(drawW), Math.ceil(drawH), {
      colorHex: $("logo-chroma-color")?.value || "#ffffff",
      threshold: parseFloat(gv("logo-chroma-threshold")) || 25,
      softness: parseFloat(gv("logo-chroma-softness")) || 10,
    });
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(tmp, x, y);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(src, x, y, drawW, drawH);
    ctx.restore();
  }
}

let _logoChromaCanvas = null;
function getLogoChromaCanvas(w, h) {
  if (!_logoChromaCanvas) _logoChromaCanvas = document.createElement("canvas");
  if (_logoChromaCanvas.width !== w) _logoChromaCanvas.width = w;
  if (_logoChromaCanvas.height !== h) _logoChromaCanvas.height = h;
  return _logoChromaCanvas;
}

// ══════════════════════════════════════════════════════
//  VERSE RENDERING
// ══════════════════════════════════════════════════════
// ── رسم اسم السورة في أعلى المقطع ─────────────────
// v3.1 — عنوان مخصّص للمقطع
function drawVideoTitle(ctx, W, H) {
  if (!ge("vtitle-on")) return;
  const text = ($("vtitle-text")?.value || "").trim();
  if (!text) return;
  const font = fontVal();
  const fsz = W * 0.055 * ((parseFloat(gv("vtitle-size")) || 90) / 100);
  const yPct = parseFloat(gv("vtitle-y")) || 6;
  const y = (yPct / 100) * H + fsz;
  const col = $("vtitle-col")?.value || "#ffe082";
  const fx = $("vtitle-fx")?.value || "shadow";
  ctx.save();
  ctx.font = `bold ${fsz}px ${font}`;
  ctx.fillStyle = col;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  if (fx === "shadow") {
    ctx.shadowColor = "rgba(0,0,0,.75)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    ctx.fillText(text, W / 2, y);
  } else if (fx === "glow") {
    ctx.shadowColor = col; ctx.shadowBlur = 24;
    ctx.fillText(text, W / 2, y);
    ctx.shadowBlur = 0; ctx.fillText(text, W / 2, y);
  } else if (fx === "outline") {
    ctx.lineJoin = "round"; ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(2, fsz * 0.06);
    ctx.strokeStyle = "rgba(0,0,0,.85)";
    ctx.strokeText(text, W / 2, y);
    ctx.fillText(text, W / 2, y);
  } else {
    ctx.fillText(text, W / 2, y);
  }
  ctx.restore();
}

function drawSurahName(ctx, W, H) {
  if (!ge("sname-on")) return;
  if (!S.surahs || !S.surahs.length) return;
  const surahNum = parseInt($("surah-sel")?.value) || 1;
  const surah = S.surahs.find(s => s.number === surahNum);
  if (!surah) return;

  const prefix = $("sname-prefix")?.value || "surah";
  const rawName = surah.name || "";
  const cleanName = rawName.replace(/^\s*(?:سُورَةُ|سُورَة|سُورة|سورة)\s+/u, "");
  const label = prefix === "surah" ? `سُورَةُ ${cleanName}`
              : prefix === "hizb"  ? `حِزْبُ ${cleanName}`
              :                       cleanName;

  const font = fontVal();
  const fsz = W * 0.05 * ((parseFloat(gv("sname-size")) || 80) / 100);
  const yPct = parseFloat(gv("sname-y")) || 5;
  const y = (yPct / 100) * H + fsz;
  const col = $("sname-col")?.value || "#f0c842";

  ctx.save();
  ctx.font = `bold ${fsz}px ${font}`;
  ctx.fillStyle = col;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.shadowColor = "rgba(0,0,0,.7)";
  ctx.shadowBlur = 10;
  ctx.fillText(label, W / 2, y);
  ctx.restore();
}

function drawVerse(ctx, W, H, ts) {
  const aya = S.verses[S.currentAya]; if (!aya) return;
  const font = fontVal();
  const txtCol = $("txt-col").value;
  const shdCol = $("shd-col").value;
  const fsz = W * .062 * (gv("fsize") / 100);
  const lh = parseFloat(gv("lh"));
  const tpos = radioVal("tpos");
  const textEff = radioVal("te");
  let animType = radioVal("tanim");
  // في وضع "مختلط": اختر التأثير الفعلي للآية الحالية
  if (animType === "mix") animType = getMixedAnimForCurrentAya();
  const dur = S.ayaDurations[S.currentAya] || 6;

  let alpha = 1;
  let trX = 0, trY = 0, scX = 1, scY = 1, blurPx = 0, glowBoost = 0;

  if (animType !== "none" && animType !== "word") {
    const w = (S.elapsed % dur) / dur;
    const easeIn = (p) => 1 - Math.pow(1 - p, 3);
    const IN_END = 0.15, OUT_START = 0.85;

    if (animType === "fade") {
      if (w < IN_END)        alpha = w / IN_END;
      else if (w > OUT_START) alpha = (1 - w) / (1 - OUT_START);
    }
    else if (animType === "slide") {
      if (w < IN_END) {
        const p = w / IN_END; alpha = p;
        trX = (1 - easeIn(p)) * W * 0.4;
      } else if (w > OUT_START) {
        const p = (1 - w) / (1 - OUT_START); alpha = p;
        trX = -(1 - p) * W * 0.4;
      }
    }
    else if (animType === "zoom") {
      if (w < IN_END) {
        const p = w / IN_END; alpha = p;
        scX = scY = 0.55 + 0.45 * easeIn(p);
      } else if (w > OUT_START) {
        const p = (1 - w) / (1 - OUT_START); alpha = p;
        scX = scY = 1 + (1 - p) * 0.35;
      }
    }
    else if (animType === "drop") {
      if (w < IN_END) {
        const p = w / IN_END; alpha = p;
        trY = -(1 - easeIn(p)) * H * 0.25;
      } else if (w > OUT_START) alpha = (1 - w) / (1 - OUT_START);
    }
    else if (animType === "rise") {
      if (w < IN_END) {
        const p = w / IN_END; alpha = p;
        trY = (1 - easeIn(p)) * H * 0.25;
      } else if (w > OUT_START) alpha = (1 - w) / (1 - OUT_START);
    }
    else if (animType === "blur") {
      if (w < IN_END) {
        const p = w / IN_END; alpha = p;
        blurPx = (1 - p) * 18;
      } else if (w > OUT_START) {
        const p = (1 - w) / (1 - OUT_START); alpha = p;
        blurPx = (1 - p) * 12;
      }
    }
    else if (animType === "glow") {
      if (w < IN_END) alpha = w / IN_END;
      else if (w > OUT_START) alpha = (1 - w) / (1 - OUT_START);
      glowBoost = 12 + 16 * (0.5 + 0.5 * Math.sin(ts * 4));
    }
  }

  ctx.save();
  ctx.textAlign = "center"; ctx.direction = "rtl";
  ctx.globalAlpha = alpha;
  if (blurPx > 0.5) ctx.filter = `blur(${blurPx}px)`;
  if (trX || trY || scX !== 1 || scY !== 1) {
    ctx.translate(W / 2, H / 2);
    ctx.translate(trX, trY);
    ctx.scale(scX, scY);
    ctx.translate(-W / 2, -H / 2);
  }
  ctx.font = `${fsz}px ${font}`; ctx.fillStyle = txtCol;
  const drawTxt = setTextFx(ctx, textEff, txtCol, shdCol);
  if (glowBoost) ctx.shadowBlur = (ctx.shadowBlur || 0) + glowBoost;

  const lines = wrapText(ctx, aya.text, W * .85, fsz, font);
  const lineH = fsz * lh, totalH = lines.length * lineH;
  const hasT = S.translations[S.currentAya];
  let startY;
  if (tpos === "top") startY = H * .1 + fsz;
  else if (tpos === "bottom") startY = H * .82 - totalH + fsz;
  else startY = H * .5 - totalH * (hasT ? .4 : .5) + fsz;

  if (animType === "word") {
    drawWordByWord(ctx, lines, W, startY, lineH, fsz, font, txtCol, dur, drawTxt);
  } else {
    lines.forEach((line, i) => drawTxt(W / 2, startY + i * lineH, line));
  }

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

  ctx.globalAlpha = alpha * .6;
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  ctx.font = `bold ${W * .022}px 'Cairo'`;
  ctx.fillStyle = $("orn-col").value;
  ctx.fillText(`❴ ${aya.numberInSurah} ❵`, W / 2, startY + totalH + (hasT ? 0 : W * .04));

  ctx.restore();
}

// ── الكشف التدريجي للكلمات ─────────────────────────────
function drawWordByWord(ctx, lines, W, startY, lineH, fsz, font, txtCol, dur, drawTxt) {
  const fadeMs = parseInt(gv("word-fade-ms") || "180");
  const keepPrev = ge("word-keep");
  const paceVal = $("word-pace")?.value || "auto";

  const wordList = [];
  lines.forEach((line, lineIdx) => {
    const words = line.split(/\s+/).filter(Boolean);
    words.forEach((w, wIdx) => wordList.push({ text: w, lineIdx, wIdx }));
  });

  const N = wordList.length;
  if (N === 0) return;

  const wordDuration = (paceVal === "auto") ? (dur / N) : parseFloat(paceVal);
  const spaceW = ctx.measureText(" ").width;

  const linePositions = lines.map(line => {
    const words = line.split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const widths = words.map(w => ctx.measureText(w).width);
    const lineW = widths.reduce((a, b) => a + b, 0) + spaceW * (words.length - 1);
    const xRight = W / 2 + lineW / 2;
    const xs = [];
    let cur = xRight;
    for (let i = 0; i < words.length; i++) { xs.push(cur); cur -= widths[i] + spaceW; }
    return xs;
  });

  const oldAlign = ctx.textAlign;
  ctx.textAlign = "right";

  for (let k = 0; k < N; k++) {
    const wordStart = k * wordDuration;
    if (S.elapsed < wordStart) continue;
    if (!keepPrev) {
      const wordEnd = wordStart + wordDuration;
      if (S.elapsed >= wordEnd) continue;
    }
    const sinceStart = S.elapsed - wordStart;
    let a = 1;
    if (fadeMs > 0 && sinceStart * 1000 < fadeMs) a = (sinceStart * 1000) / fadeMs;
    if (!keepPrev) {
      const fadeOutStart = wordDuration - fadeMs / 1000;
      if (fadeMs > 0 && sinceStart > fadeOutStart) {
        a = Math.min(a, (wordDuration - sinceStart) / (fadeMs / 1000));
      }
    }
    a = Math.max(0, Math.min(1, a));

    const w = wordList[k];
    const xs = linePositions[w.lineIdx];
    if (!xs) continue;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = txtCol;
    if (typeof drawTxt === "function") drawTxt(xs[w.wIdx], startY + w.lineIdx * lineH, w.text);
    else                                ctx.fillText(w.text, xs[w.wIdx], startY + w.lineIdx * lineH);
    ctx.restore();
  }
  ctx.textAlign = oldAlign;
}

function onTanimChange() {
  const v = radioVal("tanim");
  const wordCtrl = $("word-mode-ctrl");
  if (wordCtrl) wordCtrl.style.display = (v === "word" || (v === "mix" && S.mixedAnimsOrder.includes("word"))) ? "block" : "none";
  // عدة لوحات mix-anims-ctrl (في النصوص + FX) — أظهرها كلها
  document.querySelectorAll(".mix-anims-ctrl").forEach(el => {
    el.style.display = v === "mix" ? "block" : "none";
  });
  // مزامنة كل راديوهات tanim (في القسمَين) مع بعضها
  document.querySelectorAll(`input[name="tanim"]`).forEach(r => { r.checked = (r.value === v); });
}

// ── إدارة وضع "مختلط" ────────────────────────────────
function onMixAnimChange(e) {
  const v = e.target.value;
  const order = S.mixedAnimsOrder;
  if (e.target.checked) {
    if (!order.includes(v)) order.push(v);
  } else {
    const idx = order.indexOf(v);
    if (idx >= 0) order.splice(idx, 1);
  }
  updateMixAnimsUI();
  try { localStorage.setItem("gt_sqr_mixed_anims", JSON.stringify(order)); } catch (_) {}
  onTanimChange();
}

function updateMixAnimsUI() {
  const order = S.mixedAnimsOrder;
  document.querySelectorAll(".mix-anim").forEach(cb => {
    const idx = order.indexOf(cb.value);
    cb.checked = idx >= 0;
    const numEl = cb.parentElement.querySelector(".mix-num");
    if (numEl) numEl.textContent = idx >= 0 ? `[${idx + 1}]` : "";
  });
  const labels = { fade:"تلاشي", slide:"انزلاق", zoom:"تكبير", drop:"سقوط", rise:"صعود", blur:"ضبابي", glow:"توهج", word:"كلمة-بكلمة" };
  const text = order.length
    ? "الترتيب: " + order.map((v, i) => `${i+1}. ${labels[v] || v}`).join(" ← ")
    : "— اختر تأثيراً أو أكثر —";
  document.querySelectorAll(".mix-anims-summary").forEach(el => { el.textContent = text; });
}

function getMixedAnimForCurrentAya() {
  const order = S.mixedAnimsOrder;
  if (!order.length) return "fade";
  return order[(S.currentAya || 0) % order.length];
}

function restoreMixedAnimsOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem("gt_sqr_mixed_anims") || "[]");
    if (Array.isArray(saved)) S.mixedAnimsOrder = saved.filter(v => typeof v === "string");
  } catch (_) {}
  updateMixAnimsUI();
}

// ── تأثيرات النص — يُهيِّئ ctx ويُرجع دالة رسم تتعامل
//    مع التأثيرات التي تحتاج عدة fillText/strokeText
function setTextFx(ctx, eff, txtCol, shdCol) {
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  const [sr, sg, sb] = hex2rgb(shdCol);
  const simple = (x, y, text) => ctx.fillText(text, x, y);

  switch (eff) {
    case "glow":
      ctx.shadowColor = "#f0c842"; ctx.shadowBlur = 28;
      return simple;
    case "neon":
      ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 22;
      return (x, y, text) => { ctx.fillText(text, x, y); ctx.fillText(text, x, y); };
    case "outline":
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        ctx.save();
        ctx.lineJoin = "round"; ctx.miterLimit = 2;
        ctx.strokeStyle = shdCol || "#000";
        ctx.lineWidth = Math.max(3, fontSize * 0.08);
        ctx.strokeText(text, x, y);
        ctx.restore();
        ctx.fillText(text, x, y);
      };
    case "shadow3d":
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        const layers = 10;
        const maxOff = Math.max(3, fontSize * 0.09);
        const oldFill = ctx.fillStyle;
        for (let i = layers; i >= 1; i--) {
          const p = i / layers;
          const off = maxOff * p;
          ctx.fillStyle = `rgba(${sr},${sg},${sb},${0.55 * p})`;
          ctx.fillText(text, x + off, y + off);
        }
        ctx.fillStyle = oldFill;
        ctx.fillText(text, x, y);
      };
    case "emboss":
      return (x, y, text) => {
        const oldFill = ctx.fillStyle;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(text, x - 1.5, y - 1.5);
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillText(text, x + 1.5, y + 1.5);
        ctx.fillStyle = oldFill;
        ctx.fillText(text, x, y);
      };
    case "carved":
      return (x, y, text) => {
        const oldFill = ctx.fillStyle;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillText(text, x - 1.5, y - 1.5);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(text, x + 1.5, y + 1.5);
        ctx.fillStyle = oldFill;
        ctx.globalCompositeOperation = "multiply";
        ctx.fillText(text, x, y);
        ctx.globalCompositeOperation = "source-over";
      };
    case "gold":
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        const grad = ctx.createLinearGradient(x, y - fontSize, x, y + fontSize * 0.2);
        grad.addColorStop(0,    "#fff5b0");
        grad.addColorStop(0.3,  "#f0c842");
        grad.addColorStop(0.55, "#b8860b");
        grad.addColorStop(0.8,  "#f0c842");
        grad.addColorStop(1,    "#fff5b0");
        const oldFill = ctx.fillStyle;
        ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 6;
        ctx.fillStyle = grad;
        ctx.fillText(text, x, y);
        ctx.fillStyle = oldFill;
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      };
    case "fire":
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        const grad = ctx.createLinearGradient(x, y + fontSize * 0.3, x, y - fontSize);
        grad.addColorStop(0,   "#7a0000");
        grad.addColorStop(0.3, "#e63b00");
        grad.addColorStop(0.7, "#ffb700");
        grad.addColorStop(1,   "#fff5b0");
        const oldFill = ctx.fillStyle;
        ctx.shadowColor = "rgba(230,59,0,.7)"; ctx.shadowBlur = 18;
        ctx.fillStyle = grad;
        ctx.fillText(text, x, y);
        ctx.fillStyle = oldFill;
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      };
    case "soft":
      ctx.shadowColor = `rgba(${sr},${sg},${sb},.5)`; ctx.shadowBlur = 16;
      return simple;
    case "none":
    default:
      ctx.shadowColor = `rgba(${sr},${sg},${sb},.7)`; ctx.shadowBlur = 12;
      return simple;
  }
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
  // أثناء تصدير V2: استخدم بيانات FFT المُحسوبة مسبقاً من mixed buffer
  if (S._exportWaveData) {
    S.waveData = S._exportWaveData;
    return;
  }
  if (S.analyser) {
    const full = new Uint8Array(S.analyser.frequencyBinCount);
    S.analyser.getByteFrequencyData(full);
    if (full.some(v => v > 15)) {
      const voiceStart = 1;
      const voiceEnd = Math.min(35, full.length - 1);
      const voiceBins = full.slice(voiceStart, voiceEnd + 1);
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
    for (let i = 0; i < n; i++) {
      const f = i / n;
      const fund = Math.exp(-Math.pow(f - 0.25, 2) / 0.018) * 0.90;
      const harm1 = Math.exp(-Math.pow(f - 0.48, 2) / 0.022) * 0.70;
      const harm2 = Math.exp(-Math.pow(f - 0.70, 2) / 0.025) * 0.45;
      const sublow = f < 0.10 ? (1 - f / 0.10) * 0.55 : 0;
      const envelope = fund + harm1 + harm2 + sublow;
      const pulse = 0.65 + 0.35 * Math.sin(ts * 4.2 + i * 0.4);
      const slow = 0.55 + 0.45 * Math.sin(ts * 1.3 + i * 0.2 + 1.1);
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
  const gain = (parseInt(gv("wave-gain")) || 100) / 100;
  const wh = parseInt(gv("wave-h")) * gain;
  const n = S.waveData.length;
  const [cr, cg, cb] = hex2rgb(col);

  ctx.save();

  const BASE = pos === "top" ? 4 + wh : H - 4;
  const SIGN = pos === "top" ? 1 : -1;

  if (shape === "bars") {
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const alpha = 0.4 + 0.55 * (S.waveData[i] / 255);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      const yTop = BASE + SIGN * bh;
      ctx.fillRect(i * bw, yTop, bw * 0.78, bh);
    }
  } else if (shape === "wave") {
    ctx.lineWidth = 2.2; ctx.globalAlpha = 0.85;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.18;
    ctx.beginPath(); ctx.moveTo(0, BASE); ctx.lineTo(W, BASE); ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const x = i * (W / n);
      const y = BASE + SIGN * bh;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = col;
    ctx.lineTo(W, BASE); ctx.lineTo(0, BASE); ctx.closePath(); ctx.fill();
  } else if (shape === "dots") {
    for (let i = 0; i < n; i += 2) {
      const bh = (S.waveData[i] / 255) * wh;
      const x = i * (W / n) + (W / n);
      const y = BASE + SIGN * bh;
      const r = 1.8 + (S.waveData[i] / 255) * 3.2;
      ctx.globalAlpha = 0.55 + 0.4 * (S.waveData[i] / 255);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x - 1, Math.min(y, BASE), 2, bh);
    }
  } else if (shape === "mirror") {
    const cy = pos === "top" ? 4 + wh / 2 : H - 4 - wh / 2;
    const hw = wh / 2;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.9)`;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy - bh);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.6)`;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy + bh);
    }
    ctx.stroke();
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
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.09;
    ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const amp = (S.waveData[idx] / 255) * wh * 0.5;
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
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const hue = (i / n) * 200 + 140;
      const alpha = 0.35 + 0.6 * (S.waveData[i] / 255);
      ctx.fillStyle = `hsla(${hue},80%,62%,${alpha})`;
      const yTop = BASE + SIGN * bh;
      ctx.fillRect(i * bw, yTop, bw * 0.82, bh);
      if (bh > 4) {
        ctx.fillStyle = `hsla(${hue},100%,90%,${alpha * 0.75})`;
        ctx.fillRect(i * bw, yTop, bw * 0.82, 2);
      }
    }
  } else if (shape === "rays") {
    const cx = W / 2;
    const cy = (pos === "top") ? 4 + wh : H - 4;
    ctx.lineWidth = 2; ctx.lineCap = "round";
    const halfArc = Math.PI * 0.85;
    const startAngle = (pos === "top") ? (Math.PI / 2 - halfArc / 2) : (-Math.PI / 2 - halfArc / 2);
    for (let i = 0; i < n; i++) {
      const amp = (S.waveData[i] / 255) * wh;
      const alpha = 0.4 + 0.55 * (S.waveData[i] / 255);
      const a = startAngle + (i / (n - 1)) * halfArc;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * amp, cy + Math.sin(a) * amp);
      ctx.stroke();
    }
  } else if (shape === "triangles") {
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      if (bh < 1) continue;
      const alpha = 0.45 + 0.5 * (S.waveData[i] / 255);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      const cxBar = i * bw + bw * 0.5;
      const yTip = BASE + SIGN * bh;
      ctx.beginPath();
      ctx.moveTo(cxBar - bw * 0.4, BASE);
      ctx.lineTo(cxBar + bw * 0.4, BASE);
      ctx.lineTo(cxBar, yTip);
      ctx.closePath(); ctx.fill();
    }
  } else if (shape === "rings") {
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.06;
    const numRings = Math.min(n, 12);
    for (let r = 0; r < numRings; r++) {
      const idx = Math.floor((r / numRings) * n);
      const amp = (S.waveData[idx] / 255) * wh * 0.6;
      const radius = baseR + r * (Math.min(W, H) * 0.025) + amp;
      const alpha = (0.4 + 0.5 * (S.waveData[idx] / 255)) * (1 - r / numRings);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.lineWidth = 1.5 + 1.5 * (S.waveData[idx] / 255);
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (shape === "mountains") {
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.18)`;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.9)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, BASE);
    const step = W / (n - 1);
    for (let i = 0; i < n - 1; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const nb = (S.waveData[i + 1] / 255) * wh;
      const x = i * step, y = BASE + SIGN * bh;
      const xN = (i + 1) * step, yN = BASE + SIGN * nb;
      const cpX = (x + xN) / 2;
      ctx.quadraticCurveTo(cpX, y, xN, yN);
    }
    ctx.lineTo(W, BASE);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
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
//  AUDIO
// ══════════════════════════════════════════════════════
function ensureAudioCtx() {
  if (!S.audioCtx || S.audioCtx.state === "closed") {
    S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    S.exportDest = S.audioCtx.createMediaStreamDestination();
    S.analyser = S.audioCtx.createAnalyser();
    S.analyser.fftSize = 512;
    S.analyser.smoothingTimeConstant = .82;
    S.analyser.connect(S.exportDest);
  }
  return S.audioCtx;
}

async function resumeAudioCtx() {
  const ctx = ensureAudioCtx();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

let _recGen = 0;

async function playRecitationAudio() {
  if (S.exporting) return;
  stopRecitationAudio();
  if (!S.verses.length || !S.playing) return;
  const aya = S.verses[S.currentAya];
  if (!aya) return;

  const myGen = ++_recGen;
  const surahNum = parseInt($("surah-sel").value) || 1;
  const reciter = S.reciters.find(r => r.id === radioVal("reciter")) || S.reciters[0];
  const url = buildAudioUrl(reciter.folder, surahNum, aya.numberInSurah);
  $("audio-status").textContent = `⏳ جاري التحميل — ${reciter.name} الآية ${aya.numberInSurah}`;

  const onEnded = () => {
    if (!S.playing || myGen !== _recGen) return;
    // الانتظار حسب فاصل الصمت قبل الانتقال للآية التالية
    const gap = getAyaGap();
    const advance = () => {
      if (!S.playing || myGen !== _recGen) return;
      if (S.currentAya < S.verses.length - 1) {
        S.currentAya++; S.elapsed = 0; playRecitationAudio(); updateAyaUI();
      } else {
        pausePlayer(); S.currentAya = 0; S.elapsed = 0; updateAyaUI();
      }
    };
    if (gap > 0) setTimeout(advance, gap * 1000);
    else advance();
  };

  try {
    const ctx = await resumeAudioCtx();
    if (myGen !== _recGen) return;

    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const arrayBuf = await res.arrayBuffer();
    if (myGen !== _recGen) return;

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
    console.warn("AudioBuffer fetch failed, using HTMLAudioElement:", err.message);
    const a = new Audio();
    a.crossOrigin = null;
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

// ── تقطيع نطاق زمني للوسائط المحلية ───────────────────
function getBgVidTrim() {
  if (!ge("bg-vid-trim-on") || !S.bgVid) return null;
  const s = Math.max(0, parseFloat(gv("bg-vid-trim-start")) || 0);
  const e = Math.max(s + 0.1, parseFloat(gv("bg-vid-trim-end")) || s + 1);
  const dur = S.bgVid.duration;
  return { start: s, end: isFinite(dur) ? Math.min(e, dur) : e };
}
function getBgAudioTrim() {
  if (!ge("bg-audio-trim-on") || !S.bgAudioEl) return null;
  const s = Math.max(0, parseFloat(gv("bg-audio-trim-start")) || 0);
  const e = Math.max(s + 0.1, parseFloat(gv("bg-audio-trim-end")) || s + 1);
  const dur = S.bgAudioEl.duration;
  return { start: s, end: isFinite(dur) ? Math.min(e, dur) : e };
}
function applyBgVidTrim() {
  const t = getBgVidTrim();
  if (!t || !S.bgVid) return;
  if (S.bgVid.currentTime < t.start || S.bgVid.currentTime > t.end) {
    try { S.bgVid.currentTime = t.start; } catch (_) {}
  }
  if (!S.bgVid._trimHandler) {
    S.bgVid._trimHandler = () => {
      const tt = getBgVidTrim();
      if (!tt) return;
      if (S.bgVid.currentTime >= tt.end - 0.05) {
        try { S.bgVid.currentTime = tt.start; } catch (_) {}
      }
    };
    S.bgVid.addEventListener("timeupdate", S.bgVid._trimHandler);
  }
}
function applyBgAudioTrim() {
  const t = getBgAudioTrim();
  if (!t || !S.bgAudioEl) return;
  if (S.bgAudioEl.currentTime < t.start || S.bgAudioEl.currentTime > t.end) {
    try { S.bgAudioEl.currentTime = t.start; } catch (_) {}
  }
  if (!S.bgAudioEl._trimHandler) {
    S.bgAudioEl._trimHandler = () => {
      const tt = getBgAudioTrim();
      if (!tt) return;
      if (S.bgAudioEl.currentTime >= tt.end - 0.05) {
        try { S.bgAudioEl.currentTime = tt.start; } catch (_) {}
      }
    };
    S.bgAudioEl.addEventListener("timeupdate", S.bgAudioEl._trimHandler);
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
  S.bgAudioFile = file; // v3.1
  if (typeof markProjectDirty === "function") markProjectDirty();
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
  if (type === "image") {
    const file = input.files[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { S.bgImg = img; toast("🖼️ تم تحميل الصورة", "success"); };
    img.onerror = () => toast("❌ فشل تحميل الصورة", "error");
    img.src = url;
    S.bgImgFile = file; // v3.1
    if (typeof markProjectDirty === "function") markProjectDirty();
    const thumb = $("bg-img-thumb");
    $("bg-img-preview").src = url;
    thumb.style.display = "block";
  } else {
    // رفع متعدد للفيديو
    const files = Array.from(input.files || []);
    if (!files.length) return;
    files.forEach(f => addBgVidItem(f));
    input.value = "";
  }
}

// ── إدارة قائمة مقاطع الخلفية (playlist) — مطابق لنسخة المكتبية ──
function addBgVidItem(file) {
  const url = URL.createObjectURL(file);
  const vid = document.createElement("video");
  vid.src = url; vid.muted = true; vid.playsInline = true; vid.preload = "auto";
  vid.addEventListener("ended", () => switchToNextBgVid());
  vid.onloadeddata = () => {
    const item = {
      file, vid, name: file.name,
      dur: isFinite(vid.duration) ? vid.duration : 0,
      url,
      audioEnabled: false,   // الصوت معطّل افتراضياً
      audioGain: 0.5,        // 50%
      audioBuffer: null,     // يُفكّ ترميزه عند تفعيل الصوت (lazy)
    };
    S.bgVidItems.push(item);
    if (typeof markProjectDirty === "function") markProjectDirty();
    if (!S.bgVid) {
      S.bgVid = vid;
      S.bgVidActiveIdx = S.bgVidItems.length - 1;
      const thumb = $("bg-vid-thumb"); if (thumb) thumb.style.display = "block";
      const prev = $("bg-vid-preview"); if (prev) prev.src = url;
      // الفيديو يبقى متوقفاً عند الرفع — يُشغَّل فقط مع ضغط ▶️
      // (متناغم مع play/pause/next/prev للآيات)
      try { vid.pause(); vid.currentTime = 0; } catch (_) {}
    }
    renderBgVidList();
    if (S.bgVidItems.length === 1) {
      toast("🎥 تم رفع المقطع — يمكن إضافة المزيد لتتابع الخلفيات", "success", 3500);
    } else {
      toast(`🎥 أُضيف المقطع (${S.bgVidItems.length} مجموع)`, "success", 2000);
    }
  };
  vid.onerror = () => toast(`❌ فشل تحميل ${file.name}`, "error");
  vid.load();
}

function switchToNextBgVid() {
  if (S.bgVidItems.length < 2) {
    if (S.bgVid) { try { S.bgVid.currentTime = 0; S.bgVid.play().catch(() => {}); } catch (_) {} }
    return;
  }
  const nextIdx = (S.bgVidActiveIdx + 1) % S.bgVidItems.length;
  // مهم: لا تُعِد currentTime — التالي يلعب فعلاً منذ crossfade
  // (إعادته كانت تسبّب rewind مرئياً بقدر مدة الـ crossfade)
  const active = S.bgVidItems[nextIdx];
  S.bgVidActiveIdx = nextIdx;
  S.bgVid = active.vid;
  S.bgVidNext = null;
  S.bgVidFadeProgress = 0;
  // ضمان استمرار التشغيل إن كان توقّف لسبب ما
  if (S.playing || S._exportingV2) {
    try { active.vid.play().catch(() => {}); } catch (_) {}
  }
}

// ── Crossfade سلس قبل انتهاء المقطع — مدة قابلة للضبط + easing ──
function getCrossfadeDur() {
  const ms = parseInt(gv("bg-crossfade-ms") || "1000");
  return Math.max(0, ms) / 1000;
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function updateBgVidCrossfade() {
  if (!S.bgVid || S.bgVidItems.length < 2) {
    S.bgVidNext = null; S.bgVidFadeProgress = 0; return;
  }
  const cur = S.bgVid;
  if (!isFinite(cur.duration) || cur.duration <= 0) return;

  const xf = getCrossfadeDur();
  if (xf <= 0) { S.bgVidNext = null; S.bgVidFadeProgress = 0; return; }

  const trim = (typeof getBgVidTrim === "function") ? getBgVidTrim() : null;
  const endPoint = trim ? trim.end : cur.duration;
  const remaining = endPoint - cur.currentTime;

  if (remaining <= xf && remaining > 0) {
    const nextIdx = (S.bgVidActiveIdx + 1) % S.bgVidItems.length;
    const nextItem = S.bgVidItems[nextIdx];
    if (S.bgVidNext !== nextItem.vid) {
      S.bgVidNext = nextItem.vid;
      try { nextItem.vid.currentTime = 0; nextItem.vid.play().catch(() => {}); } catch (_) {}
    }
    const linear = Math.max(0, Math.min(1, 1 - (remaining / xf)));
    S.bgVidFadeProgress = easeInOutCubic(linear);
  } else {
    S.bgVidNext = null;
    S.bgVidFadeProgress = 0;
  }
}

function activateBgVidByIndex(idx, resetTime = true) {
  if (!S.bgVidItems.length) {
    S.bgVid = null; S.bgVidActiveIdx = 0;
    const prev = $("bg-vid-preview"); if (prev) prev.src = "";
    return;
  }
  idx = Math.max(0, Math.min(idx, S.bgVidItems.length - 1));
  if (S.bgVid) { try { S.bgVid.pause(); } catch (_) {} }
  const item = S.bgVidItems[idx];
  S.bgVidActiveIdx = idx;
  S.bgVid          = item.vid;
  const prev = $("bg-vid-preview");
  if (prev) prev.src = item.url;
  if (resetTime) {
    try {
      const t = (typeof getBgVidTrim === "function") ? getBgVidTrim() : null;
      item.vid.currentTime = t ? t.start : 0;
    } catch (_) {}
  }
  if (S.playing) { try { item.vid.play().catch(() => {}); } catch (_) {} }
}

function removeBgVidItem(idx) {
  if (idx < 0 || idx >= S.bgVidItems.length) return;
  const item = S.bgVidItems[idx];
  try { item.vid.pause(); URL.revokeObjectURL(item.url); } catch (_) {}
  S.bgVidItems.splice(idx, 1);
  if (S.bgVidItems.length === 0) {
    S.bgVid = null;
    const thumb = $("bg-vid-thumb"); if (thumb) thumb.style.display = "none";
    const prev = $("bg-vid-preview"); if (prev) prev.src = "";
  } else {
    activateBgVidByIndex(0, true);
  }
  renderBgVidList();
}

function moveBgVidItem(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= S.bgVidItems.length) return;
  const [moved] = S.bgVidItems.splice(idx, 1);
  S.bgVidItems.splice(newIdx, 0, moved);
  activateBgVidByIndex(0, true);  // التأثير فوري: ابدأ من الأول دائماً بعد الترتيب
  renderBgVidList();
}

// تطبيق إعدادات صوت العنصر على عنصر الفيديو
function applyBgVidItemAudio(item) {
  if (!item || !item.vid) return;
  item.vid.muted = !item.audioEnabled;
  item.vid.volume = Math.max(0, Math.min(1, item.audioGain));
}

// تفعيل/تعطيل صوت عنصر معين + فكّ ترميز buffer للاستخدام في V2
async function toggleBgVidAudio(idx) {
  const item = S.bgVidItems[idx];
  if (!item) return;
  item.audioEnabled = !item.audioEnabled;
  applyBgVidItemAudio(item);
  // فكّ ترميز buffer عند أول تفعيل (lazy) — يستخدم في تصدير V2
  if (item.audioEnabled && !item.audioBuffer) {
    try {
      const ctx = await resumeAudioCtx();
      const ab = await item.file.arrayBuffer();
      item.audioBuffer = await ctx.decodeAudioData(ab.slice(0));
    } catch (e) {
      console.warn("decode bg-vid audio failed:", e);
      toast("⚠️ تعذّر فكّ صوت المقطع — سيعمل في المعاينة فقط", "info", 3500);
    }
  }
  renderBgVidList();
}

function setBgVidVolume(idx, value) {
  const item = S.bgVidItems[idx];
  if (!item) return;
  item.audioGain = Math.max(0, Math.min(1, value / 100));
  applyBgVidItemAudio(item);
}

function renderBgVidList() {
  const el = $("bg-vid-list");
  if (!el) return;
  if (!S.bgVidItems.length) { el.innerHTML = ""; return; }
  el.innerHTML = S.bgVidItems.map((it, i) => {
    const sz = (it.file.size / 1e6).toFixed(1);
    const dur = it.dur ? it.dur.toFixed(1) + "ث" : "—";
    const audioOn = it.audioEnabled;
    const volPct = Math.round((it.audioGain || 0) * 100);
    return `<div class="bgv-item" data-idx="${i}">
      <span class="bgv-idx">${i + 1}</span>
      <span class="bgv-name" title="${escHtml(it.name)}">${escHtml(it.name)}</span>
      <span class="bgv-dur">${dur} · ${sz}MB</span>
      <button data-act="audio" class="${audioOn ? 'on' : ''}" title="${audioOn ? 'كتم صوت المقطع' : 'تفعيل صوت المقطع'}">${audioOn ? '🔊' : '🔇'}</button>
      <input type="range" class="bgv-vol" min="0" max="100" value="${volPct}" data-act="vol" title="مستوى صوت المقطع: ${volPct}%" ${audioOn ? '' : 'style="visibility:hidden"'}>
      <button data-act="up"     ${i === 0 ? "disabled" : ""} title="أعلى">▲</button>
      <button data-act="down"   ${i === S.bgVidItems.length - 1 ? "disabled" : ""} title="أسفل">▼</button>
      <button data-act="remove" title="إزالة">✕</button>
    </div>`;
  }).join("");
  el.querySelectorAll(".bgv-item button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.closest(".bgv-item").dataset.idx);
      const act = e.currentTarget.dataset.act;
      if (act === "up")          moveBgVidItem(idx, -1);
      else if (act === "down")   moveBgVidItem(idx, +1);
      else if (act === "remove") removeBgVidItem(idx);
      else if (act === "audio")  toggleBgVidAudio(idx);
    });
  });
  el.querySelectorAll(".bgv-item input.bgv-vol").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.currentTarget.closest(".bgv-item").dataset.idx);
      setBgVidVolume(idx, parseFloat(e.currentTarget.value));
    });
  });
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
  const recvidActive = ge("recvid-on") && S.recVidEl;
  if (!recvidActive && !S.verses.length) { toast("⚠️ لا توجد آيات مُحمَّلة", "error"); return; }
  S.playing = true;
  $("btn-play").textContent = "⏸️";
  resumeAudioCtx().catch(console.warn);
  if (S.bgAudioEl) { S.bgAudioEl.loop = ge("bg-loop"); S.bgAudioEl.play().catch(() => { }); }
  if (S.bgVid) { try { S.bgVid.play().catch(() => {}); } catch (_) {} }
  if (recvidActive) { try { S.recVidEl.play().catch(() => {}); } catch (_) {} }
  else playRecitationAudio();
}

function pausePlayer() {
  S.playing = false;
  $("btn-play").textContent = "▶️";
  stopRecitationAudio();
  if (S.bgAudioEl) S.bgAudioEl.pause();
  if (S.bgVid) { try { S.bgVid.pause(); } catch (_) {} }
  // v3.2
  if (S.recVidEl) { try { S.recVidEl.pause(); S.recVidEl.currentTime = 0; } catch (_) {} }
}

function prevAya() { if (S.currentAya > 0) { S.currentAya--; S.elapsed = 0; updateAyaUI(); if (S.playing) playRecitationAudio(); } }
function nextAya() { if (S.currentAya < S.verses.length - 1) { S.currentAya++; S.elapsed = 0; updateAyaUI(); if (S.playing) playRecitationAudio(); } }

// v3.3.2 — ↺ إعادة من البداية: يُعيد كلّ شيء (آيات + صوت + خلفية + recvid)
function restartAll() {
  const recvidActive = ge("recvid-on") && S.recVidEl;
  if (!recvidActive && (!S.verses || !S.verses.length)) {
    toast?.("⚠️ لا توجد آيات للتشغيل", "warn", 1500);
    return;
  }
  const wasPlaying = !!S.playing;
  if (S.playing) { try { togglePlay(); } catch (_) {} }

  S.currentAya = 0;
  S.elapsed = 0;

  if (S.recAudioEl) { try { S.recAudioEl.pause(); S.recAudioEl.currentTime = 0; } catch (_) {} }
  if (S.recAudioSource) { try { S.recAudioSource.onended = null; S.recAudioSource.stop(); } catch (_) {} S.recAudioSource = null; }
  if (S.bgAudioEl) { try { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; } catch (_) {} }
  if (S.bgVid) { try { S.bgVid.pause(); S.bgVid.currentTime = 0; } catch (_) {} }
  if (Array.isArray(S.bgVidItems)) {
    S.bgVidActiveIdx = 0;
    S.bgVidItems.forEach(it => {
      if (it.vid) { try { it.vid.pause(); it.vid.currentTime = 0; } catch (_) {} }
    });
  }
  if (S.recVidEl) { try { S.recVidEl.pause(); S.recVidEl.currentTime = 0; } catch (_) {} }

  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();
  toast?.("↺ إعادة الكلّ من البداية", "info", 1500);

  if (wasPlaying) {
    setTimeout(() => { try { togglePlay(); } catch (_) {} }, 60);
  }
}

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
//  EXPORT
// ══════════════════════════════════════════════════════
async function startExport(type) {
  if (!S.verses.length) { toast("⚠️ لا توجد آيات", "error"); return; }

  S.exportCancel = false;
  S.exportChunks = [];
  S.exporting = true;
  initExportMuteState();  // طبّق إعداد كتم التصدير قبل بدء الترميز
  stopRecitationAudio();
  if (S.bgAudioEl) S.bgAudioEl.pause();

  $("rec-ov").classList.add("on");
  $("rec-fill").style.width = "0%";
  $("rec-pct").textContent = "0%";
  $("rec-sub").textContent = "⏳ جاري تحميل الصوتيات…";

  const ctx = await resumeAudioCtx();
  const manualDur = parseFloat(gv("aya-dur")) || 6;
  const getDur = (i) => (S.ayaDurations[i] && S.ayaDurations[i] > 0.5) ? S.ayaDurations[i] : manualDur;

  const surahNum = parseInt($("surah-sel").value) || 1;
  const reciter = S.reciters.find(r => r.id === radioVal("reciter")) || S.reciters[0];
  const gainVal = gv("rec-vol") / 100;
  // v3.3.1 — تخطّى صوت القارئ للفيديو الجاهز (skipReciter)
  const skipReciter = ge("recvid-on") || S.verses.every(v => v?.recvid || v?.free || v?.audio === null);
  let loaded = 0;

  const audioBuffers = await Promise.all(S.verses.map(async (aya, i) => {
    // v3.3.1 — لا تحاول جلب صوت القارئ لشرائح recvid / النصّ الحرّ
    if (skipReciter || aya?.recvid || aya?.free || aya?.audio === null) {
      S.ayaDurations[i] = aya?.manualDuration || manualDur;
      loaded++;
      $("rec-sub").textContent = `⏳ تحضير الشرائح… ${loaded}/${S.verses.length}`;
      return null;
    }
    const url = buildAudioUrl(reciter.folder, surahNum, aya.numberInSurah);
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const ab = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      loaded++;
      $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length}`;
      return buf;
    } catch (e1) {
      try {
        const res2 = await fetch(url, { cache: "no-store", mode: "cors" });
        if (!res2.ok) throw new Error("HTTP " + res2.status);
        const ab2 = await res2.arrayBuffer();
        const buf2 = await ctx.decodeAudioData(ab2);
        loaded++;
        $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length}`;
        return buf2;
      } catch (e2) {
        try {
          const dur = await new Promise((res, rej) => {
            const a = new Audio();
            a.crossOrigin = "anonymous";
            a.onloadedmetadata = () => res(a.duration);
            a.onerror = () => {
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

  const loadedCount = audioBuffers.filter(b => b !== null).length;
  if (loadedCount === 0) {
    toast("⚠️ تعذر جلب الصوت عبر fetch — سيتم التصدير بالصوت الأساسي", "info");
  }

  if (S.exportCancel) { $("rec-ov").classList.remove("on"); return; }

  audioBuffers.forEach((buf, i) => { if (buf) S.ayaDurations[i] = buf.duration; });

  const ayaGap = getAyaGap();
  const ayaStarts = [];
  let acc = 0;
  for (let i = 0; i < S.verses.length; i++) {
    ayaStarts.push(acc);
    acc += getDur(i) + ayaGap;
  }
  const totalDuration = acc;
  const FPS = parseInt(gv("export-fps") || "30") || 30;
  const FRAME_MS = 1000 / FPS;
  const totalFrames = Math.ceil(totalDuration * FPS);

  const cv = $("cv");

  // ═══════════════════════════════════════════════════
  //  V2: المسار الحتمي عبر WebCodecs (إن كان مدعوماً)
  //  لا تقطّع، لا انجراف زمني — مكافئ للنسخة المكتبية
  // ═══════════════════════════════════════════════════
  let v2Completed = false;  // علم صارم: إن صار true → ممنوع MediaRecorder
  if (typeof startWebExportV2 === "function" && typeof isWebCodecsSupported === "function" && isWebCodecsSupported()) {
    try {
      $("rec-sub").textContent = "🚀 محرّك حتمي V2 (WebCodecs)…";
      // فكّ ترميز صوت الخلفية لخلطه في OfflineAudioContext
      let bgBuffer = null;
      if (S.bgAudioEl && S.bgAudioEl.src) {
        try {
          const r = await fetch(S.bgAudioEl.src);
          const ab = await r.arrayBuffer();
          bgBuffer = await ctx.decodeAudioData(ab.slice(0));
        } catch (e) { console.warn("bg audio decode failed:", e); }
      }
      const cancelRef = { canceled: false };
      S.exportCancelRef = cancelRef;

      // setStateForTime: يضبط الآية + المنقضي + bgMotionT لإطار معيّن
      const getAyaAt = (t) => {
        for (let i = 0; i < S.verses.length; i++) {
          if (t < ayaStarts[i] + getDur(i) + ayaGap) return i;
        }
        return S.verses.length - 1;
      };
      const setStateForTime = (t) => {
        const idx = getAyaAt(Math.min(t, totalDuration - 1e-4));
        S.currentAya = idx;
        S.elapsed    = Math.max(0, t - ayaStarts[idx]);
        S.bgMotionT  = t;
      };

      await window.startWebExportV2({
        canvas: cv,
        drawFrame,
        setStateForTime,
        totalDuration,
        fps: FPS,
        audioBuffers,
        ayaStarts,
        bgBuffer,
        bgGain: (gv("bg-vol") || 0) / 100,
        bgLoop: ge("bg-loop"),
        recGain: gainVal,
        bgVideo: S.bgVid,
        codecKey: (type === "mp4" ? "mp4-h264" : "webm-vp9"),
        videoBitrate: parseInt(gv("export-vbr") || "8") || 8,
        audioBitrate: "192k",
        cancelRef,
        onProgress: (pct, label) => {
          const cp = Math.max(0, Math.min(100, Math.round(pct)));
          $("rec-fill").style.width = cp + "%";
          $("rec-pct").textContent  = cp + "%";
          if (label) $("rec-sub").textContent = label;
        },
      });
      v2Completed = true;  // ⚠️ مهم: V2 أنتج الملف بنجاح
      toast("✅ تم التصدير بنجاح! (محرّك V2 حتمي)", "success");
    } catch (e) {
      if (e && e.message === "cancelled") {
        toast("تم إلغاء التصدير", "info");
        v2Completed = true;  // المستخدم ألغى عمداً — لا fallback
      } else {
        console.warn("V2 export failed, falling back to MediaRecorder:", e);
        toast("⚠️ V2 فشل: " + String(e.message).slice(0, 80) + " — جاري المحاولة بالطريقة القديمة", "info", 4000);
      }
    } finally {
      S.exportCancelRef = null;
    }
    // تنظيف صارم بعد V2 — في كل الأحوال (نجاح/إلغاء)
    if (v2Completed) {
      $("rec-ov").classList.remove("on");
      if (typeof cleanupExportMute === "function") cleanupExportMute();
      stopRecitationAudio();
      if (S.bgAudioEl) { try { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; } catch (_) {} }
      if (S.bgVid)     { try { S.bgVid.pause(); S.bgVid.currentTime = 0; } catch (_) {} }
      S.exporting = false;
      S.playing   = false;
      if (typeof updateAyaUI === "function") updateAyaUI();
      return;  // ⛔ لا MediaRecorder
    }
  }

  // ═══════════════════════════════════════════════════
  //  المسار القديم (MediaRecorder) — fallback فقط إن V2
  //  لم يُنتج ملفاً وفشل بأخطاء غير "cancelled"
  // ═══════════════════════════════════════════════════
  if (v2Completed) return;  // belt-and-suspenders
  const stream = cv.captureStream(FPS);
  const tracks = [...stream.getTracks()];
  if (S.exportDest && S.exportDest.stream.getAudioTracks().length)
    tracks.push(...S.exportDest.stream.getAudioTracks());

  const mime4 = 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"';
  const mime_w = "video/webm;codecs=vp9,opus";
  const mimeT = type === "mp4" ? mime4 : mime_w;
  const mime = MediaRecorder.isTypeSupported(mimeT) ? mimeT : "video/webm";

  const vbrMbps = parseInt(gv("export-vbr") || "8") || 8;
  const mr = new MediaRecorder(new MediaStream(tracks), {
    mimeType: mime, videoBitsPerSecond: vbrMbps * 1_000_000, audioBitsPerSecond: 128_000
  });
  S.mediaRecorder = mr;
  mr.ondataavailable = e => { if (e.data.size > 0) S.exportChunks.push(e.data); };
  mr.onstop = () => {
    stopExportSources();
    if (S.exportCancel) { $("rec-ov").classList.remove("on"); return; }
    const blob = new Blob(S.exportChunks, { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `GT-SQR_${Date.now()}.${type === "mp4" ? "mp4" : "webm"}`;
    a.click();
    $("rec-ov").classList.remove("on");
    toast("✅ تم التصدير بنجاح!", "success");
  };

  mr.start(100);

  await new Promise(r => setTimeout(r, 150));
  if (S.exportCancel) { mr.stop(); return; }

  const audioStartTime = ctx.currentTime + 0.05;
  S.exportSources = [];

  const hasBuffers = audioBuffers.some(b => b !== null);

  if (hasBuffers) {
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
    console.warn("Export: using HTMLAudioElement fallback (fetch CORS failed)");
    $("rec-sub").textContent = "⚠️ وضع الصوت البديل (CORS) — الجودة ستنخفض قليلاً";

    const playExportAya = (idx) => {
      if (idx >= S.verses.length || S.exportCancel) return;
      const aya2 = S.verses[idx];
      // v3.3.1 — تخطّى صوت القارئ لـ recvid / النصّ الحرّ
      if (aya2?.recvid || aya2?.free || aya2?.audio === null || skipReciter) {
        setTimeout(() => playExportAya(idx + 1), (aya2.manualDuration || manualDur) * 1000);
        return;
      }
      const url2 = buildAudioUrl(reciter.folder, surahNum, aya2.numberInSurah);
      const a2 = new Audio(url2);
      a2.volume = gainVal;
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
    setTimeout(() => playExportAya(0), 50);
  }

  if (S.bgAudioEl) { S.bgAudioEl.currentTime = 0; S.bgAudioEl.play().catch(() => {}); }
  // v3.3
  if (ge("recvid-on") && S.recVidEl) {
    try { S.recVidEl.currentTime = 0; S.recVidEl.play().catch(() => {}); } catch (_) {}
  }

  const savedAya = S.currentAya;
  const savedElapsed = S.elapsed;
  const savedPlaying = S.playing;
  S.playing = true;

  const getAyaAt = (t) => {
    let idx = S.verses.length - 1;
    for (let i = 0; i < S.verses.length; i++) {
      if (t < ayaStarts[i] + getDur(i) + ayaGap) { idx = i; break; }
    }
    return idx;
  };

  let exportTimer = null;
  let lastDrawnFrame = -1;
  let exportDone = false;

  const doExportFrame = () => {
    if (S.exportCancel || exportDone) return;

    const projectTime = ctx.currentTime - audioStartTime;

    if (projectTime >= totalDuration) {
      exportDone = true;
      if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; }
      setTimeout(() => { mr.stop(); restoreExportState(); }, 200);
      return;
    }

    const targetFrame = Math.floor(projectTime * FPS);

    if (targetFrame > lastDrawnFrame) {
      const t = targetFrame / FPS;
      const ci = getAyaAt(Math.min(t, totalDuration - 0.001));
      S.currentAya = ci;
      S.elapsed = Math.max(0, t - ayaStarts[ci]);
      drawFrame(t);
      lastDrawnFrame = targetFrame;

      const pct = Math.min(99, Math.round((projectTime / totalDuration) * 100));
      $("rec-fill").style.width = pct + "%";
      $("rec-pct").textContent = pct + "%";
      $("rec-sub").textContent =
      `🎬 ${targetFrame}/${totalFrames} — الآية ${ci + 1}/${S.verses.length} — ${fmt(projectTime)} / ${fmt(totalDuration)}`;
      updateAyaUI();
    }

    const msToNextFrame = Math.max(4, FRAME_MS - ((projectTime * 1000) % FRAME_MS));
    exportTimer = setTimeout(doExportFrame, msToNextFrame);
  };

  const onVisChange = () => {
    if (!document.hidden && !exportDone && !S.exportCancel) {
      if (exportTimer) { clearTimeout(exportTimer); exportTimer = null; }
      doExportFrame();
    }
  };
  document.addEventListener("visibilitychange", onVisChange);

  exportTimer = setTimeout(doExportFrame, 0);

  function restoreExportState() {
    exportDone = true;
    if (exportTimer !== null) { clearTimeout(exportTimer); exportTimer = null; }
    document.removeEventListener("visibilitychange", onVisChange);
    S.exporting = false;
    S.playing = savedPlaying;
    S.currentAya = savedAya;
    S.elapsed = savedElapsed;
    $("rec-ov").classList.remove("on");
    updateAyaUI();
  }
}

function stopExportSources() {
  S.exportSources.forEach(s => {
    try { s.src.onended = null; s.src.stop(0); } catch (_) {}
    try { s.gain.disconnect(); } catch (_) {}
  });
  S.exportSources = [];
  // v3.3
  if (S.recVidEl) { try { S.recVidEl.pause(); S.recVidEl.currentTime = 0; } catch (_) {} }
}

function cancelExport() {
  S.exportCancel = true;
  S.exporting = false;
  // محرك V2 للويب (WebCodecs)
  if (S.exportCancelRef) S.exportCancelRef.canceled = true;
  // المسار القديم (MediaRecorder)
  stopExportSources();
  stopRecitationAudio();
  if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; }
  if (S.mediaRecorder && S.mediaRecorder.state !== "inactive") {
    try { S.mediaRecorder.stop(); } catch (_) {}
  }
  $("rec-ov").classList.remove("on");
  toast("تم إلغاء التصدير", "info");
}

// ══════════════════════════════════════════════════════
//  QURAN DATA  (مع تخزين محلي دائم للعمل دون اتصال)
// ══════════════════════════════════════════════════════
//   - قائمة السور:   localStorage["gt_sqr_surahs_v1"]    (دائمة)
//   - نص القرآن:     localStorage["gt_sqr_quran_idx_v1"] (يُحمَّل في الخلفية)
//   - الترجمات:      localStorage["gt_sqr_trans_{ed}_{n}"] (بالطلب)
const SURAHS_KEY = "gt_sqr_surahs_v1";

async function loadSurahList() {
  const sel = $("surah-sel");
  // 1) جرّب localStorage الدائم
  let surahs = null;
  try {
    const cached = JSON.parse(localStorage.getItem(SURAHS_KEY) || "null");
    if (Array.isArray(cached) && cached.length === 114) surahs = cached;
  } catch (_) {}
  // 2) جرّب sessionStorage (احتياط من نسخة قديمة)
  if (!surahs) {
    try {
      const old = JSON.parse(sessionStorage.getItem("gt_surahs") || "null");
      if (Array.isArray(old) && old.length === 114) {
        surahs = old;
        try { localStorage.setItem(SURAHS_KEY, JSON.stringify(surahs)); } catch (_) {}
      }
    } catch (_) {}
  }

  if (surahs) {
    S.surahs = surahs;
    S.filteredSurahs = surahs;
    renderSurahList(surahs);
    await loadVerses();
    return;
  }

  // 3) لا يوجد كاش — حمّل من الـ API
  sel.innerHTML = `<option>⏳ جاري التحميل…</option>`;
  try {
    const r = await fetch(`${QURAN_API}/surah`);
    const d = await r.json();
    surahs = d.data;
    S.surahs = surahs;
    S.filteredSurahs = surahs;
    try { localStorage.setItem(SURAHS_KEY, JSON.stringify(surahs)); } catch (_) {}
    renderSurahList(surahs);
    await loadVerses();
  } catch (e) {
    sel.innerHTML = `<option value="1">1. سورة الفاتحة</option>`;
    loadOfflineFallback();
  }
}

function renderSurahList(surahs) {
  const sel = $("surah-sel");
  sel.innerHTML = surahs.map(s => `<option value="${s.number}">${s.number}. ${s.name} — ${s.englishName}</option>`).join("");
}

function filterSurahs(query) {
  if (!S.surahs) return;
  const raw = (query || "").trim();
  if (!raw) {
    S.filteredSurahs = S.surahs;
  } else {
    // تطبيع المدخل والمقارنة على الأسماء العربية المطبَّعة كذلك
    const nq = normalizeArabic(raw);
    const lq = raw.toLowerCase();
    S.filteredSurahs = S.surahs.filter(s => {
      const arNorm = normalizeArabic(s.name || "");
      const enLow  = (s.englishName || "").toLowerCase();
      return arNorm.includes(nq)
          || enLow.includes(lq)
          || s.number.toString().includes(raw);
    });
  }
  renderSurahList(S.filteredSurahs);
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

  let verses = null;
  let source = "";

  // 1) جرّب فهرس القرآن المحلي الكامل (الأسرع — يعمل دون اتصال)
  if (_quranIdx?.verses?.length) {
    const matched = _quranIdx.verses
      .filter(v => v.s === surahNum && v.a >= from && v.a <= to)
      .map(v => ({ numberInSurah: v.a, text: v.t }));
    if (matched.length) { verses = matched; source = "📚 محلي"; }
  }

  // 2) جرّب sessionStorage (كاش جلسة سابقة)
  if (!verses) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(`gt_v_${surahNum}_${from}_${to}`) || "null");
      if (Array.isArray(cached) && cached.length) { verses = cached; source = "🗂 جلسة"; }
    } catch (_) {}
  }

  // 3) آخر حل: API الخارجي
  if (!verses) {
    try {
      const r = await fetch(`${QURAN_API}/surah/${surahNum}/quran-uthmani`);
      const d = await r.json();
      verses = d.data.ayahs.filter(a => a.numberInSurah >= from && a.numberInSurah <= to)
                            .map(a => ({ numberInSurah: a.numberInSurah, text: a.text }));
      try { sessionStorage.setItem(`gt_v_${surahNum}_${from}_${to}`, JSON.stringify(verses)); } catch (_) {}
      source = "🌐 شبكة";
    } catch (e) {
      $("aya-info").textContent = "⚠️ فشل التحميل (لا توجد بيانات محلية أو اتصال)";
      if (!S.verses.length) loadOfflineFallback();
      return;
    }
  }

  S.verses = verses; S.currentAya = 0; S.elapsed = 0; S.ayaDurations = [];
  $("aya-info").textContent = `✅ ${verses.length} آية من سورة ${surah?.name || ""} ${source}`;
  updateAyaUI();
  await loadTranslations();
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
  // كاش لكل (سورة، نسخة) في localStorage — يبقى بين الجلسات
  const persistKey = `gt_sqr_trans_${edition}_${surahNum}`;
  let allAyahs = null;

  try {
    const cached = JSON.parse(localStorage.getItem(persistKey) || "null");
    if (Array.isArray(cached) && cached.length) allAyahs = cached;
  } catch (_) {}

  if (!allAyahs) {
    try {
      const r = await fetch(`${QURAN_API}/surah/${surahNum}/${edition}`);
      const d = await r.json();
      allAyahs = d.data.ayahs.map(a => ({ n: a.numberInSurah, t: a.text }));
      try { localStorage.setItem(persistKey, JSON.stringify(allAyahs)); } catch (_) {}
    } catch (e) { S.translations = []; return; }
  }

  S.translations = allAyahs
    .filter(a => a.n >= from && a.n <= to)
    .map(a => a.t);
}

// ══════════════════════════════════════════════════════
//  بحث الآيات مع تطبيع التشكيل (نسخة الويب)
// ══════════════════════════════════════════════════════
const QURAN_INDEX_KEY = "gt_sqr_quran_idx_v1";

function normalizeArabic(s) {
  if (!s) return "";
  return s
    .replace(/[ً-ْٰؐ-ؚۖ-ۭ]/g, "")
    .replace(/[أإآٱا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/ء/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeWithMap(s) {
  if (!s) return { norm: "", map: [] };
  let out = "";
  const map = [];
  let lastSpace = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (/[ً-ْٰؐ-ؚۖ-ۭـء]/.test(c)) continue;
    let r;
    if (/[إأآٱا]/.test(c)) r = "ا";
    else if (c === "ى") r = "ي";
    else if (c === "ة") r = "ه";
    else if (/\s/.test(c)) {
      if (lastSpace) continue;
      r = " ";
    } else {
      r = c.toLowerCase();
    }
    out += r;
    map.push(i);
    lastSpace = (r === " ");
  }
  return { norm: out, map };
}

let _quranIdx = null;
let _quranIdxLoading = null;

async function loadQuranIndex() {
  if (_quranIdx) return _quranIdx;
  if (_quranIdxLoading) return _quranIdxLoading;

  _quranIdxLoading = (async () => {
    try {
      const cached = JSON.parse(localStorage.getItem(QURAN_INDEX_KEY) || "null");
      if (cached && cached.v === 1 && Array.isArray(cached.verses) && cached.verses.length > 6000) {
        _quranIdx = cached;
        return cached;
      }
    } catch (_) {}

    const r = await fetch(`${QURAN_API}/quran/quran-uthmani`);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    const sd = d.data?.surahs || [];
    const verses = [];
    for (const s of sd) {
      for (const a of s.ayahs) {
        verses.push({
          s:  s.number,
          sn: s.name,
          a:  a.numberInSurah,
          t:  a.text,
          n:  normalizeArabic(a.text),
        });
      }
    }
    const out = { v: 1, verses };
    try { localStorage.setItem(QURAN_INDEX_KEY, JSON.stringify(out)); } catch (_) {}
    _quranIdx = out;
    return out;
  })();

  return _quranIdxLoading;
}

function preloadQuranIndex() {
  try {
    const cached = JSON.parse(localStorage.getItem(QURAN_INDEX_KEY) || "null");
    if (cached && cached.v === 1 && Array.isArray(cached.verses) && cached.verses.length > 6000) {
      _quranIdx = cached;
      console.log(`[Quran] Index ready from cache: ${cached.verses.length} verses`);
      if (!S.verses.length) loadVerses();
      return;
    }
  } catch (_) {}
  loadQuranIndex()
    .then(idx => {
      console.log(`[Quran] Index downloaded: ${idx.verses.length} verses, cached for offline`);
      toast("📚 تم تحميل القرآن كاملاً للعمل دون اتصال", "success", 3500);
    })
    .catch(err => console.warn("[Quran] Index preload failed:", err));
}

function searchVerses(query, limit = 80) {
  if (!_quranIdx) return [];
  const nq = normalizeArabic(query);
  if (!nq) return [];
  const out = [];
  for (const v of _quranIdx.verses) {
    const idx = v.n.indexOf(nq);
    if (idx >= 0) {
      out.push({ s: v.s, sn: v.sn, a: v.a, t: v.t, matchIdx: idx, matchLen: nq.length });
      if (out.length >= limit) break;
    }
  }
  return out;
}

function highlightVerseMatch(text, matchIdx, matchLen) {
  const { map } = normalizeWithMap(text);
  if (matchIdx < 0 || matchIdx >= map.length) return escHtml(text);
  const start = map[matchIdx];
  const end   = matchIdx + matchLen - 1 < map.length ? (map[matchIdx + matchLen - 1] + 1) : text.length;
  return escHtml(text.slice(0, start))
       + "<mark>" + escHtml(text.slice(start, end)) + "</mark>"
       + escHtml(text.slice(end));
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}

async function onVerseSearchInput(e) {
  const q = e.target.value || "";
  const resultsEl = $("verse-search-results");
  const clearBtn  = $("verse-search-clear-btn");
  if (clearBtn) clearBtn.style.display = q ? "" : "none";
  if (!q.trim()) {
    if (resultsEl) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; }
    return;
  }

  if (!_quranIdx) {
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `<div class="vs-loading">⏳ تحميل فهرس القرآن (مرّة واحدة فقط)…</div>`;
    try {
      await loadQuranIndex();
    } catch (err) {
      resultsEl.innerHTML = `<div class="vs-empty">❌ فشل تحميل الفهرس: ${escHtml(err.message)}</div>`;
      return;
    }
  }

  const results = searchVerses(q);
  if (!results.length) {
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `<div class="vs-empty">لا توجد نتائج تطابق "${escHtml(q)}"</div>`;
    return;
  }

  resultsEl.style.display = "block";
  resultsEl.innerHTML = results.map(r =>
    `<div class="vs-item" data-s="${r.s}" data-a="${r.a}">
       <div class="vs-head"><span>${escHtml(r.sn)} • آية ${r.a}</span><span>📖 ${r.s}:${r.a}</span></div>
       <div class="vs-text">${highlightVerseMatch(r.t, r.matchIdx, r.matchLen)}</div>
     </div>`
  ).join("");

  resultsEl.querySelectorAll(".vs-item").forEach(it => {
    it.addEventListener("click", () => {
      const s = parseInt(it.dataset.s);
      const a = parseInt(it.dataset.a);
      jumpToVerse(s, a);
    });
  });
}

async function jumpToVerse(surahNum, ayaNum) {
  const sel = $("surah-sel");
  if (sel) sel.value = surahNum;
  const fromEl = $("from-aya"), toEl = $("to-aya");
  if (fromEl) fromEl.value = ayaNum;
  if (toEl) {
    const cur = S.surahs.find(s => s.number === surahNum);
    const max = cur?.numberOfAyahs || ayaNum;
    toEl.value = Math.min(max, ayaNum + 2);
  }
  const resultsEl = $("verse-search-results");
  if (resultsEl) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; }
  const inp = $("verse-search-inp");
  if (inp) inp.value = "";
  const clr = $("verse-search-clear-btn");
  if (clr) clr.style.display = "none";
  await loadVerses();
  toast(`📖 الانتقال إلى ${ayaNum}:${surahNum}`, "success", 1800);
}

function clearVerseSearch() {
  const inp = $("verse-search-inp");
  const resultsEl = $("verse-search-results");
  const clr = $("verse-search-clear-btn");
  if (inp) inp.value = "";
  if (resultsEl) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; }
  if (clr) clr.style.display = "none";
}

// ══════════════════════════════════════════════════════
//  FONTS
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
    // 1) جرّب window.FONTS_DATA (مُضمَّن في fonts-data.js — يعمل تحت file://)
    let list = (Array.isArray(window.FONTS_DATA) ? window.FONTS_DATA : null);
    // 2) fallback لـ fetch (للعمل عبر HTTP server)
    if (!list) {
      const r = await fetch("./fonts/fonts.json");
      if (!r.ok) throw new Error("HTTP " + r.status);
      list = await r.json();
    }
    if (!Array.isArray(list)) return;
    let added = 0;
    let reloaded = 0;
    for (const item of list) {
      if (!item.name || !item.file) continue;
      try {
        let rawFile = item.file;
        try { rawFile = decodeURIComponent(rawFile); } catch(_) {}
        const fontUrl = `./fonts/${rawFile.split('/').map(encodeURIComponent).join('/')}`;
        // حمّل FontFace دائماً — حتى لو الاسم في BUILT_IN_FONTS
        // (كان dedup السابق يمنع تحميل ملف الخط الفعلي)
        const face = new FontFace(item.name, `url(${fontUrl})`);
        await face.load();
        document.fonts.add(face);
        if (!S.allFonts.find(x => x.name === item.name)) {
          S.allFonts.push({
            id: "local_" + item.name,
            name: item.name,
            css: `'${item.name}'`,
            sample: item.sample || "بِسْمِ اللَّهِ"
          });
          added++;
        } else {
          reloaded++;
        }
      } catch (e) {
        console.warn("Font load failed:", item.name, e);
      }
    }
    renderFontGrid();
    const total = added + reloaded;
    if (showToast) toast(total > 0 ? `✅ ${added} خط جديد + ${reloaded} مُعاد ربطها` : "لا توجد خطوط في fonts/", "info");
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
//  RECITERS
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
  saveReciters();
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
  saveReciters();
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

function initPanelSwipe(e) {
  const startY = e.touches[0].clientY;
  const panel = $("panel");
  let diff = 0;
  const onMove = ev => {
    diff = ev.touches[0].clientY - startY;
    if (diff > 0) panel.style.transform = `translateY(${diff}px)`;
  };
  const onEnd = () => {
    panel.style.transform = "";
    if (diff > 70) closeMobilePanel();
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
  };
  document.addEventListener("touchmove", onMove, { passive: true });
  document.addEventListener("touchend", onEnd);
}

// ══════════════════════════════════════════════════════
//  SETTINGS FUNCTIONS
// ══════════════════════════════════════════════════════
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
function toast(msg, type = "info", duration = 3600) {
  const el = document.createElement("div"); el.className = `toast ${type}`; el.textContent = msg;
  $("toast-c").appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ═══════════════════════════════════════════════════════
//  v3.1 — حفظ/فتح المشاريع (.gtsqr)
// ═══════════════════════════════════════════════════════
const PROJECT_FORMAT = "GT-SQR-Project";
const PROJECT_FORMAT_VERSION = 1;
const ASSET_EMBED_MAX = 50 * 1024 * 1024;
const PROJECT_APP_VERSION = "3.1.0";
let _autoSaveTimer = null;

function markProjectDirty() { S.projectDirty = true; updateProjectTitle(); }
function clearProjectDirty() { S.projectDirty = false; updateProjectTitle(); }
function updateProjectTitle() {
  const base = S.projectFileName || "بدون اسم";
  const dirty = S.projectDirty ? " ●" : "";
  document.title = `${base}${dirty} — GT-SQR`;
}
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
function dataURLToBlob(dataURL) {
  const [meta, b64] = dataURL.split(",");
  const mime = (meta.match(/data:([^;]+)/) || [, "application/octet-stream"])[1];
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

async function serializeProject() {
  const byId = {}, byName = {};
  document.querySelectorAll("input, select, textarea").forEach(el => {
    if (el.type === "file" || el.type === "button" || el.type === "submit") return;
    if (el.type === "checkbox" || el.type === "radio") {
      if (el.id) byId[el.id] = el.checked;
      if (el.name && (el.type !== "radio" || el.checked)) byName[el.name] = el.value;
    } else {
      if (el.id) byId[el.id] = el.value;
    }
  });
  const assets = [];
  if (Array.isArray(S.bgVidItems)) {
    for (let i = 0; i < S.bgVidItems.length; i++) {
      const item = S.bgVidItems[i];
      const a = {
        key: `bgVideo[${i}]`, name: item.name || `video-${i}.mp4`,
        size: item.file?.size || 0, mime: item.file?.type || "video/mp4",
        active: i === S.bgVidActiveIdx,
        audioEnabled: !!item.audioEnabled, audioGain: item.audioGain ?? 0.5,
      };
      if (item.file && item.file.size <= ASSET_EMBED_MAX) { a.mode = "embedded"; a.dataURL = await fileToDataURL(item.file); }
      else { a.mode = "missing"; a.reason = item.file ? "حجم أكبر من 50MB" : "غير متوفّر"; }
      assets.push(a);
    }
  }
  if (S.bgImgFile) {
    const a = { key: "bgImage", name: S.bgImgFile.name || "bg.jpg", size: S.bgImgFile.size || 0, mime: S.bgImgFile.type || "image/jpeg" };
    if (S.bgImgFile.size <= ASSET_EMBED_MAX) { a.mode = "embedded"; a.dataURL = await fileToDataURL(S.bgImgFile); }
    else { a.mode = "missing"; a.reason = "حجم أكبر من 50MB"; }
    assets.push(a);
  }
  if (S.bgAudioFile) {
    const a = { key: "bgAudio", name: S.bgAudioFile.name || "audio.mp3", size: S.bgAudioFile.size || 0, mime: S.bgAudioFile.type || "audio/mpeg" };
    if (S.bgAudioFile.size <= ASSET_EMBED_MAX) { a.mode = "embedded"; a.dataURL = await fileToDataURL(S.bgAudioFile); }
    else { a.mode = "missing"; a.reason = "حجم أكبر من 50MB"; }
    assets.push(a);
  }
  // v3.2 — فيديو التلاوة الجاهز
  if (S.recVidFile) {
    const a = { key: "recVideo", name: S.recVidFile.name || "recitation.mp4", size: S.recVidFile.size || 0, mime: S.recVidFile.type || "video/mp4" };
    if (S.recVidFile.size <= ASSET_EMBED_MAX) { a.mode = "embedded"; a.dataURL = await fileToDataURL(S.recVidFile); }
    else { a.mode = "missing"; a.reason = "حجم أكبر من 50MB"; }
    assets.push(a);
  }
  const logoDataURL = localStorage.getItem("gt_sqr_logo_v1");
  if (logoDataURL) assets.push({ key: "logo", name: "logo.png", mode: "embedded", dataURL: logoDataURL });
  return {
    format: PROJECT_FORMAT, formatVersion: PROJECT_FORMAT_VERSION,
    appVersion: PROJECT_APP_VERSION, platform: "web",
    savedAt: new Date().toISOString(), settings: { byId, byName }, assets,
  };
}
async function deserializeProject(proj) {
  if (!proj || (proj.format !== PROJECT_FORMAT && proj.format !== "GT-SQRM-Project")) throw new Error("ملفّ مشروع غير صالح");
  const byId = proj.settings?.byId || {}, byName = proj.settings?.byName || {};
  for (const [id, value] of Object.entries(byId)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = !!value;
    else if (el.type === "radio") { }
    else el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  for (const [name, value] of Object.entries(byName)) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(el => {
      if (el.type === "radio") {
        el.checked = (el.value === value);
        if (el.checked) el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }
  const missing = [];
  for (const a of (proj.assets || [])) {
    if (a.mode === "embedded" && a.dataURL) await restoreAssetFromDataURL(a);
    else missing.push(a);
  }
  if (missing.length) showMissingAssetsModal(missing);
  clearProjectDirty();
  return { restored: (proj.assets || []).length - missing.length, missing: missing.length };
}
async function restoreAssetFromDataURL(asset) {
  const blob = dataURLToBlob(asset.dataURL);
  const file = new File([blob], asset.name, { type: asset.mime || blob.type });
  const fakeInput = { files: [file], value: "" };
  if (asset.key === "logo") {
    try { localStorage.setItem("gt_sqr_logo_v1", asset.dataURL); } catch (_) {}
    if (typeof restoreLogo === "function") restoreLogo();
  } else if (asset.key === "bgImage") {
    if (typeof onBgMedia === "function") onBgMedia(fakeInput, "image");
  } else if (asset.key === "bgAudio") {
    if (typeof onBgAudio === "function") onBgAudio(fakeInput);
  } else if (asset.key === "recVideo") {
    if (typeof onRecVidFile === "function") onRecVidFile(fakeInput);
  } else if (asset.key && asset.key.startsWith("bgVideo[")) {
    if (typeof addBgVidItem === "function") {
      addBgVidItem(file);
      setTimeout(() => {
        if (Array.isArray(S.bgVidItems) && S.bgVidItems.length) {
          const last = S.bgVidItems[S.bgVidItems.length - 1];
          if (last) {
            if (asset.audioEnabled !== undefined) last.audioEnabled = !!asset.audioEnabled;
            if (asset.audioGain !== undefined) last.audioGain = asset.audioGain;
            if (typeof renderBgVidList === "function") renderBgVidList();
          }
        }
      }, 250);
    }
  }
}
function showMissingAssetsModal(missing) {
  const modal = document.getElementById("missing-assets-modal");
  const list = document.getElementById("missing-assets-list");
  if (!modal || !list) return;
  const replacements = new Map();
  list.innerHTML = missing.map((a, i) => {
    const acc = a.key === "bgImage" ? "image/*" : a.key === "bgAudio" ? "audio/*"
              : (a.key || "").startsWith("bgVideo") ? "video/*" : a.key === "logo" ? "image/*" : "*/*";
    return `<div style="padding:8px;background:var(--bg1);border-radius:var(--r);border:1px solid var(--b1)">
        <div style="font-size:11px;color:var(--t1);margin-bottom:4px"><b style="color:var(--al)">${a.key}</b> — ${a.name || ""}</div>
        <div style="font-size:10px;color:var(--t3);margin-bottom:6px">السبب: ${a.reason || "غير متوفّر"}</div>
        <input type="file" data-missing-idx="${i}" accept="${acc}" style="font-size:10px;width:100%"></div>`;
  }).join("");
  list.querySelectorAll("input[data-missing-idx]").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(inp.dataset.missingIdx);
      const f = e.target.files?.[0]; if (f) replacements.set(idx, f);
    });
  });
  modal.style.display = "flex";
  const close = () => { modal.style.display = "none"; };
  document.getElementById("missing-assets-skip").onclick = () => { toast(`⏭️ تخطّي ${missing.length} مصدر`, "info", 1800); close(); };
  document.getElementById("missing-assets-apply").onclick = async () => {
    let n = 0;
    for (const [idx, file] of replacements.entries()) {
      const orig = missing[idx];
      const fakeAsset = { ...orig, dataURL: await fileToDataURL(file), mode: "embedded", name: file.name, mime: file.type };
      await restoreAssetFromDataURL(fakeAsset); n++;
    }
    toast(`✅ تمّ استبدال ${n} مصدر`, "success", 2000); close();
  };
}
async function saveProjectToPath(_filePath) {
  const proj = await serializeProject();
  const json = JSON.stringify(proj, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fname = (S.projectFileName || `gt-sqr-project-${Date.now()}.gtsqr`).replace(/\.json$/, ".gtsqr");
  a.href = url; a.download = fname; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  S.projectFileName = fname;
  clearProjectDirty();
  return true;
}
async function saveProjectInteractive() {
  const ok = await saveProjectToPath(null);
  if (ok) toast("💾 تمّ تنزيل ملفّ المشروع", "success", 2200);
}
async function openProjectInteractive() {
  if (S.projectDirty && !confirm("لديك تغييرات غير محفوظة. متابعة؟")) return;
  document.getElementById("proj-open-input")?.click();
}
async function openProjectFromBlob(file) {
  if (S.projectDirty && !confirm("لديك تغييرات غير محفوظة. متابعة؟")) return;
  const text = await file.text();
  try {
    const proj = JSON.parse(text);
    const result = await deserializeProject(proj);
    S.projectFileName = file.name;
    updateProjectTitle();
    toast(`📂 ${file.name} (${result.restored} مصدر${result.missing ? ` · ⚠️ ${result.missing} مفقود` : ""})`, result.missing ? "warn" : "success", 2800);
  } catch (e) { toast(`❌ ملفّ غير صالح: ${e.message}`, "error", 3000); }
}
function startAutoSave() {
  stopAutoSave();
  const enabled = ge("autosave-on");
  const intervalMin = parseInt(document.getElementById("autosave-interval")?.value || 5);
  const status = document.getElementById("autosave-status");
  if (!enabled) { if (status) status.textContent = "⏸️ غير مُفعَّل"; try { localStorage.setItem("gt_sqr_autosave_on", "0"); } catch (_) {} return; }
  try { localStorage.setItem("gt_sqr_autosave_on", "1"); localStorage.setItem("gt_sqr_autosave_interval", String(intervalMin)); } catch (_) {}
  if (status) status.textContent = `🟢 مُفعَّل — كلّ ${intervalMin} دقيقة (المتصفّح)`;
  _autoSaveTimer = setInterval(async () => {
    if (!S.projectDirty) return;
    try {
      const json = JSON.stringify(await serializeProject());
      if (json.length < 4_500_000) {
        localStorage.setItem("gt_sqr_autosave_blob", json);
        toast(`💾 حفظ تلقائيّ في المتصفّح`, "info", 1500);
      } else toast("⚠️ المشروع كبير جداً للحفظ في المتصفّح — صدّر يدوياً", "warn", 2200);
    } catch (_) {}
  }, intervalMin * 60 * 1000);
}
function stopAutoSave() { if (_autoSaveTimer) { clearInterval(_autoSaveTimer); _autoSaveTimer = null; } }
function showCloseConfirmModal(onQuit) {
  const modal = document.getElementById("close-confirm-modal");
  if (!modal) {
    if (confirm("لديك تغييرات غير محفوظة. حفظ قبل الإغلاق؟")) saveProjectInteractive().then(() => { if (onQuit) onQuit(); });
    else if (onQuit) onQuit();
    return;
  }
  modal.style.display = "flex";
  const close = () => { modal.style.display = "none"; };
  document.getElementById("close-confirm-cancel").onclick = close;
  document.getElementById("close-confirm-quit").onclick = () => { close(); if (onQuit) onQuit(); };
  document.getElementById("close-confirm-save").onclick = async () => { close(); await saveProjectInteractive(); if (!S.projectDirty && onQuit) onQuit(); };
}
function initProjectSystem() {
  document.getElementById("proj-save-btn")?.addEventListener("click", saveProjectInteractive);
  document.getElementById("proj-open-btn")?.addEventListener("click", openProjectInteractive);
  document.getElementById("proj-open-input")?.addEventListener("change", (e) => {
    const f = e.target.files?.[0]; if (f) openProjectFromBlob(f);
    e.target.value = "";
  });
  const autosaveOn = document.getElementById("autosave-on");
  if (autosaveOn) {
    try { autosaveOn.checked = localStorage.getItem("gt_sqr_autosave_on") === "1"; } catch (_) {}
    autosaveOn.addEventListener("change", () => {
      const ctrl = document.getElementById("autosave-ctrl");
      if (ctrl) ctrl.style.display = autosaveOn.checked ? "block" : "none";
      startAutoSave();
    });
    autosaveOn.dispatchEvent(new Event("change"));
  }
  document.getElementById("autosave-interval")?.addEventListener("change", () => { if (ge("autosave-on")) startAutoSave(); });
  try {
    const savedIv = localStorage.getItem("gt_sqr_autosave_interval");
    if (savedIv && document.getElementById("autosave-interval")) document.getElementById("autosave-interval").value = savedIv;
  } catch (_) {}
  window.addEventListener("beforeunload", (e) => {
    if (S.projectDirty) { e.preventDefault(); e.returnValue = "لديك تغييرات غير محفوظة."; return e.returnValue; }
  });
  const trackInputs = () => {
    document.querySelectorAll("input, select, textarea").forEach(el => {
      if (el._dirtyTracked) return;
      if (el.type === "button" || el.type === "submit" || el.type === "file") return;
      el._dirtyTracked = true;
      const handler = () => markProjectDirty();
      el.addEventListener("change", handler);
      if (el.type !== "checkbox" && el.type !== "radio") el.addEventListener("input", handler);
    });
  };
  trackInputs(); setTimeout(trackInputs, 2000);
  updateProjectTitle();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(initProjectSystem, 100));
else setTimeout(initProjectSystem, 100);
