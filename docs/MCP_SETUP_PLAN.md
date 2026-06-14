# MCP Setup Plan

## DreamCloud — Model Context Protocol Kurulum Planı

**Versiyon:** 1.0 | **Tarih:** 2026-06-14  
**Kapsam:** Claude Code geliştirme ortamı için MCP sunucu seçimi ve kurulum stratejisi

---

## Neden MCP?

DreamCloud, 14 teknik doküman, 25+ veritabanı tablosu, 60+ API endpoint, Python + TypeScript çift dil yapısı ve 12 aylık geliştirme süreci olan karmaşık bir projedir. Bu ölçekte Claude Code'un:

- Büyük kod tabanında navigasyon yapabilmesi
- Güncel kütüphane dokümantasyonuna erişebilmesi
- Karmaşık mimari kararları tutarlı şekilde takip edebilmesi
- Veritabanını doğrudan sorgulayabilmesi
- Tasarım sistemini koda birebir yansıtabilmesi
- Uzun geliştirme sürecinde bağlamı koruyabilmesi

...için doğru MCP setini kurmak kritiktir. Yanlış MCP'ler gereksiz karmaşıklık yaratır; eksik MCP'ler ise tekrarlı bağlam verme yüküne neden olur.

---

## Proje Bağlamı Özeti

| Boyut               | Detay                                                             |
| ------------------- | ----------------------------------------------------------------- |
| **Tech Stack**      | React Native/Expo + NestJS + Python FastAPI + PostgreSQL/pgvector |
| **Veritabanı**      | AWS RDS PostgreSQL 16, 25+ tablo, pgvector uzantısı               |
| **Diller**          | TypeScript (frontend + backend), Python (NLP), SQL                |
| **Altyapı**         | AWS (ECS, RDS, ElastiCache, S3, SES) + Docker                     |
| **CI/CD**           | GitHub Actions                                                    |
| **Tasarım**         | Figma (Coco Gothic + Museo tipografisi, hazır görsel kimlik)      |
| **Süre**            | 12 ay MVP + V2/V3 devam geliştirme                                |
| **Ekip**            | 5 kişi                                                            |
| **Özel Gereksinim** | NLP matching engine, pgvector, gerçek zamanlı WebSocket           |

---

## Seviye 1 — Zorunlu MCP'ler

Bu MCP'ler olmadan DreamCloud geliştirme süreci ciddi biçimde yavaşlar veya hata riski artar. **Geliştirme başlamadan kurulmalıdır.**

---

### 1.1 Filesystem MCP

**Amaç:** Claude Code'un proje dosyalarını okuyup yazabilmesi, dizin yapısında gezinebilmesi.

**Sağlayacağı Yetenekler:**

- Monorepo içinde (backend + mobile + nlp) dosyalar arası gezinme
- TypeScript tip tanımlarının birden fazla dosyada tutarlı güncellenmesi
- Migration dosyalarını sıralı okuma ve yeni migrasyon oluşturma
- NestJS modül dosyaları (controller, service, module, dto) arasında koordineli düzenleme
- Python NLP servis dosyalarına erişim
- Docker Compose ve environment yapılandırma dosyalarını okuma
- `DATABASE_SCHEMA.md`'deki tablo tanımlarını gerçek migrasyon dosyasına dönüştürme

**Kurulum Önceliği:** ⭐⭐⭐⭐⭐ (En Kritik)

**Hangi Aşamada:** MVP'den itibaren tüm aşamalarda

**Bu Proje İçin Neden Gerekli:**
DreamCloud'un kod tabanı başından itibaren çok dosyalıdır. NestJS'de tek bir özellik eklemek; controller, service, module, dto ve test dosyalarına aynı anda dokunmayı gerektirir. Filesystem MCP olmadan Claude Code her seferinde dosya içeriklerini kullanıcıdan talep etmek zorunda kalır — bu, 25 tablo ve 60+ endpoint ölçeğinde sürtünmeyi katlar.

**Dikkat Edilecek Noktalar:**

