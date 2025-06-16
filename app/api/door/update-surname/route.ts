import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { surname } = await req.json();

    if (!surname || typeof surname !== "string") {
      return NextResponse.json({ error: "Neplatné jméno" }, { status: 400 });
    }

    const updated = await prisma.zvonek.updateMany({
      data: { surname },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Žádný záznam nebyl aktualizován" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chyba při aktualizaci příjmení:", error);
    return NextResponse.json({ error: "Interní chyba serveru" }, { status: 500 });
  }
}
