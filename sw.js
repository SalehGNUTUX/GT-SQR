// GT-SQR Service Worker — Offline Support
const CACHE = "gt-sqr-v1";
const STATIC = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Reem+Kufi:wght@400;700&family=Scheherazade+New:wght@400;700&family=Cairo:wght@300;400;600;700;900&family=Noto+Naskh+Arabic:wght@400;700&family=Lateef:wght@400;700&family=Harmattan:wght@400;700&family=Markazi+Text:ital,wght@0,400;0,700;1,400&family=Aref+Ruqaa&display=swap"
];

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=> c.addAll(STATIC).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e=>{
  // Skip cross-origin audio (Quran audio CDN)
  if(e.request.url.includes("everyayah.com") || e.request.url.includes("api.alquran.cloud")){
    e.respondWith(
      fetch(e.request).catch(()=>
        new Response(JSON.stringify({error:"offline"}),{headers:{"Content-Type":"application/json"}})
      )
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(res=>{
        if(res && res.status===200 && res.type==="basic"){
          const clone = res.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return res;
      }).catch(()=> caches.match("./index.html"));
    })
  );
});
