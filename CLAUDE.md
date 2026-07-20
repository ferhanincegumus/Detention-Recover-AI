# Detention Recover AI — Çalışma Kuralları (Claude için)

Bu depoda çalışırken aşağıdaki kurallara **her zaman** uy. Ayrıntılı geliştirme rehberi: [`GELISTIRME.md`](./GELISTIRME.md).

## Zorunlu kurallar

1. **Kullanıcı kod bilmiyor.** Tüm cevapları **basit Türkçe** ile ver; kaçınılmaz teknik terimleri kısaca açıkla. Uzun kod dökümü yerine ne yaptığını sade anlat.
2. **Önce mock modda geliştir** (`VITE_DATA_BACKEND=mock`, varsayılan) ve orada dene.
3. **Her kod değişikliğinden sonra sırayla şunları çalıştır ve hepsi geçmeden commit etme:**
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```
   (Sadece markdown/dokümanı değiştiriyorsan `build` yeterlidir.)
4. **Hepsi geçince** anlamlı bir commit at ve `claude/detention-recover-ai-3i6ie5` dalına push'la.
   - **Bu projede `main` YOKTUR.** `claude/detention-recover-ai-3i6ie5` hem varsayılan hem **production** dalıdır ve Vercel'e doğrudan bağlıdır: **push = anında canlı yayın.** Merge diye bir adım yoktur.
   - Kullanıcıya **asla merge/PR önerme.** Başka dala push'lama.
5. **Bir şey bozulursa** kullanıcıya net şekilde şunu söyle: **"Vercel'de Instant Rollback'e bas"** (Deployments → çalışan eski sürüm → ⋯ → Instant Rollback). Sonra hatayı mock modda düzelt.

## Proje özeti

- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui. Mimari **özellik bazlı** (`src/features/*`).
- Backend iki modlu: **mock** (tarayıcıda, kurulumsuz) ve **supabase** (gerçek). Aynı kod her ikisinde çalışır (mirror-store).
- SMS kapalı; e-posta Resend ile. Ücretsiz deploy: Supabase + Vercel (`DEPLOY_TR.md`).
- Renk kuralı: amber = birincil aksiyon, yeşil = başarı/tahsil, kırmızı = hata/ret, gri = geri kalan.
