"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Editor from "@monaco-editor/react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  X,
  Play,
  Trash2,
  Server,
  Settings,
  FileText,
  Search,
  GitBranch,
  Terminal,
  Palette,
  ChevronDown,
  Edit2,
  Code,
  BookOpen,
  Sparkles,
  Shield,
  User,
  LogOut,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Zap,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import type * as monaco from "monaco-editor"

interface Tab {
  id: string
  name: string
  content: string
  isRenaming?: boolean
}

interface ServerStatus {
  port: string
  status: string
  tcpPort: number
  injectorStatus: {
    injected: boolean
    injectedPID: number
    injectedAt: string
    features: Feature[]
  }
  hwid: {
    originalHWID: string
    currentHWID: string
    spoofed: boolean
  }
}

interface Feature {
  name: string
  description: string
  enabled: boolean
}

interface Theme {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    success: string
    warning: string
    error: string
    background: string
    surface: string
    border: string
    text: string
    textMuted: string
  }
  syntax: {
    keyword: string
    function: string
    string: string
    number: string
    comment: string
    variable: string
    type: string
    operator: string
  }
}

interface UserType {
  username: string
  email: string
  createdAt: string
  lastLogin: string
}

const themes: Record<string, Theme> = {
  emerald: {
    name: "Emerald",
    colors: {
      primary: "#10b981",
      secondary: "#059669",
      accent: "#34d399",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      background: "#0d1117",
      surface: "#161b22",
      border: "#21262d",
      text: "#e6edf3",
      textMuted: "#7d8590",
    },
    syntax: {
      keyword: "#10b981",
      function: "#34d399",
      string: "#6ee7b7",
      number: "#a7f3d0",
      comment: "#6b7280",
      variable: "#e6edf3",
      type: "#059669",
      operator: "#10b981",
    },
  },
  red: {
    name: "Red",
    colors: {
      primary: "#dc2626",
      secondary: "#b91c1c",
      accent: "#f87171",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      background: "#0a0505",
      surface: "#150a0a",
      border: "#2a1515",
      text: "#f5e6e6",
      textMuted: "#a78a8a",
    },
    syntax: {
      keyword: "#dc2626",
      function: "#f87171",
      string: "#fca5a5",
      number: "#fecaca",
      comment: "#6b7280",
      variable: "#f5e6e6",
      type: "#b91c1c",
      operator: "#dc2626",
    },
  },
  coffee: {
    name: "Coffee",
    colors: {
      primary: "#7c4a3a",
      secondary: "#5c3828",
      accent: "#9c6b5a",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      background: "#1a1310",
      surface: "#241c18",
      border: "#362a24",
      text: "#e6ddd8",
      textMuted: "#a89992",
    },
    syntax: {
      keyword: "#7c4a3a",
      function: "#9c6b5a",
      string: "#bc8c7a",
      number: "#dcac9a",
      comment: "#6b7280",
      variable: "#e6ddd8",
      type: "#5c3828",
      operator: "#7c4a3a",
    },
  },
  gold: {
    name: "Gold",
    colors: {
      primary: "#b59e30",
      secondary: "#957e20",
      accent: "#d5be50",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      background: "#171510",
      surface: "#211f18",
      border: "#312f28",
      text: "#e6e3d8",
      textMuted: "#a8a592",
    },
    syntax: {
      keyword: "#b59e30",
      function: "#d5be50",
      string: "#f5de70",
      number: "#f5ee90",
      comment: "#6b7280",
      variable: "#e6e3d8",
      type: "#957e20",
      operator: "#b59e30",
    },
  },
  pink: {
    name: "Pink",
    colors: {
      primary: "#ec4899",
      secondary: "#db2777",
      accent: "#f472b6",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      background: "#1a121a",
      surface: "#241824",
      border: "#362436",
      text: "#f5e1f5",
      textMuted: "#c8a8c8",
    },
    syntax: {
      keyword: "#ec4899",
      function: "#f472b6",
      string: "#f9a8d4",
      number: "#fbd5e8",
      comment: "#6b7280",
      variable: "#f5e1f5",
      type: "#db2777",
      operator: "#ec4899",
    },
  },
  navy: {
    name: "Navy",
    colors: {
      primary: "#1e40af",
      secondary: "#1e3a8a",
      accent: "#3b82f6",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      background: "#0a101f",
      surface: "#10182a",
      border: "#1a2540",
      text: "#e1e7f5",
      textMuted: "#a1b4d8",
    },
    syntax: {
      keyword: "#1e40af",
      function: "#3b82f6",
      string: "#60a5fa",
      number: "#93c5fd",
      comment: "#6b7280",
      variable: "#e1e7f5",
      type: "#1e3a8a",
      operator: "#1e40af",
    },
  },
  cyan: {
    name: "Cyan",
    colors: {
      primary: "#0891b2",
      secondary: "#0e7490",
      accent: "#06b6d4",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      background: "#0c1a1f",
      surface: "#12242a",
      border: "#1c3640",
      text: "#e1f5f9",
      textMuted: "#a1d8e2",
    },
    syntax: {
      keyword: "#0891b2",
      function: "#06b6d4",
      string: "#22d3ee",
      number: "#67e8f9",
      comment: "#6b7280",
      variable: "#e1f5f9",
      type: "#0e7490",
      operator: "#0891b2",
    },
  },
}

