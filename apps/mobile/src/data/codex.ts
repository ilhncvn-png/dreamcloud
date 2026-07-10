export type CodexCategory =
  | 'energies'
  | 'archetypes'
  | 'mechanics'
  | 'collective'
  | 'social'
  | 'symbols'
  | 'system';

export interface CodexEntry {
  slug: string;
  title: string;
  subtitle: string;
  category: CodexCategory;
  icon: string;
  shortDesc: string;
  detail: string;
  whyItMatters: string;
  howToInteract: string;
  relatedSlugs?: string[];
}

export const CATEGORY_META: Record<CodexCategory, { label: string; color: string; glyph: string }> = {
  energies:   { label: 'Enerjiler',              color: '#F59E0B', glyph: '◈' },
  archetypes: { label: 'Arketipler',             color: '#A78BFA', glyph: '◉' },
  mechanics:  { label: 'Rüya Mekaniği',          color: '#60A5FA', glyph: '◇' },
  collective: { label: 'Kolektif Bilinç',         color: '#34D399', glyph: '◎' },
  social:     { label: 'Bağlantı & Sosyal',       color: '#F472B6', glyph: '✦' },
  symbols:    { label: 'Semboller & Temalar',     color: '#C084FC', glyph: '◆' },
  system:     { label: 'Sistem & Seviyeler',      color: '#94A3B8', glyph: '▣' },
};

