# 前端嵌入部署指南

本文档说明如何将前端应用嵌入到 Go 服务端并部署。

## 快速开始

### 1. 构建前后端

运行自动化构建脚本：

```bash
# 从项目根目录运行
./scripts/build-with-frontend.sh
```

这个脚本会：

1. 打包前端应用 (apps/manage)
2. 复制静态文件到 server/internal/interfaces/http/web/
3. 编译 Go 服务端（嵌入前端文件）

### 2. 运行服务器

```bash
cd server
./bin/luckdb serve
```

### 3. 访问应用

打开浏览器访问：

- **前端应用**: http://localhost:8080/
- **API 文档**: http://localhost:8080/api/v1/
- **健康检查**: http://localhost:8080/health

## 路由说明

### API 路由

以下路由由 Go 服务端处理：

- `/api/v1/*` - RESTful API 接口
- `/ws` - WebSocket 连接
- `/health` - 健康检查

### 前端路由

所有其他路由由前端应用处理（SPA 模式）：

- `/` - 首页
- `/dashboard` - 控制台
- `/base/:baseId` - 数据库详情
- `/base/:baseId/:tableId` - 数据表详情

## 开发工作流

### 开发模式（前后端分离）

**前端开发**:

```bash
cd apps/manage
npm run dev
# 访问 http://localhost:5173
```

**后端开发**:

```bash
cd server
go run ./cmd/luckdb serve
# API: http://localhost:8080/api/v1
```

### 生产构建

```bash
# 一键构建
./scripts/build-with-frontend.sh

# 或手动构建
cd apps/manage
npm run build

cd ../../server
mkdir -p internal/interfaces/http/web
cp -r ../apps/manage/dist/* internal/interfaces/http/web/
go build -o bin/luckdb ./cmd/luckdb
```

## 技术实现

### Go Embed

使用 Go 1.16+ 的 embed 包嵌入静态文件：

```go
//go:embed web
var StaticFiles embed.FS
```

### 静态文件处理

使用 `static_handler.go` 处理静态文件请求：

- 优先匹配 API 路由
- 尝试服务静态文件
- 失败则返回 `index.html` (SPA 路由)

### 路由配置

在 `routes.go` 中配置：

```go
func SetupRoutes(router *gin.Engine, cont *container.Container) {
	// 静态文件服务
	setupStaticFiles(router)

	// API 路由
	v1 := router.Group("/api/v1")
	// ...
}
```

## Docker 部署

### Dockerfile

```dockerfile
# 多阶段构建
FROM node:20-alpine AS frontend-builder
WORKDIR /app/apps/manage
COPY apps/manage/package*.json ./
RUN npm ci
COPY apps/manage ./
RUN npm run build

FROM golang:1.21-alpine AS backend-builder
WORKDIR /app/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server ./
COPY --from=frontend-builder /app/apps/manage/dist ./internal/interfaces/http/web
RUN go build -o bin/luckdb ./cmd/luckdb

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=backend-builder /app/server/bin/luckdb ./
COPY server/config.yaml ./
EXPOSE 8080
CMD ["./luckdb", "serve"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t luckdb:latest .

# 运行容器
docker run -d \
  -p 8080:8080 \
  -v $(pwd)/config.yaml:/root/config.yaml \
  --name luckdb \
  luckdb:latest
```

## 文件结构

```
server/
├── internal/
│   └── interfaces/
│       └── http/
│           ├── web/              # 前端静态文件（被嵌入）
│           │   ├── index.html
│           │   └── assets/
│           ├── embed.go          # embed 配置
│           ├── static_handler.go # 静态文件处理器
│           └── routes.go         # 路由配置
├── bin/
│   └── luckdb                    # 编译后的二进制文件
└── config.yaml                   # 配置文件
```

## 常见问题

### Q: 前端更新后如何重新部署？

A: 运行构建脚本重新编译：

```bash
./scripts/build-with-frontend.sh
```

### Q: 可以只更新前端而不重新编译后端吗？

A: 不可以。由于静态文件被嵌入到二进制文件中，任何前端更新都需要重新编译。

### Q: 如何在生产环境使用 CDN？

A: 有两种方案：

1. 修改前端构建配置，使用 CDN URL
2. 在 Nginx 等反向代理层处理静态文件

### Q: 二进制文件会很大吗？

A: 前端打包后约 1.5 MB，Go 二进制约 30-50 MB，总大小 32-52 MB，对现代服务器来说完全可接受。

### Q: 开发时必须每次都重新构建吗？

A: 不需要。开发时前后端分离：

- 前端: `npm run dev` (热重载)
- 后端: `go run` 或 Air (热重载)

只在发布时使用嵌入模式。

## 性能优化

### 1. 启用 Gzip 压缩

在 Gin 中间件中启用：

```go
import "github.com/gin-contrib/gzip"

router.Use(gzip.Gzip(gzip.DefaultCompression))
```

### 2. 添加缓存头

```go
if strings.HasPrefix(c.Request.URL.Path, "/assets/") {
	c.Header("Cache-Control", "public, max-age=31536000")
}
```

### 3. 使用 CDN

将静态资源上传到 CDN，只嵌入 `index.html`。

## 监控和日志

### 访问日志

HTTP 请求日志：

```json
{
  "level": "info",
  "ts": "2025-10-17T22:47:50.585+0800",
  "msg": "HTTP Request",
  "method": "GET",
  "path": "/",
  "status": 200,
  "duration": "5.2ms"
}
```

### 健康检查

```bash
curl http://localhost:8080/health
```

响应：

```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "healthy",
  "services": "healthy"
}
```

## 总结

前端嵌入部署方案的优势：

✅ **简化部署** - 单一二进制文件  
✅ **版本一致** - 前后端版本匹配  
✅ **无需额外配置** - 不需要 Nginx 等  
✅ **容器化友好** - Docker 镜像更小  
✅ **跨平台** - 编译后可在任何平台运行

适用场景：

- 私有化部署
- 内部系统
- 简化运维
- Docker/K8s 部署

不适用场景：

- 大规模 CDN 分发
- 频繁前端更新
- 多前端应用

## 相关文档

- [构建脚本文档](../scripts/build-with-frontend.sh)
- [API 文档](./README.md)
- [部署指南](./docs/deployment.md)
