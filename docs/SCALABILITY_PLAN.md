# Scalability Plan

## DreamCloud — Ölçeklenebilirlik Stratejisi

**Versiyon:** 1.0 | **Tarih:** 2026-06-14

---

## 1. Ölçekleme Felsefesi

> "Erken optimizasyon kötüdür — ama geç kalmak daha kötüdür."

DreamCloud'un ölçeklenebilirlik planı üç ilkeye dayanır:

1. **Veriye Dayalı Geçiş:** Her mimari değişikliği somut bir kullanıcı eşiğine bağlıdır; erken karmaşıklık yaratılmaz.
2. **Yatay Ölçekleme Önceliği:** Sunucu büyütmek yerine sunucu çoğaltmak hedeflenir.
3. **Darboğaz Önce Ölçeklenir:** Tüm sistemi değil, tıkanan parçayı büyüt.

---

## 2. Büyüme Aşamaları ve Eşikler

| Faz                | Aktif Kullanıcı | Günlük Rüya Girişi | Aylık API İsteği |
| ------------------ | --------------- | ------------------ | ---------------- |
| **Faz 0 — MVP**    | 0 – 10K         | 0 – 2K             | 0 – 5M           |
| **Faz 1 — Büyüme** | 10K – 100K      | 2K – 20K           | 5M – 50M         |
| **Faz 2 — Ölçek**  | 100K – 1M       | 20K – 200K         | 50M – 500M       |
| **Faz 3 — Global** | 1M – 10M+       | 200K – 2M+         | 500M – 5B+       |

---

## 3. Faz 0 — MVP Mimarisi (0 – 10K Kullanıcı)

### Hedef

Hızlı geliştirme, düşük maliyet, doğru alışkanlıklar.

### Altyapı

```
┌─────────────────────────────────────────────┐
│               AWS ECS (Fargate)             │
│                                             │
│   NestJS (2 Task, 0.5 vCPU, 1GB RAM)       │
│   Python NLP (1 Task, 1 vCPU, 2GB RAM)     │
└─────────────────────────────────────────────┘
         │
┌────────▼────────────┐  ┌──────────────────────┐
│  RDS PostgreSQL     │  │  ElastiCache Redis    │
│  db.t3.medium       │  │  cache.t3.micro       │
│  20 GB, yedekli     │  │  512MB                │
└─────────────────────┘  └──────────────────────┘
```

### Maliyet Tahmini

```
ECS Fargate (3 task):     ~$80/ay
RDS db.t3.medium:         ~$60/ay
ElastiCache t3.micro:     ~$15/ay
CloudFront + S3:          ~$10/ay
SES + diğer:              ~$15/ay
Toplam:                   ~$180/ay
```

### Kapasite Analizi

```
NestJS (2 task, 0.5 vCPU x2 = 1 vCPU):
  → ~200 eşzamanlı istek
  → 10K DAU → pik: ~50 eşzamanlı (%0.5) → YETERLİ

PostgreSQL (db.t3.medium, 2 vCPU, 4GB RAM):
  → ~500 bağlantı → connection pool (20/task) → YETERLİ
  → pgvector index (HNSW): 10K rüya → <100ms yanıt → YETERLİ

Redis (512MB):
  → ~100K key → YETERLİ
```

### MVP Optimizasyonları

```
Veritabanı:
  - Connection pooling (pgBouncer): PgBouncer ECS task
  - Kritik sorgularda index'ler (DATABASE_SCHEMA.md'de tanımlı)
  - Denormalize sayaçlar (like_count, match_count) — JOIN'den kaçın

Uygulama:
  - Feed cache: Redis, 2 dk TTL
  - Trend hesaplama: Cron (15 dk), Redis sorted set
  - NLP işleme: Async (Bull Queue) — kullanıcı beklemez
```

---

## 4. Faz 1 — Büyüme Ölçeklemesi (10K – 100K Kullanıcı)

### Tetikleyici Eşikler

```
NestJS CPU > %70 (5 dk sürekli)  → Task sayısını artır
PostgreSQL CPU > %60              → Read replica ekle
Redis bellek > %75                → Cluster'a geç veya boyut artır
NLP servis kuyruğu > 1K iş       → NLP task sayısı artır
```

### Mimari Değişiklikler

**1. Auto Scaling Aktif**

```yaml
# ECS Service Auto Scaling
NestJS Tasks:
  min: 2, max: 8
  scale_out: CPU > 70% for 3 min → +2 task
  scale_in: CPU < 30% for 10 min → -1 task

NLP Tasks:
  min: 1, max: 4
  scale_out: Queue depth > 500 → +1 task
  scale_in: Queue depth < 50 for 15 min → -1 task
```

