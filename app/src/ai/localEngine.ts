import type {
  LanguageId,
  MemorySnapshot,
  NarrateRequest,
  PlanRequest,
  Reflection,
  ReflectRequest,
  SessionPlan,
} from './contracts'

/**
 * The night that runs when no narrator is configured.
 *
 * It genuinely reads the prompt — place, who the listener asked for, what they
 * are carrying — and writes from that, in their language. It is not Claude,
 * and it does not pretend to be: it exists so the whole product works end to
 * end on a laptop with no keys, and so the flow can be tested.
 */

type SceneId = 'forest' | 'beach' | 'mountain' | 'city' | 'space' | 'cabin' | 'room' | 'open'
type PersonaId = 'father' | 'mother' | 'friend' | 'lover' | 'guide' | 'stranger' | 'companion'
type FeelingId = 'fear' | 'loneliness' | 'exhaustion' | 'sadness' | 'longing' | 'calm'

interface Reading {
  scene: SceneId
  persona: PersonaId
  feeling: FeelingId
  ambience: string
}

/** Word stems, matched case- and suffix-insensitively against the prompt. */
const SCENE_WORDS: Record<SceneId, string[]> = {
  forest: ['orman', 'ağaç', 'agac', 'forest', 'tree', 'wood'],
  beach: ['sahil', 'deniz', 'plaj', 'okyanus', 'kumsal', 'beach', 'sea', 'ocean', 'shore', 'coast'],
  mountain: ['dağ', 'dag', 'zirve', 'tepe', 'mountain', 'peak', 'hill', 'cliff'],
  city: ['şehir', 'sehir', 'sokak', 'tokyo', 'kyoto', 'city', 'street', 'town', 'neon'],
  space: ['uzay', 'yıldız', 'yildiz', 'gezegen', 'space', 'star', 'planet', 'orbit'],
  cabin: ['kulübe', 'kulube', 'kabin', 'şömine', 'somine', 'cabin', 'fireplace', 'hut', 'lodge'],
  room: ['oda', 'yatak', 'ev', 'pencere', 'room', 'bed', 'home', 'window'],
  open: [],
}

const PERSONA_WORDS: Record<PersonaId, string[]> = {
  father: ['baba', 'babam', 'father', 'dad'],
  mother: ['anne', 'annem', 'mother', 'mom', 'mum'],
  friend: ['arkadaş', 'arkadas', 'dost', 'friend', 'buddy'],
  lover: ['sevgili', 'aşk', 'ask', 'romantik', 'lover', 'partner', 'romantic'],
  guide: ['rehber', 'öğretmen', 'ogretmen', 'usta', 'bilge', 'guide', 'teacher', 'mentor'],
  stranger: ['yabancı', 'yabanci', 'stranger'],
  companion: [],
}

const FEELING_WORDS: Record<FeelingId, string[]> = {
  fear: ['kork', 'korkma', 'korkuyorum', 'endişe', 'endise', 'afraid', 'fear', 'scared', 'anxious'],
  loneliness: ['yalnız', 'yalniz', 'lonely', 'alone'],
  exhaustion: ['yorgun', 'bitkin', 'tükenmiş', 'tukenmis', 'tired', 'exhausted', 'worn'],
  sadness: ['üzgün', 'uzgun', 'hüzün', 'huzun', 'ağla', 'agla', 'sad', 'grief', 'cry'],
  longing: ['özle', 'ozle', 'hasret', 'miss', 'longing', 'yearn'],
  calm: [],
}

const SCENE_AMBIENCE: Record<SceneId, string> = {
  forest: 'forest',
  beach: 'ocean',
  mountain: 'wind',
  city: 'rain',
  space: 'night',
  cabin: 'fireplace',
  room: 'rain',
  open: 'night',
}

function matchFirst<T extends string>(
  prompt: string,
  table: Record<T, string[]>,
  fallback: T,
): T {
  const haystack = prompt.toLocaleLowerCase('tr-TR')
  for (const key of Object.keys(table) as T[]) {
    if (table[key].some((word) => haystack.includes(word))) return key
  }
  return fallback
}

