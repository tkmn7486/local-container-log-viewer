import { NextResponse } from "next/server"
import { getDockerClient } from "@/lib/docker-client"

// ログエントリの型定義
interface LogEntry {
  timestamp: string
  message: string
  stream: "stdout" | "stderr"
}

// 開発環境用のモックログデータ
function getMockLogs(containerId: string): LogEntry[] {
  const now = new Date()
  const logs: LogEntry[] = []

  const logTemplates = {
    "mock-container-1": [
      '127.0.0.1 - - [${timestamp}] "GET / HTTP/1.1" 200 612',
      '127.0.0.1 - - [${timestamp}] "GET /api/health HTTP/1.1" 200 15',
      "nginx: [info] server started successfully",
      '127.0.0.1 - - [${timestamp}] "POST /api/data HTTP/1.1" 201 45',
      "nginx: [warn] worker process 123 exited on signal 15",
      '127.0.0.1 - - [${timestamp}] "GET /static/css/main.css HTTP/1.1" 304 0',
    ],
    "mock-container-2": [
      "LOG:  database system is ready to accept connections",
      "LOG:  checkpoint starting: time",
      "LOG:  checkpoint complete: wrote 3 buffers (0.0%); 0 WAL file(s) added, 0 removed, 0 recycled",
      'ERROR:  relation "users" does not exist at character 15',
      "LOG:  connection received: host=172.17.0.1 port=54321",
      "LOG:  statement: SELECT * FROM users WHERE id = 1",
    ],
    "mock-container-3": [
      "Redis server v=6.2.6 sha=00000000:0 malloc=jemalloc-5.1.0 bits=64 build=a307e7e8b0e8b3e4",
      "Server initialized",
      "Ready to accept connections",
      "Client connected from 172.17.0.1:45678",
      "DB 0: 15 keys (0 volatile) in 16 slots HT.",
      "WARN: Memory usage is high: 85%",
    ],
    "mock-container-4": [
      "Node.js application starting...",
      "Express server listening on port 3000",
      "Connected to database successfully",
      "INFO: Processing user request for /api/users",
      "ERROR: Failed to validate user input: email is required",
      "INFO: Request completed in 45ms",
    ],
  }

  const templates = logTemplates[containerId as keyof typeof logTemplates] || [
    "Application started successfully",
    "Processing request...",
    "Task completed",
    "INFO: System health check passed",
    "WARN: High memory usage detected",
    "ERROR: Connection timeout occurred",
  ]

  for (let i = 0; i < 80; i++) {
    const timestamp = new Date(now.getTime() - i * 90000).toISOString()
    const template = templates[i % templates.length]
    const message = template.replace("${timestamp}", timestamp.split("T")[1].split(".")[0])

    logs.unshift({
      timestamp: timestamp.split("T")[1].split(".")[0],
      message,
      stream: Math.random() > 0.85 ? "stderr" : "stdout",
    })
  }

  return logs
}

// Docker APIからログを取得
async function fetchContainerLogs(containerId: string): Promise<LogEntry[]> {
  try {
    const isV0Environment = process.env.VERCEL

    if (isV0Environment) {
      console.log(`[v0] Using mock logs for container: ${containerId}`)
      return getMockLogs(containerId)
    }

    const dockerClient = getDockerClient()

    // Docker接続可能性をチェック
    const isDockerAvailable = await dockerClient.isDockerAvailable()

    if (!isDockerAvailable) {
      console.log(`[v0] Docker not available, returning empty logs for: ${containerId}`)
      return []
    }

    // 実際のDocker APIからログを取得
    const logs = await dockerClient.getContainerLogs(containerId, {
      stdout: true,
      stderr: true,
      timestamps: true,
      tail: 100,
    })

    return logs.map((log) => ({
      timestamp: new Date(log.timestamp).toLocaleTimeString(),
      message: log.message,
      stream: log.stream,
    }))
  } catch (error) {
    console.error(`[v0] Failed to fetch logs for ${containerId}:`, error)
    return []
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const containerId = params.id
    console.log(`[v0] Fetching logs for container: ${containerId}`)

    const logs = await fetchContainerLogs(containerId)

    return NextResponse.json(logs)
  } catch (error) {
    console.error("[v0] Failed to fetch container logs:", error)
    return NextResponse.json([])
  }
}
