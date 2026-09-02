"use strict";

// ═══════════════════════════════════════════════════════
//  GT-SQR — Web Deterministic Export Engine (V2)
//  مكافئ للمكتبية: VideoEncoder + AudioEncoder من WebCodecs
//  بدل MediaRecorder + captureStream — لا تقطّع، لا انجراف
//  ───────────────────────────────────────────────────────
//  المتطلبات (تُكتشف تلقائياً، fallback لـ MediaRecorder):
//    - VideoEncoder + AudioEncoder (Chrome 94+, Edge, Safari 16.4+, Firefox 130+)
//    - mp4-muxer (محمَّل كـ ES module في window.Mp4Muxer)
//    - webm-muxer (احتياط لو AAC غير مدعوم) في window.WebmMuxer
// ═══════════════════════════════════════════════════════

// ── جدول الكوديكات الممكنة ────────────────────────────
//   AAC غير مدعوم في Firefox لأسباب براءات اختراع → نسقط على Opus داخل MP4
//   H.264 hardware-encoded غير متاح في كل المتصفحات → نسقط على VP9 داخل WebM
const WEB_EXPORT_CODECS = {
  "mp4-h264": {
    ext: "mp4", muxer: "mp4",
    videoTries: [
      { videoCodec: "avc", videoCodecStr: "avc1.42E01F" },  // H.264 Baseline
    ],
    audioTries: [
      { audioCodec: "aac",  audioCodecStr: "mp4a.40.2" },   // AAC LC (الأفضل قبولاً)
      { audioCodec: "opus", audioCodecStr: "opus"      },   // Opus داخل MP4 (مدعوم منذ 2014)
    ],
  },
  "webm-vp9": {
    ext: "webm", muxer: "webm",
    videoTries: [
      { videoCodec: "vp9", videoCodecStr: "vp09.00.10.08" },
      { videoCodec: "vp8", videoCodecStr: "vp8" },
    ],
    audioTries: [
      { audioCodec: "opus", audioCodecStr: "opus" },
    ],
  },
};

// ── اختر أول كوديك يدعمه المتصفح فعلياً ───────────────
async function pickSupportedVideoCodec(tries, baseCfg) {
  for (const t of tries) {
    const cfg = { ...baseCfg, codec: t.videoCodecStr };
    const sup = await VideoEncoder.isConfigSupported(cfg).catch(() => ({ supported: false }));
    if (sup.supported) return { ...t, config: cfg };
  }
  return null;
}
async function pickSupportedAudioCodec(tries, baseCfg) {
  for (const t of tries) {
    const cfg = { ...baseCfg, codec: t.audioCodecStr };
    const sup = await AudioEncoder.isConfigSupported(cfg).catch(() => ({ supported: false }));
    if (sup.supported) return { ...t, config: cfg };
  }
  return null;
}

// v3.3 — seek HTMLVideoElement
function seekVideoToTimeWeb(v, t) {
  return new Promise(resolve => {
    if (!v || !isFinite(v.duration)) return resolve();
    const target = Math.min(t, Math.max(0, v.duration - 1e-4));
    if (Math.abs(v.currentTime - target) < 0.02) return resolve();
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      try { v.removeEventListener("seeked", onSeeked); } catch (_) {}
      resolve();
    };
    const onSeeked = () => finish();
    v.addEventListener("seeked", onSeeked);
    try { v.currentTime = target; } catch (_) { finish(); return; }
    setTimeout(finish, 800);
  });
}

// ══════════════════════════════════════════════════════════════
//  v1.2.4 — مُزامَنةُ خَلفيّةِ الفيديو بِالتَشغيلِ لا بِالنَقل
//  ────────────────────────────────────────────────────────────
//  قِياسٌ مِن جِهازِ المُستَخدِم: «إطاراتُ الخَلفيّةِ المُتَمَيِّزة: 5 مِن 689»
//  أَي إطارٌ واحِدٌ كُلَّ خَمسِ ثَوانٍ تَقريباً — فَتَبدو الخَلفيّةُ مُتَقَطِّعةً في
//  البِدايةِ ثُمَّ تَقِفُ. السَبَبُ أنَّ كُلَّ نَقلة (seek) تُعيدُ فَكَّ التَرميزِ مِن
//  آخِرِ إطارٍ مِفتاحيّ، وهذا عَلى الهاتِفِ يُكَلِّفُ ثَوانِيَ لِلنَقلةِ الواحِدة.
//
//  الحَلُّ الجَذريّ: لا نَنقُلُ أَصلاً. نُشَغِّلُ الفيديو ونَضبِطُ **سُرعَتَه**
//  لِتُطابِقَ سُرعَةَ تَقَدُّمِنا في التَصدير. فَكُّ التَرميزِ التَتابُعيُّ (التَشغيل)
//  أَسرَعُ مِنَ النَقلِ بِمَراتِبَ، فَتَعودُ الخَلفيّةُ سَلِسةً بِمُعَدَّلِها الكامِل.
//
//  السُرعةُ المَطلوبة = (ثَواني الوَسيطِ المُنتَجة) ÷ (ثَواني الزَمَنِ الحَقيقيّ)،
//  ويُضافُ إلَيها تَصحيحٌ تَناسُبيٌّ لِلانحِراف. وإن تَجاوَزَ الانحِرافُ الحَدَّ
//  (لَفُّ القائِمةِ أو تَبديلُ مَقطَع) نَنقُلُ مَرّةً واحِدةً لِإعادةِ المُزامَنة.
// ══════════════════════════════════════════════════════════════
function createBgPlaybackSync() {
  return {
    clipIndex: -1,
    lastWant: -1,
    resyncs: 0,
    rateChanges: 0,
    playFailed: false,
    playAborts: 0,          // v1.2.22 — رَفضُ play() العارِضُ لا الدائِم
    // v1.2.20 — مُراقِبُ «الفيديو لا يَتَقَدَّم»
    lastCurTime: -1,
    stalled: 0,
    slowSeek: false,
  };
}

