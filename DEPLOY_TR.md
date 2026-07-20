# Ücretsiz Deploy Rehberi (Supabase + Vercel)

Bu rehber Detention Recover AI'yı **tamamen ücretsiz** yayınlar: veritabanı, kimlik doğrulama ve sunucusuz fonksiyonlar için **Supabase** (free tier), frontend için **Vercel** (Hobby plan), e-posta için **Resend** (free tier). SMS şimdilik kapalıdır.

> Sadece denemek istiyorsan hiçbir şey kurmana gerek yok: `VITE_DATA_BACKEND=mock` ile uygulama tarayıcıda tek başına çalışır (veriler localStorage'da). Aşağıdaki adımlar **gerçek backend** içindir.

---

## Bölüm 1 — Supabase (backend)

### 1.1 Proje oluştur
1. https://supabase.com → **New project** (ücretsiz).
2. Bir isim ve güçlü bir **database password** ver. Bölge olarak sana yakın olanı seç.
3. Proje açılınca **Project Settings → API** sayfasından şunları not al:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** (gizli — sadece sunucuda kullanılır)

### 1.2 Veritabanı şemasını kur
1. Supabase panelinde **SQL Editor → New query**.
2. Bu repodaki [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) dosyasının **tamamını** yapıştır ve **Run**.
3. Sonra ikinci dosyayı da çalıştır: [`supabase/migrations/0002_storage.sql`](./supabase/migrations/0002_storage.sql) — bu, belge yükleme için depolama alanlarını (`documents` ve `lead-uploads`) ve izinlerini oluşturur.
4. Bunlar; tabloları, indeksleri, RLS (satır bazlı güvenlik) politikalarını ve dosya depolama alanlarını oluşturur. Her satır `owner_id`'ye göre izole edilir.

### 1.3 Admin kullanıcısını oluştur
Bu ürün **tek admin** içindir. Kayıt (registration) canlıda kapalı olacağı için admini elle oluştur:
1. **Authentication → Users → Add user → Create new user**.
2. E-posta + şifre gir, **Auto Confirm User**'ı işaretle.
3. Oluşan kullanıcıya tıkla, **User UID**'yi kopyala → bu senin `ADMIN_USER_ID` değerin.

### 1.4 Auth ayarları
1. **Authentication → URL Configuration**:
   - **Site URL**: Vercel domainin (örn. `https://detention-recover-ai.vercel.app`). Henüz yoksa Bölüm 2'den sonra doldur.
   - **Redirect URLs** listesine şunları ekle:
     - `https://<vercel-domainin>/login`
     - `https://<vercel-domainin>/app`
     - `https://<vercel-domainin>/reset-password`
2. **Authentication → Providers → Email** açık olsun (varsayılan). Magic link ve şifre sıfırlama bunu kullanır.
3. (Opsiyonel) **Google** ile giriş için: Google provider'ı aç, Google Cloud'dan Client ID/Secret gir. İstemiyorsan `VITE_ENABLE_GOOGLE_AUTH=false` yap.

### 1.5 Edge Functions (Resend e-posta) — Supabase CLI ile
1. CLI'yı kur: `npm i -g supabase` (veya `brew install supabase/tap/supabase`).
2. Giriş yap ve projeyi bağla:
   ```bash
   supabase login
   supabase link --project-ref <proje-ref>   # Project URL'deki alt alan adı
   ```
3. Gizli anahtarları (secrets) ekle:
   ```bash
   supabase secrets set RESEND_API_KEY=<resend-api-key>
   supabase secrets set INBOUND_WEBHOOK_SECRET=<rastgele-uzun-bir-secret>
   supabase secrets set ADMIN_USER_ID=<1.3'te-kopyaladigin-uid>
   ```
   > `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` fonksiyonlara otomatik enjekte edilir; onları ayrıca eklemene gerek yok.
4. Fonksiyonları deploy et:
   ```bash
   supabase functions deploy send-email
   supabase functions deploy resend-inbound
   supabase functions deploy public-lead-intake
   ```
   `public-lead-intake` ve `resend-inbound` JWT istemez (landing formu ve webhook için); `config.toml` bunu ayarlar.

---

## Bölüm 2 — Resend (e-posta)

1. https://resend.com → ücretsiz hesap aç.
2. **API Keys → Create** → anahtarı 1.5'teki `RESEND_API_KEY` olarak kullan.
3. (Önerilir) **Domains** altında kendi alan adını doğrula ki e-postalar "spam" yerine gerçek adresinden gitsin. Doğrulamazsan Resend'in test alan adıyla sınırlı gönderim yaparsın.
4. (Opsiyonel) Broker cevaplarını uygulamaya düşürmek için **inbound**/webhook'u Resend'de şu adrese yönlendir:
   `https://<proje-ref>.supabase.co/functions/v1/resend-inbound?secret=<INBOUND_WEBHOOK_SECRET>`

---

## Bölüm 3 — Vercel (frontend)

1. Kodu GitHub'a it (bu repo zaten hazır).
2. https://vercel.com → **Add New → Project** → GitHub reposunu seç (**Import**).
3. Framework otomatik **Vite** algılanır; `vercel.json` build ve SPA yönlendirmelerini ayarlar. Değiştirmene gerek yok.
4. **Environment Variables** bölümüne şunları gir:
   | Key | Value |
   | --- | ----- |
   | `VITE_DATA_BACKEND` | `supabase` |
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
   | `VITE_APP_URL` | Vercel domainin (deploy sonrası netleşir) |
   | `VITE_ENABLE_REGISTRATION` | `false` |
   | `VITE_ENABLE_SMS` | `false` |
5. **Deploy**. Bittiğinde Vercel sana bir URL verir (örn. `https://...vercel.app`).
6. Bu URL'yi **Supabase → Auth → URL Configuration**'daki Site URL + Redirect URLs alanlarına ekle (Bölüm 1.4). Sonra bir kez daha **Redeploy** et ki `VITE_APP_URL` doğru olsun.

---

## Bölüm 4 — İlk giriş ve kontrol

1. `https://<vercel-domainin>/login` adresine git.
2. 1.3'te oluşturduğun admin e-postası + şifresiyle giriş yap.
3. Uygulama ilk açılışta Supabase'den boş veriyi yükler (demo verisi yok — bu gerçek backend). Load/Claim ekleyerek başla.
4. Landing sayfasındaki "Recover my money" formu → `public-lead-intake` fonksiyonuna gider ve **Case Leads** listesinde belirir.

### Ücretsiz sınırlar (yeterlidir)
- **Supabase Free**: 500 MB veritabanı, 50.000 aylık aktif kullanıcı, Edge Functions dahil.
- **Vercel Hobby**: kişisel/tek admin kullanım için fazlasıyla yeterli.
- **Resend Free**: aylık 3.000 e-posta / günlük 100.

### Sık sorunlar
- **Giriş sonrası boş sayfa / auth hatası**: Redirect URLs'i Vercel domaininle eşleştir ve redeploy et.
- **Landing formu 401**: `public-lead-intake` deploy edildi mi ve `verify_jwt=false` mı (config.toml) — kontrol et.
- **E-posta gitmiyor**: `RESEND_API_KEY` secret'ı ekli mi, Resend'de domain doğrulandı mı.
- **"Supabase store not initialized"**: `VITE_DATA_BACKEND=supabase` ve URL/anon key env'leri Vercel'de girili mi.

---

Frontend'i **GitHub Pages** ile bedava yayınlamak da mümkün (mock backend ile); detaylar [`README.md`](./README.md) içinde.
