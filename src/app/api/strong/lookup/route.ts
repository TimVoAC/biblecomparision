import { NextResponse } from "next/server";
import { lookupOriginalWordDefinition } from "@/lib/strongsLexicon";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word")?.trim() ?? "";
  const lang = searchParams.get("lang")?.trim().toUpperCase();

  if (!word || (lang !== "G" && lang !== "H")) {
    return NextResponse.json({ error: "Expected word and lang=G or lang=H" }, { status: 400 });
  }

  const definition = await lookupOriginalWordDefinition(word, lang);
  if (!definition) {
    return NextResponse.json({ error: "Original word not found" }, { status: 404 });
  }

  return NextResponse.json(definition);
}
