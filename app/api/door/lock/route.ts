import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"

// Mock database - replace with your actual database
const doorStatus = {
  isLocked: true,
  lastUpdated: new Date().toISOString(),
  batteryLevel: 85,
  wifiStrength: 95,
  homeKitPaired: false,
}

export async function POST() {
  const cookieStore = cookies()
  const token = cookieStore.get("token")?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret")

    await fetch("http://raspizero.local:8000/api/lock-door", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    // TODO: replace with actual DB call to lock the door
    doorStatus.isLocked = true
    doorStatus.lastUpdated = new Date().toISOString()

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 })
  }
}
