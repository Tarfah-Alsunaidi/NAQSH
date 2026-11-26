// Static content for the home "experience": the scripts written in AlUla and the sites where they are found.
// Every photo is a real, openly licensed photograph from the project dataset (credits shown on each card).

const IMG = (f) => `assets/types/${f}`;

export const SCRIPTS = [
  {
    id: "dadanitic",
    en: "Dadanitic",
    ar: "الدادانية (اللحيانية)",
    era: { en: "1st millennium BCE", ar: "الألف الأول قبل الميلاد" },
    body: {
      en: "The local alphabet of the kingdoms of Dadan and Lihyan. Kings, priests and pilgrims carved it on temple blocks and on the cliffs of Jabal ʿIkmah.",
      ar: "الأبجدية المحلية لمملكتي دادان ولحيان. نقشها الملوك والكهنة والحجّاج على كتل المعابد وعلى صخور جبل عِكمة.",
    },
    img: IMG("IMG-003.jpg"),
    credit: { author: "Jona Lendering", license: "CC0", url: "https://www.livius.org/pictures/saudi-arabia/al-ula/dedan-temple-dedanite-inscription-mentioning-king-asi/" },
  },
  {
    id: "minaic",
    en: "Minaic",
    ar: "المعينية (خط المسند)",
    era: { en: "6th–2nd century BCE", ar: "القرن ٦–٢ قبل الميلاد" },
    body: {
      en: "South Arabian script of the Minaean merchants of Maʿīn, who kept a trading community at Dadan on the incense road.",
      ar: "خط المسند الجنوبي، كتبه تجّار مملكة معين الذين أقاموا جالية تجارية في دادان على طريق البخور.",
    },
    img: IMG("IMG-108.jpg"),
    credit: { author: "Carole Raddato", license: "CC BY-SA 2.0", url: "https://www.flickr.com/photos/41523983@N08/49327441727/" },
  },
  {
    id: "nabataean",
    en: "Nabataean",
    ar: "النبطية",
    era: { en: "1st century BCE – 1st century CE", ar: "القرن ١ ق.م – القرن ١ م" },
    body: {
      en: "The Aramaic-derived script of the Nabataeans, carved above the doors of the monumental tombs of Hegra, such as Qasr al-Farid.",
      ar: "خط الأنباط المشتق من الآرامية، منقوش فوق أبواب مقابر الحِجر الضخمة مثل قصر الفريد.",
    },
    img: IMG("IMG-140.jpg"),
    credit: { author: "Richard Mortel", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Qasr_al-Farid,_Hegra_(Madain_Salih),_1st_cent._CE,_Saudi_Arabia_(1).jpg" },
  },
  {
    id: "latin",
    en: "Latin",
    ar: "اللاتينية",
    era: { en: "3rd century CE", ar: "القرن ٣ الميلادي" },
    body: {
      en: "A Roman dedication from the fort at Hegra, for the safety of Emperor Caracalla and Julia Domna (AD 213–217).",
      ar: "إهداء روماني من الحصن الروماني في الحِجر، لسلامة الإمبراطور كاراكلا وأمه جوليا دومنا (٢١٣–٢١٧م).",
    },
    img: IMG("IMG-116.jpg"),
    credit: { author: "Carole Raddato", license: "CC BY-SA 2.0", url: "https://www.flickr.com/photos/41523983@N08/49327170166/" },
  },
  {
    id: "nabarab",
    en: "Nabataeo-Arabic",
    ar: "النبطية العربية",
    era: { en: "AD 280", ar: "سنة ٢٨٠م" },
    body: {
      en: "The bridge between Nabataean and Arabic writing. This funerary text from AlUla is one of the oldest known examples.",
      ar: "المرحلة الانتقالية بين الخط النبطي والخط العربي. هذا النقش الجنائزي من العُلا من أقدم الأمثلة المعروفة.",
    },
    img: IMG("IMG-088.jpg"),
    credit: { author: "Jean-Pierre Dalbéra", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Inscription_en_caract%C3%A8res_nabat%C3%A9o-arabes_(Institut_du_monde_arabe,_Paris).jpg" },
  },
  {
    id: "arabic",
    en: "Early Islamic Arabic",
    ar: "العربية الإسلامية المبكرة",
    era: { en: "First Islamic centuries", ar: "القرون الهجرية الأولى" },
    body: {
      en: "Names, prayers and testimonies of faith in early Arabic script, left by travellers on the rocks of the AlUla valley.",
      ar: "أسماء وأدعية وشهادات بالخط العربي المبكر، تركها المسافرون على صخور وادي العُلا.",
    },
    img: IMG("IMG-075.jpg"),
    credit: { author: "Richard Mortel", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Early_Islamic_inscriptions_at_al-Ula,_Saudi_Arabia_(20).jpg" },
  },
];

// Approximate positions (decimal degrees). Sources: DASI (Dadan), Livius.org (Umm Daraj, Qurh),
// Wikipedia (AlUla Old Town, Elephant Rock), published distances (Hegra ~22 km N, Jabal ʿIkmah ~5 km N).
export const SITES = [
  {
    id: "hegra",
    lat: 26.787, lon: 37.953,
    en: "Hegra (al-Ḥijr)", ar: "الحِجر",
    scripts: ["nabataean", "latin"],
    body: {
      en: "UNESCO World Heritage Site and the Nabataeans' southern city: over a hundred rock-cut tombs with inscriptions above their doors, the Jabal Ithlib sanctuary, and a Roman fort.",
      ar: "موقع تراث عالمي لليونسكو ومدينة الأنباط الجنوبية: أكثر من مئة مقبرة منحوتة في الصخر فوق أبوابها نقوش، ومعبد جبل إثلب، وحصن روماني.",
    },
    img: IMG("IMG-140.jpg"),
    credit: { author: "Richard Mortel", license: "CC BY 2.0" },
  },
  {
    id: "ikmah",
    lat: 26.676, lon: 37.892,
    en: "Jabal ʿIkmah", ar: "جبل عِكمة",
    scripts: ["dadanitic"],
    body: {
      en: "AlUla's “open-air library”: a canyon with hundreds of inscriptions, mostly Dadanitic, on UNESCO's Memory of the World register since 2023.",
      ar: "«المكتبة المفتوحة» في العُلا: وادٍ ضيّق فيه مئات النقوش، أغلبها دادانية، ومسجّل في سجل ذاكرة العالم لليونسكو منذ ٢٠٢٣.",
    },
    img: IMG("IMG-013.jpg"),
    credit: { author: "Richard Mortel", license: "CC BY 2.0" },
  },
  {
    id: "dadan",
    lat: 26.656, lon: 37.914,
    en: "Dadan (al-Khuraybah)", ar: "دادان (الخريبة)",
    scripts: ["dadanitic", "minaic", "arabic"],
    body: {
      en: "Capital of the kingdoms of Dadan and Lihyan. Its sanctuary yielded inscribed lintels, statues and royal dedications; Minaean traders lived here too.",
      ar: "عاصمة مملكتي دادان ولحيان. خرجت من معبدها عتبات منقوشة وتماثيل وإهداءات ملكية، وسكنها تجّار معينيون أيضاً.",
    },
    img: IMG("IMG-007.jpg"),
    credit: { author: "Jona Lendering", license: "CC0" },
  },
  {
    id: "ummdaraj",
    lat: 26.652, lon: 37.899,
    en: "Umm Daraj", ar: "أم درج",
    scripts: ["dadanitic"],
    body: {
      en: "A mountain-top sanctuary across the valley from Dadan, dedicated to the god Dhu Ghaybah, where pilgrims recorded their visits.",
      ar: "معبد على قمة جبل مقابل دادان، مكرّس للإله ذي غيبة، سجّل فيه الحجّاج زياراتهم.",
    },
    img: IMG("IMG-005.jpg"),
    credit: { author: "Jona Lendering", license: "CC0" },
  },
  {
    id: "qurh",
    lat: 26.49, lon: 38.03,
    en: "Qurh (al-Mabiyat)", ar: "قُرح (المابيات)",
    scripts: ["nabarab", "arabic"],
    body: {
      en: "An early Islamic town about 20 km south of AlUla on the pilgrim road. The Nabataeo-Arabic funerary stone of AD 280 is linked to this site.",
      ar: "مدينة إسلامية مبكرة على بعد نحو ٢٠ كم جنوب العُلا على طريق الحج. ويرتبط بها النقش الجنائزي النبطي العربي من سنة ٢٨٠م.",
    },
    img: IMG("IMG-088.jpg"),
    credit: { author: "Jean-Pierre Dalbéra", license: "CC BY 2.0" },
  },
];

export const LANDMARKS = [
  { id: "oldtown", lat: 26.608, lon: 37.923, en: "AlUla Old Town", ar: "البلدة القديمة" },
  { id: "elephant", lat: 26.689, lon: 37.982, en: "Elephant Rock", ar: "جبل الفيل" },
];

// Arabic name of a site, from the English site text of a record.
export function siteAr(site) {
  if (/Ithlib/.test(site)) return "جبل إثلب، الحِجر";
  if (/Hegra|Ḥijr|Hijr/.test(site)) return /fort/.test(site) ? "الحصن الروماني، الحِجر" : "الحِجر";
  if (/Ikmah|ʿIkmah/.test(site)) return "جبل عِكمة";
  if (/Umm Daraj/.test(site) && /Dadan/.test(site)) return "دادان / أم درج";
  if (/Umm Daraj/.test(site)) return "أم درج";
  if (/Dadan/.test(site)) return "دادان (الخريبة)";
  return "العُلا";
}
