import { type NextRequest, NextResponse } from "next/server"

// Mock database - replace with your actual database
const logs = [
  { id: 1, type: "unlock", user: "Eva Barlog", time: "2024-01-15 14:30:15", success: true },
  { id: 2, type: "doorbell", user: "Visitor", time: "2024-01-15 14:25:30", success: true },
  {
    id: 3,
    type: "failed_attempt",
    user: "Unknown",
    time: "2024-01-15 14:20:45",
    details: "Wrong passcode: 999999",
    success: false,
  },
  { id: 4, type: "lock", user: "Auto-lock", time: "2024-01-15 14:15:00", success: true },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    let filteredLogs = logs

    if (type && type !== "all") {
      filteredLogs = logs.filter((log) => log.type === type)
    }

    if (offset) {
      filteredLogs = filteredLogs.slice(Number.parseInt(offset))
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(0, Number.parseInt(limit))
    }

    return NextResponse.json(filteredLogs)
  } catch (error) {
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const logData = await request.json()
    const newLog = {
      id: Date.now(),
      ...logData,
      time: new Date().toLocaleString(),
    }

    logs.unshift(newLog) // Add to beginning
    return NextResponse.json(newLog)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 })
  }
}
