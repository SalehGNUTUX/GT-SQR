// GT-SQR Service Worker v3
// يجب رفع رقم الإصدار عند كل تحديث للملفات
const CACHE_VER = "gt-sqr-v3";

// الأصول المطلوبة لعمل التطبيق بدون إنترنت
// ⚠️ أي ملف هنا غير موجود سيمنع تسجيل SW بالكامل
const REQUIRED = [
  "./index.html",
  "./app.js",
  "./manifest.json"
];

// الأصول الاختيارية (فشلها لا يوقف التثبيت)
const OPTIONAL = [
  "./gt-sqr-icons/192x192/gt-sqr-icon.png",
  "./gt-sqr-icons/512x512/gt-sqr-icon.png",
  "./gt-sqr-icons/32x32/gt-sqr-icon.png",
  "./gt-sqr-icons/16x16/gt-sqr-icon.png",
  "./fonts/fonts.json",
  "https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Reem+Kufi:wght@400;700&family=Scheherazade+New:wght@400;700&family=Cairo:wght@300;400;600;700;900&family=Noto+Naskh+Arabic:wght@400;700&family=Lateef:wght@400;700&family=Harmattan:wght@400;700&family=Markazi+Text:ital,wght@0,400;0,700;1,400&family=Aref+Ruqaa&display=swap"
];

// ── INSTALL ─────────────────────────────────────────────
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_VER);

    // تحميل الملفات المطلوبة — أي فشل يوقف التثبيت
    await cache.addAll(REQUIRED);

    // تحميل الملفات الاختيارية — الفشل لا يوقف التثبيت
    await Promise.allSettled(
      OPTIONAL.map(url =>
        cache.add(url).catch(err =>
          console.warn(`[SW] Optional asset failed: ${url}`, err)
        )
      )
    );

    // تفعيل SW الجديد فوراً بدون انتظار إغلاق التبويبات
    self.skipWaiting();
  })()
  );
});

// ── ACTIVATE ─────────────────────────────────────────────
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    // حذف الكاشات القديمة
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== CACHE_VER)
        .map(k => {
          console.log(`[SW] Deleting old cache: ${k}`);
          return caches.delete(k);
        })
    );
    // التحكم الفوري بجميع التبويبات المفتوحة
    await self.clients.claim();
  })()
  );
});

// ── FETCH ────────────────────────────────────────────────
self.addEventListener("fetch", e => {
  const url = e.request.url;

  // الطلبات الخارجية (صوت + API) — الشبكة أولاً بدون كاش
  if (
    url.includes("everyayah.com") ||
    url.includes("api.alquran.cloud")
  ) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(
          JSON.stringify({ error: "offline", code: 503 }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  // طلبات غير GET — لا نتدخل
  if (e.request.method !== "GET") return;

  // باقي الطلبات — الكاش أولاً ثم الشبكة
  e.respondWith(
    caches.match(e.request).then(async cached => {
      if (cached) return cached;

      try {
        const res = await fetch(e.request);
        // نخزن فقط الاستجابات الناجحة من الأصل نفسه
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_VER).then(c => c.put(e.request, clone));
        }
        return res;
      } catch (_) {
        // بدون إنترنت + غير مخزن → أعد الصفحة الرئيسية
        const fallback = await caches.match("./index.html");
        return fallback || new Response("Offline", { status: 503 });
      }
    })
  );
});
