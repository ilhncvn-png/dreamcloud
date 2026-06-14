# User Journey Maps

## DreamCloud — Kullanıcı Yolculukları

**Versiyon:** 1.0  
**Tarih:** 2026-06-14

---

## Kapsam

Bu belgede DreamCloud'un temel kullanım senaryoları için kullanıcı yolculukları haritalanmıştır. Her yolculuk; adımlar, kullanıcı duyguları, temas noktaları, sorunlar ve fırsatlar içermektedir.

---

## Yolculuk 1 — İlk Keşif ve Kayıt

**Persona:** Zeynep (24, Grafik Tasarım Öğrencisi)  
**Senaryo:** DreamCloud'u ilk kez duyuyor ve platforma katılıyor  
**Kanal:** Instagram hikayesinde bir arkadaşının paylaşımı

---

### Aşamalar

```
[ Farkındalık ] → [ İndirme ] → [ Kayıt ] → [ Onboarding ] → [ İlk Keşif ]
```

#### Aşama 1: Farkındalık

| Unsur             | Detay                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Tetikleyici**   | Bir arkadaşı Instagram'da "bugünkü rüyam" paylaşımı yapıyor, DreamCloud'dan bahsediyor |
| **Düşünce**       | "Bu çok ilginç, rüyaları paylaşan bir platform mı var?"                                |
| **Duygu**         | Merak, hafif şüphe                                                                     |
| **Eylem**         | App Store'da DreamCloud'u aratıyor                                                     |
| **Temas Noktası** | App Store listesi, ekran görüntüleri, yorumlar                                         |
| **Sorun**         | App Store açıklaması soyut kalırsa indirme gerçekleşmez                                |
| **Fırsat**        | "Bugün 12.000 rüya paylaşıldı" gibi sosyal kanıt ana görselde yer almalı               |

#### Aşama 2: İndirme ve Açılış

| Unsur             | Detay                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **Eylem**         | Uygulamayı indiriyor, açıyor                                                             |
| **Duygu**         | Heyecan, değerlendirme                                                                   |
| **Temas Noktası** | Splash screen, karşılama ekranı                                                          |
| **Sorun**         | İlk ekran kavramı açıklamazsa hemen terk edebilir                                        |
| **Fırsat**        | Açılış ekranında kısa ama güçlü bir değer önermesi: _"Dünya uyurken sen ne görüyorsun?"_ |

#### Aşama 3: Kayıt

| Unsur             | Detay                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Eylem**         | Google ile hızlı kayıt seçiyor                                         |
| **Düşünce**       | "Adım, soyad mı istiyor? Rüyalarımı görecekler mi?"                    |
| **Duygu**         | Tereddüt (gizlilik endişesi)                                           |
| **Temas Noktası** | Kayıt formu, gizlilik bildirimi                                        |
| **Sorun**         | Çok fazla zorunlu alan gizlilik endişesini tetikler                    |
| **Fırsat**        | Minimum bilgi (takma ad + e-posta); gizlilik güvencesi görünür biçimde |

#### Aşama 4: Onboarding

| Unsur             | Detay                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Eylem**         | 3–4 ekranlık kılavuzu geçiyor                                                                                       |
| **Düşünce**       | "Sabah bildirimi isteyip istemediğimi soruyor, mantıklı"                                                            |
| **Duygu**         | İlgi, platforma güven artıyor                                                                                       |
| **Temas Noktası** | Onboarding slaytları, bildirim izin isteği, sabah alarm saati seçimi                                                |
| **Sorun**         | Bildirim izni çok erken istenirse reddedilebilir                                                                    |
| **Fırsat**        | Sabah alarm saati seçimi onboarding sırasında yaptırılmalı; "Rüyanı hatırlamadan uyanma" mesajıyla bağlam verilmeli |

#### Aşama 5: İlk Keşif

