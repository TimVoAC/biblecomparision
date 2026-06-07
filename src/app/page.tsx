"use client";

import { useState } from "react";
import Link from "next/link";
import { BIBLE_BOOKS, BookInfo } from "@/lib/bibleApi";

export default function Home() {
  // Selection State
  const [selectedBook, setSelectedBook] = useState<BookInfo | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  // Helper handling: when a new book is picked, reset lower dependencies
  const handleBookChange = (bookId: number) => {
    const book = BIBLE_BOOKS.find((b) => b.id === bookId) || null;
    setSelectedBook(book);
    setSelectedChapter(null);
    setSelectedVerse(null);
  };

  const handleChapterChange = (chapter: number) => {
    setSelectedChapter(chapter);
    setSelectedVerse(null);
  };

  // Mock value fallback: generates an array up to a standard verse cap (e.g., 40 verses per chapter)
  // If your real API provides specific verse counts per chapter later, link it here instead.
  const dynamicVerseCount = 40; 

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px' }}>
          Multilingual Bible Verse Comparison Engine
        </h1>
        <p style={{ color: '#475569', fontSize: '1.1rem' }}>
          Select a book, chapter, and verse to analyze text in Vietnamese, Greek, and Hebrew side-by-side.
        </p>
      </header>

      {/* INTERACTIVE SELECTOR PANEL */}
      <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '24px', marginBottom: '30px', border: '1px solid #bfdbfe' }}>
        <h3 style={{ color: '#1e40af', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Quick Verse Selector</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          
          {/* Book Select */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Book</label>
            <select 
              value={selectedBook?.id || ""} 
              onChange={(e) => handleBookChange(Number(e.target.value))}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            >
              <option value="">-- Choose a Book --</option>
              {BIBLE_BOOKS.map((book) => (
                <option key={book.id} value={book.id}>{book.name}</option>
              ))}
            </select>
          </div>

          {/* Chapter Select */}
          <div style={{ width: '140px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Chapter</label>
            <select 
              disabled={!selectedBook}
              value={selectedChapter || ""} 
              onChange={(e) => handleChapterChange(Number(e.target.value))}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: !selectedBook ? '#f1f5f9' : 'white' }}
            >
              <option value="">-- Ch --</option>
              {selectedBook && Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                <option key={ch} value={ch}>Chapter {ch}</option>
              ))}
            </select>
          </div>

          {/* Verse Select */}
          <div style={{ width: '140px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Verse</label>
            <select 
              disabled={!selectedChapter}
              value={selectedVerse || ""} 
              onChange={(e) => setSelectedVerse(Number(e.target.value))}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: !selectedChapter ? '#f1f5f9' : 'white' }}
            >
              <option value="">-- Vs --</option>
              {selectedChapter && Array.from({ length: dynamicVerseCount }, (_, i) => i + 1).map((vs) => (
                <option key={vs} value={vs}>Verse {vs}</option>
              ))}
            </select>
          </div>

          {/* Action Navigation Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Link
              href={selectedBook && selectedChapter ? `/read/${selectedBook.id}/${selectedChapter}${selectedVerse ? `?verse=${selectedVerse}` : ''}` : '#'}
              onClick={(e) => { if(!selectedBook || !selectedChapter) e.preventDefault(); }}
              style={{
                padding: '10px 24px',
                backgroundColor: (selectedBook && selectedChapter) ? '#2563eb' : '#94a3b8',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '600',
                pointerEvents: (selectedBook && selectedChapter) ? 'auto' : 'none',
                textAlign: 'center',
                transition: 'background-color 0.2s'
              }}
            >
              Go to Verse →
            </Link>
          </div>
        </div>
      </div>

      {/* TRADITIONAL GRID VIEW OVERVIEW */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
          Browse Bible Books
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {BIBLE_BOOKS.map((book) => (
            <div key={book.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.15rem', color: '#1e293b', marginBottom: '10px' }}>{book.name}</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '15px' }}>Chapters available: 1 to {book.chapters}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Array.from({ length: Math.min(book.chapters, 4) }, (_, i) => i + 1).map((ch) => (
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
                {book.chapters > 4 && (
                  <button 
                    onClick={() => handleBookChange(book.id)}
                    style={{ background: 'none', border: 'none', padding: '6px', color: '#2563eb', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}
                  >
                    +{book.chapters - 4} more
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}