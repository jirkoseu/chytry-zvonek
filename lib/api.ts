const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

export interface User {
  id: number
  name: string
  email: string
  role: "admin" | "user" | "guest"
  passcode: string
  isActive: boolean
  lastAccess: string
  createdAt: string
}

export interface LogEntry {
  id: number
  type: "unlock" | "lock" | "doorbell" | "settings" | "login" | "failed_attempt" | "user_added" | "user_removed"
  user: string
  time: string
  details?: string
  success: boolean
}

export interface DoorStatus {
  isLocked: boolean
  lastUpdated: string
  batteryLevel: number
  wifiStrength: number
  homeKitPaired: boolean
}

export interface Settings {
  autoLockDelay: number
  doorbellEnabled: boolean
  notificationsEnabled: boolean
  passcode: string
  homeKitPin: string
}

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  }

  async logout() {
    return this.request("/auth/logout", { method: "POST" })
  }

  // Door control
  async getDoorStatus(): Promise<DoorStatus> {
    return this.request<DoorStatus>("/door/status")
  }

  async toggleLock(): Promise<{ success: boolean; isLocked: boolean }> {
    return this.request("/door/toggle", { method: "POST" })
  }

  async unlockDoor(): Promise<{ success: boolean }> {
    return this.request("/door/unlock", { method: "POST" })
  }

  async lockDoor(): Promise<{ success: boolean }> {
    return this.request("/door/lock", { method: "POST" })
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.request<User[]>("/users")
  }

  async createUser(user: Omit<User, "id" | "createdAt" | "lastAccess">): Promise<User> {
    return this.request<User>("/users", {
      method: "POST",
      body: JSON.stringify(user),
    })
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    })
  }

  async deleteUser(id: number): Promise<{ success: boolean }> {
    return this.request(`/users/${id}`, { method: "DELETE" })
  }

  // Activity logs
  async getLogs(filters?: { type?: string; limit?: number; offset?: number }): Promise<LogEntry[]> {
    const params = new URLSearchParams()
    if (filters?.type) params.append("type", filters.type)
    if (filters?.limit) params.append("limit", filters.limit.toString())
    if (filters?.offset) params.append("offset", filters.offset.toString())

    const query = params.toString() ? `?${params.toString()}` : ""
    return this.request<LogEntry[]>(`/logs${query}`)
  }

  async createLog(log: Omit<LogEntry, "id" | "time">): Promise<LogEntry> {
    return this.request<LogEntry>("/logs", {
      method: "POST",
      body: JSON.stringify(log),
    })
  }

  // Settings
  async getSettings(): Promise<Settings> {
    return this.request<Settings>("/settings")
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    return this.request<Settings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    })
  }

  // Doorbell
  async triggerDoorbell(): Promise<{ success: boolean }> {
    return this.request("/doorbell/trigger", { method: "POST" })
  }

  // HomeKit
  async pairHomeKit(): Promise<{ success: boolean; pin: string }> {
    return this.request("/homekit/pair", { method: "POST" })
  }

  async unpairHomeKit(): Promise<{ success: boolean }> {
    return this.request("/homekit/unpair", { method: "POST" })
  }

  async generateHomeKitPin(): Promise<{ pin: string }> {
    return this.request("/homekit/generate-pin", { method: "POST" })
  }
}

export const apiClient = new ApiClient()
