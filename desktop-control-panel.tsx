"use client"

import { useState, useEffect, useRef } from "react"
import {
  Lock,
  Unlock,
  Bell,
  Settings,
  Users,
  Activity,
  Wifi,
  Home,
  Camera,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Download,
  Smartphone,
  Copy,
  Check,
  LogOut,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Clock,
  UserIcon,
  Shield,
  Key,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
// Simple global spinner for pending requests
const Spinner = () => (
  <div className="flex justify-center items-center p-6">
    <Loader2 className="w-8 h-8 animate-spin" />
  </div>
);
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import QRCode from "qrcode.react"
import {
  useDoorStatus,
  useToggleLock,
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useLogs,
  useCreateLog,
  useSettings,
  useUpdateSettings,
  useTriggerDoorbell,
  usePairHomeKit,
  useUnpairHomeKit,
  useGenerateHomeKitPin,
  useLogin,
  useLogout,
} from "@/hooks/use-api"
import type { User } from "@/lib/api"

export default function DesktopControlPanel() {
  // WebSocket status states (for HomeKit, lock, and door status)
  const [homekitConnected, setHomekitConnected] = useState(false)
  const [locked, setLocked] = useState(false)
  const [doorOpen, setDoorOpen] = useState(false)
  // Camera connection state
  const [cameraConnected, setCameraConnected] = useState(false)
  // Ref for WebSocket connection
  const wsRef = useRef<WebSocket | null>(null);

  // Authentication
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loginError, setLoginError] = useState("")

  // Establish WebSocket connection after login to fetch lock status immediately
  useEffect(() => {
    if (!isLoggedIn) return;

    const ws = new WebSocket("ws://raspizero.local:8000/ws/status");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected, requesting initial status");
      ws.send(JSON.stringify({ action: "get_status" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket data:", data);
        setHomekitConnected(!!data.homekit_connected);
        setLocked(!!data.locked);
        setDoorOpen(!!data.door_open);
        if (data.event === "doorbell") {
          setDoorbellActive(true);
          setIsRinging(true);
          setCameraKey((prev) => prev + 1);
          setTimeout(() => setIsRinging(false), 3000);
        }
      } catch (error) {
        console.error("WebSocket JSON parse error:", error);
      }
    };

    ws.onerror = (error) => console.error("WebSocket error:", error);
    ws.onclose = () => console.log("WebSocket disconnected");

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [isLoggedIn]);

  // Check camera connectivity on initial mount
  useEffect(() => {
    fetch("http://raspizero.local:8000/api/camera-stream")
      .then((res) => setCameraConnected(res.ok))
      .catch(() => setCameraConnected(false));
  }, []);

  // API hooks
  // const { data: doorStatus, isLoading: doorLoading } = useDoorStatus()
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const { data: logs = [], isLoading: logsLoading } = useLogs()
  const { data: settings, isLoading: settingsLoading } = useSettings()

  // Mutations
  const toggleLockMutation = useToggleLock()
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()
  const createLogMutation = useCreateLog()
  const updateSettingsMutation = useUpdateSettings()
  const triggerDoorbellMutation = useTriggerDoorbell()
  const pairHomeKitMutation = usePairHomeKit()
  const unpairHomeKitMutation = useUnpairHomeKit()
  const generatePinMutation = useGenerateHomeKitPin()
  const loginMutation = useLogin()
  const logoutMutation = useLogout()

  const { toast } = useToast()

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showHomeKitModal, setShowHomeKitModal] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showConsoleModal, setShowConsoleModal] = useState(false)
  const [showSurnameModal, setShowSurnameModal] = useState(false)

  // Surname change state
  const [newSurname, setNewSurname] = useState("")
  // Handler for surname change
  const handleSurnameChange = async () => {
    try {
      const res = await fetch("/api/door/update-surname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surname: newSurname }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Nepodařilo se změnit jmenovku");
      }

      setNewSurname("");
      setShowSurnameModal(false);

      toast({
        title: "Jmenovka změněna",
        description: "Nové jméno bylo úspěšně uloženo.",
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit jmenovku.",
        variant: "destructive",
      });
    }
  }

  // Form states
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "user" as "admin" | "user" | "guest",
    passcode: "",
  })

  // Filters and search
  const [logFilter, setLogFilter] = useState("all")
  const [logSearch, setLogSearch] = useState("")
  const [userFilter, setUserFilter] = useState("all")

  // HomeKit
  const [homeKitPin, setHomeKitPin] = useState("123-45-678")
  const [pinCopied, setPinCopied] = useState(false)

  // Other states
  const [doorbellActive, setDoorbellActive] = useState(false)
  const [cameraFeed, setCameraFeed] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [isRinging, setIsRinging] = useState(false)

  // Camera refresh key (for preview/doorbell modal)
  const [cameraKey, setCameraKey] = useState(0)

  // Current time state for camera overlay
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Login function
  const handleLogin = async () => {
    try {
      const result = await loginMutation.mutateAsync({
        email: loginEmail,
        password: loginPassword,
      })

      // Set cookie with expiry and SameSite for production
      const expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toUTCString()
      document.cookie = `token=${result.token}; path=/; expires=${expires}; SameSite=Strict`

      setIsLoggedIn(true)
      setCurrentUser(result.user)
      setLoginError("")

      // Create login log
      await createLogMutation.mutateAsync({
        type: "login",
        user: result.user.name,
        details: "Successful admin login",
        success: true,
      })

      toast({
        title: "Login successful",
        description: `Welcome back, ${result.user.name}!`,
      })
    } catch (error) {
      setLoginError("Invalid username or password.")
      toast({
        title: "Login failed",
        description: "Invalid credentials",
        variant: "destructive",
      })
    }
  }

  // Logout function
  const handleLogout = async () => {
    try {
      if (currentUser) {
        await createLogMutation.mutateAsync({
          type: "login",
          user: currentUser.name,
          details: "User logged out",
          success: true,
        })
      }

      await logoutMutation.mutateAsync()
      setIsLoggedIn(false)
      setCurrentUser(null)
      setLoginEmail("")
      setLoginPassword("")

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred during logout",
        variant: "destructive",
      })
    }
  }

  // Door control functions
  const [isLocked, setIsLocked] = useState<boolean>(false)
  // keep local state in sync with doorStatus
  // Optionally, you may want to useEffect to sync isLocked with doorStatus?.isLocked if doorStatus changes
  // But for now, we update isLocked only via successful toggle
  const handleToggleLock = async () => {
    const endpoint = isLocked ? "/api/door/unlock" : "/api/door/lock"
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "include" })
      if (response.ok) {
        setIsLocked((prev) => !prev)
      toast({
        title: isLocked ? "Dveře byly odemčeny" : "Dveře byly zamčeny",
        description: isLocked
          ? "Dveře byly úspěšně odemčeny."
          : "Dveře byly úspěšně zamčeny.",
      })
      } else {
        toast({
          title: "Chyba",
          description: "Nepodařilo se změnit stav dveří.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit stav dveří.",
        variant: "destructive",
      })
    }
  }

  // User management functions
  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.passcode) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      await createUserMutation.mutateAsync({
        ...newUser,
        isActive: true,
      })

      setNewUser({ name: "", email: "", role: "user", passcode: "" })
      setShowAddUserModal(false)

      toast({
        title: "User added",
        description: `${newUser.name} has been added successfully.`,
      })
    } catch (error) {
      toast({
        title: "Failed to add user",
        description: "An error occurred while adding the user",
        variant: "destructive",
      })
    }
  }

  const removeUser = async (userId: number) => {
    try {
      await deleteUserMutation.mutateAsync(userId)

      toast({
        title: "User removed",
        description: "User has been removed successfully.",
      })
    } catch (error) {
      toast({
        title: "Failed to remove user",
        description: "An error occurred while removing the user",
        variant: "destructive",
      })
    }
  }

  const toggleUserStatus = async (userId: number) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    try {
      await updateUserMutation.mutateAsync({
        id: userId,
        updates: { isActive: !user.isActive },
      })

      toast({
        title: "User updated",
        description: `User has been ${!user.isActive ? "activated" : "deactivated"}.`,
      })
    } catch (error) {
      toast({
        title: "Failed to update user",
        description: "An error occurred while updating the user",
        variant: "destructive",
      })
    }
  }

  // Password change
  const handlePasswordChange = async () => {
    if (newPassword.length !== 6) {
      toast({
        title: "Invalid passcode",
        description: "Passcode must be exactly 6 digits",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passcode mismatch",
        description: "Passcodes do not match",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/door/update-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update passcode");
      }

      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordModal(false)

      toast({
        title: "Passcode updated",
        description: "Door passcode has been changed successfully.",
      })
    } catch (error) {
      toast({
        title: "Failed to update passcode",
        description: "An error occurred while updating the passcode",
        variant: "destructive",
      })
    }
  }

  // HomeKit functions
  const generateNewHomeKitPin = async () => {
    try {
      const response = await fetch("/api/homekit-code")
      if (!response.ok) {
        throw new Error("Failed to fetch PIN from Raspberry Pi")
      }
      const data = await response.json()
      setHomeKitPin(data.pin)
    } catch (error) {
      toast({
        title: "Failed to generate PIN",
        description: "An error occurred while generating a new PIN",
        variant: "destructive",
      })
    }
  }

  const copyPinToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(homeKitPin)
      setPinCopied(true)
      setTimeout(() => setPinCopied(false), 2000)

      toast({
        title: "PIN copied",
        description: "HomeKit PIN has been copied to clipboard.",
      })
    } catch (err) {
      toast({
        title: "Failed to copy PIN",
        description: "Could not copy PIN to clipboard",
        variant: "destructive",
      })
    }
  }

  const handleHomeKitPair = async () => {
    try {
      await pairHomeKitMutation.mutateAsync()
      setShowHomeKitModal(false)

      toast({
        title: "HomeKit paired",
        description: "Smart lock has been paired with HomeKit successfully.",
      })
    } catch (error) {
      toast({
        title: "HomeKit pairing failed",
        description: "An error occurred while pairing with HomeKit",
        variant: "destructive",
      })
    }
  }

  const handleHomeKitUnpair = async () => {
    try {
      await unpairHomeKitMutation.mutateAsync()
      await generateNewHomeKitPin()

      toast({
        title: "HomeKit unpaired",
        description: "Smart lock has been unpaired from HomeKit.",
      })
    } catch (error) {
      toast({
        title: "HomeKit unpairing failed",
        description: "An error occurred while unpairing from HomeKit",
        variant: "destructive",
      })
    }
  }

  // Doorbell functions
  const handleDoorbellResponse = async (action: "unlock" | "cancel") => {
    if (action === "unlock") {
      try {
        await toggleLockMutation.mutateAsync()

        await createLogMutation.mutateAsync({
          type: "unlock",
          user: "Remote Unlock",
          details: "Unlocked via doorbell response",
          success: true,
        })

        // Auto-lock after 5 seconds
        setTimeout(async () => {
          await toggleLockMutation.mutateAsync()
          await createLogMutation.mutateAsync({
            type: "lock",
            user: "Auto-lock",
            details: "Auto-locked after 5 seconds",
            success: true,
          })
        }, 5000)
      } catch (error) {
        toast({
          title: "Failed to unlock door",
          description: "An error occurred while unlocking the door",
          variant: "destructive",
        })
      }
    }

    setDoorbellActive(false)
    setIsRinging(false)
  }

  const triggerDoorbell = async () => {
    try {
      await triggerDoorbellMutation.mutateAsync()

      setDoorbellActive(true)
      setIsRinging(true)

      setTimeout(() => setIsRinging(false), 3000)

      toast({
        title: "Doorbell triggered",
        description: "Test doorbell has been activated.",
      })
    } catch (error) {
      toast({
        title: "Failed to trigger doorbell",
        description: "An error occurred while triggering the doorbell",
        variant: "destructive",
      })
    }
  }

  // Filter functions
  const filteredLogs = logs.filter((log) => {
    const matchesFilter = logFilter === "all" || log.type === logFilter
    const matchesSearch =
      (log.user?.toLowerCase() ?? "").includes(logSearch.toLowerCase()) ||
      (log.details?.toLowerCase() ?? "").includes(logSearch.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const filteredUsers = users.filter((user) => {
    if (userFilter === "all") return true
    if (userFilter === "active") return user.isActive
    if (userFilter === "inactive") return !user.isActive
    return user.role === userFilter
  })


  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <Card className="bg-card border-border w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 border border-border">
              <Home className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl text-foreground">Barlog Smart Home</CardTitle>
            <p className="text-muted-foreground">Přihlaste se pro správu chytrého zámku</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Uživatelské jméno</label>
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full p-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground"
                  placeholder="jiri"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Heslo</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full p-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground pr-12"
                    placeholder="Zadejte heslo"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {loginError && (
                  <p className="text-sm text-red-500 mt-1">{loginError}</p>
                )}
              </div>
              <Button onClick={handleLogin} disabled={loginMutation.isPending} className="w-full">
                {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Přihlásit se
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <p>Demo přihlašovací údaje:</p>
                <p>Uživatelské jméno: jiri</p>
                <p>Heslo: admin123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 relative">
      {/* Ringing effect overlay */}
      {isRinging && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 border-2 border-orange-400/15 rounded-3xl animate-ping"
              style={{
                animationDelay: `${i * 0.3}s`,
                animationDuration: "2s",
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center border border-border shadow-xl">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Barlog Smart Home</h1>
              <p className="text-muted-foreground">Security Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg border border-border">
              <UserIcon className="w-4 h-4" />
              <span>{currentUser?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg border border-border">
              <Wifi className="w-4 h-4" />
              <span className={cameraConnected ? "text-green-500" : "text-red-500"}>
                {cameraConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            {settings?.homeKitPin && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg border border-border">
                <Smartphone className="w-4 h-4" />
                <span>HomeKit</span>
              </div>
            )}
            {/* <Skeleton className="h-6 w-20" /> */}
            <Badge className={`flex items-center text-sm text-white ${locked ? "bg-red-500" : "bg-green-500"}`}>
              {toggleLockMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                locked ? "LOCKED" : "UNLOCKED"
              )}
            </Badge>
            <ThemeToggle />
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border h-full shadow-2xl">
              <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Kamera u dveří
                </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAudioEnabled(!audioEnabled)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border border-border shadow-xl">
                  {/* Live camera feed */}
                  <img
                    src="http://raspizero.local:8000/api/camera-stream"
                    alt="Živý přenos z kamery"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Live indicator */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-white">ŽIVĚ</span>
                  </div>

                  {/* Timestamp */}
                  <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded border border-border">
                    <span className="text-sm text-white">{new Date().toLocaleString()}</span>
                  </div>

                  {/* Current time overlay at bottom right */}
                  
                </div>

                {/* Camera Controls */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button
                    onClick={triggerDoorbell}
                    disabled={triggerDoorbellMutation.isPending}
                    className={`${isRinging ? "animate-pulse" : ""}`}
                    variant="outline"
                  >
                    {triggerDoorbellMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Bell className={`w-4 h-4 mr-2 ${isRinging ? "animate-bounce" : ""}`} />
                    )}
                    Otestovat zvonek
                  </Button>
                  <Button
                    onClick={handleToggleLock}
                    disabled={toggleLockMutation.isPending}
                    className={locked ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                  >
                    {toggleLockMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : locked ? (
                      <Lock className="w-4 h-4 mr-2" />
                    ) : (
                      <Unlock className="w-4 h-4 mr-2" />
                    )}
                    {locked ? "Odemknout dveře" : "Zamknout dveře"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Door Status */}
            <Card className="bg-card border-border shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Stav dveří</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stav zámku</span>
                    <Badge className={`flex items-center text-sm text-white ${cameraConnected ? (locked ? 'bg-red-600' : 'bg-green-600') : 'bg-gray-500'}`}>
                      {toggleLockMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : cameraConnected ? (
                        locked ? 'ZAMČENO' : 'ODEMČENO'
                      ) : (
                        'NEDOSTUPNÉ'
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Připojení</span>
                    <div className="flex items-center gap-1">
                      <Wifi className="w-4 h-4 text-foreground" />
                      <span className="text-sm text-foreground">WiFi</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">HomeKit</span>
                    <Badge className={`text-sm ${cameraConnected ? (homekitConnected ? 'bg-green-600' : 'bg-red-600') : 'bg-gray-500'} text-white`}>
                      {cameraConnected ? (homekitConnected ? 'ANO' : 'NE') : 'NEDOSTUPNÉ'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-card border-border shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Rychlé akce</CardTitle>
            </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" onClick={() => setShowPasswordModal(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Změnit kód zámku
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await fetch("http://raspizero.local:8000/api/homekit-code");
                        if (!response.ok) {
                          throw new Error("Failed to fetch HomeKit PIN");
                        }
                        const data = await response.json();
                        setHomeKitPin(data.pin);
                      } catch (error: any) {
                        toast({
                          title: "Nepodařilo se načíst HomeKit kód",
                          description: error.message || "Chyba při získávání kódu",
                          variant: "destructive",
                        });
                      }
                      setShowHomeKitModal(true);
                    }}
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Nastavení HomeKit
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setShowSurnameModal(true)}>
                    <UserIcon className="w-4 h-4 mr-2" />
                    Změnit jmenovku
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All the modals remain the same but with updated styling for theme support */}
        {/* I'll keep the existing modal code but update the styling classes */}

        {/* Users Management Modal */}
        {showUsersModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-card border-border w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Users className="w-5 h-5" />
                    Správa uživatelů
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="bg-background border border-input rounded-lg px-3 py-1 text-foreground text-sm"
                    >
                      <option value="all">Všichni uživatelé</option>
                      <option value="active">Aktivní</option>
                      <option value="inactive">Neaktivní</option>
                      <option value="admin">Administrátoři</option>
                      <option value="user">Uživatelé</option>
                      <option value="guest">Hosté</option>
                    </select>
                    <Button
                      onClick={() => setShowAddUserModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Přidat uživatele
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto">
                {usersLoading ? (
                  <Spinner />
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="bg-muted rounded-lg p-4 border border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                user.role === "admin"
                                  ? "bg-red-600"
                                  : user.role === "user"
                                    ? "bg-blue-600"
                                    : "bg-gray-600"
                              }`}
                            >
                              {user.role === "admin" ? (
                                <Shield className="w-5 h-5 text-white" />
                              ) : user.role === "user" ? (
                                <UserIcon className="w-5 h-5 text-white" />
                              ) : (
                                <Key className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-foreground font-medium">{user.name}</h3>
                              <p className="text-muted-foreground text-sm">{user.email}</p>
                              <p className="text-muted-foreground text-xs">Last access: {user.lastAccess}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${user.isActive ? "bg-green-600" : "bg-gray-600"} text-white`}>
                              {user.isActive ? "Aktivní" : "Neaktivní"}
                            </Badge>
                            <Badge className="bg-muted-foreground text-white">
                              {user.role === "admin"
                                ? "Administrátor"
                                : user.role === "user"
                                  ? "Uživatel"
                                  : "Host"}
                            </Badge>
                            <Button
                              onClick={() => toggleUserStatus(user.id)}
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                              disabled={updateUserMutation.isPending}
                            >
                              {updateUserMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : user.isActive ? (
                                "Deaktivovat"
                              ) : (
                                "Aktivovat"
                              )}
                            </Button>
                            {user.role !== "admin" && (
                              <Button
                                onClick={() => removeUser(user.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                                disabled={deleteUserMutation.isPending}
                              >
                                {deleteUserMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="p-6 border-t border-border">
                <Button onClick={() => setShowUsersModal(false)} className="w-full" variant="outline">
                  Zavřít
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-card border-border w-full max-w-md shadow-2xl">
              <CardHeader>
                <CardTitle className="text-foreground">Přidat nového uživatele</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Jméno</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full p-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground"
                      placeholder="Zadejte celé jméno"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Email</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full p-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground"
                      placeholder="Zadejte e-mailovou adresu"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "admin" | "user" | "guest" })}
                      className="w-full p-3 bg-background border border-input rounded-lg text-foreground"
                    >
                      <option value="user">Uživatel</option>
                      <option value="guest">Host</option>
                      <option value="admin">Administrátor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Kód zámku (6 číslic)</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={newUser.passcode}
                      onChange={(e) => setNewUser({ ...newUser, passcode: e.target.value.replace(/\D/g, "") })}
                      className="w-full p-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground"
                      placeholder="Zadejte 6místný kód"
                    />
                  </div>
                </div>
              </CardContent>
              <div className="p-6 border-t border-border">
                <div className="flex gap-3">
                  <Button
                    onClick={addUser}
                    disabled={
                      !newUser.name || !newUser.email || newUser.passcode.length !== 6 || createUserMutation.isPending
                    }
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Přidat uživatele
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddUserModal(false)
                      setNewUser({ name: "", email: "", role: "user", passcode: "" })
                    }}
                    className="flex-1"
                    variant="outline"
                  >
                    Zrušit
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Activity Logs Modal */}
        {showLogsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-card border-border w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Activity className="w-5 h-5" />
                  Protokol aktivit
                </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Hledat v protokolu..."
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        className="bg-background border border-input rounded-lg pl-10 pr-3 py-2 text-foreground text-sm w-64"
                      />
                    </div>
                    <select
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm"
                    >
                      <option value="all">Všechny aktivity</option>
                      <option value="unlock">Odemčení</option>
                      <option value="lock">Zamčení</option>
                      <option value="doorbell">Zvonek</option>
                      <option value="settings">Nastavení</option>
                      <option value="login">Přihlášení</option>
                      <option value="failed_attempt">Neúspěšné pokusy</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto">
                {logsLoading ? (
                  <Spinner />
                ) : (
                  <div className="space-y-2">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`bg-muted rounded-lg p-4 border border-border ${
                          !log.success ? "border-red-500/30 bg-red-900/20" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                log.type === "unlock"
                                  ? "bg-green-600"
                                  : log.type === "lock"
                                    ? "bg-red-600"
                                    : log.type === "doorbell"
                                      ? "bg-blue-600"
                                      : log.type === "settings"
                                        ? "bg-purple-600"
                                        : log.type === "login"
                                          ? "bg-gray-600"
                                          : log.type === "failed_attempt"
                                            ? "bg-red-600"
                                            : "bg-gray-600"
                              }`}
                            >
                              {log.type === "unlock" ? (
                                <Unlock className="w-4 h-4 text-white" />
                              ) : log.type === "lock" ? (
                                <Lock className="w-4 h-4 text-white" />
                              ) : log.type === "doorbell" ? (
                                <Bell className="w-4 h-4 text-white" />
                              ) : log.type === "settings" ? (
                                <Settings className="w-4 h-4 text-white" />
                              ) : log.type === "login" ? (
                                <UserIcon className="w-4 h-4 text-white" />
                              ) : log.type === "failed_attempt" ? (
                                <X className="w-4 h-4 text-white" />
                              ) : (
                                <Activity className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-foreground font-medium">{log.user}</h3>
                                <Badge className={`text-xs ${log.success ? "bg-green-600" : "bg-red-600"} text-white`}>
                                  {log.success ? "Úspěch" : "Neúspěch"}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-sm capitalize">
                                {log.type === "unlock"
                                  ? "Odemčení"
                                  : log.type === "lock"
                                    ? "Zamčení"
                                    : log.type === "doorbell"
                                      ? "Zvonek"
                                      : log.type === "settings"
                                        ? "Nastavení"
                                        : log.type === "login"
                                          ? "Přihlášení"
                                          : log.type === "failed_attempt"
                                            ? "Neúspěšný pokus"
                                            : log.type.replace("_", " ")}
                              </p>
                              {log.details && <p className="text-muted-foreground text-xs">{log.details}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                              <Clock className="w-3 h-3" />
                              <span>{log.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="p-6 border-t border-border">
                <Button onClick={() => setShowLogsModal(false)} className="w-full" variant="outline">
                  Zavřít
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Doorbell Modal */}
        {doorbellActive && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="bg-card border-border w-full max-w-2xl mx-4 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                  <Bell className={`w-6 h-6 text-orange-400 ${isRinging ? "animate-bounce" : ""}`} />
                  Někdo je u dveří
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Enhanced Camera View */}
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                    <img
                      key={cameraKey}
                      src="http://raspizero.local:8000/api/camera-stream"
                      alt="Kamera u dveří"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Live indicator */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-white">ŽIVĚ</span>
                    </div>
                    {/* Audio indicator */}
                    <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full border border-border">
                      <Volume2 className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button
                      onClick={() => {
                        handleToggleLock()
                          .catch((err) => console.error("Unlock error:", err));
                        setDoorbellActive(false);
                      }}
                      className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-lg text-white shadow-xl"
                      disabled={toggleLockMutation.isPending}
                    >
                      {toggleLockMutation.isPending ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Unlock className="w-5 h-5 mr-2" />
                      )}
                      Otevřít dveře
                    </Button>
                    <Button
                      onClick={() => handleDoorbellResponse("cancel")}
                      className="flex-1 h-14 text-lg"
                      variant="outline"
                    >
                      <PhoneOff className="w-5 h-5 mr-2" />
                      Zamítnout
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="bg-card border-border w-full max-w-md mx-4 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-foreground">Změnit kód dveří</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Nový kód (6 číslic)</label>
                    <input
                      type="password"
                      maxLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ""))}
                      className="w-full p-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground"
                      placeholder="Zadejte nový kód"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Potvrďte kód</label>
                    <input
                      type="password"
                      maxLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ""))}
                      className="w-full p-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground"
                      placeholder="Potvrďte nový kód"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handlePasswordChange}
                      disabled={
                        newPassword.length !== 6 || newPassword !== confirmPassword || updateSettingsMutation.isPending
                      }
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Aktualizovat kód
                    </Button>
                    <Button
                      onClick={() => {
                        setShowPasswordModal(false)
                        setNewPassword("")
                        setConfirmPassword("")
                      }}
                      className="flex-1"
                      variant="outline"
                    >
                    Zrušit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* HomeKit Pairing Modal */}
        {showHomeKitModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="bg-card border-border w-full max-w-md mx-4 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Smartphone className="w-5 h-5" />
                  Nastavení HomeKit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {homeKitPin ? (
                    <>
                      <CardDescription className="text-muted-foreground text-sm mt-2">
                        Naskenuj párovací kód v aplikaci Domácnost pro přidání zařízení do HomeKit.
                      </CardDescription>
                      <p className="text-center text-sm text-muted-foreground">
                        Párovací kód: <span className="font-mono">{homeKitPin}</span>
                      </p>
                      <Button onClick={() => setShowHomeKitModal(false)} className="w-full" variant="outline">
                        Zavřít
                      </Button>
                    </>
                  ) : (
                    <>
                      <CardDescription className="text-muted-foreground text-sm mt-2">
                        Zařízení je připojeno k HomeKit. Odpojit lze pouze v aplikaci Domácnost.
                      </CardDescription>
                      <Button onClick={() => setShowHomeKitModal(false)} className="w-full" variant="outline">
                        Zavřít
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      {/* Modal for changing surname */}
      {showSurnameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="bg-card border-border w-full max-w-md mx-4 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-foreground">Změnit jmenovku</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="text-sm text-muted-foreground mb-2 block">Nová jmenovka</label>
                <input
                  type="text"
                  value={newSurname}
                  onChange={(e) => setNewSurname(e.target.value)}
                  className="w-full p-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground"
                  placeholder="Zadejte nové jméno na zvonek"
                />
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSurnameChange}
                    disabled={newSurname.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Uložit
                  </Button>
                  <Button
                    onClick={() => {
                      setShowSurnameModal(false)
                      setNewSurname("")
                    }}
                    className="flex-1"
                    variant="outline"
                  >
                    Zrušit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
        <Toaster />
    </div>
  )
}
