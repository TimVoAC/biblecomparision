import type { StrongDefinition } from "@/lib/bibleApi";

const STEP_LEXICON_URLS = {
  G: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt",
  H: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt",
} as const;

const OPEN_SCRIPTURES_URLS = {
  G: "https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js",
  H: "https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js",
} as const;

type LanguagePrefix = keyof typeof STEP_LEXICON_URLS;

interface StepRecord {
  id: string;
  original: string;
  transliteration: string;
  gloss: string;
  meaning: string;
}

interface OpenScripturesEntry {
  lemma?: string;
  translit?: string;
  strongs_def?: string;
  kjv_def?: string;
  derivation?: string;
}

const openScripturesCache: Partial<Record<LanguagePrefix, Record<string, OpenScripturesEntry>>> = {};
const openScripturesWordIndexCache: Partial<Record<LanguagePrefix, Record<string, OpenScripturesEntry & { topic: string }>>> = {};

function normalizeStrongId(rawId: string): { prefix: LanguagePrefix; compact: string; padded: string } | null {
  const match = rawId.trim().toUpperCase().match(/^([GH])0*(\d{1,5})/);
  if (!match) return null;

  const prefix = match[1] as LanguagePrefix;
  const number = match[2];

  return {
    prefix,
    compact: `${prefix}${Number(number)}`,
    padded: `${prefix}${number.padStart(4, "0")}`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDefinition(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br />");
}

function normalizeGreekWord(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ς]/g, "σ")
    .replace(/[^\p{Script=Greek}]/gu, "")
    .toLowerCase();
}

function normalizeHebrewWord(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[^\p{Script=Hebrew}]/gu, "");
}

function getHebrewLookupCandidates(value: string): string[] {
  const normalized = normalizeHebrewWord(value);
  if (!normalized) return [];

  const candidates = new Set([normalized]);
  const prefixes = ["ו", "ב", "כ", "ל", "מ", "ה", "ש"];
  let trimmed = normalized;

  while (trimmed.length > 2 && prefixes.includes(trimmed[0])) {
    trimmed = trimmed.slice(1);
    candidates.add(trimmed);
  }

  return Array.from(candidates);
}

function getLookupCandidates(value: string, prefix: LanguagePrefix): string[] {
  if (prefix === "G") {
    const normalized = normalizeGreekWord(value);
    return normalized ? [normalized] : [];
  }

  return getHebrewLookupCandidates(value);
}

function formatStepDefinition(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br />")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br />")
    .replace(/&lt;\/?b&gt;/gi, (tag) => tag.replace(/&lt;/g, "<").replace(/&gt;/g, ">").toLowerCase())
    .replace(/&lt;\/?i&gt;/gi, (tag) => tag.replace(/&lt;/g, "<").replace(/&gt;/g, ">").toLowerCase())
    .replace(/&lt;\/?ref[^&]*&gt;/gi, "")
    .replace(/&lt;\/?re&gt;/gi, "");
}

