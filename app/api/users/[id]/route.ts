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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const updates = await request.json()

    const userIndex = users.findIndex((u) => u.id === id)
    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    users[userIndex] = { ...users[userIndex], ...updates }
    return NextResponse.json(users[userIndex])
  } catch (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const userIndex = users.findIndex((u) => u.id === id)

    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    users.splice(userIndex, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
