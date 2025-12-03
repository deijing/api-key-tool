# 🐳 Docker 一键部署指南

## 快速开始

### 方式一：使用一键部署脚本（推荐）

```bash
# 1. 克隆项目（如果还没有）
git clone <your-repo-url>
cd api-key-tool

# 2. 执行一键部署脚本
./deploy.sh
```

脚本会自动完成以下操���：
- ✅ 检查Docker环境
- ✅ 创建配置文件（如果不存在）
- ✅ 停止旧容器
- ✅ 构建新镜像
- ✅ 启动容器
- ✅ 健康检查

### 方式二：手动部署

```bash
# 1. 复制环境变量配置文件
cp .env.example .env

# 2. 修改配置（可选）
vim .env

# 3. 构建并启动
docker-compose up -d --build

# 4. 查看日志
docker-compose logs -f
```

---

## 配置说明

### 环境变量配置（.env文件）

```bash
# 展示使用明细
REACT_APP_SHOW_DETAIL="true"

# 展示余额
REACT_APP_SHOW_BALANCE="true"

# API Base URL（结尾不要带/）
REACT_APP_BASE_URL="https://api.oaipro.com"

# Docker容器端口映射（宿主机端口）
PORT=3000
```

### 修改配置

1. **修改端口：**
   ```bash
   # 编辑 .env 文件
   PORT=8080  # 修改为你想要的端口

   # 重启容器
   docker-compose restart
   ```

2. **修改API地址：**
   ```bash
   # 编辑 .env 文件
   REACT_APP_BASE_URL="https://your-api.com"

   # 需要重新构建
   docker-compose up -d --build
   ```

---

## Docker命令参考

### 基本操作

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
```

### 镜像管理

```bash
# 构建镜像（不使用缓存）
docker-compose build --no-cache

# 重新构建并启动
docker-compose up -d --build

# 删除镜像
docker rmi api-key-tool:latest
```

### 容器管理

```bash
# 进入容器
docker exec -it api-key-tool sh

# 查看容器资源占用
docker stats api-key-tool

# 查看容器详细信息
docker inspect api-key-tool
```

### 清理操作

```bash
# 停止并删除容器、网络
docker-compose down

# 同时删除volumes（慎用）
docker-compose down -v

# 清理未使用的镜像
docker image prune -a
```

---

## 生产环境部署

### 1. 使用自定义构建参数

```bash
# 构建时指定环境变量
docker-compose build \
  --build-arg REACT_APP_SHOW_DETAIL=true \
  --build-arg REACT_APP_SHOW_BALANCE=true \
  --build-arg REACT_APP_BASE_URL=https://your-api.com
```

### 2. 使用nginx反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 配置HTTPS（使用Let's Encrypt）

```bash
# 安装certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 4. 配置防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 监控和维护

### 健康检查

容器内置健康检查功能，每30秒检查一次：

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' api-key-tool
```

### 日志管理

日志自动轮转配置（最多保留3个文件，每个最大10MB）：

```bash
# 查看实时日志
docker-compose logs -f

# 查看最近100行日志
docker-compose logs --tail=100

# 查看特定时间的日志
docker-compose logs --since 2024-01-01
```

### 资源限制

在docker-compose.yml中已配置资源限制：
- CPU限制: 1核心
- 内存限制: 512MB
- CPU保留: 0.25核心
- 内存保留: 128MB

---

## 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查端口占用
netstat -tlnp | grep 3000

# 检查Docker服务状态
systemctl status docker
```

### 构建失败

```bash
# 清理构建缓存
docker builder prune

# 重新构建（不使用缓存）
docker-compose build --no-cache
```

### 访问失败

```bash
# 检查容器是否运行
docker-compose ps

# 检查容器网络
docker network inspect api-key-tool_api-key-tool-network

# 测试容器内部访问
docker exec -it api-key-tool curl http://localhost
```

---

## 性能优化

### 1. 启用Gzip压缩

nginx配置已默认启用Gzip压缩，支持以下类型：
- text/plain, text/css, text/xml
- application/json, application/javascript
- image/svg+xml
- 字体文件

### 2. 静态资源缓存

静态资源（图片、CSS、JS）缓存1年，提升加载速度。

### 3. 镜像大小优化

使用多阶段构建，最终镜像大小约40-50MB：
- 构建阶段：使用node:16-alpine
- 运行阶段：使用nginx:1.25-alpine

---

## 常见问题

### Q: 如何更新到最新版本？

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

### Q: 如何备份配置？

```bash
# 备份配置文件
cp .env .env.backup

# 导出容器配置
docker inspect api-key-tool > container-config.json
```

### Q: 如何迁移到其他服务器？

```bash
# 1. 导出镜像
docker save api-key-tool:latest | gzip > api-key-tool.tar.gz

# 2. 在新服务器上导入
gunzip -c api-key-tool.tar.gz | docker load

# 3. 复制配置文件和docker-compose.yml到新服务器

# 4. 启动服务
docker-compose up -d
```

---

## 技术栈

- **前端框架**: React 18
- **UI组件**: Semi UI
- **构建工具**: React Scripts
- **Web服务器**: Nginx 1.25
- **容器化**: Docker + Docker Compose

---

## 支持

如有问题，请提交Issue或联系维护者。
