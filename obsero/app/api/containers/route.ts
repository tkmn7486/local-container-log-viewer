import { NextResponse } from "next/server"
import { getDockerClient } from "@/lib/docker-client"

// 開発環境用のモックデータ
function getMockContainers() {
  return [
    {
      id: "mock-container-1",
      name: "web-app",
      image: "nginx:latest",
      state: "running",
      status: "Up 2 hours",
      created: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "mock-container-2",
      name: "database",
      image: "postgres:13",
      state: "running",
      status: "Up 1 day",
      created: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "mock-container-3",
      name: "redis-cache",
      image: "redis:alpine",
      state: "exited",
      status: "Exited (0) 30 minutes ago",
      created: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: "mock-container-4",
      name: "api-server",
      image: "node:18-alpine",
      state: "running",
      status: "Up 5 minutes",
      created: new Date(Date.now() - 300000).toISOString(),
    },
  ]
}

export async function GET() {
  try {
    const isV0Environment = process.env.VERCEL || process.env.NODE_ENV === "development"

    if (isV0Environment) {
      console.log("[v0] Using mock containers for v0 environment")
      return NextResponse.json(getMockContainers())
    }

    const dockerClient = getDockerClient()

    // Docker接続可能性をチェック
    const isDockerAvailable = await dockerClient.isDockerAvailable()

    if (!isDockerAvailable) {
      console.log("[v0] Docker not available, using mock data")
      return NextResponse.json(getMockContainers())
    }

    const containers = await dockerClient.listContainers(true)

    // レスポンスデータを整形
    const formattedContainers = containers.map((container) => ({
      id: container.Id,
      name: container.Names?.[0]?.replace("/", "") || "Unknown",
      image: container.Image,
      state: container.State,
      status: container.Status,
      created: new Date(container.Created * 1000).toISOString(),
    }))

    return NextResponse.json(formattedContainers)
  } catch (error) {
    console.error("[v0] Failed to fetch containers:", error)

    try {
      console.log("[v0] Falling back to mock containers due to error")
      return NextResponse.json(getMockContainers())
    } catch (fallbackError) {
      console.error("[v0] Fallback also failed:", fallbackError)
      return NextResponse.json({ error: "Failed to fetch containers", containers: [] }, { status: 500 })
    }
  }
}