export function read(prompt: string, preferredAmbience: string): Reading {
  const scene = matchFirst(prompt, SCENE_WORDS, 'open')
  return {
    scene,
    persona: matchFirst(prompt, PERSONA_WORDS, 'companion'),
    feeling: matchFirst(prompt, FEELING_WORDS, 'calm'),
    ambience:
      preferredAmbience && preferredAmbience !== 'none'
        ? preferredAmbience
        : SCENE_AMBIENCE[scene],
  }
}

/* ---------------------------------------------------------------- copy ---- */

interface CopyBank {
  title: Record<SceneId, string>
  scene: Record<SceneId, string>
  who: Record<PersonaId, string>
  relationship: Record<PersonaId, string>
  voiceDirection: string
  /** Arrival: where they are, what it feels like. */
  arrival: Record<SceneId, string[]>
  /** The companion speaking to what they are carrying. */
  reassurance: Record<FeelingId, string[]>
  /** Moving further in. */
  journey: Record<SceneId, string[]>
  /** What the persona would actually say. */
  voice: Record<PersonaId, string[]>
  /** Settling toward sleep. */
  closing: string[]
  arc: string[]
  opening: Record<SceneId, string>
}

const TR: CopyBank = {
  title: {
    forest: 'Ormanın Derinliği',
    beach: 'Sessiz Kıyı',
    mountain: 'Yüksekte Gece',
    city: 'Uyumayan Şehir',
    space: 'Yıldızların Arası',
    cabin: 'Ateşin Yanı',
    room: 'Perdenin Ardı',
    open: 'Bu Gecenin Yeri',
  },
  scene: {
    forest: 'Yıldızların altında, ağaçların arasında ilerleyen bir patika.',
    beach: 'Karanlık ve sakin bir denizin kıyısı, ıslak kum.',
    mountain: 'Rüzgârın hiç durmadığı yüksek bir yamaç.',
    city: 'Yağmurun yeni yıkadığı, boşalmış sokaklar.',
    space: 'Sessizliğin en derin olduğu yer, yıldızların arası.',
    cabin: 'Dışarısı soğuk, içerisi ateşin ısıttığı küçük bir kulübe.',
    room: 'Perdesi aralık, yağmurun camda ilerlediği bir oda.',
    open: 'Adını henüz koymadığın, sessiz bir yer.',
  },
  who: {
    father: 'baban',
    mother: 'annen',
    friend: 'eski bir dostun',
    lover: 'sana yakın biri',
    guide: 'yolu bilen biri',
    stranger: 'yolda karşılaştığın biri',
    companion: 'sana eşlik eden ses',
  },
  relationship: {
    father: 'seni tanıyan, telaşa kapılmayan biri',
    mother: 'sesi tek başına yetebilen biri',
    friend: 'yanında susabileceğin biri',
    lover: 'seni dikkatle dinleyen biri',
    guide: 'acelesi olmayan bir rehber',
    stranger: 'senden hiçbir şey istemeyen biri',
    companion: 'gece boyunca yanında kalacak biri',
  },
  voiceDirection: 'Yavaş, alçak, kulağa yakın. Cümleler arasında boşluk bırak.',
  arrival: {
    forest: [
      'Ayaklarının altında nemli toprak var. [breathes] Her adımda yaprakların sesi biraz daha yumuşuyor.',
      'Ağaçların arası serin. Yukarıda dallar birbirine değiyor, ama rüzgâr seni bulmuyor.',
      'Karanlık burada korkutucu değil; sadece kalın. Gözlerin ona alışıyor.',
    ],
    beach: [
      'Kum hâlâ günden kalma ılıklığını tutuyor. [breathes] Ayaklarının altında usulca çöküyor.',
      'Dalgalar uzakta başlıyor ve sana ulaşana kadar yavaşlıyor.',
      'Tuz kokusu ve yağmurun kokusu aynı anda geliyor.',
    ],
    mountain: [
      'Hava burada daha ince. [breathes] Her nefes biraz daha fark ediliyor.',
      'Aşağıda vadinin ışıkları var; buradan hiçbiri acele etmiyor gibi görünüyor.',
      'Rüzgâr yanından geçiyor ama seni itmiyor.',
    ],
    city: [
      'Sokaklar yağmurdan yeni çıkmış. Işıklar asfaltta ikiye katlanıyor.',
      'Kimse yok. [pause] Şehir, sadece senin için bu kadar sessiz.',
      'Bir vitrinin ışığı kaldırıma düşüyor, sonra o da sönüyor.',
    ],
    space: [
      'Altında hiçbir şey yok ve bu seni korkutmuyor. [breathes]',
      'Yıldızlar titremiyor burada. Sadece duruyorlar.',
      'Ses yok. Ama sessizlik boş değil; dolu bir sessizlik bu.',
    ],
    cabin: [
      'Ateş yeni tutuşmuş. [breathes] Odanın köşelerine kadar uzanıyor ışığı.',
      'Dışarıda hava sertleşiyor, içeride tahta ısındıkça kokusu açılıyor.',
      'Bir kütük çatırdıyor ve sonra her şey yine sessizleşiyor.',
    ],
    room: [
      'Yağmur camda yavaş yavaş aşağı iniyor. [breathes] Hiçbiri acele etmiyor.',
      'Odada tek ışık dışarıdan geliyor ve o da soluk.',
      'Yorgan ağır, sıcak, tam olması gerektiği kadar.',
    ],
    open: [
      'Burası henüz hiçbir şeye benzemiyor. [breathes] Sen baktıkça şekilleniyor.',
      'Etrafında yumuşak bir karanlık var; içinde kaybolmuyorsun, dinleniyorsun.',
      'Hiçbir yere yetişmen gerekmiyor.',
    ],
  },
  reassurance: {
    fear: [
      '“Korkmana gerek yok,” diyor. [softly] “Ben buradayım ve hiçbir yere gitmiyorum.”',
      '“Karanlık, içinde ne olduğunu bilmediğin şey demek değil. Sadece henüz bakmadığın şey.”',
      '“Nefesini bana bırak. Sen sadece yürü.” [long pause]',
    ],
    loneliness: [
      '“Yalnız değilsin,” diyor. [softly] “Bu gece hiç değilsin.”',
      '“Bazı geceler insanın yanında sadece bir ses olması yetiyor. Bu gece o sesim.”',
      '“Konuşmak zorunda değilsin. Ben zaten buradayım.” [pause]',
    ],
    exhaustion: [
      '“Bugün yeterince taşıdın,” diyor. “Şimdi bırak.”',
      '“Hiçbir şeyi çözmek zorunda değilsin. Sadece yürü ve dinle.”',
      '“Omuzların düşsün. [breathes] İşte böyle.”',
    ],
    sadness: [
      '“Üzgün olman bir şeyi bozmuyor,” diyor. [softly] “Sadece bir şeye değer verdiğini gösteriyor.”',
      '“İstersen anlat, istersen anlatma. İkisi de olur.”',
      '“Bu da geçecek ama bu gece geçmesi gerekmiyor.” [pause]',
    ],
    longing: [
      '“Özlemek kötü bir şey değil,” diyor. “Bir şeyin gerçekten yaşandığının kanıtı.”',
      '“Aklından geçeni burada bırakabilirsin. Sabaha kadar ben tutarım.”',
      '“Bazı insanlar gittikten sonra da yanında yürümeye devam eder.” [long pause]',
    ],
    calm: [
      '“İyi gidiyorsun,” diyor. [softly] “Hiçbir şeyi değiştirmen gerekmiyor.”',
      '“Bu saat senin. Ne kadar yavaş istersen o kadar yavaş.”',
      '“Sadece burada ol. Gerisi kendiliğinden olur.” [pause]',
    ],
  },
  journey: {
    forest: [
      'Patika hafifçe aşağı iniyor. Ağaçlar seyreliyor, aralarından gökyüzü görünmeye başlıyor.',
      'Uzakta bir dere var; sesi ne yaklaşıyor ne uzaklaşıyor.',
      'Bir dalın altından eğilerek geçiyorsun. Yaprakların ucunda kalan su omzuna değiyor.',
      'Ormanın sonu görünüyor artık. [pause] Ama acelen yok.',
    ],
    beach: [
      'Su kenarına doğru yürüyorsun. Kum ıslandıkça sertleşiyor.',
      'Bir dalga ayak bileklerine kadar geliyor ve geri çekiliyor.',
      'Ateşin ışığı arkanda kalıyor, önünde sadece karanlık su var.',
      'Sular çekiliyor. [pause] Kıyı her seferinde biraz daha genişliyor.',
    ],
    mountain: [
      'Yamaç yumuşuyor. Yürümek kolaylaşıyor.',
      'Bir kayanın arkasında rüzgâr tamamen kesiliyor. Orada bir an duruyorsun.',
      'Gökyüzü buradan daha geniş görünüyor; sanki biraz alçalmış.',
      'Aşağıdaki ışıklar teker teker sönüyor. [pause]',
    ],
    city: [
      'Bir köşeyi dönüyorsun. Sokak daha dar, daha sessiz.',
      'Bir kafenin camı buğulu. İçeride kimse yok ama ışık yanıyor.',
      'Yağmur hafifliyor. Şimdi sadece saçaklardan damlıyor.',
      'Sokağın sonunda bir park var. [pause] Kapısı açık.',
    ],
    space: [
      'Yavaşça dönüyorsun. Yıldızlar seninle birlikte dönüyor.',
      'Uzakta mavi bir şey var; adını bilmiyorsun ve bilmek de istemiyorsun.',
      'Zaman burada başka türlü geçiyor. Daha az ısrarla.',
      'Bir ışık yanından geçiyor ve arkasında iz bırakmıyor. [pause]',
    ],
    cabin: [
      'Ateşe biraz daha yaklaşıyorsun. Yüzün ısınıyor.',
      'Dışarıda rüzgâr camı yokluyor ama içeri giremiyor.',
      'Bir battaniye omzuna geliyor. [softly] Kim koyduğunu sormuyorsun.',
      'Ateş alçalıyor artık. Korlar daha derin bir turuncu. [pause]',
    ],
    room: [
      'Yağmurun ritmi yavaşlıyor. Damlalar arasındaki boşluk uzuyor.',
      'Sokaktan bir araba geçiyor; ışığı tavanda yürüyüp kayboluyor.',
      'Yastık serin tarafına dönüyor.',
      'Göz kapakların ağırlaşıyor. [long pause] Karşı koymana gerek yok.',
    ],
    open: [
      'Yer yavaşça bir şeye dönüşüyor. Ne olduğunu sen seçiyorsun.',
      'Uzakta bir ışık var. Yaklaştıkça sıcaklaşıyor.',
      'Adımların sesi kayboluyor. Sadece yürüyorsun.',
      'Etraf kararıyor ama bu bir şeyin bitmesi gibi değil. [pause]',
    ],
  },
  voice: {
    father: [
      '“Ben senin yaşındayken de aynısını düşünürdüm,” diyor. “Sonunda geçti. Seninki de geçecek.”',
      '“Acele etme. [pause] Hiçbir doğru karar acele verilmedi.”',
      '“Bir şeyi beceremediğin için değil, çok denediğin için yorgunsun. Aradaki fark önemli.”',
      '“Sana bir şey söyleyeyim mi? Bugüne kadar hep bir yolunu buldun.”',
    ],
    mother: [
      '“Bir şey yemedin bugün, biliyorum,” diyor. [chuckles] “Yarın ilk işin o.”',
      '“Kimseye bir şey kanıtlamak zorunda değilsin. Bana hiç değilsin.”',
      '“Buraya kadar gelmen bile yeterdi.” [pause]',
    ],
    friend: [
      '“Hatırlıyor musun,” diyor, “bunu daha önce de atlatmıştın.”',
      '“Bir şey söylemek zorunda değilsin, biliyorsun değil mi?” [chuckles]',
      '“Sana bir şey olursa ilk ben bilirim. Bu gece bir şey yok.”',
    ],
    lover: [
      '“Gözlerini kapat,” diyor, sesi biraz daha alçalarak. [whispers] “Ben buradayım.”',
      '“Bütün gün bunu düşündüm,” diyor. “Seni böyle, sakin görmek istedim.”',
      '“Kimse acele etmiyor. [pause] Hele biz hiç.”',
    ],
    guide: [
      '“Bak,” diyor ve durup bir şeyi işaret ediyor. “İşte bunun için geldik.”',
      '“Bir şeyi anlamak için hep ileri gitmek gerekmez. Bazen durmak yeter.”',
      '“Sorman gereken soruyu zaten biliyorsun.” [pause]',
    ],
    stranger: [
      '“Buradan herkes bir kere geçer,” diyor. “Çoğu geri dönmez. Sen döneceksin.”',
      '“Adını sormayacağım,” diyor. [softly] “Gerek yok.”',
      '“Yolun geri kalanı kolay. Söz.”',
    ],
    companion: [
      '“Buradayım,” diyor. [softly] “Bütün gece.”',
      '“İstersen susalım. Sessizlik de bir sohbet sayılır.”',
      '“Bir sonraki adımı ben biliyorum. Sen sadece yürü.” [pause]',
    ],
  },
  closing: [
    'Yürümek yavaşlıyor. [long pause] Artık bir yere gitmiyorsun, sadece buradasın.',
    'Sesi giderek alçalıyor ama uzaklaşmıyor. [whispers] Hâlâ yanında.',
    'Nefesin kendi ritmini buldu. [breathes] Onu takip etmene bile gerek yok.',
    'Bırak. [long pause] İyi geceler.',
  ],
  arc: [
    'Varış — yerin ilk duyusu',
    'Eşlikçi konuşuyor, korku yatışıyor',
    'Yolun ortası, manzara açılıyor',
    'Yavaşlama ve sessizlik',
    'Uykuya bırakma',
  ],
  opening: {
    forest: 'Ağaçların arasındasın ve hava sandığından daha yumuşak.',
    beach: 'Kumun üstündesin ve deniz nefes alıp veriyor.',
    mountain: 'Yüksektesin ve aşağıda hiçbir şeyin acelesi yok.',
    city: 'Sokaklar boş ve yağmur yeni durmuş.',
    space: 'Yıldızların arasındasın ve hiçbiri sana bakmıyor.',
    cabin: 'İçerisi sıcak ve ateş yeni tutuştu.',
    room: 'Yatağındasın ve yağmur camda yavaşça iniyor.',
    open: 'Buradasın. [pause] Şimdilik bu kadarı yeterli.',
  },
}

