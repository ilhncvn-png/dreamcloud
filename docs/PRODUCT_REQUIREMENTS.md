# Product Requirements Document (PRD)

## DreamCloud — Rüya Sosyal Medyası

**Versiyon:** 1.0  
**Tarih:** 2026-06-14  
**Durum:** Taslak — Geliştirme Öncesi

---

## 1. Yönetici Özeti

DreamCloud, kullanıcıların uyku sırasında gördükleri rüyaları metin, ses ve görüntü olarak kaydedip paylaşabildikleri; dünya genelinde benzer rüyaların gerçek zamanlı olarak eşleştirildiği ve bu içerik verisinden hem kullanıcılara hem de markalara değer üretilen bir sosyal medya platformudur.

Mevcut sosyal medya platformlarından temel farkı: içerik bilinçli ve kurgulanmış değildir. Rüya verisi insanın en filtresiz, en savunmasız anından doğar; bu durum hem platformun özgünlüğünü hem de reklam verisinin değerini belirler.

**Hedef:** iOS ve Android için 1 yıl içinde MVP'yi yayına almak.

---

## 2. Problem Tanımı

### 2.1 Kullanıcı Tarafındaki Problem

- Mevcut sosyal medya platformlarındaki içerikler artan oranlarda kurgulanmış, sahte ve yorucu hale gelmektedir.
- Kullanıcılar gerçek duygusal deneyimlerini paylaşabilecekleri, yargılanmadan bağlantı kurabilecekleri bir mecra bulamamaktadır.
- Rüyalar günlük hayatı doğrudan etkileyen (yaratıcılık, stres, sağlık) önemli deneyimlerdir; ancak bunları kaydetmek ve anlamlandırmak için tasarlanmış bir sosyal platform mevcut değildir.

### 2.2 Marka / B2B Tarafındaki Problem

- Markalar mevcut sosyal medyada bilinçli olarak üretilmiş içeriklere reklam vererek "kurgulanmış ilgi" satın almaktadır.
- Bir markanın gerçekten ne kadar sevildiğini ya da bilinçaltında ne ölçüde yer edindiğini gösteren veri yoktur.
- Rüyadaki marka tespiti, dünyanın en güçlü marka bilinirlik göstergelerinden biridir; bu veri şu anda hiçbir platformda üretilmemektedir.

### 2.3 Pazar Boşluğu

| Platform       | İçerik Türü          | Temel Metrik              | Zayıf Nokta                 |
| -------------- | -------------------- | ------------------------- | --------------------------- |
| Instagram      | Görsel / Kurgulanmış | Estetik takip             | İçerik kirliliği            |
| Twitter/X      | Metin / Haber        | Anlık gündem              | Sosyal medya özelliği zayıf |
| TikTok         | Video / Eğlence      | Kısa dikkat süresi        | Uzun vadeli bağlılık yok    |
| Facebook       | Karma / Yaşlanmış    | Aile/topluluk             | Genç kitleyi kaybediyor     |
| **DreamCloud** | **Rüya / Özgün**     | **Bilinçaltı bağlantısı** | _(Rakip yok)_               |

---

## 3. Ürün Hedefleri

### 3.1 Birincil Hedefler

1. Kullanıcıların rüyalarını kolayca kaydedebildiği ve paylaşabildiği bir platform oluşturmak
2. Dünya genelinde benzer rüyaları gerçek zamanlı olarak eşleştirmek
3. İlk 12 ayda aktif rüya kaydeden kullanıcı tabanı oluşturmak

### 3.2 İkincil Hedefler

1. Rüya verisi üzerinden marka odaklı reklam ekosistemi kurmak
2. Kullanıcıların rüya günlükleri aracılığıyla öz-farkındalığını artırmak
3. Platforma özgü içerik döngüsü (kullanıcı rüya girer → eşleşir → keşfeder → tekrar girer) oluşturmak

### 3.3 Başarı Metrikleri (OKR)

| Metrik                                      | MVP Hedefi (6 Ay) | Yıl 1 Hedefi |
| ------------------------------------------- | ----------------- | ------------ |
| Kayıtlı Kullanıcı                           | 50,000            | 500,000      |
| Günlük Aktif Kullanıcı (DAU)                | 10,000            | 150,000      |
| Kullanıcı Başına Haftalık Rüya Girişi       | 2+                | 3+           |
| Eşleşme Oranı (girilen rüyaların eşleşme %) | %15               | %40          |
| Uygulama Mağazası Puanı                     | 4.0+              | 4.3+         |
| Reklam Veren Marka Sayısı                   | —                 | 20+          |
| Aylık Reklam Geliri                         | —                 | $50,000+     |

---

## 4. Kapsam

### 4.1 MVP Kapsamında (V1.0)

