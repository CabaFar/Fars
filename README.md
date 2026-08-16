# محاسبة شاورما — منصة فارس

لوحة إدارة للمطعم (محاسبة · كاش · مخزون · موارد بشرية) تعمل على الجوال والكمبيوتر.

## المعمارية (Offline-first)

1. **PostgreSQL على Supabase** — مصدر الحقيقة السحابي
2. **تسجيل دخول** باسم مستخدم + كلمة مرور
3. **واجهة ويب** متجاوبة (GitHub Pages)
4. **مزامنة فورية** عبر Supabase Realtime بين الأجهزة
5. **عمل بدون إنترنت** — كل تعديل يُحفظ محلياً أولاً ثم يُرفع عند الاتصال

## إعداد Supabase (مرة واحدة)

1. أنشئ مشروعاً مجانياً على https://supabase.com
2. Authentication → Providers → Email → عطّل **Confirm email**
3. SQL Editor → الصق محتوى `supabase/schema.sql` → Run
4. Project Settings → API انسخ:
   - Project URL
   - anon public key
5. أنشئ ملف `.env.local`:

```bash
cp .env.example .env.local
# ثم ضع القيم الحقيقية
```

6. التشغيل المحلي:

```bash
npm install
npm run dev
```

للنشر على GitHub Pages يجب توفر نفس المتغيرات عند `npm run build`.

## الصفحات

- المحاسبة: `/`
- الكاش: `/cash.html`
- المخزون: `/inventory.html`
- الموارد البشرية: `/hr.html`
