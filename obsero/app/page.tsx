"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { LogHistory } from "@/components/log-history"
import { LoadingScreen } from "@/components/loading-screen"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdvancedFilters } from "@/components/advanced-filters"
import {
  Search,
  RefreshCw,
  Container,
  Play,
  Square,
  Download,
  Eye,
  AlertCircle,
  Info,
  AlertTriangle,
  Zap,
  Save,
} from "lucide-react"

interface ContainerInfo {
  id: string
  name: string
  image: string
  state: string
  status: string
  created: string
}

interface LogEntry {
  timestamp: string
  message: string
  stream: "stdout" | "stderr"
  level?: "info" | "warn" | "error" | "debug"
}

const detectLogLevel = (message: string): "info" | "warn" | "error" | "debug" => {
  const lowerMessage = message.toLowerCase()
  if (lowerMessage.includes("error") || lowerMessage.includes("err") || lowerMessage.includes("fatal")) {
    return "error"
  }
  if (lowerMessage.includes("warn") || lowerMessage.includes("warning")) {
    return "warn"
  }
  if (lowerMessage.includes("debug") || lowerMessage.includes("trace")) {
    return "debug"
  }
  return "info"
}

const getLogLevelIcon = (level: string) => {
  switch (level) {
    case "error":
      return <AlertCircle className="h-3 w-3 text-red-500" />
    case "warn":
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />
    case "debug":
      return <Zap className="h-3 w-3 text-purple-500" />
    default:
      return <Info className="h-3 w-3 text-blue-500" />
  }
}

const getLogLevelStyle = (level: string) => {
  switch (level) {
    case "error":
      return "border-l-red-500 bg-red-50 dark:bg-red-950/20"
    case "warn":
      return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
    case "debug":
      return "border-l-purple-500 bg-purple-50 dark:bg-purple-950/20"
    default:
      return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
  }
}