- Kullanıcı kaydı ve profil oluşturma
- Metin tabanlı rüya girişi
- Rüya etiketleme (yer, nesne, kişi, duygu, kategori)
- Rüya kategorisi seçimi: Lucid / Güzel / Kabus / Normal
- Kişisel rüya günlüğü (gizli veya herkese açık)
- Global rüya akışı (keşfet sayfası)
- Benzer rüyaları görme (etiket bazlı eşleştirme)
- Temel sosyal etkileşim: beğeni, yorum, kaydetme
- Diğer platformlarla paylaşım (Instagram, Twitter)
- iOS ve Android uygulamaları

### 4.2 MVP Dışında (Sonraki Versiyonlar)

- Sesli rüya girişi (V2)
- Videolu rüya girişi (V2)
- Rüya yorumcuları entegrasyonu (V2)
- Profil bazlı rüya karşılaştırma (V2)
- Rüya kitabı / anlam veritabanı (V2)
- Akıllı saat REM entegrasyonu (V3)
- Marka reklam paneli (V3)
- Akıllı TV desteği (V3+)
- Otomatik rüya kaydı / nanoteknoloji (Uzak vizyon)

### 4.3 Kapsam Dışı (Hiçbir Versiyonda Değil)

- Kullanıcı verilerinin izinsiz üçüncü taraflarla paylaşımı
- İK değerlendirme aracı olarak kullanım _(hukuki/etik risk; strateji belgesiyle netleştirilmeli)_

---

## 5. Fonksiyonel Gereksinimler

### FR-01: Kimlik Doğrulama ve Profil

| ID      | Gereksinim                                                                        | Öncelik |
| ------- | --------------------------------------------------------------------------------- | ------- |
| FR-01.1 | Kullanıcı e-posta, Google ve Apple hesabıyla kayıt olabilmelidir                  | P0      |
| FR-01.2 | Kullanıcı profilinde takma ad, avatar ve kısa biyografi bulunmalıdır              | P0      |
| FR-01.3 | Kullanıcı profilini gizli veya herkese açık yapabilmelidir                        | P0      |
| FR-01.4 | Kullanıcı hesabını silebilmeli; silindiğinde tüm rüya verileri de kaldırılmalıdır | P0      |

### FR-02: Rüya Girişi

| ID      | Gereksinim                                                                    | Öncelik |
| ------- | ----------------------------------------------------------------------------- | ------- |
| FR-02.1 | Kullanıcı metin olarak rüya girebilmelidir (maks. 2000 karakter)              | P0      |
| FR-02.2 | Rüya girişine başlık eklenebilmelidir                                         | P0      |
| FR-02.3 | Rüya tarihi ve saati otomatik kaydedilmeli, kullanıcı düzenleyebilmelidir     | P0      |
| FR-02.4 | Rüya kategorisi seçilebilmelidir: Lucid / Güzel / Kabus / Belirsiz            | P0      |
| FR-02.5 | Rüyaya özgür etiket eklenebilmelidir (yer, kişi, nesne, duygu)                | P0      |
| FR-02.6 | Rüyanın görünürlüğü seçilebilmelidir: Özel / Sadece Takipçiler / Herkese Açık | P0      |
| FR-02.7 | Kaydedilen rüya düzenlenebilmeli ve silinebilmelidir                          | P0      |
| FR-02.8 | Kullanıcı sesli not kaydedebilmeli (V2)                                       | P1      |
| FR-02.9 | Kullanıcı rüyasını video olarak ekleyebilmeli (V2)                            | P1      |

### FR-03: Rüya Günlüğü

| ID      | Gereksinim                                                                          | Öncelik |
| ------- | ----------------------------------------------------------------------------------- | ------- |
| FR-03.1 | Kullanıcı kendi rüyalarını kronolojik olarak görebilmelidir                         | P0      |
| FR-03.2 | Kullanıcı geçmiş rüyalarını kategoriye, etikete ve tarihe göre filtreleyebilmelidir | P0      |
| FR-03.3 | Tekrar eden rüyalar sistem tarafından tespit edilip etiketlenmelidir (V2)           | P1      |
| FR-03.4 | Rüya istatistikleri (en çok görülen yer, kişi, duygu) kullanıcıya sunulmalıdır (V2) | P1      |

### FR-04: Keşif ve Eşleştirme

| ID      | Gereksinim                                                                                 | Öncelik |
| ------- | ------------------------------------------------------------------------------------------ | ------- |
| FR-04.1 | Kullanıcı global rüya akışında diğer kullanıcıların açık rüyalarını görebilmelidir         | P0      |
| FR-04.2 | Sistem, girilen rüyayla benzer içerikteki rüyaları kullanıcıya önermelidir                 | P0      |
| FR-04.3 | Kullanıcı etiket bazlı arama yapabilmelidir                                                | P0      |
| FR-04.4 | Trend rüya etiketleri / konuları ana sayfada gösterilmelidir                               | P0      |
| FR-04.5 | Kullanıcı lokasyon bazlı rüyaları keşfedebilmelidir (aynı şehri / yeri rüyasında görenler) | P1      |
| FR-04.6 | İki profil arasında rüya benzerliği karşılaştırma yapılabilmelidir (V2)                    | P1      |