async function syncBgByPlayback(st, vid, wantTime, clipIndex, mediaDone, wallSec) {
  if (!vid || !isFinite(vid.duration)) return;

  // ⚠️ v1.2.20 — لِمَ 0.25 لا 0.0625؟
  //   مُزامَنةُ التَشغيلِ تَضبِطُ سُرعةَ الفيديو لِتُطابِقَ تَقَدُّمَ التَصدير. فَإن
  //   كانَ التَصديرُ بَطيئاً جِدّاً (تَحريكُ خَلفيّةٍ بِالتَكبير + مُؤَثِّراتٌ تَقرَأُ
  //   البِكسِلات) هَبَطَتِ السُرعةُ المَطلوبةُ إلى عُشرِ الحَقيقيّ أَو أَقَلّ —
  //   وعِندَ هذه السُرعاتِ لا يَتَقَدَّمُ مَجرى فَكِّ التَرميزِ في WebView أَصلاً،
  //   فَتَخرُجُ **خَلفيّةٌ مُجَمَّدة** بَينَما يَعمَلُ كُلُّ شَيءٍ آخَرَ بِطَبيعَتِه.
  //   (هذا سَبَبُ «التَكبير ⇒ خَلفيّةٌ مُجَمَّدة» بَينَما «ثابِت ⇒ سَليم».)
  //   دونَ 0.25 لا فائِدةَ مِنَ التَشغيلِ أَصلاً: النَقلُ (seek) أَدَقُّ وأَوثَق،
  //   وكُلفَتُهُ لا تُذكَرُ ما دُمنا بَطيئينَ إلى هذا الحَدّ.
  const RESYNC_EPS = 0.75;   // ثانِية — فَوقَها نَنقُلُ مَرّةً واحِدة
  const RATE_MIN = 0.25, RATE_MAX = 4;
  const SEEK_EPS = 0.05;     // في وَضعِ النَقلِ نُطابِقُ كُلَّ إطارٍ تَقريباً
  const STALL_LIMIT = 6;     // إطاراتٌ مُتَتالِيةٌ بِلا تَقَدُّمٍ ⇒ التَشغيلُ عاجِز

  // تَبديلُ مَقطَعٍ أو رُجوعٌ لِلوَراء (لَفُّ القائِمة) ⇒ إعادةُ مُزامَنةٍ صَريحة
  const switched = (clipIndex !== st.clipIndex) || (wantTime + 0.05 < st.lastWant);
  st.clipIndex = clipIndex;
  st.lastWant = wantTime;

  const drift = vid.currentTime - wantTime;

  // ── مُراقِبُ الجُمود: هَل يَتَقَدَّمُ الفيديو فِعلاً؟ ────────────────
  //   v1.2.20 — لا نَثِقُ بِأَنَّ `play()` نَجَحَ لِأَنَّهُ لَم يَرمِ خَطَأً: قَد
  //   يَقبَلُهُ المُحَرِّكُ ثُمَّ لا يُقَدِّمُ إطاراً واحِداً. نَقيسُ التَقَدُّمَ نَفسَه.
  if (!st.slowSeek && !switched && st.lastCurTime >= 0) {
    if (Math.abs(vid.currentTime - st.lastCurTime) < 1e-4) {
      if (++st.stalled >= STALL_LIMIT) {
        st.slowSeek = true;
        console.warn("[V2] خَلفيّةُ الفيديو لا تَتَقَدَّمُ بِالتَشغيل — التَحَوُّلُ إلى النَقل");
      }
    } else st.stalled = 0;
  }
  st.lastCurTime = vid.currentTime;

  // السُرعةُ الأَساسُ = نِسبةُ تَقَدُّمِنا الحَقيقيّ، مَعَ تَصحيحِ الانحِراف
  const base = (wallSec > 0.4) ? (mediaDone / wallSec) : 0.5;
  let rate = base - drift * 1.2;
  if (!isFinite(rate)) rate = base;

  // بَطيءٌ أَكثَرَ مِمّا يُطيقُهُ التَشغيل ⇒ اِنقُل بَدَلَ أَن تُشَغِّل
  const tooSlow = rate < RATE_MIN;
  if (tooSlow || st.slowSeek || st.playFailed) {
    if (!vid.paused) { try { vid.pause(); } catch (_) {} }
    if (switched || Math.abs(drift) > SEEK_EPS) {
      st.resyncs++;
      await seekVideoToTimeWeb(vid, wantTime, 0.03, 1200);
      st.lastCurTime = vid.currentTime;
    }
    return;
  }

  if (switched || Math.abs(drift) > RESYNC_EPS) {
    st.resyncs++;
    try { vid.pause(); } catch (_) {}
    await seekVideoToTimeWeb(vid, wantTime, 0.03, 1200);
    st.lastCurTime = vid.currentTime;
  }

  rate = Math.max(RATE_MIN, Math.min(RATE_MAX, rate));
  if (Math.abs(vid.playbackRate - rate) > 0.03) {
    try { vid.playbackRate = rate; st.rateChanges++; } catch (_) {}
  }
  if (vid.paused) {
    try {
      vid.muted = true;             // الصَوتُ يُخلَطُ مُنفَصِلاً — والكَتمُ يُجيزُ التَشغيلَ بِلا إيماءة
      await vid.play();
      st.playAborts = 0;
    } catch (e) {
      // ⚠️ v1.2.22 — لا تُعامِل كُلَّ رَفضٍ مُعامَلةَ المَنعِ الدائِم.
      //   `play()` يُعيدُ وَعداً؛ فَإن استَدعَينا `pause()` قَبلَ أَن يُحسَم —
      //   وهذا يَقَعُ في الإطارِ التالي كُلَّما لَزِمَت إعادةُ مُزامَنة — رُفِضَ
      //   الوَعدُ بِـAbortError: «The play() request was interrupted by a call
      //   to pause()». وهُوَ **فِعلُنا نَحنُ** لا مَنعٌ مِنَ المُتَصَفِّح. وكانَ
      //   الرَمزُ يَرفَعُ `playFailed` عَلَيهِ رَفعاً **دائِماً**، فَيَسقُطُ التَصديرُ
      //   كُلُّهُ إلى النَقلِ إطاراً بِإطار: خَلفيّةٌ بِـ9.8 إطار/ث بَدَلَ 30،
      //   و757 إعادةَ مُزامَنةٍ في مَقطَعٍ واحِد (كَما في تَقريرِ المُستَخدِم).
      //   المَنعُ الحَقيقيُّ اسمُهُ NotAllowedError وَحدَه.
      const name = (e && e.name) || "";
      if (name === "NotAllowedError" || name === "NotSupportedError") {
        st.playFailed = true;
        console.warn("[V2] المُتَصَفِّحُ مَنَعَ تَشغيلَ خَلفيّةِ الفيديو — العَودةُ إلى النَقل:", e && e.message);
      } else {
        // AbortError وأَمثالُه: عارِضٌ. أَعِدِ المُحاوَلةَ في الإطارِ التالي.
        st.playAborts = (st.playAborts || 0) + 1;
        if (st.playAborts >= 12) {
          st.playFailed = true;     // تَكَرَّرَ كَثيراً ⇒ لا جَدوى
          console.warn("[V2] تَعَذَّرَ تَثبيتُ تَشغيلِ الخَلفيّة — العَودةُ إلى النَقل");
        }
      }
    }
  }
}

