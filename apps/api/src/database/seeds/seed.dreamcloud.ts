/**
 * DreamCloud Seed Data Engine v1
 * 500 users · 5000 dreams · full AI intelligence data
 *
 * Run:   cd apps/api && npm run seed:dreamcloud
 * Reset: cd apps/api && npm run seed:reset
 *
 * Idempotent — safe to run multiple times.
 * All seeded users have emails ending in @seed.dreamcloud.app.
 * All seeded dreams include the tag "dc-seed-v1".
 * Deleting seed users cascades everything else.
 */

import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { DataSource } from 'typeorm';
import AppDataSource from '../../config/database.config';

if (process.env['NODE_ENV'] === 'production') {
  console.error('❌  Seed script is disabled in production.');
  process.exit(1);
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SEED_EMAIL_SUFFIX = '@seed.dreamcloud.app';
const SEED_TAG          = 'dc-seed-v1';
const DEMO_PASS         = 'Seed2024!';
const TARGET_USERS      = 500;
const TARGET_DREAMS     = 5000;
const TARGET_LIKES      = 3000;
const TARGET_COMMENTS   = 1200;
const TARGET_FOLLOWS    = 800;
const TARGET_MATCHES    = 700;
const TARGET_CONNECTIONS= 200;
const TARGET_SEEN       = 150;

// ─── Deterministic PRNG ──────────────────────────────────────────────────────

let _seed = 0xDEADBEEF;
function seededRand(): number {
  _seed = (_seed * 1664525 + 1013904223) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(seededRand() * arr.length)] as T;
}
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr].sort(() => seededRand() - 0.5);
  return copy.slice(0, n);
}
function between(min: number, max: number): number {
  return Math.floor(seededRand() * (max - min + 1)) + min;
}
function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = seededRand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}
function randDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(seededRand() * daysBack));
  d.setHours(between(20, 23), between(0, 59), between(0, 59));
  return d;
}

// ─── Turkish Name Data ────────────────────────────────────────────────────────

const MALE_FIRST = [
  'Ahmet','Mehmet','Mustafa','Ali','Hüseyin','Mert','Can','Emre','Burak','Selim',
  'Ozan','Berk','Kaan','Tarık','Volkan','Fatih','Serkan','Sinan','Arda','Engin',
  'Kadir','Uğur','Onur','Alp','Cem','Erdem','Hakan','Tolga','Furkan','Serhat',
  'Umut','Gökhan','Ercan','Barış','Orkun','Çağrı','Oğuz','Yiğit','Alper','Rıza',
];

const FEMALE_FIRST = [
  'Ayşe','Fatma','Zeynep','Elif','Merve','Selin','Naz','Pınar','Ece','Büşra',
  'Esra','Yağmur','Ceylan','Cansu','Aslı','Sibel','Arzu','Melisa','Leyla','Gül',
  'Özlem','Sevgi','Tuğba','Nilüfer','Burcu','Didem','İpek','Derya','Gamze','Seda',
  'Hande','Gizem','Şeyma','Rüya','Deniz','Beril','Aylin','Nihan','Damla','Tuba',
];

const LAST_NAMES = [
  'Yılmaz','Kaya','Demir','Şahin','Çelik','Yıldız','Öztürk','Arslan','Doğan','Kılıç',
  'Aslan','Çetin','Kurt','Aydın','Özdemir','Polat','Güneş','Yalçın','Aktaş','Bulut',
  'Yavuz','Şimşek','Özcan','Erdoğan','Çakır','Koçak','Dinç','Kaplan','Gündüz','Demirtaş',
  'Acar','Güler','Şen','Karaca','Tekin','Korkmaz','Ceylan','Bozkurt','Kara','Özkan',
];

const CITIES = [
  'İstanbul','Ankara','İzmir','Bursa','Antalya','Konya','Adana','Mersin','Kayseri',
  'Gaziantep','Trabzon','Samsun','Eskişehir','Denizli','Malatya','Erzurum','Balıkesir',
  'Hatay','Kocaeli','Diyarbakır','Manisa','Tekirdağ','Muğla','Edirne','Çanakkale',
];

const BIOS = [
  'Lucid rüyalar peşinde koşuyorum. Her gece yeni bir macera bekliyorum.',
  'Rüyalarımı yıllardır yazıyorum, her biri bir hikâye.',
  'Bilinçaltının sesini dinlemeyi seviyorum. Rüyalar benim rehberim.',
  'Her gece farklı dünyalar keşfederim. Rüya günlüğüm hayatımın bir parçası.',
  'Gece dünyasının seyyahı. Güzel ve korkunç rüyaları severek yaşıyorum.',
  'Psikolog olarak rüyaları hem profesyonel hem kişisel merakla inceliyorum.',
  'Kabus ve güzellik bir arada. Rüyalarım bazen korkutur, bazen büyüler.',
  'Rüyalarımı paylaşmak, başkalarının deneyimleriyle bağlantı kurmak güzel.',
  'Denizden gelen rüyalar. Su ve özgürlük temalarım hiç bitmiyor.',
  'Uçmak, yüzmek, kaybolmak. Rüyalarım hep özgürlük temalı.',
  'Gece yarısı düşünceleri ve rüyaların kesiştiği yerde yaşıyorum.',
  'Doğanın içindeyken en güzel rüyalarımı görüyorum.',
  'Rüyalar gerçekliğin aynası mı, yoksa başka bir gerçeklik mi?',
  'Her sabah rüyamı hatırlamaya çalışıyorum. Bu platform bu alışkanlığı kolaylaştırdı.',
  'Bilinçaltı çok ilginç bir yer. Rüyalar onun dilidir.',
  'Lucid dreaming pratisyeni olarak yıllardır bu yolda ilerliyorum.',
  'Rüyalarım bazen gelecekten haberler taşıyor gibi hissediyorum.',
  'Sanatçıyım, rüyalarımdan ilham alıyorum.',
  'Seyahat ederken gördüğüm rüyalar çok daha canlı oluyor.',
  'Aile bağları, geçmiş anılar. Rüyalarım genellikle bunları işliyor.',
  'Stresli dönemlerde rüyalarım nasıl değişiyor, bunu takip ediyorum.',
  'Felsefe ve rüyalar arasındaki ilişki beni büyülüyor.',
  'Müzisyenim. Bazen rüyamda melodiler duyuyorum.',
  'Okumayı seviyorum, rüyalarım da kitaplar gibi.',
  'Çocukluğumdan beri rüyalarımı hatırlıyorum, bu hediyemi paylaşıyorum.',
  'Meditasyon ve rüya pratiğini bir arada yapıyorum.',
  'Doktor olarak stres yönetiminde rüyaların rolünü araştırıyorum.',
  'Yazar olarak rüyalarım en güçlü ilham kaynağım.',
  'Yoga ve bilinç çalışmaları beni buraya getirdi.',
  'Rüyalarda zaman farklı işliyor. Bu beni hep meraklandırıyor.',
];

// ─── Dream Texts (80 unique Turkish dream narratives) ────────────────────────