**2. PostgreSQL Read Replica**

```
Yazma trafiği → Primary (Master)
Okuma trafiği → Read Replica

Okuma endpoint'leri (replica'ya yönlendirilir):
  - Feed yükleme
  - Rüya detayı görüntüleme
  - Kullanıcı profili
  - Arama sorguları
  - Eşleşme sonuçları

Yazma endpoint'leri (primary'a):
  - Rüya kaydetme
  - Beğeni, yorum
  - Profil güncelleme
```

**3. Redis Kapasite Artırımı**

```
cache.t3.small → cache.r7g.large (6.38GB)

Yeni cache stratejileri:
  dream:{id}          TTL: 10 dk
  user_profile:{id}   TTL: 5 dk
  feed:{userId}:page1 TTL: 2 dk
  trending:tags:24h   TTL: 15 dk (cron ile güncellenir)
  tag:{name}:dreams   TTL: 5 dk
```

**4. CDN Optimizasyonu**

```
CloudFront cache kuralları:
  /api/*        → Cache yok (dinamik)
  /static/*     → Cache 1 yıl
  /avatars/*    → Cache 7 gün, signed URL
  /audio/*      → Cache 1 yıl, signed URL (V2)
```

### Maliyet Tahmini (Faz 1 pik)

```
ECS (4-8 task, otomatik):   ~$200–400/ay
RDS + Read Replica:          ~$180/ay
ElastiCache r7g.large:       ~$120/ay
CloudFront:                  ~$30/ay
Diğer:                       ~$70/ay
Toplam:                      ~$600–800/ay
```

---

## 5. Faz 2 — Ölçek (100K – 1M Kullanıcı)

### Kritik Darboğazlar ve Çözümleri

#### Darboğaz 1: Rüya Feed Performansı

```
Problem: 1M kullanıcıda sonsuz scroll için her sayfa yüklemesi
         kompleks SQL sorgusu → veritabanı baskısı

Çözüm: Materyalize Feed (Fanout on Write)
  - Kullanıcı rüya paylaştığında → takipçilerin feed cache'ine yaz
  - Redis: LPUSH feed:{followerId} dreamId (max 200 eleman)
  - Feed okuma: LRANGE feed:{userId} 0 19 → O(1)

Not: Ünlü kullanıcı (celebrity) problemi:
  100K takipçisi olan kullanıcı paylaşım yapınca 100K write → yavaş
  Çözüm: threshold (>10K takipçi) → Fanout on Read hibrit
```

#### Darboğaz 2: NLP Eşleştirme Kapasitesi

```
Problem: 200K günlük rüya → 200K embedding işleme görevi

Çözüm A: Batch Processing
  - Gerçek zamanlı: Yalnızca son 24 saatin rüyalarıyla eşleştir
  - Tam eşleştirme: Günde 1 kez gece batch

Çözüm B: GPU Instance
  - NLP task'larını GPU destekli instance'a taşı (g4dn.xlarge)
  - Embedding süresi: 100ms → 10ms

Çözüm C: Embedding Cache
  - Aynı içerik (duplicate rüyalar) → cache hit
  - Redis: embedding:{content_hash} → vector (TTL: 7 gün)
```

#### Darboğaz 3: Veritabanı Yazma Kapasitesi

```
Problem: 200K rüya/gün + beğeniler + yorumlar = yüksek yazma

Çözüm: Sayaç Güncelleme Async
  - like_count, comment_count, match_count → doğrudan UPDATE yerine
  - Redis INCR like_count:{dreamId}
  - Cron (1 dk): Redis değerlerini toplu PostgreSQL'e yaz
  - Eventual consistency: sayaçlar ~1 dk gecikmeli güncellenir (kabul edilebilir)
```

### Faz 2 Mimari

```
┌────────────────────────────────────────────────────────────────┐
│                    AWS ALB                                     │
└────────┬──────────────────────┬───────────────────────────────┘
         │                      │
┌────────▼──────┐      ┌────────▼──────────┐
│  NestJS API   │      │  WebSocket Server  │
│  (8-20 task)  │      │  (2-4 task)        │
└────────┬──────┘      └────────┬──────────┘
         │                      │
         └──────────┬───────────┘
                    │
┌───────────────────▼──────────────────────────────────────────┐
│                  VERİ KATMANI                                │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────────────────────┐ │
│  │  PostgreSQL      │    │  Redis Cluster (3 shard)         │ │
│  │  Primary (r6g.2x)│    │  (3x cache.r7g.large)            │ │
│  │  Read Replica x2 │    │  16GB toplam                     │ │
│  └─────────────────┘    └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              NLP MİKROSERVİS (Ayrı VPC subnet)              │
│  Python FastAPI (4-8 task, c6g.large)                       │
│  GPU batch processing (g4dn.xlarge, gece batch için)        │
└──────────────────────────────────────────────────────────────┘
```