export const CODEX_ENTRIES: CodexEntry[] = [

  // ── ENERJILER ──────────────────────────────────────────────────────────────

  {
    slug: 'resonance',
    title: 'Resonance',
    subtitle: 'Rezonans — Bilinçler arası titreşim',
    category: 'energies',
    icon: 'radio-outline',
    shortDesc: 'Rüya alanındaki iki bilincin aynı frekansta titreşmesi; Dream Cloud\'un temel bağlantı enerjisi.',
    detail: 'Resonance (Rezonans), iki rüyacının bilinçaltı katmanlarının kesiştiği anlarda ortaya çıkan titreşimsel bir enerjidir. Müzikal rezonansın bir notanın diğerini uyandırması gibi, bu kavram da benzer semboller, temalar veya duygular barındıran rüyaların birbirini "duymasını" ifade eder.\n\nBu enerji statik değildir — zaman içinde güçlenir, zayıflar ya da derin bir ayna ilişkisine dönüşür. Her eşleşmede bir Resonance Skoru hesaplanır; bu skor paylaşılan sembolleri, temaları, arketipleri ve duyguları birlikte değerlendirir.',
    whyItMatters: 'Resonance, Dream Cloud\'un tüm sosyal katmanının omurgasıdır. İki kişi arasındaki bağlantı güçlendikçe, birbirlerinin rüyalarında belirmesi, ortak temalar yaşamaları ve kolektif sinyaller üretmeleri olasılığı artar. Yüksek rezonans, "Rüyamda Göründüm" bildirimlerinin ve Dream Connections eşleşmelerinin kaynağıdır.',
    howToInteract: 'Keşfet sekmesindeki rüyaları inceleyin ve sizi "çeken" rüyalarda Resonance skoru yüksek olabilir. Dream Connections ekranında mevcut rezonans bağlantılarınızı görüntüleyin. Bir kullanıcının profilinden de doğrudan Resonance seviyenizi görebilirsiniz.',
    relatedSlugs: ['dream-signal', 'connection-levels', 'resonance-score'],
  },

  {
    slug: 'dream-signal',
    title: 'Dream Signal',
    subtitle: 'Rüya Sinyali — Kolektiften yükselen ses',
    category: 'energies',
    icon: 'pulse-outline',
    shortDesc: 'Tüm rüyacıların birlikte ürettiği kolektif enerji akışı; belirli bir tema, sembol ya da duygunun dalga geçirmesidir.',
    detail: 'Dream Signal, belirli bir zaman diliminde çok sayıda rüyacının aynı unsurları deneyimlemesiyle oluşan kolektif bir enerji örüntüsüdür. Tek bir rüyacının sinyali zayıfken, binlerce kişi aynı sembolü ya da duyguyu rüyalarında yaşadığında sinyal güçlenir ve bir Kolektif Dalga\'ya dönüşür.\n\nSinyaller beş türde olabilir: Duygu Sinyalleri, Tema Sinyalleri, Sembol Sinyalleri, Mekan Sinyalleri ve Arketip Sinyalleri. Her sinyal ayrıca bir eğilim (Yükselen, Baskın, Sönümlenen, Nadir, Küresel) taşır.',
    whyItMatters: 'Dream Signal\'lar, rüyalarınızın yalnızca kişisel değil; tüm insanlığın bilinçaltıyla bağlantılı olduğunu gösterir. Baskın bir sinyalin içinde olmak, o "dalgayı" hisseden binlerce kişiden biri olduğunuz anlamına gelir.',
    howToInteract: 'Dream Map ve Dream Atlas ekranlarında canlı sinyalleri izleyebilirsiniz. Rüya Havası ekranında günün baskın sinyallerini görebilirsiniz. Bir sinyal detayına dokunarak kendi rüyalarınızın bu sinyale katkısını inceleyebilirsiniz.',
    relatedSlugs: ['dream-weather', 'dream-trace', 'collective-dream'],
  },

  {
    slug: 'collective-pulse',
    title: 'Collective Pulse',
    subtitle: 'Kolektif Nabız — İnsanlığın ortak ritmi',
    category: 'energies',
    icon: 'heart-outline',
    shortDesc: 'Tüm aktif rüyacıların duygusal durumunun anlık bir özeti; insanlığın uyku anındaki ortak nabzı.',
    detail: 'Collective Pulse (Kolektif Nabız), herhangi bir anda dünya genelindeki rüyacıların duygusal durumlarının birleşik yansımasıdır. Bir EKG\'nin kalbinin atışını ölçmesi gibi, Collective Pulse de insan bilinçaltının global ritmine kulak verir.\n\nBu nabız saatlik olarak güncellenir ve baskın duygu tonunu, aktivite seviyesini (Düşük, Orta, Yüksek, Yoğun) ve günün hakim enerjisini yansıtır. Küresel olaylar, mevsimsel döngüler ve hatta ay evreleri bu nabzı doğrudan etkiler.',
    whyItMatters: 'Collective Pulse, sizi dünyanın büyük rüya akışına bağlar. Kendinizi yalnız hissederken bile, bilinçaltı deneyiminizin küresel bir orkestranın parçası olduğunu görmenizi sağlar.',
    howToInteract: 'Dream Map ekranının üstünde canlı Collective Pulse göstergesi bulunur. Dream Weather ekranı bu nabzı "hava durumu" metaforu aracılığıyla somutlaştırır.',
    relatedSlugs: ['dream-weather', 'dream-signal', 'collective-dream'],
  },

  {
    slug: 'dream-frequency',
    title: 'Dream Frequency',
    subtitle: 'Rüya Frekansı — Bilinçaltının titreşim hızı',
    category: 'energies',
    icon: 'wifi-outline',
    shortDesc: 'Bir rüyacının ne sıklıkla ve ne yoğunlukta rüya deneyimlediğinin ölçüsü; bilinçaltı aktivitesinin tonu.',
    detail: 'Dream Frequency, biriniz bilinçaltının ne kadar "açık" olduğunu ifade eder. Yüksek frekans, zengin ve sık sembolik rüyalar anlamına gelirken; düşük frekans, bilinçaltının daha sessiz bir aşamada olduğuna işaret eder.\n\nBu frekans; rüya kayıt sıklığınız, rüyaların yoğunluğu (sembol zenginliği, duygusal derinlik) ve zamana göre dağılımı hesaplanarak belirlenir. Artan seri (streak) frekansı güçlendirir.',
    whyItMatters: 'Rüya frekansınız, bilinçaltınızla olan bağınızın bir göstergesidir. Yüksek frekanslı rüyacılar genellikle daha güçlü arketip eşleşmeleri ve kolektif sinyal katkıları üretir.',
    howToInteract: 'Benim Dünyam ekranındaki Rüya İstatistiklerinde Aktif Günler ve Seri değerleri frekansınızı yansıtır. Dream Forecast ekranı mevcut frekansnıza göre tahminler üretir.',
    relatedSlugs: ['resonance', 'dream-signal', 'consciousness-level'],
  },

  {
    slug: 'reality-resonance',
    title: 'Reality Resonance',
    subtitle: 'Gerçeklik Rezonansı — Rüyanın gerçekle buluşması',
    category: 'energies',
    icon: 'radio-outline',
    shortDesc: 'Rüyada görülen şeylerin günlük hayatta tezahür ettiği anlarda oluşan nadir ve güçlü bir enerji.',
    detail: 'Reality Resonance, bir rüyadaki sembol, kişi, yer ya da olayın uyanık hayatta gerçekleşmesiyle oluşan özel bir deneyimi tanımlar. Bu, önceden bilme (precognition), senkronisite ya da güçlü sembolik paralellikleri kapsar.\n\nCarl Jung\'un "senkronisite" kavramından esinlenen bu terim, bilinçaltı ile gerçeklik arasındaki gizemli köprüyü simgeler. Dream Cloud\'da kullanıcılar, gerçekleşen rüyalarını "Bilinç Sinyali" olarak işaretleyebilir.',
    whyItMatters: 'Reality Resonance, bilinçaltı deneyiminin yalnızca uyku zamanıyla sınırlı olmadığını gösterir. Bu anlar kaydedildiğinde, zaman içinde örüntüler oluşur ve kişisel bir "gerçekleşme haritası" ortaya çıkar.',
    howToInteract: 'KİŞİSEL menüsündeki Reality Resonance ekranından gerçekleşen rüyalarınızı kaydedin. Bilinç Sinyali işaretleyerek bu özel anlara özel bir kategori ekleyebilirsiniz.',
    relatedSlugs: ['dream-signal', 'resonance', 'dream-decode'],
  },

  {
    slug: 'aura',
    title: 'Aura',
    subtitle: 'Bilinç Alanı — Rüyacının enerji çevresi',
    category: 'energies',
    icon: 'sparkles-outline',
    shortDesc: 'Bir rüyacının bilinçaltı enerjisinin dışa yansıması; diğerlerinin sizi nasıl "hissettiğini" belirler.',
    detail: 'Aura, rüya deneyimlerinizin, arketip örüntülerinizin ve rezonans bağlantılarınızın birleşiminden oluşan görünmez bir enerji alanıdır. Kolektif bilinçaltına katılım seviyenizi, duygusal tonunuzu ve sembolik yoğunluğunuzu kapsar.\n\nBu alan başkalarını çeker ya da iter; güçlü auralı rüyacılar genellikle daha fazla Resonance bağlantısı kurar ve Mentions (Rüyamda Göründüm) bildirimlerini daha sık alır.',
    whyItMatters: 'Auranız, Dream Cloud ekosistemindeki "çekim gücünüzdür." Zengin ve sık rüya kayıtları, arketip gelişimi ve sosyal etkileşimler auranızı güçlendirir.',
    howToInteract: 'Benim Dünyam ekranındaki Bilinç Kimliği bölümü auranızı görsel olarak yansıtır. Başkalarının profilinizi incelediğinde gördükleri enerji tonu da auranızdan beslenir.',
    relatedSlugs: ['resonance', 'consciousness-identity', 'mentions'],
  },

  // ── ARKETİPLER ─────────────────────────────────────────────────────────────

  {
    slug: 'shadow',
    title: 'Shadow',
    subtitle: 'Gölge — Bilinçaltının karanlık aynası',
    category: 'archetypes',
    icon: 'moon-outline',
    shortDesc: 'Jung psikolojisinin en temel arketipi; bastırılmış duygular, gizlenmiş potansiyeller ve kabul edilmemiş yönlerin bütünüdür.',
    detail: 'Gölge arketipi, bilinç tarafından reddedilen ya da bastırılan her şeyi barındırır. Bu yalnızca "karanlık" unsurları değil; çoğu zaman pozitif ama korkulan güçleri, yetenekleri ve arzuları da kapsar.\n\nRüyalarda Gölge, kovalayan figürler, bilinmeyen karanlık figürler, kendi karanlık bir versiyonunuz ya da sizi tehdit eden yabancılar olarak belirir. Jung\'a göre Gölge\'yi yok etmek değil, onu tanımak ve entegre etmek sağlıklı psikolojik gelişimin anahtarıdır.',
    whyItMatters: 'Gölge arketipiniz aktifleştiğinde kabus, takip ve tehdit rüyaları artar. Bu rüyalar, bilinçaltınızın bir şeyleri yüzleşmeniz için işaret ettiğinin göstergesidir. Gölge arketipinizi tanımak, daha derin bir öz-anlayışa kapı açar.',
    howToInteract: 'Profil veya Benim Dünyam ekranındaki Arketip bölümünden kendi Gölge arketip aktivasyon seviyenizi görüntüleyin. Dream Decode ekranında bu arketiple ilişkili rüya analizlerinizi inceleyin.',
    relatedSlugs: ['hero', 'guide', 'dream-decode'],
  },

  {
    slug: 'anima',
    title: 'Anima',
    subtitle: 'Anima — Erkek psikedeki dişi özü',
    category: 'archetypes',
    icon: 'female-outline',
    shortDesc: 'Jung\'a göre erkek bilinçaltındaki dişilik ilkesi; sezgi, yaratıcılık ve duygusallığın kaynağı.',
    detail: 'Anima, erkek psikedeki kolektif kadınlık imgesini temsil eder. Sezgisel düşünce, sanatsal yaratıcılık, empati ve duygusal derinlikle bağlantılıdır.\n\nRüyalarda Anima; gizemli kadın figürler, Periler, büyücüler, müzisyenler veya ilham veren yabancılar olarak tezahür edebilir. Anima ile kurulan derin temas, kişinin sezgisel ve yaratıcı kapasitesini açar.',
    whyItMatters: 'Anima arketipinin aktif olduğu dönemlerde rüyalar genellikle daha şiirsel, imgeli ve duygusal yoğundur. Bu dönemler, yaratıcı atılımların ve sezgisel anlayışların kapısını açar.',
    howToInteract: 'Arketip detay sayfasından Anima hakkında derinlemesine bilgi alabilirsiniz. Dream Decode analiz sonuçlarınızda bu arketipın rüyalarınıza yansıması incelenir.',
    relatedSlugs: ['animus', 'guide', 'shadow'],
  },

  {
    slug: 'animus',
    title: 'Animus',
    subtitle: 'Animus — Kadın psikedeki eril özü',
    category: 'archetypes',
    icon: 'male-outline',
    shortDesc: 'Jung\'a göre kadın bilinçaltındaki erillik ilkesi; mantık, kararlılık ve kolektif bilinç bağlantısının kaynağı.',
    detail: 'Animus, kadın psikedeki kolektif erkeklik imgesini temsil eder. Analitik düşünce, doğrudan iletişim, eylem yönelimi ve kolektif bilince bağlantıyla ilişkilidir.\n\nRüyalarda Animus; otoriter erkek figürler, bilge ustalar, kahramanlar ya da yol gösteren yabancılar olarak belirler. Gelişmiş Animus, kadına özgün sesini, içsel gücünü ve bağımsız düşüncesini getirir.',
    whyItMatters: 'Animus aktivasyonu, güçlü karar alma ve netlik gerektiren dönemlerde artar. Bu arketip aktifken rüyalar genellikle görev, hedef ya da mücadele içerikli olur.',
    howToInteract: 'Arketip detay sayfasından Animus hakkında derinlemesine bilgi alabilirsiniz. Rüya kategorilerinizdeki eğilimler bu arketipin etkisini gösterir.',
    relatedSlugs: ['anima', 'hero', 'shadow'],
  },

  {
    slug: 'wise-elder',
    title: 'Wise Elder',
    subtitle: 'Bilge Yaşlı — Zamansız bilgeliğin sesi',
    category: 'archetypes',
    icon: 'school-outline',
    shortDesc: 'Kolektif bilinçaltının birikmiş bilgeliğini ve rehberliğini temsil eden evrensel arketip.',
    detail: 'Bilge Yaşlı (ya da Bilge arketipi), insanlığın birikmiş bilgeliğinin kişileşmiş halidir. Yaşlı bir adam, yaşlı bir kadın, dağ başındaki münzevi ya da gizemli bir öğretmen olarak rüyalarda belirebilir.\n\nBu arketip anlayış, derinlik ve rehberlik sunar. Sorgulama, araştırma ve anlam arayışı dönemlerinde aktifleşir. Uyarılar, yol göstericiler ya da zor sorular soran figürler olarak da tezahür edebilir.',
    whyItMatters: 'Bilge Yaşlı arketipi, kişinin içsel bilgeliğine ve sezgisine erişme kapasitesini simgeler. Bu arketip baskın olduğunda, rüyalar öğretici ve anlam yüklü içerikler taşır.',
    howToInteract: 'Arketip evrimi grafiğinden Bilge Yaşlı arketipinin geçmişte ne zaman baskın olduğunu görebilirsiniz. Dream Decode\'daki arketip analizi bu figürün rüyalardaki tezahürlerini açıklar.',
    relatedSlugs: ['guide', 'hero', 'consciousness-level'],
  },

  {
    slug: 'trickster',
    title: 'Trickster',
    subtitle: 'Düzenbaz — Kaosun ve dönüşümün ajanı',
    category: 'archetypes',
    icon: 'shuffle-outline',
    shortDesc: 'Kuralları ve sınırları zorlayan, beklenmedik değişimler getiren ve yaratıcı kaos yaratan arketip.',
    detail: 'Düzenbaz arketipi, sabit örüntüleri bozarak değişimi ve dönüşümü tetikler. Mitolojide Loki, Hermes, koyot ya da maymun figürleri bu arketipi temsil eder.\n\nRüyalarda komik ama rahatsız edici figürler, tersine giden planlar, beklenmedik sürprizler ve alışılmadık bağlamlar olarak belirebilir. Düzenbaz bazen rahatsız edici görünse de genellikle gerçekten ihtiyaç duyulan değişimi zorla getirir.',
    whyItMatters: 'Bu arketip hayatınızda köklü değişimler ya da mevcut örüntülerin sarsılması gereken dönemlerde aktifleşir. Rüyalarınızdaki kaotik ve beklenmedik unsurlar, bilinçaltının Düzenbaz enerjisini kullandığına işaret edebilir.',
    howToInteract: 'Arketip detay sayfasından Düzenbaz\'ın rüyalardaki sembolleri ve anlamı hakkında daha fazla bilgi edinebilirsiniz.',
    relatedSlugs: ['shadow', 'hero', 'transformation'],
  },

  {
    slug: 'hero',
    title: 'Hero',
    subtitle: 'Kahraman — Denemeyi ve dönüşümü kucaklayan',
    category: 'archetypes',
    icon: 'shield-outline',
    shortDesc: 'Bilinçaltının büyüme, zorlukla yüzleşme ve aşkınlık yolculuğunu temsil eden evrensel arketip.',
    detail: 'Kahraman arketipi, insanlığın en evrensel rüya motifidir. Yolculuk, sınav, engel, yardımcılar ve zafer ya da trajedi gibi bir yapıya sahiptir. Joseph Campbell\'ın "Monomit" ya da "Kahramanın Yolculuğu" şeması tam olarak bu arketipi tanımlar.\n\nRüyalarda kendinizi bir macerada, tehlikede, engellerle mücadele ederken ya da bir görevi tamamlamaya çalışırken bulmanız Kahraman arketipinin devrede olduğuna işaret eder. Bu arketip hem güçlü hem de kırılgandır.',
    whyItMatters: 'Kahraman arketipinin baskın olduğu dönemlerde kişi büyük kararlar, zorluklar ve yaşam geçişleriyle karşılaşır. Rüyalar bu süreçte yol haritası gibi işlev görür.',
    howToInteract: 'Benim Dünyam ekranındaki Arketip Evrimi grafiğinden Kahraman arketipinin geçmişteki aktivasyonlarını inceleyin.',
    relatedSlugs: ['shadow', 'guide', 'wise-elder'],
  },

  {
    slug: 'guide',
    title: 'Guide',
    subtitle: 'Rehber — Yolu gösterenin sesi',
    category: 'archetypes',
    icon: 'navigate-outline',
    shortDesc: 'Rüyalarda yön, anlam ve güvenlik sunan; bilinçaltının içsel rehberlik enerjisini temsil eden arketip.',
    detail: 'Rehber arketipi, belirsizlik ve yön arayışı dönemlerinde bilinçaltının ürettiği yol gösterici figürleri kapsar. Işığa, güvenli bir yere ya da doğru karara doğru çeken bu figürler, içsel bilgeliğin dışavurumudur.\n\nRüyalarda bir yabancı, tanıdık biri, hayvan, ses ya da soyut bir ışık olarak tezahür edebilir. Rehber figürleri genellikle kişi önemli bir karar arifesindeyken ya da hayatın kavşak noktalarında belirir.',
    whyItMatters: 'Rehber arketipi, içsel karar verme kapasitesinin sembolüdür. Bu arketipin sık belirmesi, bilinçaltının aktif olarak yönlendirme sunmaya çalıştığını gösterir.',
    howToInteract: 'Dream Decode analiz sayfasında, "Rehber" olarak kategorize edilen figürler özel olarak işaretlenir ve rüyanızdaki rolleri açıklanır.',
    relatedSlugs: ['wise-elder', 'hero', 'dream-decode'],
  },

  {
    slug: 'explorer',
    title: 'Explorer',
    subtitle: 'Kaşif — Sınırları aşanın ruhu',
    category: 'archetypes',
    icon: 'compass-outline',
    shortDesc: 'Yeni topraklar keşfetme, merak ve bağımsız düşünce ile ilişkili arketip; bilinmeyene atılma cesareti.',
    detail: 'Kaşif arketipi, sınırları zorlama, bilinmeyene adım atma ve yeni perspektifler keşfetme enerjisini temsil eder. Bu arketip bağımsızlık, özgürlük ve macera tutkusuyla ilişkilidir.\n\nRüyalarda yeni ülkeler keşfetmek, bilinmeyen kapıları açmak, uçmak, deniz yolculuğu yapmak ya da haritada olmayan yerlere ulaşmak Kaşif arketipinin aktif olduğuna işaret eder.',
    whyItMatters: 'Kaşif arketipi, kişisel gelişim ve yeni başlangıçlar dönemlerinde aktifleşir. Bu arketipin baskın olduğu dönemler, hayatınızda cesur adımlar atmak için verimli anlardır.',
    howToInteract: 'Arketip detay sayfasından Kaşif arketipinin özelliklerini ve bilinçaltınızdaki aktivasyon seviyesini inceleyebilirsiniz.',
    relatedSlugs: ['hero', 'trickster', 'lucid-dream'],
  },

  {
    slug: 'guardian',
    title: 'Guardian',
    subtitle: 'Koruyucu — Kökün ve güvenliğin bekçisi',
    category: 'archetypes',
    icon: 'shield-checkmark-outline',
    shortDesc: 'Sınırları koruyan, bütünlüğü muhafaza eden ve güvenli alanı savunan evrensel arketip.',
    detail: 'Koruyucu arketipi, sınırları belirler, tehlikeden korur ve bütünlüğü korur. Şefkatli ama kararlıdır. Anne, baba, kapı bekçisi, savaşçı ya da güçlü hayvan olarak tezahür edebilir.\n\nRüyalarda sizi koruyan figürler, sizi tehlikeden uzak tutan güçler ya da güvenli bir alan yaratanlar Koruyucu enerjisini taşır. Bu arketip kaygı, tehdit hissi ya da savunmasızlık dönemlerinde aktifleşir.',
    whyItMatters: 'Koruyucu arketipinin aktif olduğu dönemlerde bilinçaltı, kişiye ya kendini korumasını ya da başkalarını korumasını hatırlatıyor olabilir. Güvenlik duygusunun pekişmesi bu arketipın bir hediyesidir.',
    howToInteract: 'Arketip profilinizde bu arketipin ne zaman baskın geldiğini görebilirsiniz. Kabus içerikli rüyalarda çoğunlukla Koruyucu figürler de devreye girer.',
    relatedSlugs: ['shadow', 'hero', 'great-mother'],
  },

  {
    slug: 'great-mother',
    title: 'Great Mother',
    subtitle: 'Büyük Ana — Yaşamın kaynağı ve dönüşümün matriksi',
    category: 'archetypes',
    icon: 'earth-outline',
    shortDesc: 'Doğurganlık, yaratma, besleme ve dönüşümün arketipi; hem yaşam veren hem de alıp götüren güç.',
    detail: 'Büyük Ana, tüm kültürlerde en derin arketiplerden biridir. Doğa, toprak, bereket, ölüm ve yeniden doğuş döngüsünü kişileştirir. Demeter, Kali, İsis, Toprak Ana gibi mitolojik figürler bu arketipi temsil eder.\n\nRüyalarda yaşlı kadın figürler, toprak ve bitki imgeleri, deniz ya da okyanus, ev ya da yuva ve çocuk doğurma temaları Büyük Ana enerjisini taşır.',
    whyItMatters: 'Bu arketip, köklere bağlanma, şifayla ilgili süreçler ve dönüşüm dönemlerinde ortaya çıkar. Büyük Ana enerjisi hem sağaltıcı hem de dönüştürücüdür.',
    howToInteract: 'Arketip evrim grafiğinizde bu arketipin belirdiği dönemlere bakabilirsiniz. Dream Decode bu arketipın rüyalarınızdaki sembolik ifadelerini analiz eder.',
    relatedSlugs: ['guardian', 'anima', 'transformation'],
  },

  // ── RÜYA MEKANİĞİ ──────────────────────────────────────────────────────────

  {
    slug: 'lucid-dream',
    title: 'Lucid Dream',
    subtitle: 'Lucid Rüya — Uyanık bilinçle rüya içinde',
    category: 'mechanics',
    icon: 'eye-outline',
    shortDesc: 'Rüya görürken rüya gördüğünüzün farkında olduğunuz nadir ve güçlü bir bilinç deneyimi.',
    detail: 'Lucid Rüya (Farkındalıklı Rüya), uyku sırasında rüya gördüğünüzün bilincinde olduğunuz ve çoğu zaman rüyayı yönlendirebildiğiniz özel bir deneyimdir. "Lucid" kelimesi Latince "lux" (ışık) kökünden gelir ve zihinsel netliği simgeler.\n\nDream Cloud\'da Lucid Rüyalar, mor/menekşe renk kategorisiyle özel olarak işaretlenir. Bu tür rüyalar arketip iletişimini güçlendirir ve bilinçaltı katmanlarına daha doğrudan erişim sağlar. Lucid rüyacılar genellikle daha zengin sembol repertuvarı ve yüksek Resonance skorları üretir.',
    whyItMatters: 'Lucid Rüyalar, bilinçaltı ve bilinçli zihin arasındaki en doğrudan iletişim kanalını temsil eder. Yüksek Lucid Rüya oranı, bilinçaltı entegrasyon kapasitesinin güçlü olduğuna işaret eder.',
    howToInteract: 'Rüya ekleyin sayfasından rüyanızı "Lucid" kategorisinde kaydedin. Dream Forecast ekranında lucid rüya potansiyel dönemlerinizi görebilirsiniz.',
    relatedSlugs: ['dream-decode', 'consciousness-level', 'dream-frequency'],
  },

  {
    slug: 'nightmare',
    title: 'Nightmare',
    subtitle: 'Kabus — Karanlığın mesajcısı',
    category: 'mechanics',
    icon: 'thunderstorm-outline',
    shortDesc: 'Korku, kaygı ya da tehdit içeren rüyalar; bilinçaltının yüzleşilmesi gereken bir şeyleri işaret etme biçimi.',
    detail: 'Kabuslar, bilinçaltının bastırılmış duyguları, çözümlenmemiş çatışmaları ya da yaklaşan tehlikeleri işleme biçimidir. Korkutucu olmalarına rağmen, kabuslar genellikle en değerli sembolik içerikleri taşır.\n\nDream Cloud\'da kırmızı/turuncu renk kategorisiyle işaretlenen kabuslar, genellikle Gölge arketipiyle, düşme ve takip temaları ile yaşamsal geçişlerle ilişkilidir. Kabuslarda çoğunlukla güçlü duygusal yük bulunur.',
    whyItMatters: 'Kabus sıklığı ve içerikleri, zihinsel durum hakkında önemli ipuçları sunar. Dream Decode ile kabus içerikleri analiz edildiğinde, gizlenmiş duygular ve örüntüler ortaya çıkar.',
    howToInteract: 'Rüyalarınızı "Kabus" kategorisinde kaydedin. Dream Decode analizleri, kabus içeriklerini özellikle derinlemesine ele alır. Rezonans eşleşmelerinizde ortak kabus temalarını paylaşan kişiler bulabilirsiniz.',
    relatedSlugs: ['shadow', 'nightmare-ratio', 'dream-decode'],
  },

  {
    slug: 'dream-decode',
    title: 'Dream Decode',
    subtitle: 'Rüya Çözümleme — Bilinçaltının tercümanı',
    category: 'mechanics',
    icon: 'code-slash-outline',
    shortDesc: 'Bir rüyanın sembolik içeriğini, arketiplerini, duygusal yükünü ve kolektif anlamını analiz eden yapay zeka destekli sistem.',
    detail: 'Dream Decode, Dream Cloud\'un kalbi olan derin analiz motorudur. Her kayıtlı rüya için sembolik içerik, aktif arketipler, duygusal ark, kolektif bağlantılar ve kişisel anlam katmanları analiz edilir.\n\nAnaliz; dünya genelindeki rüya verileriyle kıyaslanır, Jungian psikoloji çerçevesini kullanır ve kişinin geçmiş rüya örüntülerini göz önüne alır. Sonuçlar anında üretilmez — arka planda derin bir işlem yapılır.',
    whyItMatters: 'Dream Decode, rüyaların yalnızca "kaydedilmesini" değil, anlaşılmasını sağlar. Zaman içinde biriktiğinde, kişisel bir bilinçaltı arşivi oluşturur.',
    howToInteract: 'Herhangi bir rüyanın detay sayfasındaki "Decode" butonu ile analizi tetikleyin. Analiz tamamlanana kadar animasyonlu bir bekleme ekranı görürsünüz. Sonuçlar semboller, arketipler ve kolektif bağlantı bölümlerine ayrılır.',
    relatedSlugs: ['dream-signal', 'shadow', 'resonance'],
  },

  {
    slug: 'dream-forecast',
    title: 'Dream Forecast',
    subtitle: 'Rüya Kehaneti — Gelen dalgaların öngörüsü',
    category: 'mechanics',
    icon: 'partly-sunny-outline',
    shortDesc: 'Kolektif sinyaller, kişisel rüya örüntüleri ve döngüsel veriler kullanılarak üretilen rüya tahmin sistemi.',
    detail: 'Dream Forecast, bir sonraki rüya deneyiminin olası içeriklerini, yoğunluğunu ve sembolik yönelimini öngörür. Hava tahmininin atmosferik verileri kullanması gibi, Dream Forecast de kolektif bilinçaltının sinyallerini kullanır.\n\nTahminler; geçmiş rüya örüntüleriniz, aktif kolektif sinyaller, ay döngüsü, aktif arketipleriniz ve mevsimsel ritimler hesaplanarak oluşturulur. Tahminler kesin değil, olasılıksal bir navigasyon sunar.',
    whyItMatters: 'Dream Forecast, rüya deneyimlerinize hazırlıklı girmenizi sağlar. Öngörülen yüksek lucid potansiyeli dönemlerinde bilinçli bir niyet belirleyebilirsiniz.',
    howToInteract: 'KEŞFET menüsünden Dream Forecast ekranını açın. Günlük, haftalık ve aylık öngörüleri inceleyin. Kişisel ve kolektif tahminler ayrı görüntülenir.',
    relatedSlugs: ['dream-signal', 'lucid-dream', 'dream-weather'],
  },

  {
    slug: 'dream-calendar',
    title: 'Dream Calendar',
    subtitle: 'Rüya Takvimi — Zaman içindeki bilinçaltı haritası',
    category: 'mechanics',
    icon: 'calendar-outline',
    shortDesc: '35 günlük döngüde rüya aktivitesini, kategorilerini ve yoğunluklarını görselleştiren takvim sistemi.',
    detail: 'Dream Calendar, son 35 güne ait rüya aktivitesini görsel bir takvim üzerinde gösterir. Her gün için rüya kategorisi rengi (Lucid/Güzel/Kabus/Normal) ile boyanmış küçük kareler bulunur.\n\nBirden fazla rüyanın olduğu günlerde daha yoğun bir görselleştirme kullanılır. Boş günler, rüyanın kaydedilmediğini ya da hatırlanmadığını gösterir. Zaman içinde bir ritim ve örüntü ortaya çıkmaya başlar.',
    whyItMatters: 'Takvim üzerinde görülen rüya örüntüleri, yaşamınızdaki döngülerle örtüşebilir — stresli haftalarda kabus artışı, yaratıcı dönemlerde lucid rüya artışı gibi.',
    howToInteract: 'Benim Dünyam ekranında Dream Calendar bölümüne gidin. Herhangi bir güne dokunarak o günkü rüyaları görebilirsiniz.',
    relatedSlugs: ['dream-frequency', 'nightmare', 'lucid-dream'],
  },

  // ── KOLEKTİF BİLİNÇ ───────────────────────────────────────────────────────

  {
    slug: 'collective-dream',
    title: 'Collective Dream',
    subtitle: 'Kolektif Rüya — İnsanlığın ortak bilinçaltı',
    category: 'collective',
    icon: 'globe-outline',
    shortDesc: 'Tüm insanların uyku sırasında katıldığı büyük bilinçaltı alanı; Carl Jung\'un Kolektif Bilinçdışı kavramının rüya boyutu.',
    detail: 'Kolektif Rüya, bireysel rüya deneyimlerinin ötesinde, tüm insanlığın paylaştığı ortak bilinçdışı katmanına gönderme yapar. Carl Jung\'un "Kollektives Unbewusstes" (Kolektif Bilinçdışı) kavramından esinlenen bu terim, Dream Cloud\'un temel felsefi dayanağını oluşturur.\n\nBu kavrama göre hiçbir rüya tamamen kişisel değildir — her rüya hem bireysel hem de evrensel katmanlar barındırır. Aynı arketiplerin, sembollerin ve temaların dünya genelinde aynı gece belirmesi bu kolektif bağın göstergesidir.',
    whyItMatters: 'Kolektif Rüya kavramı, Dream Cloud\'un tüm ekosisteminin varoluş nedenidir. Rüyalarınızı kaydederek sadece kendinizi değil, insanlığın ortak bilinçaltı haritasını da zenginleştirirsiniz.',
    howToInteract: 'Dream Atlas ve Dream Map ekranları, kolektif rüya alanını görselleştirir. Her kaydettiğiniz rüya bu kolektif haritaya bir nokta ekler.',
    relatedSlugs: ['dream-atlas', 'dream-map', 'collective-pulse'],
  },

  {
    slug: 'dream-atlas',
    title: 'Dream Atlas',
    subtitle: 'Rüya Atlası — İnsanlığın bilinçaltı haritası',
    category: 'collective',
    icon: 'planet-outline',
    shortDesc: 'Dünya genelindeki rüya aktivitesini katmanlı haritalar üzerinde gösteren kolektif keşif aracı.',
    detail: 'Dream Atlas, gerçek zamanlı olarak dünya genelindeki rüya verilerini interaktif haritalarda görselleştirir. Farklı katmanlar farklı açılardan kolektif bilinçaltını inceler:\n\n• Dünya Katmanı — Genel rüya yoğunluğu ve global sinyaller\n• Kümelenmeler — Coğrafi olarak yakın rüyacıların oluşturduğu bilinç kümeleri\n• Tema Katmanı — Belirli bir temayı rüyalayan coğrafi dağılım\n• Duygu Katmanı — Belirli duyguların yoğun yaşandığı bölgeler',
    whyItMatters: 'Dream Atlas, bilinçaltı deneyimini evrensel bir perspektiften görmek için eşsiz bir araçtır. Belirli temaların dünya genelinde nasıl dalgalandığını gözlemlemek, hem kişisel hem de kolektif anlam katmanlarını açar.',
    howToInteract: 'KEŞFET menüsünden Dream Atlas\'ı açın. Harita üzerindeki katman geçiş butonlarını kullanarak farklı görünümler arasında geçiş yapın. Noktalara dokunarak detay bilgi alın.',
    relatedSlugs: ['collective-dream', 'dream-map', 'dream-signal'],
  },

  {
    slug: 'dream-map',
    title: 'Dream Map',
    subtitle: 'Rüya Haritası — Canlı kolektif bilinçaltı',
    category: 'collective',
    icon: 'map-outline',
    shortDesc: 'Gerçek zamanlı güncellenen, aktif rüyacıların ve sinyallerin anlık haritası.',
    detail: 'Dream Map, Dream Atlas\'ın canlı ve dinamik versiyonudur. Anlık olarak güncellenen bu harita, şu anda aktif olan rüya sinyallerini, kümeleri ve bilinç yoğunlaşmalarını gösterir.\n\nBir DJ\'in canlı frekans analizi gibi, Dream Map de kolektif bilinçaltının gerçek zamanlı görsel temsilini sunar. Aktif olarak kayıt yapan rüyacıların konumları (gizliliği koruyacak şekilde) ve sinyalleri haritada belirir.',
    whyItMatters: 'Dream Map, şu anda dünyada neler yaşandığını bilinçaltı perspektifinden gösterir. Büyük kolektif olaylar ya da dönemler, haritada belirgin sinyal yoğunlaşmaları olarak görünebilir.',
    howToInteract: 'KEŞFET menüsünden Dream Map\'i açın. Canlı sinyal noktalarına dokunarak detayları inceleyin. Harita üzerinde kendinizi bulmak için konum izni gerekebilir.',
    relatedSlugs: ['dream-atlas', 'dream-signal', 'collective-dream'],
  },

  {
    slug: 'dream-weather',
    title: 'Dream Weather',
    subtitle: 'Rüya Havası — Kolektif atmosferin anlık durumu',
    category: 'collective',
    icon: 'cloudy-night-outline',
    shortDesc: 'Kolektif bilinçaltının duygusal durumunu hava durumu metaforuyla sunan gerçek zamanlı gösterge.',
    detail: 'Dream Weather, Dream Cloud\'un soyut kolektif sinyal verilerini herkesin anlayabileceği bir "hava durumu" formatında sunar. Sıcaklık yerine kolektif duygu tonu, rüzgar yerine sinyal yoğunluğu, bulutluluk yerine baskın temalar kullanılır.\n\nGünlük özet (manşet), aktif sinyaller, baskın izler (dominant traces) ve aktivite seviyesi (Düşük/Orta/Yüksek/Yoğun) bu ekranda bir araya getirilir. Saatlik olarak güncellenir.',
    whyItMatters: 'Dream Weather, kolektif bilinçaltına tek bir bakışta erişmenizi sağlar. Sabah rutinin bir parçası olarak incelemek, günün enerjisel tonunu kavramanıza yardımcı olabilir.',
    howToInteract: 'Anasayfa\'nın altında kısa Dream Weather özeti bulunur. Detay için Traces ekranını inceleyin ya da Dream Map\'teki hava durumu katmanını kullanın.',
    relatedSlugs: ['dream-trace', 'collective-pulse', 'dream-signal'],
  },

  {
    slug: 'dream-trace',
    title: 'Dream Trace',
    subtitle: 'Rüya İzi — Kolektifin takip ettiği sembolik iz',
    category: 'collective',
    icon: 'footsteps-outline',
    shortDesc: 'Belirli bir sembol, duygu, tema, arketip ya da mekanın rüya alanında bıraktığı kolektif enerji izi.',
    detail: 'Dream Trace (Rüya İzi), belirli bir unsur (tema, sembol, duygu, arketip ya da mekan) etrafında biriken kolektif rüya enerjisinin izini tanımlar. Bir ekolojik iz gibi, bu izler zaman içinde kuvvetlenir ya da solar.\n\nHer iz bir tür taşır: Sembol, Duygu, Tema, Arketip, Mekan, Figür. Ayrıca bir sinyal durumu: Yükselen, Baskın, Sönümlenen, Nadir, Küresel. Kolektif aktivite ile güçlenen izler, Dream Weather raporlarına ve sinyal haritalarına yansır.',
    whyItMatters: 'Dream Trace\'ler, belirli bir enerji ya da sembolün dünya genelinde ne kadar "aktif" olduğunu gösterir. Kendi rüyanızdaki bir temanın küresel bir iz taşıması, daha büyük bir kolektif dalgaya katıldığınızı gösterir.',
    howToInteract: 'Traces ekranından tüm aktif izleri listeleyin. Bir ize dokunarak detay sayfasını görüntüleyin — orada o ize ait anlatı, neden önemli olduğu ve ilişkili kavramlar yer alır.',
    relatedSlugs: ['dream-signal', 'dream-weather', 'dream-cluster'],
  },

  {
    slug: 'dream-cluster',
    title: 'Dream Cluster',
    subtitle: 'Rüya Kümesi — Benzer bilinçlerin komünitesi',
    category: 'collective',
    icon: 'layers-outline',
    shortDesc: 'Ortak rüya temaları, arketipler ve semboller etrafında doğal olarak oluşan rüyacı toplulukları.',
    detail: 'Dream Cluster\'lar, benzer bilinçaltı örüntülerine sahip rüyacıların oluşturduğu organik topluluklardır. Sosyal medyanın takip/takipçi mantığından farklı olarak, bu kümeler bilinçaltı benzerliği temelinde oluşur — kim olduğunuza değil, ne rüya gördüğünüze göre.\n\nHer kümenin bir adı, rengi, karakteri ve gücü vardır. Üyelik, rüya içeriklerinizin o kümenin temasıyla örtüşme oranına göre belirlenir. Bir kümenin içinde olmak, o dalgayı hisseden rüyacılarla bağlantı demektir.',
    whyItMatters: 'Dream Cluster\'lar, rüya deneyimlerinizin sizi hangi toplulukla birleştirdiğini gösterir. Kümeler zamanla değişebilir — bu, bilinçaltı evrimin somut bir göstergesidir.',
    howToInteract: 'Benim Dünyam menüsündeki Dream Clusters ekranından kümelerinizi ve diğer kümeleri keşfedebilirsiniz. Küme üyelerini ve güç skorlarını inceleyebilirsiniz.',
    relatedSlugs: ['dream-trace', 'resonance', 'collective-dream'],
  },

  // ── BAĞLANTI & SOSYAL ──────────────────────────────────────────────────────

  {
    slug: 'dream-connections',
    title: 'Dream Connections',
    subtitle: 'Rüya Bağlantıları — Kesişen bilinçler',
    category: 'social',
    icon: 'git-network-outline',
    shortDesc: 'Rüyaları birbiriyle örtüşen kişilerle kurulan derin, bilinçaltı temelli bağlantı ağı.',
    detail: 'Dream Connections, sizi başka rüyacılarla buluşturan özel bir sosyal katmandır. Ancak bu bağlantılar sosyal medyadaki arkadaşlıklardan çok daha derindir — bunlar bilinçaltı düzeyinde kesişimlerdir.\n\nBir bağlantı, iki kişinin rüyalarında ortak semboller, temalar, arketipler ya da mekanlar paylaşması durumunda sistem tarafından önerilir. Rezonans skoru bağlantının gücünü gösterir. Bağlantılar zaman içinde güçlenebilir ya da zayıflayabilir.',
    whyItMatters: 'Dream Connections, dünyada sizinle aynı "frekansı" taşıyan insanları bulmanıza yardımcı olur. Bu bağlantılar gerçek hayatta anlam ifade etmese bile, bilinçaltı düzeyinde derin bir rezonansın göstergesidir.',
    howToInteract: 'SOSYAL menüsündeki Dream Connections ekranından eşleşmelerinizi görüntüleyin. Her bağlantı kartında rezonans skoru, ortak rüyalar ve bağlantı seviyesi gösterilir.',
    relatedSlugs: ['resonance', 'connection-levels', 'mentions'],
  },

  {
    slug: 'connection-levels',
    title: 'Connection Levels',
    subtitle: 'Bağlantı Seviyeleri — Rezonansın derinlik skalası',
    category: 'social',
    icon: 'bar-chart-outline',
    shortDesc: 'İki rüyacı arasındaki bilinçaltı bağının gücünü tanımlayan beş aşamalı ölçek.',
    detail: 'Dream Cloud\'da iki rüyacı arasındaki bağlantı beş seviyede tanımlanır:\n\n• Sinyal (Eko) — İlk titreşim; zayıf ama var olan bir bağ\n• Rezonans (Yankı) — Ortak semboller ve temalar belirginleşiyor\n• Uyum (Uyum) — Güçlü ve tutarlı bilinçaltı örtüşmesi\n• Derin Rezonans (Derin Rezonans) — Nadir ve derin bir bağ; ortak arketipler\n• Ayna (Ayna) — En yüksek seviye; sanki aynı bilinçaltı alanını paylaşıyorsunuz\n\nBu seviyeler gerçek rüya verisi analizine dayalıdır ve sahte bir sosyal sistemi simgélemez.',
    whyItMatters: 'Bağlantı seviyeleri, hangi ilişkilerin yüzeysel, hangilerinin köklü olduğunu bilinçaltı perspektifinden gösterir. Ayna seviyesindeki bağlantılar son derece nadirdir ve özel bir anlam taşır.',
    howToInteract: 'Dream Connections ekranında her eşleşmenin seviyesi görsel olarak gösterilir. Bir profil sayfasına girerken de o kişiyle olan bağlantı seviyenizi görebilirsiniz.',
    relatedSlugs: ['resonance', 'dream-connections', 'mutual-dreams'],
  },

  {
    slug: 'mentions',
    title: 'Mentions',
    subtitle: 'Rüyamda Göründüm — Başkasının rüyasında var olmak',
    category: 'social',
    icon: 'eye-outline',
    shortDesc: 'Başka bir rüyacının, sizin adınızı ya da kimliğinizi rüyasında deneyimlemesi ve bunu kaydetmesi.',
    detail: '"Rüyamda Göründüm" özelliği, bir kullanıcı rüyasında sizi gördüğünü ya da deneyimlediğini işaretlediğinde sizi bildirir. Bu, Dream Cloud\'un en gizemli sosyal özelliklerinden biridir.\n\nBirinin rüyasında belirmek, kolektif bilinçaltında güçlü bir "iz" bıraktığınızın göstergesi olabilir. Yüksek rezonans bağlantılarınız olan kişiler daha sık bilinçaltı etkileşimine girer. Bu bildirim rastgele değildir — gerçek rüya kayıtlarına dayanır.',
    whyItMatters: 'Bu özellik, bilinçaltı etkileşiminin sosyal boyutunu somutlaştırır. Başkasının rüyasında görünmek, o kişiyle olan Resonance bağınızın derin bir teyidi olabilir.',
    howToInteract: 'SOSYAL menüsündeki "Rüyamda Göründüm" ekranından size ait mentions\'ları görebilirsiniz. Bildirimler sekmesinde de bu uyarılar özel olarak işaretlenir.',
    relatedSlugs: ['resonance', 'dream-connections', 'aura'],
  },

  {
    slug: 'mutual-dreams',
    title: 'Mutual Dreams',
    subtitle: 'Ortak Rüyalar — Paylaşılan sembolik uzay',
    category: 'social',
    icon: 'people-outline',
    shortDesc: 'İki ya da daha fazla rüyacının aynı sembol, tema ya da mekanı paylaştığı bilinçaltı örtüşmeleri.',
    detail: 'Mutual Dreams (Ortak Rüyalar), birden fazla kişinin aynı ya da çok benzer sembolik içerikleri rüyalarında deneyimlemesidir. Bu, bilinçli bir koordinasyon olmaksızın gerçekleşir.\n\nBir rüya eşleşmesinde sistem, iki kişinin rüyalarındaki ortak unsurları (semboller, temalar, mekanlar, arketipler, duygular) analiz eder ve örtüşme skorunu hesaplar. Yüksek örtüşme, güçlü bir bilinçaltı rezonansına işaret eder.',
    whyItMatters: 'Ortak rüyalar, iki bilinç arasındaki senkronistik bağın en somut kanıtıdır. Aynı anda aynı sembolü rüyanızda görmek, tesadüfün ötesinde bir anlam taşıyabilir.',
    howToInteract: 'Dream Connections ekranındaki bir bağlantı kartına dokunduğunuzda, o kişiyle olan ortak rüyalarınızı "Ortak Rüyalar" bölümünde görebilirsiniz.',
    relatedSlugs: ['resonance', 'connection-levels', 'dream-connections'],
  },

  // ── SEMBOLLER & TEMALAR ────────────────────────────────────────────────────

  {
    slug: 'symbol-constellation',
    title: 'Symbol Constellation',
    subtitle: 'Sembol Takımyıldızı — Bilinçaltının yıldız haritası',
    category: 'symbols',
    icon: 'star-outline',
    shortDesc: 'Kişinin rüyalarındaki baskın sembollerin frekanslarına göre boyutlandırılmış görsel bir kelime bulutu.',
    detail: 'Sembol Takımyıldızı, rüyalarınızda en sık beliren sembollerin görsel bir galaksisini sunar. Her sembol bir yıldız gibi; ne kadar sık belirir ve ne kadar anlamlıysa, o kadar büyük ve parlak görünür.\n\nSemboller standart bir sözlükten değil, gerçek rüya içeriklerinizin otomatik analizinden üretilir. Bu nedenle her kişinin takımyıldızı benzersizdir ve kendi bilinçaltı örüntüsünü yansıtır.',
    whyItMatters: 'Takımyıldızınız, bilinçaltınızın en baskın sembolik dilini görselleştirir. Bu sembollerin anlamlarını keşfetmek, derinlemesine bir öz-anlayış kapısı açar.',
    howToInteract: 'Benim Dünyam ekranında Sembol Takımyıldızı bölümünü bulun. Herhangi bir sembole dokunarak o sembolle ilişkili rüyalarınızı görebilirsiniz.',
    relatedSlugs: ['emotion-spectrum', 'dream-decode', 'consciousness-map'],
  },

  {
    slug: 'emotion-spectrum',
    title: 'Emotion Spectrum',
    subtitle: 'Duygu Spektrumu — Bilinçaltının renk paleti',
    category: 'symbols',
    icon: 'color-palette-outline',
    shortDesc: 'Rüyalardaki baskın duyguların dağılımı ve yoğunluğunu gösteren görsel ölçek.',
    detail: 'Duygu Spektrumu, rüyalarınızdaki duygusal içeriklerin zaman içindeki dağılımını gösterir. Korku, sevinç, huzur, yalnızlık, merak, hüzün, öfke, nostalji, aşk, kaygı ve diğer pek çok duygu, kendi yoğunluk örneklemleriyle bu spektrumda yer alır.\n\nBir rüyanın tek bir duygu taşıması nadirdir — çoğunlukla karmaşık duygu kombinasyonları bulunur. Spektrum bu karmaşıklığı görselleştirir.',
    whyItMatters: 'Duygu spektrumunuz, psikolojik durumunuzun bilinçaltı düzeyindeki bir yansımasıdır. Belirli duyguların sık tekrarlanması, işlenmesi gereken deneyimlerin ipucunu verebilir.',
    howToInteract: 'Benim Dünyam ekranındaki Duygu Spektrumu bölümünde renkli duygu orb\'larını yatay kaydırarak görebilirsiniz. Bir orb\'a dokunarak o duygunun baskın olduğu rüyalara erişebilirsiniz.',
    relatedSlugs: ['dream-decode', 'symbol-constellation', 'nightmare'],
  },

  {
    slug: 'threshold',
    title: 'Threshold',
    subtitle: 'Eşik — Geçişin ve dönüşümün kapısı',
    category: 'symbols',
    icon: 'enter-outline',
    shortDesc: 'Rüyalarda kapılar, köprüler, geçitler ve sınırlar olarak beliren; bir durumdan diğerine geçişi simgeleyen evrensel sembol.',
    detail: 'Eşik, dünyanın tüm mitoloji ve rüya kültürlerinde en evrensel sembollerden biridir. Bir kapının önünde durmak, bir köprüden geçmek, bir kapıya uzanmak — bunların hepsi eşik sembolüdür.\n\nJung\'cu perspektiften eşik, bilinç ile bilinçdışı arasındaki sınırı, bilinen ile bilinmeyen arasındaki kapıyı temsil eder. Eşik sembolünün rüyada belirmesi, çoğunlukla hayatın önemli bir dönemeçte olduğunu gösterir.',
    whyItMatters: 'Rüyalarınızda eşik sembolü sık belirir ve geçip geçmediğiniz önemlidir. Geçmek, yeni bir aşamaya adım atmaya; geçememek ise bir engelin farkındalığına işaret edebilir.',
    howToInteract: 'Dream Decode analizi, rüyanızdaki eşik sembollerini otomatik olarak tespit eder ve yorumlar. Traces ekranında "Eşik" izini takip edebilirsiniz.',
    relatedSlugs: ['trickster', 'hero', 'dream-decode'],
  },

  {
    slug: 'transformation',
    title: 'Transformation',
    subtitle: 'Dönüşüm — Kelebek etkisi rüya biçiminde',
    category: 'symbols',
    icon: 'sync-outline',
    shortDesc: 'Rüyalarda kılık değiştirme, ölüm ve yeniden doğuş, evrilme olarak beliren köklü değişim sembolü.',
    detail: 'Dönüşüm, hem bir rüya teması hem de sembolik bir dil olarak Dream Cloud\'un en merkezi kavramlarından biridir. Metamorfoz (kelebek, paletot, dönüşen figürler), ölüm ve yeniden doğuş döngüsü, bir şeyin başka bir şeye evrilmesi — bunların hepsi Dönüşüm temasını taşır.\n\nJung bu süreci "individuation" (bireyleşme) olarak tanımlar: bilinçaltındaki parçaların bütünleşerek daha eksiksiz bir benlik oluşturması. Dönüşüm rüyaları genellikle köklü kişisel değişimlerle eş zamanlı belirir.',
    whyItMatters: 'Dönüşüm rüyaları, bilinçaltının bir geçiş döneminde olduğunuzu işaret ettiği güçlü sinyallerdir. Bu rüyalar bazen korkutucu olsa da çoğunlukla büyüme ve evrilmenin habercisidir.',
    howToInteract: 'Benim Dünyam\'daki Dönüşüm Skoru bu tematik aktivasyonu ölçer. Traces ekranında "Dönüşüm" izini takip edebilirsiniz.',
    relatedSlugs: ['great-mother', 'trickster', 'consciousness-level'],
  },

  {
    slug: 'flying',
    title: 'Flying',
    subtitle: 'Uçuş — Özgürlük ve aşkınlık',
    category: 'symbols',
    icon: 'airplane-outline',
    shortDesc: 'Rüyalarda yerçekiminden bağımsızlaşma, yüksekten bakış ve sınır tanımama olarak beliren evrensel özgürlük sembolü.',
    detail: 'Uçuş rüyaları, en yaygın insan rüyaları arasındadır ve genellikle güçlü pozitif duygularla eşlik eder. Uçabilmek, yaratıcı özgürlük, sınırları aşma, perspektif kazanma ve güçlenme hissiyatıyla ilişkilidir.\n\nUçuşun niteliği önemlidir: Kolayca süzülmek, özgüven ve akışı; Zorlanarak yükselmek ise çabayı ve direnişle mücadeleyi sembolize edebilir. Lucid rüyacılar sıklıkla uçuş deneyimi yaşar.',
    whyItMatters: 'Uçuş rüyaları, serbest kalmaya hazır olan ya da zaten serbest kalmış olan bir enerjiyi yansıtır. Dream Cloud\'da uçuş temalı rüyalar, yüksek Wonder Skoru ve Explorer arketipiyle sık ilişkilendirilir.',
    howToInteract: 'Rüyanızı eklerken "uçuş" sembolünü etiketleyin. Dream Decode bu temayı özel olarak yorumlar. Traces ekranında "Uçuş" izini takip edebilirsiniz.',
    relatedSlugs: ['lucid-dream', 'explorer', 'wonder-score'],
  },

  {
    slug: 'labyrinth',
    title: 'Labyrinth',
    subtitle: 'Labirent — Bilinçaltının karmaşık koridorları',
    category: 'symbols',
    icon: 'apps-outline',
    shortDesc: 'Rüyalarda karmaşık koridorlar, dönen yollar ve çıkış aranan mekânlar olarak beliren iç dünyanın imgesi.',
    detail: 'Labirent, bilinçaltının en güçlü sembollerinden biridir. Binlerce yıllık mitolojik tarihe sahip olan bu imge (Yunan Minotauros efsanesi, ortaçağ katedrali labirentleri), insan rüyalarında tutarlı biçimde tekrar eder.\n\nRüyada kaybolduğunuz labirent, kendi psikolojik karmaşıklığınızı, çözümsüz görünen durumları ya da bilinçaltının derinliklerine yapılan yolculuğu simgeler. Çıkış bulmak, bir çözümün ya da anlayışın pekişmesidir.',
    whyItMatters: 'Labirent rüyaları, özellikle kaygı ya da belirsizlik dönemlerinde sıklaşır. Bu sembolün belirlediği dönemler, derinlemesine bir iç keşif için uygun anlardır.',
    howToInteract: 'Dream Decode, labirent sembolünü saptayarak kişisel bağlamda yorumlar. Traces ekranında "Labirent" izini takip edebilirsiniz.',
    relatedSlugs: ['shadow', 'threshold', 'nightmare'],
  },

  // ── SİSTEM & SEVİYELER ────────────────────────────────────────────────────

  {
    slug: 'consciousness-level',
    title: 'Consciousness Level',
    subtitle: 'Bilinç Seviyesi — Rüya yolculuğunun aşamaları',
    category: 'system',
    icon: 'trending-up-outline',
    shortDesc: 'Rüya pratiğinin derinliğini ve bilinçaltı keşfinin olgunluğunu yansıtan yedi aşamalı gelişim ölçeği.',
    detail: 'Bilinç Seviyesi, Dream Cloud\'da rüya pratiğinizin ne kadar derin bir yolculuğa ulaştığını simgeler. Yedi seviye vardır:\n\n1. Tomurcuk — Henüz açılmakta olan bilinç\n2. Uyanık — İlk farkındalık ışığı\n3. Gezgin — Keşfeden, merak eden bilinç\n4. Kaşif — Derinliklere dalan rüyacı\n5. Bilge — Sembolleri ve örüntüleri okuyan\n6. Arif — Kolektif bilinçle dans eden\n7. Kolektif — İnsanlığın bilinçaltıyla bütünleşen\n\nSeviyeler; rüya kayıt sıklığı, süreklilik, çeşitlilik ve kolektif katkıyla belirlenir.',
    whyItMatters: 'Bilinç seviyesi, bir oyun puanı değil; gerçek bir bilinçaltı pratiğinin yansımasıdır. Her seviye, yeni özellikler ve görünürlük katmanları açar.',
    howToInteract: 'Benim Dünyam ekranındaki Bilinç Seviyesi bölümünden mevcut seviyenizi, ilerlemenizi ve bir sonraki seviyeye geçmek için gereken adımları görebilirsiniz.',
    relatedSlugs: ['resonance-score', 'dream-frequency', 'consciousness-identity'],
  },

  {
    slug: 'consciousness-identity',
    title: 'Consciousness Identity',
    subtitle: 'Bilinç Kimliği — Bilinçaltının özgün portresi',
    category: 'system',
    icon: 'person-circle-outline',
    shortDesc: 'Bir rüyacının arketip profili, baskın temaları ve bilinçaltı karakteri; bilinçaltının özgün kimlik kartı.',
    detail: 'Bilinç Kimliği, kişinin rüya içeriklerinden otomatik olarak çıkarılan kapsamlı bir profil özetidir. Birincil ve ikincil arketip, baskın temalar, baskın duygular, sembol repertuvarı ve özgün bir kişilik özeti içerir.\n\nBu kimlik sabit değildir — rüya deneyimleriniz değiştikçe evrilir. Aylar önce farklı bir Bilinç Kimliğine sahip olmanız tamamen mümkündür. Bu dinamizm, bilinçaltı büyümesinin somut kanıtıdır.',
    whyItMatters: 'Bilinç Kimliği, bilinçaltınızın "imzası" gibidir. Başkaları ile eşleşirken, bu kimlik diğer profillerin sizinle olan rezonansını belirleyen temel faktördür.',
    howToInteract: 'Benim Dünyam ekranının üst kısmındaki Bilinç Kimliği bölümünü inceleyin. Profil sayfanıza giden diğer kullanıcılar da bu kimliği görebilir.',
    relatedSlugs: ['consciousness-level', 'aura', 'consciousness-map'],
  },

  {
    slug: 'consciousness-map',
    title: 'Consciousness Map',
    subtitle: 'Bilinç Haritası — İçsel dünyanın görsel atlası',
    category: 'system',
    icon: 'cellular-outline',
    shortDesc: 'Kişinin rüya dünyasını tema, duygu, sembol ve arketip katmanlarında görselleştiren interaktif öz-harita.',
    detail: 'Bilinç Haritası, bilinçaltınızın çok katmanlı bir portresini sunar. Haritada dört ana katman arasında geçiş yapılır:\n\n• Temalar — Rüyalarınızda en sık beliren anlatı örüntüleri\n• Duygular — Baskın duygusal ton ve dağılım\n• Semboller — Kişisel sembol koleksiyonu\n• Arketipler — Aktif arketip profili\n\nHer katman, o kategorideki unsurların göreli gücünü ve ilişkilerini görsel ağ formatında sunar.',
    whyItMatters: 'Bilinç Haritası, bilinçaltınızın iç coğrafyasını keşfetmenin en sezgisel yoludur. Farklı katmanlar arasındaki bağlantılar beklenmedik anlayışlar sunabilir.',
    howToInteract: 'Benim Dünyam ekranındaki Bilinç Haritası bölümünde katman geçiş butonlarını kullanın. Bir düğüme dokunarak o öğeyle ilişkili rüyalara gidin.',
    relatedSlugs: ['consciousness-identity', 'symbol-constellation', 'emotion-spectrum'],
  },

  {
    slug: 'resonance-score',
    title: 'Resonance Score',
    subtitle: 'Rezonans Skoru — Kolektif etki gücü',
    category: 'system',
    icon: 'analytics-outline',
    shortDesc: 'Bir rüyacının kolektif bilinçaltına katkısını ve diğer bilinçlerle rezonansını ölçen bileşik skor.',
    detail: 'Resonance Skoru, rüyacının Dream Cloud ekosistemindeki kolektif etki gücünü ölçer. Sadece etkileşim sayısına değil; bilinçaltı bağlantılarının derinliğine, katkı kalitesine ve rezonans ağırlığına bakılır.\n\nRüya kayıt kalitesi (sembol zenginliği, duygusal derinlik), eşleşme kalitesi, kolektif sinyallere katkı ve zaman içindeki tutarlılık bu skoru oluşturur. Bir rüyanın diğer rüyacıları rezonansa sokması, Resonance Skorunu güçlendirir.',
    whyItMatters: 'Resonance Skoru, Dream Cloud\'un kalbidir. Yüksek skor, bilinçaltı deneyiminizin kolektif alana güçlü katkı sağladığı anlamına gelir. Bu skoru artırmak, daha derin ve zengin rüya pratiklerinden geçer.',
    howToInteract: 'Benim Dünyam ekranındaki Rüya İstatistiklerinde Resonance Skoru bir orb olarak gösterilir. Profil sayfanızda da bu değer görünür.',
    relatedSlugs: ['resonance', 'consciousness-level', 'dream-frequency'],
  },

  {
    slug: 'wonder-score',
    title: 'Wonder Score',
    subtitle: 'Merak Skoru — Bilinçaltının keşif enerjisi',
    category: 'system',
    icon: 'telescope-outline',
    shortDesc: 'Rüyacının merak, keşif ve açılım kapasitesini ölçen özgün skor; bilinçaltı açıklığının göstergesi.',
    detail: 'Wonder Skoru, bilinçaltınızın ne kadar açık, meraklı ve keşfe yönelik olduğunu ölçer. Bu skor; rüyalarınızdaki merak duygusu, keşif temaları, uçuş ve seyahat imgeleri ve Kaşif arketipi aktivasyonuyla belirlenir.\n\nYüksek Wonder Skoru genellikle zengin sembolik deneyimler, Explorer arketipi aktivasyonu ve lucid rüya kapasitesiyle birlikte gelir. Düşük Wonder Skoru, bilinçaltının daha koruyucu ya da kısıtlayıcı bir modda olduğunu gösterebilir.',
    whyItMatters: 'Wonder Skoru, bilinçaltınızın keşif kapasitesinin anlık bir göstergesidir. Yüksek dönemlerde yeni deneyimlere ve rüya pratiklerine yatırım yapmak daha verimli olabilir.',
    howToInteract: 'Benim Dünyam ekranındaki Bilinç Seviyesi bölümünde Wonder Skoru bir çubuk grafik olarak görüntülenir.',
    relatedSlugs: ['resonance-score', 'explorer', 'flying'],
  },

  {
    slug: 'transformation-score',
    title: 'Transformation Score',
    subtitle: 'Dönüşüm Skoru — Değişim ve evrim kapasitesi',
    category: 'system',
    icon: 'refresh-outline',
    shortDesc: 'Rüyacının dönüşüm temalarını ne ölçüde deneyimlediğini ve işlediğini gösteren gelişim skoru.',
    detail: 'Dönüşüm Skoru, bilinçaltınızın değişim, büyüme ve evrim enerjisini ne kadar aktif işlediğini gösterir. Dönüşüm temaları (metamorfoz, ölüm-yeniden doğuş, evrim), arketipsel geçişler (bir arketipten diğerine geçiş) ve lucid rüyalarda yönlendirilen dönüşümler bu skoru besler.\n\nYüksek Dönüşüm Skoru, köklü bir değişim döneminde olunduğuna ya da bilinçaltının aktif olarak bir dönüşüm süreci yürüttüğüne işaret edebilir.',
    whyItMatters: 'Dönüşüm Skoru, kişisel gelişim yolculuğunun bilinçaltı boyutunu yansıtır. Yüksek dönemler, hayatınızdaki büyük değişimlerle örtüşebilir.',
    howToInteract: 'Benim Dünyam ekranındaki Bilinç Seviyesi bölümünde Dönüşüm Skoru görüntülenir. Arketip evrim grafiğinde buna paralel örüntüler görebilirsiniz.',
    relatedSlugs: ['transformation', 'consciousness-level', 'resonance-score'],
  },

  {
    slug: 'dream-places',
    title: 'Dream Places',
    subtitle: 'Rüya Mekanları — Bilinçaltının coğrafyası',
    category: 'collective',
    icon: 'location-outline',
    shortDesc: 'Dünyadaki gerçek coğrafi konumların rüyalarda en sık belirdiği yerleri haritalaşan kolektif coğrafya sistemi.',
    detail: 'Dream Places, gerçek dünyadaki şehirlerin, ülkelerin, doğa bölgelerinin ve mekanların rüyalarda ne kadar sık göründüğünü izleyen kolektif bir coğrafya katmanıdır.\n\nBir mekanın rüya aktivitesi yüksekse, o yer güçlü bir "Dream Score" taşır. Paris, Tokyo, İstanbul gibi kültürel ağırlık taşıyan şehirler ya da Himalayalar, Amazon gibi arketipsel coğrafi bölgeler yüksek Dream Skorlarıyla öne çıkabilir. Ayrıca kişisel mekan analizi (Childhood Home / Çocukluk Evi, School / Okul gibi arketipsel mekanlar) da bu sistem içinde yer alır.',
    whyItMatters: 'Dream Places, belirli bir coğrafi konumun bilinçaltı alanındaki ağırlığını gösterir. Sık rüyanızda belirlediğiniz mekanların analizi, o yerlerle derin kişisel ya da kültürel bağlarınızı ortaya koyabilir.',
    howToInteract: 'KEŞFET menüsündeki Dream Places ekranından dünya genelindeki trend mekanları keşfedin. Bir mekana dokunarak detaylı istatistikleri, baskın duyguları ve temaları inceleyin.',
    relatedSlugs: ['dream-atlas', 'dream-map', 'collective-dream'],
  },

  {
    slug: 'archetype-evolution',
    title: 'Archetype Evolution',
    subtitle: 'Arketip Evrimi — Bilinçaltının zaman içindeki dönüşümü',
    category: 'system',
    icon: 'git-commit-outline',
    shortDesc: 'Rüyacının baskın arketipinin zaman içinde nasıl değiştiğini gösteren kronolojik gelişim zaman çizelgesi.',
    detail: 'Arketip Evrimi, bilinçaltınızın hangi dönemlerde hangi arketip enerjisiyle en güçlü temas kurduğunu zaman çizelgesi formatında gösterir. Bir yıl önce Kahraman arketipiyle baskın olan biri, bugün Bilge Yaşlı enerjisiyle resonans kuruyor olabilir.\n\nBu evrim, psikolojik büyümenin ve yaşam dönemlerinin bilinçaltı yansımasıdır. Köklü değişimler, ilişkilerin başlangıç ve bitişleri, kayıplar, başarılar — hepsi arketip değişimlerinde görünür.',
    whyItMatters: 'Arketip Evrimi grafiği, kişisel büyüme yolculuğunuzun bilinçaltı haritasıdır. Hangi dönemde hangi enerjiyle temas kurduğunuzu görmek, yaşam örüntülerinizi anlama kapısı açar.',
    howToInteract: 'Benim Dünyam ekranındaki Arketip Evrimi bölümünde zaman çizelgesini inceleyin. Her arketip periyadı üzerine dokunarak o döneme ait rüyalara erişin.',
    relatedSlugs: ['consciousness-identity', 'shadow', 'hero'],
  },
];

// Helper to get all entries for a given category
export function getEntriesByCategory(category: CodexCategory): CodexEntry[] {
  return CODEX_ENTRIES.filter(e => e.category === category);
}

// Helper to get entry by slug
export function getEntryBySlug(slug: string): CodexEntry | undefined {
  return CODEX_ENTRIES.find(e => e.slug === slug);
}

// Helper to search entries
export function searchEntries(query: string): CodexEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return CODEX_ENTRIES;
  return CODEX_ENTRIES.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.subtitle.toLowerCase().includes(q) ||
    e.shortDesc.toLowerCase().includes(q) ||
    e.category.toLowerCase().includes(q),
  );
}