const DREAM_POOL: { title: string; content: string; category: string }[] = [
  // NORMAL (20)
  { title: 'Eski Mahalle', category: 'normal',
    content: 'Çocukluğumun mahallesinde yürüyordum. Asfalt eskimiş, çocuklar sokakta oynuyor. Komşu teyzenin balkonu açık, tanıdık bir koku yayılıyordu. Hiçbir şey özel değildi ama her şey huzurluydu. Sabah uyandığımda yıllarca gitmediğim o sokağı aradım.' },
  { title: 'İş Toplantısı', category: 'normal',
    content: 'Önemli bir toplantı vardı, herkes bekliyordu. Konuşmam gerekiyordu ama ne söyleyeceğimi biliyordum. Slaytları geçtim, sorulara cevap verdim. Sıradan ve sıkıcı bir rüya gibi ama sabah işe gidip gerçekten toplantım olduğunu hatırlayınca şaşırdım.' },
  { title: 'Market Alışverişi', category: 'normal',
    content: 'Büyük bir markette dolaşıyordum, alışveriş listem uzundu. Raflar arasında yürürken bir şeyleri unuttuğumu hissediyordum ama ne olduğunu çıkaramıyordum. Kasaya geldiğimde sepetimde hiç istemediğim şeyler vardı.' },
  { title: 'Akşam Yemeği', category: 'normal',
    content: 'Aile yemeğindeydik, herkes masadaydı. Yemekler geldi, sohbet aktı. Güldük, birbirimize baktık. Uyandığımda evde yalnız olduğumu hatırladım. Bu rüya sonrası bir özlem kaplandı içimi.' },
  { title: 'Okula Geç Kalmak', category: 'normal',
    content: 'Okul çantamı hazırlıyorum ama her şey ağır gidiyor. Otobüs neredeyse kalkıyor, koşmaya çalışıyorum. Kapıya ulaştığımda otobüs tam kapanıyor. Bekliyorum, bir sonraki geliyor. Sıradan ama o an gerçekmiş gibi hissettiriyor.' },
  { title: 'Kafe Sohbeti', category: 'normal',
    content: 'Eski bir arkadaşımla kafede oturuyorduk. Sıradan bir sohbet, sıradan bir kahve. Ama rüyadan uyandığımda o arkadaşı ne kadar özlediğimi fark ettim. Bazen normal rüyalar en derin mesajları taşıyor.' },
  { title: 'Şehirde Yürüyüş', category: 'normal',
    content: 'Tanıdık ama biraz farklı bir şehirde yürüyordum. Dükkanlar açık, insanlar kendi işinde. Bir kuyumcu vitrinine baktım, içeri girmedim. Bir meyve satıcısından portakal aldım. Rüzgar hafifçe esiyordu. Hiçbir şey özel değildi.' },
  { title: 'Bisiklet Yolculuğu', category: 'normal',
    content: 'Sonsuz bir yolda bisiklet sürüyordum. Yokuş yok, rüzgar arkamdan. Her yanım tarlalar, ayçiçekleri. Hiç yorulmuyorum, sadece pedal basıyorum. Gidecek bir yer yok, yolculuğun kendisi amaç.' },
  { title: 'Kitap Okumak', category: 'normal',
    content: 'Güzel bir koltuğa oturmuş kitap okuyordum. Kitabın içeriği sürekli değişiyordu, her sayfada başka bir hikâye. Uyumak istemiyordum çünkü okumak çok güzeldi. Ama o anda uyuduğumu fark ettim, rüyadayım diye.' },
  { title: 'Telefon Görüşmesi', category: 'normal',
    content: 'Uzun süredir aramadığım biriyle telefonda konuşuyordum. Ses tanıdık ama yüzü aklıma gelmiyordu. Anlattıkları önemliydi ama ne anlattığını hatırlamıyorum. Telefon kapanınca kim olduğunu sormayı unuttum.' },
  { title: 'Bahçede Çalışmak', category: 'normal',
    content: 'Büyük bir bahçede çalışıyordum, toprak ıslanmış, kokuluydu. Çiçekler dikiyordum, ama her diktiğim yerde başka bir şey çıkıyordu topraktan. Beklenmedik ama güzel sürprizler. Ellerin topraklı olması güzel hissettiriyordu.' },
  { title: 'Yağmurda Durmak', category: 'normal',
    content: 'Şiddetli yağmur altında yürüyordum ama ıslanmıyordum. Yağmur damlaları yavaşça düşüyor, etrafımda dans edercesine. İnsanlar şemsiyeler altında koşuyor, ben sakin adım atıyorum. Huzurlu bir anlamsızlık.' },
  { title: 'Tren Yolculuğu', category: 'normal',
    content: 'Uzun bir tren yolculuğundaydım. Pencereden manzara akıp geçiyordu, ormanlar, köyler, dağlar. Yanımda oturan biri vardı ama konuşmuyorduk. Sadece bakıyorduk. Varış yeri belli değildi ama önemli de değildi.' },
  { title: 'Köy Evinde Uyku', category: 'normal',
    content: 'Bir köy evinde uyandım, tahta zemin, tahta tavan. Sabah kuşları ötüyordu, dışarıdan samanlık kokusu geliyordu. Kalkıp mutfağa gittim, ocak kömürle yanıyordu. Hiç bilmediğim biri çay hazırladı, içtik.' },
  { title: 'Yüzmek', category: 'normal',
    content: 'Temiz, mavi bir havuzda yüzüyordum. Tek başımaydım ama rahatsız değildim. Sudaki ağırlıksızlık hissi gerçek gibiydi. Bir süre yüzdüm, kenara çıktım, kuruldum. Basit ama rahatlatıcıydı.' },
  { title: 'Müzik Dinlemek', category: 'normal',
    content: 'Bir konser salonundaydım ama küçük, samimi bir mekân. Sahne yoktu, müzisyenler aynı seviyedeydi. Çalınan müziği duyuyordum ama tanımlayamıyordum. İçim doluyordu ama neden bilmiyordum.' },
  { title: 'Eskiye Dönmek', category: 'normal',
    content: 'Eskiden çalıştığım bir yerdeyim, eski iş arkadaşlarım var. Ama ben şimdiki bilgimle oradayım. İlginç bir çelişki, hem geçmişte hem şimdiki hayatımı yaşıyorum aynı anda. Kimse bunu garip bulmuyordu.' },
  { title: 'Tatil Hazırlığı', category: 'normal',
    content: 'Tatile gidiyorduk, bavul hazırlıyordum. Her koyduğum şey bavuldan çıkıyor, düzeni bozuluyordu. Sonunda vazgeçtim, bavulsuz yola çıkmaya karar verdim. Kimse bir şey demedi, herkes hazırdı.' },
  { title: 'Doktor Randevusu', category: 'normal',
    content: 'Hastanede bekliyordum, sıra uzundu. Numaramı çektim, beklemeye başladım. Herkes kendi dünyasında, kimse kimseyle konuşmuyor. Bir süre sonra adımı çağırdılar, içeri girdim, doktor tanıdık birine benziyordu.' },
  { title: 'Balıkçı Teknesi', category: 'normal',
    content: 'Küçük bir balıkçı teknesinde oturuyordum, ipi tutuyordum. Balık tutmak için gelmemiştim sanki, sadece oturmak için. Deniz sakin, gökyüzü bulutlu. Uzaktan martı sesleri geliyordu. Hiçbir şey olmadı ama huzurluydum.' },

  // BEAUTIFUL (20)
  { title: 'Gökyüzünde Dans', category: 'beautiful',
    content: 'Bulutların üzerinde dans ediyordum. Ayaklarım pamuk gibi bir zemine basıyor, her adımda küçük şimşekler çakıyordu. Güneş yanı başımdaydı, ısısını hissedebiliyordum. Aşağıda şehirler minik noktalar gibiydi ve ben tam özgürlüğün içindeydim.' },
  { title: 'Sualtı Cenneti', category: 'beautiful',
    content: 'Okyanusun derinliğine indim ve orada bir bahçe buldum. Mercanlardan yapılmış ağaçlar, balıkların oluşturduğu bulutlar. Işık yukarıdan dalgalanarak geliyordu. Nefes almam gerekmiyordu. Saatlerce orada kaldım, gitmek istemedim.' },
  { title: 'Büyülü Orman', category: 'beautiful',
    content: 'Yoğun bir ormanın içindeyim, güneş ışıkları yapraklar arasından süzülüyor. Yol göstericim bir beyaz geyik. Nereye gittiğimi bilmiyorum ama takip etmek zorunda hissediyorum. Orman giderek büyülü bir hal alıyor, ağaçlar ışıl ışıl parlıyor.' },
  { title: 'Uçan Balıklar', category: 'beautiful',
    content: 'Gökyüzünde balıklar yüzüyordu. Pembe, mor, altın renkli büyük balıklar. Ben de onların arasına karışıp yüzdüm. Hiç mantıklı değildi ama inanılmaz güzeldi. Uyandığımda gülümseyerek kalktım.' },
  { title: 'Mor Dağlar', category: 'beautiful',
    content: 'Mor renge boyalı dağların arasında yürüyordum. Kar yoktu ama hava serindi. Her adımda toprak yumuşak ve canlıydı. Zirvede küçük bir ev vardı, kapısı açıktı. İçeri girdim, sıcak çay hazırdı masada, beni bekliyordu.' },
  { title: 'Işık Saçan Çiçekler', category: 'beautiful',
    content: 'Gece bir bahçedeyim ama her çiçek ışık saçıyor. Kırmızı, sarı, mavi parıltılar. Etrafım sanki yıldızlarla dolu. Bir çiçeğe dokunduğumda tüm bedenim titreşti, içim ısındı. O bahçeden çıkmak istemedim hiç.' },
  { title: 'Ay Gezisi', category: 'beautiful',
    content: "Aya gittim ama uzay giysisi yoktu. Normal kıyafetlerimle. Ay yüzeyi düşündüğümden çok daha yumuşaktı, toz gibiydi. Dünyaya baktım, mavi bir mermer gibi asılı. İçim sıkıştı, hem korkudan hem hayranlıktan." },
  { title: 'Yıldız Yağmuru', category: 'beautiful',
    content: 'Açık bir ovada uzanmış yıldız yağmurunu izliyordum. Ama yıldızlar düşmüyor, yavaşça yaklaşıyordu. Biri elime dokundu, bir yıldız. Sıcak ve küçük bir toptu, elimde tuttuğumda içinden melodiler geliyordu.' },
  { title: 'Gökkuşağı Köprüsü', category: 'beautiful',
    content: 'İki dağ arasında dev bir gökkuşağı köprüsü uzanıyordu. Üzerinde yürüdüm. Altımda boşluk vardı ama korkmadım. Köprünün renkleri ayaklarımın altında değişiyordu. Karşıya geçince başka bir dünya beni bekliyordu.' },
  { title: 'Denizde Gün Batımı', category: 'beautiful',
    content: 'Denizin ortasında küçük bir kayalığın üzerindeydim. Güneş batıyor, gökyüzü kızıl ve altın. Sular sakin, rüzgar yok. Etrafımda yunuslar yüzüyordu, beni izliyorlardı. Hayatımda gördüğüm en güzel manzara buydu.' },
  { title: 'Müzik Şehri', category: 'beautiful',
    content: 'Her binanın bir tonu vardı bu şehirde. Yürüdükçe şehir melodi üretiyordu. İnsanlar adım atarken müzik çıkıyor, kapılar açılırken akor çalıyordu. Ben de yürüdüm ve kendi melodimi yarattım.' },
  { title: 'Bulutların Üstünde Kahve', category: 'beautiful',
    content: 'Bir bulutun üzerinde oturuyordum, sallanan bir hamak gibi. Altımda şehirler, dağlar, denizler akıp gidiyordu. Birileri yanıma geldi ve kahve uzattı. Bulut üzerinde kahve içmek hayatımın en güzel anıydı rüyada da olsa.' },
  { title: 'Dans Eden Ağaçlar', category: 'beautiful',
    content: 'Orman müziğe göre dans ediyordu. Ağaçlar eğilip kalkıyor, yapraklar ritim tutuyor. Ben de aralarına katılıp dans ettim. Rüzgar müzikti, yer titreşimdi. Doğayla tam anlamıyla bütünleştim.' },
  { title: 'Büyükanne Bahçesi', category: 'beautiful',
    content: 'Büyükannemin bahçesindeyim, çocuk gibi. Domates ve biber kokusu. Güneş yanıyor ama sıcak değil. Büyükannem bir şeyler anlatıyor, sesi geliyor ama kelimeleri duyamıyorum. Uyandığımda gözlerim ıslaktı.' },
  { title: 'Kristal Mağara', category: 'beautiful',
    content: 'Bir mağaranın içinde kristal ormanı vardı. Duvarlar, tavan, zemin hepsi kristal kaplıydı. Her taşa dokunduğumda farklı bir ışık patladı. Mavi, yeşil, mor. Çıkmak istemedim, içeride sonsuz bir güzellik vardı.' },
  { title: 'Kuş Olarak Uçmak', category: 'beautiful',
    content: 'Bu sefer uçmak için bir şeye ihtiyacım yoktu. Kollarım kanat olmuştu, tüyler çıkmıştı. Kuş gibi uçuyordum, gerçekten. Rüzgarı hissedebiliyordum, gözlerim keskinleşmişti. Altımda küçük bir köy, üstümde açık mavi gökyüzü.' },
  { title: 'Sesin Içinde Yüzmek', category: 'beautiful',
    content: 'Müzik görünür hale gelmişti. Notalar renkli dalgalar halinde akıyordu. Ben de içine daldım, sesle birlikte süzüldüm. Her notada farklı bir duygu vardı. Bu rüya sabah uyandığımda hâlâ kulaklarımdaydı.' },
  { title: 'Çiçek Yağmuru', category: 'beautiful',
    content: 'Gökyüzünden çiçekler yağıyordu. Gül, papatya, lavanta, zambak. Yavaşça düşüyorlardı, hiç ezilmiyorlardı. Avuçlarımla tutuyordum onları. Tüm sokak çiçek dolmuştu ve kimse şikâyet etmiyordu.' },
  { title: 'Sonsuz Kütüphane', category: 'beautiful',
    content: 'Sonsuz bir kütüphanede kayboldum. Raflar tavana kadar uzanıyor, kitaplar her dilde. Aradığım kitabın adını biliyorum ama hiçbir raf sistemine uymuyordu. Bir kapı buldum, açtım, ardında başka bir kütüphane vardı. Mutlu bir labirent.' },
  { title: 'Zaman Durdu', category: 'beautiful',
    content: 'Zaman yavaşlamıştı. Bir saniye bir dakika gibi geçiyordu. Su döküldüğünde damlalar havada asılı kalıyordu. Her şeyin içini görebiliyordum, anlayabiliyordum. Acele etmek zorunda olmamak nasıl bir şey, işte o.' },

  // NIGHTMARE (20)
  { title: 'Takip Edilmek', category: 'nightmare',
    content: 'Karanlık sokaklarda birisi beni takip ediyordu. Koşuyordum ama sesler hep arkamdan geliyordu. Kapılara vurdum, açılmadı. Bağırmak istedim, sesim çıkmadı. Bir çıkmaz sokağa girince köşeye sıkıştım ve uyandım.' },
  { title: 'Düşen Dişler', category: 'nightmare',
    content: 'En klasik kabusum. Dişlerim birer birer döküldü. Elimde tutuyorum, yerine koymaya çalışıyorum ama tutmuyorlar. Bu rüyanın ardından genellikle kaygılı bir gün geçiriyorum.' },
  { title: 'Dalga Duvarı', category: 'nightmare',
    content: 'Sahildeyim ve ufukta devasa bir dalga yükseliyor. Kaçacak yer yok, çevremde herkes donup kalmış. Dalga yaklaştıkça rüzgar güçleniyor. Tam üstüme geldiğinde uyandım, terler içinde.' },
  { title: 'Sınav Paniği', category: 'nightmare',
    content: 'Üniversite sınavındayım, hiçbir şey bilmiyorum. Kalem elimden düşüyor, sayfalar boş. Zaman daralıyor ve ben hâlâ ilk soruya bakıyorum. Klasik kabus ama o kadar gerçek hissettiriyor ki.' },
  { title: 'Canavar Kovalaması', category: 'nightmare',
    content: 'Dev bir yaratık peşimdeydi. Ne kadar koşarsam koşayım yaklaşıyordu. Bacaklarım ağırlaşıyordu, nefes alamıyordum. Bir köprüden atladım ve uyandım. Birkaç saniye gerçek mi rüya mı ayırt edemedim.' },
  { title: 'Kontrolsüz Araba', category: 'nightmare',
    content: 'Direksiyon elimde ama araba gitgide hızlanıyor, fren tutmuyor. Yolda kimse yok ama virajlar gelmeye devam ediyor. Sonunda uyandım, kalp atışlarım çılgın gibiydi.' },
  { title: 'Boğulmak', category: 'nightmare',
    content: 'Karanlık bir suda boğuluyordum. Yüzeye çıkmak için çabalıyordum ama ne kadar çok hareket etsem o kadar derin gitiyordum. Işık yukarıda ama ulaşamıyordum. Son anda biri elimi tuttu, uyandım.' },
  { title: 'Kayıp Çanta', category: 'nightmare',
    content: 'Havalimanındayım, uçağım kalkıyor ama çantam kayboldu. Her yere baktım, bulamıyorum. Pasaportum da çantadaydı. Gişeye koşuyorum, adam beni duymuyor. Alarm çalıyor ve uçak kalkıyor.' },
  { title: 'Hayalet Ev', category: 'nightmare',
    content: 'Terk edilmiş bir evde yalnız kalmak zorunda kaldım. Gece oldu, sesler başladı. Ayak sesleri, kapılar. Korkmamaya çalışıyorum ama vücudum işbirliği yapmıyor. Sabah olmasını bekledim rüyada, uyandım.' },
  { title: 'Düşmek', category: 'nightmare',
    content: 'Çok yüksek bir yerden düşüyordum. Yere çarpmadan önce uyandım. Her seferinde bu olur. Ama bu sefer düştüm, zemin yoktu, sonsuzlukta düşüyordum. Korku değil, bir boşluk hissi.' },
  { title: 'Unutulan İsim', category: 'nightmare',
    content: 'Karşımdaki kişiyi tanıyorum ama adını söyleyemiyorum. Her şeyi biliyorum hakkında ama isim gelmiyor. O da benim ismimi söylemiyor. İsimsiz bir ilişki. Bu rüya beni her seferinde rahatsız ediyor.' },
  { title: 'Dağılan Bina', category: 'nightmare',
    content: 'İçinde bulunduğum bina yavaşça çöküyordu. Duvarlar çatlıyor, tavanlar sarkıyor. Koşup çıkmaya çalışıyordum ama merdivenleri bulamıyordum. Her oda başka bir yere açılıyordu. Çıkışı bulamadım.' },
  { title: 'Sessiz Ev', category: 'nightmare',
    content: 'Evdeyim ama her şey sessiz. Telefonum çalıyor ama ses yok. Kapıyı çalıyorlar ama ses yok. Konuşmaya çalışıyorum, sesim çıkmıyor. Tam bir sessizlik kâbusu.' },
  { title: 'Kaybolan Kişi', category: 'nightmare',
    content: 'Sevdiğim biri kaybolmuştu. Her yerde arıyordum, telefon çalıyordum, bağlanamıyordum. İnsanlara soruyordum, kimse bilmiyordu. Sonunda tanıdık bir yerde buldum onu, ama beni tanımıyordu.' },
  { title: 'Yangın', category: 'nightmare',
    content: 'Evimde yangın çıkmıştı. Alevler hızla yayılıyordu. Çıkmak için kapıyı açmaya çalışıyordum, kolu ısınmıştı. Pencerelere koştum, çok yüksekti. İçeride mahsur kaldım ve uyandım.' },
  { title: 'Hız Treni', category: 'nightmare',
    content: 'Çok hızlı giden bir trendeyim. Pencereden manzara bulanık, duraklar geçip gidiyor. İnmem gereken yeri kaçırdım, bir sonraki durak da geçti. Tren durmuyor ve ben gitgide daha uzaklaşıyorum.' },
  { title: 'Paraliz Uyanış', category: 'nightmare',
    content: 'Uyandım ama hareket edemiyordum. Gözlerim açık, odayı görebiliyorum, ama vücudum taş gibi. Bir şeyin bana baktığını hissediyordum odanın köşesinden. Bağıramıyordum. Sonra gerçekten uyandım.' },
  { title: 'Kayıp Olmak', category: 'nightmare',
    content: 'Büyük bir şehirde kaybolmuştum, telefon yok, para yok. Sokak sokak dolaşıyorum. Yabancılar yardım etmek istiyor ama dilimizi anlayamıyoruz. Gece oldu ve hâlâ kayıptım.' },
  { title: 'İzlenme Hissi', category: 'nightmare',
    content: 'Evdeyim, normal işlerimi yapıyorum ama izlendiğimi hissediyorum. Perdeleri kapattım, kapıyı kilitledim. Yine de o his geçmedi. Aynaya baktım, gözlerim farklıydı. Ben değildim bakan.' },
  { title: 'Tünelde Kaybolmak', category: 'nightmare',
    content: 'Uzun bir tünelin içindeyim ve her iki taraf da karanlık. Ne öne gitsem ne de geri dönsem ışık görünüyor. Duvarlar ıslanmış ve soğuk. Sesi duyabiliyorum ama neyin sesi bilmiyorum. Koşmaya başladım, tünel uzadı.' },

  // LUCID (20)
  { title: 'Kontrollü Rüya', category: 'lucid',
    content: 'Uyuduğumu fark ettim ve etrafı değiştirmeye başladım. Gri bir odayı renkli bir bahçeye çevirdim. Uçmak istedim, uçtum. İstediğim kişiyi çağırdım, geldi. Lucid dreaming pratiğimde bugün çok ileri gittim.' },
  { title: 'Rüyada Rüya', category: 'lucid',
    content: 'Rüyamın içinde uyudum ve başka bir rüya gördüm. İçice geçmiş katmanlar. Hangi seviyede olduğumu bilmiyordum. Uyandığımda hâlâ rüyada olup olmadığımdan emin olmak için yüzüme çarptım.' },
  { title: 'Yıldızlara Dokunmak', category: 'lucid',
    content: 'Uzayda yüzüyordum ve yıldızlar dokunma mesafesindeydi. Her dokunuşta titreşiyorlardı, sıcaktılar. Güneş yakınımdı ama yakmıyordu. Evrenin tam ortasında kendimi hem çok küçük hem çok büyük hissettim.' },
  { title: 'Sualtı Şehri', category: 'lucid',
    content: 'Atlantis gibi bir yerdeydim. İnsanlar sualtında yürüyor, yaşıyordu. Baloncuklar havada asılı, mercan binalarda ışıklar yanıyor. Bir kafe buldum ve içeride oturdum, sualtında kahve içtim.' },
  { title: 'Zaman Yolculuğu', category: 'lucid',
    content: "Kendimi 1950'lerin İstanbul'unda buldum. Tramvaylar, taş kaldırımlar. Kendi büyük dedemin genç halini gördüm ve ona yaklaşmak istedim ama her adımda uzaklaşıyordu. Fark ettim ki bu kurgu, değiştirebilirdim." },
  { title: 'Bilinçli Uçuş', category: 'lucid',
    content: 'Uçtuğumu fark ettim ve yönlendirmeye başladım. İstediğim yere gidebiliyordum. Şehrin üzerinden denize, ormana, dağlara. Hız ve yön tamamen bende. Saatlerce uçtum, hiç düşmedim.' },
  { title: 'Yavaş Zaman', category: 'lucid',
    content: 'Zamanı yavaşlatabildim. Düşen bir bardak sonsuz yavaşlıkta düştü. Bu sürede her şeyi düşündüm, hesapladım. Zamanı tekrar başlatınca bardak kırıldı ama ben hazırdım. Güç bu.' },
  { title: 'Geçmişi Değiştirmek', category: 'lucid',
    content: 'Eski bir anıya döndüm ama bu sefer farkındalıkla. Aynı sahne ama ben değişmiştim. Farklı kararlar verdim, farklı şeyler söyledim. Bu rüyadan sonra o anıya yüklediğim anlam da değişti.' },
  { title: 'Yeni Dünya Yaratmak', category: 'lucid',
    content: 'Boş bir uzayda duruyordum. Düşündüm, bir dağ çıktı. Düşündüm, orman büyüdü. Düşündüm, nehir aktı. Yarım saatte kendi dünyamı kurdum. İçinde yaşadım bir süre, sonra unutmadan uyandım.' },
  { title: 'Fizik Kanunlarını Aşmak', category: 'lucid',
    content: 'Rüyada olduğumu fark edince her şeyi denedim. Duvarda yürüdüm, havada asılı kaldım, ışık hızında hareket ettim. Beyin gerçek sanıyor, her his tam. Lucid rüyalar beyin egzersizinin en iyisi.' },
  { title: 'Bilinçdışıyla Konuşmak', category: 'lucid',
    content: 'Rüyamda bir kapı gördüm ve bilerek açtım. İçeride bir figür vardı, ben miyim, başkası mıyım bilemedim. Ona sorular sordum. Cevaplar verdi, bazılarını hatırlıyorum, bazılarını değil. Uyandığımda kendimi tanıdım.' },
  { title: 'Geçmişe Yolculuk', category: 'lucid',
    content: 'Kasıtlı olarak on yıl öncesine gitmek istedim. Gözlerimi kapattım, rüyada, açtım, oradaydım. Eski evim, eski kıyafetlerim. Ama ben şimdiki benim. İki zaman arasında bir yerdeyim, ne yapsam doğru.' },
  { title: 'Sonsuz Merdiven', category: 'lucid',
    content: 'Bir merdiven çıktım, her basamak farklı bir yere açılıyordu. Fark ettim ki bu benim seçimim. Her kapıyı isteyerek açtım. Birinde okyanus, birinde şehir, birinde yıldızlar. Merdiven bitmiyor, bitirmek de istemiyorum.' },
  { title: 'Zihin Haritası', category: 'lucid',
    content: 'Kendi zihnimin haritasını çiziyordum, rüyada. Her bölüm farklı bir anıya, his, fikre karşılık geliyordu. Bazı bölgeler parlak, bazıları karanlık. Karanlık bir köşeye girdim, orada ne sakladığımı gördüm.' },
  { title: 'İki Dünya Arasında', category: 'lucid',
    content: 'Hem uyandım hem uyudum. Odamı gördüm ama rüya karakterleri de hâlâ oradaydı. İki gerçekliği aynı anda yaşadım. Hangisinin gerçek olduğunu seçmek zorundaydım, uyanıklığı seçtim.' },
  { title: 'Bilinçli Çözüm', category: 'lucid',
    content: 'Hayatımdaki bir sorunu rüyamda çözdüm. Bilerek durdum, problemi inceledim, farklı açılardan baktım. Rüyada çözüm buldum ve sabah uyandığımda hâlâ mantıklıydı. Bazen cevaplar uyurken gelir.' },
  { title: 'Hafıza Gezisi', category: 'lucid',
    content: 'Lucid durumda kendi hafızamı gezip çıkmak istedim. Odalar vardı, her biri bir anı. Çocukluğuma gittim, ilk güne, ilk ayrılığa. Gözlemledim, yeniden yaşamadım. Bir arşivci gibi. Sonra geri döndüm.' },
  { title: 'Bilinçdışı Görev', category: 'lucid',
    content: 'Rüyada bir görev belirlemiştim. Belli bir yere gidip belli bir nesneyi bulmak. Lucid olarak gittim, aradım, buldum. Nesne gerçek değildi ama bulma hissi gerçekti. Kendi kendime bir macera yarattım.' },
  { title: 'Soru Cevap', category: 'lucid',
    content: 'Rüya karakterime soru sordum: Sen benim bilinçaltım mısın? Baktı, güldü. Evet, dedi. Ne söylemek istiyorsun diye sordum. Cevap verdi. Hepsini hatırlamıyorum ama bazı şeyleri anladım sabah.' },
  { title: 'Rüyayı Kaydetmek', category: 'lucid',
    content: 'Rüyada bir kamera tuttum ve her şeyi kayıt etmeye çalıştım. Manzaralar, sesler, yüzler. Kamera gerçekçiydi, ekranında görüntü oluşuyordu. Uyandığımda tabii ki kayıt yoktu. Ama o anı hâlâ canlı hatırlıyorum.' },
];

