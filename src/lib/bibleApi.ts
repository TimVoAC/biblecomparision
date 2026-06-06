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
  topic: string;             // Bolls returns the Strong ID as 'topic'
  lexeme: string;            // The original Greek/Hebrew root word
  transliteration?: string;
  pronunciation?: string;
  definition: string;        // Full HTML definition string
  short_definition?: string;
}

// Bolls API Translation identifiers
export const TRANSLATIONS = {
  VIETNAMESE: "VI1934",
  ENGLISH: "NIV",
  GREEK_NT: "KJV+",     // Natively contains Strong's markup on Bolls
  GREEK_OT: "LXX",      
  HEBREW: "WLC"         // Natively contains Strong's markup on Bolls
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
  { id: 1, name: "Genesis (Sáng thế ký)", chapters: 50 },
  { id: 2, name: "Exodus (Xuất hành)", chapters: 40 },
  { id: 40, name: "Matthew (Ma-thi-ơ)", chapters: 28 },
  { id: 43, name: "John (Giăng)", chapters: 21 },
  { id: 45, name: "Romans (Rô-ma)", chapters: 16 }
];