| Unsur             | Detay                                                                |
| ----------------- | -------------------------------------------------------------------- |
| **Eylem**         | Ana sayfayı açıyor; diğer kullanıcıların rüyalarını okuyor           |
| **Düşünce**       | "Bunu ben de görmüştüm! Dünyada bu kadar kişi aynı şeyi görüyor mu?" |
| **Duygu**         | Aidiyet hissi, sürpriz, merak artışı                                 |
| **Temas Noktası** | Keşfet akışı, trend etiketler                                        |
| **Sonuç**         | İlk rüyasını girmek istiyor (Yolculuk 2'ye geçiş)                    |

**Kritik An (Moment of Truth):** Keşfet sayfasında okuduğu ilk rüya "beni anlatan" hissini vermeli. Bu an olmadan kullanıcı aktif olmaz.

---

## Yolculuk 2 — Sabah Rutini: İlk Rüya Girişi

**Persona:** Zeynep (24) / Ahmet (35)  
**Senaryo:** Kullanıcı sabah uyandığında rüyasını kaydediyor  
**Zaman:** Sabah 07:15

---

### Akış

```
[ Uyandı ] → [ Bildirim ] → [ Uygulama ] → [ Giriş ] → [ Etiketleme ] → [ Paylaşım ]
```

#### Kritik Zaman Kısıtı

Uyanmadan sonraki 5–10 dakika içinde rüyalar büyük ölçüde silinir. Tüm giriş akışı **bu pencereye** göre tasarlanmalıdır.

| Adım | Eylem                      | Süre Hedefi | Sorun                                                      | Fırsat                                                        |
| ---- | -------------------------- | ----------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| 1    | Telefona ulaşma            | —           | —                                                          | —                                                             |
| 2    | Bildirimi görme ve tıklama | 5 sn        | Bildirim metni yeterince çekici değilse kaydırılıp geçilir | "Bu sabah dünya 3.241 rüya gördü" tarzı dinamik bildirim      |
| 3    | Uygulamanın açılması       | < 2 sn      | Yavaş açılış rüyayı unutturuyor                            | Doğrudan rüya giriş ekranına yönlendirme                      |
| 4    | Metin alanına yazma        | 60–120 sn   | Klavye geçişi, büyük harf düzeltmeleri dikkat dağıtıyor    | Sade, tam ekran metin editörü; otomatik küçük harf modu       |
| 5    | Kategori seçimi            | 5 sn        | Çok seçenek → karar yorgunluğu                             | Tek satır: 4 emoji/ikon (Lucid / Güzel / Kabus / Belirsiz)    |
| 6    | Etiket ekleme              | 10–30 sn    | Etiket yazmak zaman alıyor                                 | Önerilen etiketler otomatik sunulmalı (NLP önerisi)           |
| 7    | Görünürlük seçimi          | 3 sn        | Karmaşık seçenekler tereddüt yaratır                       | Varsayılan: "Sadece Takipçilerim"; tek tıkla değiştirilebilir |
| 8    | Kaydet / Paylaş            | 2 sn        | —                                                          | Kaydedilince hemen benzer rüyalar gösterilmeli                |

**Toplam Hedef Süre: < 3 dakika (metin dahil)**

#### Duygu Eğrisi

```
Uyandı     Bildirim    Yazıyor    Etiketliyor  Paylaşıyor  Benzerler
   |           |           |           |            |           |
😴 Uykulu → 😐 Farkında → ✍️ Odaklı → 🤔 Düşünüyor → 😊 Tamamladı → 🤩 Keşfetti
```

**Kritik An:** Kaydet butonuna bastıktan sonra "Bugün İstanbul'da 4 kişi daha Eyfel Kulesi rüyası gördü" gibi anlık eşleşme bildirimi kullanıcıyı platforma bağlar.

---

## Yolculuk 3 — Benzer Rüyaları Keşfetme

**Persona:** Zeynep (24)  
**Senaryo:** Rüyasını kaydettikten sonra benzer rüyaları araştırıyor  
**Tetikleyici:** Rüya kaydedildiğinde sistem eşleşme bildirimi gönderiyor

---

### Akış

```
[ Eşleşme Bildirimi ] → [ Benzer Rüyalar ] → [ Okuma ] → [ Etkileşim ] → [ Bağlantı ]
```

| Adım | Kullanıcı Eylemi                | Platform Tepkisi                       | Duygu                     | Fırsat                                       |
| ---- | ------------------------------- | -------------------------------------- | ------------------------- | -------------------------------------------- |
| 1    | Eşleşme bildirimini alıyor      | "Rüyanla benzer 7 rüya bulundu"        | Merak                     | Bildirimde rüya özetini göster               |
| 2    | Benzer rüyalar sayfasını açıyor | Eşleşen rüyalar liste/kart görünümünde | Heyecan                   | Eşleşme yüzdesi göster: "89% benzer"         |
| 3    | Bir rüyayı açıp okuyor          | Tam metin + kullanıcı profili          | "Ben de tam bunu gördüm!" | Paylaşılan etiketleri vurgula                |
| 4    | Beğeni / yorum bırakıyor        | Bildirim sahip kullanıcıya gönderilir  | Bağlılık hissi            | "Siz de aynı rüyayı gördünüz" bağlam etiketi |
| 5    | Kullanıcı profiline gidiyor     | Profil + rüya geçmişi                  | Merak artışı              | Ortak rüya sayısını öne çıkar                |
| 6    | Takip ediyor                    | Takip onayı                            | Aidiyet                   | "3 ortak rüyanız var" mesajı                 |

**Kritik An:** Bir yabancının rüyasını okuyup "ben de tam bunu görmüştüm" demek, platformun yaratabileceği en güçlü bağlantı anıdır. Tasarım bu anı maksimize etmelidir.

---

## Yolculuk 4 — Rüya Yorumlama

**Persona:** Fatma (42, Öğretmen)  
**Senaryo:** Görmekte olduğu yılan rüyasının anlamını araştırıyor  
**Tetikleyici:** Sabah namazından sonra gördüğü rüyayı düşünüyor

---

### Akış

```
[ Rüya Girişi ] → [ Yorum Talep Et ] → [ Rüya Kitabı ] → [ Topluluk Yorumları ] → [ Uzman Yorum ]
```

| Adım | Eylem                                                 | Duygu                     | Sorun                               | Fırsat                                             |
| ---- | ----------------------------------------------------- | ------------------------- | ----------------------------------- | -------------------------------------------------- |
| 1    | Yılan rüyasını giriyor, "Yorum İste" butonuna basıyor | Beklenti                  | Buton nerede?                       | Rüya giriş ekranında belirgin yorum talep seçeneği |
| 2    | Rüya kitabında "yılan" arıyor                         | Merak                     | Sonuçlar çok genel                  | Kültürel filtre: Türk/İslami yorum ayrı kategori   |
| 3    | Topluluk yorumlarını okuyor                           | İlgi                      | Saçma yorumlar güvensizlik yaratır  | Kaliteli yorumlar için oylamalı (upvote) sistem    |
| 4    | Uzman yorumcunun cevabını bekliyor                    | Sabır                     | Uzun bekleme süresi hayal kırıklığı | 48 saat içinde cevap garantisi (V2)                |
| 5    | Yorumu okuyor, kaydediyor                             | Tatmin / daha fazla merak | —                                   | "Benzer yılan rüyası gören 240 kişi" linki         |

---

## Yolculuk 5 — Marka Kullanıcısı (B2B)

**Persona:** Selin (38, Pazarlama Direktörü)  
**Senaryo:** Markasının rüya verilerini analiz edecek reklam panelini kuruyor  
**Platform:** Web tabanlı Marka Paneli (V3)

---

### Akış

```
[ Keşif ] → [ Demo Talebi ] → [ Panel Erişimi ] → [ Kampanya Oluşturma ] → [ Analiz ]
```

| Adım | Eylem                                                      | Beklenti                                              | Sorun                             | Fırsat                                                  |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| 1    | DreamCloud marka sayfasını ziyaret ediyor                  | Veriye bakıyor: "Kaç kişi markamızı rüyasında gördü?" | Veri yok / kısıtlı                | Anonim benchmark verisi ücretsiz sunulabilir            |
| 2    | Demo talep ediyor                                          | Hızlı yanıt                                           | Satış süreci uzarsa ilgi kaybı    | 24 saat içinde canlı demo                               |
| 3    | Panel'e erişim açılıyor                                    | İçgörü paneli net ve sade                             | Karmaşık arayüz                   | Önceden doldurulmuş örnek kampanya                      |
| 4    | "Kola içeceği" anahtar kelimesiyle hedef kitle oluşturuyor | Tam isabet hedefleme                                  | GDPR uyumu belirsizliği           | Anonim kohort bazlı hedefleme — kişisel veri aktarılmaz |
| 5    | Kampanya yayınlanıyor; 3 gün sonra raporları görüyor       | ROI görmek istiyor                                    | Metriklerin açıklanması gerekiyor | Impression, CTR, Rüya-Marka Eşleşme Skoru özel metrik   |

---

## Duygusal Yolculuk Özeti

```
         YOLCULUK 1         YOLCULUK 2         YOLCULUK 3
Duygu      (Keşif)          (İlk Giriş)        (Eşleşme)

😍 Coşku  ─────────────────────────────────────── ●
😊 Mutlu  ────────────────────── ● ────────────────
😐 Nötr   ── ● ─────────────────────────────────────
😟 Endişe    │ ────── ●
😤 Hayal     │        │
   kırıklığı │        │
             │        └─ Kayıt ekranında gizlilik endişesi
             └─ App Store açıklaması yeterince güçlü değilse
```

---

## Kritik Tasarım Gereksinimleri (Journey'den Çıkan)

1. **Hız:** Rüya girişi 3 dakikadan uzun olmamalı. Her ekstra tıklama rüyayı unutturma riski taşır.
2. **Bildirim Stratejisi:** Sabah bildirimi platformun en kritik temas noktası; kişiselleştirilmiş, dinamik metin zorunlu.
3. **İlk Eşleşme Anı:** Kullanıcı ilk rüyasını kaydettiğinde hemen eşleşme görmeli; "boş platform" hissi ölüm öpücüğüdür.
4. **Gizlilik Güvencesi:** Her adımda görünür gizlilik kontrolü; kullanıcı her zaman "rüyam kimin görüyor?" sorusuna cevap bulabilmeli.
5. **Kültürel Hassasiyet:** Rüya yorumlama alanında kültürel/dini filtreler sunulmadan Türk pazarında geniş kitlelere ulaşılamaz.

---

_Bu doküman USER_JOURNEY.md olup teknik uygulama detayları içermez. Wireframe ve prototip çalışmalarında referans alınmalıdır._
