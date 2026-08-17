import { NextRequest, NextResponse } from "next/server";

const PINES: Record<string, string | undefined> = {
  admin: process.env.ADMIN_PIN,
  reportes: process.env.REPORTES_PIN,
};

export async function POST(request: NextRequest) {
  const { modulo, pin } = await request.json();
  const pinCorrecto = PINES[modulo];

  if (!pinCorrecto) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: pin === pinCorrecto });
}