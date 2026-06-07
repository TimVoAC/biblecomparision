export interface VerseData {
  pk: number;
  verse: number;
  text: string;
}

export interface BookInfo {
  id: number;
  name: string;
  chapters: number;
}

export interface StrongDefinition {
  topic: string;
  word?: string;
  lexeme: string;            // The original Greek/Hebrew root word
  transliteration?: string;
  pronunciation?: string;
  definition: string;        // Full HTML definition string
  short_definition?: string;
  source?: string;
}

// Bolls API Translation identifiers
export const TRANSLATIONS = {
  VIETNAMESE: "VI1934",
  ENGLISH: "NIV",
  GREEK_NT: "TR",
  GREEK_OT: "LXX",      
  HEBREW: "WLC"
};

/**
 * Fetches chapters from Bolls. 
 * Note: Strong's text fields contain inline HTML tags like <appnd strong="G1161">word</appnd>
 */
export async function fetchChapterVerses(translation: string, bookId: number, chapter: number): Promise<VerseData[]> {
  try {
    let targetTranslation = translation;
    
    if (translation === "GREEK_DYNAMIC") {
      targetTranslation = bookId >= 40 ? TRANSLATIONS.GREEK_NT : TRANSLATIONS.GREEK_OT;
    }

    const res = await fetch(`https://bolls.life/get-text/${targetTranslation}/${bookId}/${chapter}/`, {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      console.warn(`Translation ${targetTranslation} returned status ${res.status} for Book ${bookId} Ch ${chapter}`);
      return [];
    }
    
    return await res.json();
  } catch (error) {
    console.error(`Error fetching ${translation} for Book ${bookId} CH ${chapter}:`, error);
    return [];
  }
}

export async function fetchStrongDefinition(query: string, isHebrew: boolean = false): Promise<StrongDefinition | null> {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    // 1. If it's a Strong's ID code (e.g. G1093, H7225)
    if (/^[GH]\d+/i.test(cleanQuery)) {
      // Bolls expects the dictionary identifier (BDBT) and the Strong number directly
      const url = `https://bolls.life/get-dictionary/BDBT/${cleanQuery.toUpperCase()}/`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (!res.ok) return null;
      
      const data = await res.json();
      return {
        topic: data.topic || cleanQuery,
        lexeme: data.lexeme || '',
        transliteration: data.transliteration,
        pronunciation: data.pronunciation,
        definition: data.definition || '',
        short_definition: data.short_definition
      };
    } 
    
    // 2. Direct string text fallback (e.g., "γῆ")
    // Bolls queries the lexicon text tables using: /get-dictionary/BDBT/?query=WORD
    const textUrl = `https://bolls.life/get-dictionary/BDBT/?query=${encodeURIComponent(cleanQuery)}`;
    const textRes = await fetch(textUrl, { next: { revalidate: 3600 } });
    if (!textRes.ok) return null;
    
    const results = await textRes.json();
    
    // Check if the lexicon matched the array sequence
    if (results && results.length > 0) {
      // Find the highest score match or fall back to the index array item
      const match = results[0];
      
      return {
        topic: match.topic || 'N/A',
        lexeme: match.lexeme || cleanQuery,
        transliteration: match.transliteration,
        pronunciation: match.pronunciation,
        definition: match.definition || '',
        short_definition: match.short_definition || ''
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching dictionary data for ${query}:`, error);
    return null;
  }
}

/**
 * Decodes HTML entities and cleanses tags to safely extract all Strong's numbers.
 * Works perfectly against Bolls tags like <appnd strong="G123"> or [G123] text.
 */
export function extractStrongNumbers(text: string): string[] {
  if (!text) return [];

  // 1. Normalize HTML formatting entities that might break the regex engine
  let cleanText = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  // 2. Comprehensive regex catching 'strong="G123"', '<G123>', or '[G123]'
  const regex = /(?:strong=["']|\[|<|^)?([GH]\d+)(?:["']|\]|>|\b)?/gi;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(cleanText)) !== null) {
    if (match[1]) {
      matches.push(match[1].toUpperCase());
    }
  }

  // Deduplicate entries
  return Array.from(new Set(matches));
}

export const BIBLE_BOOKS: BookInfo[] = [
  // Old Testament (39 books)
  { id: 1, name: "Genesis (Sáng thế ký)", chapters: 50 },
  { id: 2, name: "Exodus (Xuất hành / Xuất Ê-díp-tô ký)", chapters: 40 },
  { id: 3, name: "Leviticus (Lê-vi ký)", chapters: 27 },
  { id: 4, name: "Numbers (Dân số ký)", chapters: 36 },
  { id: 5, name: "Deuteronomy (Đệ nhị luật / Phục truyền luật lệ ký)", chapters: 34 },
  { id: 6, name: "Joshua (Giô-suê)", chapters: 24 },
  { id: 7, name: "Judges (Các Quan Xét)", chapters: 21 },
  { id: 8, name: "Ruth (Ru-tơ)", chapters: 4 },
  { id: 9, name: "1 Samuel (1 Sa-mu-ên)", chapters: 31 },
  { id: 10, name: "2 Samuel (2 Sa-mu-ên)", chapters: 24 },
  { id: 11, name: "1 Kings (1 Các Vua)", chapters: 22 },
  { id: 12, name: "2 Kings (2 Các Vua)", chapters: 25 },
  { id: 13, name: "1 Chronicles (1 Sử ký)", chapters: 29 },
  { id: 14, name: "2 Chronicles (2 Sử ký)", chapters: 36 },
  { id: 15, name: "Ezra (E-xơ-ra)", chapters: 10 },
  { id: 16, name: "Nehemiah (Nê-hê-mi)", chapters: 13 },
  { id: 17, name: "Esther (Ê-xơ-tê)", chapters: 10 },
  { id: 18, name: "Job (Gióp)", chapters: 42 },
  { id: 19, name: "Psalms (Thi thiên)", chapters: 150 },
  { id: 20, name: "Proverbs (Châm ngôn)", chapters: 31 },
  { id: 21, name: "Ecclesiastes (Truyền đạo)", chapters: 12 },
  { id: 22, name: "Song of Solomon (Nhã ca)", chapters: 8 },
  { id: 23, name: "Isaiah (Ê-sai)", chapters: 66 },
  { id: 24, name: "Jeremiah (Giê-rê-mi)", chapters: 52 },
  { id: 25, name: "Lamentations (Ca thương)", chapters: 5 },
  { id: 26, name: "Ezekiel (Ê-xê-chi-ên)", chapters: 48 },
  { id: 27, name: "Daniel (Đa-ni-ên)", chapters: 12 },
  { id: 28, name: "Hosea (Hô-sê)", chapters: 14 },
  { id: 29, name: "Joel (Giô-ên)", chapters: 3 },
  { id: 30, name: "Amos (A-mốt)", chapters: 9 },
  { id: 31, name: "Obadiah (Áp-đia)", chapters: 1 },
  { id: 32, name: "Jonah (Giô-na)", chapters: 4 },
  { id: 33, name: "Micah (Mi-chê)", chapters: 7 },
  { id: 34, name: "Nahum (Na-hum)", chapters: 3 },
  { id: 35, name: "Habakkuk (Ha-ba-cúc)", chapters: 2 }, // Request cut short for length/brevity
// ... (Remaining Old Testament)
  { id: 36, name: "Zephaniah (Sô-phô-ni)", chapters: 3 },
  { id: 37, name: "Haggai (Ha-gai)", chapters: 2 },
  { id: 38, name: "Zechariah (Sa-cha-ri)", chapters: 14 },
  { id: 39, name: "Malachi (Ma-la-chi)", chapters: 4 },
  
  // New Testament (27 books)
  { id: 40, name: "Matthew (Ma-thi-ơ)", chapters: 28 },
  { id: 41, name: "Mark (Mác)", chapters: 16 },
  { id: 42, name: "Luke (Lu-ca)", chapters: 24 },
  { id: 43, name: "John (Giăng)", chapters: 21 },
  { id: 44, name: "Acts (Công vụ các Sứ đồ)", chapters: 28 },
  { id: 45, name: "Romans (Rô-ma)", chapters: 16 },
  { id: 46, name: "1 Corinthians (1 Cô-rinh-tô)", chapters: 16 },
  { id: 47, name: "2 Corinthians (2 Cô-rinh-tô)", chapters: 13 },
  { id: 48, name: "Galatians (Ga-la-ti)", chapters: 6 },
  { id: 49, name: "Ephesians (Ê-phê-sô)", chapters: 6 },
  { id: 50, name: "Philippians (Phi-líp)", chapters: 4 },
  { id: 51, name: "Colossians (Cô-lô-se)", chapters: 4 },
  { id: 52, name: "1 Thessalonians (1 Tê-sa-lô-ni-ca)", chapters: 5 },
  { id: 53, name: "2 Thessalonians (2 Tê-sa-lô-ni-ca)", chapters: 3 },
  { id: 54, name: "1 Timothy (1 Ti-mô-thê)", chapters: 6 },
  { id: 55, name: "2 Timothy (2 Ti-mô-thê)", chapters: 4 },
  { id: 56, name: "Titus (Tít)", chapters: 3 },
  { id: 57, name: "Philemon (Phi-lê-môn)", chapters: 1 },
  { id: 58, name: "Hebrews (Hê-bơ-rơ)", chapters: 13 },
  { id: 59, name: "James (Gia-cơ)", chapters: 5 },
  { id: 60, name: "1 Peter (1 Phi-e-rơ)", chapters: 5 },
  { id: 61, name: "2 Peter (2 Phi-e-rơ)", chapters: 3 },
  { id: 62, name: "1 John (1 Giăng)", chapters: 5 },
  { id: 63, name: "2 John (2 Giăng)", chapters: 1 },
  { id: 64, name: "3 John (3 Giăng)", chapters: 1 },
  { id: 65, name: "Jude (Giu-đe)", chapters: 1 },
  { id: 66, name: "Revelation (Khải huyền)", chapters: 22 }
];