### Maliyet Tahmini (Faz 2 pik)

```
ECS API (20 task): ~$800/ay
NLP Service:       ~$400/ay
RDS (r6g.2x + 2 replica): ~$800/ay
Redis Cluster:     ~$350/ay
CloudFront + S3:   ~$200/ay
Diğer:             ~$200/ay
Toplam:            ~$2,750/ay
```

---

## 6. Faz 3 — Global Ölçek (1M – 10M+ Kullanıcı)

### Multi-Region Dağıtım

```
Birincil Bölge: eu-west-1 (İrlanda) — Avrupa + Ortadoğu
İkincil Bölge:  us-east-1 (Virginia) — Amerika
Üçüncül Bölge: ap-southeast-1 (Singapur) — Asya-Pasifik

Route53 Latency Routing:
  Türkiye kullanıcısı → eu-west-1 (~20ms)
  ABD kullanıcısı    → us-east-1 (~15ms)
  Japonya kullanıcısı → ap-southeast-1 (~30ms)
```

### Veritabanı Stratejisi

```
PostgreSQL Global Cluster (Aurora Global Database):
  - Birincil: eu-west-1 (yazma)
  - Okuma: us-east-1, ap-southeast-1 (yerel okuma, ~100ms replikasyon)

Şema Bölümleme (Partitioning):
  dreams tablosu → aylık partition
    dreams_2026_01, dreams_2026_02, ...

  Etiket bazlı sharding (V3 sonrası, pgBouncer + Citus):
    Shard 0: tag_id % 4 = 0
    Shard 1: tag_id % 4 = 1
    Shard 2: tag_id % 4 = 2
    Shard 3: tag_id % 4 = 3
```

### Global CDN ve Kenar Hesaplama

```
CloudFront + Lambda@Edge:
  - İstek lokasyonuna göre dinamik içerik kişiselleştirme
  - Trend verisi: her bölge kendi yerel trendini gösterir
  - Dil tespiti ve yönlendirme

Edge cache stratejisi:
  Trend etiketler: Her 15 dk CloudFront cache invalidation
  Kullanıcı avatarları: 30 gün cache, versiyonlama
```

### Mikro-Servis Olgunluğu

```
Faz 3'te ayrışan servisler:
  dream-service      → Rüya CRUD (yüksek yazma)
  feed-service       → Akış ve trend (yüksek okuma)
  match-service      → NLP eşleştirme (hesaplama yoğun)
  notification-service → Push bildirimler (yüksek fan-out)
  auth-service       → Kimlik (güvenlik izolasyonu)
  search-service     → ElasticSearch (Faz 3'te pgvector yerine)
  ad-service         → Reklam sistemi (V3, bağımsız)

Servisler arası iletişim:
  Senkron: gRPC (HTTP/JSON'dan 5-7x daha hızlı)
  Asenkron: Amazon SQS + SNS (Bull Queue yerine, managed)
```

### ElasticSearch Geçişi (Faz 3)

```
Neden: 10M+ rüya için pgvector HNSW index yavaşlar
       Full-text search Türkçe analyzer gerektirir
       Faceted search (kategori + etiket + lokasyon filtresi)

Geçiş planı:
  1. Çift yazma: PostgreSQL + ElasticSearch (sync)
  2. Okuma trafiği ElasticSearch'e yönlendir
  3. ElasticSearch sağlıklıysa PostgreSQL search index'leri kaldır
```

---

## 7. Veritabanı Performans Stratejisi

### Connection Pool Yönetimi

```
MVP:   TypeORM pool (max: 10 connection / task) → PgBouncer yok
Faz 1: PgBouncer transaction mode (pool size: 20)
Faz 2: PgBouncer pool: 50, max_client_conn: 500
Faz 3: PgBouncer cluster (3 instance), pgpool-II

Formül: max_pool = (vCPU_count * 2) + storage_spindle_count
RDS r6g.2xlarge (8 vCPU) → max_pool = 17
```

### Sorgu Optimizasyonu

