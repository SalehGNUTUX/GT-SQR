<div align="center">

<img src="https://raw.githubusercontent.com/SalehGNUTUX/GT-SQR/main/gt-sqr-icon.png" width="512" alt="GT-SQR Logo" />

# GT-SQR
### GnuTux Short Quran Reels

**صنع مقاطع القرآن الكريم بجودة احترافية — مباشرةً من المتصفح**

[![License: GPLv2](https://img.shields.io/badge/License-GPLv2-green.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-blueviolet?logo=pwa)](https://salehgnutux.github.io/GT-SQR/)
[![GitHub Pages](https://img.shields.io/badge/Live-Demo-brightgreen?logo=github)](https://salehgnutux.github.io/GT-SQR/)
[![Platform](https://img.shields.io/badge/Platform-Browser-orange?logo=googlechrome)](https://salehgnutux.github.io/GT-SQR/)

[🌐 التجربة المباشرة](https://salehgnutux.github.io/GT-SQR/) · [📋 الإبلاغ عن مشكلة](https://github.com/SalehGNUTUX/GT-SQR/issues) · [⭐ دعم المشروع](https://github.com/SalehGNUTUX/GT-SQR)

---

<img src="https://raw.githubusercontent.com/SalehGNUTUX/GT-SQR/main/screenshot/Screenshot_20260309_214310.png" width="512" alt="GT-SQR Screenshot" />

</div>

---

## 📖 عن المشروع | About

**GT-SQR** هو تطبيق ويب متقدم (PWA) يُمكّنك من إنشاء مقاطع فيديو قصيرة للقرآن الكريم احترافية الجودة، جاهزة للنشر على منصات التواصل الاجتماعي — كل ذلك مباشرةً من المتصفح دون أي تثبيت.

**GT-SQR** is an advanced Progressive Web App that lets you create professional Quran short-form video reels ready for social media — directly from your browser with zero installation.

---

## ✨ المميزات | Features

### 🎬 الإنتاج والتصدير
- **تصدير فيديو** بصيغتي MP4 و WebM بجودة تصل إلى 20 Mbps
- **ساعة `AudioContext`** كمرجع زمني — مدة الفيديو تساوي مدة الآيات بدقة تامة
- **عمل في الخلفية** — التصدير يستمر حتى عند تغيير تبويب المتصفح
- دعم معدلات إطار 24 / 30 / 60 fps قابلة للضبط
- إيقاف صوت الخلفية تلقائياً عند انتهاء الآيات

### 📖 القرآن الكريم
- تحميل أي سورة وتحديد نطاق الآيات (من آية إلى آية)
- **8 قراء مدمجون** بروايتَي حفص وورش:

| القارئ | الرواية | الجودة |
|--------|---------|--------|
| مشاري العفاسي 🇰🇼 | حفص | 128 kbps |
| سعد الغامدي 🇸🇦 | حفص | 40 kbps |
| المنشاوي مرتل 🇪🇬 | حفص | 128 kbps |
| محمود الحصري 🇪🇬 | حفص | 128 kbps |
| أبو بكر الشاطري 🇸🇦 | حفص | 128 kbps |
| ماهر المعيقلي 🇸🇦 | حفص | 128 kbps |
| ياسين الجزائري 🇩🇿 | **ورش** | 64 kbps |
| محمود الحصري مرتل 🇪🇬 | **ورش** | 128 kbps |

- إمكانية إضافة أي قارئ مخصص من [everyayah.com](https://everyayah.com/data/)
- دعم ترجمات وتفاسير متعددة (العربية · English · Français · Urdu)

### 🎨 التصميم والمشهد
- **8 ثيمات لونية** جاهزة (زمرد · ذهبي · ليلي · وردي · أزرق · صحراوي · بنفسجي · داكن)
- خلفية صورة أو فيديو مع **4 حركات سينمائية** (ثابت · زحف · تكبير · تحريك)
- **6 زخارف إسلامية** (سداسية · هندسة إسلامية · مشربية · نباتية · نجوم · بلا زخارف)
- فلاتر لونية (طبيعي · أبيض وأسود · دافئ · بارد)
- تحكم كامل في تعتيم الخلفية وشفافية الزخرفة

### ✍️ النصوص والخطوط
- **9 خطوط عربية** مدمجة من Google Fonts (Amiri · Reem Kufi · Scheherazade · Cairo · Noto Naskh · Lateef · Harmattan · Markazi · Aref Ruqaa)
- دعم تحميل خطوط محلية إضافية عبر `fonts/fonts.json`
- تحميل خطوط مخصصة مباشرة (OTF · TTF)
- تأثير ظهور الآيات التدريجي (Fade In)
- تحكم في لون النص والظل والحجم

### 🎵 المكساج الصوتي
- تحكم منفصل في مستوى صوت القارئ وصوت الخلفية
- رفع أي ملف صوتي كخلفية موسيقية (MP3 · AAC · OGG · FLAC · WAV)
- **6 أشكال لموجة الصوت** مبنية على نطاق الصوت البشري (80Hz–3kHz):
  - 📊 أعمدة (Bars) · 〰️ موجة (Wave) · ⭕ نقاط (Dots)
  - 🪞 مرآة (Mirror) · ⚪ دائرة (Circle) · 🌈 طيف (Spectrum)
- **جميع الأشكال تنمو من الأسفل للأعلى** بمنطق موحد

### 🏷️ الشعار والعلامة المائية
- رفع شعار مخصص بصيغ (PNG · SVG · JPG · **MOV شفاف** · WebM)
- دعم شعار فيديو MOV مع قناة ألفا للشفافية
- تحكم في الموضع والحجم والشفافية
- علامة مائية نصية في أي ركن من الشاشة

### ⚡ التأثيرات البصرية
- نجوم متحركة وتأثيرات بوكيه
- تراكبات لونية وتدرجات مخصصة

### 💾 القوالب والإعدادات
- حفظ وتحميل قوالب التصميم الكاملة
- تبويب إعدادات مخصص (جودة التصدير · نسب العرض · FPS · معدل البت)

### 📱 توافق الهاتف
- واجهة **Bottom Sheet** قابلة للسحب
- **3 أوضاع عرض**: عمودي · أفقي (مع إبقاء المعاينة) · كامل
- شريط تمرير للتحكم في حجم لوحة الأدوات (30%–90%)
- حفظ الإعدادات تلقائياً في `localStorage`

---

## 🚀 البدء السريع | Quick Start

### التجربة الفورية
```
https://salehgnutux.github.io/GT-SQR/
```

### التشغيل المحلي

```bash
# 1. استنسخ المستودع
git clone https://github.com/SalehGNUTUX/GT-SQR.git
cd GT-SQR

# 2. شغّل خادماً محلياً (مطلوب لـ PWA و fetch)
python3 -m http.server 8080
# أو
npx serve .

# 3. افتح المتصفح
# http://localhost:8080
```

> ⚠️ **مهم:** لا تفتح `index.html` مباشرة كملف (`file://`) — استخدم خادماً محلياً لأن تحميل الصوت والخطوط يتطلب HTTP.

---

## 📁 هيكل المشروع | Project Structure

```
GT-SQR/
│
├── index.html              # الواجهة الرئيسية
├── app.js                  # المنطق الكامل للتطبيق
├── sw.js                   # Service Worker (PWA Offline)
├── manifest.json           # تعريف PWA
│
├── fonts/
│   ├── fonts.json          # قائمة الخطوط المحلية
│   └── *.otf / *.ttf       # ملفات الخطوط المحلية
│
└── gt-sqr-icons/
    ├── 16x16/
    ├── 32x32/
    ├── 192x192/
    └── 512x512/
```

---

## 🖥️ مقاسات الفيديو | Video Formats

| النسبة | الاستخدام | الأبعاد |
|--------|-----------|---------|
| 📱 9:16 | ريلز · تيك توك · يوتيوب شورتس | 1080×1920 |
| 🟦 1:1  | انستجرام | 1080×1080 |
| 🖥️ 16:9 | يوتيوب | 1920×1080 |
| 📸 4:5  | انستجرام بورتريه | 1080×1350 |

---

## 🔧 إضافة قراء مخصصين | Custom Reciters

افتح قسم **"التلاوة"** ← **"➕ إضافة قارئ آخر"** وأدخل:

- **الاسم**: اسم القارئ
- **مجلد EveryAyah**: اسم المجلد من [قائمة المجلدات](https://everyayah.com/data/)
- **مثال**: `warsh/Abderahim_warsh_32kbps`

---

## 🔠 إضافة خطوط محلية | Local Fonts

أضف ملفات الخطوط في مجلد `fonts/` وعدّل `fonts/fonts.json`:

```json
[
  {
    "name": "اسم الخط",
    "file": "filename.otf",
    "sample": "بِسْمِ اللَّهِ"
  }
]
```

> **ملاحظة:** اكتب أسماء الملفات بدون ترميز URL (المسافات كمسافات عادية).

---

## 🌐 المصادر | Data Sources

| المصدر | الاستخدام |
|--------|-----------|
| [AlQuran Cloud API](https://api.alquran.cloud) | نصوص القرآن والترجمات |
| [EveryAyah.com](https://everyayah.com) | ملفات صوت التلاوة |
| [Google Fonts](https://fonts.google.com) | الخطوط العربية |

---

## 🛠️ التقنيات | Tech Stack

- **Vanilla JS** (ES2022) — بدون أي framework
- **Web Audio API** — معالجة الصوت وتصدير مجرى الصوت
- **Canvas 2D API** — رسم المشهد الكامل
- **MediaRecorder API** — تسجيل الفيديو
- **Service Worker** — دعم PWA والعمل بدون إنترنت
- **CSS Custom Properties** — الثيمات الديناميكية

---

## ⚙️ المتطلبات | Requirements

| المتطلب | الحد الأدنى |
|---------|------------|
| المتصفح | Chrome 90+ · Firefox 88+ · Edge 90+ |
| الذاكرة | 4 GB RAM (8 GB موصى به للتصدير) |
| الإنترنت | مطلوب لتحميل الصوت (أول مرة فقط مع PWA) |

---

## 📸 لقطات الشاشة | Screenshots

<div align="center">
<img src="https://raw.githubusercontent.com/SalehGNUTUX/GT-SQR/main/screenshot/Screenshot_20260309_214310.png" width="320" alt="واجهة GT-SQR" />
</div>

---

## 🤝 المساهمة | Contributing

المساهمات مرحب بها! يرجى:

1. Fork المستودع
2. إنشاء فرع جديد: `git checkout -b feature/اسم-الميزة`
3. Commit التغييرات: `git commit -m 'إضافة ميزة كذا'`
4. Push: `git push origin feature/اسم-الميزة`
5. فتح Pull Request

---

## 🐛 الإبلاغ عن مشكلة | Bug Reports

افتح [Issue جديد](https://github.com/SalehGNUTUX/GT-SQR/issues) مع:
- وصف المشكلة
- خطوات إعادة إنتاجها
- اسم المتصفح وإصداره
- لقطة شاشة إن أمكن

---

## 📄 الرخصة | License

هذا المشروع مرخص بموجب **GNU General Public License v2.0**.

```
GT-SQR — GnuTux Short Quran Reels
Copyright (C) 2026 SalehGNUTUX

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License.
```

---

## 🙏 شكر وتقدير | Acknowledgements

- [AlQuran Cloud](https://alquran.cloud) على توفير API القرآن الكريم المجاني
- [EveryAyah.com](https://everyayah.com) على مكتبة التلاوات الصوتية
- [Google Fonts](https://fonts.google.com) على الخطوط العربية المفتوحة المصدر
- جميع القراء الكرام الذين أتاحوا تلاواتهم للاستخدام الحر

---

<div align="center">

بُني بـ ❤️ لخدمة القرآن الكريم

**[⭐ أعطِ المشروع نجمة على GitHub](https://github.com/SalehGNUTUX/GT-SQR)**

</div>
