// Arabic -> Dadanitic (Ancient North Arabian, Unicode block U+10A80–U+10A9F), letter by letter.
// Dadanitic is a consonantal script written right to left: short vowels are never written and
// long ā inside a word is not written either, so a name is shown by its consonants only.
const C = (cp) => String.fromCodePoint(cp);

// [dadanitic glyph, scholarly transliteration]
export const LETTERS = {
  "ء": [C(0x10a91), "ʾ"], "ا": [C(0x10a91), "ʾ"], "أ": [C(0x10a91), "ʾ"], "إ": [C(0x10a91), "ʾ"], "آ": [C(0x10a91), "ʾ"],
  "ؤ": [C(0x10a91), "ʾ"], "ئ": [C(0x10a91), "ʾ"],
  "ب": [C(0x10a88), "b"], "ت": [C(0x10a89), "t"], "ث": [C(0x10a9b), "ṯ"], "ج": [C(0x10a94), "g"],
  "ح": [C(0x10a82), "ḥ"], "خ": [C(0x10a8d), "ḫ"], "د": [C(0x10a95), "d"], "ذ": [C(0x10a99), "ḏ"],
  "ر": [C(0x10a87), "r"], "ز": [C(0x10a98), "z"], "س": [C(0x10a8a), "s¹"], "ش": [C(0x10a86), "s²"],
  "ص": [C(0x10a8e), "ṣ"], "ض": [C(0x10a93), "ḍ"], "ط": [C(0x10a97), "ṭ"], "ظ": [C(0x10a9c), "ẓ"],
  "ع": [C(0x10a92), "ʿ"], "غ": [C(0x10a96), "ġ"], "ف": [C(0x10a90), "f"], "ق": [C(0x10a84), "q"],
  "ك": [C(0x10a8b), "k"], "ل": [C(0x10a81), "l"], "م": [C(0x10a83), "m"], "ن": [C(0x10a8c), "n"],
  "ه": [C(0x10a80), "h"], "ة": [C(0x10a80), "h"], "و": [C(0x10a85), "w"], "ي": [C(0x10a9a), "y"], "ى": [C(0x10a9a), "y"],
};

const DIACRITICS = /[ً-ٰٟـ]/g; // harakat, shadda, sukun, tatweel

// Returns one entry per Arabic letter: { ar, glyph, tr, dropped }
export function toDadanitic(text) {
  const clean = (text || "").replace(DIACRITICS, "");
  const out = [];
  clean.split(/(\s+)/).forEach((word) => {
    if (/^\s+$/.test(word)) { out.push({ space: true }); return; }
    [...word].forEach((ch, i) => {
      const m = LETTERS[ch];
      if (!m) return; // ignore anything that is not an Arabic letter
      // long ā (ا) inside or at the end of a word is not written in Dadanitic
      const longA = (ch === "ا" || ch === "آ") && i > 0;
      out.push({ ar: ch, glyph: m[0], tr: m[1], dropped: longA });
    });
  });
  return out;
}
