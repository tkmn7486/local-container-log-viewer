import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

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

const LOGS_DIR = path.join(process.cwd(), "data", "logs")

async function ensureLogsDir() {
  try {
    await fs.access(LOGS_DIR)
  } catch {
    await fs.mkdir(LOGS_DIR, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { containerId, containerName, logs } = await request.json()

    await ensureLogsDir()

    const savedLogs: LogEntry[] = logs.map((log: any) => ({
      id: `${containerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      containerId,
      containerName,
      timestamp: log.timestamp,
      level: log.level || "INFO",
      stream: log.stream || "stdout",
      message: log.message,
      savedAt: new Date().toISOString(),
    }))

    const filename = `${containerId}-${new Date().toISOString().split("T")[0]}.json`
    const filepath = path.join(LOGS_DIR, filename)

    let existingLogs: LogEntry[] = []
    try {
      const existingData = await fs.readFile(filepath, "utf-8")
      existingLogs = JSON.parse(existingData)
    } catch {
      // File doesn't exist, start with empty array
    }

    const allLogs = [...existingLogs, ...savedLogs]
    await fs.writeFile(filepath, JSON.stringify(allLogs, null, 2))

    return NextResponse.json({
      success: true,
      saved: savedLogs.length,
      total: allLogs.length,
    })
  } catch (error) {
    console.error("Error saving logs:", error)
    return NextResponse.json({ error: "Failed to save logs" }, { status: 500 })
  }
}
