import { NextResponse } from "next/server"

export async function POST() {
  try {
    const pin = Math.floor(Math.random() * 900000000 + 100000000).toString()
    const formattedPin = `${pin.slice(0, 3)}-${pin.slice(3, 5)}-${pin.slice(5, 8)}`

    await fetch("http://raspizero.local:8000/api/set-homekit-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: formattedPin }),
    })

    return NextResponse.json({
      success: true,
      pin: formattedPin,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to pair HomeKit" }, { status: 500 })
  }
}
