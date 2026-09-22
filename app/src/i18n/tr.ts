import type { Locale } from './types'

export const tr: Locale = {
  meta: { name: 'Turkish', nativeName: 'Türkçe', htmlLang: 'tr', locale: 'tr-TR' },

  common: {
    appName: 'Dreamscape',
    continue: 'Devam',
    skip: 'Geç',
    done: 'Tamam',
    back: 'Geri',
    cancel: 'Vazgeç',
    close: 'Kapat',
    minutes: '{n} dk',
    minutesShort: '{n}dk',
    seconds: '{n}sn',
    and: 've',
  },

  language: {
    title: 'Dilini seç',
    subtitle: 'Rüyaların seçtiğin dilde yazılacak ve seslendirilecek.',
    note: 'Bunu istediğin zaman Profil’den değiştirebilirsin.',
    cta: 'Devam',
  },

  consent: {
    title: 'Başlamadan önce',
    body: 'Dreamscape ne tarif edersen onu anlatır. Eşlikçinin nereye kadar gidebileceğini söyle ki bu gece tam istediğin gibi olsun.',
    ageTitle: '18 yaşından büyüğüm',
    ageBody: 'Bazı tonlar yalnızca yetişkinler için.',
    toneTitle: 'Eşlikçin nasıl konuşsun?',
    toneBody: 'Bunu istediğin zaman Profil’den değiştirebilirsin.',
    tones: {
      gentle: 'Sakin',
      gentleDesc: 'Yumuşak, huzur veren, uyku için.',
      romantic: 'Romantik',
      romanticDesc: 'Sıcak, sevecen, flörtöz.',
      mature: 'Yetişkin',
      matureDesc: 'Yetişkinlere açık temalar. 18+ gerektirir.',
    },
    cta: 'Rüyaya başla',
    needsAge: 'Bu tonu seçmek için 18 yaşından büyük olduğunu onayla.',
  },

  splash: { tagline: 'Gözlerini kapat. Seni bir yere götüreceğiz.' },

  onboarding: {
    steps: [
      {
        title: 'Bu gece zihnin nereye gitsin?',
        body: 'Bir çalma listesi değil. Bir kurs değil. Senin tarif ettiğin, yalnızca senin için anlatılan bir yer.',
        quote: '',
        cta: 'Devam',
      },
      {
        title: 'Bir dünya tarif et.\nOnu hayata geçirelim.',
        body: 'Bir cümle yeter. Ne kadar çok verirsen, seni o kadar uzağa götürebiliriz.',
        quote:
          'Gece yarısı sessiz bir sahil.\nYağmur yağıyor.\nYanımda küçük bir ateş var.\nBiri bana insanlık üzerine hikâyeler anlatıyor.',
        cta: 'Devam',
      },
      {
        title: 'Dinle. Hayal et. Bırak kendini.',
        body: 'Yapay zekâ geceni gerçek zamanlı yazıp seslendirir; hızını saate ve sana göre ayarlar.',
        quote: '',
        cta: 'Devam',
      },
      {
        title: 'Senin sesin. Senin hızın. Senin dünyan.',
        body: 'Kimin konuşacağını, ne kadar yavaş konuşacağını ve altta hangi sesin duracağını seç. Ya da hiçbir şeye dokunma — varsayılanlar uyku için hazırlandı.',
        quote: '',
        cta: 'Devam',
      },
      {
        title: 'Bu geceye hazır mısın?',
        body: 'Buradan hayal gücünün içine girmen yaklaşık yirmi saniye sürüyor.',
        quote: '',
        cta: 'Rüyama Gir',
      },
    ],
  },

  home: {
    greeting: 'İyi geceler, {name}',
    question: 'Bu gece neyi hayal etmek istersin?',
    tonightBadge: 'Bu gecenin rüyası',
    tonightTitle: 'Ay Işığında Orman',
    tonightDesc: 'Yıldızların altında sessiz bir ormanda yavaş bir yolculuk.',
    tonightMeta: '28 dk · Yağmur + Orman',
    begin: 'Başla',
    createSection: 'Kendi dünyanı kur',
    composerPlaceholder: 'Hayal etmek istediğin şeyi anlat…',
    examples: [
      'Yağmurlu bir sahil…',
      'Dağlarda bir kulübe…',
      'Gece Tokyo’da yürüyorum…',
      'Yıldızların altında bir ateş…',
    ],
    returnSection: 'Bir dünyaya geri dön',
    myNights: 'Gecelerim',
    favourites: [
      { title: 'Yağmurlu Sahil', meta: '32 dk · Yağmur + Okyanus' },
      { title: 'Karda Kulübe', meta: '45 dk · Şömine' },
      { title: 'Gece Yarısı Tokyo', meta: '20 dk · Şehir yağmuru' },
    ],
  },

  create: {
    heading: 'Bu gece nereye gidelim?',
    placeholder: 'Yaşamak istediğin yeri, atmosferi ya da hikâyeyi anlat…',
    useExample: 'Örnek kullan',
    mic: 'mikrofon',
    micLabel: 'Rüyanı sesle anlat',
    examplePrompt:
      'Sessiz bir sahilde küçük bir ateşin yanında oturuyorum.\nUsulca yağmur yağıyor.\nOkyanus karanlık ve sakin.\nBana insanlık üzerine anlamlı bir şey anlat.',
    durationTitle: 'Bu gece ne kadar sürsün?',
    durationLocked: 'Premium',
    settingsTitle: 'Ses, ambiyans ve süre',
    footnote: 'Bir cümle yeter. Gerisi tamamen isteğine kalmış.',
    cta: 'Beni Oraya Götür',
    emptyPrompt: 'Önce bir cümle yaz — ne olursa olsun.',
    remembers: 'Hatırlıyorum: {memory}',
  },

  generating: {
    phrases: [
      'Yazdıklarını okuyorum…',
      'Atmosferi kuruyorum…',
      'Doğru sesi buluyorum…',
      'İlk dakikalarını yazıyorum…',
      'Dünyan hazır.',
    ],
    enter: 'Gir',
    failed: 'Yazım bir şey yüzünden yarıda kaldı.',
    retry: 'Tekrar dene',
  },

  session: {
    speaking: 'Konuşuyor',
    paused: 'Duraklatıldı',
    listening: 'Dinliyor',
    end: 'Bitir',
    sleep: 'Uyu',
    talk: 'Konuş',
    mix: 'Miks',
    play: 'Oynat',
    pause: 'Duraklat',
    remaining: '{time} kaldı',
    timeUpFree: 'Ücretsiz gecen burada bitiyor.',
    timeUpFreeBody: 'Premium geceler bir saate kadar sürer.',
    seePremium: 'Premium’a bak',
    muted: 'Ses kapalı',
    unmuted: 'Ses açık',
    voiceUnavailable: 'Bu cihazda ses kullanılamıyor — kelimeler devam ediyor.',
  },

  talk: {
    tellMe: 'Anlat…',
    hint: '“Bana aşk hakkında bir şey söyle.”',
    backToDream: 'Rüyaya dön',
    backToWriting: 'Yazmaya dön',
    unsupported: 'Bu tarayıcı dinleyemiyor. Yazarak anlat.',
    send: 'Gönder',
    placeholder: 'Eşlikçine bir şey söyle…',
  },

  fade: { goodnight: 'İyi geceler.' },

  complete: {
    eyebrow: 'Seans tamamlandı',
    stats: {
      timeInDream: 'Rüyada geçen süre',
      awake: 'Uykudan önce uyanık',
      ambience: 'Ambiyans',
    },
    save: 'Gecelerime kaydet',
    replay: 'Tekrar oynat',
    learned: 'Bu gece fark ettiklerim',
  },

  explore: {
    title: 'Gezilecek dünyalar',
    cards: [
      {
        title: 'Cama Vuran Yağmur',
        desc: 'Dışarıda şehir bulanıklaşırken içeride ağır ağır geçen bir akşam.',
        meta: '25 dk · Yağmur',
      },
      {
        title: 'Okyanusun Kıyısında Ateş',
        desc: 'Tuz, duman ve hiç acele etmeyen bir ses.',
        meta: '40 dk · Ateş + Okyanus',
      },
      {
        title: 'Kyoto’da Gece Yarısı',
        desc: 'Islak taş sokaklar, kâğıt fenerler, uyanık başka kimse yok.',
        meta: '30 dk · Şehir',
      },
      {
        title: 'İnsanlık Üzerine Bir Sohbet',
        desc: 'Eski bir dostun anlattığı gibi felsefi bir gece.',
        meta: '60 dk · Şömine',
      },
    ],
  },

  nights: {
    title: 'Gecelerim',
    showEmpty: 'boş hâli göster',
    showFilled: 'dolu hâli göster',
    emptyLine: 'İlk yolculuğun seni bekliyor.',
    emptyCopy: 'Bu gece bir yer tarif et, sabah burada duruyor olsun.',
    emptyCta: 'Bir Rüya Oluştur',
    rows: [
      {
        title: 'Kıyıda Yağmur',
        meta: '21 Eylül · 32 dk · Sıcak ses',
        ambient: 'Yağmur + Okyanus',
      },
      {
        title: 'İnsanlık Üzerine Bir Sohbet',
        meta: '19 Eylül · 48 dk · Derin ses',
        ambient: 'Şömine',
      },
      {
        title: 'Sessiz Orman Yürüyüşü',
        meta: '17 Eylül · 26 dk · Fısıltı',
        ambient: 'Orman + Rüzgâr',
      },
      {
        title: 'Kuzey Işıkları Altında',
        meta: '14 Eylül · 60 dk · Nötr',
        ambient: 'Rüzgâr',
      },
    ],
  },

  detail: {
    title: 'Kıyıda Yağmur',
    meta: '21 Eylül · 32 dk · Sıcak ses · Yağmur + Okyanus',
    desc: 'Buna üç kez geri döndün. Su kenarında başlıyor, ateşe geçiyor ve sular çekilirken bitiyor.',
    tags: ['Yağmur', 'Okyanus', 'Ateş', 'Felsefe'],
    replay: 'Bu geceyi tekrar oynat',
    backLabel: 'Gecelerime dön',
    favAdd: 'Favorilere ekle',
    favRemove: 'Favorilerden çıkar',
  },

  companion: {
    name: 'Selen',
    tenure: '{n} gecedir eşlikçin',
    groups: {
      personality: 'Kişilik',
      style: 'Anlatım biçimi',
      speed: 'Hız',
      intensity: 'Ses yoğunluğu',
    },
  },

  profile: {
    greeting: 'İyi akşamlar, {name}.',
    planPremium: 'Dreamscape Premium',
    planFree: 'Dreamscape Ücretsiz',
    stats: {
      dreams: 'Keşfedilen rüya',
      relaxed: 'Rahatlanan süre',
      favourites: 'Favori dünya',
    },
    rows: {
      companion: 'Yapay Zekâ Eşlikçi',
      voice: 'Ses',
      sleep: 'Uyku tercihleri',
      ambient: 'Ortam sesleri',
      memory: 'Senin hakkında bildiklerim',
      tone: 'Eşlikçi tonu',
      notifications: 'Bildirimler',
      language: 'Dil',
      privacy: 'Gizlilik',
      subscription: 'Abonelik',
    },
    subscriptionPremium: 'Premium',
    subscriptionFree: 'Ücretsiz',
  },

  memory: {
    title: 'Senin hakkında bildiklerim',
    lede: 'Buradaki her şey yazdıklarından öğrenildi. Bu cihazda kalır ve istediğini silebilirsin.',
    empty: 'Henüz bir şey yok. Bir rüya yaz, dinlemeye başlayayım.',
    themes: 'Sürekli geri döndüğün şeyler',
    feelings: 'Genelde nasıl hissettiğin',
    people: 'Benden kim olmamı istediğin',
    moments: 'Hatırladığım anlar',
    forget: 'Unut',
    forgetAll: 'Her şeyi unut',
    forgotten: 'Unutuldu.',
    sessionCount: '{n} gecede öğrenildi',
  },

  privacy: {
    title: 'Hayal ettiklerin sana ait kalır.',
    lede: 'Rüyaların kişisel olabilir. Onlara tam olarak ne olduğunu anlatalım.',
    rows: [
      {
        title: 'Yazdıkların cihazında kalır',
        body: 'Yazdığın metin geceyi yazmak için bir kez gönderilir, sonra Gecelerim’e kaydetmediğin sürece yalnızca cihazında durur.',
      },
      {
        title: 'Ses asla saklanmaz',
        body: 'Eşlikçinle konuştuğunda ses o anda yazıya çevrilir ve atılır. Sonrasında hiçbir şey tutulmaz.',
      },
      {
        title: 'Hiçbir şey eğitim için kullanılmaz',
        body: 'Rüyaların model eğitmek için kullanılmaz ve asla üçüncü taraflarla paylaşılmaz.',
      },
      {
        title: 'İstediğin an ayrıl',
        body: 'Her seansı, yazdığın her şeyi ve tüm tercihlerini tek dokunuşla sil. Saklamak istersen önce bir kopyasını dışa aktar.',
      },
    ],
    exportData: 'Verilerimi dışa aktar',
    deleteAll: 'Her şeyi sil',
    deleted: 'Her şey silindi.',
  },

  premium: {
    title: 'Rüyalarının derinine in.',
    features: [
      'On dakika yerine tam bir saate kadar geceler',
      'Nefes alan, gülen, fısıldayan premium sesler',
      'Rüyanın içinde sesli sohbet',
      'Kurduğun her dünyayı hatırlayan bir eşlikçi',
      'Yetişkin anlatım dahil her ton',
    ],
    plans: {
      monthly: { name: 'Aylık', price: '₺299', note: 'aylık faturalanır' },
      yearly: { name: 'Yıllık', price: '₺1.790', note: '2 ay sessizlik, hediye' },
    },
    cta: '7 sakin gece ücretsiz başlat',
    ctaOwned: 'Premium etkin',
    fine: 'İstediğin an iptal et. Asla hatırlatma göndermeyiz.',
    purchasing: 'Ödeme açılıyor…',
    purchased: 'Premium senin. Bu gece bir saat sürebilir.',
    manage: 'Aboneliği yönet',
    cancel: 'Premium’u iptal et',
  },

  paywall: {
    title: 'Bu süre için Premium gerekli',
    body: 'Ücretsiz geceler {free} dakikaya kadar sürer. Premium geceler {premium} dakikaya kadar.',
    cta: 'Premium’a bak',
    later: 'Bu gece değil',
  },

  notif: {
    title: 'Usulca bir dürtme',
    previews: [
      'Gecen seni bekliyor.',
      'Bu gece huzurlu bir yer hayal et.',
      'Favori yağmurlu sahilin seni bekliyor.',
    ],
    toggles: {
      bedtime: 'Uyku vakti daveti',
      weekly: 'Haftalık yeni dünyalar',
      finished: 'Seans bitti',
      quiet: 'Sessiz saatler',
    },
  },

  error: {
    line: 'Bir an için ipin ucunu kaçırdık.',
    sub: 'Bozulan bir şey yok. Hadi tekrar deneyelim.',
    cta: 'Rüyaya Dön',
  },

  sheet: {
    voice: 'Ses',
    mood: 'Ses tonu',
    ambience: 'Ambiyans',
    duration: 'Süre',
  },

  options: {
    voice: {
      female: 'Kadın',
      male: 'Erkek',
      neutral: 'Nötr',
      warm: 'Sıcak',
      deep: 'Derin',
      whisper: 'Fısıltı gibi',
    },
    mood: {
      calm: 'Sakin',
      warm: 'Sıcak',
      philosophical: 'Felsefi',
      dreamy: 'Dalgın',
      mysterious: 'Gizemli',
      comforting: 'Huzur veren',
    },
    amb: {
      rain: 'Yağmur',
      ocean: 'Okyanus',
      fireplace: 'Şömine',
      wind: 'Rüzgâr',
      forest: 'Orman',
      night: 'Gece',
      cafe: 'Kafe',
      none: 'Yok',
    },
    personality: {
      gentle: 'Yumuşak',
      wise: 'Bilge',
      warm: 'Sıcak',
      philosophical: 'Felsefi',
      quiet: 'Sessiz',
      storyteller: 'Hikâyeci',
    },
    style: {
      story: 'Hikâye',
      meditation: 'Meditasyon',
      philosophy: 'Felsefe',
      poetry: 'Şiir',
      conversation: 'Sohbet',
      guided: 'Rehberli hayal',
    },
    speed: { verySlow: 'Çok yavaş', slow: 'Yavaş', normal: 'Normal' },
    intensity: { whisper: 'Fısıltı', soft: 'Yumuşak', normal: 'Normal' },
    theme: {
      ocean: 'Okyanus',
      rain: 'Yağmur',
      campfire: 'Ateş',
      forest: 'Orman',
      mountains: 'Dağlar',
      space: 'Uzay',
      nightCity: 'Gece Şehri',
      cabin: 'Kulübe',
      fantasy: 'Fantastik',
    },
    category: {
      ocean: 'Okyanus',
      rain: 'Yağmur',
      campfire: 'Ateş',
      forest: 'Orman',
      mountains: 'Dağlar',
      space: 'Uzay',
      cities: 'Şehirler',
      meditation: 'Meditasyon',
      philosophy: 'Felsefe',
      love: 'Aşk',
      sleep: 'Uyku',
    },
    tone: { gentle: 'Sakin', romantic: 'Romantik', mature: 'Yetişkin' },
  },

  nav: {
    home: 'Ana Sayfa',
    explore: 'Keşfet',
    create: 'Oluştur',
    sessions: 'Seanslar',
    profile: 'Profil',
  },
}