// ── فحص دعم WebCodecs والمكسرات ──────────────────────
function isWebCodecsSupported() {
  return typeof VideoEncoder !== "undefined"
      && typeof AudioEncoder !== "undefined"
      && typeof VideoFrame   !== "undefined"
      && typeof AudioData    !== "undefined"
      && (window.Mp4Muxer || window.WebmMuxer);
}

// ── خلط الصوت (مشترك مع المكتبية، لكن منسوخ هنا للويب) ──
async function mixAudioToBufferWeb({
  audioBuffers, ayaStarts,
  bgBuffer, bgGain, bgLoop,
  bgVidAudioItems,          // [{buffer, gain, dur}] لخلفيات الفيديو مع صوت مفعَّل
  bgVidCrossfadeSec,        // مدة الـ crossfade لاحتساب overlap بين المقاطع
  totalDuration, recGain, sampleRate = 44100,
}) {
  const channels = 2;
  const length = Math.max(1, Math.ceil(totalDuration * sampleRate));
  const oac = new OfflineAudioContext(channels, length, sampleRate);

  (audioBuffers || []).forEach((buf, i) => {
    if (!buf) return;
    const src = oac.createBufferSource();
    src.buffer = buf;
    const gain = oac.createGain();
    gain.gain.value = recGain ?? 1;
    src.connect(gain); gain.connect(oac.destination);
    src.start(ayaStarts[i] ?? 0);
  });

  if (bgBuffer) {
    const dur = bgBuffer.duration;
    let t = 0, safety = 0;
    while (t < totalDuration && safety++ < 4096) {
      const src = oac.createBufferSource();
      src.buffer = bgBuffer;
      const gain = oac.createGain();
      gain.gain.value = bgGain ?? 0.3;
      src.connect(gain); gain.connect(oac.destination);
      const remaining = totalDuration - t;
      if (remaining < dur) src.start(t, 0, remaining);
      else src.start(t);
      if (!bgLoop) break;
      t += dur;
    }
  }

  // ── أصوات خلفيات الفيديو (لكل مقطع صوت مستقل + مستوى) ──
  //   يحترم crossfade overlap: المقطع التالي يبدأ قبل نهاية الحالي بـ xf ث
  if (Array.isArray(bgVidAudioItems) && bgVidAudioItems.length) {
    const xf = Math.max(0, bgVidCrossfadeSec || 0);
    // احسب أوقات بداية كل مقطع في دورة واحدة من الـ playlist
    const starts = [];
    let cum = 0;
    for (let i = 0; i < bgVidAudioItems.length; i++) {
      starts.push(cum);
      cum += Math.max(0.1, (bgVidAudioItems[i].dur || 0) - xf);
    }
    // v1.3.0 — لُحمةُ الحَلقة: إن لَحَمَتِ الصورةُ دَورَتَها وَجَبَ أَن يَلحَمَ
    //   الصَوتُ مِثلَها، وإلّا انحَرَفا بِـxf في كُلِّ لَفّة. الدَورةُ المَلحومةُ
    //   أَقصَرُ بِـxf وتَبدَأُ مُتَقَدِّمةً بِـxf (أَوَّلُ xf مِنَ المَقطَعِ الأَوَّلِ
    //   لا تُسمَعُ في اللَفّةِ الأولى كَما لا تُرى).
    const _seamPlan = (typeof bgLoopSeamWeb === "function")
      ? bgLoopSeamWeb(bgVidAudioItems.map(it => it.dur || 0), xf, totalDuration)
      : { seam: false };
    const cycleDur = _seamPlan.seam ? cum : (cum + xf);  // المدة الكلية للدورة كاملة
    const seamShift = _seamPlan.seam ? -xf : 0;

    // كرّر الـ playlist حتى تغطّي totalDuration
    let cycleStart = 0;
    let safety = 0;
    while (cycleStart < totalDuration && safety++ < 100) {
      for (let i = 0; i < bgVidAudioItems.length; i++) {
        const it = bgVidAudioItems[i];
        if (!it.buffer) continue;   // v1.2 — تَخَطّى المَقاطع الصامِتة لكنّ مَواضِعها مَحفوظة
        let startTime = cycleStart + starts[i] + seamShift;
        let headCut = 0;
        if (startTime < 0) { headCut = -startTime; startTime = 0; }
        if (startTime >= totalDuration) break;
        const src = oac.createBufferSource();
        src.buffer = it.buffer;
        const gain = oac.createGain();
        gain.gain.value = it.gain ?? 0.5;
        src.connect(gain); gain.connect(oac.destination);
        // v1.2 — trimStart offset في القراءة من الـbuffer
        const bufOffset = Math.max(0, Math.min((it.trimStart || 0) + headCut, it.buffer.duration));
        const bufDur = Math.min(it.buffer.duration - bufOffset,
                                Math.max(0, (it.dur || it.buffer.duration) - headCut));
        const remaining = totalDuration - startTime;
        const playDur = Math.max(0, Math.min(bufDur, remaining));
        if (playDur > 0) src.start(startTime, bufOffset, playDur);
      }
      if (cycleDur <= 0.1) break; // أمان
      cycleStart += cycleDur;
    }
  }

  return await oac.startRendering();
}

