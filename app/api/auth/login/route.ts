import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"

export async function POST(request: NextRequest) {
  try {
    const { surname, password } = await request.json()

    const user = await prisma.zvonek.findFirst({
      where: { surname },
    })

    const isPasswordValid = user && await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = jwt.sign(
      {
        id: user.id,
        surname: user.surname,
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    )

    const response = NextResponse.json({
      user: {
        id: user.id,
        surname: user.surname,
        passcode: user.passcode,
      },
      success: true,
    })

    response.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 2, // 2 hours
      sameSite: "strict",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
