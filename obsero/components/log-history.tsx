"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Download, Filter } from "lucide-react"

interface LogEntry {
  id: string
  containerId: string
  containerName: string
  timestamp: string
  level: string
  stream: string
  message: string
  savedAt: string
}

interface LogHistoryProps {
  containerId?: string
}

export function LogHistory({ containerId }: LogHistoryProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    level: "ALL",
    search: "",
  })

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (containerId) params.append("containerId", containerId)
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      if (filters.level !== "ALL") params.append("level", filters.level)
      if (filters.search) params.append("search", filters.search)

      const response = await fetch(`/api/logs/history?${params}`)
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error("Failed to fetch log history:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportLogs = async (format: "json" | "csv") => {
    try {
      const params = new URLSearchParams()
      if (containerId) params.append("containerId", containerId)
      params.append("format", format)

      const response = await fetch(`/api/logs/export?${params}`)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `logs-${containerId || "all"}-${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to export logs:", error)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [containerId])

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR":
        return "destructive"
      case "WARN":
        return "secondary"
      case "INFO":
        return "default"
      case "DEBUG":
        return "outline"
      default:
        return "default"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Log History
          {containerId && (
            <Badge variant="outline" className="ml-2">
              {containerId.slice(0, 12)}
            </Badge>
          )}
        </CardTitle>

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="max-w-xs"
          />

          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="max-w-xs"
          />

          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="max-w-xs"
          />

          <Select value={filters.level} onValueChange={(value) => setFilters((prev) => ({ ...prev, level: value }))}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
              <SelectItem value="WARN">Warning</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
              <SelectItem value="DEBUG">Debug</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={fetchHistory} disabled={loading}>
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>

          <Button variant="outline" onClick={() => exportLogs("json")}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>

          <Button variant="outline" onClick={() => exportLogs("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading log history...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No logs found matching the current filters</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getLevelColor(log.level)}>{log.level}</Badge>
                    <Badge variant="outline">{log.stream}</Badge>
                    <span className="text-sm text-muted-foreground">{log.containerName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-sm font-mono bg-muted p-2 rounded">{log.message}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
