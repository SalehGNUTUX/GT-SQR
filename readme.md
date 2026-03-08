# 📂 مجلد الخطوط المحلية

## طريقة إضافة خط جديد

1. **انسخ ملف الخط** (TTF، OTF، WOFF، أو WOFF2) إلى هذا المجلد.

2. **افتح ملف `fonts.json`** وأضف كائناً جديداً:

```json
[
  {
    "name": "اسم الخط",
    "file": "اسم_الملف.ttf",
    "sample": "بِسْمِ اللَّهِ"
  }
]
```

3. **في التطبيق**: اذهب إلى تبويب **النصوص** ← اضغط **🔄 تحديث الخطوط**

## مثال

```json
[
  {
    "name": "خط القاهرة",
    "file": "Cairo-Bold.ttf",
    "sample": "الْحَمْدُ لِلَّهِ"
  },
  {
    "name": "خط الأميري",
    "file": "Amiri-Regular.ttf",
    "sample": "بِسْمِ اللَّهِ"
  }
]
```

## مصادر الخطوط العربية المجانية

- [Google Fonts Arabic](https://fonts.google.com/?subset=arabic)
- [Noto Fonts](https://fonts.google.com/noto/specimen/Noto+Naskh+Arabic)
- [Amiri Project](https://amirifont.org/)
- [SIL International](https://software.sil.org/fonts/)

---

> يعمل هذا النظام سواء كان التطبيق متصلاً بالإنترنت أو لا!