const EN: CopyBank = {
  title: {
    forest: 'Deep in the Trees',
    beach: 'The Quiet Shore',
    mountain: 'High and Still',
    city: 'The Sleepless Streets',
    space: 'Between the Stars',
    cabin: 'Beside the Fire',
    room: 'Behind the Curtain',
    open: 'Somewhere Tonight',
  },
  scene: {
    forest: 'A path through the trees beneath the stars.',
    beach: 'The edge of a dark, calm sea, and wet sand.',
    mountain: 'A high slope where the wind never quite stops.',
    city: 'Empty streets the rain has just washed.',
    space: 'The deepest quiet there is, out among the stars.',
    cabin: 'A small cabin, cold outside, warm where the fire is.',
    room: 'A room with the curtain open and rain moving down the glass.',
    open: 'A quiet place you have not named yet.',
  },
  who: {
    father: 'your father',
    mother: 'your mother',
    friend: 'an old friend',
    lover: 'someone close to you',
    guide: 'someone who knows the way',
    stranger: 'someone you met on the road',
    companion: 'the voice beside you',
  },
  relationship: {
    father: 'someone who knows you and never panics',
    mother: 'someone whose voice alone is enough',
    friend: 'someone you can be silent with',
    lover: 'someone listening closely',
    guide: 'a guide in no hurry at all',
    stranger: 'someone who wants nothing from you',
    companion: 'someone staying with you all night',
  },
  voiceDirection: 'Slow, low, close to the ear. Leave space between sentences.',
  arrival: {
    forest: [
      'The ground is soft under your feet. [breathes] Every step lands quieter than the last.',
      'It is cool between the trees. Branches touch overhead, but the wind never finds you.',
      'The dark here is not frightening. It is only thick, and your eyes are learning it.',
    ],
    beach: [
      'The sand still holds the warmth of the day. [breathes] It gives a little under you.',
      'The waves begin far out and slow all the way in.',
      'Salt and rain arrive on the same breath of air.',
    ],
    mountain: [
      'The air is thinner up here. [breathes] Each breath announces itself.',
      'Below you the valley lights are on, and none of them are in a hurry.',
      'The wind passes you without pushing.',
    ],
    city: [
      'The streets have just come out of the rain. The lights double on the asphalt.',
      'No one is here. [pause] The city is this quiet only for you.',
      'A shop window throws light across the pavement, then goes out.',
    ],
    space: [
      'There is nothing beneath you, and it does not frighten you. [breathes]',
      'The stars do not flicker here. They simply hold.',
      'There is no sound. But the silence is not empty — it is full.',
    ],
    cabin: [
      'The fire has just caught. [breathes] Its light reaches the corners of the room.',
      'Outside the weather hardens; inside, the warming wood begins to smell of itself.',
      'A log cracks, and then everything is quiet again.',
    ],
    room: [
      'Rain moves slowly down the glass. [breathes] None of it is in a hurry.',
      'The only light comes from outside, and even that is faint.',
      'The blanket is heavy and warm, exactly as much as it should be.',
    ],
    open: [
      'This place is not like anything yet. [breathes] It takes shape as you look.',
      'A soft darkness is around you. You are not lost in it; you are resting in it.',
      'There is nowhere you have to be.',
    ],
  },
  reassurance: {
    fear: [
      '"You do not need to be afraid," he says. [softly] "I am here, and I am not going anywhere."',
      '"Dark does not mean you do not know what is in it. It only means you have not looked yet."',
      '"Give me the breathing. You just walk." [long pause]',
    ],
    loneliness: [
      '"You are not alone," the voice says. [softly] "Not tonight."',
      '"Some nights all a person needs is one voice nearby. Tonight I am that voice."',
      '"You do not have to talk. I am here regardless." [pause]',
    ],
    exhaustion: [
      '"You carried enough today," the voice says. "Put it down."',
      '"You do not have to solve anything. Just walk, and listen."',
      '"Let your shoulders drop. [breathes] There it is."',
    ],
    sadness: [
      '"Being sad does not break anything," the voice says. [softly] "It only means it mattered."',
      '"Tell me, or do not. Either is fine."',
      '"This passes. But it does not have to pass tonight." [pause]',
    ],
    longing: [
      '"Missing someone is not a fault," the voice says. "It is proof something was real."',
      '"You can leave the thought here. I will hold it until morning."',
      '"Some people keep walking beside you long after they have gone." [long pause]',
    ],
    calm: [
      '"You are doing fine," the voice says. [softly] "Nothing needs changing."',
      '"This hour is yours. As slow as you want it."',
      '"Just be here. The rest takes care of itself." [pause]',
    ],
  },
  journey: {
    forest: [
      'The path tilts gently downhill. The trees thin, and sky begins to show between them.',
      'There is a stream somewhere ahead. It comes no nearer and no further away.',
      'You duck under a branch. Water gathered on the leaves touches your shoulder.',
      'You can see the end of the forest now. [pause] There is no hurry.',
    ],
    beach: [
      'You walk toward the water. The sand firms as it wets.',
      'A wave reaches your ankles and withdraws.',
      'The firelight is behind you now; ahead there is only dark water.',
      'The tide is going out. [pause] The shore widens with every pull.',
    ],
    mountain: [
      'The slope softens. Walking becomes easy.',
      'Behind a rock the wind stops completely. You stand there a moment.',
      'The sky looks wider from here, as if it had come down a little.',
      'The lights below go out one by one. [pause]',
    ],
    city: [
      'You turn a corner. The street is narrower, quieter.',
      'A café window is fogged. No one inside, but the light is on.',
      'The rain eases. Now it only drips from the eaves.',
      'There is a park at the end of the street. [pause] The gate is open.',
    ],
    space: [
      'You turn slowly. The stars turn with you.',
      'Something blue is far off. You do not know its name and do not want to.',
      'Time passes differently here. With less insistence.',
      'A light goes by and leaves no trace behind it. [pause]',
    ],
    cabin: [
      'You move closer to the fire. Your face warms.',
      'Outside the wind tests the window and cannot get in.',
      'A blanket arrives around your shoulders. [softly] You do not ask who.',
      'The fire is lower now. The coals are a deeper orange. [pause]',
    ],
    room: [
      'The rhythm of the rain slows. The gaps between drops grow longer.',
      'A car passes below; its light walks across the ceiling and is gone.',
      'The pillow turns to its cool side.',
      'Your eyelids are heavy. [long pause] You do not have to fight it.',
    ],
    open: [
      'The place is becoming something. You are the one choosing what.',
      'There is a light ahead. It warms as you near it.',
      'The sound of your steps fades. You are simply walking.',
      'It is going dark, but not the way things end. [pause]',
    ],
  },
  voice: {
    father: [
      '"I thought the same at your age," he says. "It passed. Yours will too."',
      '"Take your time. [pause] No good decision was ever rushed."',
      '"You are tired because you tried, not because you failed. The difference matters."',
      '"Let me tell you something. You have always found a way. Every time."',
    ],
    mother: [
      '"You did not eat today, I know," she says. [chuckles] "First thing tomorrow."',
      '"You do not have to prove anything to anyone. Least of all to me."',
      '"Getting this far would have been enough." [pause]',
    ],
    friend: [
      '"Remember," they say, "you came through this before."',
      '"You do not have to say anything, you know that?" [chuckles]',
      '"If something were wrong, I would know first. Tonight nothing is."',
    ],
    lover: [
      '"Close your eyes," they say, lower now. [whispers] "I am right here."',
      '"I thought about this all day," they say. "I wanted to see you calm like this."',
      '"Nobody is in a hurry. [pause] Least of all us."',
    ],
    guide: [
      '"Look," they say, stopping to point. "This is what we came for."',
      '"You do not always have to go further to understand. Sometimes stopping is enough."',
      '"You already know the question you meant to ask." [pause]',
    ],
    stranger: [
      '"Everyone passes through here once," they say. "Most do not come back. You will."',
      '"I will not ask your name," they say. [softly] "No need."',
      '"The rest of the way is easy. I promise."',
    ],
    companion: [
      '"I am here," the voice says. [softly] "All night."',
      '"We can be quiet, if you like. Silence counts as talking too."',
      '"I know the next step. You just walk." [pause]',
    ],
  },
  closing: [
    'The walking slows. [long pause] You are not going anywhere now. You are just here.',
    'The voice drops lower but does not move away. [whispers] Still beside you.',
    'Your breath has found its own rhythm. [breathes] You do not even have to follow it.',
    'Let go. [long pause] Good night.',
  ],
  arc: [
    'Arrival — the first sense of the place',
    'The companion speaks; the fear settles',
    'Midway, the view opens',
    'Slowing, and quiet',
    'Letting go into sleep',
  ],
  opening: {
    forest: 'You are among the trees, and the air is softer than you expected.',
    beach: 'You are on the sand, and the sea is breathing.',
    mountain: 'You are high up, and nothing below is in a hurry.',
    city: 'The streets are empty and the rain has just stopped.',
    space: 'You are among the stars, and not one of them is looking at you.',
    cabin: 'It is warm inside, and the fire has only just caught.',
    room: 'You are in bed, and the rain is coming slowly down the glass.',
    open: 'You are here. [pause] For now that is enough.',
  },
}

