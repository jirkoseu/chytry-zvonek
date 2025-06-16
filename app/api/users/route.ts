import { type NextRequest, NextResponse } from "next/server"

// Mock database - replace with your actual database
const users = [
  {
    id: 1,
    name: "Jiri Barlog",
    email: "jiri@barlog.com",
    role: "admin" as const,
    passcode: "123456",
    isActive: true,
    lastAccess: "2024-01-15 14:30",
    createdAt: "2024-01-01 10:00",
  },
  {
    id: 2,
    name: "Eva Barlog",
    email: "eva@barlog.com",
    role: "user" as const,
    passcode: "654321",
    isActive: true,
    lastAccess: "2024-01-15 12:15",
    createdAt: "2024-01-02 09:30",
  },
]

export async function GET() {
  try {
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: "Failed to get users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()
    const newUser = {
      id: Date.now(),
      ...userData,
      lastAccess: "Never",
      createdAt: new Date().toLocaleString(),
    }

    users.push(newUser)
    return NextResponse.json(newUser)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
