export interface DockerContainer {
  Id: string
  Names: string[]
  Image: string
  State: string
  Status: string
  Created: number
}

export interface DockerLogEntry {
  timestamp: string
  message: string
  stream: "stdout" | "stderr"
}

export class DockerClient {
  private docker: any
  private isV0Environment: boolean

  constructor() {
    this.isV0Environment = !!(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV)

    if (this.isV0Environment) {
      console.log("[v0] Skipping Docker client initialization in v0 environment")
      return
    }

    try {
      // Dynamic import to prevent issues in v0 environment
      const Dockerode = require("dockerode")
      const dockerHost = process.env.DOCKER_HOST || "unix:///var/run/docker.sock"

      if (dockerHost.startsWith("unix://")) {
        this.docker = new Dockerode({ socketPath: dockerHost.replace("unix://", "") })
      } else if (dockerHost.startsWith("tcp://")) {
        const url = new URL(dockerHost)
        this.docker = new Dockerode({
          host: url.hostname,
          port: Number.parseInt(url.port) || 2376,
          protocol: url.protocol.replace(":", ""),
        })
      } else {
        // デフォルトはUnixソケット
        this.docker = new Dockerode({ socketPath: "/var/run/docker.sock" })
      }
    } catch (error) {
      console.error("[v0] Failed to initialize Docker client:", error)
      this.docker = null
    }
  }

  async listContainers(all = true): Promise<DockerContainer[]> {
    if (this.isV0Environment || !this.docker) {
      if (this.isV0Environment) {
        console.log("[v0] Returning mock data for v0 environment")
        return [
          {
            Id: "mock-container-1",
            Names: ["/nginx-proxy"],
            Image: "nginx:latest",
            State: "running",
            Status: "Up 2 hours",
            Created: Date.now() / 1000 - 7200,
          },
          {
            Id: "mock-container-2",
            Names: ["/redis-cache"],
            Image: "redis:alpine",
            State: "running",
            Status: "Up 1 day",
            Created: Date.now() / 1000 - 86400,
          },
          {
            Id: "mock-container-3",
            Names: ["/postgres-db"],
            Image: "postgres:13",
            State: "exited",
            Status: "Exited (0) 30 minutes ago",
            Created: Date.now() / 1000 - 1800,
          },
        ]
      }
      console.log("Docker not available, returning empty container list")
      return []
    }

    try {
      const containers = await this.docker.listContainers({ all })
      return containers.map((container: any) => ({
        Id: container.Id,
        Names: container.Names,
        Image: container.Image,
        State: container.State,
        Status: container.Status,
        Created: container.Created,
      }))
    } catch (error) {
      console.error("Failed to list containers:", error)
      return []
    }
  }

  async getContainerLogs(
    containerId: string,
    options: {
      stdout?: boolean
      stderr?: boolean
      timestamps?: boolean
      tail?: number
      since?: number
    } = {},
  ): Promise<DockerLogEntry[]> {
    if (this.isV0Environment || !this.docker) {
      if (this.isV0Environment) {
        console.log("[v0] Returning mock logs for v0 environment")
        const mockLogs: DockerLogEntry[] = []
        const now = new Date()
        for (let i = 0; i < 20; i++) {
          const timestamp = new Date(now.getTime() - i * 30000)
          mockLogs.push({
            timestamp: timestamp.toISOString(),
            message: `Mock log entry ${i + 1} for container ${containerId}`,
            stream: i % 3 === 0 ? "stderr" : "stdout",
          })
        }
        return mockLogs.reverse()
      }
      console.log("Docker not available, returning empty logs")
      return []
    }

    try {
      const container = this.docker.getContainer(containerId)
      const logStream = await container.logs({
        stdout: options.stdout ?? true,
        stderr: options.stderr ?? true,
        timestamps: options.timestamps ?? true,
        tail: options.tail || 100,
        since: options.since || 0,
      })

      return this.parseLogOutput(logStream.toString())
    } catch (error) {
      console.error("Failed to get container logs:", error)
      return []
    }
  }

  parseLogOutput(logOutput: string): DockerLogEntry[] {
    const lines = logOutput.split("\n").filter((line) => line.trim())
    const entries: DockerLogEntry[] = []

    for (const line of lines) {
      // Docker multiplexed streamの処理
      let cleanLine = line
      let stream: "stdout" | "stderr" = "stdout"

      // Docker APIのヘッダーを除去（8バイトヘッダー）
      if (line.length > 8) {
        const header = line.slice(0, 8)
        const streamType = header.charCodeAt(0)
        if (streamType === 1) stream = "stdout"
        else if (streamType === 2) stream = "stderr"
        cleanLine = line.slice(8)
      }

      // タイムスタンプの抽出
      const timestampMatch = cleanLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/)

      if (timestampMatch) {
        const [, timestamp, message] = timestampMatch
        entries.push({
          timestamp: new Date(timestamp).toISOString(),
          message: message.trim(),
          stream,
        })
      } else if (cleanLine.trim()) {
        entries.push({
          timestamp: new Date().toISOString(),
          message: cleanLine.trim(),
          stream,
        })
      }
    }

    return entries
  }

  async getContainerInfo(containerId: string) {
    if (this.isV0Environment || !this.docker) {
      console.log("[v0] Docker not available, returning null container info")
      return null
    }

    try {
      const container = this.docker.getContainer(containerId)
      return await container.inspect()
    } catch (error) {
      console.error("Failed to get container info:", error)
      return null
    }
  }

  async isDockerAvailable(): Promise<boolean> {
    if (this.isV0Environment || !this.docker) {
      console.log("[v0] Docker not available in v0 environment")
      return false
    }

    try {
      await this.docker.ping()
      return true
    } catch (error) {
      console.error("Docker is not available:", error)
      return false
    }
  }
}

let dockerClientInstance: DockerClient | null = null

export const getDockerClient = (): DockerClient => {
  if (!dockerClientInstance) {
    dockerClientInstance = new DockerClient()
  }
  return dockerClientInstance
}
