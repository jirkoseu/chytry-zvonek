import { useEffect, useRef } from "react"

export function useWebSocket(url: string, onMessage: (msg: string) => void) {
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const wsUrl = `${url}?token=${token}`
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => console.log("🔌 WebSocket connected")
    socket.onclose = () => console.log("❌ WebSocket disconnected")
    socket.onerror = (err) => console.error("WebSocket error", err)
    socket.onmessage = (event) => {
      console.log("📨 WS Message:", event.data)
      onMessage(event.data)
    }

    socketRef.current = socket

    return () => socket.close()
  }, [url])

  const sendMessage = (msg: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(msg)
    }
  }

  return { sendMessage }
}