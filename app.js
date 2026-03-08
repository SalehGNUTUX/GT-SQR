// ═══════════════════════════════════════════════════════
//  GT-SQR v2.0 — gnutux Short Quran Reels
//  Author: SalehGNUTUX | License: MIT
// ═══════════════════════════════════════════════════════
"use strict";

// ── RECITERS REGISTRY ──────────────────────────────────
// لإضافة قارئ جديد: أضف كائناً هنا أو استخدم زر "إضافة قارئ" في الواجهة
const RECITERS_LIST = [
  { id:"alafasy",  name:"مشاري العفاسي",        flag:"🇰🇼", folder:"Alafasy_128kbps" },
{ id:"ghamdi",   name:"سعد الغامدي",           flag:"🇸🇦", folder:"Ghamdi_40kbps" },
{ id:"minshawi", name:"المنشاوي مرتل",         flag:"🇪🇬", folder:"Minshawy_Murattal_128kbps" },
{ id:"husary",   name:"محمود الحصري",          flag:"🇪🇬", folder:"Husary_128kbps" },
{ id:"shaatri",  name:"أبو بكر الشاطري",       flag:"🇸🇦", folder:"abu_bakr_ash-shaatree_128kbps" },
{ id:"maher",    name:"ماهر المعيقلي",         flag:"🇸🇦", folder:"MaherAlMuaiqly128kbps" },
];

const BUILT_IN_FONTS = [
  { id:"amiri",     name:"Amiri Quran",     css:"'Amiri Quran'",       sample:"بِسْمِ اللَّهِ" },
{ id:"reem",      name:"Reem Kufi",        css:"'Reem Kufi'",         sample:"بِسْمِ اللَّهِ" },
{ id:"scheher",   name:"Scheherazade",     css:"'Scheherazade New'",  sample:"بِسْمِ اللَّهِ" },
{ id:"cairo",     name:"Cairo Bold",       css:"'Cairo'",             sample:"بِسْمِ اللَّهِ" },
{ id:"noto",      name:"Noto Naskh",       css:"'Noto Naskh Arabic'", sample:"بِسْمِ اللَّهِ" },
{ id:"lateef",    name:"Lateef",           css:"'Lateef'",            sample:"بِسْمِ اللَّهِ" },
{ id:"harmattan", name:"Harmattan",        css:"'Harmattan'",         sample:"بِسْمِ اللَّهِ" },
{ id:"markazi",   name:"Markazi Text",     css:"'Markazi Text'",      sample:"بِسْمِ اللَّهِ" },
{ id:"ruqaa",     name:"Aref Ruqaa",       css:"'Aref Ruqaa'",        sample:"بِسْمِ اللَّهِ" },
];

const THEMES = {
  emerald:{ gc1:"#0a2e1e",gc2:"#020d06",tc:"#ffffff",oc:"#c9a227" },
  gold:   { gc1:"#2a1a00",gc2:"#0d0800",tc:"#f5e6b0",oc:"#f0c842" },
  night:  { gc1:"#050a1e",gc2:"#020510",tc:"#e0e8ff",oc:"#4a9fd5" },
  rose:   { gc1:"#2a0d18",gc2:"#0d0408",tc:"#ffe0ef",oc:"#e85d8a" },
  ocean:  { gc1:"#002233",gc2:"#00080f",tc:"#d0f0ff",oc:"#00bcd4" },
  desert: { gc1:"#2e1e06",gc2:"#100900",tc:"#f0e0c0",oc:"#d4a017" },
  purple: { gc1:"#1a0a2e",gc2:"#08020f",tc:"#e8d8ff",oc:"#9c5cd4" },
  dark:   { gc1:"#111111",gc2:"#000000",tc:"#ffffff", oc:"#888888" },
};

const QURAN_API  = "https://api.alquran.cloud/v1";
const AUDIO_BASE = "https://everyayah.com/data";

// ── GLOBAL STATE ───────────────────────────────────────
const S = {
  surahs:[], verses:[], translations:[],
  currentAya:0, playing:false,
  elapsed:0, lastRafTs:null,
  ayaDurations:[],
  bgImg:null, bgVid:null,
  bgMotionT:0,
  audioCtx:null, analyser:null,
  recAudioEl:null, bgAudioEl:null, bgAudioDest:null,
  waveData:new Uint8Array(64).fill(0),
  stars:[], bokeh:[],
  exportCancel:false, mediaRecorder:null, exportChunks:[],
  templates:[], reciters:[...RECITERS_LIST],
  allFonts:[...BUILT_IN_FONTS],
  rafId:null,
};

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async ()=>{
  initTabs();
  initThemeChips();
  renderFontGrid();
  renderReciters();
  loadTemplates();
  generateParticles();
  initCanvas();
  checkOffline();
  startRenderLoop();       // ← render loop always runs
  await loadLocalFonts(false);
  await loadSurahList();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
});

// ══════════════════════════════════════════════════════
//  ALWAYS-RUNNING RENDER LOOP
// ══════════════════════════════════════════════════════
function startRenderLoop(){
  function loop(ts){
    S.rafId = requestAnimationFrame(loop);
    const dt = S.lastRafTs ? Math.min((ts - S.lastRafTs)/1000, .1) : 0;
    S.lastRafTs = ts;
    if(S.playing){
      S.elapsed  += dt;
      S.bgMotionT += dt;
      checkAyaAdvance();
      updateProgressUI();
    }
    drawFrame(ts/1000);
  }
  S.rafId = requestAnimationFrame(loop);
}

