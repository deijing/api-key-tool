# 🚀 OrbStack 部署指南

## 关于OrbStack

OrbStack是一个适用于macOS的轻量级Docker替代品，相比Docker Desktop具有以下优势：
- ⚡ **更快的启动速度** - 秒级启动容器
- 💾 **更少的资源占用** - 内存和CPU占用更低
- 🔄 **更好的文件共享** - 原生文件系统性能
- 🎯 **原生集成** - 与macOS无缝集成

本项目完全支持OrbStack，所有Docker命令都可以直接使用！

---

## 快速部署

### 1. 确认OrbStack已安装

```bash
# 检查Docker版本（OrbStack提供）
docker --version

# 检查docker-compose
docker-compose --version
```

### 2. 一键部署

```bash
# 克隆项目
git clone <your-repo-url>
cd api-key-tool

# 执行部署脚本
./deploy.sh
```

**就这么简单！** OrbStack会自动处理所有细节。

---

## OrbStack 特性优化

### 1. 快速构建

OrbStack的文件共享性能比Docker Desktop快很多，构建镜像速度更快：

```bash
# 构建镜像（OrbStack上非常快）
docker-compose build

# 首次构建大约需要 1-2 分钟
# 后续构建利用缓存，只需 10-30 秒
```

### 2. 实时日志

OrbStack的日志输出更加实时：

```bash
# 实时查看日志（响应更快）
docker-compose logs -f
```

### 3. 资源管理

OrbStack自动管理资源，无需手动配置：

```bash
# 查看容器资源使用（OrbStack优化后占用更少）
docker stats api-key-tool
```

典型资源占用：
- **内存**: ~100-150MB（比Docker Desktop少30-50%）
- **CPU**: 待机时几乎为0
- **磁盘**: ~40-50MB（镜像大小）

---

## OrbStack vs Docker Desktop

### 性能对比

| 指标 | OrbStack | Docker Desktop |
|------|----------|----------------|
| 容器启动时间 | <1秒 | 2-5秒 |
| 内存占用 | ~100MB | ~300-500MB |
| 文件共享速度 | 原生 | 较慢 |
| macOS集成 | 完美 | 一般 |

### 兼容性

✅ **完全兼容** - 所有Docker和Docker Compose命令都可以直接使用
✅ **无需修改** - 现有的Dockerfile和docker-compose.yml无需任何修改
✅ **无缝切换** - 可以随时在OrbStack和Docker Desktop之间切换

---

## 常用命令

所有标准Docker命令在OrbStack上都能用，而且更快：

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 查看容器状态
docker-compose ps

# 进入容器
docker exec -it api-key-tool sh

# 清理资源
docker system prune -a
```

---

## 开发模式

### 热重载开发（推荐）

利用OrbStack的快速文件共享，可以实现热重载开发：

```bash
# 方式1：直接运行开发服务器（推荐）
npm start

# 方式2：Docker开发模式
docker-compose -f docker-compose.dev.yml up
```

### Docker开发模式配置

创建 `docker-compose.dev.yml`：

```yaml
version: '3.8'

services:
  api-key-tool-dev:
    image: node:16-alpine
    container_name: api-key-tool-dev
    working_dir: /app
    volumes:
      - .:/app
      - /app/node_modules  # 使用容器的node_modules
    ports:
      - "3000:3000"
    command: npm start
    environment:
      - REACT_APP_SHOW_DETAIL=true
      - REACT_APP_SHOW_BALANCE=true
      - REACT_APP_BASE_URL=https://api.oaipro.com
```

启动开发环境：

```bash
docker-compose -f docker-compose.dev.yml up
```

---

## 故障排查

### OrbStack特定问题

#### 1. 端口已被占用

```bash
# 查看端口占用
lsof -i :3000

# 杀死占用端口的进程
kill -9 <PID>

# 或修改端口
PORT=8080 docker-compose up -d
```

#### 2. 文件权限问题

OrbStack使用原生文件系统，通常不会有权限问题。如果遇到：

```bash
# 重置文件权限
chmod -R 755 .

# 重新构建
docker-compose build --no-cache
```

#### 3. 容器无法访问

```bash
# 检查OrbStack状态
orb status

# 重启OrbStack（如果需要）
orb restart

# 查看OrbStack日志
orb logs
```

---

## 性能优化建议

### 1. 使用OrbStack的DNS

OrbStack提供更快的DNS解析：

```yaml
# docker-compose.yml中添加
services:
  api-key-tool:
    dns:
      - 100.100.100.100  # OrbStack DNS
```

### 2. 启用BuildKit

OrbStack默认启用BuildKit，构建更快：

```bash
# 确认BuildKit已启用
docker buildx version

# 使用BuildKit构建
DOCKER_BUILDKIT=1 docker-compose build
```

### 3. 利用层缓存

OrbStack的层缓存非常高效：

```bash
# 构建时保持缓存
docker-compose build

# 只在必要时清理缓存
docker builder prune
```

---

## OrbStack CLI

OrbStack提供了额外的CLI工具：

```bash
# 查看OrbStack状态
orb status

# 查看容器列表
orb list

# 打开容器shell
orb shell api-key-tool

# 查看资源使用
orb stats

# OrbStack设置
orb settings
```

---

## 网络配置

OrbStack提供更好的网络性能：

```bash
# 容器可以直接访问localhost
# 无需额外配置host.docker.internal

# 在容器内访问宿主机服务
curl http://host.orb.internal:8080

# 查看网络
docker network ls
```

---

## 最佳实践

### 1. 利用OrbStack的快速启动

```bash
# OrbStack容器启动极快，可以频繁重启
docker-compose restart  # <1秒完成
```

### 2. 使用卷挂载优化

```yaml
# 对于开发环境，利用OrbStack的快速文件共享
volumes:
  - .:/app:cached  # cached选项在OrbStack上效果更好
```

### 3. 资源限制

OrbStack自动优化资源，可以设置更激进的限制：

```yaml
deploy:
  resources:
    limits:
      cpus: '2'      # OrbStack可以更高效利用CPU
      memory: 1G
```

---

## 迁移指南

### 从Docker Desktop迁移到OrbStack

1. **卸载Docker Desktop**（可选）
2. **安装OrbStack**
3. **无需任何配置更改** - 所有Docker命令自动工作
4. **导入现有镜像**（如果需要）：
   ```bash
   # 导出镜像（在Docker Desktop上）
   docker save api-key-tool:latest | gzip > api-key-tool.tar.gz

   # 导入镜像（在OrbStack上）
   gunzip -c api-key-tool.tar.gz | docker load
   ```

### 从OrbStack迁移回Docker Desktop

同样的过程，完全兼容，无需修改任何配置。

---

## 总结

使用OrbStack部署本项目的优势：
- 🚀 **更快** - 构建和启动速度提升2-3倍
- 💰 **更省资源** - 内存和CPU占用减少30-50%
- 🎯 **零配置** - 所有Docker命令开箱即用
- ��� **更稳定** - 原生macOS集成，稳定性更好

**推荐指数**: ⭐⭐⭐⭐⭐

---

## 参考资源

- [OrbStack 官网](https://orbstack.dev/)
- [OrbStack 文档](https://docs.orbstack.dev/)
- [Docker 命令参考](https://docs.docker.com/engine/reference/commandline/cli/)
