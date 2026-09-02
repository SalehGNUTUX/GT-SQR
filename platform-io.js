"use strict";
// ═══════════════════════════════════════════════════════════════
//  GT-SQR — طَبَقةُ المِلَفّاتِ واليَقَظة (v3.1)      platform-io.js
//  ───────────────────────────────────────────────────────────────
//  مَنقولةٌ عَن GT-SIRM بَعدَ أَن أَثبَتَتها أَربَعُ جَولاتِ اختِبارٍ عَلى جِهازٍ
//  حَقيقيّ، مُجَرَّدةً هُنا مِن فُروعِ Android/Capacitor التي لا مَعنى لَها في
//  نُسخةِ الويب. تَحُلُّ عِلَّتَينِ أَبلَغَ عَنهُما المُستَخدِمُ في التَوأَم:
//
//  1) «بَعدَ انتِهاءِ التَصديرِ لا أَجِدُ لِلمَلَفِّ أَثَراً»
//     السَبَب: التَسليمُ كانَ بِـ`<a download>` وَحدَه. وهُوَ يَفشَلُ صامِتاً
//     في وَضعِ PWA المُستَقِلّ (standalone) وفي بَعضِ مُتَصَفِّحاتِ الهاتِف.
//     الحَلّ: سِلسِلةُ تَسليمٍ مُتَدَرِّجة — File System Access (حينَ يَختارُ
//     المُستَخدِمُ المَوضِعَ بِنَفسِه) ← `<a download>` ← ورَقةُ المُشارَكةِ
//     الأَصليّة، مَعَ سِجِلِّ حَفظٍ يُنسَخُ عِندَ الفَشَلِ فَلا نُخَمِّنُ ما جَرى.
//
//  2) «إن أَغلَقتُ الشاشةَ أو فَتَحتُ بَرنامَجاً آخَرَ يَقِفُ التَصدير»
//     السَبَب: النِظامُ يُطفِئُ الشاشةَ ويَخنُقُ `setTimeout` في الخَلفيّة
//     (نِداءٌ واحِدٌ كُلَّ ثانِيةٍ) فَتَهبِطُ حَلقةُ التَصديرِ إلى إطارٍ/ثانِية.
//     الحَلّ: قُفلُ يَقَظةِ الشاشة + تَنازُلٌ عَنِ المُعالِجِ بِـMessageChannel
//     (لا يُخنَق) بَدَلَ `setTimeout`.
//
//  سُكونٌ تامٌّ إن غابَت كُلُّ القُدُرات: يَسقُطُ إلى سُلوكِ المُتَصَفِّحِ المُعتاد.
// ═══════════════════════════════════════════════════════════════