```
1. EXPLAIN ANALYZE zorunluluğu
   → 100ms'den uzun sorgu → optimize et veya cache ekle

2. N+1 sorgu yasağı
   → ORM relation'larında Eager/Lazy loading bilinçli seçilir
   → Dataloader pattern (toplu sorgu)

3. Pagination
   → OFFSET yerine cursor-based (büyük tablo performansı)
   → Cursor: created_at + id bileşik (duplicate timestamp riski)

4. Index maintenance
   → Haftalık: VACUUM ANALYZE
   → Aylık: REINDEX CONCURRENTLY (bloklama yapmadan)
```

---

## 8. NLP Eşleştirme Ölçekleme

### Embedding Stratejisi Evrimi

| Faz   | Model                           | Vektör Boyutu | Hız   | Doğruluk  |
| ----- | ------------------------------- | ------------- | ----- | --------- |
| MVP   | all-MiniLM-L6-v2 (local)        | 384           | 50ms  | İyi       |
| Faz 1 | all-mpnet-base-v2 (local)       | 768           | 150ms | Daha iyi  |
| Faz 2 | OpenAI text-embedding-3-small   | 1536          | API   | Yüksek    |
| Faz 3 | Fine-tuned model (dream verisi) | 1024          | GPU   | En yüksek |

### Vektör Arama Evrimi

```
MVP (0-100K rüya):
  pgvector HNSW → ef_search=40 → ~5ms

Faz 2 (100K-1M rüya):
  pgvector HNSW → ef_search=100, m=32 → ~20ms
  Yaklaşık komşu araması yeterli (exact match gerekmez)

Faz 3 (1M-10M rüya):
  Pinecone veya Weaviate → Gerçek vektör veritabanı
  pgvector'dan Pinecone'a migrasyon: çift yazma → switch
```

---

## 9. Maliyet Optimizasyonu

### Spot Instance Kullanımı

```
NLP Batch İşleme (gece yarısı):
  On-Demand → Spot Instance (EC2 g4dn.xlarge)
  Maliyet: $0.73/saat → $0.22/saat (%70 tasarruf)
  Interrupt handling: checkpointing ile devam eder
```

### Veri Yaşam Döngüsü

```
S3 Intelligent Tiering (V2, ses/video için):
  0-30 gün:   S3 Standard ($0.023/GB)
  31-90 gün:  S3 Standard-IA ($0.0125/GB)
  91-365 gün: S3 Glacier Instant ($0.004/GB)
  1+ yıl:     S3 Glacier Deep Archive ($0.00099/GB)

PostgreSQL veri arşivleme:
  1 yıldan eski rüyalar → cold storage partition
  3 yıldan eski silinmiş hesapların verileri → tam silme
```

---

## 10. Performans Hedefleri (SLA)

| Metrik                 | MVP        | Faz 1  | Faz 2  | Faz 3   |
| ---------------------- | ---------- | ------ | ------ | ------- |
| API Yanıt Süresi (P95) | 500ms      | 300ms  | 200ms  | 150ms   |
| Feed Yükleme (P95)     | 1s         | 500ms  | 300ms  | 200ms   |
| NLP Eşleştirme         | 5s (async) | 3s     | 2s     | 1s      |
| Uptime                 | %99.5      | %99.7  | %99.9  | %99.95  |
| Hata Oranı             | < %1       | < %0.5 | < %0.1 | < %0.05 |
| Push Bildirim Teslim   | 30s        | 15s    | 10s    | 5s      |

---

## 11. Yük Testi Planı (Her Faz Öncesi)

```bash
# Araç: k6 (JavaScript tabanlı yük testi)

Senaryo 1: Normal Yük
  - 1000 sanal kullanıcı, 10 dk
  - Mix: %40 feed, %30 rüya kaydet, %20 arama, %10 sosyal

Senaryo 2: Pik Yük (sabah 7-9 — kullanıcılar uyandı)
  - 5000 sanal kullanıcı, 30 dk
  - %70 rüya kaydet (sabah rush), %30 feed

Senaryo 3: Viral Event (trending rüya)
  - 10000 sanal kullanıcı, 15 dk
  - %80 feed + arama, %20 sosyal etkileşim

Başarı Kriteri:
  - P95 < hedef değer
  - Hata oranı < %1
  - Veritabanı bağlantı havuzu tükenmemesi
```

---

_Bu doküman SCALABILITY_PLAN.md olup kapasite planlaması ve ölçekleme kararlarını kapsar. Her faz geçişi öncesinde yük testi sonuçlarıyla doğrulanmalıdır._
