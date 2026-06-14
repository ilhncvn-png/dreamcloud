# Feature Specifications

## DreamCloud — Özellik Spesifikasyonları

**Versiyon:** 1.0  
**Tarih:** 2026-06-14

---

## Öncelik Sınıflandırması

| Seviye | Tanım                                    | Versiyon     |
| ------ | ---------------------------------------- | ------------ |
| **P0** | MVP için zorunlu; olmadan ürün çalışmaz  | V1.0         |
| **P1** | Önemli; V1'den kısa süre sonra eklenmeli | V1.5 veya V2 |
| **P2** | Değerli; büyüme fazında eklenecek        | V2+ veya V3  |

---

## MODÜL 1: Kimlik Doğrulama ve Profil

### FEAT-001 — Kullanıcı Kaydı

**Öncelik:** P0 | **Modül:** Auth

**Açıklama:**  
Kullanıcı uygulamaya e-posta, Google veya Apple hesabıyla kayıt olabilir. Kayıt sonrası zorunlu alan sayısı minimum tutulur.

**Kullanıcı Hikayeleri:**

- Kullanıcı olarak Google hesabımla tek tıkla kayıt olmak istiyorum; form doldurmak istemiyorum.
- Kullanıcı olarak takma adımı kendim belirleyebilmek istiyorum; gerçek adım görünmesin.
- Kullanıcı olarak kayıt esnasında hangi verimin saklandığını görmek istiyorum.

**Kabul Kriterleri:**

- [ ] E-posta + şifre ile kayıt çalışmalı
- [ ] Google OAuth entegrasyonu çalışmalı
- [ ] Apple Sign In entegrasyonu çalışmalı
- [ ] Kayıt için zorunlu alan: yalnızca takma ad + e-posta (veya OAuth)
- [ ] Takma ad benzersizlik kontrolü gerçek zamanlı yapılmalı
- [ ] Kayıt ekranında gizlilik politikası linki görünür olmalı
- [ ] Doğrulama e-postası 60 saniye içinde iletilmeli
- [ ] Kayıt sonrası doğrudan onboarding akışına yönlendirme

**Kenar Durumlar:**

- Aynı e-posta ile tekrar kayıt → "Bu e-posta zaten kayıtlı" mesajı + giriş yönlendirmesi
- Takma ad özel karakter içeriyorsa → izin verilen karakterler kümesi tanımlı olmalı

---

### FEAT-002 — Kullanıcı Profili

**Öncelik:** P0 | **Modül:** Profil

**Açıklama:**  
Kullanıcı profilini düzenleyebilir, rüya geçmişini ve istatistiklerini görüntüleyebilir.

**Kullanıcı Hikayeleri:**

- Kullanıcı olarak profilimi herkese açık veya gizli yapabilmek istiyorum.
- Kullanıcı olarak kaç rüya kaydettiğimi, kaç eşleşme aldığımı görmek istiyorum.
- Kullanıcı olarak profil fotoğrafı yerine anonim bir avatar seçebilmek istiyorum.

**Kabul Kriterleri:**

- [ ] Profil alanları: takma ad, avatar (önceden tanımlı listeden seçim + kamera), kısa biyografi (maks. 150 karakter), konum (şehir bazında, opsiyonel)
- [ ] Profil görünürlüğü: Herkese Açık / Sadece Takipçiler / Gizli
- [ ] Profil istatistikleri: toplam rüya, eşleşme sayısı, takipçi/takip
- [ ] Kullanıcı kendi profilini önizleyebilmeli
- [ ] Hesap silme seçeneği profil ayarlarında yer almalı

---

### FEAT-003 — Onboarding Akışı

**Öncelik:** P0 | **Modül:** Onboarding

**Açıklama:**  
Yeni kullanıcıya platformu tanıtan, sabah bildirimi ayarlayan ve ilk rüya girişini teşvik eden 4 ekranlık akış.

**Kullanıcı Hikayeleri:**

- Yeni kullanıcı olarak uygulamanın amacını ilk 30 saniyede anlamak istiyorum.
- Kullanıcı olarak sabah rüyamı kaydedebilmek için hatırlatma zamanını kendim ayarlamak istiyorum.

