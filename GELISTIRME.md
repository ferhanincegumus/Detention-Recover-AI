# Geliştirme Rehberi

Bu dosya, Detention Recover AI'yı nasıl geliştireceğimizi **basit Türkçe** ile anlatır. Kod bilmene gerek yok; buradaki komutları sırayla çalıştırmak yeterli.

---

## 1. Uygulamayı bilgisayarında çalıştırma

Uygulama "mock mod"da hiçbir kurulum istemeden çalışır (Supabase/hesap gerekmez):

```bash
npm install     # ilk seferde: gerekli paketleri indirir
npm run dev     # uygulamayı başlatır → http://localhost:5173
```

- Tarayıcıda `http://localhost:5173` adresini aç.
- **Giriş:** `admin@detentionrecover.ai` / `recover123` (giriş ekranında da yazar).
- Bir dosyayı kaydettiğinde ekran **anında güncellenir** (yeniden başlatmana gerek yok).
- Durdurmak için terminalde `Ctrl + C`.

**Terim açıklamaları:**
- *terminal*: komut yazdığın siyah ekran.
- *mock mod*: sahte/yerel veri modu. Veriler senin tarayıcında saklanır, internet gerektirmez. Denemeler için idealdir.
- *hot-reload*: kod değişince sayfanın kendiliğinden yenilenmesi.

---

## 2. İki çalışma modu: mock ve supabase

| Mod | Ne işe yarar | Ne zaman kullanılır |
| --- | ------------ | ------------------- |
| **mock** (varsayılan) | Sahte veriyle hızlı çalışma. Kurulum yok. | Günlük geliştirme, tasarım/özellik denemesi |
| **supabase** | Gerçek veritabanı + gerçek giriş + e-posta | Canlıya benzer ortamda son kontrol |

- *Supabase*: verilerin gerçekten saklandığı, ücretsiz bir internet veritabanı ve giriş sistemi.
- Kural: **önce mock modda geliştir**, iş bitince istersen supabase modunda dene.
- Supabase modunu açmak için proje kökünde `.env.local` adında bir dosya oluşturup şunları yaz:

```
VITE_DATA_BACKEND=supabase
VITE_SUPABASE_URL=... (Supabase panelinden)
VITE_SUPABASE_ANON_KEY=... (Supabase panelinden)
```

(Detaylı ücretsiz kurulum: `DEPLOY_TR.md`)

---

## 3. Test ve kontrol komutları

Her değişiklikten sonra bu 4 komut sırayla çalıştırılır. Hepsi hatasız geçmeden değişiklik kaydedilmez:

```bash
npm run typecheck   # 1) Tip hataları (yanlış veri kullanımı) kontrolü
npm run lint        # 2) Kod düzeni/standart kontrolü
npm run test        # 3) Otomatik testler (mantık doğru mu)
npm run build       # 4) Uygulama yayına hazır şekilde derleniyor mu
```

**Terim açıklamaları:**
- *typecheck*: kodun mantık/tip hatası var mı diye bakar.
- *lint*: yazım/düzen kurallarına uygun mu diye bakar.
- *test*: önceden yazılmış otomatik kontroller (şu an 45 tane) çalışır.
- *build*: uygulamayı yayınlanabilir hale getirir; burada hata çıkarsa siteye çıkamaz.

Not: `npm run test:watch` testleri sürekli açık tutar (dosya değişince otomatik koşar).

---

## 4. Kod nerede duruyor (kısaca)

```
src/
  pages/admin/        → her ekran/sayfa (Dashboard, Claims, Loads…)
  features/<konu>/     → o konuya ait parçalar (claims, loads, marketing…)
  services/api/        → veri ve iş mantığı
  services/domain/     → saf hesaplamalar (detention, komisyon, risk) — testli
  components/ui/        → temel arayüz parçaları (buton, kart…)
  components/shared/    → ortak parçalar (istatistik kartı, başlık…)
  types/               → tüm veri tanımları
supabase/               → veritabanı şeması ve sunucu fonksiyonları
```

---

## 5. Yayına alma (deploy)

- Bu projede **`main` dalı yoktur.** `claude/detention-recover-ai-3i6ie5` hem varsayılan hem **production** dalıdır.
- Bu dal **Vercel'e doğrudan bağlıdır**: değişiklik bu dala **push** edildiği an **canlıya çıkar** (1–2 dakikada). Ayrıca "merge" gibi bir adım **yoktur**.
- Yani akış tek adımdır: kontroller geçer → commit → push → site güncellenir.

**Terim açıklamaları:**
- *branch (dal)*: üzerinde çalıştığımız kod kolu. Burada tek ve production dalı bu.
- *push*: değişiklikleri internetteki depoya (GitHub) gönderme → burada aynı zamanda canlı yayın demektir.
- *deploy*: uygulamayı canlıya çıkarma (Vercel bunu otomatik yapar).

---

## 6. Kalıcı çalışma kuralları (her oturum için geçerli)

Bu kurallar, bundan sonraki tüm oturumlarda Claude tarafından uygulanır:

1. **Kullanıcı kod bilmiyor.** Her zaman basit Türkçe ile, teknik terimleri açıklayarak cevap ver.
2. **Her değişiklikten önce mock modda geliştir ve test et.**
3. **Her değişiklikten sonra** `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` komutlarını Claude çalıştırır; **hepsi geçmeden commit'lemez.**
4. **Hepsi geçince** commit'le ve `claude/detention-recover-ai-3i6ie5` dalına push'la (Vercel otomatik yayınlar).
5. **Bir şey bozulursa** kullanıcıya net biçimde: **"Vercel'de Instant Rollback'e bas"** diye haber ver (böylece site anında eski, çalışan haline döner).

**Terim açıklamaları:**
- *commit*: değişikliği "kaydet/mühürle" işlemi.
- *Instant Rollback*: Vercel'de tek tıkla eski çalışan sürüme dönme özelliği. Vercel panelinde ilgili proje → **Deployments** → çalışan eski sürüm → **⋯ → Instant Rollback**.
