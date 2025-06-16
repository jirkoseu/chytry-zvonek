import { type NextRequest, NextResponse } from "next/server"

// Mock database - replace with your actual database
let settings = {
  autoLockDelay: 30,
  doorbellEnabled: true,
  notificationsEnabled: true,
  passcode: "123456",
  homeKitPin: "123-45-678",
}

export async function GET() {
  try {
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const updates = await request.json()
    settings = { ...settings, ...updates }

    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
