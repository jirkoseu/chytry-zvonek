import { NextResponse } from "next/server"

export async function POST() {
  try {
    const pin = Math.floor(Math.random() * 900000000 + 100000000).toString()
    const formattedPin = `${pin.slice(0, 3)}-${pin.slice(3, 5)}-${pin.slice(5, 8)}`

    return NextResponse.json({ pin: formattedPin })
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate PIN" }, { status: 500 })
  }
}