(function () {

  const HAS_FSA_SAVE = (typeof window !== "undefined"
    && typeof window.showSaveFilePicker === "function");

  // ── سِجِلُّ الحَفظ ────────────────────────────────────────────
  //   دائِرةٌ قَصيرةٌ تَحفَظُ خُطُواتِ مُحاوَلةِ الحَفظِ ونَتيجَتَها. تُعرَضُ
  //   لِلمُستَخدِمِ عِندَ الفَشَلِ فَيَنسَخَها: بِلا هذا لا سَبيلَ لِمَعرِفةِ ما جَرى
  //   داخِلَ جِهازِه. ويَبدَأُ مِن أَوَّلِ نَقرةٍ لا مِن دُخولِ طَبَقةِ التَسليم،
  //   فَالعَطَبُ قَد يَقَعُ **قَبلَ** الوُصولِ إلَيها فَيَخرُجُ السِجِلُّ فارِغاً.
  const _trace = [];
  function trace(step, detail) {
    const line = new Date().toISOString().slice(11, 23) + " · " + step +
                 (detail === undefined ? "" : " — " + detail);
    _trace.push(line);
    if (_trace.length > 60) _trace.shift();
    try { console.log("[PIO] " + line); } catch (_) {}
  }
  function beginSaveTrace(what) { clearTrace(); trace(what || "بَدءُ حَفظ"); persistTrace(); }
  function noteSaveTrace(step, detail) { trace(step, detail); persistTrace(); }
  function clearTrace() { _trace.length = 0; }
  function persistTrace() {
    try { localStorage.setItem("gt_sqr_last_save_trace", _trace.join("\n")); } catch (_) {}
  }
  function saveTrace() {
    if (_trace.length) return _trace.join("\n");
    // سِجِلُّ آخِرِ مُحاوَلةٍ يَبقى بَعدَ إغلاقِ البَرنامَج: العَطَبُ قَد يَقَعُ ولا
    // يُفتَحُ التَشخيصُ إلّا في جَلسةٍ تالِية.
    try { return localStorage.getItem("gt_sqr_last_save_trace") || ""; } catch (_) { return ""; }
  }

  // ── 1) الكِتابةُ عَبرَ مِقبَضِ File System Access ─────────────
  async function saveViaHandle(handle, blob) {
    try {
      const perm = await handle.queryPermission?.({ mode: "readwrite" });
      if (perm && perm !== "granted") {
        const req = await handle.requestPermission?.({ mode: "readwrite" });
        if (req !== "granted") throw new Error("الإذنُ مَرفوض");
      }
      const w = await handle.createWritable();
      await w.write(blob);
      await w.close();
      trace("FSA ✓", handle.name + " · " + blob.size + " بايت");
      return { method: "fsa", path: handle.name, bytes: blob.size };
    } catch (e) {
      trace("الكِتابةُ عَبرَ FSA فَشِلَت", String((e && e.message) || e));
      return null;
    }
  }

  // ── 2) تَنزيلُ المُتَصَفِّح ────────────────────────────────────
  function saveViaDownload(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { URL.revokeObjectURL(url); a.remove(); } catch (_) {} }, 60000);
      trace("أُطلِقَ تَنزيلُ المُتَصَفِّح", filename);
      return { method: "download", path: filename, bytes: blob.size };
    } catch (e) {
      trace("تَنزيلُ المُتَصَفِّحِ فَشِل", String((e && e.message) || e));
      return null;
    }
  }

  /**
   * يَحجِزُ وِجهةَ الحَفظِ بِإيماءةِ المُستَخدِم (نَقرَتِهِ) قَبلَ العَمَلِ الطَويل.
   * لا بُدَّ مِن هذا: `showSaveFilePicker` يَشتَرِطُ إيماءةً حَديثة، فَلَو
   * دَعَوناهُ بَعدَ تَصديرٍ يَستَغرِقُ دَقائِقَ لَرُفِضَ.
   * يُعيد: {kind:"fsa",handle} أو {kind:"aborted"} أو null.
   */
  async function prepareSaveTarget(filename, mime, accept) {
    if (!HAS_FSA_SAVE) return null;
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: accept ? [accept] : undefined,
      });
      return { kind: "fsa", handle };
    } catch (e) {
      if (e && e.name === "AbortError") return { kind: "aborted" };
      return null;
    }
  }

  /**
   * يُسَلِّمُ مَلَفّاً إلى تَخزينِ المُستَخدِمِ عَبرَ أَفضَلِ وَسيلةٍ مُتاحة.
   *   opts.target    — واصِفُ وِجهةٍ مِن prepareSaveTarget (اختِياريّ)
   * يُعيد: { method, path, bytes } أو null إن فَشِلَت كُلُّ الوَسائل.
   */
  async function deliverFile(blob, filename, mime, opts) {
    opts = opts || {};
    trace("طَبَقةُ التَسليم", filename + " · " + mime + " · " +
                              (blob.size / 1048576).toFixed(2) + " م.ب");
    if (opts.target && opts.target.kind === "fsa" && opts.target.handle) {
      const r = await saveViaHandle(opts.target.handle, blob);
      if (r) { persistTrace(); return r; }
    }
    const r2 = saveViaDownload(blob, filename);
    persistTrace();
    return r2;
  }

  /**
   * يُشارِكُ الناتِجَ مِنَ الذاكِرةِ مُباشَرةً عَبرَ Web Share Level 2.
   * أَهَمِّيَّتُها عَلى الهاتِف: `<a download>` قَد يَفشَلُ صامِتاً في وَضعِ PWA
   * المُستَقِلّ، بَينَما ورَقةُ المُشارَكةِ تُتيحُ الحِفظَ في «المِلَفّات» أو
   * المَعرِضِ أو الإرسالَ مُباشَرةً.
   */
  async function shareBlob(blob, filename, mime) {
    try {
      if (typeof File !== "function" || !navigator.share || !navigator.canShare) return false;
      const file = new File([blob], filename, { type: mime });
      if (!navigator.canShare({ files: [file] })) return false;
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch (e) {
      if (e && e.name === "AbortError") return true;   // أَلغى المُستَخدِمُ — لَيسَ فَشَلاً
      console.warn("[PIO] مُشارَكةُ المَلَفِّ فَشِلَت:", e);
      return false;
    }
  }

  /** هَل يَقدِرُ هذا الجِهازُ عَلى مُشارَكةِ مَلَفٍّ (لِإظهارِ الزِرِّ مِن عَدَمِه)؟ */
  function canShareFiles() {
    try {
      if (typeof File !== "function" || !navigator.canShare) return false;
      return navigator.canShare({ files: [new File([new Uint8Array(1)], "x.mp4", { type: "video/mp4" })] });
    } catch (_) { return false; }
  }

  // ══════════════════════════════════════════════════════════
  //  اليَقَظة — إبقاءُ التَصديرِ يَعمَلُ والشاشةِ مُضاءة
  // ══════════════════════════════════════════════════════════

  let _screenLock = null;
  let _visHandler = null;
  let _awakeDepth = 0;

  async function _requestScreenLock() {
    try {
      if (!navigator.wakeLock || document.visibilityState !== "visible") return;
      _screenLock = await navigator.wakeLock.request("screen");
      _screenLock.addEventListener("release", () => { _screenLock = null; });
    } catch (e) {
      // مَرفوضٌ أو غَيرُ مَدعوم — لا يُعَطِّلُ التَصدير
      console.warn("[PIO] قُفلُ يَقَظةِ الشاشةِ غَيرُ مُتاح:", e && e.message);
    }
  }

  async function keepAwakeStart() {
    _awakeDepth++;
    if (_awakeDepth > 1) return;
    await _requestScreenLock();
    // قُفلُ الشاشةِ يَسقُطُ تِلقائيّاً عِندَ إخفاءِ الصَفحة — أَعِدهُ عِندَ العَودة
    _visHandler = () => {
      if (document.visibilityState === "visible" && _awakeDepth > 0 && !_screenLock) {
        _requestScreenLock();
      }
    };
    document.addEventListener("visibilitychange", _visHandler);
  }

  /** لا عَمَلَ لَها في الويب (إشعارُ خِدمةٍ أَصليّة) — تَبقى لِتَماثُلِ الواجِهة. */
  function keepAwakeProgress() {}

  async function keepAwakeStop() {
    _awakeDepth = Math.max(0, _awakeDepth - 1);
    if (_awakeDepth > 0) return;
    if (_visHandler) { document.removeEventListener("visibilitychange", _visHandler); _visHandler = null; }
    if (_screenLock) { try { await _screenLock.release(); } catch (_) {} _screenLock = null; }
  }

  // ══════════════════════════════════════════════════════════
  //  مِهماز: تَنازُلٌ عَنِ المُعالِجِ بِلا setTimeout
  //  ───────────────────────────────────────────────────────
  //  المُتَصَفِّحاتُ تَخنُقُ setTimeout إلى نِداءٍ واحِدٍ كُلَّ ثانيةٍ حينَ تَكونُ
  //  الصَفحةُ مَخفيّة. فَإن استَعمَلَتهُ حَلقةُ التَصديرِ لِضَبطِ ضَغطِ المُرَمِّزِ
  //  هَبَطَت في الخَلفيّةِ إلى ~إطارٍ في الثانية.
  //  MessageChannel لا يُخنَقُ فَيُبقي الحَلقةَ تَجري بِسُرعَتِها.
  // ══════════════════════════════════════════════════════════
  const _mc = (typeof MessageChannel === "function") ? new MessageChannel() : null;
  const _yieldQueue = [];
  if (_mc) {
    _mc.port1.onmessage = () => {
      const fn = _yieldQueue.shift();
      if (fn) fn();
    };
    _mc.port1.start && _mc.port1.start();
  }
  function yieldToBrowser() {
    if (!_mc) return new Promise(r => setTimeout(r, 0));
    return new Promise(resolve => {
      _yieldQueue.push(resolve);
      _mc.port2.postMessage(0);
    });
  }

  window.PIO = {
    HAS_FSA_SAVE,
    prepareSaveTarget,
    deliverFile,
    saveViaDownload,
    shareBlob,
    canShareFiles,
    beginSaveTrace,
    noteSaveTrace,
    saveTrace,
    keepAwakeStart,
    keepAwakeProgress,
    keepAwakeStop,
    yieldToBrowser,
  };
})();
