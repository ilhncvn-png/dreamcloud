/**
 * Development-only seed script.
 * Run: cd apps/api && npm run seed
 * Safe to run multiple times (idempotent).
 */

import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import AppDataSource from '../../config/database.config';
import { DreamComment } from '../../modules/comments/entities/dream-comment.entity';
import { Notification } from '../../modules/notifications/entities/notification.entity';
import { User } from '../../modules/users/entities/user.entity';
import { UserProfile } from '../../modules/users/entities/user-profile.entity';
import { UserFollow } from '../../modules/users/entities/user-follow.entity';
import { Dream } from '../../modules/dreams/entities/dream.entity';
import { DreamLike } from '../../modules/dreams/entities/dream-like.entity';
import { DreamSave } from '../../modules/dreams/entities/dream-save.entity';
import { DreamCategory, DreamVisibility, NotificationType } from '../../common/enums/database.enums';

// ─── Guard ───────────────────────────────────────────────────────────────────

if (process.env['NODE_ENV'] === 'production') {
  console.error('❌  Seed script is disabled in production.');
  process.exit(1);
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const DEMO_PASSWORD = 'DemoUser99!';
const SEED_TAG = 'seed-demo-v1';

interface UserSeed {
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
}

// Avatar photos: randomuser.me stable portrait URLs
// Males  → /men/N.jpg  |  Females → /women/N.jpg
const USERS: UserSeed[] = [
  { email: 'ahmet@dreamcloud.dev',  username: 'ahmet',  displayName: 'Ahmet Yılmaz', bio: 'Lucid rüyalar peşinde koşuyorum. Her gece yeni bir macera.',                             avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg'   },
  { email: 'mehmet@dreamcloud.dev', username: 'mehmet', displayName: 'Mehmet Kaya',  bio: 'Her gece farklı dünyalar keşfederim. Rüya günlüğümü burada paylaşıyorum.',              avatarUrl: 'https://randomuser.me/api/portraits/men/64.jpg'   },
  { email: 'elif@dreamcloud.dev',   username: 'elif',   displayName: 'Elif Şahin',   bio: 'Rüyalar benim kılavuzum. Bilinçaltının sesi bizi nereye götürür?',                      avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { email: 'zeynep@dreamcloud.dev', username: 'zeynep', displayName: 'Zeynep Demir', bio: 'Gece dünyasının seyyahı. Güzel ve korkunç rüyaları severek yaşıyorum.',                  avatarUrl: 'https://randomuser.me/api/portraits/women/65.jpg' },
  { email: 'mert@dreamcloud.dev',   username: 'mert',   displayName: 'Mert Çelik',   bio: 'Kabus ve güzellik bir arada. Rüyalarım bazen beni korkutur, bazen büyüler.',             avatarUrl: 'https://randomuser.me/api/portraits/men/45.jpg'   },
  { email: 'deniz@dreamcloud.dev',  username: 'deniz',  displayName: 'Deniz Arslan', bio: 'Denizden gelen rüyalar. Su ve özgürlük temalarım hiç bitmiyor.',                         avatarUrl: 'https://randomuser.me/api/portraits/women/31.jpg' },
  { email: 'selin@dreamcloud.dev',  username: 'selin',  displayName: 'Selin Kurt',   bio: 'Bilinçaltının sesi. Psikolog olarak rüyaları bilimsel gözle inceliyorum.',               avatarUrl: 'https://randomuser.me/api/portraits/women/52.jpg' },
  { email: 'ece@dreamcloud.dev',    username: 'ece',    displayName: 'Ece Aydın',    bio: 'Rüya günlüğü tutuyorum yıllardır. Binlerce rüya, binlerce hikâye.',                     avatarUrl: 'https://randomuser.me/api/portraits/women/22.jpg' },
  { email: 'can@dreamcloud.dev',    username: 'can',    displayName: 'Can Öztürk',   bio: 'Uçmak, yüzmek, kaybolmak. Rüyalarım hep özgürlük temalı.',                              avatarUrl: 'https://randomuser.me/api/portraits/men/11.jpg'   },
  { email: 'naz@dreamcloud.dev',    username: 'naz',    displayName: 'Naz Yıldız',   bio: 'Gece yarısı düşünceleri ve rüyaların kesiştiği yerde yaşıyorum.',                       avatarUrl: 'https://randomuser.me/api/portraits/women/17.jpg' },
];

interface DreamSeed {
  title: string;
  content: string;
  category: DreamCategory;
  visibility: DreamVisibility;
  tags: string[];
  daysAgo: number;
}

const DREAMS_PER_USER: DreamSeed[][] = [
  // ahmet
  [
    { title: 'Gökyüzünde Uçuş', content: 'Rüyamda uçtuğumu fark ettiğim an inanılmaz bir özgürlük hissettim. Şehrin üzerinden süzülüyordum, aşağıdaki binalar minik oyuncaklar gibiydi. Hız arttıkça bir korku değil, saf bir mutluluk geldi içime. Bulutların arasına daldım ve orada beni bekleyen rengarenk bir dünya vardı.', category: DreamCategory.LUCID, visibility: DreamVisibility.PUBLIC, tags: ['uçuş', 'lucid', 'özgürlük'], daysAgo: 2 },
    { title: 'Kaybolmuş Şehir', content: 'Hiç bilmediğim eski bir şehirdeydim. Taş sokaklar, yüksek kuleler. Kayboldum ama korkmadım. Her köşede yeni bir sır vardı. Sonunda denize çıkan bir kapı buldum ve deniz bitmek bilmiyordu.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['şehir', 'keşif', 'deniz'], daysAgo: 7 },
    { title: 'Sınav Paniği', content: 'Üniversite sınavındayım, hiçbir şey bilmiyorum. Kalem elimden düşüyor, sayfalar boş. Zaman daralıyor ve ben hâlâ ilk soruya bakıyorum. Klasik kabus ama o kadar gerçek hissettiriyor ki.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['sınav', 'kabus', 'panik'], daysAgo: 14 },
    { title: 'Eski Ev', content: 'Çocukluğumun evi ama biraz farklı. Odalar daha büyük, koridorlar uzuyor. Annem mutfakta bir şeyler pişiriyor, kokusu tüm evi sarıyor. Sıradan ama huzur veren bir rüya.', category: DreamCategory.NORMAL, visibility: DreamVisibility.FOLLOWERS, tags: ['ev', 'aile', 'çocukluk'], daysAgo: 21 },
    { title: 'Kontrolsüz Araba', content: 'Direksiyon elimde ama araba gitgide hızlanıyor, fren tutmuyor. Yolda kimse yok ama virajlar gelmeye devam ediyor. Sonunda uyandım, kalp atışlarım çılgın gibiydi.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['araba', 'kabus', 'kontrol'], daysAgo: 5 },
  ],
  // mehmet
  [
    { title: 'Derin Deniz', content: 'Okyanusun dibine iniyordum, ama boğulmuyordum. Soluyabiliyordum sanki balıklar gibi. Dev renkli mercanlar, yarı saydam denizanalarıyla çevriliydim. Işık yukarıdan geliyordu ve her şey mavi bir masalı andırıyordu.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['deniz', 'su', 'güzellik'], daysAgo: 1 },
    { title: 'Zaman Yolculuğu', content: "Kendimi 1950'lerin İstanbul'unda buldum. Tramvaylar, ferace giyen kadınlar, taş kaldırımlar. Kendi büyük dedemin genç halini gördüm ve ona yaklaşmak istedim ama her adımda uzaklaşıyordu.", category: DreamCategory.LUCID, visibility: DreamVisibility.PUBLIC, tags: ['tarih', 'istanbul', 'zaman'], daysAgo: 9 },
    { title: 'Boş Tren İstasyonu', content: 'Gece yarısı bir istasyondaydım. Tren gelecek ama ne zaman belli değil. Tabelalar farklı dillerde yazıyor, hiçbirini anlayamıyorum. Beklemek hem yorucu hem de huzurlu.', category: DreamCategory.NORMAL, visibility: DreamVisibility.FOLLOWERS, tags: ['tren', 'istasyon', 'bekleme'], daysAgo: 16 },
    { title: 'Düşen Dişler', content: 'En klasik kabusum. Dişlerim birer birer döküldü. Elimde tutuyorum, yerine koymaya çalışıyorum ama tutmuyorlar. Bu rüyanın ardından genellikle kaygılı bir gün geçiriyorum.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['diş', 'kabus', 'klasik'], daysAgo: 23 },
  ],
  // elif
  [
    { title: 'Orman Yolculuğu', content: 'Yoğun bir ormanın içindeyim, güneş ışıkları yapraklar arasından süzülüyor. Yol göstericim bir beyaz geyik. Nereye gittiğimi bilmiyorum ama takip etmek zorunda hissediyorum kendimi. Orman giderek büyülü bir hal alıyor.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['orman', 'doğa', 'geyik'], daysAgo: 3 },
    { title: 'Kontrollü Rüya', content: 'Uyuduğumu fark ettim ve etrafı değiştirmeye başladım. Gri bir odayı renkli bir bahçeye çevirdim. Uçmak istedim, uçtum. İstediğim kişiyi çağırdım, geldi. Lucid dreaming pratiğimde bugün çok ileri gittim.', category: DreamCategory.LUCID, visibility: DreamVisibility.PUBLIC, tags: ['lucid', 'kontrol', 'pratik'], daysAgo: 6 },
    { title: 'Karanlık Koridor', content: 'Sonsuz bir koridor. Kapılar var ama hiçbirini açamıyorum. Arkamdan adım sesleri geliyor ama döndüğümde kimse yok. Koşmaya çalışıyorum ama yavaş ilerliyorum sanki su içinde yürüyorum.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['koridor', 'kabus', 'kaçış'], daysAgo: 11 },
    { title: 'Kafe Buluşması', content: 'Eski bir arkadaşımla kafede oturuyoruz. Sıradan bir sohbet, sıradan bir kahve. Ama rüyadan uyandığımda o arkadaşın beni ne kadar özlediğimi fark ettim. Bazen normal rüyalar en derin mesajları taşıyor.', category: DreamCategory.NORMAL, visibility: DreamVisibility.FOLLOWERS, tags: ['kafe', 'arkadaş', 'sohbet'], daysAgo: 18 },
  ],
  // zeynep
  [
    { title: 'Uçan Balıklar', content: 'Gökyüzünde balıklar yüzüyordu. Pembe, mor, altın renkli büyük balıklar. Ben de onların arasına karışıp yüzüyordum. Hiç mantıklı değil ama inanılmaz güzeldi. Uyandığımda gülümseyerek kalktım.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['balık', 'gökyüzü', 'fantezi'], daysAgo: 2 },
    { title: 'Hız Treni', content: 'Çok hızlı giden bir trendeyim. Pencereden manzara bulanık, duraklar geçip gidiyor. İnmem gereken yeri kaçırdım, bir sonraki durak da geçti. Tren durmuyor ve ben gitgide daha uzaklaşıyorum.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['tren', 'hız', 'kaybolmak'], daysAgo: 8 },
    { title: 'Büyükanne Bahçesi', content: 'Büyükannemin bahçesindeyim, çocuk gibi. Domates ve biber kokusu. Güneş yanıyor ama sıcak değil. Büyükannem bana bir şeyler anlatıyor, sesi geliyor ama kelimeleri duyamıyorum. Uyandığımda gözlerim ıslaktı.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.FOLLOWERS, tags: ['aile', 'özlem', 'bahçe'], daysAgo: 13 },
    { title: 'Kayıp Çanta', content: 'Havalimanındayım, uçağım kalkıyor ama çantam kayboldu. Her yere baktım, bulamıyorum. Pasaportum da çantadaydı. Gişeye koşuyorum, adam beni duymuyor. Alarm çalıyor ve uçak kalkıyor.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['kabus', 'havalimanı', 'kayıp'], daysAgo: 20 },
    { title: 'Yabancı Dil', content: 'Bilmediğim bir ülkedeyim ve o dili akıcı konuşuyorum. Hem şaşkın hem memnunum. Çevremdekiler normal davranıyor sanki hep öyle biliyormuşum gibi. Dil bilmeden anlayabilmek tuhaf ama harika.', category: DreamCategory.NORMAL, visibility: DreamVisibility.PUBLIC, tags: ['dil', 'seyahat', 'yabancı'], daysAgo: 27 },
  ],
  // mert
  [
    { title: 'Dağ Zirvesi', content: 'Bir dağın zirvesindeyim, hiç yorulmadan çıkmışım. Altımda bulutlar, üstümde yıldızlar. Gündüz ve gece aynı anda yaşanıyor sanki. O yükseklikte küçüklüğümü hissettim ama korkmadım.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['dağ', 'zirve', 'doğa'], daysAgo: 4 },
    { title: 'Canavar Kovalaması', content: 'Dev bir yaratık peşimdeydi. Ne kadar koşarsam koşayım yaklaşıyordu. Bacaklarım ağırlaşıyordu, nefes alamıyordum. Bir köprüden atladım ve uyandım. Birkaç saniye gerçek mi rüya mı ayırt edemedim.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['kabus', 'kaçış', 'korku'], daysAgo: 10 },
    { title: 'Robot Olmak', content: 'Kendimin robot versiyonuyduk. Metal gövde, ama duygularım vardı. Çevremdekiler fark etmiyordu. Metal ellerimle çiçek tutmaya çalışıyordum, kırılıyorlardı. Tuhaf ama üzücü bir rüyaydı.', category: DreamCategory.NORMAL, visibility: DreamVisibility.FOLLOWERS, tags: ['robot', 'kimlik', 'tuhaf'], daysAgo: 17 },
    { title: 'Rüyada Rüya', content: 'Rüyamın içinde uyudum ve başka bir rüya gördüm. İçice geçmiş katmanlar. Hangi seviyede olduğumu bilmiyordum. Uyandığımda hâlâ rüyada olup olmadığımdan emin olmak için yüzüme çarptım.', category: DreamCategory.LUCID, visibility: DreamVisibility.PUBLIC, tags: ['lucid', 'katmanlar', 'inception'], daysAgo: 24 },
  ],
  // deniz
  [
    { title: 'Okyanus Ortası', content: 'Okyanus ortasında yüzüyorum, kıyı görünmüyor. Ama korkmuyorum. Sular sakin ve ılık. Sualtına bakıyorum, karanlık değil, mavi aydınlık. Bir şeyin beni beklediğini hissediyorum derinlerde.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['okyanus', 'yüzme', 'derinlik'], daysAgo: 1 },
    { title: 'Dalga Duvarı', content: 'Sahildeyim ve ufukta devasa bir dalga yükseliyor. Kaçacak yer yok, çevremde herkes donup kalmış. Dalga yaklaştıkça rüzgar güçleniyor. Tam üstüme geldiğinde uyandım, terler içinde.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['dalga', 'kabus', 'deniz'], daysAgo: 6 },
    { title: 'Sualtı Şehri', content: 'Atlantis gibi bir yerdeydim. İnsanlar sualtında yürüyor, yaşıyordu. Baloncuklar havada asılı, mercan binalarda ışıklar yanıyor. Bir kafe buldum ve içeride oturdum, sualtında kahve içtim.', category: DreamCategory.LUCID, visibility: DreamVisibility.PUBLIC, tags: ['atlantis', 'sualtı', 'şehir'], daysAgo: 12 },
    { title: 'Yağmur Altında', content: 'Şiddetli yağmur altında yürüyordum ama ıslanmıyordum. Yağmur damlalar yavaşça düşüyor, etrafımda dans edercesine. İnsanlar şemsiyeler altında koşuyor, ben sakin adım atıyorum. Huzurlu bir anlamsızlık.', category: DreamCategory.NORMAL, visibility: DreamVisibility.FOLLOWERS, tags: ['yağmur', 'huzur', 'yürüyüş'], daysAgo: 19 },
  ],
  // selin
  [
    { title: 'Kütüphane Labirenti', content: 'Sonsuz bir kütüphanede kayboldum. Raflar tavana kadar uzanıyor, kitaplar her dilde. Aradığım kitabın adını biliyorum ama hiçbir raf sistemine uymuyordu. Bir kapı buldum, açtım, ardında başka bir kütüphane vardı.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['kütüphane', 'kitap', 'labirent'], daysAgo: 3 },
    { title: 'Sessiz Ev', content: 'Evdeyim ama her şey sessiz. Telefonum çalıyor ama ses yok. Kapıyı çalıyorlar ama ses yok. Konuşmaya çalışıyorum, sesim çıkmıyor. Tam bir sessizlik kâbusu. Psikolog olarak bunun anlamını biliyorum ama yine de etkiliyor.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['sessizlik', 'ses', 'kabus'], daysAgo: 8 },
    { title: 'Bilinçli Rüya Terapisi', content: 'Bir danışanımla rüyasında buluştum. Gerçekte değil tabii, rüyamda öyle kurguladım. Orada bir seans yaptık ve o benim söylediklerimi gerçekten duyabildi. Garip ama güzel bir deneyimdi.', category: DreamCategory.LUCID, visibility: DreamVisibility.FOLLOWERS, tags: ['terapi', 'lucid', 'profesyonel'], daysAgo: 15 },
    { title: 'Uçurtma', content: 'Bir tepede uçurtma uçuruyordum. Rüzgar güçlü ama uçurtma dengeli. Aşağıdan bakan çocuklar el sallıyor. Basit, saf, hiçbir anlam aramak gerektirmeyen bir rüya. Bazen bu kadarı yeter.', category: DreamCategory.NORMAL, visibility: DreamVisibility.PUBLIC, tags: ['uçurtma', 'huzur', 'çocukluk'], daysAgo: 22 },
  ],
  // ece
  [
    { title: 'Ay Gezisi', content: 'Aya gittim, ama uzay giysisi yoktu. Normal kıyafetlerimle. Ay yüzeyi düşündüğümden çok daha yumuşaktı, toz gibiydi. Dünyaya baktım, mavi bir mermer gibi asılı. İçim sıkıştı, hem korkudan hem hayranlıktan.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['ay', 'uzay', 'dünya'], daysAgo: 2 },
    { title: 'Kayıp Olmak', content: 'Büyük bir şehirde kaybolmuştum, telefon yok, para yok. Sokak sokak dolaşıyorum. Yabancılar yardım etmek istiyor ama dilimizi anlayamıyoruz. Gece oldu ve hâlâ kayıptım. Çaresizlik çok gerçek hissettirdi.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['kayıp', 'şehir', 'kabus'], daysAgo: 9 },
    { title: 'Dans Eden Ağaçlar', content: 'Orman müziğe göre dans ediyordu. Ağaçlar eğilip kalkıyor, yapraklar ritim tutuyor. Ben de aralarına katılıp dans ettim. Rüzgar müzikti, yer titreşimdi. Doğayla tam anlamıyla bütünleştim.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['orman', 'dans', 'doğa'], daysAgo: 16 },
    { title: 'Matematik Sınavı', content: 'Üniversiteden mezun olmama rağmen matematik sınavındayım. Formülleri biliyorum ama kağıda yazınca kayboluyor. Zaman doldu, öğretmen kağıdı alıyor. Sonra fark ediyorum: zaten mezunum, bu sınav geçersiz.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.FOLLOWERS, tags: ['sınav', 'matematik', 'kabus'], daysAgo: 28 },
    { title: 'Pazar Yeri', content: 'Renkli, kalabalık bir pazar yerindeyim. Her stand farklı bir ülkeden. Yemek kokuları, renkli kumaşlar, canlı müzik. Bir şey almıyorum, sadece geziyorum. En mutlu hissettiğim rüyalardan biri.', category: DreamCategory.NORMAL, visibility: DreamVisibility.PUBLIC, tags: ['pazar', 'kültür', 'mutluluk'], daysAgo: 4 },
  ],
  // can
  [
    { title: 'Bulut Üzerinde', content: 'Bir bulutun üzerinde oturuyordum, sallanan bir hamak gibi. Altımda şehirler, dağlar, denizler akıp gidiyordu. Birileri yanıma geldi ve kahve uzattı. Bulut üzerinde kahve içmek hayatımın en güzel anıydı rüyada da olsa.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['bulut', 'özgürlük', 'kahve'], daysAgo: 1 },
    { title: 'Yıldızlara Dokunmak', content: 'Uzayda yüzüyordum ve yıldızlar dokunma mesafesindeydi. Her dokunuşta titreşiyorlardı, sıcaktılar. Güneş yakınımdı ama yakmıyordu. Evrenin tam ortasında kendimi hem çok küçük hem çok büyük hissettim.', category: DreamCategory.LUCID, visibility: DreamVisibility.PUBLIC, tags: ['uzay', 'yıldız', 'evren'], daysAgo: 7 },
    { title: 'Hayalet Ev', content: 'Terk edilmiş bir evde yalnız kalmak zorunda kaldım. Gece oldu, sesler başladı. Ayak sesleri, kapılar. Korkmamaya çalışıyorum ama vücudum işbirliği yapmıyor. Sabah olmasını bekledim rüyada, uyandım.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['hayalet', 'ev', 'kabus'], daysAgo: 13 },
    { title: 'Bisiklet Yolculuğu', content: 'Sonsuz bir yolda bisiklet sürüyordum. Yokuş yok, rüzgar arkamdan esiyor. Her yanım tarlalar, ayçiçekleri. Hiç yorulmuyorum, sadece pedal basıyorum. Gidecek bir yer yok, yolculuğun kendisi amaç.', category: DreamCategory.NORMAL, visibility: DreamVisibility.PUBLIC, tags: ['bisiklet', 'yol', 'özgürlük'], daysAgo: 20 },
  ],
  // naz
  [
    { title: 'Mor Gökyüzü', content: 'Gökyüzü mora dönmüştü, mor bulutlar, mor güneş. Ama dünyanın renkleri normaldi. Sadece yukarısı farklıydı. İnsanlar yukarı bakıp şaşırmıyor, sadece ben fark ediyorum. Her şeyin yanlış olduğunu bilen tek kişi olmak tedirgin edici.', category: DreamCategory.BEAUTIFUL, visibility: DreamVisibility.PUBLIC, tags: ['renk', 'gökyüzü', 'farklılık'], daysAgo: 3 },
    { title: 'Denizde Kayık', content: 'Küçük bir kayıkta uyumuştum ve uyandığımda ortada bir yerde, başka bir uyku rüyasıydı. Dalga vuruyor, kayık sallanıyor. Ne kıyıya gitmek istiyorum ne de batmak. Sadece orada kalmak, sallanmak. Kabul mü teslim mi bilmiyorum.', category: DreamCategory.NORMAL, visibility: DreamVisibility.FOLLOWERS, tags: ['deniz', 'kayık', 'huzur'], daysAgo: 10 },
    { title: 'Unutulan İsim', content: 'Karşımdaki kişiyi tanıyorum ama adını söyleyemiyorum. Her şeyi biliyorum hakkında ama isim gelmiyor. O da benim ismimi söylemiyor. İsimsiz bir ilişki. Belki bu yüzden o kadar tuhaf hissettiriyor.', category: DreamCategory.NIGHTMARE, visibility: DreamVisibility.PUBLIC, tags: ['isim', 'kimlik', 'unutmak'], daysAgo: 17 },
    { title: 'Yavaş Zaman', content: 'Zaman yavaşlamıştı. Bir saniye bir dakika gibi geçiyordu. Su döküldüğünde damlalar havada asılı kalıyordu. Her şeyin içini görebiliyordum, anlayabiliyordum. Acele etmek zorunda olmamak nasıl bir şey, işte o.', category: DreamCategory.LUCID, visibility: DreamVisibility.PUBLIC, tags: ['zaman', 'yavaşlık', 'lucid'], daysAgo: 25 },
  ],
];

const COMMENT_POOL: string[] = [
  'Bu rüyayı okurken tüylerim diken diken oldu!',
  'Bende de benzer bir rüya olmuştu, çok tuhaf hissettiriyor.',
  'Lucid rüyalar gerçekten büyüleyici. Sen de fark ettin mi o anı?',
  'Çok güzel anlatmışsın, sanki ben de o rüyadaydım.',
  'Bu tür rüyalar genellikle derin bir anlam taşır bence.',
  'Uçma rüyaları en güzel rüyalar. Seni anlıyorum!',
  'Kabus gibi görünüyor ama anlattığın şekilde bir güzelliği var.',
  'Bu rüyayı yorumlamak istiyorum ama kelime bulamıyorum.',
  'Subconscious çok güçlü bir şey. Bunu okuyunca fark ettim tekrar.',
  'İnanılmaz bir deneyim! Peki uyandıktan sonra nasıl hissettin?',
  'Ben de geçen hafta benzer bir şey yaşadım, bağlantı kuramıyorum.',
  'Rüyalarını bu kadar detaylı hatırlamak çok özel bir yetenek.',
  'Okurken nefesim tutuldu. Çok etkileyici.',
  'Bu görüntüler kafamda canlandı, harika yazıyorsun.',
  'Benzer şeyleri ben de yaşıyorum ama anlatamıyordum. Teşekkürler.',
  'Rüyanın sonu nasıl bitti acaba? Merak ettim.',
  'Müthiş bir deneyim olmuş! Tekrar böyle bir rüya görmek ister misin?',
  'Suyun içinde serbest hissetmek... bunu ne kadar iyi anlatmışsın.',
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
  'Bende de "düşen diş" rüyası çok olur, klasik bir kaygı işareti.',
  'Sınav kabusları bitmez sanırım, mezun olsak da.',
  'Kontrol edememe hissi o kadar gerçekçi ki rüyada.',
  'Aileni rüyanda görmek güzel bir his olmalı.',
  'Sualtı şehirleri konsepti aklımı çok meşgul eder.',
  'Yıldızlara dokunabilmek... hayal etmek bile güzel.',
  'Ağaçların dans etmesi çok şiirsel bir imge.',
  'Zaman yavaşlasaydı gerçekte de böyle hissederdik herhalde.',
  'Kayıkta sallana sallana uyumak beni de rahatlatırdı.',
  'Mor gökyüzü konsepti çok ilginç, fark etmek de öyle.',
  'Atlastan çıkmış bir sahne gibi anlatılmış.',
  'Bisiklet yolculuğu rüyaları özgürlük sembolü bence.',
];

// Follow graph: her kullanıcı birkaç kişiyi takip ediyor
// [followerIdx, followingIdx]
const FOLLOW_PAIRS: [number, number][] = [
  [0,1],[0,2],[0,4],[0,7],
  [1,0],[1,3],[1,5],[1,8],
  [2,0],[2,1],[2,6],[2,9],
  [3,2],[3,4],[3,7],[3,8],
  [4,0],[4,3],[4,5],[4,9],
  [5,1],[5,2],[5,6],[5,7],
  [6,0],[6,3],[6,4],[6,8],
  [7,1],[7,5],[7,6],[7,9],
  [8,0],[8,2],[8,4],[8,6],
  [9,1],[9,3],[9,5],[9,7],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 8) + 20, Math.floor(Math.random() * 60)); // night time
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed(ds: DataSource): Promise<void> {
  const userRepo     = ds.getRepository(User);
  const profileRepo  = ds.getRepository(UserProfile);
  const followRepo   = ds.getRepository(UserFollow);
  const dreamRepo    = ds.getRepository(Dream);
  const likeRepo     = ds.getRepository(DreamLike);
  const saveRepo     = ds.getRepository(DreamSave);
  const commentRepo  = ds.getRepository(DreamComment);
  const notifRepo    = ds.getRepository(Notification);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── 1. Users ───────────────────────────────────────────────────────────────
  console.log('\n👥  Creating users…');
  const createdUsers: User[] = [];

  for (const u of USERS) {
    let user = await userRepo.findOne({ where: { email: u.email } });
    if (!user) {
      user = userRepo.create({
        email: u.email,
        username: u.username,
        passwordHash,
        isEmailVerified: true,
        isActive: true,
        role: 'user',
      });
      user = await userRepo.save(user);
      console.log(`  ✓ Created @${u.username}`);
    } else {
      console.log(`  · @${u.username} already exists`);
    }
    createdUsers.push(user);

    // user_profiles (bio, displayName, avatarUrl)
    let profile = await profileRepo.findOne({ where: { userId: user.id } });
    if (!profile) {
      profile = profileRepo.create({
        userId: user.id,
        displayName: u.displayName,
        bio: u.bio,
        avatarUrl: u.avatarUrl,
        isPublic: true,
      });
      await profileRepo.save(profile);
    } else {
      let dirty = false;
      if (!profile.bio)        { profile.bio = u.bio;               dirty = true; }
      if (!profile.displayName){ profile.displayName = u.displayName; dirty = true; }
      if (!profile.avatarUrl)  { profile.avatarUrl = u.avatarUrl;   dirty = true; }
      if (dirty) await profileRepo.save(profile);
    }
  }

  // ── 2. Dreams ──────────────────────────────────────────────────────────────
  console.log('\n🌙  Creating dreams…');
  const allDreams: Dream[] = [];

  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i]!;
    const seeds = DREAMS_PER_USER[i]!;

    for (const d of seeds) {
      const existing = await dreamRepo.findOne({
        where: { userId: user.id, title: d.title },
      });
      if (existing) {
        allDreams.push(existing);
        continue;
      }

      const dream = dreamRepo.create({
        userId: user.id,
        title: d.title,
        content: d.content,
        category: d.category,
        visibility: d.visibility,
        tags: [...d.tags, SEED_TAG],
        isDraft: false,
        dreamedAt: daysAgo(d.daysAgo),
        createdAt: daysAgo(d.daysAgo),
      });
      // override createdAt (TypeORM ignores it by default on insert)
      await ds.query(
        `INSERT INTO dreams (id, user_id, title, content, category, visibility, is_draft, tags, like_count, comment_count, match_count, save_count, is_moderated, is_hidden, dreamed_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,0,0,false,false,$9,$10,$10)
         ON CONFLICT DO NOTHING`,
        [
          require('crypto').randomUUID(),
          user.id, dream.title, dream.content,
          dream.category, dream.visibility,
          dream.isDraft,
          `{${dream.tags.map((t: string) => `"${t}"`).join(',')}}`,
          dream.dreamedAt.toISOString(),
          daysAgo(d.daysAgo).toISOString(),
        ],
      );

      const saved = await dreamRepo.findOne({ where: { userId: user.id, title: d.title } });
      if (saved) {
        allDreams.push(saved);
        console.log(`  ✓ @${user.username}: "${d.title}"`);
      }
    }
  }

  // ── 3. Follows ─────────────────────────────────────────────────────────────
  console.log('\n🤝  Creating follows…');
  let followsCreated = 0;

  for (const [fi, gi] of FOLLOW_PAIRS) {
    const follower  = createdUsers[fi];
    const following = createdUsers[gi];
    if (!follower || !following) continue;

    const exists = await followRepo.findOne({
      where: { followerId: follower.id, followingId: following.id },
    });
    if (!exists) {
      await followRepo.save(followRepo.create({
        followerId: follower.id,
        followingId: following.id,
      }));
      followsCreated++;
    }
  }
  console.log(`  ✓ ${followsCreated} new follow relationships`);

  // ── 4. Likes & Saves ───────────────────────────────────────────────────────
  console.log('\n❤️   Creating likes & saves…');
  const publicDreams = allDreams.filter(d => d.visibility === DreamVisibility.PUBLIC);
  let likesCreated = 0;
  let savesCreated = 0;

  for (const dream of publicDreams) {
    // pick 2-5 random users to like this dream (not the author)
    const likers = createdUsers
      .filter(u => u.id !== dream.userId)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 4) + 2);

    for (const liker of likers) {
      const exists = await likeRepo.findOne({
        where: { userId: liker.id, dreamId: dream.id },
      });
      if (!exists) {
        await likeRepo.save(likeRepo.create({ userId: liker.id, dreamId: dream.id }));
        likesCreated++;
      }
    }

    // pick 1-3 random users to save
    const savers = createdUsers
      .filter(u => u.id !== dream.userId)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);

    for (const saver of savers) {
      const exists = await saveRepo.findOne({
        where: { userId: saver.id, dreamId: dream.id },
      });
      if (!exists) {
        await saveRepo.save(saveRepo.create({ userId: saver.id, dreamId: dream.id }));
        savesCreated++;
      }
    }
  }
  console.log(`  ✓ ${likesCreated} likes, ${savesCreated} saves`);

  // ── 5. Comments ────────────────────────────────────────────────────────────
  console.log('\n💬  Creating comments…');
  let commentsCreated = 0;

  for (const dream of publicDreams) {
    const commentCount = Math.floor(Math.random() * 9); // 0-8
    if (commentCount === 0) continue;

    const commenters = createdUsers
      .filter(u => u.id !== dream.userId)
      .sort(() => Math.random() - 0.5)
      .slice(0, commentCount);

    const shuffledPool = [...COMMENT_POOL].sort(() => Math.random() - 0.5);

    for (let ci = 0; ci < commenters.length; ci++) {
      const commenter = commenters[ci]!;
      const content = shuffledPool[ci % shuffledPool.length]!;

      const exists = await commentRepo.findOne({
        where: { dreamId: dream.id, userId: commenter.id, content },
      });
      if (!exists) {
        await commentRepo.save(commentRepo.create({
          dreamId: dream.id,
          userId: commenter.id,
          content,
        }));
        commentsCreated++;
      }
    }
  }
  console.log(`  ✓ ${commentsCreated} new comments`);

  // ── 6. Notifications ───────────────────────────────────────────────────────
  console.log('\n🔔  Creating notifications…');
  let notifsCreated = 0;

  // Follow notifications: for each follow relationship
  for (const [fi, gi] of FOLLOW_PAIRS) {
    const follower  = createdUsers[fi];
    const following = createdUsers[gi];
    if (!follower || !following) continue;

    const exists = await notifRepo.findOne({
      where: { recipientId: following.id, actorId: follower.id, type: NotificationType.FOLLOW },
    });
    if (!exists) {
      await notifRepo.save(notifRepo.create({
        recipientId: following.id,
        actorId: follower.id,
        type: NotificationType.FOLLOW,
        title: 'Yeni takipçi',
        body: `@${follower.username} sizi takip etmeye başladı.`,
        isRead: Math.random() > 0.4,
      }));
      notifsCreated++;
    }
  }

  // Like & save notifications: for each like/save on seed dreams
  const allLikes = await likeRepo.find({ where: {} });
  for (const like of allLikes) {
    const dream = allDreams.find(d => d.id === like.dreamId);
    if (!dream || dream.userId === like.userId) continue;

    const exists = await notifRepo.findOne({
      where: { recipientId: dream.userId, actorId: like.userId, type: NotificationType.LIKE, dreamId: dream.id },
    });
    if (!exists) {
      await notifRepo.save(notifRepo.create({
        recipientId: dream.userId,
        actorId: like.userId,
        type: NotificationType.LIKE,
        dreamId: dream.id,
        title: 'Rüyanı beğendiler',
        body: `"${dream.title ?? 'Rüyan'}" rüyanı beğendi.`,
        isRead: Math.random() > 0.5,
      }));
      notifsCreated++;
    }
  }

  // Comment notifications: for each comment on seed dreams
  const allComments = await commentRepo.find({ where: {} });
  for (const comment of allComments) {
    const dream = allDreams.find(d => d.id === comment.dreamId);
    if (!dream || dream.userId === comment.userId) continue;

    const exists = await notifRepo.findOne({
      where: { recipientId: dream.userId, actorId: comment.userId, commentId: comment.id, type: NotificationType.COMMENT },
    });
    if (!exists) {
      await notifRepo.save(notifRepo.create({
        recipientId: dream.userId,
        actorId: comment.userId,
        type: NotificationType.COMMENT,
        dreamId: dream.id,
        commentId: comment.id,
        title: 'Rüyana yorum yapıldı',
        body: `"${dream.title ?? 'Rüyan'}" rüyana yorum yaptı.`,
        isRead: Math.random() > 0.4,
      }));
      notifsCreated++;
    }
  }

  console.log(`  ✓ ${notifsCreated} new notifications`);

  // ── 8. Sync counts ─────────────────────────────────────────────────────────
  console.log('\n🔢  Syncing counts…');
  await ds.query(`
    UPDATE dreams d
    SET like_count    = (SELECT COUNT(*) FROM dream_likes    WHERE dream_id = d.id),
        save_count    = (SELECT COUNT(*) FROM dream_saves    WHERE dream_id = d.id),
        comment_count = (SELECT COUNT(*) FROM dream_comments WHERE dream_id = d.id AND deleted_at IS NULL)
    WHERE EXISTS (SELECT 1 FROM dream_likes    WHERE dream_id = d.id)
       OR EXISTS (SELECT 1 FROM dream_saves    WHERE dream_id = d.id)
       OR EXISTS (SELECT 1 FROM dream_comments WHERE dream_id = d.id AND deleted_at IS NULL)
  `);
  console.log('  ✓ Counts synced');

  // ── Summary ────────────────────────────────────────────────────────────────
  const [uCount] = await ds.query<[{count:string}]>(
    `SELECT COUNT(*) FROM users WHERE email LIKE '%@dreamcloud.dev'`
  );
  const [dCount] = await ds.query<[{count:string}]>(
    `SELECT COUNT(*) FROM dreams WHERE $1 = ANY(tags) AND deleted_at IS NULL`,
    [SEED_TAG]
  );
  const [fCount] = await ds.query<[{count:string}]>(`SELECT COUNT(*) FROM user_follows`);

  console.log('\n✅  Seed complete!');
  console.log(`   Demo users : ${uCount?.count ?? 0}`);
  console.log(`   Demo dreams: ${dCount?.count ?? 0}`);
  console.log(`   Follows    : ${fCount?.count ?? 0}`);
  console.log(`   Password   : ${DEMO_PASSWORD}\n`);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

(async () => {
  let ds: DataSource | null = null;
  try {
    ds = await AppDataSource.initialize();
    await seed(ds);
  } catch (err) {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  } finally {
    if (ds?.isInitialized) await ds.destroy();
  }
})();
