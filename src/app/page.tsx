import Link from "next/link";
import { BIBLE_BOOKS } from "@/lib/bibleApi";

export default function Home() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px' }}>
          Multilingual Bible Verse Comparison Engine
        </h1>
        <p style={{ color: '#475569', fontSize: '1.1rem' }}>
          Select a book and chapter to analyze the text in Vietnamese, Greek, and Hebrew side-by-side.
        </p>
      </header>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
          Available Books
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {BIBLE_BOOKS.map((book) => (
            <div key={book.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#1e293b', marginBottom: '10px' }}>{book.name}</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '15px' }}>Chapters available: 1 to {book.chapters}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Array.from({ length: Math.min(book.chapters, 5) }, (_, i) => i + 1).map((ch) => (
                  <Link 
                    key={ch} 
                    href={`/read/${book.id}/${ch}`}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    Ch {ch}
                  </Link>
                ))}
                {book.chapters > 5 && <span style={{ padding: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>...</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}