async function fetchText(url: string, revalidate: number, timeoutMs = 10000): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { next: { revalidate }, signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch (error) {
    console.error(`Unable to fetch lexicon source ${url}:`, error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseStepRecord(text: string, strongId: string): StepRecord | null {
  const recordRegex = new RegExp(
    `(?:^|\\n)(${strongId}[A-Z]?\\t[\\s\\S]*?)(?=\\n[GH]\\d{4}[A-Z]?\\t|$)`,
    "i",
  );
  const match = text.match(recordRegex);
  if (!match?.[1]) return null;

  const lines = match[1].trim().split(/\r?\n/);
  const firstLineColumns = lines[0].split("\t");
  if (firstLineColumns.length < 8) return null;

  const meaning = [firstLineColumns.slice(7).join(" "), ...lines.slice(1)].join("\n").trim();

  return {
    id: firstLineColumns[0],
    original: firstLineColumns[3] || "",
    transliteration: firstLineColumns[4] || "",
    gloss: firstLineColumns[6] || "",
    meaning,
  };
}

async function lookupStepBible(rawId: string): Promise<StrongDefinition | null> {
  const normalized = normalizeStrongId(rawId);
  if (!normalized) return null;

  const sourceText = await fetchText(STEP_LEXICON_URLS[normalized.prefix], 86400, 8000);
  if (!sourceText) return null;

  const record = parseStepRecord(sourceText, normalized.padded);
  if (!record) return null;

  return {
    topic: record.id,
    word: record.original,
    lexeme: record.original,
    transliteration: record.transliteration,
    definition: formatStepDefinition([record.gloss, record.meaning]),
    short_definition: record.gloss,
    source: "STEPBible",
  };
}

async function loadOpenScripturesDictionary(prefix: LanguagePrefix): Promise<Record<string, OpenScripturesEntry> | null> {
  if (openScripturesCache[prefix]) return openScripturesCache[prefix] ?? null;

  const sourceText = await fetchText(OPEN_SCRIPTURES_URLS[prefix], 86400);
  if (!sourceText) return null;

  const objectStart = sourceText.indexOf("{");
  const objectEnd = sourceText.lastIndexOf("};");
  if (objectStart < 0 || objectEnd < 0) return null;

  try {
    const dictionary = JSON.parse(sourceText.slice(objectStart, objectEnd + 1)) as Record<string, OpenScripturesEntry>;
    openScripturesCache[prefix] = dictionary;
    return dictionary;
  } catch (error) {
    console.error("Unable to parse Open Scriptures Strong dictionary:", error);
    return null;
  }
}

async function loadOpenScripturesWordIndex(prefix: LanguagePrefix): Promise<Record<string, OpenScripturesEntry & { topic: string }> | null> {
  if (openScripturesWordIndexCache[prefix]) return openScripturesWordIndexCache[prefix] ?? null;

  const dictionary = await loadOpenScripturesDictionary(prefix);
  if (!dictionary) return null;

  const index: Record<string, OpenScripturesEntry & { topic: string }> = {};

  for (const [topic, entry] of Object.entries(dictionary)) {
    if (!entry.lemma) continue;

    const keys = getLookupCandidates(entry.lemma, prefix);
    for (const key of keys) {
      if (!index[key]) {
        index[key] = { ...entry, topic };
      }
    }
  }

  openScripturesWordIndexCache[prefix] = index;
  return index;
}

async function lookupOpenScriptures(rawId: string): Promise<StrongDefinition | null> {
  const normalized = normalizeStrongId(rawId);
  if (!normalized) return null;

  const dictionary = await loadOpenScripturesDictionary(normalized.prefix);
  const entry = dictionary?.[normalized.compact] ?? dictionary?.[normalized.padded];
  if (!entry) return null;

  return {
    topic: normalized.compact,
    word: entry.lemma,
    lexeme: entry.lemma || "",
    transliteration: entry.translit,
    definition: formatDefinition([entry.strongs_def || "", entry.derivation || "", entry.kjv_def ? `KJV usage: ${entry.kjv_def}` : ""]),
    short_definition: entry.strongs_def,
    source: "Open Scriptures Strong's",
  };
}

export async function lookupStrongDefinition(strongId: string): Promise<StrongDefinition | null> {
  return (await lookupStepBible(strongId)) ?? (await lookupOpenScriptures(strongId));
}

export async function lookupOriginalWordDefinition(word: string, prefix: LanguagePrefix): Promise<StrongDefinition | null> {
  const index = await loadOpenScripturesWordIndex(prefix);
  if (!index) return null;

  const candidates = getLookupCandidates(word, prefix);
  const entry = candidates.map((candidate) => index[candidate]).find(Boolean);
  if (!entry) return null;

  return {
    topic: entry.topic,
    word: entry.lemma,
    lexeme: entry.lemma || "",
    transliteration: entry.translit,
    definition: formatDefinition([
      entry.strongs_def || "",
      entry.derivation || "",
      entry.kjv_def ? `KJV usage: ${entry.kjv_def}` : "",
    ]),
    short_definition: entry.strongs_def,
    source: "Open Scriptures Strong's",
  };
}