// ── المحرّك الرئيسي ───────────────────────────────────
// ── FFT صغير (Cooley-Tukey radix-2) لتحليل طيف الصوت ──
//   يُستخدم لحساب بيانات الموجة الصوتية لكل إطار في V2
function fftMagnitudes(input) {
  const N = input.length;
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  for (let i = 0; i < N; i++) re[i] = input[i];
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let cRe = 1, cIm = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const tRe = cRe * re[b] - cIm * im[b];
        const tIm = cRe * im[b] + cIm * re[b];
        re[b] = re[a] - tRe; im[b] = im[a] - tIm;
        re[a] += tRe; im[a] += tIm;
        const ncr = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe;
        cRe = ncr;
      }
    }
  }
  const mag = new Float32Array(N >> 1);
  for (let i = 0; i < (N >> 1); i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / N;
  return mag;
}

// ── حساب بيانات الموجة لكل إطار (V2 export) ─────────
//   نأخذ نافذة 512 عينة (بـ Hann) لكل إطار، نُحلّلها FFT
//   ثم نأخذ النطاق الصوتي (~80Hz - 3kHz) في 64 بن للعرض
function precomputeWaveDataForExport(mixed, totalFrames, FPS) {
  // يحاكي تماماً سلوك AnalyserNode المُستخدم في المعاينة:
  //   fftSize=512, smoothingTimeConstant=0.82
  //   minDecibels=-100, maxDecibels=-30 (افتراضيّات Web Audio API)
  // الناتج: ذبذبات هابطة بانسيابيّة مطابقة للمعاينة.
  const sr = mixed.sampleRate;
  const ch0 = mixed.getChannelData(0);
  const ch1 = mixed.numberOfChannels > 1 ? mixed.getChannelData(1) : null;
  const N = 512;
  const halfN = N >> 1;
  const bins = 64;

  // نافذة Blackman (المستخدمة فعلياً في AnalyserNode — أدقّ من Hann)
  const blackman = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    blackman[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
                       + 0.08 * Math.cos((4 * Math.PI * i) / (N - 1));
  }

  // نطاق الصوت البشريّ (مطابق للمعاينة)
  const voiceStart = 1;
  const voiceEnd = Math.min(35, halfN - 1);
  const voiceLen = voiceEnd - voiceStart + 1;

  const SMOOTHING = 0.82;
  const MIN_DB = -100;
  const MAX_DB = -30;
  const DB_RANGE = MAX_DB - MIN_DB;

  const smoothedDB = new Float32Array(halfN);
  for (let i = 0; i < halfN; i++) smoothedDB[i] = MIN_DB;

  const window = new Float32Array(N);
  const out = new Array(totalFrames);

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / FPS;
    const startSample = Math.max(0, Math.floor(t * sr) - halfN);
    for (let i = 0; i < N; i++) {
      const idx = startSample + i;
      let s = 0;
      if (idx < ch0.length) {
        s = ch0[idx];
        if (ch1) s = (s + ch1[idx]) * 0.5;
      }
      window[i] = s * blackman[i];
    }

    const mag = fftMagnitudes(window);

    for (let i = 0; i < halfN; i++) {
      const m = Math.max(mag[i], 1e-10);
      const db = 20 * Math.log10(m);
      smoothedDB[i] = SMOOTHING * smoothedDB[i] + (1 - SMOOTHING) * db;
    }

    const data = new Uint8Array(bins);
    for (let b = 0; b < bins; b++) {
      const srcIdx = voiceStart + Math.floor((b / bins) * voiceLen);
      const normalized = (smoothedDB[srcIdx] - MIN_DB) / DB_RANGE;
      data[b] = Math.max(0, Math.min(255, Math.floor(normalized * 255)));
    }
    out[frame] = data;
  }
  return out;
}