```
✅ Erişim izni: Yalnızca proje dizini kapsamında sınırlandırın
   → /Users/ilhanceven/Documents/Dream Cloud Project/
   → Tüm disk erişimi vermeyin

✅ .env dosyaları: Gerçek secret'lar içeren .env dosyaları
   için okuma izni vermeyin; yalnızca .env.example okunabilir

✅ node_modules ve .git dizinleri: Bu dizinleri erişim kapsamı
   dışında tutun (büyük boyut, yanlış düzenleme riski)

✅ AWS credentials (~/.aws/): Kesinlikle kapsam dışı

Önerilen izin yapılandırması:
  Allow:  /proje-dizini/** (src, migrations, docs, config)
  Deny:   **/node_modules/**, **/.git/**, **/.env*
```

---

### 1.2 GitHub MCP

**Amaç:** GitHub deposu yönetimi; issue takibi, PR oluşturma, CI/CD pipeline durumu, branch yönetimi.

**Sağlayacağı Yetenekler:**

- Açık issue'ların ve milestone'ların görüntülenmesi
- PR oluşturma ve açıklama yazımı (feature, bugfix, migration)
- CI/CD (GitHub Actions) pipeline durumunu okuma
- Branch durumu ve merge çakışmalarını görme
- Code review yorum takibi
- Sprint tamamlama raporları için commit geçmişi analizi
- MVP_ROADMAP.md'deki sprint görevleriyle GitHub issue'larını senkronize etme
- Release tag'i oluşturma

**Kurulum Önceliği:** ⭐⭐⭐⭐⭐ (En Kritik)

**Hangi Aşamada:** Sprint 1'den (geliştirme başlangıcı) itibaren

**Bu Proje İçin Neden Gerekli:**
MVP_ROADMAP.md'de tanımlanan 18 sprint, 36 hafta, 150+ kontrol listesi maddesi bulunuyor. Bu maddelerin GitHub Issue'larıyla ve CI/CD durumlarıyla senkronize yönetimi olmadan geliştirme takibi manuel yüke dönüşür. GitHub Actions ile otomatik test + deploy kurulduğunda, pipeline durumunu anlık görebilmek kritik.

**Dikkat Edilecek Noktalar:**

```
✅ Token kapsamı (scope): Yalnızca gerekli izinler
   Zorunlu: repo (read + write), workflow (CI durumu)
   Opsiyonel: read:org (ekip bilgisi)
   Gereksiz: delete_repo, admin:org

✅ Fine-grained Personal Access Token tercih edin:
   Classic token yerine → daha granüler izin kontrolü

✅ Token yenileme: 90 günlük token rotasyonu takvimi oluşturun
   (SECURITY_REQUIREMENTS.md'deki secret rotasyon politikasıyla uyumlu)

✅ Branch koruma: main ve develop branch'lerine yazma izni
   varsa dikkatli olun; doğrudan push yerine PR akışı zorunlu
   kılınması önerilir

✅ Secrets exposure: GitHub Actions sırları (AWS keys, DB URL)
   MCP üzerinden asla görüntülenmez; bu ayarı doğrulayın
```

---

### 1.3 Context7 MCP

**Amaç:** NestJS, React Native/Expo, pgvector, TypeORM, FastAPI gibi hızla gelişen kütüphanelerin güncel dokümantasyonuna gerçek zamanlı erişim.

**Sağlayacağı Yetenekler:**

- NestJS güncel decorator ve modül API'leri (sürüm değişikliklerinde kritik)
- Expo SDK güncel push notification, SecureStore, HealthKit API'leri
- pgvector HNSW index parametreleri ve vektör operasyon sözdizimi
- TypeORM migration API ve entity decorator güncel kullanımı
- `sentence-transformers` Python kütüphanesi model seçimi ve konfigürasyon
- FastAPI güncel middleware ve dependency injection desenleri
- React Query v5 (TanStack Query) güncel hook API'leri
- Bull/BullMQ kuyruk yönetimi güncel sözdizimi
- AWS SDK v3 servis istemcisi API'leri
- `class-validator` ve `class-transformer` DTO validasyon desenleri

**Kurulum Önceliği:** ⭐⭐⭐⭐⭐ (En Kritik)

**Hangi Aşamada:** MVP'den itibaren tüm aşamalarda; özellikle Sprint 1–4 (kurulum aşaması)