const BANKS: Record<LanguageId, CopyBank> = { tr: TR, en: EN }

/* ------------------------------------------------------------- engine ---- */

/** Deterministic pick, so the same night reads the same way twice. */
function pick<T>(pool: readonly T[], seed: number): T {
  return pool[((seed % pool.length) + pool.length) % pool.length]
}

function memoryCallback(memory: MemorySnapshot, lang: LanguageId): string {
  const moment = memory.moments[memory.moments.length - 1]
  if (!moment) return ''
  return lang === 'tr'
    ? `Geçen sefer ${moment.text} demiştin. [pause] Onu unutmadım.`
    : `Last time you said ${moment.text}. [pause] I did not forget it.`
}

export function localPlan(req: PlanRequest): SessionPlan {
  const bank = BANKS[req.lang]
  const reading = read(req.prompt, req.prefs.amb)
  const beats = Math.max(3, Math.round(req.minutes / 5))

  return {
    title: bank.title[reading.scene],
    scene: bank.scene[reading.scene],
    persona: {
      who: bank.who[reading.persona],
      relationship: bank.relationship[reading.persona],
      voiceDirection: bank.voiceDirection,
    },
    arc: Array.from({ length: beats }, (_, i) => pick(bank.arc, i)),
    ambience: reading.ambience,
    openingLine: bank.opening[reading.scene],
    rememberedLine: memoryCallback(req.memory, req.lang),
  }
}

