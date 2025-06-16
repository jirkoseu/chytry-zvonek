import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, type User, type LogEntry, type Settings } from "@/lib/api"

// Door status
export function useDoorStatus() {
  return useQuery({
    queryKey: ["door-status"],
    queryFn: () => apiClient.getDoorStatus(),
    refetchInterval: 5000, // Refresh every 5 seconds
  })
}

export function useToggleLock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.toggleLock(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["door-status"] })
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

export function useUnlockDoor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.unlockDoor(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["door-status"] })
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

export function useLockDoor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.lockDoor(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["door-status"] })
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

// Users
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.getUsers(),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (user: Omit<User, "id" | "createdAt" | "lastAccess">) => apiClient.createUser(user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<User> }) => apiClient.updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

// Logs
export function useLogs(filters?: { type?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["logs", filters],
    queryFn: () => apiClient.getLogs(filters),
  })
}

export function useCreateLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (log: Omit<LogEntry, "id" | "time">) => apiClient.createLog(log),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

// Settings
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiClient.getSettings(),
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Partial<Settings>) => apiClient.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

// Doorbell
export function useTriggerDoorbell() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.triggerDoorbell(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

// HomeKit
export function usePairHomeKit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.pairHomeKit(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

export function useUnpairHomeKit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.unpairHomeKit(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    },
  })
}

export function useGenerateHomeKitPin() {
  return useMutation({
    mutationFn: () => apiClient.generateHomeKitPin(),
  })
}

// Authentication
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => apiClient.login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