**Bu Proje İçin Neden Gerekli:**
DreamCloud stack'i birden fazla hızla gelişen ekosistem kullanır. NestJS v10 ile v9 arasında, Expo SDK 50 ile 51 arasında, React Query v4 ile v5 arasında kırıcı (breaking) değişiklikler bulunur. Claude Code'un eğitim verisi bu değişiklikleri içermeyebilir. Context7 MCP olmadan yanlış API kullanımı → runtime hataları → gereksiz debug süresi.

**Özellikle Kritik Olan Kütüphaneler:**

```
pgvector          → HNSW index parametreleri sık güncelleniyor
@nestjs/*         → Major sürüm değişiklikleri decorator API'sini değiştirir
expo-notifications → APNs token formatı değişikliği kritik
sentence-transformers → Model isimleri ve parametreler değişiyor
@aws-sdk/client-* → v2→v3 geçişi tamamen farklı API
typeorm           → Migration ve entity syntax değişiklikleri
react-query       → v5'te useQuery API'si değişti
```

**Dikkat Edilecek Noktalar:**

```
✅ Kütüphane sürümünü her soruda belirtin:
   "NestJS 10.x için JWT guard nasıl yapılır?"
   sürüm belirtmeden sorgu → eski doküman dönebilir

✅ package.json'daki sürümlerle Context7 çıktısını karşılaştırın

✅ Beta/RC sürüm uyarısı: Context7 stable sürümleri önceliklendirir;
   projenin belirli bir RC sürüm kullandığı durumda doğrulayın
```

---

### 1.4 Sequential Thinking MCP

**Amaç:** Çok adımlı, birbirine bağımlı mimari ve algoritma kararlarında yapılandırılmış, geri adım atılabilir düşünce zinciri oluşturma.

**Sağlayacağı Yetenekler:**

- NLP eşleştirme algoritması tasarımı (etiket skoru + semantik skor ağırlık denklemi)
- Güvenlik açığı analizi (kimlik doğrulama akışlarında kenar durum tespiti)
- Veritabanı sorgu optimizasyonu (EXPLAIN ANALYZE çıktısı yorumlama + index stratejisi)
- Ölçekleme faz geçiş kararı (hangi metrikte hangi mimari değişiklik?)
- GDPR uyum kontrolü (veri işleme zinciri analizi)
- Yük testi başarısızlığı teşhisi (bottleneck tespiti için nedensellik zinciri)
- Feed algoritması kararı (fanout-on-write vs. fanout-on-read tradeoff)
- Teknik borç önceliklendirmesi

**Kurulum Önceliği:** ⭐⭐⭐⭐⭐ (En Kritik)

**Hangi Aşamada:** Mimari karar noktalarında (Sprint 4–5 NLP tasarımı, Sprint 13–14 güvenlik denetimi, faz geçiş kararları)

**Bu Proje İçin Neden Gerekli:**
DreamCloud'un üç kritik karmaşıklık alanı var:

**1. NLP Eşleştirme:** Etiket örtüşmesi ve semantik benzerlik skorlarını ağırlıklandırma denklemi `final_score = (α × tag_overlap) + (β × semantic_similarity)` — α ve β değerleri kullanıcı geri bildirimiyle ayarlanmalı; bu bir optimizasyon problemi.

**2. Feed Algoritması:** Celebrity kullanıcı problemi (100K+ takipçi) için fanout-on-write vs. read tradeoff — her karar zincirine bağlı; SCALABILITY_PLAN.md'de belgelenmiş ancak uygulamada onlarca ara karar gerektirir.

**3. Güvenlik Akışları:** AUTHENTICATION_FLOW.md'deki refresh token rotation + token theft detection → her adımda "ne olursa ne olur" sorusu sormayı gerektirir.

Sequential Thinking MCP bu tür çok adımlı analizlerde "erken kapanma" hatasını önler.

**Dikkat Edilecek Noktalar:**

```
✅ Her karmaşık karar oturumunda aktive edin; rutin kod yazımında
   gereksiz ağırlık katar

✅ "Düşünme adımı sayısını" sınırlamayın; DreamCloud'daki
   mimari kararlar genellikle 8-15 adım gerektirir

✅ Geri adım ("revise") özelliğini kullanın: NLP skor denklemi
   gibi iteratif optimizasyonlarda önceki karara dönmek gerekebilir
```