/**
 * Writes one segment. Paragraph count follows the segment's length so the
 * pacing matches what the real narrator would produce.
 */
export function localNarrate(req: NarrateRequest): string {
  const bank = BANKS[req.lang]
  const reading = read(`${req.plan.scene} ${req.plan.persona.who}`, req.plan.ambience)
  const isFirst = req.segment === 0
  const isLast = req.segment === req.segments - 1
  const seed = req.segment * 7 + 3
  const paragraphs: string[] = []

  if (req.userSaid?.trim()) {
    paragraphs.push(
      req.lang === 'tr'
        ? `“${req.userSaid.trim()}” diyorsun. [pause] Bir an sessizlik oluyor, sonra cevap geliyor.`
        : `"${req.userSaid.trim()}," you say. [pause] There is a moment of quiet, then an answer.`,
    )
    paragraphs.push(pick(bank.voice[reading.persona], seed + 2))
  }

  if (isFirst) {
    paragraphs.push(req.plan.openingLine)
    if (req.plan.rememberedLine.trim()) paragraphs.push(req.plan.rememberedLine)
    paragraphs.push(...bank.arrival[reading.scene].slice(0, 2))
    paragraphs.push(pick(bank.reassurance[readFeeling(req)], seed))
  } else if (isLast) {
    paragraphs.push(pick(bank.journey[reading.scene], seed))
    paragraphs.push(pick(bank.voice[reading.persona], seed + 1))
    paragraphs.push(...bank.closing)
  } else {
    paragraphs.push(pick(bank.journey[reading.scene], seed))
    paragraphs.push(pick(bank.voice[reading.persona], seed))
    paragraphs.push(pick(bank.reassurance[readFeeling(req)], seed + 1))
    paragraphs.push(pick(bank.journey[reading.scene], seed + 2))
  }

  return paragraphs.filter(Boolean).join('\n\n')
}

