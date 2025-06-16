"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Lock, Unlock, Bell, Delete, X, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWebSocket } from "@/hooks/useWebSocket"

export default function SmartDoorLock() {
  const [surname, setSurname] = useState("Načítání...");
  const { sendMessage } = useWebSocket(
    "ws://localhost:8000/ws/open-door",
    (message) => {
      try {
        const data = JSON.parse(message);
        if (data.event === "unlock") {
          handleUnlock("123456"); // nebo jiná autentizace podle potřeby
        } else if (data.event === "doorbell") {
          setButtonPressed("doorbell");
          setIsRinging(true);
          setAnimationState("ringing");
          playDoorbellSound();
          setTimeout(() => {
            setButtonPressed(null);
            setIsRinging(false);
            setAnimationState("idle");
          }, 3000);
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    }
  );
  const [isLocked, setIsLocked] = useState(true)
  const [passcode, setPasscode] = useState("")
  const [isEnteringPasscode, setIsEnteringPasscode] = useState(false)
  const [animationState, setAnimationState] = useState<"idle" | "unlocking" | "unlocked" | "denied" | "ringing">("idle")
  const [shakeAnimation, setShakeAnimation] = useState(false)
  const [keypadVisible, setKeypadVisible] = useState(false)
  const [buttonPressed, setButtonPressed] = useState<string | null>(null)
  const [touchProgress, setTouchProgress] = useState(0)
  const [isTouching, setIsTouching] = useState(false)
  const [isRinging, setIsRinging] = useState(false)
  const [homekitConnected, setHomekitConnected] = useState(false)
  const [doorOpen, setDoorOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  // Fetch surname from API
  useEffect(() => {
    const fetchSurname = async () => {
      try {
        const res = await fetch("/api/door/surname");
        const data = await res.json();
        if (data?.surname) {
          setSurname(data.surname);
        } else {
          setSurname("Neznámý uživatel");
        }
      } catch (error) {
        console.error("Chyba při načítání jména:", error);
        setSurname("Chyba");
      }
    };
    fetchSurname();
  }, []);

  // Connect to status websocket
  useEffect(() => {
    const statusWs = new WebSocket("ws://raspizero.local:8000/ws/status");
    statusWs.onopen = () => {
      console.log("Connected to status WebSocket");
      statusWs.send(JSON.stringify({ action: "get_status" }));
    };
    statusWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.homekit_connected !== undefined) {
          setHomekitConnected(!!data.homekit_connected);
        }
        if (data.locked !== undefined) {
          setIsLocked(!!data.locked);
        }
        if (data.door_open !== undefined) {
          setDoorOpen(!!data.door_open);
        }
        if (data.event === "doorbell") {
          setButtonPressed("doorbell");
          setIsRinging(true);
          setAnimationState("ringing");
          playDoorbellSound();
          setTimeout(() => {
            setButtonPressed(null);
            setIsRinging(false);
            setAnimationState("idle");
          }, 3000);
        }
      } catch (err) {
        console.error("Status WebSocket parse error:", err);
      }
    };
    statusWs.onerror = (err) => console.error("Status WebSocket error:", err);
    statusWs.onclose = () => console.log("Status WebSocket disconnected");
    return () => {
      statusWs.close();
    };
  }, []);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const keypadRef = useRef<HTMLDivElement | null>(null)
  const [randomizedNumbers, setRandomizedNumbers] = useState<string[]>([])

  const handleNumberPress = (num: string) => {
    if (passcode.length < 6) {
      setButtonPressed(num)
      setTimeout(() => setButtonPressed(null), 150)

      const newPasscode = passcode + num
      setPasscode(newPasscode)

      // Auto-submit when 6 digits are entered
      if (newPasscode.length === 6) {
        setTimeout(() => {
          handleUnlock(newPasscode)
        }, 200) // Small delay for better UX
      }
    }
  }

  const handleDelete = () => {
    setButtonPressed("delete")
    setTimeout(() => setButtonPressed(null), 150)
    setPasscode((prev) => prev.slice(0, -1))
  }

  const handleUnlock = async (codeToCheck?: string) => {
    setIsVerifying(true);
    const finalCode = codeToCheck || passcode

    try {
      const verifyRes = await fetch("/api/door/verify-passcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode: finalCode }),
      });
      const result = await verifyRes.json();
      setIsVerifying(false);
      if (!verifyRes.ok || !result.ok) {
        throw new Error(result.error || "Invalid code");
      }

      // Verification succeeded, proceed with lock/unlock logic
      if (isLocked) {
        // Trigger actual door opening via API
        fetch("/api/open-door", {
          method: "POST",
        }).catch((err) => console.error("Open door API error:", err));
        setAnimationState("unlocking")
        sendMessage(JSON.stringify({ event: "unlock" }));
        setTimeout(() => {
          setAnimationState("unlocked")
          setIsLocked(false)
          setPasscode("")
          setIsEnteringPasscode(false)
          setKeypadVisible(false)
          setTimeout(() => {
            setAnimationState("idle")
            setIsLocked(true)
          }, 3000)
        }, 1500)
      } else {
        // locking logic via passcode
        setAnimationState("unlocking");
        // call lock API
        await fetch("/api/door/lock", {
          method: "POST",
          credentials: "include",
        });
        sendMessage(JSON.stringify({ event: "lock" }));
        setTimeout(() => {
          setIsLocked(true);
          setPasscode("");
          setIsEnteringPasscode(false);
          setKeypadVisible(false);
          setAnimationState("idle");
        }, 1500);
      }
    } catch (err) {
      setIsVerifying(false);
      setAnimationState("denied")
      setShakeAnimation(true)
      setTimeout(() => {
        setPasscode("")
        setAnimationState("idle")
        setShakeAnimation(false)
      }, 2000)
    }
  }

  // Touch and hold interaction for the ring
  const handleTouchStart = () => {
    if (animationState !== "idle") return

    setIsTouching(true)
    setTouchProgress(0)

    touchTimerRef.current = setInterval(() => {
      setTouchProgress((prev) => {
        if (prev >= 100) {
          // Require passcode entry for both locking and unlocking
          setIsEnteringPasscode(true);
          setTimeout(() => setKeypadVisible(true), 300);
          setIsTouching(false);
          setTouchProgress(0);
          if (touchTimerRef.current) clearInterval(touchTimerRef.current);
          return 0;
        }
        return prev + 2
      })
    }, 20)
  }

  const handleTouchEnd = () => {
    setIsTouching(false)
    setTouchProgress(0)
    if (touchTimerRef.current) {
      clearInterval(touchTimerRef.current)
      touchTimerRef.current = null
    }
  }

  const playDoorbellSound = () => {
    // In a real app, you would play an actual doorbell sound here
    // Example: new Audio('/sounds/doorbell.mp3').play()
    console.log("🔔 Doorbell sound playing...")
  }

  const handleDoorbellPress = () => {
    setButtonPressed("doorbell");
    setIsRinging(true);
    setAnimationState("ringing");

    // Play doorbell sound
    playDoorbellSound();
    fetch("http://raspizero.local:8000/api/ring", {
      method: "POST",
    }).catch((err) => console.error("Doorbell API error:", err));

    setTimeout(() => setButtonPressed(null), 200);

    // Stop ringing after 3 seconds
    setTimeout(() => {
      setIsRinging(false);
      setAnimationState("idle");
    }, 3000);
  };

  /**
   * Toggle door lock via API endpoint.
   * Chooses unlock or lock based on current isLocked state.
   */
  const handleToggleLock = async () => {
    const endpoint = isLocked ? "/api/door/unlock" : "/api/door/lock";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        setIsLocked((prev) => !prev);
      } else {
        console.error("Failed to toggle lock:", response.statusText);
      }
    } catch (error) {
      console.error("Error toggling lock:", error);
    }
  };

  // Handle click outside keypad
  const handleOverlayClick = (e: React.MouseEvent) => {
    // Check if the click is outside the keypad
    if (keypadRef.current && !keypadRef.current.contains(e.target as Node)) {
      setIsEnteringPasscode(false)
      setKeypadVisible(false)
      setPasscode("")
    }
  }

  // Randomize keypad numbers for security
  const randomizeKeypad = () => {
    const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
    // Fisher-Yates shuffle algorithm
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
    }
    setRandomizedNumbers(numbers)
  }

  useEffect(() => {
    if (!isEnteringPasscode) {
      setKeypadVisible(false)
    } else {
      randomizeKeypad()
    }
  }, [isEnteringPasscode])

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearInterval(touchTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      className="w-full max-w-sm mx-auto relative"
      style={{ aspectRatio: "9/16", height: "100vh", maxHeight: "844px", backgroundColor: "#000000" }}
    >
      {/* Background subtle overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/30 via-gray-800/20 to-gray-900/30"></div>

      <div className="flex flex-col h-full text-white relative overflow-hidden">
        {/* Nameplate */}
        <div className="px-6 pt-12 mb-6 animate-slide-down">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl transform transition-all duration-500 hover:bg-white/10 shadow-xl">
            <div className="p-4 text-center">
              <h2 className="text-lg font-medium text-white mb-1">{surname}</h2>
              <p className="text-sm text-gray-200">Tady hlídám já ✌🏻</p>
            </div>
          </Card>
        </div>

        {/* Status */}
        <div className="text-center px-6 mb-8 animate-fade-in-delayed">
          <h1 className="text-2xl font-light mb-3 transition-all duration-300 text-white">Vchodové dveře</h1>
          <Badge
            className={`${isLocked ? "bg-red-500/80" : "bg-green-500/80"} text-white border-0 backdrop-blur-sm transition-all duration-500 transform ${
              !isLocked ? "animate-pulse" : ""
            } shadow-lg`}
          >
            {isLocked ? "ZAMČENO" : "ODEMČENO"}
          </Badge>
        </div>

        {/* Interactive Ring */}
        <div className="flex-1 flex items-center justify-center px-6 mb-8">
          <div className="relative">
            {/* Outer progress ring */}
            <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 256 256">
              {/* Background ring */}
              <circle cx="128" cy="128" r="120" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              {/* Progress ring */}
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke={isTouching ? (isLocked ? "#ef4444" : "#22c55e") : "transparent"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 120}`}
                strokeDashoffset={`${2 * Math.PI * 120 * (1 - touchProgress / 100)}`}
                className="transition-all duration-100"
              />
            </svg>

            {/* Main touch button */}
            <div
              ref={ringRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              className={`absolute inset-4 rounded-full border-2 flex flex-col items-center justify-center cursor-pointer select-none backdrop-blur-xl ${
                animationState === "unlocking"
                  ? "border-green-400/60 bg-green-500/20 shadow-2xl shadow-green-500/50"
                  : animationState === "unlocked"
                    ? "border-green-400/60 bg-green-500/30 shadow-2xl shadow-green-500/50"
                    : animationState === "denied"
                      ? "border-red-400/60 bg-red-500/20 shadow-2xl shadow-red-500/50"
                      : animationState === "ringing"
                        ? "border-orange-400/60 bg-orange-500/20 shadow-2xl shadow-orange-500/50"
                        : isTouching
                          ? isLocked
                            ? "border-red-400/60 bg-red-500/20 scale-95 shadow-2xl shadow-red-500/50"
                            : "border-green-400/60 bg-green-500/20 scale-95 shadow-2xl shadow-green-500/50"
                          : isLocked
                            ? "border-red-500/40 bg-red-500/10 hover:bg-red-500/20 shadow-xl"
                            : "border-green-500/40 bg-green-500/10 hover:bg-green-500/20 shadow-xl"
              } transition-all duration-200 transform ${animationState === "denied" ? "animate-shake" : ""}`}
            >
              {/* Touch instruction text */}
              {!isTouching && animationState === "idle" && (
                <div className="text-center mb-2">
                  <p className="text-xs text-gray-300 mb-1">{isLocked ? "Podržte pro odemčení" : "Podržte pro zamčení"}</p>
                </div>
              )}

              {/* Progress indicator */}
              {isTouching && (
                <div className="text-center mb-2">
                  <p className="text-xs text-white font-medium">{Math.round(touchProgress)}%</p>
                </div>
              )}

              {/* Main icon with state-based animations */}
              {animationState === "unlocking" ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 flex items-center justify-center mb-2">
                    <div className="w-8 h-8 border-3 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <span className="text-green-400 text-sm font-medium">Probíhá odemykání...</span>
                </div>
              ) : animationState === "unlocked" ? (
                <div className="flex flex-col items-center">
                  <Unlock className="w-20 h-20 text-green-400 mb-2" />
                  <span className="text-green-400 text-sm font-medium">Odemykání</span>
                </div>
              ) : animationState === "denied" ? (
                <div className="flex flex-col items-center">
                  <X className="w-20 h-20 text-red-400 mb-2" />
                  <span className="text-red-400 text-sm font-medium">Přístup odepřen</span>
                </div>
              ) : animationState === "ringing" ? (
                <div className="flex flex-col items-center">
                  <Bell className="w-20 h-20 text-orange-400 animate-bounce mb-2" />
                  <span className="text-orange-400 text-sm font-medium">Zvonění...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {isLocked ? (
                    <Lock className="w-20 h-20 text-red-400 transition-transform duration-300" />
                  ) : (
                    <Unlock className="w-20 h-20 text-green-400 transition-transform duration-300" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Doorbell Button with ringing effect */}
        <div className="px-6 mb-8 relative z-10">
          <Button
            className={`w-full h-16 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 backdrop-blur-xl transition-all duration-200 transform shadow-xl ${
              buttonPressed === "doorbell" ? "scale-95 bg-white/30" : "hover:scale-105"
            }`}
            onClick={handleDoorbellPress}
          >
            <Bell className={`w-6 h-6 mr-3 ${isRinging ? "animate-bounce" : ""}`} />
            Zazvonit
          </Button>
        </div>

        {/* Keypad with glassmorphism */}
        {isEnteringPasscode && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 flex items-end justify-center"
            onClick={handleOverlayClick}
          >
            <div
              ref={keypadRef}
              className={`relative w-full max-w-sm px-6 pb-8 transition-all duration-500 transform ${
                keypadVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
              } ${shakeAnimation ? "animate-shake" : ""}`}
            >
              {isVerifying && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
                  <Loader2 className="animate-spin w-10 h-10 text-white mb-2" />
                  <span className="text-white">Ověřuji...</span>
                </div>
              )}
              <div className="bg-gray-900/80 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium mb-2 text-white">Zadejte kód</h3>
                  <p className="text-xs text-gray-300 mb-4">Automatické odeslání po zadání celého kódu</p>
                  <div className="flex justify-center gap-3 mb-6">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                          i < passcode.length ? "bg-white border-white scale-110 shadow-lg" : "border-gray-400"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Glassmorphism keypad layout */}
                <div className="grid grid-cols-3 gap-4">
                  {randomizedNumbers.slice(0, 9).map((num) => (
                    <Button
                      key={num}
                      onClick={() => handleNumberPress(num)}
                      disabled={passcode.length >= 6}
                      className={`h-16 text-xl font-medium bg-gray-800/60 hover:bg-gray-700/60 text-white rounded-2xl border border-gray-600/40 backdrop-blur-xl transition-all duration-150 transform shadow-lg ${
                        buttonPressed === num ? "scale-95 bg-gray-600/60" : "hover:scale-105 active:scale-95"
                      } ${passcode.length >= 6 ? "opacity-50 cursor-not-allowed" : ""}`}
                      variant="ghost"
                    >
                      {num}
                    </Button>
                  ))}

                  {/* Empty space for better layout */}
                  <div></div>

                  <Button
                    onClick={() => handleNumberPress(randomizedNumbers[9])}
                    disabled={passcode.length >= 6}
                    className={`h-16 text-xl font-medium bg-gray-800/60 hover:bg-gray-700/60 text-white rounded-2xl border border-gray-600/40 backdrop-blur-xl transition-all duration-150 transform shadow-lg ${
                      buttonPressed === randomizedNumbers[9]
                        ? "scale-95 bg-gray-600/60"
                        : "hover:scale-105 active:scale-95"
                    } ${passcode.length >= 6 ? "opacity-50 cursor-not-allowed" : ""}`}
                    variant="ghost"
                  >
                    {randomizedNumbers[9]}
                  </Button>

                  <Button
                    onClick={handleDelete}
                    disabled={passcode.length === 0}
                    className={`h-16 bg-gray-800/60 hover:bg-gray-700/60 text-white rounded-2xl border border-gray-600/40 backdrop-blur-xl transition-all duration-150 transform shadow-lg ${
                      buttonPressed === "delete" ? "scale-95 bg-gray-600/60" : "hover:scale-105 active:scale-95"
                    } ${passcode.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    variant="ghost"
                  >
                    <Delete className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
