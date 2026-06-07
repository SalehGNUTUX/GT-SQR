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
    const cycleDur = cum + xf;  // المدة الكلية للدورة كاملة

    // كرّر الـ playlist حتى تغطّي totalDuration
    let cycleStart = 0;
    let safety = 0;
    while (cycleStart < totalDuration && safety++ < 100) {
      for (let i = 0; i < bgVidAudioItems.length; i++) {
        const it = bgVidAudioItems[i];
        if (!it.buffer) continue;
        const startTime = cycleStart + starts[i];
        if (startTime >= totalDuration) break;
        const src = oac.createBufferSource();
        src.buffer = it.buffer;
        const gain = oac.createGain();
        gain.gain.value = it.gain ?? 0.5;
        src.connect(gain); gain.connect(oac.destination);
        const remaining = totalDuration - startTime;
        if (remaining < it.buffer.duration) {
          src.start(startTime, 0, remaining);
        } else {
          src.start(startTime);
        }
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

// ── ضبط معدّل تشغيل فيديو الخلفية ليطابق سرعة الترميز ──
//   في الويب لا يوجد ffmpeg → نترك الفيديو يلعب طبيعياً
//   لكن نضبط playbackRate ليطابق وتيرة الـ encode (وإلا يلعب أبطأ منها)
//   نقيس وتيرة الإطارات الفعلية ونضبط ديناميكياً كل ~30 إطار
function syncBgVidPlayback(vid, frameNum, FPS, msSinceStart) {
  if (!vid || vid.paused === undefined) return;
  if (frameNum < 30) return; // اتركه ينطلق أولاً
  // الوقت المقدّر للوصول للإطار الحالي (real-time): frameNum/FPS
  const ourClockSec = frameNum / FPS;
  const wallClockSec = msSinceStart / 1000;
  // إن كان الترميز أسرع من الزمن الحقيقي (wallClock < ourClock)، الفيديو متخلّف
  // → نُسرّعه. الزيادة المثلى = ourClock / wallClock
  const ratio = wallClockSec > 0 ? (ourClockSec / wallClockSec) : 1;
  const newRate = Math.max(0.25, Math.min(16, ratio));
  if (Math.abs((vid.playbackRate || 1) - newRate) > 0.1) {
    try { vid.playbackRate = newRate; } catch (_) {}
  }
}

async function startWebExportV2(opts) {
  const {
    canvas, drawFrame, setStateForTime,
    totalDuration, fps,
    audioBuffers, ayaStarts, bgBuffer, bgGain, bgLoop, recGain,
    bgVideo,                  // HTMLVideoElement لخلفية الفيديو (يحتاج seek)
    codecKey, videoBitrate, audioBitrate,
    onProgress, cancelRef,
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
  // اجمع buffers صوتية للمقاطع المُفعّل صوتها (إن وجدت)
  const bgVidAudioItems = (S.bgVidItems || [])
    .filter(it => it.audioEnabled && it.audioBuffer)
    .map(it => ({ buffer: it.audioBuffer, gain: it.audioGain, dur: it.dur }));
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
  const savedAya     = S.currentAya;
  const savedElapsed = S.elapsed;
  const savedBgT     = S.bgMotionT;
  let lastUiTick = 0;

  // علم: switchToNextBgVid يستخدمه لتشغيل المقطع التالي حتى لو S.playing=false
  S._exportingV2 = true;

  // شغّل المقطع الأول الحالي من البداية
  if (S.bgVid) {
    try {
      S.bgVid.currentTime = 0;
      S.bgVid.playbackRate = 1;
      // لا نُفعّل loop — `ended` يطلق switchToNextBgVid للانتقال للتالي
      S.bgVid.loop = (S.bgVidItems && S.bgVidItems.length > 1) ? false : true;
      await S.bgVid.play().catch(() => {});
    } catch (_) {}
  }

  const loopStartMs = performance.now();
  for (let i = 0; i < totalFrames; i++) {
    if (cancelRef?.canceled) break;
    const t = i / FPS;
    // استخدم S.bgVid مباشرة (يتغيّر بعد كل switchToNextBgVid)
    const curVid = S.bgVid;
    if (curVid) {
      // ضمان استمرار التشغيل في حال توقّف الفيديو الجديد لأي سبب
      if (curVid.paused) { try { curVid.play().catch(() => {}); } catch (_) {} }
      // ضبط ديناميكي لـ playbackRate ليطابق وتيرة الترميز
      syncBgVidPlayback(curVid, i, FPS, performance.now() - loopStartMs);
    }
    // بيانات الموجة الصوتية للإطار الحالي
    S._exportWaveData = exportWaveData[i];
    if (setStateForTime) setStateForTime(t);
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
    if (videoEncoder.encodeQueueSize > 8) {
      await new Promise(r => setTimeout(r, 5));
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
  S._exportWaveData = null;   // عد إلى analyser/synthetic للمعاينة
  S._exportingV2 = false;

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
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `GT-SQR_${Date.now()}.${fmt.ext}`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);

  onProgress(100, "✅ اكتمل التصدير!");
  return { ok: true, size: buffer.byteLength };
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