### FR-05: Sosyal Etkileşim

| ID      | Gereksinim                                                              | Öncelik |
| ------- | ----------------------------------------------------------------------- | ------- |
| FR-05.1 | Kullanıcı başka bir kullanıcının rüyasını beğenebilmelidir              | P0      |
| FR-05.2 | Kullanıcı rüyalara yorum yapabilmelidir                                 | P0      |
| FR-05.3 | Kullanıcı rüyaları kaydetme listesine ekleyebilmelidir                  | P0      |
| FR-05.4 | Kullanıcı diğer kullanıcıları takip edebilmeli / engelliyebilmelidir    | P0      |
| FR-05.5 | Kullanıcı rüyasını diğer sosyal medya platformlarında paylaşabilmelidir | P0      |
| FR-05.6 | Kullanıcı uygunsuz içeriği raporlayabilmelidir                          | P0      |

### FR-06: Bildirimler

| ID      | Gereksinim                                                                    | Öncelik |
| ------- | ----------------------------------------------------------------------------- | ------- |
| FR-06.1 | Sabah bildirimi: Kullanıcının belirlediği saatte "Rüyanı kaydet" hatırlatması | P0      |
| FR-06.2 | Sosyal bildirimler: beğeni, yorum, takipçi, eşleşme                           | P0      |
| FR-06.3 | REM uyku tespiti bildirimi (akıllı saat ile) (V3)                             | P2      |

### FR-07: İçerik Moderasyonu

| ID      | Gereksinim                                                                 | Öncelik |
| ------- | -------------------------------------------------------------------------- | ------- |
| FR-07.1 | Otomatik içerik tarama: açık cinsel içerik, nefret söylemi, şiddet tespiti | P0      |
| FR-07.2 | Kullanıcı raporu sonrası 24 saat içinde insan moderatör incelemesi         | P0      |
| FR-07.3 | İhlal durumunda içerik kaldırma ve kullanıcı uyarı sistemi                 | P0      |

---

## 6. Fonksiyonel Olmayan Gereksinimler

### Performans

- Uygulama açılış süresi: < 2 saniye (soğuk başlangıç)
- Rüya kaydetme süresi: < 1 saniye
- Eşleştirme sonucu gösterimi: < 3 saniye

### Güvenilirlik

- Sistem erişilebilirliği: %99.5 uptime
- Veri kaybı: Rüya girişleri taslak olarak otomatik kaydedilmeli (auto-save her 10 saniyede)

### Güvenlik ve Gizlilik

- Tüm veriler TLS 1.3 ile şifrelenmiş iletilmeli
- Kullanıcı rüya verileri sunucu tarafında AES-256 ile şifreli saklanmalı
- GDPR, KVKK ve CCPA uyumlu veri işleme
- Kullanıcı verisi üçüncü taraflarla yalnızca açık rıza ile paylaşılabilir
- Kullanıcı "verimi sil" talebi 30 gün içinde yerine getirilmeli

### Erişilebilirlik

- WCAG 2.1 AA standardına uyum
- iOS ve Android erişilebilirlik API desteği

### Lokalizasyon

- V1: Türkçe ve İngilizce
- V2: Arapça, Almanca, Fransızca, İspanyolca, Portekizce

---

## 7. Kısıtlar ve Varsayımlar

### Kısıtlar

- Yazılım geliştirme süresi 1 yıl (belge hedefi)
- V1 yalnızca iOS ve Android; web uygulaması kapsam dışı
- Rüya içeriklerinin gerçekliği sistem tarafından doğrulanamaz

### Varsayımlar

- Kullanıcılar sabah uyandıklarında en az birkaç dakika rüyalarını hatırlar
- Yeterli kullanıcı kitlesi oluşmadan eşleştirme özelliği anlamlı sonuç vermez; kritik kitle ~10.000 aktif kullanıcı olarak varsayılmıştır
- Marka reklam sistemi V3'te devreye alınacak; V1-V2 gelir yatırım finansmanıyla karşılanacak

---

## 8. Bağımlılıklar

| Bağımlılık                | Açıklama                                               | Risk                            |
| ------------------------- | ------------------------------------------------------ | ------------------------------- |
| NLP/Eşleştirme Motoru     | Rüya içeriklerinin semantik olarak eşleştirilmesi için | Yüksek — teknik karar kritik    |
| Push Notification Servisi | Sabah hatırlatma bildirimleri için                     | Düşük                           |
| Sosyal Platform API'leri  | Instagram, Twitter paylaşım entegrasyonu için          | Orta — API değişiklikleri riski |
| Akıllı Saat SDK'ları      | Apple Watch, Wear OS (V3)                              | Orta                            |
| İçerik Moderasyon API     | Otomatik içerik tarama için                            | Düşük                           |

---

_Bu doküman PRODUCT_REQUIREMENTS.md olup teknik mimari kararlar içermez. Geliştirme başlamadan önce tüm P0 gereksinimler paydaşlarla onaylanmalıdır._