// ─── Intelligence data pools ──────────────────────────────────────────────────

const EMOTIONS_BY_CATEGORY: Record<string, { emotion: string; weight: number }[]> = {
  normal:    [
    { emotion: 'peace', weight: 30 }, { emotion: 'joy', weight: 25 },
    { emotion: 'curiosity', weight: 20 }, { emotion: 'sadness', weight: 15 },
    { emotion: 'confusion', weight: 10 },
  ],
  beautiful: [
    { emotion: 'joy', weight: 40 }, { emotion: 'love', weight: 25 },
    { emotion: 'peace', weight: 20 }, { emotion: 'excitement', weight: 15 },
  ],
  nightmare: [
    { emotion: 'fear', weight: 40 }, { emotion: 'anxiety', weight: 30 },
    { emotion: 'sadness', weight: 20 }, { emotion: 'anger', weight: 10 },
  ],
  lucid: [
    { emotion: 'curiosity', weight: 35 }, { emotion: 'excitement', weight: 30 },
    { emotion: 'joy', weight: 25 }, { emotion: 'peace', weight: 10 },
  ],
};

const INTENSITIES    = ['low', 'moderate', 'high', 'intense', 'overwhelming'];
const INT_WEIGHTS    = [20, 40, 25, 10, 5];

const SYMBOL_POOL: { category: string; manifestation: string }[] = [
  { category: 'water', manifestation: 'deniz' },
  { category: 'water', manifestation: 'okyanus' },
  { category: 'water', manifestation: 'nehir' },
  { category: 'water', manifestation: 'göl' },
  { category: 'water', manifestation: 'yağmur' },
  { category: 'water', manifestation: 'dalga' },
  { category: 'water', manifestation: 'kar' },
  { category: 'sky', manifestation: 'güneş' },
  { category: 'sky', manifestation: 'ay' },
  { category: 'sky', manifestation: 'yıldız' },
  { category: 'sky', manifestation: 'bulut' },
  { category: 'sky', manifestation: 'şimşek' },
  { category: 'sky', manifestation: 'gökkuşağı' },
  { category: 'animal', manifestation: 'at' },
  { category: 'animal', manifestation: 'kartal' },
  { category: 'animal', manifestation: 'yılan' },
  { category: 'animal', manifestation: 'geyik' },
  { category: 'animal', manifestation: 'kelebek' },
  { category: 'animal', manifestation: 'aslan' },
  { category: 'animal', manifestation: 'kuş' },
  { category: 'animal', manifestation: 'balık' },
  { category: 'building', manifestation: 'ev' },
  { category: 'building', manifestation: 'kale' },
  { category: 'building', manifestation: 'kapı' },
  { category: 'building', manifestation: 'pencere' },
  { category: 'building', manifestation: 'merdiven' },
  { category: 'building', manifestation: 'köprü' },
  { category: 'building', manifestation: 'kule' },
  { category: 'vehicle', manifestation: 'araba' },
  { category: 'vehicle', manifestation: 'tren' },
  { category: 'vehicle', manifestation: 'gemi' },
  { category: 'vehicle', manifestation: 'uçak' },
  { category: 'vehicle', manifestation: 'bisiklet' },
  { category: 'plant', manifestation: 'orman' },
  { category: 'plant', manifestation: 'ağaç' },
  { category: 'plant', manifestation: 'gül' },
  { category: 'plant', manifestation: 'çiçek' },
  { category: 'plant', manifestation: 'bahçe' },
  { category: 'object', manifestation: 'ayna' },
  { category: 'object', manifestation: 'anahtar' },
  { category: 'object', manifestation: 'kitap' },
  { category: 'object', manifestation: 'mektup' },
  { category: 'object', manifestation: 'harita' },
  { category: 'object', manifestation: 'saat' },
  { category: 'light', manifestation: 'ışık' },
  { category: 'light', manifestation: 'alev' },
  { category: 'light', manifestation: 'karanlık' },
  { category: 'shadow', manifestation: 'gölge' },
  { category: 'body', manifestation: 'el' },
  { category: 'body', manifestation: 'göz' },
];