function checkAyaAdvance(){
  const dur = S.ayaDurations[S.currentAya] || parseFloat(gv("aya-dur")) || 6;
  if(S.elapsed >= dur){
    if(S.currentAya < S.verses.length - 1){
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
function initCanvas(){ onFmtChange(); }

function onFmtChange(){
  const fmt = radioVal("fmt");
  const cv  = $("cv");
  const sizes = {"9:16":{w:720,h:1280},"16:9":{w:1280,h:720},"1:1":{w:1080,h:1080}};
  const sz = sizes[fmt] || sizes["9:16"];
  cv.width = sz.w; cv.height = sz.h;
  $("fmt-lbl").textContent = fmt;
  fitCanvas();
}

function fitCanvas(){
  const preview = $("preview") || document.getElementById("preview");
  const cv = $("cv");
  if(!preview||!cv) return;
  const maxH = preview.clientHeight - 90;
  const maxW = preview.clientWidth  - 20;
  if(maxH<=0||maxW<=0) return;
  const ratio = cv.width/cv.height;
  let w=maxW, h=w/ratio;
  if(h>maxH){ h=maxH; w=h*ratio; }
  cv.style.width  = Math.floor(w)+"px";
  cv.style.height = Math.floor(h)+"px";
}
window.addEventListener("resize", fitCanvas);

// ══════════════════════════════════════════════════════
//  MAIN DRAW
// ══════════════════════════════════════════════════════
function drawFrame(ts){
  const cv  = $("cv");
  const ctx = cv.getContext("2d");
  const W=cv.width, H=cv.height;
  ctx.clearRect(0,0,W,H);

  drawBg(ctx,W,H,ts);
  applyColorFilter(ctx,W,H);
  if(ge("fx-bokeh")) drawBokeh(ctx,W,H,ts);
  applyDim(ctx,W,H);
  applyOvColor(ctx,W,H);
  drawOrnament(ctx,W,H,ts);
  if(ge("fx-stars")) drawStars(ctx,W,H,ts);
  if(ge("fx-rays"))  drawRays(ctx,W,H,ts);
  if(S.verses.length) drawVerse(ctx,W,H,ts);
  drawWave(ctx,W,H,ts);
  drawWatermark(ctx,W,H);
  if(ge("fx-vig"))   drawVignette(ctx,W,H);
  if(ge("fx-gold"))  drawGoldBorder(ctx,W,H,ts);
  if(ge("fx-grain")) drawGrain(ctx,W,H);
}

// ══════════════════════════════════════════════════════
//  BACKGROUND
// ══════════════════════════════════════════════════════
function drawBg(ctx,W,H,ts){
  const bgt = radioVal("bgt");
  const bgm = radioVal("bgm");
  const bright = gv("bright")/100;

  ctx.save();
  ctx.filter = `brightness(${bright}) saturate(${gv("satur")/100})`;

  if(bgt==="gradient" || (!S.bgImg && !S.bgVid)){
    drawGradient(ctx,W,H);
  } else if(bgt==="image" && S.bgImg){
    ctx.save();
    applyBgMotion(ctx,W,H,bgm,ts);
    imgCover(ctx,S.bgImg,0,0,W,H);
    ctx.restore();
  } else if(bgt==="video" && S.bgVid){
    if(S.bgVid.readyState >= 2){
      ctx.save();
      applyBgMotion(ctx,W,H,bgm,ts);
      imgCover(ctx,S.bgVid,0,0,W,H);
      ctx.restore();
    } else {
      drawGradient(ctx,W,H);
    }
  } else {
    drawGradient(ctx,W,H);
  }
  ctx.restore();
  ctx.filter = "none";
}

function drawGradient(ctx,W,H){
  const c1=$("gc1").value, c2=$("gc2").value;
  const dir=$("grad-dir").value;
  let gr;
  if(dir==="radial"){
    gr=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.75);
  } else {
    const map={tb:[W/2,0,W/2,H],bt:[W/2,H,W/2,0],diag:[0,0,W,H],rdiag:[W,0,0,H]};
    const [x0,y0,x1,y1]=map[dir]||map.tb;
    gr=ctx.createLinearGradient(x0,y0,x1,y1);
  }
  gr.addColorStop(0,c1); gr.addColorStop(1,c2);
  ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
}

function applyBgMotion(ctx,W,H,bgm,ts){
  const t=S.bgMotionT;
  if(bgm==="drift"){ const d=t*12%80; ctx.translate(d*.5,d*.3); ctx.scale(1.15,1.15); ctx.translate(-W*.075,-H*.06); }
  if(bgm==="zoom"){  const sc=1+((t*.04)%0.15); ctx.translate(W/2,H/2); ctx.scale(sc,sc); ctx.translate(-W/2,-H/2); }
  if(bgm==="pan"){   const p=(Math.sin(t*.25)+1)/2; ctx.translate(-p*60,0); ctx.scale(1.12,1); }
}

function imgCover(ctx,src,x,y,w,h){
  const sw=src.naturalWidth||src.videoWidth||w;
  const sh=src.naturalHeight||src.videoHeight||h;
  if(!sw||!sh) return;
  const ir=sw/sh, cr=w/h;
  let dw,dh,dx,dy;
  if(ir>cr){ dh=h; dw=dh*ir; dx=x-(dw-w)/2; dy=y; }
  else      { dw=w; dh=dw/ir; dy=y-(dh-h)/2; dx=x; }
  ctx.drawImage(src,dx,dy,dw,dh);
}

// ══════════════════════════════════════════════════════
//  COLOR FILTER
// ══════════════════════════════════════════════════════
function applyColorFilter(ctx,W,H){
  const cf=radioVal("cf");
  if(cf==="none") return;
  const id=ctx.getImageData(0,0,W,H), d=id.data;
  for(let i=0;i<d.length;i+=4){
    if(cf==="bw"){ const g=d[i]*.3+d[i+1]*.59+d[i+2]*.11; d[i]=d[i+1]=d[i+2]=g; }
    if(cf==="warm"){ d[i]=Math.min(255,d[i]*1.12); d[i+2]=Math.max(0,d[i+2]*.88); }
    if(cf==="cold"){ d[i]=Math.max(0,d[i]*.88); d[i+2]=Math.min(255,d[i+2]*1.12); }
  }
  ctx.putImageData(id,0,0);
}

function applyDim(ctx,W,H){
  const d=gv("dim")/100;
  if(d>0){ ctx.fillStyle=`rgba(0,0,0,${d})`; ctx.fillRect(0,0,W,H); }
}
function applyOvColor(ctx,W,H){
  const op=gv("ov-op")/100;
  if(op<=0) return;
  const [r,g,b]=hex2rgb($("ov-col").value);
  ctx.fillStyle=`rgba(${r},${g},${b},${op})`; ctx.fillRect(0,0,W,H);
}

// ══════════════════════════════════════════════════════
//  ORNAMENTS
// ══════════════════════════════════════════════════════
function drawOrnament(ctx,W,H,ts){
  const type=radioVal("orn"); if(type==="none") return;
  const op=gv("orn-op")/100, col=$("orn-col").value;
  ctx.save(); ctx.globalAlpha=op;
  if(type==="hex")   drawHexGrid(ctx,W,H,col);
  if(type==="geo")   drawGeoPattern(ctx,W,H,col);
  if(type==="stars") drawIslamicStars(ctx,W,H,col);
  if(type==="arch")  drawArch(ctx,W,H,col);
  if(type==="frame") drawOrnateFrame(ctx,W,H,col,ts);
  ctx.restore();
}
function drawHexGrid(ctx,W,H,col){
  const s=45, h=s*Math.sqrt(3)/2;
  ctx.strokeStyle=col; ctx.lineWidth=.8;
  for(let r=-1;r<H/h+2;r++) for(let c=-1;c<W/(s*1.5)+2;c++){
    const x=c*s*1.5, y=r*h*2+(c%2===0?0:h);
    ctx.beginPath();
    for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6; ctx.lineTo(x+s*.9*Math.cos(a),y+s*.9*Math.sin(a));}
    ctx.closePath(); ctx.stroke();
  }
}
function drawGeoPattern(ctx,W,H,col){
  const s=55; ctx.strokeStyle=col; ctx.lineWidth=.7;
  for(let r=0;r<H/s+2;r++) for(let c=0;c<W/s+2;c++){
    const x=c*s,y=r*s;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+s,y); ctx.lineTo(x+s/2,y+s); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-s/2,y+s); ctx.lineTo(x+s/2,y+s); ctx.closePath(); ctx.stroke();
  }
}
function drawIslamicStars(ctx,W,H,col){
  ctx.strokeStyle=col; ctx.lineWidth=.8;
  for(let r=-1;r<H/80+2;r++) for(let c=-1;c<W/80+2;c++){
    const x=c*80+(r%2)*40, y=r*80;
    ctx.beginPath();
    for(let i=0;i<16;i++){const a=i*Math.PI/8,rr=i%2===0?32:14; ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}
    ctx.closePath(); ctx.stroke();
  }
}
function drawArch(ctx,W,H,col){
  ctx.strokeStyle=col; ctx.lineWidth=1.5;
  const cx=W/2, aw=W*.6;
  ctx.beginPath(); ctx.moveTo(cx-aw/2,H*.86); ctx.lineTo(cx-aw/2,H*.4);
  ctx.arc(cx,H*.4,aw/2,Math.PI,0); ctx.lineTo(cx+aw/2,H*.86); ctx.stroke();
  ctx.lineWidth=.8; ctx.beginPath(); ctx.arc(cx,H*.37,14,0,Math.PI*2); ctx.stroke();
}
function drawOrnateFrame(ctx,W,H,col,ts){
  const p=12, pulse=1+Math.sin(ts*.8)*.012;
  ctx.strokeStyle=col; ctx.lineWidth=1.5*pulse;
  rRect(ctx,p,p,W-p*2,H-p*2,14); ctx.stroke();
  ctx.lineWidth=.6; rRect(ctx,p+7,p+7,W-(p+7)*2,H-(p+7)*2,8); ctx.stroke();
  const cs=28;
  [[p,p],[W-p,p],[p,H-p],[W-p,H-p]].forEach(([x,y])=>{
    ctx.save(); ctx.translate(x,y);
    ctx.beginPath(); ctx.moveTo(-cs,0); ctx.lineTo(0,0); ctx.lineTo(0,-cs);
    ctx.stroke(); ctx.restore();
  });
}
function rRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

