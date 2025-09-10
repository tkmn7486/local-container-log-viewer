import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const LOGS_DIR = path.join(process.cwd(), "data", "logs")

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const containerId = searchParams.get("containerId")
    const format = searchParams.get("format") || "json"

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

    allLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    if (format === "csv") {
      const csvHeader = "Timestamp,Container,Level,Stream,Message\n"
      const csvContent = allLogs
        .map(
          (log) =>
            `"${log.timestamp}","${log.containerName}","${log.level}","${log.stream}","${log.message.replace(/"/g, '""')}"`,
        )
        .join("\n")

      return new NextResponse(csvHeader + csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="logs-${containerId || "all"}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    return NextResponse.json(allLogs, {
      headers: {
        "Content-Disposition": `attachment; filename="logs-${containerId || "all"}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Error exporting logs:", error)
    return NextResponse.json({ error: "Failed to export logs" }, { status: 500 })
  }
}
