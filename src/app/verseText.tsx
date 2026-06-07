"use client";

import React, { useState, useEffect, useRef } from "react";
import type { StrongDefinition } from "@/lib/bibleApi";

interface VerseTextProps {
  text: string;
  isRtl?: boolean;
  style?: React.CSSProperties;
}

interface ParsedWord {
  displayWord: string;
  lookupKey: string;
  strongId?: string;
  language: "G" | "H";
}

export default function VerseText({ text, isRtl = false, style }: VerseTextProps) {
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [activeWord, setActiveWord] = useState<ParsedWord | null>(null);
  const [definition, setDefinition] = useState<StrongDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lookupLanguage: "G" | "H" = isRtl ? "H" : "G";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuPosition(null);
        setActiveWord(null);
      }
    }
    if (menuPosition) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuPosition]);

  // Processes raw verse content into interactive individual words
  const getWords = (rawText: string): ParsedWord[] => {
    if (!rawText || rawText === "—") return [];
    
    const wordsWithStrongIds: ParsedWord[] = [];
    const appndRegex = /<appnd\b[^>]*\bstrong=["']([GH]0*\d+)["'][^>]*>([\s\S]*?)<\/appnd>/gi;
    let match: RegExpExecArray | null;

    while ((match = appndRegex.exec(rawText)) !== null) {
      const displayWord = match[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
      if (displayWord) {
        wordsWithStrongIds.push({
          displayWord,
          lookupKey: match[1].toUpperCase(),
          strongId: match[1].toUpperCase(),
          language: match[1].toUpperCase().startsWith("H") ? "H" : "G",
        });
      }
    }

    if (wordsWithStrongIds.length > 0) {
      return wordsWithStrongIds;
    }

    // Strip HTML boilerplate elements safely when no Strong markup is available.
    const plainText = rawText.replace(/<\/?[^>]+(>|$)/g, "");
    
    return plainText.split(/\s+/).map(token => {
      // Isolate clean textual structures for lexicon tracking
      const cleanWord = token
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()""'’«»ֳֺ֑֥֦֧֮֨֞֠֡֩֕֟]/g, "")
        .trim();
        
      return {
        displayWord: token,
        lookupKey: cleanWord || token,
        language: lookupLanguage,
      };
    }).filter(w => w.lookupKey.length > 0);
  };

  const handleWordClick = async (e: React.MouseEvent, wordObj: ParsedWord) => {
    e.preventDefault();
    setActiveWord(wordObj);
    
    setMenuPosition({ 
      x: e.clientX + window.scrollX, 
      y: e.clientY + window.scrollY - 15 
    });
    
    setLoading(true);
    setDefinition(null);

    try {
      const url = wordObj.strongId
        ? `/api/strong/${encodeURIComponent(wordObj.strongId)}`
        : `/api/strong/lookup?word=${encodeURIComponent(wordObj.lookupKey)}&lang=${wordObj.language}`;
      const res = await fetch(url);
      setDefinition(res.ok ? await res.json() : null);
    } catch (error) {
      console.error(`Lexicon lookup failed for ${wordObj.lookupKey}:`, error);
      setDefinition(null);
    }
    setLoading(false);
  };

  const words = getWords(text);

  return (
    <>
      <span style={{ ...style, display: "inline-flex", flexWrap: "wrap", gap: "4px", direction: isRtl ? "rtl" : "ltr" }}>
        {words.map((wordObj, idx) => (
          <span
            key={idx}
            onClick={(e) => handleWordClick(e, wordObj)}
            style={{
              cursor: "pointer",
              borderBottom: "1px dashed #cbd5e1",
              padding: "0 2px",
              borderRadius: "4px",
              transition: "background-color 0.2s",
              backgroundColor: activeWord?.lookupKey === wordObj.lookupKey ? "#fef08a" : "transparent"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
            onMouseLeave={(e) => {
              if (activeWord?.lookupKey !== wordObj.lookupKey) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {wordObj.displayWord}
          </span>
        ))}
      </span>

      {/* Popover Card */}
      {menuPosition && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: `${menuPosition.y}px`,
            left: `${menuPosition.x}px`,
            backgroundColor: "white",
            border: "1px solid #cbd5e1",
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            borderRadius: "8px",
            padding: "16px",
            zIndex: 9999,
            maxWidth: "320px",
            maxHeight: "420px",
            overflowY: "auto",
            fontFamily: "sans-serif",
            fontSize: "0.9rem",
            direction: "ltr",
          }}
        >
          <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "8px" }}>
            <span style={{ fontWeight: "bold", color: "#1e3a8a" }}>
              English Definition
            </span>
          </div>

          {loading && <div style={{ color: "#64748b" }}>Searching dictionary...</div>}

          {!loading && !definition && (
            <div style={{ color: "#ef4444" }}>
              Could not find dictionary entries for "{activeWord?.lookupKey}".
            </div>
          )}

          {!loading && definition && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div>
                <strong style={{ color: "#0f172a" }}>Term:</strong> {definition.word}
              </div>
              <div>
                <strong style={{ color: "#0f172a" }}>Strong:</strong> {definition.topic}
              </div>
              {definition.transliteration && (
                <div>
                  <strong style={{ color: "#0f172a" }}>Transliteration:</strong> <i>{definition.transliteration}</i>
                </div>
              )}
              <div style={{ marginTop: "4px", paddingTop: "6px", borderTop: "1px dashed #e2e8f0", color: "#334155", lineHeight: "1.4" }}>
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "2px" }}>Meaning:</strong>
                <span dangerouslySetInnerHTML={{ __html: definition.definition }} />
              </div>
              {definition.source && (
                <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "4px" }}>
                  Source: {definition.source}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