const THEMES = [
  { theme: 'dönüşüm', family: 'growth' },
  { theme: 'kaçış', family: 'shadow' },
  { theme: 'arayış', family: 'journey' },
  { theme: 'yeniden bağlanma', family: 'connection' },
  { theme: 'kayıp', family: 'shadow' },
  { theme: 'güç', family: 'growth' },
  { theme: 'özgürlük', family: 'journey' },
  { theme: 'kimlik', family: 'growth' },
  { theme: 'sevgi', family: 'connection' },
  { theme: 'korku', family: 'shadow' },
  { theme: 'keşif', family: 'journey' },
  { theme: 'yenilenme', family: 'growth' },
  { theme: 'bağlantı', family: 'connection' },
  { theme: 'çözüm', family: 'resolution' },
  { theme: 'kabul', family: 'resolution' },
];

const ARCHETYPES = ['shadow', 'child', 'guide', 'hero', 'wise_elder', 'trickster', 'anima', 'animus', 'persona'];
const FIGURE_TYPES = ['yabancı adam', 'yaşlı kadın', 'çocuk', 'savaşçı', 'rehber', 'gölge figür', 'bilge', 'koruyucu', 'kaçınan figür'];

const LOCATIONS = [
  { name: 'ev', type: 'domestic', archetype: 'hearth' },
  { name: 'orman', type: 'nature', archetype: 'wild' },
  { name: 'şehir', type: 'urban', archetype: 'civilization' },
  { name: 'dağ', type: 'nature', archetype: 'threshold' },
  { name: 'deniz kenarı', type: 'nature', archetype: 'boundary' },
  { name: 'okul', type: 'institutional', archetype: 'learning' },
  { name: 'hastane', type: 'institutional', archetype: 'healing' },
  { name: 'tren istasyonu', type: 'transit', archetype: 'transition' },
  { name: 'labirent', type: 'mythic', archetype: 'mystery' },
  { name: 'yabancı şehir', type: 'urban', archetype: 'unknown' },
  { name: 'saray', type: 'mythic', archetype: 'power' },
  { name: 'plaj', type: 'nature', archetype: 'freedom' },
  { name: 'çöl', type: 'nature', archetype: 'emptiness' },
  { name: 'köy', type: 'rural', archetype: 'roots' },
  { name: 'kütüphane', type: 'institutional', archetype: 'knowledge' },
];