function readFeeling(req: NarrateRequest): FeelingId {
  return read(`${req.plan.scene} ${req.plan.arc.join(' ')}`, req.plan.ambience).feeling
}

/** Learns from the prompt alone — no model, but the words are the user's own. */
export function localReflect(req: ReflectRequest): Reflection {
  const reading = read(req.prompt, 'none')
  const bank = BANKS[req.lang]
  const sentence = req.prompt
    .split(/[.\n!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)[0]

  return {
    themes: [bank.title[reading.scene]],
    feelings: reading.feeling === 'calm' ? [] : [feelingLabel(reading.feeling, req.lang)],
    personas: reading.persona === 'companion' ? [] : [bank.who[reading.persona]],
    moments: sentence ? [sentence.slice(0, 90)] : [],
  }
}

function feelingLabel(feeling: FeelingId, lang: LanguageId): string {
  const labels: Record<LanguageId, Record<FeelingId, string>> = {
    tr: {
      fear: 'korku',
      loneliness: 'yalnızlık',
      exhaustion: 'yorgunluk',
      sadness: 'hüzün',
      longing: 'özlem',
      calm: 'sakinlik',
    },
    en: {
      fear: 'fear',
      loneliness: 'loneliness',
      exhaustion: 'exhaustion',
      sadness: 'sadness',
      longing: 'longing',
      calm: 'calm',
    },
  }
  return labels[lang][feeling]
}