export default function LuaExecutor() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])
  const [showConsole, setShowConsole] = useState(true)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [tcpDialogOpen, setTcpDialogOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<string>("emerald")
  const [renamingTab, setRenamingTab] = useState<string | null>(null)
  const [tempTabName, setTempTabName] = useState<string>("")
  const [showFeatures, setShowFeatures] = useState(true)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [injectDialogOpen, setInjectDialogOpen] = useState(false)
  const [processName, setProcessName] = useState("")
  const [hwidDialogOpen, setHwidDialogOpen] = useState(false)
  const [customHWID, setCustomHWID] = useState("")
  const [dashboardOpen, setDashboardOpen] = useState(false)

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptTOS, setAcceptTOS] = useState(false)
  const [formError, setFormError] = useState("")

  const wsRef = useRef<WebSocket | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<any>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  const theme = themes[currentTheme]

  const fetchPortStatus = async (retryCount = 0, maxRetries = 3) => {
    if (retryCount > 0) {
      setLogs((prev) => [...prev, `[System] Retry attempt ${retryCount}/${maxRetries} to connect to server...`])
    }

    try {
      setConnecting(true)

      const ports = [8080, 8081, 8082, 8083, 8084]
      const port = ports[retryCount % ports.length]

      setLogs((prev) => [...prev, `[System] Trying to connect to port ${port}...`])

      const response = await fetch(`http://localhost:${port}/port-status`, {
        signal: AbortSignal.timeout(2000),
      })

      if (response.ok) {
        const data = await response.json()
        setServerStatus(data)
        setLogs((prev) => [
          ...prev,
          `[System] Found server on port ${data.port}`,
          `[System] TCP server available on port ${data.tcpPort}`,
        ])
        connectWebSocket(data.port)
        return true
      }
      throw new Error(`Server responded with status: ${response.status}`)
    } catch (error) {
      console.error("Failed to fetch port status:", error)

      if (retryCount < maxRetries) {
        setLogs((prev) => [...prev, `[System] Connection failed. Retrying in 2 seconds...`])

        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
        }

        retryTimeoutRef.current = setTimeout(() => {
          fetchPortStatus(retryCount + 1, maxRetries)
        }, 2000)

        return false
      } else {
        setLogs((prev) => [...prev, `[System] Failed to connect after ${maxRetries} attempts. Server is not running.`])
        setConnecting(false)
        return false
      }
    }
  }

  const connectWebSocket = (port: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }

    setLogs((prev) => [...prev, `[System] Connecting to WebSocket on port ${port}...`])

    const ws = new WebSocket(`ws://localhost:${port}/ws`)

    ws.onopen = () => {
      setConnected(true)
      setConnecting(false)
      setLogs((prev) => [
        ...prev,
        `[System] Successfully connected to WebSocket on port ${port}`,
        `[System] Connection details:`,
        `[System] - WebSocket URL: ws://localhost:${port}/ws`,
        `[System] - HTTP API URL: http://localhost:${port}`,
        `[System] - TCP Server: localhost:${serverStatus?.tcpPort || 9000}`,
      ])
    }

    ws.onmessage = (event) => {
      const message = event.data
      setLogs((prev) => [...prev, message])
    }

    ws.onclose = () => {
      setConnected(false)
      setLogs((prev) => [...prev, `[System] Disconnected from WebSocket`])
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
      setLogs((prev) => [...prev, `[System] WebSocket connection error`])
      setConnecting(false)
    }

    wsRef.current = ws
  }

  useEffect(() => {
    const savedTabs = localStorage.getItem("canda-executor-tabs")
    const savedActiveTab = localStorage.getItem("canda-executor-active-tab")
    const savedTheme = localStorage.getItem("canda-executor-theme")
    const savedToken = localStorage.getItem("canda-auth-token")
    const savedUser = localStorage.getItem("canda-user")

    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs)
        setTabs(parsedTabs)
      } catch (error) {
        console.error("Failed to parse saved tabs:", error)
      }
    }

    if (savedActiveTab) {
      setActiveTab(savedActiveTab)
    }

    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme)
    }

    if (savedToken) {
      setAuthToken(savedToken)
    }

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setCurrentUser(parsedUser)
      } catch (error) {
        console.error("Failed to parse saved user:", error)
      }
    }

    setLogs([
      `[System] Canda Lua Executor initialized`,
      `[System] Theme: ${themes[savedTheme || "emerald"].name}`,
      `[System] Attempting to connect to backend server...`,
    ])

    fetchPortStatus()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem("canda-executor-tabs", JSON.stringify(tabs))
    }
  }, [tabs])

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem("canda-executor-active-tab", activeTab)
    }
  }, [activeTab])

  useEffect(() => {
    localStorage.setItem("canda-executor-theme", currentTheme)
  }, [currentTheme])

  useEffect(() => {
    if (authToken) {
      localStorage.setItem("canda-auth-token", authToken)
    } else {
      localStorage.removeItem("canda-auth-token")
    }
  }, [authToken])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("canda-user", JSON.stringify(currentUser))
    } else {
      localStorage.removeItem("canda-user")
    }
  }, [currentUser])

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  useEffect(() => {
    if (renamingTab && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingTab])

  const defineTheme = (monacoInstance: typeof monaco, themeName: string) => {
    const themeData = themes[themeName]

    monacoInstance.editor.defineTheme(`canda-${themeName}`, {
      base: "vs-dark",
      inherit: false,
      rules: [
        { token: "", foreground: themeData.syntax.variable.replace("#", "") },
        { token: "keyword", foreground: themeData.syntax.keyword.replace("#", ""), fontStyle: "bold" },
        { token: "number", foreground: themeData.syntax.number.replace("#", "") },
        { token: "string", foreground: themeData.syntax.string.replace("#", "") },
        { token: "comment", foreground: themeData.syntax.comment.replace("#", "") },
        { token: "operator", foreground: themeData.syntax.operator.replace("#", "") },
        { token: "function", foreground: themeData.syntax.function.replace("#", ""), fontStyle: "bold" },
        { token: "variable", foreground: themeData.syntax.variable.replace("#", "") },
        { token: "type", foreground: themeData.syntax.type.replace("#", "") },
        { token: "delimiter", foreground: themeData.syntax.operator.replace("#", "") },
        { token: "identifier", foreground: themeData.syntax.variable.replace("#", "") },
      ],
      colors: {
        "editor.background": themeData.colors.background,
        "editor.foreground": themeData.colors.text,
        "editorLineNumber.foreground": themeData.colors.textMuted,
        "editorLineNumber.activeForeground": themeData.colors.text,
        "editorCursor.foreground": themeData.colors.primary,
        "editor.selectionBackground": themeData.colors.primary + "40",
        "editor.selectionHighlightBackground": themeData.colors.accent + "26",
        "editorSuggestWidget.background": themeData.colors.surface,
        "editorSuggestWidget.border": themeData.colors.border,
        "editorSuggestWidget.foreground": themeData.colors.text,
        "editorSuggestWidget.selectedBackground": themeData.colors.primary + "80",
        "editorWidget.background": themeData.colors.surface,
        "editorWidget.border": themeData.colors.border,
        "editor.lineHighlightBackground": themeData.colors.surface + "40",
        "scrollbarSlider.background": themeData.colors.border + "66",
        "scrollbarSlider.hoverBackground": themeData.colors.border + "b3",
        "minimap.background": themeData.colors.background,
        "minimapSlider.background": themeData.colors.border + "66",
        "minimapSlider.hoverBackground": themeData.colors.border + "b3",
        "editorGutter.background": themeData.colors.background,
        "editor.wordHighlightBackground": themeData.colors.primary + "40",
        "editor.wordHighlightStrongBackground": themeData.colors.primary + "60",
        "editorBracketMatch.background": themeData.colors.accent + "50",
        "editorOverviewRuler.background": themeData.colors.background,
        "editorOverviewRuler.border": themeData.colors.border,
        "editorRuler.foreground": themeData.colors.border,
        "editorCodeLens.foreground": themeData.colors.textMuted,
        "editorBracketMatch.border": themeData.colors.accent,
        "editor.findMatchBackground": themeData.colors.primary + "60",
        "editor.findMatchHighlightBackground": themeData.colors.primary + "30",
        "editor.findRangeHighlightBackground": themeData.colors.primary + "20",
        "editorHoverWidget.background": themeData.colors.surface,
        "editorHoverWidget.border": themeData.colors.border,
        "editorHoverWidget.foreground": themeData.colors.text,
        "editorGroupHeader.tabsBackground": themeData.colors.surface,
        "tab.activeBackground": themeData.colors.background,
        "tab.inactiveBackground": themeData.colors.surface,
        "tab.activeForeground": themeData.colors.text,
        "tab.inactiveForeground": themeData.colors.textMuted,
        "tab.border": themeData.colors.border,
        "editorGroup.border": themeData.colors.border,
        "panel.background": themeData.colors.background,
        "panel.border": themeData.colors.border,
        "panelTitle.activeBorder": themeData.colors.primary,
        "panelTitle.activeForeground": themeData.colors.text,
        "panelTitle.inactiveForeground": themeData.colors.textMuted,
        "terminal.background": themeData.colors.background,
        "terminal.foreground": themeData.colors.text,
      },
    })

    monacoInstance.editor.setTheme(`canda-${themeName}`)
  }

  const handleThemeChange = (newTheme: string) => {
    setCurrentTheme(newTheme)

    setTimeout(() => {
      if (editorRef.current) {
        const monaco = editorRef.current.getMonaco()
        defineTheme(monaco, newTheme)
        editorRef.current.updateOptions({ theme: `canda-${newTheme}` })
      }
    }, 100)

    setLogs((prev) => [...prev, `[System] Theme changed to: ${themes[newTheme].name}`])
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return
    setTabs((prevTabs) => prevTabs.map((tab) => (tab.id === activeTab ? { ...tab, content: value } : tab)))
  }

  const addTab = () => {
    const newTab = {
      id: Date.now().toString(),
      name: `script-${tabs.length + 1}.lua`,
      content: '-- print("Hello from Canda!")\n\n',
    }
    setTabs([...tabs, newTab])
    setActiveTab(newTab.id)
  }

  const removeTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (tabs.length === 1) {
      setTabs([])
      setActiveTab("")
      localStorage.removeItem("canda-executor-tabs")
      localStorage.removeItem("canda-executor-active-tab")
      return
    }
    const idx = tabs.findIndex((tab) => tab.id === tabId)
    const newTabs = tabs.filter((tab) => tab.id !== tabId)
    setTabs(newTabs)
    if (activeTab === tabId) {
      const newActive = newTabs[idx] || newTabs[idx - 1] || newTabs[0]
      setActiveTab(newActive.id)
    }
  }

  const startRenaming = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const tab = tabs.find((t) => t.id === tabId)
    if (tab) {
      setRenamingTab(tabId)
      setTempTabName(tab.name)
    }
  }

  const finishRenaming = () => {
    if (renamingTab && tempTabName.trim()) {
      setTabs((prevTabs) =>
        prevTabs.map((tab) => (tab.id === renamingTab ? { ...tab, name: tempTabName.trim() } : tab)),
      )
    }
    setRenamingTab(null)
    setTempTabName("")
  }

  const cancelRenaming = () => {
    setRenamingTab(null)
    setTempTabName("")
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      finishRenaming()
    } else if (e.key === "Escape") {
      cancelRenaming()
    }
  }

  const clearScript = () => {
    setTabs(tabs.map((tab) => (tab.id === activeTab ? { ...tab, content: "" } : tab)))
  }

  const clearLogs = () => {
    setLogs([])
  }

  const executeScript = async () => {
    const currentScript = tabs.find((tab) => tab.id === activeTab)?.content
    if (!currentScript) return

    if (!authToken) {
      setLogs((prev) => [...prev, `[Error] Authentication required. Please log in to execute scripts.`])
      setAuthDialogOpen(true)
      return
    }

    if (!serverStatus?.port) {
      setLogs((prev) => [...prev, `[Error] Server not connected. Cannot execute script.`])
      return
    }

    try {
      setLogs((prev) => [...prev, `[System] Executing script...`])

      const response = await fetch(`http://localhost:${serverStatus.port}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify({ script: currentScript }),
      })

      if (response.status === 401) {
        setLogs((prev) => [...prev, `[Error] Authentication failed. Please log in again.`])
        setAuthToken(null)
        setCurrentUser(null)
        setAuthDialogOpen(true)
        return
      }

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const result = await response.json()
      if (result.error) {
        setLogs((prev) => [...prev, `[Error] ${result.error}`])
      } else {
        setLogs((prev) => [...prev, `[Execution] ${result.output || "Script executed successfully"}`])
      }
    } catch (error) {
      setLogs((prev) => [...prev, `[Error] ${error instanceof Error ? error.message : "Unknown error"}`])
    }
  }

  const reconnectWebSocket = async () => {
    setLogs((prev) => [
      ...prev,
      `[System] ===== Connection Attempt Started =====`,
      `[System] Attempting to reconnect to server...`,
      `[System] Checking available ports...`,
    ])
    fetchPortStatus()
  }

  const showTcpConnectionInfo = () => {
    setTcpDialogOpen(true)
  }

  const handleLogin = async () => {
    setFormError("")

    if (!username || !password) {
      setFormError("Please fill in all required fields")
      return
    }

    try {
      const response = await fetch(`http://localhost:${serverStatus?.port}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!data.success) {
        setFormError(data.message)
        return
      }

      setAuthToken(data.token)
      setCurrentUser(data.user)
      setAuthDialogOpen(false)
      setLogs((prev) => [...prev, `[System] Logged in as ${data.user.username}`])

      setUsername("")
      setPassword("")
    } catch (error) {
      setFormError("Failed to connect to authentication server")
    }
  }

  const handleRegister = async () => {
    setFormError("")

    if (!username || !email || !password || !confirmPassword) {
      setFormError("Please fill in all required fields")
      return
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match")
      return
    }

    if (!acceptTOS) {
      setFormError("You must accept the Terms of Service")
      return
    }

    try {
      const response = await fetch(`http://localhost:${serverStatus?.port}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password, confirmPassword, acceptTOS }),
      })

      const data = await response.json()

      if (!data.success) {
        setFormError(data.message)
        return
      }

      setAuthToken(data.token)
      setCurrentUser(data.user)
      setAuthDialogOpen(false)
      setLogs((prev) => [...prev, `[System] Registered and logged in as ${data.user.username}`])

      setUsername("")
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setAcceptTOS(false)
    } catch (error) {
      setFormError("Failed to connect to authentication server")
    }
  }

  const handleLogout = () => {
    setAuthToken(null)
    setCurrentUser(null)
    setProfileMenuOpen(false)
    setLogs((prev) => [...prev, `[System] Logged out successfully`])
  }

  const handleInject = async () => {
    if (!processName) {
      setLogs((prev) => [...prev, `[Error] Please enter a process name`])
      return
    }

    if (!authToken) {
      setLogs((prev) => [...prev, `[Error] Authentication required. Please log in to inject.`])
      setAuthDialogOpen(true)
      return
    }

    try {
      const response = await fetch(`http://localhost:${serverStatus?.port}/inject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify({ processName }),
      })

      if (response.status === 401) {
        setLogs((prev) => [...prev, `[Error] Authentication failed. Please log in again.`])
        setAuthToken(null)
        setCurrentUser(null)
        setAuthDialogOpen(true)
        return
      }

      const data = await response.json()

      if (!data.success) {
        setLogs((prev) => [...prev, `[Error] ${data.message}`])
        return
      }

      setLogs((prev) => [...prev, `[System] ${data.message}`])
      setInjectDialogOpen(false)

      fetchPortStatus()
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        `[Error] Failed to inject: ${error instanceof Error ? error.message : "Unknown error"}`,
      ])
    }
  }

  const handleSpoofHWID = async () => {
    if (!authToken) {
      setLogs((prev) => [...prev, `[Error] Authentication required. Please log in to spoof HWID.`])
      setAuthDialogOpen(true)
      return
    }

    try {
      const response = await fetch(`http://localhost:${serverStatus?.port}/spoof-hwid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify({ customHWID }),
      })

      if (response.status === 401) {
        setLogs((prev) => [...prev, `[Error] Authentication failed. Please log in again.`])
        setAuthToken(null)
        setCurrentUser(null)
        setAuthDialogOpen(true)
        return
      }

      const data = await response.json()

      if (!data.success) {
        setLogs((prev) => [...prev, `[Error] ${data.message}`])
        return
      }

      setLogs((prev) => [
        ...prev,
        `[System] ${data.message}`,
        `[System] Original HWID: ${data.originalHWID}`,
        `[System] New HWID: ${data.currentHWID}`,
      ])
      setHwidDialogOpen(false)

      fetchPortStatus()
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        `[Error] Failed to spoof HWID: ${error instanceof Error ? error.message : "Unknown error"}`,
      ])
    }
  }

  const toggleFeature = async (featureName: string, enabled: boolean) => {
    if (!authToken) {
      setLogs((prev) => [...prev, `[Error] Authentication required. Please log in to toggle features.`])
      setAuthDialogOpen(true)
      return
    }

    try {
      const response = await fetch(`http://localhost:${serverStatus?.port}/features`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify({ name: featureName, enabled }),
      })

      if (response.status === 401) {
        setLogs((prev) => [...prev, `[Error] Authentication failed. Please log in again.`])
        setAuthToken(null)
        setCurrentUser(null)
        setAuthDialogOpen(true)
        return
      }

      const data = await response.json()

      if (!data.success) {
        setLogs((prev) => [...prev, `[Error] ${data.message}`])
        return
      }

      setLogs((prev) => [...prev, `[System] ${data.message}`])

      fetchPortStatus()
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        `[Error] Failed to toggle feature: ${error instanceof Error ? error.message : "Unknown error"}`,
      ])
    }
  }

  const WelcomeScreen = () => (
    <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
      <div className="text-center max-w-2xl px-8">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mr-4"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Sparkles size={32} className="text-white" />
            </div>
            <h1
              ref={titleRef}
              className="text-4xl font-bold transition-colors duration-1000"
              style={{
                color: theme.colors.primary,
                animation: "colorFade 8s infinite",
              }}
            >
              Welcome to Project Canda
            </h1>
            <style jsx>{`
              @keyframes colorFade {
                0%, 100% { color: ${themes.emerald.colors.primary}; }
                16.6% { color: ${themes.red.colors.primary}; }
                33.2% { color: ${themes.coffee.colors.primary}; }
                49.8% { color: ${themes.gold.colors.primary}; }
                66.4% { color: ${themes.pink.colors.primary}; }
                83% { color: ${themes.navy.colors.primary}; }
              }
            `}</style>
          </div>

          <div className="mb-8 space-y-4">
            <p className="text-lg" style={{ color: theme.colors.textMuted }}>
              This is the web executor for Project Canda. A powerful Lua script execution environment that runs directly
              in your browser.
            </p>

            <p className="text-base" style={{ color: theme.colors.textMuted }}>
              To read more about it, check out our{" "}
              <Link
                href="/documentation"
                className="font-semibold hover:underline transition-colors"
                style={{ color: theme.colors.primary }}
              >
                <BookOpen size={16} className="inline mr-1" />
                Documentation
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={addTab}
              size="lg"
              className="text-white font-semibold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Code size={20} className="mr-2" />
              Click here to create a new tab
            </Button>

            <div className="flex items-center justify-center gap-4 text-sm" style={{ color: theme.colors.textMuted }}>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-yellow-400"}`}></div>
                <span>{connected ? "Server Connected" : "Connecting..."}</span>
              </div>
              <div className="flex items-center gap-1">
                <Palette size={12} />
                <span>{theme.name} Theme</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="border rounded-lg p-6 text-left"
          style={{
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        >
          <h3 className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>
            Quick Start Guide:
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: theme.colors.textMuted }}>
            <li>• Create a new tab to start writing Lua scripts</li>
            <li>• Use the Run button to execute your code</li>
            <li>• Check the console for output and errors</li>
            <li>• Switch themes using the theme selector</li>
            <li>• Double-click tab names to rename them</li>
            <li>• Your work is automatically saved</li>
          </ul>
        </div>
      </div>
    </div>
  )

  const FeaturesPanel = () => {
    if (!serverStatus?.injectorStatus?.features || serverStatus.injectorStatus.features.length === 0) {
      return (
        <div className="p-4 text-center" style={{ color: theme.colors.textMuted }}>
          <Shield size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No features available</p>
          <p className="text-xs mt-1">Inject into a process first</p>
          <Button
            onClick={() => setInjectDialogOpen(true)}
            className="mt-4 text-white"
            style={{ backgroundColor: theme.colors.primary }}
            size="sm"
          >
            <Zap size={14} className="mr-1" />
            Inject Now
          </Button>
        </div>
      )
    }

    const hwid = serverStatus.injectorStatus.features.find((f) => f.name === "hwid_spoofer")

    return (
      <div className="p-2 space-y-2">
        {hwid && (
          <div
            className="flex items-center justify-between p-2 rounded-md"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <div>
              <div className="font-medium text-sm" style={{ color: theme.colors.text }}>
                HWID Spoofer
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {hwid.description}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setHwidDialogOpen(true)}
                style={{ color: theme.colors.primary }}
              >
                Configure
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => toggleFeature("hwid_spoofer", !hwid.enabled)}
                style={{ color: hwid.enabled ? theme.colors.success : theme.colors.textMuted }}
              >
                {hwid.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </Button>
            </div>
          </div>
        )}

        {serverStatus.injectorStatus.features
          .filter((feature) => feature.name !== "hwid_spoofer")
          .map((feature) => (
            <div
              key={feature.name}
              className="flex items-center justify-between p-2 rounded-md"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <div>
                <div className="font-medium text-sm" style={{ color: theme.colors.text }}>
                  {feature.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </div>
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                  {feature.description}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => toggleFeature(feature.name, !feature.enabled)}
                style={{ color: feature.enabled ? theme.colors.success : theme.colors.textMuted }}
              >
                {feature.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </Button>
            </div>
          ))}
      </div>
    )
  }

  const Dashboard = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: theme.colors.text }}>
          User Dashboard
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDashboardOpen(false)}
          className="h-8 px-2"
          style={{ color: theme.colors.textMuted }}
        >
          <X size={16} />
        </Button>
      </div>

      <div
        className="p-4 rounded-md border"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <h3 className="text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
          Account Information
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              Username
            </span>
            <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
              {currentUser?.username}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              Email
            </span>
            <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
              {currentUser?.email}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              Account Created
            </span>
            <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
              {new Date(currentUser?.createdAt || "").toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              Last Login
            </span>
            <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
              {new Date(currentUser?.lastLogin || "").toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div
        className="p-4 rounded-md border"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <h3 className="text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
          System Status
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              Connection Status
            </span>
            <span
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: connected ? theme.colors.success : theme.colors.error }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: connected ? theme.colors.success : theme.colors.error }}
              ></div>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              HTTP Port
            </span>
            <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
              {serverStatus?.port || "N/A"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              TCP Port
            </span>
            <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
              {serverStatus?.tcpPort || "N/A"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              Injection Status
            </span>
            <span
              className="text-xs font-medium"
              style={{
                color: serverStatus?.injectorStatus?.injected ? theme.colors.success : theme.colors.textMuted,
              }}
            >
              {serverStatus?.injectorStatus?.injected
                ? `Injected (PID: ${serverStatus.injectorStatus.injectedPID})`
                : "Not Injected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              HWID Status
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: serverStatus?.hwid?.spoofed ? theme.colors.success : theme.colors.textMuted }}
            >
              {serverStatus?.hwid?.spoofed ? "Spoofed" : "Original"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-xs"
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.error,
          }}
        >
          <LogOut size={14} className="mr-1" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <div
      className="flex flex-col h-screen w-screen font-mono"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
      }}
    >
      <div
        className="flex items-center justify-between h-8 border-b px-4"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#28ca42]"></div>
          </div>
        </div>
        <div className="text-sm" style={{ color: theme.colors.text }}>
          Canda Lua Executor - {theme.name} Theme
        </div>
        <div className="flex items-center gap-2">
          <div
            className="text-white px-3 py-1 rounded-md text-xs font-medium"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {serverStatus?.injectorStatus?.injected ? "Injected" : "Not Injected"}
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              style={{ backgroundColor: theme.colors.primary }}
            >
              <span className="text-xs text-white">
                {currentUser ? currentUser.username.charAt(0).toUpperCase() : "👤"}
              </span>
            </Button>
            {profileMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-48 rounded-md shadow-lg z-50 border"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }}
              >
                <div className="py-1">
                  {currentUser ? (
                    <>
                      <div
                        className="px-4 py-2 text-sm border-b"
                        style={{
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <div className="font-medium">{currentUser.username}</div>
                        <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                          {currentUser.email}
                        </div>
                      </div>
                      <button
                        className="flex w-full items-center px-4 py-2 text-sm hover:opacity-80"
                        style={{ color: theme.colors.text }}
                        onClick={() => {
                          setProfileMenuOpen(false)
                          setDashboardOpen(true)
                        }}
                      >
                        <User size={14} className="mr-2" />
                        Dashboard
                      </button>
                      <button
                        className="flex w-full items-center px-4 py-2 text-sm hover:opacity-80"
                        style={{ color: theme.colors.text }}
                        onClick={() => {
                          setProfileMenuOpen(false)
                          setInjectDialogOpen(true)
                        }}
                      >
                        <Zap size={14} className="mr-2" />
                        Inject
                      </button>
                      <button
                        className="flex w-full items-center px-4 py-2 text-sm hover:opacity-80"
                        style={{ color: theme.colors.text }}
                        onClick={() => {
                          setProfileMenuOpen(false)
                          setHwidDialogOpen(true)
                        }}
                      >
                        <Shield size={14} className="mr-2" />
                        Spoof HWID
                      </button>
                      <button
                        className="flex w-full items-center px-4 py-2 text-sm hover:opacity-80 border-t"
                        style={{ color: theme.colors.error, borderColor: theme.colors.border }}
                        onClick={handleLogout}
                      >
                        <LogOut size={14} className="mr-2" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <button
                      className="flex w-full items-center px-4 py-2 text-sm hover:opacity-80"
                      style={{ color: theme.colors.text }}
                      onClick={() => {
                        setProfileMenuOpen(false)
                        setAuthDialogOpen(true)
                      }}
                    >
                      <Lock size={14} className="mr-2" />
                      Login / Register
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {tabs.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="flex flex-col flex-1" style={{ borderRight: `1px solid ${theme.colors.border}` }}>
            <div
              className="flex items-center border-b h-9"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <Tabs value={activeTab} className="flex-1" onValueChange={setActiveTab}>
                <div className="flex items-center h-full">
                  <TabsList className="bg-transparent h-full rounded-none space-x-0">
                    {tabs.map((tab) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="flex items-center gap-2 px-4 h-full rounded-none border-r bg-transparent data-[state=active]:text-white hover:opacity-80 group"
                        style={{
                          borderColor: theme.colors.border,
                          backgroundColor: activeTab === tab.id ? theme.colors.background : "transparent",
                          color: activeTab === tab.id ? theme.colors.text : theme.colors.textMuted,
                        }}
                      >
                        <FileText size={14} />
                        {renamingTab === tab.id ? (
                          <Input
                            ref={renameInputRef}
                            value={tempTabName}
                            onChange={(e) => setTempTabName(e.target.value)}
                            onBlur={finishRenaming}
                            onKeyDown={handleRenameKeyDown}
                            className="h-6 w-24 px-1 text-xs border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
                            style={{ color: theme.colors.text }}
                          />
                        ) : (
                          <span onDoubleClick={(e) => startRenaming(tab.id, e)} className="cursor-pointer">
                            {tab.name}
                          </span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {renamingTab !== tab.id && (
                            <Edit2
                              size={12}
                              className="hover:text-blue-400 transition-colors"
                              onClick={(e) => startRenaming(tab.id, e)}
                            />
                          )}
                          <X
                            size={14}
                            className="hover:text-red-400 transition-colors"
                            onClick={(e) => removeTab(tab.id, e)}
                          />
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <Button
                    onClick={addTab}
                    variant="ghost"
                    size="sm"
                    className="h-full rounded-none px-3 hover:opacity-80"
                    style={{ color: theme.colors.textMuted }}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </Tabs>
            </div>

            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="lua"
                theme={`canda-${currentTheme}`}
                value={tabs.find((tab) => tab.id === activeTab)?.content || ""}
                onChange={handleEditorChange}
                onMount={(editor, monacoInstance) => {
                  editorRef.current = editor
                  defineTheme(monacoInstance, currentTheme)
                }}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                  cursorSmoothCaretAnimation: "on",
                  smoothScrolling: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: "on",
                  renderWhitespace: "selection",
                  wordWrap: "off",
                  folding: true,
                  lineDecorationsWidth: 10,
                  lineNumbersMinChars: 3,
                  glyphMargin: false,
                  theme: `canda-${currentTheme}`,
                }}
              />
            </div>

            <div
              className="flex items-center justify-between h-6 px-4 text-white text-xs"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <GitBranch size={12} />
                  <span>main</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-yellow-400"}`}></div>
                  <span>{connected ? "Connected" : "Connecting..."}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Palette size={12} />
                  <span>{theme.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={connected ? executeScript : reconnectWebSocket}
                  className="h-5 px-2 text-xs hover:bg-white/20 text-white"
                  disabled={!activeTab}
                >
                  <Play size={12} className="mr-1" />
                  {connected ? "Execute" : "Attach"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearScript}
                  className="h-5 px-2 text-xs hover:bg-white/20 text-white"
                  disabled={!activeTab}
                >
                  <Trash2 size={12} className="mr-1" />
                  Clear
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 px-2 text-xs hover:bg-white/20 text-white">
                      <Palette size={12} className="mr-1" />
                      Theme
                      <ChevronDown size={10} className="ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-40"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    {Object.entries(themes).map(([key, themeData]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handleThemeChange(key)}
                        className="flex items-center gap-2 hover:opacity-80"
                        style={{
                          backgroundColor: currentTheme === key ? theme.colors.primary + "20" : "transparent",
                        }}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeData.colors.primary }} />
                        {themeData.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={showTcpConnectionInfo}
                  className="h-5 px-2 text-xs hover:bg-white/20 text-white"
                >
                  <Server size={12} className="mr-1" />
                  TCP
                </Button>
                <div className="flex items-center gap-2">
                  <Settings size={12} />
                  <Search size={12} />
                  <Terminal size={12} />
                </div>
              </div>
            </div>
          </div>
        )}

        {showFeatures && (
          <div className="w-64 flex flex-col border-l" style={{ borderColor: theme.colors.border }}>
            <div
              className="flex items-center justify-between h-9 border-b px-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <div className="flex items-center gap-2">
                <Shield size={14} />
                <span className="text-sm">Features</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFeatures(false)}
                  className="h-6 px-1 text-xs hover:opacity-80"
                  style={{ color: theme.colors.textMuted }}
                >
                  <ChevronRight size={12} />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto" style={{ backgroundColor: theme.colors.background }}>
              <FeaturesPanel />
            </div>
          </div>
        )}

        {showConsole && (
          <div className="w-80 flex flex-col border-l" style={{ borderColor: theme.colors.border }}>
            <div
              className="flex items-center justify-between h-9 border-b px-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <div className="flex items-center gap-2">
                <Terminal size={14} />
                <span className="text-sm">Console</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-yellow-400"}`}></div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLogs}
                  className="h-6 px-2 text-xs hover:opacity-80"
                  style={{ color: theme.colors.textMuted }}
                >
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConsole(false)}
                  className="h-6 px-1 text-xs hover:opacity-80"
                  style={{ color: theme.colors.textMuted }}
                >
                  <X size={12} />
                </Button>
              </div>
            </div>

            <div className="flex-1 p-3 overflow-auto text-sm" style={{ backgroundColor: theme.colors.background }}>
              {logs.length === 0 ? (
                <div className="italic" style={{ color: theme.colors.textMuted }}>
                  No output
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="py-0.5 leading-relaxed">
                    {log.startsWith("[Error]") ? (
                      <span style={{ color: theme.colors.error }}>{log}</span>
                    ) : log.startsWith("[Execution]") ? (
                      <span style={{ color: theme.colors.success }}>{log}</span>
                    ) : log.startsWith("[System]") ? (
                      <span style={{ color: theme.colors.primary }}>{log}</span>
                    ) : log.startsWith("[TCP]") ? (
                      <span style={{ color: theme.colors.accent }}>{log}</span>
                    ) : (
                      <span style={{ color: theme.colors.text }}>{log}</span>
                    )}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        )}

        {dashboardOpen && (
          <div className="w-80 flex flex-col border-l" style={{ borderColor: theme.colors.border }}>
            <Dashboard />
          </div>
        )}
      </div>

      <Dialog open={tcpDialogOpen} onOpenChange={setTcpDialogOpen}>
        <DialogContent
          className="border"
          style={{
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: theme.colors.text }}>TCP Connection Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium" style={{ color: theme.colors.text }}>
                Connection Details
              </h3>
              <div
                className="p-3 rounded-md border"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                }}
              >
                <p className="text-sm">
                  Host: <span style={{ color: theme.colors.primary }}>localhost</span>
                </p>
                <p className="text-sm">
                  Port: <span style={{ color: theme.colors.primary }}>{serverStatus?.tcpPort || 9000}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium" style={{ color: theme.colors.text }}>
                Connect using command line
              </h3>
              <div
                className="p-3 rounded-md font-mono text-sm border"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                }}
              >
                <p style={{ color: theme.colors.accent }}>nc localhost {serverStatus?.tcpPort || 9000}</p>
                <p className="mt-2" style={{ color: theme.colors.accent }}>
                  telnet localhost {serverStatus?.tcpPort || 9000}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium" style={{ color: theme.colors.text }}>
                Execute Lua via TCP
              </h3>
              <div
                className="p-3 rounded-md font-mono text-sm border"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                }}
              >
                <p style={{ color: theme.colors.accent }}>EXEC:print("Hello from TCP")</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent
          className="border"
          style={{
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: theme.colors.text }}>
              {isLogin ? "Login to Canda" : "Create an Account"}
            </DialogTitle>
            <DialogDescription style={{ color: theme.colors.textMuted }}>
              {isLogin ? "Enter your credentials to access all features" : "Sign up for a new account to get started"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {formError && (
              <Alert
                className="py-2"
                style={{
                  backgroundColor: theme.colors.error + "20",
                  borderColor: theme.colors.error,
                }}
              >
                <AlertDescription style={{ color: theme.colors.error }}>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-2 top-2.5 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                <Input
                  id="username"
                  placeholder="Enter your username"
                  className="pl-8"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-2.5 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-8"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-2 top-2.5 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-8 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-10 px-3"
                  style={{ color: theme.colors.textMuted }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 top-2.5 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="pl-8"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptTOS}
                    onCheckedChange={(checked) => setAcceptTOS(checked === true)}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none cursor-pointer"
                    style={{ color: theme.colors.text }}
                  >
                    I accept the{" "}
                    <span className="underline" style={{ color: theme.colors.primary }}>
                      Terms of Service
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:space-x-0">
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              style={{ color: theme.colors.primary }}
              className="mb-2 sm:mb-0"
            >
              {isLogin ? "Create an account" : "Already have an account?"}
            </Button>
            <Button
              onClick={isLogin ? handleLogin : handleRegister}
              className="text-white"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {isLogin ? "Login" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={injectDialogOpen} onOpenChange={setInjectDialogOpen}>
        <DialogContent
          className="border"
          style={{
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: theme.colors.text }}>Inject into Process</DialogTitle>
            <DialogDescription style={{ color: theme.colors.textMuted }}>
              Enter the name of the process to inject into
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="processName">Process Name</Label>
              <Input
                id="processName"
                placeholder="e.g. Finder"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
              />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                Note: This will only work on macOS and requires appropriate permissions
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInjectDialogOpen(false)}
              style={{
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleInject} className="text-white" style={{ backgroundColor: theme.colors.primary }}>
              <Zap size={16} className="mr-2" />
              Inject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hwidDialogOpen} onOpenChange={setHwidDialogOpen}>
        <DialogContent
          className="border"
          style={{
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: theme.colors.text }}>Spoof Hardware ID</DialogTitle>
            <DialogDescription style={{ color: theme.colors.textMuted }}>
              Change your hardware ID to prevent detection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {serverStatus?.hwid && (
              <div
                className="p-3 rounded-md border text-sm"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                }}
              >
                <div className="flex justify-between mb-2">
                  <span style={{ color: theme.colors.textMuted }}>Current Status:</span>
                  <span
                    style={{
                      color: serverStatus.hwid.spoofed ? theme.colors.success : theme.colors.textMuted,
                    }}
                  >
                    {serverStatus.hwid.spoofed ? "Spoofed" : "Original"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col">
                    <span style={{ color: theme.colors.textMuted }}>Original HWID:</span>
                    <span className="font-mono text-xs break-all" style={{ color: theme.colors.text }}>
                      {serverStatus.hwid.originalHWID}
                    </span>
                  </div>
                  {serverStatus.hwid.spoofed && (
                    <div className="flex flex-col mt-2">
                      <span style={{ color: theme.colors.textMuted }}>Current HWID:</span>
                      <span className="font-mono text-xs break-all" style={{ color: theme.colors.success }}>
                        {serverStatus.hwid.currentHWID}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customHWID">Custom HWID (Optional)</Label>
              <Input
                id="customHWID"
                placeholder="Enter custom HWID or leave blank for random"
                value={customHWID}
                onChange={(e) => setCustomHWID(e.target.value)}
              />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                If left blank, a random HWID will be generated
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHwidDialogOpen(false)}
              style={{
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSpoofHWID} className="text-white" style={{ backgroundColor: theme.colors.primary }}>
              <Shield size={16} className="mr-2" />
              Spoof HWID
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!showConsole && (
        <Button
          onClick={() => setShowConsole(true)}
          className="fixed bottom-4 right-4 text-white hover:opacity-80"
          style={{ backgroundColor: theme.colors.primary }}
          size="sm"
        >
          <Terminal size={16} className="mr-2" />
          Show Console
        </Button>
      )}

      {!showFeatures && (
        <Button
          onClick={() => setShowFeatures(true)}
          className="fixed bottom-4 left-4 text-white hover:opacity-80"
          style={{ backgroundColor: theme.colors.primary }}
          size="sm"
        >
          <Shield size={16} className="mr-2" />
          Show Features
        </Button>
      )}
    </div>
  )
}