const COMMENTS = [
  'Bu rüyayı okurken tüylerim diken diken oldu!',
  'Bende de benzer bir rüya olmuştu, çok tuhaf hissettiriyor.',
  'Lucid rüyalar gerçekten büyüleyici. Sen de fark ettin mi o anı?',
  'Çok güzel anlatmışsın, sanki ben de o rüyadaydım.',
  'Bu tür rüyalar genellikle derin bir anlam taşır bence.',
  'Uçma rüyaları en güzel rüyalar. Seni anlıyorum!',
  'Kabus gibi görünüyor ama anlattığın şekilde bir güzelliği var.',
  'Bu rüyayı yorumlamak istiyorum ama kelime bulamıyorum.',
  'Bilinçaltı çok güçlü bir şey. Bunu okuyunca fark ettim tekrar.',
  'İnanılmaz bir deneyim! Peki uyandıktan sonra nasıl hissettin?',
  'Ben de geçen hafta benzer bir şey yaşadım.',
  'Rüyalarını bu kadar detaylı hatırlamak çok özel bir yetenek.',
  'Okurken nefesim tutuldu. Çok etkileyici.',
  'Bu görüntüler kafamda canlandı, harika yazıyorsun.',
  'Benzer şeyleri ben de yaşıyorum ama anlatamıyordum. Teşekkürler.',
  'Rüyanın sonu nasıl bitti acaba? Merak ettim.',
  'Müthiş bir deneyim olmuş! Tekrar böyle bir rüya görmek ister misin?',
  'Bilinçaltı gerçekten çok karmaşık bir yer.',
  'Umarım bu rüya sana güzel mesajlar veriyordur.',
  'Çok sürükleyici bir anlatım. Okumayı bırakamadım.',
  'Bu rüyayı görmek isterdim doğrusu.',
  'Lucid rüya görebilmek için ne yapıyorsun? Öğrenmek istiyorum.',
  'İçim sıkıştı okurken, özellikle son kısım.',
  'Rüyalar gerçekliğin yansıması mı diye düşünüyorum bazen.',
  'Harika paylaşım, devam et lütfen!',
  'Bu rüyadan sonra gün nasıl geçti?',
  'Renkler çok canlı anlatılmış, gözümde canlandı.',
  'Sınav kabusları bitmez sanırım, mezun olsak da.',
  'Kontrol edememe hissi o kadar gerçekçi ki rüyada.',
  'Yıldızlara dokunabilmek... hayal etmek bile güzel.',
  'Ağaçların dans etmesi çok şiirsel bir imge.',
  'Atlastan çıkmış bir sahne gibi anlatılmış.',
  'Bisiklet yolculuğu rüyaları özgürlük sembolü bence.',
  'Her gece rüya görmek istiyorum bunları okuyunca.',
  'Paylaşmak cesaret ister, tebrikler.',
  'Bu rüya seni nasıl etkiledi ertesi gün?',
  'Çok samimi bir anlatım, teşekkür ederim.',
  'Aynı şeyi yaşıyorum hissettim okuyunca.',
  'Rüyalarımızı paylaşmak güzelmiş demek.',
  'Devam et lütfen, her rüyan bir hikâye.',
];

// ─── Batch insert helper ──────────────────────────────────────────────────────