**Kabul Kriterleri:**

- [ ] Ekran 1: "DreamCloud nedir?" — 1 cümle değer önermesi + görsel
- [ ] Ekran 2: "Nasıl çalışır?" — Rüya gir → Eşleş → Keşfet — 3 adım ikonu
- [ ] Ekran 3: Sabah hatırlatma saati seçimi (saat picker) + bildirim izni isteği
- [ ] Ekran 4: Rüya kategorileri tanıtımı (Lucid / Güzel / Kabus / Normal)
- [ ] Onboarding atlanabilmeli (skip), ancak sabah bildirimi ayarı onboarding sonrasında hatırlatılmalı
- [ ] Onboarding tamamlandıktan sonra direkt Keşfet sayfasına yönlendirme

---

## MODÜL 2: Rüya Girişi

### FEAT-010 — Metin Tabanlı Rüya Girişi

**Öncelik:** P0 | **Modül:** Rüya Girişi

**Açıklama:**  
Kullanıcının rüyasını metin olarak kaydettiği birincil giriş yöntemi. Hız ve sadelik öncelikli.

**Kullanıcı Hikayeleri:**

- Kullanıcı olarak sabah uyandığımda 3 dakika içinde rüyamı kaydedebilmek istiyorum.
- Kullanıcı olarak yazdıklarım otomatik kaydedilsin; telefon kapanınca kaybolmasın.
- Kullanıcı olarak rüyamı yazmayı yarıda bırakıp sonra devam edebilmek istiyorum.

**Kabul Kriterleri:**

- [ ] Tam ekran metin editörü; dikkat dağıtıcı UI elemanları gizli
- [ ] Başlık alanı (opsiyonel, maks. 80 karakter)
- [ ] İçerik alanı (maks. 2000 karakter; karakter sayacı görünür)
- [ ] Otomatik kayıt: her 10 saniyede bir taslak olarak kayıt
- [ ] Taslak listesi: kullanıcı yarım kalan rüyaları görebilmeli
- [ ] Klavye açıkken sayfa kaydırması sorunsuz çalışmalı
- [ ] "Rüyam yok" seçeneği: kullanıcı o gün rüya görmediğini işaretleyebilmeli (uyku kalitesi verisi için)

**Performans Kriteri:**  
Rüya girişi tamamlanıp kaydedildiğinde sunucu yanıtı ≤ 1 saniye.

---

### FEAT-011 — Rüya Kategorisi ve Etiketleme

**Öncelik:** P0 | **Modül:** Rüya Girişi

**Açıklama:**  
Rüyanın kategorize edilmesi ve arama/eşleştirme için etiketlenmesi.

**Kullanıcı Hikayeleri:**

- Kullanıcı olarak rüyamın lucid mı, güzel mi yoksa kabus mu olduğunu seçebilmek istiyorum.
- Kullanıcı olarak rüyamda gördüğüm yerleri ve kişileri etiketleyebilmek istiyorum.
- Kullanıcı olarak etiket önerisi istiyorum; her şeyi sıfırdan yazmak istemiyorum.

**Kabul Kriterleri:**

