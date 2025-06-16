// app/api/door/verify-passcode/route.ts

import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { passcode } = await req.json()

  const user = await prisma.zvonek.findFirst({
  where: { passcode }
})
  if (!user) {
    return NextResponse.json({ error: "Invalid passcode" }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}