async function batchInsert(
  db: DataSource,
  sql: string,
  paramSets: unknown[][],
  batchSize = 100,
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < paramSets.length; i += batchSize) {
    const batch = paramSets.slice(i, i + batchSize);
    const colCount = batch[0]!.length;
    const placeholders = batch
      .map((_, ri) =>
        '(' + Array.from({ length: colCount }, (_, ci) => `$${ri * colCount + ci + 1}`).join(',') + ')',
      )
      .join(',');
    const fullSql = sql.replace('__VALUES__', placeholders);
    await db.query(fullSql, batch.flat());
    inserted += batch.length;
  }
  return inserted;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed(db: DataSource): Promise<void> {
  console.log('\n🌙  DreamCloud Seed Data Engine v1\n');

  // ── Guard: already seeded? ─────────────────────────────────────────────────
  const [{ count: existingCount }] = await db.query<[{ count: string }]>(
    `SELECT COUNT(*)::int AS count FROM users WHERE email LIKE '%${SEED_EMAIL_SUFFIX}'`,
  );
  if (Number(existingCount) >= TARGET_USERS) {
    console.log(`✅  Already seeded: ${existingCount} seed users found. Use npm run seed:reset to reset.\n`);
    await printCounts(db);
    return;
  }

  // ─── Phase 1: Users ────────────────────────────────────────────────────────
  console.log(`👥  Generating ${TARGET_USERS} users…`);

  const passwordHash = await bcrypt.hash(DEMO_PASS, 10);
  const nowIso       = new Date().toISOString();

  interface UserRecord {
    id: string;
    email: string;
    username: string;
    displayName: string;
    city: string;
    bio: string;
    createdAt: Date;
  }
  const users: UserRecord[] = [];
  const usedEmails   = new Set<string>();
  const usedUsernames = new Set<string>();

  const allFirstNames = [...MALE_FIRST, ...FEMALE_FIRST];

  for (let i = 0; i < TARGET_USERS; i++) {
    const first    = pick(allFirstNames);
    const last     = pick(LAST_NAMES);
    const baseUser = (first + last).toLowerCase()
      .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
      .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
      .replace(/İ/g,'i').replace(/[^a-z0-9]/g,'');
    let username   = baseUser;
    let suffix     = 1;
    while (usedUsernames.has(username)) username = baseUser + String(suffix++);

    const email    = `${username}${SEED_EMAIL_SUFFIX}`;
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    usedUsernames.add(username);

    const createdAt = randDate(180);
    users.push({
      id:          randomUUID(),
      email,
      username,
      displayName: `${first} ${last}`,
      city:        pick(CITIES),
      bio:         pick(BIOS),
      createdAt,
    });
  }

  // Insert users
  await batchInsert(db,
    `INSERT INTO users (id, email, username, password_hash, is_email_verified, is_active, role, created_at, updated_at)
     VALUES __VALUES__ ON CONFLICT (email) DO NOTHING`,
    users.map(u => [u.id, u.email, u.username, passwordHash, true, true, 'user', u.createdAt.toISOString(), nowIso]),
  );

  // Insert user_profiles
  await batchInsert(db,
    `INSERT INTO user_profiles (id, user_id, display_name, bio, location_city, location_country, is_public, created_at, updated_at)
     VALUES __VALUES__ ON CONFLICT (user_id) DO NOTHING`,
    users.map(u => [randomUUID(), u.id, u.displayName, u.bio, u.city, 'Türkiye', true, nowIso, nowIso]),
  );

  // Insert user_settings
  await batchInsert(db,
    `INSERT INTO user_settings (id, user_id, created_at, updated_at)
     VALUES __VALUES__ ON CONFLICT (user_id) DO NOTHING`,
    users.map(u => [randomUUID(), u.id, nowIso, nowIso]),
  );

  console.log(`  ✓ ${users.length} users created`);

  // ─── Phase 2: Dreams ───────────────────────────────────────────────────────
  console.log(`\n🌙  Generating ${TARGET_DREAMS} dreams…`);

  const CATEGORIES = ['normal','beautiful','nightmare','lucid'];
  const CAT_WEIGHTS = [30,30,25,15];
  const VISIBILITIES = ['public','public','public','followers','private'];

  interface DreamRecord {
    id:         string;
    userId:     string;
    title:      string;
    content:    string;
    category:   string;
    visibility: string;
    dreamedAt:  Date;
    createdAt:  Date;
  }
  const dreams: DreamRecord[] = [];

  for (let i = 0; i < TARGET_DREAMS; i++) {
    const user     = users[i % users.length]!;
    const cat      = weightedPick(CATEGORIES, CAT_WEIGHTS);
    const template = pick(DREAM_POOL.filter(d => d.category === cat));
    const dreamedAt = randDate(180);
    dreams.push({
      id:         randomUUID(),
      userId:     user.id,
      title:      template.title,
      content:    template.content,
      category:   cat,
      visibility: pick(VISIBILITIES),
      dreamedAt,
      createdAt:  dreamedAt,
    });
  }

  await batchInsert(db,
    `INSERT INTO dreams (id, user_id, title, content, category, visibility, is_draft, tags, like_count, comment_count, match_count, save_count, is_moderated, is_hidden, is_featured, view_count, dreamed_at, created_at, updated_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    dreams.map(d => [
      d.id, d.userId, d.title, d.content, d.category,
      d.visibility, false, `{${SEED_TAG}}`,
      0, 0, 0, 0, false, false, false, between(0, 150),
      d.dreamedAt.toISOString(), d.createdAt.toISOString(), d.createdAt.toISOString(),
    ]),
  );

  console.log(`  ✓ ${dreams.length} dreams created`);

  // ─── Phase 3: Dream Analyses (full intelligence data) ──────────────────────
  console.log('\n🧠  Generating AI intelligence data…');

  const analyses: unknown[][] = [];
  const emotions:  unknown[][] = [];
  const symbols:   unknown[][] = [];
  const themes:    unknown[][] = [];
  const figures:   unknown[][] = [];
  const locations: unknown[][] = [];

  for (const dream of dreams) {
    const analysisId = randomUUID();
    const analyzedAt = new Date(dream.createdAt.getTime() + between(60, 3600) * 1000);

    const catEmotions = EMOTIONS_BY_CATEGORY[dream.category] ?? EMOTIONS_BY_CATEGORY['normal']!;
    const primaryEmotion = weightedPick(
      catEmotions.map(e => e.emotion),
      catEmotions.map(e => e.weight),
    );
    const primaryTheme = pick(THEMES);

    // dream_analyses
    analyses.push([
      analysisId, dream.id, 'completed', 'claude-3-5-sonnet',
      analyzedAt.toISOString(), primaryTheme.theme, primaryEmotion,
      weightedPick(INTENSITIES, INT_WEIGHTS),
      nowIso, nowIso,
    ]);

    // dream_emotions (2-4 per dream)
    const emotionCount = between(2, 4);
    const usedEmotions = new Set<string>();
    const catEm = catEmotions.map(e => e.emotion);
    const allEmotions = ['joy','fear','sadness','anger','anxiety','peace','love','curiosity','confusion','excitement','grief','surprise'];
    let isPrimary = true;
    for (let e = 0; e < emotionCount; e++) {
      const emo = usedEmotions.size < catEm.length
        ? weightedPick(catEm.filter(em => !usedEmotions.has(em)), catEmotions.filter(em => !usedEmotions.has(em.emotion)).map(em => em.weight))
        : pick(allEmotions.filter(em => !usedEmotions.has(em)));
      if (usedEmotions.has(emo)) continue;
      usedEmotions.add(emo);
      emotions.push([
        randomUUID(), dream.id, emo,
        weightedPick(INTENSITIES, INT_WEIGHTS),
        isPrimary, false, nowIso,
      ]);
      isPrimary = false;
    }

    // dream_symbols (2-5 per dream)
    const symCount = between(2, 5);
    const usedSyms = new Set<string>();
    for (let s = 0; s < symCount; s++) {
      const sym = pick(SYMBOL_POOL.filter(sy => !usedSyms.has(sy.manifestation)));
      if (usedSyms.has(sym.manifestation)) continue;
      usedSyms.add(sym.manifestation);
      symbols.push([
        randomUUID(), dream.id, sym.category, sym.manifestation,
        pick(['dönüşüm','baskı','bağlantı','özgürlük','korku','güç']),
        pick(['giriş','dönüm noktası','final','arka plan']),
        seededRand() > 0.7,
        Math.round((0.5 + seededRand() * 0.5) * 100) / 100,
        nowIso,
      ]);
    }

    // dream_themes (1-3 per dream)
    const themeCount = between(1, 3);
    const usedThemes = new Set<string>();
    for (let t = 0; t < themeCount; t++) {
      const th = pick(THEMES.filter(tm => !usedThemes.has(tm.theme)));
      usedThemes.add(th.theme);
      themes.push([
        randomUUID(), dream.id, th.theme, th.family,
        t === 0, Math.round((0.6 + seededRand() * 0.4) * 100) / 100, nowIso,
      ]);
    }

    // dream_figures (40% of dreams have figures)
    if (seededRand() < 0.40) {
      const figCount = between(1, 2);
      for (let f = 0; f < figCount; f++) {
        const archetype = seededRand() < 0.7 ? pick(ARCHETYPES) : null;
        figures.push([
          randomUUID(), dream.id,
          pick(FIGURE_TYPES),
          seededRand() < 0.3,
          pick(['aile','yabancı','otorite','arkadaş',null]),
          archetype,
          archetype ? Math.round((0.5 + seededRand() * 0.5) * 100) / 100 : null,
          pick(['antagonist','yardımcı','gözlemci','kılavuz']),
          nowIso,
        ]);
      }
    }

    // dream_locations (1-2 per dream)
    const locCount = between(1, 2);
    for (let l = 0; l < locCount; l++) {
      const loc = pick(LOCATIONS);
      locations.push([
        randomUUID(), dream.id, l + 1,
        loc.name, pick(['iç mekân','dış mekân','yer','geçiş']),
        loc.archetype,
        pick(['huzur','korku','merak','yabancılık','özgürlük']),
        seededRand() < 0.2,
        null, nowIso,
      ]);
    }
  }

  // Insert dream_analyses
  await batchInsert(db,
    `INSERT INTO dream_analyses (id, dream_id, status, model_version, analyzed_at, primary_theme, primary_emotion, emotional_intensity, created_at, updated_at)
     VALUES __VALUES__ ON CONFLICT (dream_id) DO NOTHING`,
    analyses,
  );

  // Insert dream_emotions
  await batchInsert(db,
    `INSERT INTO dream_emotions (id, dream_id, emotion, intensity, is_primary, is_residual, created_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    emotions,
  );

  // Insert dream_symbols
  await batchInsert(db,
    `INSERT INTO dream_symbols (id, dream_id, symbol_category, manifestation, emotional_context, narrative_function, is_universal, confidence, created_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    symbols,
  );

  // Insert dream_themes
  await batchInsert(db,
    `INSERT INTO dream_themes (id, dream_id, theme, theme_family, is_primary, confidence, created_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    themes,
  );

  // Insert dream_figures
  await batchInsert(db,
    `INSERT INTO dream_figures (id, dream_id, figure_type, is_known, relationship_type, archetype_candidate, archetype_confidence, narrative_role, created_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    figures,
  );

  // Insert dream_locations
  await batchInsert(db,
    `INSERT INTO dream_locations (id, dream_id, location_tier, name, location_type, archetype_type, emotional_tone, is_distorted, geographic_hint, created_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    locations,
  );

  console.log(`  ✓ ${analyses.length} analyses, ${emotions.length} emotions, ${symbols.length} symbols`);
  console.log(`  ✓ ${themes.length} themes, ${figures.length} figures, ${locations.length} locations`);

  // ─── Phase 4: Likes ────────────────────────────────────────────────────────
  console.log(`\n❤️   Generating ${TARGET_LIKES} likes…`);

  const publicDreams = dreams.filter(d => d.visibility === 'public');
  const likeSet  = new Set<string>();
  const likeRows: unknown[][] = [];

  while (likeRows.length < TARGET_LIKES && likeSet.size < users.length * publicDreams.length) {
    const dream  = pick(publicDreams);
    const user   = pick(users);
    if (user.id === dream.userId) continue;
    const key = `${user.id}:${dream.id}`;
    if (likeSet.has(key)) continue;
    likeSet.add(key);
    const likedAt = new Date(Math.max(dream.createdAt.getTime(), user.createdAt.getTime()) + between(60, 86400) * 1000);
    likeRows.push([randomUUID(), user.id, dream.id, likedAt.toISOString()]);
  }

  await batchInsert(db,
    `INSERT INTO dream_likes (id, user_id, dream_id, created_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    likeRows,
  );
  console.log(`  ✓ ${likeRows.length} likes`);

  // ─── Phase 5: Saves ────────────────────────────────────────────────────────
  const saveSet  = new Set<string>();
  const saveRows: unknown[][] = [];
  const TARGET_SAVES = Math.floor(TARGET_LIKES * 0.4);

  while (saveRows.length < TARGET_SAVES) {
    const dream = pick(publicDreams);
    const user  = pick(users);
    if (user.id === dream.userId) continue;
    const key = `${user.id}:${dream.id}`;
    if (saveSet.has(key)) continue;
    saveSet.add(key);
    const savedAt = new Date(Math.max(dream.createdAt.getTime(), user.createdAt.getTime()) + between(60, 86400) * 1000);
    saveRows.push([randomUUID(), user.id, dream.id, savedAt.toISOString()]);
  }

  await batchInsert(db,
    `INSERT INTO dream_saves (id, user_id, dream_id, created_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    saveRows,
  );
  console.log(`  ✓ ${saveRows.length} saves`);

  // ─── Phase 6: Comments ─────────────────────────────────────────────────────
  console.log(`\n💬  Generating ${TARGET_COMMENTS} comments…`);

  const commentRows: unknown[][] = [];
  const commentSet  = new Set<string>();

  while (commentRows.length < TARGET_COMMENTS) {
    const dream   = pick(publicDreams);
    const user    = pick(users);
    if (user.id === dream.userId) continue;
    const content = pick(COMMENTS);
    const key     = `${user.id}:${dream.id}:${content.slice(0,20)}`;
    if (commentSet.has(key)) continue;
    commentSet.add(key);
    const commentedAt = new Date(Math.max(dream.createdAt.getTime(), user.createdAt.getTime()) + between(60, 604800) * 1000);
    commentRows.push([randomUUID(), dream.id, user.id, content, commentedAt.toISOString(), commentedAt.toISOString()]);
  }

  await batchInsert(db,
    `INSERT INTO dream_comments (id, dream_id, user_id, content, created_at, updated_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    commentRows,
  );
  console.log(`  ✓ ${commentRows.length} comments`);

  // ─── Phase 7: Follows ──────────────────────────────────────────────────────
  console.log(`\n🤝  Generating ${TARGET_FOLLOWS} follows…`);

  const followSet  = new Set<string>();
  const followRows: unknown[][] = [];

  while (followRows.length < TARGET_FOLLOWS) {
    const follower  = pick(users);
    const following = pick(users);
    if (follower.id === following.id) continue;
    const key = `${follower.id}:${following.id}`;
    if (followSet.has(key)) continue;
    followSet.add(key);
    const followedAt = new Date(Math.max(follower.createdAt.getTime(), following.createdAt.getTime()) + between(60, 86400) * 1000);
    followRows.push([randomUUID(), follower.id, following.id, followedAt.toISOString()]);
  }

  await batchInsert(db,
    `INSERT INTO user_follows (id, follower_id, following_id, created_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    followRows,
  );
  console.log(`  ✓ ${followRows.length} follows`);

  // ─── Phase 8: Dream Matches ────────────────────────────────────────────────
  console.log(`\n🔗  Generating ${TARGET_MATCHES} dream matches…`);

  const matchSet  = new Set<string>();
  const matchRows: unknown[][] = [];
  const RESONANCE_LEVELS = ['signal','echo','resonance','deep','cosmic'];
  const RES_WEIGHTS      = [25,30,25,15,5];

  while (matchRows.length < TARGET_MATCHES) {
    const dA = pick(dreams);
    const dB = pick(dreams);
    if (dA.userId === dB.userId) continue;
    if (dA.id === dB.id) continue;

    const idA = dA.id < dB.id ? dA.id : dB.id;
    const idB = dA.id < dB.id ? dB.id : dA.id;
    const uA  = dA.id < dB.id ? dA.userId : dB.userId;
    const uB  = dA.id < dB.id ? dB.userId : dA.userId;

    const key = `${idA}:${idB}`;
    if (matchSet.has(key)) continue;
    matchSet.add(key);

    const resLevel  = weightedPick(RESONANCE_LEVELS, RES_WEIGHTS);
    const baseScore = resLevel === 'cosmic'     ? between(80,90) :
                      resLevel === 'deep'       ? between(65,79) :
                      resLevel === 'resonance'  ? between(50,64) :
                      resLevel === 'echo'       ? between(35,49) : between(15,34);

    const themeScore   = between(0, 100) / 100;
    const emotionScore = between(0, 100) / 100;
    const symbolScore  = between(0, 100) / 100;
    const archScore    = between(0, 100) / 100;

    const sharedThemes   = pickN(['dönüşüm','kaçış','arayış','özgürlük','korku','sevgi'], between(0,3)).join(',');
    const sharedEmotions = pickN(['joy','fear','anxiety','peace','sadness','love'], between(0,3)).join(',');
    const sharedSymbols  = pickN(['deniz','güneş','ev','yıldız','orman','kapı'], between(0,3)).join(',');
    const sharedArch     = pickN(ARCHETYPES, between(0,2)).join(',');

    const matchedAt = randDate(180);
    matchRows.push([
      randomUUID(), idA, idB, uA, uB,
      baseScore, resLevel,
      themeScore, emotionScore, symbolScore, between(0,100)/100, archScore,
      `{${sharedThemes}}`, `{${sharedEmotions}}`, `{${sharedSymbols}}`, '{}', `{${sharedArch}}`,
      matchedAt.toISOString(), matchedAt.toISOString(), matchedAt.toISOString(),
    ]);
  }

  await batchInsert(db,
    `INSERT INTO dream_matches (id, dream_id_a, dream_id_b, user_id_a, user_id_b, match_score, resonance_level, theme_score, emotion_score, symbol_score, location_score, archetype_score, shared_themes, shared_emotions, shared_symbols, shared_locations, shared_archetypes, calculated_at, created_at, updated_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    matchRows,
  );
  console.log(`  ✓ ${matchRows.length} dream matches`);

  // ─── Phase 9: Dream Connections ────────────────────────────────────────────
  console.log(`\n🌐  Generating dream connections…`);

  // Build connections from unique user pairs in matches
  const userPairs = new Map<string, { uA: string; uB: string; count: number; maxScore: number }>();
  for (const r of matchRows) {
    const uA    = r[3] as string;
    const uB    = r[4] as string;
    const score = r[5] as number;
    const id1   = uA < uB ? uA : uB;
    const id2   = uA < uB ? uB : uA;
    const key   = `${id1}:${id2}`;
    const ex    = userPairs.get(key);
    if (ex) {
      ex.count++;
      if (score > ex.maxScore) ex.maxScore = score;
    } else {
      userPairs.set(key, { uA: id1, uB: id2, count: 1, maxScore: score });
    }
  }

  const CONNECTION_LEVELS = ['signal','echo','resonance','bond','deep'];
  const connectionRows: unknown[][] = [];

  for (const [_, pair] of userPairs) {
    const level = pair.maxScore >= 80 ? 'deep' :
                  pair.maxScore >= 60 ? 'bond' :
                  pair.maxScore >= 45 ? 'resonance' :
                  pair.maxScore >= 30 ? 'echo' : 'signal';
    const firstSeen = randDate(180);
    const lastSeen  = new Date(firstSeen.getTime() + between(0, 30) * 86400000);
    connectionRows.push([
      randomUUID(), pair.uA, pair.uB,
      Math.round(pair.maxScore), pair.count, level,
      firstSeen.toISOString(), lastSeen.toISOString(),
    ]);
  }

  // Add extra random connections up to TARGET_CONNECTIONS
  const connSet = new Set(connectionRows.map(r => `${r[1]}:${r[2]}`));
  while (connectionRows.length < TARGET_CONNECTIONS) {
    const uA = pick(users);
    const uB = pick(users);
    if (uA.id === uB.id) continue;
    const id1 = uA.id < uB.id ? uA.id : uB.id;
    const id2 = uA.id < uB.id ? uB.id : uA.id;
    const key = `${id1}:${id2}`;
    if (connSet.has(key)) continue;
    connSet.add(key);
    const score = between(15, 60);
    const level = pick(CONNECTION_LEVELS);
    const firstSeen = randDate(180);
    const lastSeen  = new Date(firstSeen.getTime() + between(0, 14) * 86400000);
    connectionRows.push([randomUUID(), id1, id2, score, between(1,3), level, firstSeen.toISOString(), lastSeen.toISOString()]);
  }

  await batchInsert(db,
    `INSERT INTO dream_connections (id, user_id_a, user_id_b, connection_score, mutual_dreams, level, first_seen_at, last_seen_at)
     VALUES __VALUES__ ON CONFLICT DO NOTHING`,
    connectionRows,
  );
  console.log(`  ✓ ${connectionRows.length} dream connections`);

  // ─── Phase 10: User Resonance Scores ──────────────────────────────────────
  console.log('\n⚡  Computing user resonance scores…');

  const resonanceRows: unknown[][] = [];
  const RESONANCE_PROFILE_LEVELS = ['dormant','signal','echo','resonance','deep','cosmic'];

  for (const user of users) {
    const connectionCount = connectionRows.filter(r => r[1] === user.id || r[2] === user.id).length;
    const userMatches     = matchRows.filter(r => (r[3] as string) === user.id || (r[4] as string) === user.id);
    const avgScore        = userMatches.length > 0
      ? userMatches.reduce((s, r) => s + (r[5] as number), 0) / userMatches.length
      : 0;

    const level = avgScore >= 75 ? 'cosmic' :
                  avgScore >= 60 ? 'deep'   :
                  avgScore >= 45 ? 'resonance' :
                  avgScore >= 30 ? 'echo'   :
                  connectionCount > 0 ? 'signal' : 'dormant';

    resonanceRows.push([
      randomUUID(), user.id, level,
      Math.round((seededRand() * 80 + 20) * 10) / 10,
      Math.round((seededRand() * 80 + 20) * 10) / 10,
      connectionCount,
      Math.round(avgScore * 10) / 10,
      new Date().toISOString(),
    ]);
  }

  await batchInsert(db,
    `INSERT INTO user_resonance_scores (id, user_id, resonance_level, collective_alignment, dream_uniqueness_score, connection_count, avg_match_score, computed_at)
     VALUES __VALUES__ ON CONFLICT (user_id) DO UPDATE SET
       resonance_level = EXCLUDED.resonance_level,
       collective_alignment = EXCLUDED.collective_alignment,
       connection_count = EXCLUDED.connection_count,
       avg_match_score = EXCLUDED.avg_match_score,
       computed_at = EXCLUDED.computed_at`,
    resonanceRows,
  );
  console.log(`  ✓ ${resonanceRows.length} resonance scores`);

  // ─── Phase 11: Seen In Dreams ──────────────────────────────────────────────
  console.log(`\n👁   Generating ${TARGET_SEEN} seen-in-dreams patterns…`);

  const seenSet  = new Set<string>();
  const seenRows: unknown[][] = [];

  // Symbol patterns (most common symbols across dreamers)
  const symFreq = new Map<string, { users: Set<string>; count: number }>();
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i]!;
    const dreamId = sym[1] as string;
    const mani    = sym[3] as string;
    const dream   = dreams.find(d => d.id === dreamId);
    if (!dream) continue;
    const ex = symFreq.get(mani) ?? { users: new Set(), count: 0 };
    ex.users.add(dream.userId);
    ex.count++;
    symFreq.set(mani, ex);
  }

  const topSymbols = [...symFreq.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 60);
  for (const [mani, data] of topSymbols) {
    if (seenSet.has(`symbol:${mani}`)) continue;
    seenSet.add(`symbol:${mani}`);
    const sampleUsers = [...data.users].slice(0, 5);
    seenRows.push([
      randomUUID(), 'symbol', mani,
      data.users.size, data.count,
      Math.round((0.5 + seededRand() * 0.5) * 100) / 100,
      `{${sampleUsers.map((u: string) => `"${u}"`).join(',')}}`,
      new Date().toISOString(), new Date().toISOString(),
    ]);
    if (seenRows.length >= TARGET_SEEN) break;
  }

  // Archetype patterns
  const archFreq = new Map<string, { users: Set<string>; count: number }>();
  for (const fig of figures) {
    const archetype = fig[5] as string | null;
    if (!archetype) continue;
    const dreamId = fig[1] as string;
    const dream   = dreams.find(d => d.id === dreamId);
    if (!dream) continue;
    const ex = archFreq.get(archetype) ?? { users: new Set(), count: 0 };
    ex.users.add(dream.userId);
    ex.count++;
    archFreq.set(archetype, ex);
  }

  for (const [arch, data] of archFreq.entries()) {
    if (seenRows.length >= TARGET_SEEN) break;
    if (seenSet.has(`archetype:${arch}`)) continue;
    seenSet.add(`archetype:${arch}`);
    const sampleUsers = [...data.users].slice(0, 5);
    seenRows.push([
      randomUUID(), 'archetype', arch,
      data.users.size, data.count,
      Math.round((0.5 + seededRand() * 0.5) * 100) / 100,
      `{${sampleUsers.map((u: string) => `"${u}"`).join(',')}}`,
      new Date().toISOString(), new Date().toISOString(),
    ]);
  }

  // Location patterns
  const locFreq = new Map<string, { users: Set<string>; count: number }>();
  for (const loc of locations) {
    const name = loc[3] as string;
    if (!name) continue;
    const dreamId = loc[1] as string;
    const dream   = dreams.find(d => d.id === dreamId);
    if (!dream) continue;
    const ex = locFreq.get(name) ?? { users: new Set(), count: 0 };
    ex.users.add(dream.userId);
    ex.count++;
    locFreq.set(name, ex);
  }

  for (const [locName, data] of locFreq.entries()) {
    if (seenRows.length >= TARGET_SEEN) break;
    if (seenSet.has(`place:${locName}`)) continue;
    seenSet.add(`place:${locName}`);
    const sampleUsers = [...data.users].slice(0, 5);
    seenRows.push([
      randomUUID(), 'place', locName,
      data.users.size, data.count,
      Math.round((0.4 + seededRand() * 0.5) * 100) / 100,
      `{${sampleUsers.map((u: string) => `"${u}"`).join(',')}}`,
      new Date().toISOString(), new Date().toISOString(),
    ]);
  }

  await batchInsert(db,
    `INSERT INTO seen_in_dreams (id, pattern_type, pattern_value, user_count, dream_count, confidence_score, sample_usernames, last_seen_at, computed_at)
     VALUES __VALUES__ ON CONFLICT (pattern_type, pattern_value) DO UPDATE SET
       user_count = EXCLUDED.user_count,
       dream_count = EXCLUDED.dream_count,
       last_seen_at = EXCLUDED.last_seen_at`,
    seenRows,
  );
  console.log(`  ✓ ${seenRows.length} seen-in-dreams patterns`);

  // ─── Phase 12: Sync counts ──────────────────────────────────────────────────
  console.log('\n🔢  Syncing counts…');

  await db.query(`
    UPDATE dreams d SET
      like_count    = (SELECT COUNT(*) FROM dream_likes    WHERE dream_id = d.id),
      save_count    = (SELECT COUNT(*) FROM dream_saves    WHERE dream_id = d.id),
      comment_count = (SELECT COUNT(*) FROM dream_comments WHERE dream_id = d.id AND deleted_at IS NULL)
    WHERE id = ANY(ARRAY(SELECT DISTINCT dream_id FROM dream_likes
      UNION SELECT DISTINCT dream_id FROM dream_saves
      UNION SELECT DISTINCT dream_id FROM dream_comments WHERE deleted_at IS NULL))
  `);

  await db.query(`
    UPDATE user_profiles up SET
      dream_count    = (SELECT COUNT(*) FROM dreams WHERE user_id = up.user_id AND deleted_at IS NULL),
      follower_count = (SELECT COUNT(*) FROM user_follows WHERE following_id = up.user_id),
      following_count= (SELECT COUNT(*) FROM user_follows WHERE follower_id  = up.user_id)
    WHERE user_id = ANY(ARRAY(SELECT DISTINCT id FROM users WHERE email LIKE '%${SEED_EMAIL_SUFFIX}'))
  `);

  console.log('  ✓ Counts synced');

  // ─── Summary ────────────────────────────────────────────────────────────────
  await printCounts(db);
}

async function printCounts(db: DataSource): Promise<void> {
  const queries = [
    [`SELECT COUNT(*) FROM users WHERE email LIKE '%${SEED_EMAIL_SUFFIX}'`, 'Seed users'],
    [`SELECT COUNT(*) FROM dreams WHERE '${SEED_TAG}' = ANY(tags) AND deleted_at IS NULL`, 'Seed dreams'],
    [`SELECT COUNT(*) FROM dream_emotions`, 'Dream emotions'],
    [`SELECT COUNT(*) FROM dream_symbols`, 'Dream symbols'],
    [`SELECT COUNT(*) FROM dream_themes`, 'Dream themes'],
    [`SELECT COUNT(*) FROM dream_figures`, 'Dream figures'],
    [`SELECT COUNT(*) FROM dream_locations`, 'Dream locations'],
    [`SELECT COUNT(*) FROM dream_likes`, 'Likes'],
    [`SELECT COUNT(*) FROM dream_saves`, 'Saves'],
    [`SELECT COUNT(*) FROM dream_comments WHERE deleted_at IS NULL`, 'Comments'],
    [`SELECT COUNT(*) FROM user_follows`, 'Follows'],
    [`SELECT COUNT(*) FROM dream_matches`, 'Dream matches'],
    [`SELECT COUNT(*) FROM dream_connections`, 'Dream connections'],
    [`SELECT COUNT(*) FROM user_resonance_scores`, 'Resonance scores'],
    [`SELECT COUNT(*) FROM seen_in_dreams`, 'Seen-in-dreams patterns'],
  ];

  console.log('\n📊  Final counts:');
  for (const [sql, label] of queries) {
    const [{ count }] = await db.query<[{ count: string }]>(sql as string);
    console.log(`   ${String(label).padEnd(28)} ${count}`);
  }
  console.log(`\n   Demo password: ${DEMO_PASS}`);
  console.log(`   Email pattern:  *${SEED_EMAIL_SUFFIX}\n`);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

(async () => {
  let ds: DataSource | null = null;
  try {
    ds = await AppDataSource.initialize();
    await seed(ds);
  } catch (err) {
    console.error('\n❌  Seed failed:', err);
    process.exit(1);
  } finally {
    if (ds?.isInitialized) await ds.destroy();
  }
})();