- [ ] Kategori seçimi: Lucid / Güzel / Kabus / Normal (tekli seçim, zorunlu)
- [ ] Etiket ekleme: özgür metin girişi + sistem önerileri
- [ ] Sistem etiket önerileri: rüya metni analiz edilerek otomatik öneriler sunulmalı (NLP)
- [ ] Etiket türleri: Yer (#paris, #istanbul), Nesne (#araba, #deniz), Kişi (#annem, #yabancı), Duygu (#korku, #huzur), Marka (#toyota) — sistem otomatik sınıflandırmalı
- [ ] Maksimum etiket: 10 adet
- [ ] Etiket silme: kayıt öncesi ve sonrası düzenlenebilir

---

### FEAT-012 — Rüya Görünürlük Ayarı

**Öncelik:** P0 | **Modül:** Rüya Girişi

**Açıklama:**  
Her rüya için bağımsız görünürlük ayarı.

**Kabul Kriterleri:**

- [ ] Görünürlük seçenekleri: Özel / Sadece Takipçilerim / Herkese Açık
- [ ] Varsayılan değer: Sadece Takipçilerim (güvenli taraf)
- [ ] Görünürlük kaydedildikten sonra değiştirilebilmeli
- [ ] Özel olarak kaydedilen rüyalar eşleştirme sistemine dahil edilmemeli
- [ ] Herkese açık rüyalar reklam etiketi veritabanına dahil edilebilir (kullanıcı onayıyla)

---

### FEAT-013 — Sesli Rüya Girişi

**Öncelik:** P1 | **Modül:** Rüya Girişi | **Versiyon:** V2

**Açıklama:**  
Kullanıcı rüyasını sesli not olarak kaydedebilir. Metin girişinin zor olduğu sabah anları için kritik.

**Kullanıcı Hikayeleri:**

- Kullanıcı olarak gözlerim açık olmadan, yatarken rüyamı sesle kaydedebilmek istiyorum.
- Kullanıcı olarak sesli kaydımın metne dönüştürülmesini (transkript) istiyorum.

**Kabul Kriterleri:**

- [ ] Tek tuş basılı tut ile ses kaydı (push-to-talk)
- [ ] Maksimum kayıt süresi: 5 dakika
- [ ] Kayıt sonrası otomatik transkripsiyon (Speech-to-Text)
- [ ] Transkripsiyon kullanıcı tarafından düzenlenebilmeli
- [ ] Ses dosyası ve transkript birlikte saklanmalı
- [ ] Offline kayıt desteklenmeli; internet olunca senkronize edilmeli

---

## MODÜL 3: Rüya Günlüğü

### FEAT-020 — Kişisel Rüya Arşivi

**Öncelik:** P0 | **Modül:** Günlük

**Açıklama:**  
Kullanıcının kendi rüyalarını kronolojik ve filtrelenmiş biçimde görüntülediği kişisel alan.

**Kabul Kriterleri:**

- [ ] Kronolojik liste görünümü (en yeni en üstte)
- [ ] Kart görünümünde başlık, tarih, kategori ikonu, ilk 100 karakter özet
- [ ] Filtreler: Kategori, Etiket, Tarih aralığı, Görünürlük durumu
- [ ] Arama: kendi rüyaları içinde tam metin arama
- [ ] Rüya silme (onay diyaloğu ile; silinmiş rüyalar 30 gün kurtarılabilir → sonra kalıcı silinir)

---

### FEAT-021 — Rüya İstatistikleri

**Öncelik:** P1 | **Modül:** Günlük | **Versiyon:** V1.5

**Açıklama:**  
Kullanıcının kendi rüya örüntülerini anlayabileceği kişisel istatistik ekranı.

**Kabul Kriterleri:**

- [ ] Haftalık / aylık / yıllık rüya sayısı grafiği
- [ ] En çok görülen etiketler (kelime bulutu)
- [ ] Kategori dağılımı: Lucid / Güzel / Kabus / Normal yüzdeleri
- [ ] Rüya görme frekansı (tutarlılık skoru)
- [ ] Eşleşme sayısı ve eşleşme oranı

---

### FEAT-022 — Tekrar Eden Rüyalar

**Öncelik:** P1 | **Modül:** Günlük | **Versiyon:** V2

**Açıklama:**  
Sistem kullanıcının geçmiş rüyalarını analiz ederek tekrar eden temaları ve içerikleri tespit eder.

**Kabul Kriterleri:**

- [ ] Aynı etiket kombinasyonu ≥ 3 kez görüldüğünde "tekrar eden rüya" bildirimi
- [ ] Tekrar eden rüyalar günlükte ayrı bir bölümde listelenmeli
- [ ] Tekrarlı içeriklere sahip rüyalar zaman çizgisinde görselleştirilmeli

---

## MODÜL 4: Keşif ve Eşleştirme

### FEAT-030 — Global Rüya Akışı (Keşfet)

**Öncelik:** P0 | **Modül:** Keşif

**Açıklama:**  
Platformdaki herkese açık rüyaların görüntülendiği ana keşif sayfası.

**Kullanıcı Hikayeleri:**

- Kullanıcı olarak sabah anasayfayı açtığımda diğer insanların bu gece ne gördüğünü merak ediyorum.
- Kullanıcı olarak beni ilgilendiren konulardaki rüyalara öncelik vermesini istiyorum.

**Kabul Kriterleri:**

- [ ] Sonsuz kaydırmalı kart akışı
- [ ] Sıralama seçenekleri: En Yeni / Trend / En Fazla Eşleşen
- [ ] Her kart: başlık, rüya sahibi takma adı, kategori ikonu, süre ("2 saat önce"), beğeni sayısı, özet (150 karakter)
- [ ] Kart üzerinden direkt beğeni / kaydetme yapılabilmeli
- [ ] Kendi rüyaları akışta görünmemeli
- [ ] Engellenen kullanıcıların içerikleri görünmemeli

---

### FEAT-031 — Rüya Eşleştirme Motoru

**Öncelik:** P0 | **Modül:** Keşif

**Açıklama:**  
Kullanıcının kaydettiği rüyaya benzer içerikteki diğer rüyaları bulan sistem. Platformun temel değer önerisi.

**Kullanıcı Hikayeleri:**

- Kullanıcı olarak rüyamı kaydettikten hemen sonra benzer rüyaları görmek istiyorum.
- Kullanıcı olarak dünyanın farklı yerlerindeki insanların benim gibi rüyalar gördüğünü keşfetmek istiyorum.

**Kabul Kriterleri:**

- [ ] Rüya kaydedildiğinde ≤ 3 saniye içinde eşleşme sonuçları hazırlanmalı
- [ ] Eşleştirme kriterleri (öncelik sırasıyla): ortak etiketler, rüya kategorisi, rüya metninin semantik benzerliği
- [ ] Minimum eşleşme skoru tanımlanmalı; düşük skorlu sonuçlar gösterilmemeli
- [ ] Eşleşme sonuçları "benzerlik yüzdesi" ile sıralanmalı
- [ ] Kullanıcı kendi rüyalarıyla eşleşmemeli
- [ ] Engellenen kullanıcıların rüyaları eşleşmemeli
- [ ] Kritik kitle yokken (< 10.000 aktif kullanıcı) eşleşme yetersiz kalabilir; bu durumda "Henüz tam eşleşme bulunamadı, benzer temalar:" ile kısmi sonuç gösterilmeli

**Eşleştirme Algoritması Yaklaşımı (Teknik Karar Gerektiren):**

- V1: Etiket bazlı örtüşme skoru (hızlı, basit, açıklanabilir)
- V2: Semantik metin benzerliği (NLP embedding + vektör arama)

---

### FEAT-032 — Etiket ve Arama

**Öncelik:** P0 | **Modül:** Keşif

**Kabul Kriterleri:**

- [ ] Arama çubuğu platform genelinde metin araması yapmalı
- [ ] Etiket sayfası: bir etikete tıklandığında o etiketi içeren tüm rüyalar listelenmeli
- [ ] Etiket takip etme: kullanıcı bir etiketi takip edebilmeli; yeni rüyalar eklenince bildirim alabilmeli (opsiyonel)

---

### FEAT-033 — Trend Rüya Konuları

**Öncelik:** P0 | **Modül:** Keşif

**Açıklama:**  
Son 24 saatin en çok paylaşılan rüya temalarını gösteren trend paneli.

**Kabul Kriterleri:**

- [ ] Ana sayfada "Bugün Trend" bölümü: son 24 saatin en çok görülen 5 etiketi
- [ ] Her trend etiketin yanında rüya sayısı gösterilmeli
- [ ] Etiket sayfasında trend içerik vurgulanmalı
- [ ] Coğrafi filtre: Türkiye trendi / Dünya trendi (V1.5)

---

### FEAT-034 — Lokasyon Bazlı Keşif

**Öncelik:** P1 | **Modül:** Keşif | **Versiyon:** V1.5

**Açıklama:**  
Rüyada geçen lokasyonları harita veya liste üzerinde görselleştirme.

**Kabul Kriterleri:**

- [ ] "#paris etiketli rüyalar" gibi lokasyon filtresi
- [ ] Bir lokasyonu rüyasında gören kullanıcı sayısı gösterilmeli
- [ ] Otel ve konaklama entegrasyonu: bir lokasyon sayfasından ilgili işletmelere yönlendirme (V3, B2B özellik)

---

## MODÜL 5: Sosyal Etkileşim

### FEAT-040 — Beğeni, Yorum, Kaydetme

**Öncelik:** P0 | **Modül:** Sosyal

**Kabul Kriterleri:**

- [ ] Beğeni: tek tık, geri alınabilir; beğeni sayısı gerçek zamanlı güncellenmeli
- [ ] Yorum: metin bazlı, maks. 300 karakter; iç içe yorum (reply) desteği
- [ ] Kaydetme: kullanıcı koleksiyonuna ekleme; kişisel koleksiyonlar oluşturulabilmeli
- [ ] Rüya sahibine tüm etkileşimler için bildirim gönderilmeli
- [ ] Kullanıcı yorumları silebilmeli; içerik sahibi kendi rüyasındaki yorumları silebilmeli

---

### FEAT-041 — Takip ve Engelleme

**Öncelik:** P0 | **Modül:** Sosyal

**Kabul Kriterleri:**

- [ ] Takip: kullanıcı başka bir kullanıcıyı takip edebilmeli; takip onayı gerektirmemeli (varsayılan)
- [ ] Gizli profil: profil gizliyse takip isteği onay gerektirir
- [ ] Engelleme: engellenen kullanıcı profili, rüyaları ve yorumları görünmez; eşleştirmeye dahil edilmez
- [ ] Engelleme listesi profil ayarlarında yönetilebilmeli

---

### FEAT-042 — Platform Dışı Paylaşım

**Öncelik:** P0 | **Modül:** Sosyal

**Açıklama:**  
Rüyaların Instagram, Twitter ve diğer platformlarda paylaşılması.

**Kabul Kriterleri:**

- [ ] Paylaşım formatı: rüya metni + DreamCloud logolu kart tasarımı
- [ ] Instagram hikayesi formatında dışa aktarma (1080x1920)
- [ ] Twitter / X paylaşımı: karakter sınırına uygun özet + link
- [ ] WhatsApp paylaşımı: link önizlemesi desteklenmeli
- [ ] Paylaşım sırasında rüyanın görünürlüğü "Herkese Açık"a dönmeli veya kullanıcı uyarılmalı

---

## MODÜL 6: İçerik Yönetimi

### FEAT-050 — İçerik Raporlama

**Öncelik:** P0 | **Modül:** Moderasyon

**Kabul Kriterleri:**

- [ ] Her rüyada "Raporla" seçeneği (üç nokta menüsü altında)
- [ ] Rapor kategorileri: Uygunsuz içerik / Nefret söylemi / Sahte içerik / Spam / Diğer
- [ ] Rapor gönderilince kullanıcıya "inceleniyor" onayı
- [ ] Aynı içerik ≥ 5 raporlanırsa otomatik gizleme ve moderatör kuyruğuna ekleme

---

### FEAT-051 — Otomatik İçerik Tarama

**Öncelik:** P0 | **Modül:** Moderasyon

**Kabul Kriterleri:**

- [ ] İçerik yayınlanmadan önce otomatik tarama (açık cinsel içerik, nefret söylemi, şiddet)
- [ ] İhlal tespit edilirse içerik yayınlanmaz; kullanıcıya kılavuz gösterilir
- [ ] Yanlış pozitif oranı < %5 hedeflenmeli
- [ ] Tarama süresi ≤ 2 saniye

---

## MODÜL 7: Bildirimler

### FEAT-060 — Sabah Rüya Hatırlatma Bildirimi

**Öncelik:** P0 | **Modül:** Bildirimler

**Açıklama:**  
Platformun en kritik temas noktası. Kullanıcının rüyasını kaydetmeden önce unutmasını önleyen sabah bildirimi.

**Kabul Kriterleri:**

- [ ] Kullanıcı onboarding sırasında sabah bildirimi saati seçmeli
- [ ] Bildirim metni statik değil, dinamik olmalı:
  - "Bu sabah dünya genelinde [X] rüya paylaşıldı, seninkini ekle"
  - "Rüyanı hatırlıyorken kaydet — 5 dakikada unutulabilir"
  - "Bu gece [trend etiket] rüyaları rekor kırdı"
- [ ] Bildirime tıklandığında direkt rüya giriş ekranı açılmalı
- [ ] Hafta içi/sonu farklı saat ayarı desteklenmeli
- [ ] Kullanıcı bildirimi kapatabilmeli veya erteleyebilmeli

---

## MODÜL 8: Gelecek Versiyonlar

### FEAT-070 — REM Uyku Tespiti (V3)

**Öncelik:** P2 | **Modül:** Wearable Entegrasyon

**Açıklama:**  
Akıllı saat REM fazını tespit ettiğinde kullanıcıya "rüyanı kaydet" bildirimi gönderilir.

**Kabul Kriterleri:**

- [ ] Apple Watch HealthKit entegrasyonu
- [ ] Wear OS (Android) entegrasyonu
- [ ] REM fazı tespitinde titreşimli hafif bildirim (sesli değil; uyku bozulmasın)
- [ ] Sabah uyandığında "Bu gece REM fazında 2 rüya fırsatı yakaladınız" özet bildirimi
- [ ] Sağlık verisi ayrı açık rıza gerektirir; rüya verisinden bağımsız onay

---

### FEAT-071 — Rüya Yorumcusu Entegrasyonu (V2)

**Öncelik:** P1 | **Modül:** Yorum

**Açıklama:**  
Onaylı rüya yorumcuları platforma katılır; kullanıcılar yorumcu profillerine yorum talebi gönderebilir.

**Kabul Kriterleri:**

- [ ] Yorumcu profili (onaylı rozet sistemi)
- [ ] Yorumcu kategorileri: Psikolojik / Spiritüel / Kültürel
- [ ] Yorum talebi: kullanıcı rüyasını yorumcuya iletebilir
- [ ] 48 saat içinde yanıt beklentisi sisteme yansıtılmalı
- [ ] Yorumcu değerlendirme ve puan sistemi

---

### FEAT-072 — Profil Rüya Karşılaştırma (V2)

**Öncelik:** P1 | **Modül:** Sosyal

**Açıklama:**  
İki kullanıcı profili arasında rüya benzerlik analizi yapılması.

**Kabul Kriterleri:**

- [ ] Kullanıcı A, Kullanıcı B'nin profilinde "Rüyalarımızı Karşılaştır" butonuna basabilmeli
- [ ] Ortak etiket sayısı, ortak kategori oranı, benzerlik skoru gösterilmeli
- [ ] Karşılaştırma yalnızca herkese açık rüyalar üzerinden yapılmalı
- [ ] Karşılaştırma sonucu paylaşılabilir kart olarak dışa aktarılabilmeli

---

## Özellik Öncelik Özeti

### MVP (V1.0) — P0 Özellikler

1. FEAT-001 Kullanıcı Kaydı
2. FEAT-002 Kullanıcı Profili
3. FEAT-003 Onboarding Akışı
4. FEAT-010 Metin Tabanlı Rüya Girişi
5. FEAT-011 Kategori ve Etiketleme
6. FEAT-012 Görünürlük Ayarı
7. FEAT-020 Kişisel Rüya Arşivi
8. FEAT-030 Global Rüya Akışı
9. FEAT-031 Rüya Eşleştirme Motoru
10. FEAT-032 Etiket ve Arama
11. FEAT-033 Trend Rüya Konuları
12. FEAT-040 Beğeni, Yorum, Kaydetme
13. FEAT-041 Takip ve Engelleme
14. FEAT-042 Platform Dışı Paylaşım
15. FEAT-050 İçerik Raporlama
16. FEAT-051 Otomatik İçerik Tarama
17. FEAT-060 Sabah Bildirim Sistemi

---

_Bu doküman FEATURE_SPECIFICATIONS.md olup teknik uygulama detayları içermez. Her özellik geliştirmeye başlamadan önce tasarım ekibiyle wireframe seviyesinde onaylanmalıdır._