// ══════════════════════════════════════════════════════
//  FX
// ══════════════════════════════════════════════════════
function generateParticles(){
  S.stars = Array.from({length:60},()=>({x:Math.random(),y:Math.random(),r:Math.random()*.9+.2,alpha:Math.random()*.6+.3,phase:Math.random()*Math.PI*2}));
  S.bokeh = Array.from({length:14},()=>({x:Math.random(),y:Math.random(),r:Math.random()*35+10,alpha:Math.random()*.1+.03,vy:Math.random()*.0003+.0001}));
}
function drawStars(ctx,W,H,ts){
  S.stars.forEach(s=>{
    const a=s.alpha*(.5+.5*Math.sin(ts*1.8+s.phase));
    ctx.beginPath(); ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,220,${a})`; ctx.fill();
  });
}
function drawRays(ctx,W,H,ts){
  ctx.save(); ctx.globalCompositeOperation="screen";
  const cx=W/2,cy=H*.2;
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2+ts*.04, len=Math.max(W,H)*1.2;
    const alpha=.025+.015*Math.sin(ts*.7+i);
    const gr=ctx.createLinearGradient(cx,cy,cx+Math.cos(a)*len,cy+Math.sin(a)*len);
    gr.addColorStop(0,`rgba(255,235,170,${alpha})`); gr.addColorStop(1,"transparent");
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(a-.02)*len,cy+Math.sin(a-.02)*len);
    ctx.lineTo(cx+Math.cos(a+.02)*len,cy+Math.sin(a+.02)*len);
    ctx.closePath(); ctx.fillStyle=gr; ctx.fill();
  }
  ctx.restore();
}
function drawBokeh(ctx,W,H,ts){
  S.bokeh.forEach(p=>{
    const y=((p.y+ts*p.vy)%1)*H;
    const gr=ctx.createRadialGradient(p.x*W,y,0,p.x*W,y,p.r);
    gr.addColorStop(0,`rgba(200,220,200,${p.alpha})`); gr.addColorStop(1,"transparent");
    ctx.beginPath(); ctx.arc(p.x*W,y,p.r,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();
  });
}
function drawVignette(ctx,W,H){
  const str=gv("vig-str")/100;
  const gr=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.75);
  gr.addColorStop(0,"transparent"); gr.addColorStop(1,`rgba(0,0,0,${str*.85})`);
  ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
}
function drawGoldBorder(ctx,W,H,ts){
  const pulse=.5+.5*Math.sin(ts*1.5);
  const [r,g,b]=hex2rgb($("orn-col").value);
  ctx.save();
  ctx.shadowColor=`rgba(${r},${g},${b},${.5+pulse*.3})`; ctx.shadowBlur=20+pulse*10;
  ctx.strokeStyle=`rgba(${r},${g},${b},.85)`; ctx.lineWidth=2;
  rRect(ctx,8,8,W-16,H-16,13); ctx.stroke();
  ctx.restore();
}
function drawGrain(ctx,W,H){
  const id=ctx.getImageData(0,0,W,H), d=id.data;
  for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*28; d[i]+=n;d[i+1]+=n;d[i+2]+=n;}
  ctx.putImageData(id,0,0);
}

// ══════════════════════════════════════════════════════
//  VERSE RENDERING
// ══════════════════════════════════════════════════════
function drawVerse(ctx,W,H,ts){
  const aya=S.verses[S.currentAya]; if(!aya) return;
  const font    = fontVal();
  const txtCol  = $("txt-col").value;
  const shdCol  = $("shd-col").value;
  const fsz     = W*.062 * (gv("fsize")/100);
  const lh      = parseFloat(gv("lh"));
  const tpos    = radioVal("tpos");
  const textEff = radioVal("te");
  const animType= radioVal("tanim");

  // Animation alpha
  let alpha=1;
  if(animType!=="none"){
    const dur=S.ayaDurations[S.currentAya]||6;
    const w=(S.elapsed%dur)/dur;
    if(w<.1) alpha=w/.1;
    else if(w>.88) alpha=(1-w)/.12;
  }

  ctx.save();
  ctx.textAlign="center"; ctx.direction="rtl";
  ctx.globalAlpha=alpha;
  setTextFx(ctx,textEff,txtCol,shdCol);

  // Arabic text
  const lines=wrapText(ctx,aya.text,W*.85,fsz,font);
  const lineH=fsz*lh, totalH=lines.length*lineH;
  const hasT=S.translations[S.currentAya];
  let startY;
  if(tpos==="top")    startY=H*.1+fsz;
  else if(tpos==="bottom") startY=H*.82-totalH+fsz;
  else startY=H*.5-totalH*(hasT?.4:.5)+fsz;

  ctx.font=`${fsz}px ${font}`; ctx.fillStyle=txtCol;
  lines.forEach((line,i)=> ctx.fillText(line,W/2,startY+i*lineH));

  // Translation
  if(hasT){
    const tfsPct=gv("tfs")/100;
    const tfs=W*.03*tfsPct*1.6;
    ctx.font=`${tfs}px 'Cairo',sans-serif`;
    ctx.fillStyle=$("trans-col").value;
    ctx.globalAlpha=alpha*.75;
    ctx.shadowColor="rgba(0,0,0,.6)"; ctx.shadowBlur=8;
    const tLines=wrapText(ctx,hasT,W*.8,tfs,"Cairo");
    const tStart=startY+totalH+tfs*1.2;
    tLines.forEach((tl,i)=>ctx.fillText(tl,W/2,tStart+i*tfs*1.4));
  }

  // Aya number badge
  ctx.globalAlpha=alpha*.6;
  ctx.shadowColor="transparent"; ctx.shadowBlur=0;
  ctx.font=`bold ${W*.022}px 'Cairo'`;
  ctx.fillStyle=$("orn-col").value;
  ctx.fillText(`❴ ${aya.numberInSurah} ❵`,W/2,startY+totalH+(hasT?0:W*.04));

  ctx.restore();
}

function setTextFx(ctx,eff,txtCol,shdCol){
  ctx.shadowColor="transparent"; ctx.shadowBlur=0; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
  const [sr,sg,sb]=hex2rgb(shdCol);
  const fx={
    none:   ()=>{ ctx.shadowColor=`rgba(${sr},${sg},${sb},.7)`;ctx.shadowBlur=12; },
    glow:   ()=>{ ctx.shadowColor="#f0c842"; ctx.shadowBlur=28; },
    neon:   ()=>{ ctx.shadowColor="#00ff88"; ctx.shadowBlur=22; },
    shadow3d:()=>{ ctx.shadowColor=`rgba(0,0,0,.85)`;ctx.shadowBlur=0;ctx.shadowOffsetX=4;ctx.shadowOffsetY=5; },
    emboss: ()=>{ ctx.shadowColor="rgba(255,255,255,.25)";ctx.shadowBlur=0;ctx.shadowOffsetX=-2;ctx.shadowOffsetY=-2; },
    outline:()=>{ ctx.shadowColor="rgba(0,0,0,.9)";ctx.shadowBlur=0;ctx.lineWidth=2;/* strokeText done separately */ },
  };
  (fx[eff]||fx.none)();
}

function wrapText(ctx,text,maxW,fsz,font){
  ctx.font=`${fsz}px ${font}`;
  const words=text.split(" ");
  const lines=[]; let cur="";
  for(const w of words){
    const test=cur?cur+" "+w:w;
    if(ctx.measureText(test).width>maxW&&cur){lines.push(cur);cur=w;}
    else cur=test;
  }
  if(cur) lines.push(cur);
  return lines;
}

// ══════════════════════════════════════════════════════
//  WAVEFORM (real + simulated fallback)
// ══════════════════════════════════════════════════════
function getWaveData(ts){
  if(S.analyser){
    const d=new Uint8Array(S.analyser.frequencyBinCount);
    S.analyser.getByteFrequencyData(d);
    if(d.some(v=>v>0)){ S.waveData=d; return; }
  }
  // Simulated waveform — activated only when playing
  const n=64, data=new Uint8Array(n);
  const active=S.playing||(S.bgAudioEl&&!S.bgAudioEl.paused);
  if(active){
    for(let i=0;i<n;i++){
      const base=(Math.sin(ts*3+i*.4)+1)/2;
      const high=Math.max(0,Math.sin(ts*7+i*.8))*.4;
      const noise=Math.random()*.1;
      data[i]=Math.floor((base*.5+high+noise)*210);
    }
  }
  S.waveData=data;
}

function drawWave(ctx,W,H,ts){
  if(!ge("wave-on")) return;
  getWaveData(ts);
  const shape=radioVal("ws");
  const col=$("wave-col").value;
  const pos=$("wave-pos").value;
  const wh=parseInt(gv("wave-h"));
  const y0=pos==="top"?wh+4:H-wh-4;
  const n=S.waveData.length;
  ctx.save(); ctx.strokeStyle=col; ctx.fillStyle=col;
  if(shape==="bars"){
    const bw=W/n;
    for(let i=0;i<n;i++){
      const bh=(S.waveData[i]/255)*wh;
      ctx.globalAlpha=.7;
      const [r,g,b]=hex2rgb(col);
      ctx.fillStyle=`rgba(${r},${g},${b},${.4+.4*(S.waveData[i]/255)})`;
      ctx.fillRect(i*bw,pos==="top"?y0-bh:y0,bw*.75,bh);
    }
  } else if(shape==="wave"){
    ctx.lineWidth=2; ctx.globalAlpha=.8; ctx.beginPath();
    for(let i=0;i<n;i++){
      const bh=(S.waveData[i]/255)*wh;
      const x=i*(W/n), y=pos==="top"?y0-bh:y0+bh;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();
  } else if(shape==="dots"){
    for(let i=0;i<n;i+=2){
      const bh=(S.waveData[i]/255)*wh, x=i*(W/n);
      ctx.globalAlpha=.75;
      ctx.beginPath(); ctx.arc(x,pos==="top"?y0-bh:y0+bh,2.5,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();
}

// ══════════════════════════════════════════════════════
//  WATERMARK
// ══════════════════════════════════════════════════════
function drawWatermark(ctx,W,H){
  const text=$("wm-text").value.trim(); if(!text) return;
  const sz=parseInt(gv("wm-size")), pos=$("wm-pos").value, col=$("wm-col").value;
  ctx.save(); ctx.font=`bold ${sz}px 'Cairo'`; ctx.fillStyle=col; ctx.globalAlpha=.72;
  ctx.shadowColor="rgba(0,0,0,.6)"; ctx.shadowBlur=6;
  const pad=sz+8;
  const pm={br:["right",W-pad,H-pad],bl:["left",pad,H-pad],tr:["right",W-pad,pad+sz],tl:["left",pad,pad+sz]};
  const [align,x,y]=pm[pos]||pm.br;
  ctx.textAlign=align; ctx.fillText(text,x,y);
  ctx.restore();
}

// ══════════════════════════════════════════════════════
//  AUDIO
// ══════════════════════════════════════════════════════
function ensureAudioCtx(){
  if(!S.audioCtx || S.audioCtx.state==="closed"){
    S.audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  }
  if(S.audioCtx.state==="suspended") S.audioCtx.resume();
  return S.audioCtx;
}

function playRecitationAudio(){
  stopRecitationAudio();
  if(!S.verses.length) return;
  const aya=S.verses[S.currentAya]; if(!aya) return;
  const surahNum=parseInt($("surah-sel").value)||1;
  const reciter=S.reciters.find(r=>r.id===radioVal("reciter"))||S.reciters[0];
  const url=`${AUDIO_BASE}/${reciter.folder}/${String(surahNum).padStart(3,"0")}${String(aya.numberInSurah).padStart(3,"0")}.mp3`;
  const a=new Audio(url);
  a.volume=gv("rec-vol")/100;
  a.onloadedmetadata=()=>{ S.ayaDurations[S.currentAya]=a.duration||6; };
  a.onended=()=>{
    if(!S.playing) return;
    if(S.currentAya<S.verses.length-1){ S.currentAya++; S.elapsed=0; playRecitationAudio(); updateAyaUI(); }
    else{ pausePlayer(); S.currentAya=0; S.elapsed=0; updateAyaUI(); }
  };
  a.onerror=()=>{
    const dur=parseFloat(gv("aya-dur"))||6;
    S.ayaDurations[S.currentAya]=dur;
    toast("⚠️ تعذر تحميل الصوت (لا اتصال)","info");
  };
  a.play().catch(e=>{ toast("⚠️ يتطلب المتصفح النقر لتشغيل الصوت","info"); });
  S.recAudioEl=a;
  $("audio-status").textContent=`▶️ ${reciter.name} — الآية ${aya.numberInSurah}`;
}

function stopRecitationAudio(){
  if(S.recAudioEl){ S.recAudioEl.pause(); S.recAudioEl.src=""; S.recAudioEl=null; }
}

function onBgAudio(input){
  const file=input.files[0]; if(!file) return;
  if(S.bgAudioEl){ S.bgAudioEl.pause(); S.bgAudioEl.src=""; }
  const url=URL.createObjectURL(file);
  const a=new Audio(url);
  a.loop=ge("bg-loop");
  a.volume=gv("bg-vol")/100;
  S.bgAudioEl=a;
  // Connect to AudioContext for analyser
  try {
    const ctx2=ensureAudioCtx();
    const src=ctx2.createMediaElementSource(a);
    if(!S.analyser){
      S.analyser=ctx2.createAnalyser();
      S.analyser.fftSize=256;
      S.analyser.smoothingTimeConstant=.8;
    }
    src.connect(S.analyser);
    S.analyser.connect(ctx2.destination);
    // For export
    S.bgAudioDest=ctx2.createMediaStreamDestination();
    S.analyser.connect(S.bgAudioDest);
  } catch(e){ console.warn("Audio ctx:",e); }
  $("bg-audio-info").textContent=`✅ ${file.name} (${(file.size/1e6).toFixed(1)}MB)`;
  toast("🎵 تم تحميل صوت الخلفية","success");
}

function updateVolumes(){
  if(S.recAudioEl) S.recAudioEl.volume=gv("rec-vol")/100;
  if(S.bgAudioEl)  S.bgAudioEl.volume=gv("bg-vol")/100;
}

// ══════════════════════════════════════════════════════
//  MEDIA BACKGROUNDS
// ══════════════════════════════════════════════════════
function onBgMedia(input, type){
  const file=input.files[0]; if(!file) return;
  const url=URL.createObjectURL(file);
  if(type==="image"){
    const img=new Image();
    img.onload=()=>{ S.bgImg=img; toast("🖼️ تم تحميل الصورة","success"); };
    img.onerror=()=>toast("❌ فشل تحميل الصورة","error");
    img.src=url;
    const thumb=$("bg-img-thumb");
    $("bg-img-preview").src=url;
    thumb.style.display="block";
  } else {
    const vid=document.createElement("video");
    vid.src=url; vid.loop=true; vid.muted=true; vid.playsInline=true;
    vid.onloadeddata=()=>{
      S.bgVid=vid;
      vid.play().catch(()=>{});
      toast("🎥 تم تحميل الفيديو","success");
    };
    vid.onerror=()=>toast("❌ فشل تحميل الفيديو","error");
    const thumb=$("bg-vid-thumb");
    $("bg-vid-preview").src=url;
    $("bg-vid-info").textContent=`${file.name} (${(file.size/1e6).toFixed(1)}MB)`;
    thumb.style.display="block";
    $("bg-vid-preview").src=url;
  }
}

function onBgTypeChange(){
  const v=radioVal("bgt");
  $("bg-grad-ctrl").style.display=v==="gradient"?"block":"none";
  $("bg-img-ctrl").style.display=v==="image"?"block":"none";
  $("bg-vid-ctrl").style.display=v==="video"?"block":"none";
}

// ══════════════════════════════════════════════════════
//  PLAY / PAUSE
// ══════════════════════════════════════════════════════
function togglePlay(){
  if(S.playing) pausePlayer(); else startPlayer();
}

function startPlayer(){
  if(!S.verses.length){ toast("⚠️ لا توجد آيات مُحمَّلة","error"); return; }
  S.playing=true;
  $("btn-play").textContent="⏸️";
  ensureAudioCtx();
  if(S.bgAudioEl){ S.bgAudioEl.loop=ge("bg-loop"); S.bgAudioEl.play().catch(()=>{}); }
  playRecitationAudio();
}

function pausePlayer(){
  S.playing=false;
  $("btn-play").textContent="▶️";
  stopRecitationAudio();
  if(S.bgAudioEl) S.bgAudioEl.pause();
}

function prevAya(){ if(S.currentAya>0){ S.currentAya--; S.elapsed=0; updateAyaUI(); if(S.playing) playRecitationAudio(); }}
function nextAya(){ if(S.currentAya<S.verses.length-1){ S.currentAya++; S.elapsed=0; updateAyaUI(); if(S.playing) playRecitationAudio(); }}

function seekClick(e){
  const bar=$("pbar"), ratio=e.offsetX/bar.offsetWidth;
  const total=S.verses.length*(S.ayaDurations[0]||6);
  let acc=0;
  for(let i=0;i<S.verses.length;i++){
    const d=S.ayaDurations[i]||6;
    if(acc+d>=ratio*total){ S.currentAya=i; S.elapsed=(ratio*total-acc); break; }
    acc+=d;
  }
  updateAyaUI();
  if(S.playing) playRecitationAudio();
}

function updateProgressUI(){
  const totalDur=S.verses.length*(S.ayaDurations[0]||6)||1;
  const passed=S.ayaDurations.slice(0,S.currentAya).reduce((a,b)=>a+b,0)+S.elapsed;
  const pct=Math.min(100,(passed/totalDur)*100);
  $("pfill").style.width=pct+"%";
  $("ptime").textContent=`${fmt(passed)} / ${fmt(totalDur)}`;
}

function updateAyaUI(){
  $("aya-ind").textContent=`الآية ${S.currentAya+1}/${S.verses.length}`;
}
function fmt(s){ const m=Math.floor(s/60); return `${m}:${String(Math.floor(s%60)).padStart(2,"0")}`; }

// ══════════════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════════════
async function startExport(type){
  if(!S.verses.length){ toast("⚠️ لا توجد آيات","error"); return; }
  S.exportCancel=false; S.exportChunks=[];
  $("rec-ov").classList.add("on");
  $("rec-fill").style.width="0%";
  $("rec-pct").textContent="0%";

  const cv=$("cv");
  const canvasStream=cv.captureStream(30);
  const allTracks=[...canvasStream.getTracks()];

  // Add background audio to export
  if(S.bgAudioDest) allTracks.push(...S.bgAudioDest.stream.getAudioTracks());

  const mimeType=type==="mp4"?"video/mp4":"video/webm;codecs=vp9";
  const mime=MediaRecorder.isTypeSupported(mimeType)?mimeType:"video/webm";
  const mr=new MediaRecorder(new MediaStream(allTracks),{mimeType:mime,videoBitsPerSecond:6_000_000});
  S.mediaRecorder=mr;
  mr.ondataavailable=e=>{ if(e.data.size>0) S.exportChunks.push(e.data); };
  mr.onstop=()=>{
    if(S.exportCancel){ $("rec-ov").classList.remove("on"); return; }
    const blob=new Blob(S.exportChunks,{type:mime});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`GT-SQR_${Date.now()}.${type==="mp4"?"mp4":"webm"}`;
    a.click();
    $("rec-ov").classList.remove("on");
    toast("✅ تم التصدير بنجاح!","success");
  };
  mr.start(100);

  // Render loop for export
  const fps=30;
  const ayaDur=parseFloat(gv("aya-dur"))||6;
  const total=S.verses.length*ayaDur;
  const totalFrames=Math.ceil(total*fps);
  const savedAya=S.currentAya, savedElapsed=S.elapsed, savedPlaying=S.playing;
  S.playing=true; S.currentAya=0; S.elapsed=0;

  // Play background audio for export
  if(S.bgAudioEl){ S.bgAudioEl.currentTime=0; S.bgAudioEl.play().catch(()=>{}); }

  for(let f=0;f<totalFrames;f++){
    if(S.exportCancel){ mr.stop(); S.playing=savedPlaying; S.currentAya=savedAya; S.elapsed=savedElapsed; return; }
    S.elapsed=(f/fps)%ayaDur;
    S.currentAya=Math.min(Math.floor(f/(fps*ayaDur)),S.verses.length-1);
    drawFrame(f/fps);
    const pct=Math.round((f/totalFrames)*100);
    $("rec-fill").style.width=pct+"%";
    $("rec-pct").textContent=pct+"%";
    $("rec-sub").textContent=`إطار ${f+1} / ${totalFrames} — الآية ${S.currentAya+1}/${S.verses.length}`;
    await yieldFrame();
  }
  S.playing=savedPlaying; S.currentAya=savedAya; S.elapsed=savedElapsed;
  if(S.bgAudioEl) S.bgAudioEl.pause();
  mr.stop();
}

function yieldFrame(){ return new Promise(r=>setTimeout(r,0)); }

function cancelExport(){
  S.exportCancel=true;
  if(S.mediaRecorder&&S.mediaRecorder.state!=="inactive") S.mediaRecorder.stop();
  $("rec-ov").classList.remove("on");
  toast("تم إلغاء التصدير","info");
}

// ══════════════════════════════════════════════════════
//  QURAN DATA
// ══════════════════════════════════════════════════════
async function loadSurahList(){
  const sel=$("surah-sel");
  sel.innerHTML=`<option>⏳ جاري التحميل…</option>`;
  try {
    let surahs=JSON.parse(sessionStorage.getItem("gt_surahs")||"null");
    if(!surahs){
      const r=await fetch(`${QURAN_API}/surah`);
      const d=await r.json();
      surahs=d.data;
      sessionStorage.setItem("gt_surahs",JSON.stringify(surahs));
    }
    S.surahs=surahs;
    sel.innerHTML=surahs.map(s=>`<option value="${s.number}">${s.number}. ${s.name} — ${s.englishName}</option>`).join("");
    await loadVerses();
  } catch(e){
    sel.innerHTML=`<option value="1">1. سورة الفاتحة</option>`;
    loadOfflineFallback();
  }
}

function loadOfflineFallback(){
  S.verses=[
    {numberInSurah:1,text:"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"},
    {numberInSurah:2,text:"الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ"},
    {numberInSurah:3,text:"الرَّحْمَٰنِ الرَّحِيمِ"},
    {numberInSurah:4,text:"مَالِكِ يَوْمِ الدِّينِ"},
    {numberInSurah:5,text:"إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ"},
    {numberInSurah:6,text:"اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ"},
    {numberInSurah:7,text:"صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ"},
  ];
  $("aya-info").textContent="⚠️ وضع غير متصل — سورة الفاتحة";
  updateAyaUI();
}

function onSurahChange(){ loadVerses(); }
async function loadVerses(){
  const surahNum=parseInt($("surah-sel").value)||1;
  const from=parseInt($("from-aya").value)||1;
  const to=parseInt($("to-aya").value)||7;
  const surah=S.surahs.find(s=>s.number===surahNum);
  if(surah){ const max=surah.numberOfAyahs; if(to>max) $("to-aya").value=max; }
  $("aya-info").textContent="⏳ جاري تحميل الآيات…";
  try {
    const ck=`gt_v_${surahNum}_${from}_${to}`;
    let verses=JSON.parse(sessionStorage.getItem(ck)||"null");
    if(!verses){
      const r=await fetch(`${QURAN_API}/surah/${surahNum}/quran-uthmani`);
      const d=await r.json();
      verses=d.data.ayahs.filter(a=>a.numberInSurah>=from&&a.numberInSurah<=to);
      sessionStorage.setItem(ck,JSON.stringify(verses));
    }
    S.verses=verses; S.currentAya=0; S.elapsed=0; S.ayaDurations=[];
    $("aya-info").textContent=`✅ ${verses.length} آية من سورة ${surah?.name||""}`;
    updateAyaUI();
    await loadTranslations();
  } catch(e){
    $("aya-info").textContent="⚠️ فشل التحميل"; if(!S.verses.length) loadOfflineFallback();
  }
}

function onTransChange(){
  const v=$("trans-sel").value;
  $("trans-opts").style.display=v==="none"?"none":"block";
  loadTranslations();
}
async function loadTranslations(){
  const edition=$("trans-sel").value; if(edition==="none"){ S.translations=[]; return; }
  const surahNum=parseInt($("surah-sel").value)||1;
  const from=parseInt($("from-aya").value)||1;
  const to=parseInt($("to-aya").value)||7;
  try {
    const ck=`gt_t_${surahNum}_${from}_${to}_${edition}`;
    let trans=JSON.parse(sessionStorage.getItem(ck)||"null");
    if(!trans){
      const r=await fetch(`${QURAN_API}/surah/${surahNum}/${edition}`);
      const d=await r.json();
      trans=d.data.ayahs.filter(a=>a.numberInSurah>=from&&a.numberInSurah<=to).map(a=>a.text);
      sessionStorage.setItem(ck,JSON.stringify(trans));
    }
    S.translations=trans;
  } catch(e){ S.translations=[]; }
}

// ══════════════════════════════════════════════════════
//  FONTS
// ══════════════════════════════════════════════════════
function renderFontGrid(){
  const grid=$("font-grid"); grid.innerHTML="";
  S.allFonts.forEach((f,i)=>{
    const div=document.createElement("div"); div.className="font-card";
    div.innerHTML=`<input type="radio" name="font" id="fn${i}" value="${f.css}" ${i===0?"checked":""}>
    <label for="fn${i}"><span class="fs" style="font-family:${f.css}">${f.sample||"بِسْمِ اللَّهِ"}</span><span class="fn">${f.name}</span></label>`;
    grid.appendChild(div);
  });
}

async function loadLocalFonts(showToast=false){
  try {
    const r=await fetch("./fonts/fonts.json");
    if(!r.ok) return;
    const list=await r.json();
    let added=0;
    for(const f of list){
      if(S.allFonts.find(x=>x.name===f.name)) continue;
      try {
        const face=new FontFace(f.name,`url(./fonts/${f.file})`);
        await face.load();
        document.fonts.add(face);
        S.allFonts.push({id:"local_"+f.name,name:f.name,css:`'${f.name}'`,sample:f.sample||"بِسْمِ اللَّهِ"});
        added++;
      } catch(e){ console.warn("Font load failed:",f.name); }
    }
    renderFontGrid();
    if(showToast) toast(added>0?`✅ تم تحميل ${added} خطوط محلية`:"لا توجد خطوط جديدة في fonts/","info");
  } catch(e){
    if(showToast) toast("📁 تأكد من وجود ملف fonts/fonts.json","info");
  }
}

function loadCustomFonts(input){
  Array.from(input.files).forEach(file=>{
    const name=file.name.replace(/\.[^.]+$/,"");
    const reader=new FileReader();
    reader.onload=e=>{
      const face=new FontFace(name,e.target.result);
      face.load().then(ff=>{
        document.fonts.add(ff);
        if(!S.allFonts.find(x=>x.name===name)){
          S.allFonts.push({id:"custom_"+name,name,css:`'${name}'`,sample:"بِسْمِ اللَّهِ"});
          renderFontGrid();
        }
        toast(`✅ خط: ${name}`,"success");
      }).catch(()=>toast(`❌ فشل: ${file.name}`,"error"));
    };
    reader.readAsArrayBuffer(file);
  });
}

// ══════════════════════════════════════════════════════
//  RECITERS
// ══════════════════════════════════════════════════════
function renderReciters(){
  const grid=$("reciters-grid"); grid.innerHTML="";
  S.reciters.forEach((r,i)=>{
    const div=document.createElement("div"); div.className="rctr-card";
    div.innerHTML=`<input type="radio" name="reciter" id="rc${i}" value="${r.id}" ${i===0?"checked":""}>
    <label for="rc${i}"><span class="rf">${r.flag}</span>${r.name}</label>`;
    grid.appendChild(div);
  });
}

function toggleAddReciter(){
  const f=$("add-reciter-form");
  f.classList.toggle("on");
}

function addCustomReciter(){
  const name=$("ar-name").value.trim();
  const flag=$("ar-flag").value.trim()||"🎙️";
  const folder=$("ar-folder").value.trim();
  if(!name||!folder){ toast("⚠️ أدخل الاسم والمجلد","error"); return; }
  const id="custom_"+Date.now();
  S.reciters.push({id,name,flag,folder});
  renderReciters();
  $("add-reciter-form").classList.remove("on");
  $("ar-name").value=""; $("ar-flag").value=""; $("ar-folder").value="";
  toast(`✅ تمت إضافة: ${name}`,"success");
}

// ══════════════════════════════════════════════════════
//  THEMES
// ══════════════════════════════════════════════════════
const THEME_LABELS={emerald:"💚 زمرد",gold:"👑 ذهبي",night:"🌌 ليلي",rose:"🌸 وردي",ocean:"🌊 محيط",desert:"🏜️ صحراء",purple:"🔮 بنفسجي",dark:"⚫ أسود"};

function initThemeChips(){
  const wrap=$("theme-chips");
  Object.keys(THEMES).forEach((k,i)=>{
    const d=document.createElement("div"); d.className="tc-chip"+(i===0?" on":""); d.dataset.t=k;
    d.textContent=THEME_LABELS[k]||k;
    d.onclick=()=>applyTheme(d,k);
    wrap.appendChild(d);
  });
}

function applyTheme(el,key){
  document.querySelectorAll(".tc-chip").forEach(c=>c.classList.remove("on")); el.classList.add("on");
  const t=THEMES[key];
  setCol("gc1",t.gc1); setCol("gc2",t.gc2);
  setCol("txt-col",t.tc); setCol("orn-col",t.oc);
  if($("gc1t")) $("gc1t").value=t.gc1;
  if($("gc2t")) $("gc2t").value=t.gc2;
}

// ══════════════════════════════════════════════════════
//  TEMPLATES
// ══════════════════════════════════════════════════════
function openModal(id){ $(id).classList.add("on"); }
function closeModal(id){ $(id).classList.remove("on"); }

function confirmSaveTemplate(){
  const name=$("tpl-name-inp").value.trim()||"قالب "+new Date().toLocaleDateString("ar");
  S.templates.push({name,date:new Date().toLocaleDateString("ar-SA"),state:captureState()});
  persistTemplates(); renderTemplates();
  closeModal("tpl-modal"); $("tpl-name-inp").value="";
  toast(`✅ تم حفظ: ${name}`,"success");
}

function captureState(){
  return {
    surah:$("surah-sel").value, from:$("from-aya").value, to:$("to-aya").value,
    reciter:radioVal("reciter"), fmt:radioVal("fmt"),
    gc1:$("gc1").value, gc2:$("gc2").value,
    font:radioVal("font"), txtCol:$("txt-col").value,
    wm:$("wm-text").value, orn:radioVal("orn"),
    fxVig:ge("fx-vig"), fxGold:ge("fx-gold"), fxStars:ge("fx-stars"),
    theme:document.querySelector(".tc-chip.on")?.dataset?.t||"emerald",
  };
}

function applyState(st){
  setV("surah-sel",st.surah); setV("from-aya",st.from); setV("to-aya",st.to);
  setR("reciter",st.reciter); setR("fmt",st.fmt); setR("orn",st.orn);
  setCol("gc1",st.gc1); setCol("gc2",st.gc2);
  if($("gc1t")) $("gc1t").value=st.gc1||""; if($("gc2t")) $("gc2t").value=st.gc2||"";
  setCol("txt-col",st.txtCol);
  if($("wm-text")) $("wm-text").value=st.wm||"";
  if(st.fxVig)  ge_el("fx-vig").checked=true;
  if(st.fxGold) ge_el("fx-gold").checked=true;
  if(st.fxStars)ge_el("fx-stars").checked=true;
  document.querySelectorAll(".tc-chip").forEach(c=>c.classList.toggle("on",c.dataset.t===st.theme));
  loadVerses(); onFmtChange();
}

function renderTemplates(){
  const grid=$("tpl-grid"), emp=$("tpl-empty");
  if(!S.templates.length){ grid.innerHTML=""; emp.style.display="block"; return; }
  emp.style.display="none";
  grid.innerHTML=S.templates.map((t,i)=>`
  <div class="tpl-card">
  <div class="tpl-name">📁 ${t.name}</div>
  <div class="tpl-date">${t.date}</div>
  <div class="tpl-actions">
  <button class="btn btn-p bsm" onclick="applyState(S.templates[${i}].state);goTab('rec')">✅ تطبيق</button>
  <button class="btn btn-d bsm" onclick="delTemplate(${i})">🗑️</button>
  </div>
  </div>`).join("");
}

function delTemplate(i){ S.templates.splice(i,1); persistTemplates(); renderTemplates(); toast("🗑️ تم الحذف","info"); }
function loadTemplates(){ try{ S.templates=JSON.parse(localStorage.getItem("gt_sqr_tpls")||"[]"); }catch(e){ S.templates=[]; } renderTemplates(); }
function persistTemplates(){ try{ localStorage.setItem("gt_sqr_tpls",JSON.stringify(S.templates)); }catch(e){} }

// ══════════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════════
function initTabs(){
  document.querySelectorAll(".tab-btn").forEach(btn=>{
    btn.addEventListener("click",()=>goTab(btn.dataset.tab));
  });
}
function goTab(name){
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("on",b.dataset.tab===name));
  document.querySelectorAll(".tp").forEach(p=>p.classList.toggle("on",p.id==="tab-"+name));
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function $(id){ return document.getElementById(id); }
function ge(id){ const e=$(id); return e&&e.checked; }
function ge_el(id){ return $(id); }
function gv(id){ const e=$(id); return e?e.value:0; }
function radioVal(name){ const e=document.querySelector(`input[name="${name}"]:checked`); return e?e.value:""; }
function fontVal(){ return radioVal("font")||"'Amiri Quran'"; }
function sv(el,outId,unit=""){ $(outId).textContent=el.value+unit; }
function setCol(id,val){ const e=$(id); if(e) e.value=val; }
function setV(id,val){ const e=$(id); if(e) e.value=val; }
function setR(name,val){ const e=document.querySelector(`input[name="${name}"][value="${val}"]`); if(e) e.checked=true; }
function syncCP(pickId,txtId){ const e=$(pickId); if(e&&$(txtId)) $(txtId).value=e.value; }
function syncCT(pickId,txtId){ const val=$(txtId).value; if(/^#[0-9a-fA-F]{6}$/.test(val)){ setCol(pickId,val); } }
function hex2rgb(hex){ const h=hex.replace("#",""); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function toggleManualDur(){ $("manual-dur").style.display=ge("auto-dur")?"none":"block"; }
function checkOffline(){ const u=()=>document.body.classList.toggle("offline",!navigator.onLine); window.addEventListener("online",u); window.addEventListener("offline",u); u(); }

function toast(msg,type="info"){
  const el=document.createElement("div"); el.className=`toast ${type}`; el.textContent=msg;
  $("toast-c").appendChild(el);
  setTimeout(()=>el.remove(),3600);
}
