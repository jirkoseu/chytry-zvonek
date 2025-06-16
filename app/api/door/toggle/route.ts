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
  try {
    doorStatus.isLocked = !doorStatus.isLocked
    doorStatus.lastUpdated = new Date().toISOString()

    return NextResponse.json({
      success: true,
      isLocked: doorStatus.isLocked,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to toggle lock" }, { status: 500 })
  }
}
