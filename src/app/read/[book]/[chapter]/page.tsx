import Link from "next/link";
import { fetchChapterVerses, BIBLE_BOOKS, TRANSLATIONS } from "@/lib/bibleApi";
import VerseText from "@/app/verseText";

interface PageProps {
  params: Promise<{ book: string; chapter: string }>;
}

export default async function ReadPage({ params }: PageProps) {
  const resolvedParams = await params;
  const bookId = parseInt(resolvedParams.book) || 1;
  const chapterId = parseInt(resolvedParams.chapter) || 1;

  const currentBook = BIBLE_BOOKS.find(b => b.id === bookId) || { name: `Book ${bookId}`, chapters: 1 };

  // Parallel data fetching over Server Components
  const [vietnameseVerses, englishVerses, greekVerses, hebrewVerses] = await Promise.all([
    fetchChapterVerses(TRANSLATIONS.VIETNAMESE, bookId, chapterId),
    fetchChapterVerses(TRANSLATIONS.ENGLISH, bookId, chapterId),
    fetchChapterVerses("GREEK_DYNAMIC", bookId, chapterId), // Uses LXX for OT, BYZ for NT
    fetchChapterVerses(TRANSLATIONS.HEBREW, bookId, chapterId),
  ]);

  const totalVersesCount = Math.max(
    vietnameseVerses.length,
    englishVerses.length,
    greekVerses.length,
    hebrewVerses.length,
    1 // Safeguard baseline
  );
  const verseRows = Array.from({ length: totalVersesCount }, (_, i) => i + 1);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '500' }}>
          ← Back to Dashboard
        </Link>
      </div>

      <header style={{ marginBottom: '40px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#0f172a' }}>
          {currentBook.name}
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '5px' }}>
          Comparing Chapter {chapterId} across languages
        </p>
      </header>

      {verseRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fee2e2', borderRadius: '8px', color: '#991b1b' }}>
          No verse data found for this specific chapter selection using the active APIs.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {verseRows.map((verseNum) => {
            const vnText = vietnameseVerses.find((v) => v.verse === verseNum)?.text || "—";
            const enText = englishVerses.find((v) => v.verse === verseNum)?.text || "—";
            const gkText = greekVerses.find((v) => v.verse === verseNum)?.text || "—";
            const hbText = hebrewVerses.find((v) => v.verse === verseNum)?.text || "—";

            return (
              <div 
                key={verseNum} 
                style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '10px', 
                  boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)', 
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden'
                }}
              >
                {/* Verse Tag Header */}
                <div style={{ backgroundColor: '#f1f5f9', padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ backgroundColor: '#1e3a8a', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>
                    VERSE {verseNum}
                  </span>
                </div>

                {/* Multilingual Parallel Grid Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', backgroundColor: '#e2e8f0' }}>
                  
                  {/* Vietnamese translation block */}
                  <div style={{ backgroundColor: 'white', padding: '20px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      Vietnamese (VI1934)
                    </h4>
                    <p style={{ margin: '0', color: '#334155', fontSize: '1rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: vnText }} />
                  </div>

                  {/* English translation block */}
                  <div style={{ backgroundColor: 'white', padding: '20px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      English (NIV)
                    </h4>
                    <p style={{ margin: '0', color: '#334155', fontSize: '1rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: enText }} />
                  </div>

                  {/* Greek Original Source block - WITH CONTEXT MENU */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '20px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#2563eb', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      Greek (BYZ)
                    </h4>
                    <VerseText 
                      text={gkText}
                      style={{ margin: '0', color: '#0f172a', fontSize: '1.15rem', lineHeight: '1.6', fontFamily: 'Georgia, serif' }} 
                    />
                  </div>

                  {/* Hebrew Original Source block with dynamic RTL formatting - WITH CONTEXT MENU */}
                  <div style={{ backgroundColor: '#fffbeb', padding: '20px' }} dir="rtl">
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#d97706', textTransform: 'uppercase', fontWeight: 'bold', textAlign: 'left' }} dir="ltr">
                      Hebrew (WLC) {bookId >= 40 && <span style={{color: '#ef4444'}}>(No NT Text)</span>}
                    </h4>
                    <VerseText 
                      text={hbText} 
                      isRtl={true}
                      style={{ margin: '0', color: '#0f172a', fontSize: '1.5rem', lineHeight: '1.8', fontFamily: 'Georgia, serif', textAlign: 'right' }} 
                    />
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}