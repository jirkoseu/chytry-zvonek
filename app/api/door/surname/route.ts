import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const user = await prisma.zvonek.findFirst();
    if (!user || !user.surname) {
      return NextResponse.json({ error: "Příjmení nenalezeno" }, { status: 404 });
    }

    return NextResponse.json({ surname: user.surname });
  } catch (error) {
    console.error("Chyba při získávání příjmení:", error);
    return NextResponse.json({ error: "Interní chyba serveru" }, { status: 500 });
  }
}