// ── deterministic seek لِخَلفيّة الفيديو في التَصدير ──
// v1.2 Bug#1 — كان النَهج القَديم (syncBgVidPlayback) يَضبُط playbackRate حتى 16×
// → تَسريع مَرئيّ + عَدَم تَزامُن بَين الحاليّ والقادم في الـcrossfade.
// الآن نَحسِب مَوضِع كُلّ إطار حَتميّاً ثُمّ نَستَخدِم seekVideoToTimeWeb — نَفس نَمط recvid.
//
// الوقت في timeline المُدمَج:
//   clip i يَبدأ عند start(i) = Σ D[k<i] − i·xf
//   وينتهي عند start(i) + D[i]
//   يَتَزامَن مَع بَداية clip i+1 عند start(i) + D[i] − xf (نافذة الـxfade)
//   cycleDur = ΣD − (N−1)·xf
// v1.3.0 — لُحمةُ الحَلقة: قَرارٌ واحِدٌ يَستَعمِلُهُ الصَوتُ والصورةُ مَعاً
//   حَتّى لا يَنفَرِدَ أَحَدُهُما بِدَورةٍ أَطوَلَ فَيَنحَرِفا.
function bgLoopSeamWeb(clipDurations, xf, totalDuration) {
  const N = Array.isArray(clipDurations) ? clipDurations.length : 0;
  const sum = N ? clipDurations.reduce((a, b) => a + (parseFloat(b) || 0), 0) : 0;
  const cycle = sum - (N - 1) * xf;                 // الدَورةُ الخَطّيّة
  const willLoop = (typeof totalDuration === "number") && totalDuration > cycle + 0.05;
  const seam = !!(N >= 2 && xf > 0 && willLoop && cycle > 2.5 * xf);
  return { seam, cycle, loopDur: seam ? cycle - xf : cycle };
}

function getBgClipAtTimeWeb(t, clipDurations, xf, totalDuration) {
  const N = clipDurations.length;
  if (N === 0) return null;
  if (N === 1) {
    const dur = clipDurations[0];
    if (!(dur > 0)) return { clipIndex: 0, localTime: 0, inXfade: false, nextClipIndex: -1, nextLocalTime: 0, xfadeAlpha: 0 };
    return { clipIndex: 0, localTime: t % dur, inXfade: false, nextClipIndex: -1, nextLocalTime: 0, xfadeAlpha: 0 };
  }

  // مَوضِعٌ في التَسَلسُلِ الخَطّيّ [0, cycle) — بِلا لَفّ
  const resolveLinear = (x) => {
    let cum = 0;
    for (let i = 0; i < N; i++) {
      const clipEnd = cum + clipDurations[i];
      if (x < clipEnd) {
        const localTime = x - cum;
        const remaining = clipEnd - x;
        const inXfade = (remaining <= xf && i < N - 1 && xf > 0);
        let nextClipIndex = -1, nextLocalTime = 0, xfadeAlpha = 0;
        if (inXfade) {
          nextClipIndex = i + 1;
          const nextStart = cum + clipDurations[i] - xf;
          nextLocalTime = Math.max(0, x - nextStart);
          xfadeAlpha = Math.max(0, Math.min(1, 1 - remaining / xf));
        }
        return { clipIndex: i, localTime, inXfade, nextClipIndex, nextLocalTime, xfadeAlpha };
      }
      cum += clipDurations[i] - xf;
    }
    return { clipIndex: N - 1, localTime: clipDurations[N-1] || 0, inXfade: false, nextClipIndex: -1, nextLocalTime: 0, xfadeAlpha: 0 };
  };

  const plan = bgLoopSeamWeb(clipDurations, xf, totalDuration);

  // ══ v1.3.0 — عَطَب #3: العَودةُ مِن آخِرِ مَقطَعٍ إلى أَوَّلِهِ كانَت قَطعاً حادّاً
  //   الاِنتِقالاتُ بَينَ المَقاطِعِ كانَت مَمزوجةً، أمّا لَفُّ القائِمةِ — ويَقَعُ
  //   كُلَّما طالَتِ التِلاوةُ عَن مَجموعِ المَقاطِع — فَكانَ يَقفِزُ قَفزاً.
  //   الآنَ الدَورةُ مَلحومة: مُدَّتُها (cycle − xf)، تَبدَأُ عِندَ xf مِنَ المَقطَعِ
  //   الأَوَّلِ ويَذوبُ آخِرُ مَقطَعٍ في أَوَّلِهِ عِندَ نِهايَتِها. وهذا مُطابِقٌ
  //   حَرفيّاً لِما يَبنيهِ ffmpeg في نُسخةِ سَطحِ المَكتَب (`extract-bg-frames`).
  if (plan.seam) {
    const L = plan.loopDur;                     // = cycle − xf
    let tau = t % L;
    if (tau < 0) tau += L;
    const bodyEnd = L - xf;                     // = cycle − 2·xf
    if (tau < bodyEnd) return resolveLinear(tau + xf);
    const a = (tau - bodyEnd) / xf;             // 0 → 1
    return {
      clipIndex: N - 1,
      localTime: Math.max(0, (clipDurations[N - 1] || 0) - xf + (tau - bodyEnd)),
      inXfade: true,
      nextClipIndex: 0,
      nextLocalTime: tau - bodyEnd,
      xfadeAlpha: Math.max(0, Math.min(1, a)),
    };
  }

  let x = t;
  if (plan.cycle > 0 && x >= plan.cycle) x = x % plan.cycle;
  return resolveLinear(x);
}