export default function ContainerLogManager() {
  const [containers, setContainers] = useState<ContainerInfo[]>([])
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [savingLogs, setSavingLogs] = useState(false)

  const [logLevelFilter, setLogLevelFilter] = useState<string>("all")
  const [streamFilter, setStreamFilter] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<string>("all")
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [followLogs, setFollowLogs] = useState(false)

  const [initialLoading, setInitialLoading] = useState(true)
  const [advancedFilters, setAdvancedFilters] = useState<any[]>([])
  const previousContainersRef = useRef<ContainerInfo[]>([])

  const fetchContainers = async () => {
    if (containers.length === 0) {
      setLoading(true)
    }
    try {
      const response = await fetch("/api/containers")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON")
      }

      const data = await response.json()

      // Handle error response format
      if (data.error) {
        console.error("[v0] API returned error:", data.error)
        setContainers(data.containers || [])
        return
      }

      const dataString = JSON.stringify(data)
      const prevString = JSON.stringify(previousContainersRef.current)

      if (dataString !== prevString) {
        setContainers(data)
        previousContainersRef.current = data
      }
    } catch (error) {
      console.error("Failed to fetch containers:", error)
      setContainers([])
    } finally {
      setLoading(false)
      if (initialLoading) {
        setInitialLoading(false)
      }
    }
  }

  const fetchLogs = async (containerId: string) => {
    try {
      const response = await fetch(`/api/containers/${containerId}/logs`)
      const data = await response.json()
      const logsWithLevel = data.map((log: LogEntry) => ({
        ...log,
        level: detectLogLevel(log.message),
      }))
      setLogs(logsWithLevel)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    }
  }

  const applyAdvancedFilters = (logs: LogEntry[]) => {
    return logs.filter((log) => {
      return advancedFilters.every((condition) => {
        switch (condition.type) {
          case "level":
            return condition.operator === "equals" ? log.level === condition.value : true
          case "stream":
            return condition.operator === "equals" ? log.stream === condition.value : true
          case "message":
            const message = log.message.toLowerCase()
            const value = condition.value.toLowerCase()
            switch (condition.operator) {
              case "contains":
                return message.includes(value)
              case "not_contains":
                return !message.includes(value)
              default:
                return true
            }
          default:
            return true
        }
      })
    })
  }

  const filteredLogs = applyAdvancedFilters(
    logs.filter((log) => {
      if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      if (logLevelFilter !== "all" && log.level !== logLevelFilter) {
        return false
      }

      if (streamFilter !== "all" && log.stream !== streamFilter) {
        return false
      }

      if (timeRange !== "all") {
        const now = new Date()
        const logTime = new Date(log.timestamp)
        const diffMinutes = (now.getTime() - logTime.getTime()) / (1000 * 60)

        switch (timeRange) {
          case "5m":
            if (diffMinutes > 5) return false
            break
          case "1h":
            if (diffMinutes > 60) return false
            break
          case "24h":
            if (diffMinutes > 1440) return false
            break
        }
      }

      return true
    }),
  )

  const exportLogs = () => {
    if (!selectedContainer || filteredLogs.length === 0) return

    const logText = filteredLogs
      .map((log) => `[${log.timestamp}] [${log.stream.toUpperCase()}] [${log.level?.toUpperCase()}] ${log.message}`)
      .join("\n")

    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedContainer}-logs-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const saveLogs = async () => {
    if (!selectedContainer || logs.length === 0) return

    setSavingLogs(true)
    try {
      const containerName = containers.find((c) => c.id === selectedContainer)?.name || selectedContainer

      const response = await fetch("/api/logs/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          containerId: selectedContainer,
          containerName,
          logs: logs.map((log) => ({
            timestamp: log.timestamp,
            level: log.level || "INFO",
            stream: log.stream,
            message: log.message,
          })),
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert(`${result.saved} 件のログを保存しました`)
      } else {
        alert("ログの保存に失敗しました")
      }
    } catch (error) {
      console.error("Failed to save logs:", error)
      alert("ログの保存に失敗しました")
    } finally {
      setSavingLogs(false)
    }
  }

  useEffect(() => {
    fetchContainers()
  }, [])

  useEffect(() => {
    if (selectedContainer) {
      fetchLogs(selectedContainer)
    }
  }, [selectedContainer])

  useEffect(() => {
    if (autoRefresh && selectedContainer) {
      const interval = setInterval(() => {
        fetchLogs(selectedContainer)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, selectedContainer])

  const getStatusColor = (state: string) => {
    switch (state.toLowerCase()) {
      case "running":
        return "bg-green-500"
      case "exited":
        return "bg-red-500"
      case "paused":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <>
      <LoadingScreen isLoading={initialLoading} />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">obsero</h1>
            </div>
            <ThemeToggle />
          </div>

          <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="live">ライブログ</TabsTrigger>
              <TabsTrigger value="history">ログ履歴</TabsTrigger>
            </TabsList>

            <TabsContent value="live">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Container className="h-5 w-5" />
                          コンテナ一覧
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={fetchContainers} disabled={loading}>
                          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                      <CardDescription>
                        {containers.length > 0 
                          ? `${containers.length} 個のコンテナが見つかりました`
                          : "コンテナが見つかりませんでした"
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96">
                        <div className="space-y-2">
                          {containers.length > 0 ? (
                            containers.map((container) => (
                            <div
                              key={container.id}
                              className={`container-item p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                selectedContainer === container.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                              }`}
                              onClick={() => setSelectedContainer(container.id)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm truncate">{container.name}</span>
                                <Badge variant="secondary" className={`${getStatusColor(container.state)} text-white`}>
                                  {container.state === "running" ? (
                                    <Play className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Square className="h-3 w-3 mr-1" />
                                  )}
                                  {container.state}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{container.image}</p>
                              <p className="text-xs text-muted-foreground">{container.status}</p>
                            </div>
                            ))
                          ) : (
                            <div className="text-center text-muted-foreground py-8">
                              <Container className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>コンテナが見つかりませんでした</p>
                              <p className="text-sm mt-2">Dockerが起動しているか確認してください</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{selectedContainer ? "コンテナログ" : "コンテナを選択してください"}</CardTitle>
                        {selectedContainer && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={saveLogs}
                              disabled={logs.length === 0 || savingLogs}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              {savingLogs ? "保存中..." : "ログ保存"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={exportLogs}
                              disabled={filteredLogs.length === 0}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              エクスポート
                            </Button>
                            <Button
                              variant={autoRefresh ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAutoRefresh(!autoRefresh)}
                            >
                              <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
                              自動更新
                            </Button>
                          </div>
                        )}
                      </div>

                      {selectedContainer && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="ログを検索..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="max-w-sm"
                            />
                          </div>

                          <AdvancedFilters onFiltersChange={setAdvancedFilters} />

                          <Tabs defaultValue="filters" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="filters">フィルタ</TabsTrigger>
                              <TabsTrigger value="settings">表示設定</TabsTrigger>
                            </TabsList>

                            <TabsContent value="filters" className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>ログレベル</Label>
                                  <Select value={logLevelFilter} onValueChange={setLogLevelFilter}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">すべて</SelectItem>
                                      <SelectItem value="error">エラー</SelectItem>
                                      <SelectItem value="warn">警告</SelectItem>
                                      <SelectItem value="info">情報</SelectItem>
                                      <SelectItem value="debug">デバッグ</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>ストリーム</Label>
                                  <Select value={streamFilter} onValueChange={setStreamFilter}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">すべて</SelectItem>
                                      <SelectItem value="stdout">標準出力</SelectItem>
                                      <SelectItem value="stderr">標準エラー</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>時間範囲</Label>
                                  <Select value={timeRange} onValueChange={setTimeRange}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">すべて</SelectItem>
                                      <SelectItem value="5m">過去5分</SelectItem>
                                      <SelectItem value="1h">過去1時間</SelectItem>
                                      <SelectItem value="24h">過去24時間</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="settings" className="space-y-4">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="timestamps"
                                    checked={showTimestamps}
                                    onCheckedChange={setShowTimestamps}
                                  />
                                  <Label htmlFor="timestamps">タイムスタンプ表示</Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Checkbox id="follow" checked={followLogs} onCheckedChange={setFollowLogs} />
                                  <Label htmlFor="follow">ログを追従</Label>
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>

                          <div className="text-sm text-muted-foreground">
                            {filteredLogs.length} / {logs.length} ログエントリ
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {selectedContainer ? (
                        <ScrollArea className="h-96 w-full">
                          <div className="space-y-1 font-mono text-sm">
                            {filteredLogs.length > 0 ? (
                              filteredLogs.map((log, index) => (
                                <Dialog key={index}>
                                  <DialogTrigger asChild>
                                    <div
                                      className={`p-2 rounded border-l-2 cursor-pointer hover:bg-muted/50 transition-colors ${getLogLevelStyle(log.level || "info")}`}
                                      onClick={() => setSelectedLog(log)}
                                    >
                                      <div className="flex items-start gap-2">
                                        {getLogLevelIcon(log.level || "info")}
                                        {showTimestamps && (
                                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {log.timestamp}
                                          </span>
                                        )}
                                        <span className="flex-1 whitespace-pre-wrap break-all text-foreground">
                                          {log.message}
                                        </span>
                                        <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                      </div>
                                    </div>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                      <DialogTitle>ログ詳細</DialogTitle>
                                      <DialogDescription>
                                        {log.timestamp} - {log.stream} - {log.level}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="mt-4">
                                      <ScrollArea className="h-96 w-full border rounded p-4">
                                        <pre className="whitespace-pre-wrap text-sm">{log.message}</pre>
                                      </ScrollArea>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ))
                            ) : (
                              <div className="text-center text-muted-foreground py-8">
                                {searchTerm || logLevelFilter !== "all" || streamFilter !== "all"
                                  ? "フィルタ条件にマッチするログが見つかりません"
                                  : "ログがありません"}
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="h-96 flex items-center justify-center text-muted-foreground">
                          左側からコンテナを選択してログを表示
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <LogHistory containerId={selectedContainer || undefined} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
