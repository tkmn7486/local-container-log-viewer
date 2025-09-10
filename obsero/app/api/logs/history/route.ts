import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const LOGS_DIR = path.join(process.cwd(), "data", "logs")

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const containerId = searchParams.get("containerId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const level = searchParams.get("level")
    const search = searchParams.get("search")

    await fs.access(LOGS_DIR)
    const files = await fs.readdir(LOGS_DIR)

    let allLogs: any[] = []

    for (const file of files) {
      if (containerId && !file.startsWith(containerId)) continue

      const filepath = path.join(LOGS_DIR, file)
      const data = await fs.readFile(filepath, "utf-8")
      const logs = JSON.parse(data)
      allLogs = [...allLogs, ...logs]
    }

    // Apply filters
    let filteredLogs = allLogs

    if (startDate) {
      filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp) >= new Date(startDate))
    }

    if (endDate) {
      filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp) <= new Date(endDate))
    }

    if (level && level !== "ALL") {
      filteredLogs = filteredLogs.filter((log) => log.level === level)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) || log.containerName.toLowerCase().includes(searchLower),
      )
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ logs: filteredLogs })
  } catch (error) {
    console.error("Error fetching log history:", error)
    return NextResponse.json({ error: "Failed to fetch log history" }, { status: 500 })
  }
}