async function startWebExportV2(opts) {
  const {
    canvas, drawFrame, setStateForTime,
    totalDuration, fps,
    audioBuffers, ayaStarts, bgBuffer, bgGain, bgLoop, recGain,
    bgVideo,                  // HTMLVideoElement لخلفية الفيديو (يحتاج seek)
    codecKey, videoBitrate, audioBitrate,
    onProgress, cancelRef,
    saveTarget,               // v3.5 — وِجهةُ حَفظٍ مَحجوزةٌ بِإيماءةِ المُستَخدِم
  } = opts;

  if (!isWebCodecsSupported()) {
    throw new Error("WebCodecs غير مدعوم في هذا المتصفح");
  }

  // ترتيب المحاولة: المطلوب أولاً ثم WebM/VP9 كاحتياط شامل
  const tryOrder = codecKey === "webm-vp9"
    ? ["webm-vp9"]
    : ["mp4-h264", "webm-vp9"];

  const FPS = Math.max(1, Math.floor(fps || 30));
  const W = canvas.width, H = canvas.height;
  const totalFrames = Math.max(1, Math.ceil(totalDuration * FPS));
  const sampleRate = 44100;
  const channels   = 2;

  // ── 1) اختيار كوديك مدعوم فعلياً (مع fallback) ──────
  onProgress(2, "🔍 فحص دعم الكوديك في المتصفح…");
  const baseVideoCfg = {
    width: W, height: H,
    bitrate: (videoBitrate || 8) * 1_000_000,
    framerate: FPS,
  };
  const baseAudioCfg = {
    numberOfChannels: channels,
    sampleRate,
    bitrate: parseInt((audioBitrate || "192k")) * 1000,
  };

  let fmt = null, pickedV = null, pickedA = null;
  for (const key of tryOrder) {
    const candidate = WEB_EXPORT_CODECS[key];
    if (!candidate) continue;
    const MuxerLib = (candidate.muxer === "mp4") ? window.Mp4Muxer : window.WebmMuxer;
    if (!MuxerLib) continue;
    const v = await pickSupportedVideoCodec(candidate.videoTries, baseVideoCfg);
    const a = await pickSupportedAudioCodec(candidate.audioTries, baseAudioCfg);
    if (v && a) {
      fmt = candidate; pickedV = v; pickedA = a;
      console.log(`[V2] codec: ${v.videoCodecStr} + ${a.audioCodecStr} (${candidate.muxer})`);
      if (key !== codecKey) {
        // إن كان المختار مختلفاً عمّا طلب المستخدم → أبلغه
        const reqName = codecKey === "mp4-h264" ? "MP4" : "WebM";
        const useName = key === "mp4-h264" ? "MP4" : "WebM";
        if (typeof toast === "function") {
          toast(`ℹ️ ${reqName} غير مدعوم بالكامل — استخدام ${useName} (${a.audioCodecStr})`, "info", 4500);
        }
      }
      break;
    }
  }
  if (!fmt) {
    throw new Error("لا يدعم المتصفح أي كوديك متاح. حاول Chrome/Edge أحدث.");
  }

  // ── 2) إعداد الـ muxer ──────────────────────────────
  const MuxerLib = (fmt.muxer === "mp4") ? window.Mp4Muxer : window.WebmMuxer;
  const muxer = new MuxerLib.Muxer({
    target: new MuxerLib.ArrayBufferTarget(),
    video: {
      codec: pickedV.videoCodec,
      width: W, height: H,
      frameRate: FPS,
    },
    audio: {
      codec: pickedA.audioCodec,
      numberOfChannels: channels,
      sampleRate,
    },
    fastStart: (fmt.muxer === "mp4") ? "in-memory" : undefined,
  });

  // ── 3) إعداد المُرَمِّزات ─────────────────────────────
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error("VideoEncoder error:", e),
  });
  videoEncoder.configure(pickedV.config);

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => console.error("AudioEncoder error:", e),
  });
  audioEncoder.configure(pickedA.config);

  // ── 4) خلط الصوت ────────────────────────────────────
  onProgress(5, "🎵 جاري خلط المسار الصوتي…");
  // v1.2 — كُلّ المَقاطع المَرئيّة (visible) تُبقي مَواضِعها في timeline (starts + cycleDur)
  //   المُفَعَّل صَوتها فَقط لَه buffer، والباقي buffer=null → تَتَخَطّاه الحَلقة
  //   يُصلِح: صَوت مَقطع واحد يَستَمِرّ عَلى طول الفيديو المُصَدَّر بدَل التَوقُّف
  const globalMute = document.getElementById("bg-vid-mute-audio")?.checked;
  const _getEff = typeof getBgClipEffectiveDur === "function" ? getBgClipEffectiveDur : (it => it.dur || 0);
  const _getTs  = typeof getBgClipTrimStart    === "function" ? getBgClipTrimStart    : (_  => 0);
  const bgVidAudioItems = globalMute ? [] : (S.bgVidItems || [])
    .filter(it => !it.hidden)
    .map(it => ({
      buffer: (it.audioEnabled && it.audioBuffer) ? it.audioBuffer : null,
      gain: it.audioGain,
      dur: _getEff(it),
      trimStart: _getTs(it),
    }));
  const mixed = await mixAudioToBufferWeb({
    audioBuffers, ayaStarts, bgBuffer, bgGain, bgLoop,
    bgVidAudioItems,
    bgVidCrossfadeSec: (typeof getCrossfadeDur === "function") ? getCrossfadeDur() : 0,
    totalDuration, recGain, sampleRate,
  });
  if (cancelRef?.canceled) { try { videoEncoder.close(); audioEncoder.close(); } catch (_) {} throw new Error("cancelled"); }

  // ── 4.5) احسب بيانات الموجة الصوتية لكل إطار ────────
  //   حتى تظهر ذبذبات الصوت في المخرج (vs أنّها فارغة)
  onProgress(6, "📊 حساب بيانات الموجة الصوتية…");
  const exportWaveData = precomputeWaveDataForExport(mixed, totalFrames, FPS);

  // ── 5) ترميز الصوت (مقطع-بمقطع) ─────────────────────
  onProgress(7, "🔊 جاري ترميز الصوت…");
  const audioChunkSamples = 1024;
  const audioFrameDuration = audioChunkSamples / sampleRate;
  // ادمج القنوات في مصفوفة interleaved Float32 (AudioData يتوقع planar أو interleaved حسب layout)
  const chans = [];
  for (let c = 0; c < channels; c++) chans.push(mixed.getChannelData(c));
  for (let off = 0; off < mixed.length; off += audioChunkSamples) {
    if (cancelRef?.canceled) break;
    const len = Math.min(audioChunkSamples, mixed.length - off);
    // planar: كل قناة في جزء منفصل من البافر
    const data = new Float32Array(len * channels);
    for (let c = 0; c < channels; c++) {
      const src = chans[c];
      const dst = data.subarray(c * len, c * len + len);
      for (let i = 0; i < len; i++) dst[i] = src[off + i];
    }
    const audioData = new AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: len,
      numberOfChannels: channels,
      timestamp: Math.round((off / sampleRate) * 1_000_000),
      data,
    });
    audioEncoder.encode(audioData);
    audioData.close();
  }

  // ── 6) ترميز الفيديو (إطار-بإطار، حتمي) ─────────────
  const savedAya         = S.currentAya;
  const savedElapsed     = S.elapsed;
  const savedBgT         = S.bgMotionT;
  const savedBgVid       = S.bgVid;                        // v1.2 Bug#1
  const savedBgVidNext   = S.bgVidNext;
  const savedBgFadeProg  = S.bgVidFadeProgress;
  let lastUiTick = 0;

  // علم: يَمنَع updateBgVidCrossfade من العَبَث بحالة الـcrossfade خلال التَصدير
  S._exportingV2 = true;

  // v1.2 Bug#1 — تَحضير قائمة المقاطع المَرئيّة (تَجاهُل المُعمّاة)
  //   Feature#2 — استخدام المُدَد الفَعّالة بَعد trim
  const visibleBgClips = (S.bgVidItems || []).filter(it => !it.hidden && it.vid);
  const _effV = typeof getBgClipEffectiveDur === "function" ? getBgClipEffectiveDur : (it => it.dur || 0);
  const _tsV  = typeof getBgClipTrimStart    === "function" ? getBgClipTrimStart    : (_  => 0);
  const bgClipDurations = visibleBgClips.map(_effV);
  const bgClipTrimStarts = visibleBgClips.map(_tsV);
  const bgXf = (typeof getCrossfadeDur === "function") ? getCrossfadeDur() : 0;

  // أَوقِف كُلّ فيديوهات الخَلفيّة — نُدير مَواقعها بالـseek
  for (const it of (S.bgVidItems || [])) {
    try { it.vid.pause(); it.vid.playbackRate = 1; } catch (_) {}
  }
  if (visibleBgClips.length) {
    try { visibleBgClips[0].vid.currentTime = bgClipTrimStarts[0]; } catch (_) {}
    S.bgVid = visibleBgClips[0].vid;
    S.bgVidNext = null;
    S.bgVidFadeProgress = 0;
  }

  // v3.5 — مُزامَنةُ الخَلفيّةِ بِالتَشغيلِ لا بِالنَقل (انظُر الكُتلةَ أَعلاه).
  //   يُشَغَّلُ افتِراضيّاً ويَسقُطُ إلى النَقلِ تِلقائيّاً إن مَنَعَ المُتَصَفِّحُ
  //   التَشغيلَ أَو لَم يَتَقَدَّمِ الفيديو.
  const bgFast = (typeof ge === "function") ? (ge("export-bg-fast") !== false) : true;
  const bgSync = createBgPlaybackSync();
  const tStartMs = performance.now();

  for (let i = 0; i < totalFrames; i++) {
    if (cancelRef?.canceled) break;
    const t = i / FPS;

    // v1.2 Bug#1 — deterministic seek لِمَقطع(مَقاطع) الخَلفيّة
    if (visibleBgClips.length) {
      const cinfo = getBgClipAtTimeWeb(t, bgClipDurations, bgXf, totalDuration);
      if (cinfo) {
        S.bgVid = visibleBgClips[cinfo.clipIndex].vid;
        const seekPos = bgClipTrimStarts[cinfo.clipIndex] + cinfo.localTime;
        if (bgFast) {
          const wallSec = (performance.now() - tStartMs) / 1000;
          await syncBgByPlayback(bgSync, S.bgVid, seekPos, cinfo.clipIndex, t, wallSec);
        } else {
          await seekVideoToTimeWeb(S.bgVid, seekPos);
        }
        if (cinfo.inXfade) {
          S.bgVidNext = visibleBgClips[cinfo.nextClipIndex].vid;
          const nextSeekPos = bgClipTrimStarts[cinfo.nextClipIndex] + cinfo.nextLocalTime;
          // المَقطَعُ التالي يُنقَلُ نَقلاً: ظُهورُهُ قَصيرٌ ولا يَستَحِقُّ تَشغيلاً مُوازِياً
          await seekVideoToTimeWeb(S.bgVidNext, nextSeekPos);
          const ease = (typeof easeInOutCubic === "function") ? easeInOutCubic : (x => x);
          S.bgVidFadeProgress = ease(cinfo.xfadeAlpha);
        } else {
          if (S.bgVidNext) { try { S.bgVidNext.pause(); } catch (_) {} }
          S.bgVidNext = null;
          S.bgVidFadeProgress = 0;
        }
      }
    }

    // بيانات الموجة الصوتية للإطار الحالي
    S._exportWaveData = exportWaveData[i];
    if (setStateForTime) setStateForTime(t);
    // v3.3 — مزامنة فيديو التلاوة مع زمن الإطار
    if (S.recVidEl && typeof ge === "function" && ge("recvid-on")) {
      await seekVideoToTimeWeb(S.recVidEl, t);
    }
    drawFrame(t);

    // VideoFrame من الـ canvas بـ timestamp دقيق
    const videoFrame = new VideoFrame(canvas, {
      timestamp: Math.round(t * 1_000_000),
      duration:  Math.round(1_000_000 / FPS),
    });
    // مفتاح كل ثانية (يحسّن seek والـ scrubbing)
    const keyFrame = (i % FPS === 0);
    videoEncoder.encode(videoFrame, { keyFrame });
    videoFrame.close();

    // backpressure — لا تترك الطابور يكبر بلا حدود
    // v3.5 — MessageChannel لا setTimeout: المُتَصَفِّحُ يَخنُقُ المُؤَقِّتاتِ إلى
    //   نِداءٍ كُلَّ ثانِيةٍ حينَ تُخفى الصَفحة، فَكانَ التَصديرُ يَهبِطُ إلى
    //   ~إطارٍ في الثانِيةِ بِمُجَرَّدِ تَبديلِ التَبويبِ أَو إطفاءِ الشاشة.
    if (videoEncoder.encodeQueueSize > 8) {
      if (window.PIO && window.PIO.yieldToBrowser) await window.PIO.yieldToBrowser();
      else await new Promise(r => setTimeout(r, 5));
    }

    const now = performance.now();
    if (now - lastUiTick > 200 || i === totalFrames - 1) {
      lastUiTick = now;
      const pct = 10 + Math.round(((i + 1) / totalFrames) * 85);
      onProgress(pct, `🎞 إطار ${i + 1}/${totalFrames}  ·  ${formatTime(t)} / ${formatTime(totalDuration)}`);
    }
  }

  // استعادة حالة الواجهة
  S.currentAya = savedAya;
  S.elapsed    = savedElapsed;
  S.bgMotionT  = savedBgT;
  S.bgVid              = savedBgVid;                        // v1.2 Bug#1
  S.bgVidNext          = savedBgVidNext;
  S.bgVidFadeProgress  = savedBgFadeProg;
  S._exportWaveData = null;   // عد إلى analyser/synthetic للمعاينة
  S._exportingV2 = false;
  // أَوقِف كُلّ فيديوهات الخَلفيّة (كانت مُسَلَّمة للـseek/التَشغيل)
  //   v3.5 — وأَعِد سُرعةَ التَشغيلِ إلى 1، وإلّا بَقِيَت المُعاينةُ بِسُرعةِ التَصدير
  for (const it of (S.bgVidItems || [])) {
    try { it.vid.pause(); it.vid.playbackRate = 1; } catch (_) {}
  }

  if (cancelRef?.canceled) {
    try { videoEncoder.close(); audioEncoder.close(); } catch (_) {}
    throw new Error("cancelled");
  }

  // ── 7) Flush + finalize ─────────────────────────────
  onProgress(96, "📦 جاري إنهاء التغليف…");
  await videoEncoder.flush();
  await audioEncoder.flush();
  muxer.finalize();
  videoEncoder.close();
  audioEncoder.close();

  // ── 8) تنزيل الناتج ─────────────────────────────────
  const buffer = muxer.target.buffer;
  const mime = (fmt.muxer === "mp4") ? "video/mp4" : "video/webm";
  const blob = new Blob([buffer], { type: mime });
  const fname = `GT-SQR_${Date.now()}.${fmt.ext}`;

  // v3.5 — طَبَقةُ التَسليم: تَكتُبُ في المَوضِعِ الذي حَجَزَهُ المُستَخدِمُ إن
  //   وُجِد، وإلّا تَنزيلُ المُتَصَفِّح. `<a download>` وَحدَهُ يَفشَلُ صامِتاً في
  //   وَضعِ PWA المُستَقِلّ فَيَضيعُ عَمَلُ ساعةٍ بِلا أَثَرٍ ولا رِسالة.
  let delivered = null;
  if (window.PIO) {
    delivered = await window.PIO.deliverFile(blob, fname, mime, { target: saveTarget });
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    delivered = { method: "download", path: fname };
  }
  if (!delivered) throw new Error("تَعَذَّرَ حِفظُ الناتِج — راجِع سِجِلَّ الحَفظ");

  onProgress(100, "✅ اكتمل التصدير!");
  return { ok: true, size: buffer.byteLength, blob, filename: fname, mime, delivered };
}

function formatTime(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
}

// ── تصدير عمومي ─────────────────────────────────────
window.WEB_EXPORT_CODECS    = WEB_EXPORT_CODECS;
window.startWebExportV2     = startWebExportV2;
window.isWebCodecsSupported = isWebCodecsSupported;