---

## Seviye 2 — Önerilen MCP'ler

Bu MCP'ler geliştirme kalitesini ve hızını anlamlı biçimde artırır. **Sprint 1 tamamlanınca kurulması tavsiye edilir.**

---

### 2.1 Memory MCP

**Amaç:** Claude Code oturumları arasında bağlamı koruma; proje kararları, mimari tercihler ve ekip anlaşmalarının kalıcı hafızası.

**Sağlayacağı Yetenekler:**

- Mimari kararların kalıcı kaydı ("pgvector HNSW m=16 seçildi, sebebi X")
- Tekrarlayan hatalar ve çözümleri ("TypeORM migration sıralama hatası — şu şekilde çözüldü")
- Sprint geçmişi ("Sprint 5'te NLP baseline %72 doğruluk verdi")
- Ekip tercih ve sözleşmeleri ("Her DTO dosyası `*.dto.ts` sonekiyle adlandırılır")
- Güvenlik kararları ("bcrypt rounds=12 olarak sabitlendi, değiştirilmez")
- Performans benchmarkları ("feed sorgusu 450ms → index sonrası 80ms")

**Kurulum Önceliği:** ⭐⭐⭐⭐ (Yüksek)

**Hangi Aşamada:** Sprint 2'den itibaren (kod yazılmaya başlayınca)

**Bu Proje İçin Neden Gerekli:**
12 aylık geliştirme sürecinde yüzlerce mimari karar alınacak. Oturum başı bağlamı yeniden kurmak ("hangi NestJS auth guard kullanıyorduk?", "pgvector index parametrelerimiz neydi?") zaman kaybı ve tutarsızlık riskidir. Memory MCP bu kararları kalıcı olarak depolar.

**Not:** Claude Code'un yerleşik dosya tabanlı memory sistemi (`/memory/` dizini) zaten aktif. Memory MCP bu sistemin üzerine ek bir katman ekler — özellikle yapılandırılmış, etiketlenmiş hafıza girişleri için uygundur.

**Dikkat Edilecek Noktalar:**

```
✅ Mevcut proje memory dosyalarıyla (/memory/MEMORY.md) çakışmayı
   önleyin; hangi sistem hangi tür bilgiyi saklıyor, net sınır çizin

   Memory MCP     → Teknik kararlar, kod sözleşmeleri, benchmark'lar
   Dosya hafızası → Kullanıcı tercihleri, proje özeti, proje durumu

✅ Aşırı kayıt yapmaktan kaçının: Her satırı değil, "sonraki oturumda
   bilinmesi gereken" kararları kaydedin

✅ Hafıza temizliği: Geçersiz kalan kararları düzenli silin
   (örn. pgvector → Pinecone geçişi yapıldıysa eski kararı kaldırın)
```

---

### 2.2 Playwright MCP

**Amaç:** Web uygulaması ve yönetici paneli için otomatik E2E test yürütme ve tarayıcı tabanlı doğrulama.

**Sağlayacağı Yetenekler:**

- **Moderatör Paneli (MVP):** İçerik moderasyon dashboard'ının işlevsel testleri
- **Web Uygulaması (V2, Next.js):** Kayıt, rüya girişi, feed, profil akışlarının E2E testleri
- **Marka Reklam Paneli (V3):** Kampanya oluşturma, analitik görüntüleme testleri
- API yanıtlarının tarayıcı üzerinde görsel doğrulanması
- Staging ortamında regression test otomasyonu
- Responsive tasarım testleri (masaüstü, tablet, mobil)
- Accessibility (a11y) testleri (WCAG 2.1 AA uyumu doğrulama)

**Kurulum Önceliği:** ⭐⭐⭐ (Orta)

**Hangi Aşamada:**

- MVP: Yalnızca moderatör paneli için (iç araç)
- V2 (Ay 19+): Web uygulaması lansmanında kritik hale gelir
- V3 (Ay 25+): Marka reklam paneli testleri

**Bu Proje İçin Neden Gerekli:**
Mobil uygulama (React Native) Playwright ile test edilemez — bunun için Detox kullanılır. Ancak DreamCloud'un üç web tabanlı arayüzü bulunur:

1. Moderatör yönetim paneli (MVP'de bile gerekli — raporları inceleyecek moderatörler)
2. Web uygulaması (V2 — Next.js)
3. Marka reklam paneli (V3)

Bu arayüzler Playwright MCP ile otomatik test kapsamına alınabilir; özellikle moderatör panelinin hatalı çalışması içerik krizine yol açar.

**Dikkat Edilecek Noktalar:**

```
✅ MVP'de erken kurmayın; moderatör paneli tasarımı netleşince
   (Sprint 10 sonrası) kurun

✅ Mobil uygulama için KULLANMAYIN: React Native testleri
   Detox ile yapılır; Playwright yalnızca web için geçerlidir

✅ Test ortamı izolasyonu: Playwright testleri production'a değil
   staging'e yönlendirin; test datası üretmemesi kritik

✅ CI entegrasyonu: GitHub Actions ile Playwright testlerini
   otomatik çalıştırın; başarısız test → PR merge bloğu

✅ Headless mod: CI ortamında headless=true zorunlu
```

---

### 2.3 Figma MCP

**Amaç:** DreamCloud'un hazır görsel kimliğini (logo, renkler, tipografi, ikon sistemi) kod bileşenlerine doğrudan aktarma.

**Sağlayacağı Yetenekler:**

- Figma'daki renk paletini React Native StyleSheet token'larına dönüştürme
- Coco Gothic ve Museo tipografi ölçeklerini (Light/Medium/Bold) kod sabitiyle eşleştirme
- Logo ve ikon varlıklarını doğrudan export etme (SVG, PNG @1x/@2x/@3x)
- Spacing, border-radius, shadow değerlerini design token olarak çekme
- Bileşen spesifikasyonlarını (padding, margin, boyut) pixel-perfect okuma
- Tasarım güncellemelerini otomatik algılama (tasarımcı değişiklik yaptığında geliştiriciye yansıma)
- Dark mode renk eşlemelerini Figma üzerinden çekme

**Kurulum Önceliği:** ⭐⭐⭐ (Orta)

**Hangi Aşamada:** Sprint 7–8 (Feed ve UI bileşenlerinin geliştirilmesi) öncesinde

**Bu Proje İçin Neden Gerekli:**
PDF'de görsel kimlik detaylı şekilde tanımlanmıştır:

- Ana tipografi: **Coco Gothic** (Light/Medium/Bold)
- İkincil tipografi: **Museo** (Light/Medium/Bold)
- Renk paleti: Ana renkler + ikincil renkler tanımlı
- Logo, ikon ve uygulama ikonu hazır

Bu değerlerin kod dosyalarına manuel aktarımı hata ve tutarsızlık üretir. Figma MCP bu köprüyü otomatikleştirir.

**Dikkat Edilecek Noktalar:**

```
✅ Figma dosyasının hazır olması şart: MCP kurmadan önce
   tüm bileşenlerin Figma'da güncel ve düzenli olduğunu doğrulayın

✅ Token isimlendirme sözleşmesi: Figma'daki renk/spacing adları
   ile kod'daki token isimleri tutarlı olmalı
   Figma: "primary-500" → kod: colors.primary[500]

✅ Figma erişim tokeni: Personal Access Token, yalnızca
   okuma (read-only) izniyle oluşturun; yazma izni vermeyin

✅ V2 web uygulaması için kritikleşir: React Native'de manuel
   uygulama kabul edilebilir; Next.js CSS token sistemi kurulumunda
   Figma MCP çok daha değerli hale gelir

✅ Figma dosyası değişiklik bildirimi: Tasarım güncellemesi
   yapıldığında geliştirici bilgilendirilmelidir (webhook veya
   MCP polling)
```

---

## Seviye 3 — İleri Seviye MCP'ler

Bu MCP'ler belirli bir büyüme aşamasında veya özel kullanım senaryolarında değer üretir. Proje ilerledikçe değerlendirilmelidir.

---

### 3.1 PostgreSQL MCP

**Amaç:** Geliştirme ve staging veritabanına doğrudan bağlanarak şema doğrulama, sorgu testi ve veri analizi yapma.

**Sağlayacağı Yetenekler:**

- Migration'ların uygulanıp uygulanmadığını doğrulama
- Index kullanımını `EXPLAIN ANALYZE` ile gerçek zamanlı test etme
- pgvector cosine similarity sorgusunun gerçek performansını ölçme
- Trend hesaplama sorgularını test verisiyle doğrulama
- Veritabanı boyutu ve tablo büyüme hızı analizi
- Yabancı anahtar kısıtlarının doğru çalışıp çalışmadığını kontrol etme
- Geliştirme ortamında seed data sorguları

**Kurulum Önceliği:** ⭐⭐ (Orta-Düşük)

**Hangi Aşamada:** Sprint 4+ (Veritabanı yoğun geliştirme başlayınca)

**Bu Proje İçin Değerlendirme:**
DATABASE_SCHEMA.md'de 25+ tablo ve karmaşık index stratejisi tanımlanmıştır. pgvector HNSW index performansı gerçek veriyle test edilmeden ölçülemez. Bununla birlikte:

- TypeORM zaten ORM katmanında şema doğrulaması yapar
- `psql` CLI ile bu işlemlerin büyük bölümü yapılabilir
- Production veritabanına doğrudan bağlanma güvenlik riski taşır

**Önerilen Kurulum Yaklaşımı:**

```
Yalnızca yerel geliştirme veritabanına bağlayın:
  postgresql://localhost:5432/dreamcloud_dev

ASLA bağlamayın:
  - Production RDS endpoint'i
  - Staging RDS endpoint'i (test için kısıtlı kullanım)

Read-only kullanıcı oluşturun:
  CREATE USER mcp_readonly WITH PASSWORD '...';
  GRANT CONNECT ON DATABASE dreamcloud_dev TO mcp_readonly;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
```

**Dikkat Edilecek Noktalar:**

```
⚠️ Production veritabanı bağlantısı yasak — credentials
   MCP üzerinden asla açık iletilmemeli

✅ Yalnızca yerel Docker Compose veritabanına bağlanın
✅ Read-only kullanıcı zorunlu; DML (INSERT/UPDATE/DELETE) izni vermeyin
✅ Migration'ları MCP üzerinden çalıştırmayın; TypeORM CLI kullanın
```

---

### 3.2 Supabase MCP

**Amaç (Değerlendirme):** Supabase platformuyla entegrasyon — veritabanı, auth, storage ve gerçek zamanlı abonelik yönetimi.

**Proje İçin Değerlendirme:**

DreamCloud, **AWS RDS PostgreSQL** kullanmayı tercih etmiştir (TECH_STACK.md ve SYSTEM_ARCHITECTURE.md'de kesin karar). Supabase MCP, Supabase platformuna özgü bir araçtır.

**Supabase MCP'yi Değerlendirmeye Neden Açtık:**

Supabase, DreamCloud stack'iyle ilginç bir örtüşme sunar:

| Supabase Özelliği     | DreamCloud Karşılığı     | Örtüşme |
| --------------------- | ------------------------ | ------- |
| Auth (JWT + OAuth)    | NestJS Auth Module       | Benzer  |
| Realtime (WebSocket)  | Socket.io                | Benzer  |
| Storage               | AWS S3                   | Benzer  |
| PostgreSQL + pgvector | AWS RDS + pgvector       | Aynı    |
| Row Level Security    | NestJS Guard + DB policy | Benzer  |

**Supabase MCP Kullanım Senaryosu:**
Eğer proje ilerleyen süreçte **hızlı prototipleme** veya **backend yükünü azaltma** gereksinimi duyarsa Supabase'e kısmi geçiş değerlendirilebilir.

**Mevcut Mimariyle Uyumluluk:**

- `pgvector` desteği: Supabase destekler ✓
- Veri taşıma: PostgreSQL → Supabase geçiş mümkün
- Maliyet karşılaştırması: Supabase Pro ~$25/ay vs. RDS t3.medium ~$60/ay
- Dezavantaj: Vendor lock-in, AWS ekosistemiyle entegrasyon karmaşıklaşır

**Karar: Şu Aşamada Kurulmamalı**

Mevcut AWS mimarisinde Supabase MCP'nin somut katkısı yoktur. Ancak eğer geliştirme sürecinde şu koşullar oluşursa yeniden değerlendirilebilir:

- Backend ekibinin azalması ve auth/realtime yükünü hafifletme ihtiyacı
- AWS maliyetlerinin bütçeyi aşması
- Rapid prototyping için ayrı bir sandbox ortamı gereksinimi

---

### 3.3 AWS MCP (Resmi veya 3. Taraf)

**Amaç:** AWS altyapısını (ECS, RDS, ElastiCache, S3, CloudWatch) Claude Code üzerinden yönetme.

**Sağlayacağı Yetenekler:**

- ECS servis durumu ve task log'larını okuma
- CloudWatch alarm ve metriklerini görüntüleme
- RDS snapshot ve yedek durumunu kontrol etme
- S3 bucket içeriğini listeleme (media dosyaları)
- Secrets Manager'dan secret adlarını (değil içeriklerini) listeleme

**Kurulum Önceliği:** ⭐⭐ (Düşük — Faz 2 Sonrası)

**Hangi Aşamada:** Faz 1 büyüme aşamasında (10K+ kullanıcı, gerçek altyapı yönetimi başlayınca)

**Dikkat Edilecek Noktalar:**

```
⚠️ Bu MCP için YALNIZCA Read-Only IAM policy kullanın:
   cloudwatch:GetMetricData (read)
   ecs:DescribeServices (read)
   rds:DescribeDBInstances (read)
   logs:FilterLogEvents (read)

⚠️ ASLA izin vermeyin:
   ec2:TerminateInstances
   rds:DeleteDBInstance
   iam:CreateUser (ve diğer IAM mutasyon izinleri)

✅ Ayrı bir "mcp-readonly" IAM kullanıcısı oluşturun;
   geliştirici hesabıyla aynı credentials kullanmayın
```

---

## Değerlendirilen ve Önerilmeyen MCP'ler

### Neden Önerilmedi?

**Slack MCP:**
5 kişilik küçük ekip için Slack entegrasyonu fazladır; standart Slack kullanımı yeterlidir. V2 sonrası ekip büyüdüğünde veya on-call alertler için otomasyona ihtiyaç duyulduğunda değerlendirilebilir.

**Linear/Jira MCP:**
GitHub Issues, MVP_ROADMAP.md ile yeterli. Ayrı bir proje yönetim aracına geçiş planı yoksa bu MCP değer katmaz. (GitHub MCP zaten issue yönetimini karşılar.)

**Docker MCP:**
Docker Compose `docker compose up` komutuyla zaten çok basit. Docker MCP'nin sağlayacağı container yönetim özelliklerinin büyük çoğunluğu CLI üzerinden daha kolay yapılır. Kubernetes'e geçilirse yeniden değerlendirilebilir.

**Sentry MCP:**
Sentry web UI ve alert sistemi yeterlidir. MCP entegrasyonu oturum bazlı hata takibini kolaylaştırır ancak DreamCloud ölçeğinde öncelik değildir. Faz 2'de production hata hacmi artınca değerlendirilebilir.

---

## Kurulum Sırası

### Aşama 0 — Geliştirme Başlamadan (Bu Hafta)

```
Adım 1: Sequential Thinking MCP
  → Mimari kararları vermeden önce kurulmalı
  → Sprint 1'deki altyapı tasarım kararlarında hemen kullanılacak

Adım 2: Context7 MCP
  → Stack kararları uygulamaya geçmeden kütüphane API'leri doğrulanmalı
  → NestJS, pgvector, Expo kurulum adımlarında anında değer üretir

Adım 3: Filesystem MCP
  → Proje dizini oluşturulunca, ilk dosyalar yazılmadan önce
  → İzin kapsamını dikkatli yapılandırın (.env hariç)
```

### Aşama 1 — Sprint 1 Tamamlanınca (Ay 1 Sonu)

```
Adım 4: GitHub MCP
  → Repo kurulumu ve ilk commit'ten sonra
  → CI/CD pipeline tanımlanınca (GitHub Actions kurulumu)
  → Issue'lar ve milestone'lar oluşturulunca

Adım 5: Memory MCP
  → İlk mimari kararlar alınmaya başlayınca
  → "NestJS guard yapısı şu şekilde kuruldu" türü kararları saklamak için
```

### Aşama 2 — Sprint 7–8 (Ay 4–5, UI Geliştirme Başlayınca)

```
Adım 6: Figma MCP
  → Feed ve UI bileşenleri geliştirilmeden önce
  → Figma dosyasının güncel ve düzenli olduğunu doğrulayın
  → Design token sistemi oluşturmak için kullanın
```

### Aşama 3 — Sprint 10 Sonrası (Ay 6, Moderatör Paneli Tanımlanınca)

```
Adım 7: Playwright MCP
  → Moderatör paneli tasarımı netleşince
  → Staging ortamı kurulunca
  → CI entegrasyonuyla birlikte kurun
```

### Aşama 4 — Faz 1 Büyüme (Ay 13+, 10K+ Kullanıcı)

```
Adım 8: PostgreSQL MCP (Yerel DB — Read Only)
  → Yalnızca geliştirme DB'ye bağlanacak şekilde
  → Performans analizi ve query optimizasyon döneminde

Adım 9: AWS MCP (Değerlendirin)
  → Altyapı yönetim karmaşıklığı artınca
  → Read-only IAM policy ile
```

---

## Özet Tablosu

| MCP                 | Seviye    | Aşama         | Öncelik    | Hemen Kur? |
| ------------------- | --------- | ------------- | ---------- | ---------- |
| Sequential Thinking | Zorunlu   | Hemen         | ⭐⭐⭐⭐⭐ | ✅ Evet    |
| Context7            | Zorunlu   | Hemen         | ⭐⭐⭐⭐⭐ | ✅ Evet    |
| Filesystem          | Zorunlu   | Hemen         | ⭐⭐⭐⭐⭐ | ✅ Evet    |
| GitHub              | Zorunlu   | Sprint 1 Sonu | ⭐⭐⭐⭐⭐ | ✅ Evet    |
| Memory              | Önerilen  | Sprint 2      | ⭐⭐⭐⭐   | 🔜 Yakında |
| Figma               | Önerilen  | Sprint 7      | ⭐⭐⭐     | 🔜 Yakında |
| Playwright          | Önerilen  | Sprint 10+    | ⭐⭐⭐     | ⏳ Bekle   |
| PostgreSQL          | İleri     | Faz 1         | ⭐⭐       | ⏳ Bekle   |
| AWS                 | İleri     | Faz 1+        | ⭐⭐       | ⏳ Bekle   |
| Supabase            | Önerilmez | —             | —          | ❌ Hayır   |

---

## Kurulum Sonrası Doğrulama

Her MCP kurulumundan sonra şu kontrolleri yapın:

```
Filesystem MCP:
  → Proje dizinindeki bir dosyayı okuyabilir misiniz?
  → .env dosyalarına erişim engellenmiş mi?
  → node_modules dışarıda mı?

GitHub MCP:
  → Repo'yu listeleyebilir misiniz?
  → Açık issue'ları görebilir misiniz?
  → Production'a doğrudan push yapılabiliyor mu? (hayır olmalı)

Context7 MCP:
  → "NestJS 10 JWT guard" sorgusu güncel doküman getiriyor mu?
  → pgvector HNSW parametreleri doğru sürüm için geliyor mu?

Sequential Thinking MCP:
  → Karmaşık bir mimari soruyu birden fazla adımda çözebiliyor mu?
  → Önceki adıma geri dönebiliyor mu?

Memory MCP:
  → Bir karar kaydedip yeni oturumda geri çağırılabiliyor mu?
  → Dosya tabanlı memory sistemiyle çakışıyor mu?

Figma MCP:
  → Figma dosyasındaki renk tokenlarını listeleyebiliyor mu?
  → İkon export çalışıyor mu?

Playwright MCP:
  → Staging URL'sine bağlanabiliyor mu?
  → Headless modda test çalışıyor mu?
  → CI ortamında çalışıyor mu?
```

---

_Bu doküman MCP_SETUP_PLAN.md olup DreamCloud geliştirme ortamı için MCP seçim gerekçelerini ve kurulum stratejisini kapsar. Kurulum bu belge tamamlandıktan sonra ayrı bir oturumda gerçekleştirilmelidir._
