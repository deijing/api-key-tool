# 🔧 网络问题修复指南

## 常见错误

如果你看到类似这样的错误：
```
failed to solve: failed to fetch anonymous token: Get "https://auth.docker.io/token...": EOF
```

这是Docker Hub访问不稳定导致的，老王我给你几个解决方案！

---

## 方案一：配置OrbStack镜像加速器（推荐）

### 1. 打开OrbStack设置

```bash
# 方式1：命令行打开设置
orb settings

# 方式2：点击菜单栏OrbStack图标 -> Settings
```

### 2. 配置Docker镜像源

在 **Docker** -> **Registry Mirrors** 中添加以下镜像源（任选其一或多个）：

#### 国内镜像源（速度快）

```
https://docker.m.daocloud.io
https://docker.1panel.live
https://dockerpull.org
https://dockerhub.icu
https://docker.rainbond.cc
```

#### 配置示例

在OrbStack的配置中添加：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1panel.live",
    "https://dockerpull.org"
  ]
}
```

### 3. 重启OrbStack

```bash
# 重启OrbStack使配置生效
orb restart
```

### 4. 验证配置

```bash
# 查看Docker配置
docker info | grep -A 10 "Registry Mirrors"
```

---

## 方案二：使用国内基础镜像

老王我给你创建一个使用国内镜像的Dockerfile：

### 创建 `Dockerfile.cn`

```dockerfile
# ====================================
# 多阶段构建 - 使用国内镜像源
# ====================================
FROM registry.cn-hangzhou.aliyuncs.com/library/node:16-alpine AS builder

# 设置npm国内镜像
RUN npm config set registry https://registry.npmmirror.com

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --silent
COPY . .

ARG REACT_APP_SHOW_DETAIL=true
ARG REACT_APP_SHOW_BALANCE=true
ARG REACT_APP_BASE_URL=https://api.oaipro.com

ENV REACT_APP_SHOW_DETAIL=${REACT_APP_SHOW_DETAIL}
ENV REACT_APP_SHOW_BALANCE=${REACT_APP_SHOW_BALANCE}
ENV REACT_APP_BASE_URL=${REACT_APP_BASE_URL}

RUN npm run build

# ====================================
# 生产阶段 - 使用国内镜像
# ====================================
FROM registry.cn-hangzhou.aliyuncs.com/library/nginx:1.25-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

RUN echo -e '#!/bin/sh\ncurl -f http://localhost/ || exit 1' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/healthcheck.sh"]

CMD ["nginx", "-g", "daemon off;"]
```

### 使用国内镜像构建

```bash
# 使用国内镜像的Dockerfile
docker build -f Dockerfile.cn -t api-key-tool:latest .

# 或修改docker-compose.yml指定Dockerfile
docker-compose -f docker-compose.yml build
```

---

## 方案三：手动拉取镜像（临时方案）

### 1. 单独拉取基础镜像

```bash
# 拉取node镜像（多试几次）
docker pull node:16-alpine

# 拉取nginx镜像
docker pull nginx:1.25-alpine

# 如果失败，使用国内镜像
docker pull registry.cn-hangzhou.aliyuncs.com/library/node:16-alpine
docker pull registry.cn-hangzhou.aliyuncs.com/library/nginx:1.25-alpine

# 重新打标签
docker tag registry.cn-hangzhou.aliyuncs.com/library/node:16-alpine node:16-alpine
docker tag registry.cn-hangzhou.aliyuncs.com/library/nginx:1.25-alpine nginx:1.25-alpine
```

### 2. 然后重新构建

```bash
./deploy.sh
```

---

## 方案四：重试机制（最简单）

网络不稳定时，多试几次通常就能成功：

```bash
# 重试3次
for i in {1..3}; do
    echo "尝试第 $i 次..."
    ./deploy.sh && break
    sleep 5
done
```

---

## 方案五：使用代理（如果有）

### 配置OrbStack使用代理

```bash
# 打开OrbStack设置
orb settings

# 在Network设置中配置HTTP/HTTPS代理
# 例如：http://127.0.0.1:7890
```

### 或配置Docker daemon代理

创建/编辑 `~/.docker/config.json`:

```json
{
  "proxies": {
    "default": {
      "httpProxy": "http://127.0.0.1:7890",
      "httpsProxy": "http://127.0.0.1:7890",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}
```

---

## 推荐方案组合

老王我建议你这样搞：

### 第一步：配置镜像加速器

```bash
# 1. 打开OrbStack设置
orb settings

# 2. 添加镜像源
# Registry Mirrors 添加：
# https://docker.m.daocloud.io
# https://docker.1panel.live

# 3. 重启OrbStack
orb restart
```

### 第二步：重新部署

```bash
# 清理旧的构建缓存
docker system prune -f

# 重新执行部署
./deploy.sh
```

### 如果还是失败

使用国内镜像的Dockerfile：

```bash
# 我帮你创建了 Dockerfile.cn
docker build -f Dockerfile.cn -t api-key-tool:latest .
docker-compose up -d
```

---

## 常见问题

### Q: 为什么会出现EOF错误？

**A**: 通常是以下原因：
1. Docker Hub在国内访问不稳定
2. 网络连接超时
3. DNS解析问题
4. 防火墙/安全软件拦截

### Q: 配置镜像加速器后还是慢？

**A**: 尝试以下操作：
1. 更换其他镜像源
2. 检查网络连接
3. 使用国内基础镜像（方案二）

### Q: OrbStack和Docker Desktop配置有区别吗？

**A**: OrbStack的配置更简单：
- OrbStack: `orb settings` -> Registry Mirrors
- Docker Desktop: Preferences -> Docker Engine -> registry-mirrors

### Q: 如何验证镜像加速器生效？

```bash
# 查看Docker配置
docker info | grep -i mirror

# 或查看详细配置
docker info
```

---

## 验证修复

配置完成后，运行以下命令验证：

```bash
# 1. 清理缓存
docker system prune -f

# 2. 测试拉取镜像
docker pull node:16-alpine

# 3. 如果成功，重新部署
./deploy.sh
```

---

## 老王的建议

**最快的解决方案**：

1. 配置镜像加速器（1分钟）
2. 重启OrbStack（10秒）
3. 重新部署（2-3分钟）

**如果还是不行**：

使用我给你创建的 `Dockerfile.cn`，直接用国内镜像，保证能跑！

---

**艹！网络问题老王我见太多了，按照上面的方案肯定能搞定！** 💪
