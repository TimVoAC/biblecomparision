import { NextResponse } from "next/server";
import { lookupStrongDefinition } from "@/lib/strongsLexicon";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!/^[GH]0*\d{1,5}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid Strong number" }, { status: 400 });
  }

  const definition = await lookupStrongDefinition(id);
  if (!definition) {
    return NextResponse.json({ error: "Strong number not found" }, { status: 404 });
  }

  return NextResponse.json(definition);
}
