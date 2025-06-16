import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { passcode } = await req.json();

  // Validate input
  if (!passcode || typeof passcode !== "string" || passcode.length !== 6) {
    return NextResponse.json(
      { error: "Invalid passcode format" },
      { status: 400 }
    );
  }

  try {
    // Update the passcode for the lock record(s)
    const result = await prisma.zvonek.updateMany({
      data: { passcode },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "No records updated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Passcode update error:", error);
    return NextResponse.json(
      { error: "Database error updating passcode" },
      { status: 500 }
    );
  }
}
