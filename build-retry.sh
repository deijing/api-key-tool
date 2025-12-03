#!/bin/bash

# ====================================
# 重试构建脚本 - 解决网络不稳定问题
# ====================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

MAX_RETRIES=5
RETRY_DELAY=10

echo "===================================="
echo "  Docker构建重试脚本"
echo "===================================="
echo ""

# 先尝试拉取基础镜像
pull_base_images() {
    echo -e "${YELLOW}[1/2]${NC} 尝试拉取基础镜像..."

    for i in $(seq 1 $MAX_RETRIES); do
        echo -e "${YELLOW}尝试 $i/$MAX_RETRIES${NC} 拉取 node:16-alpine..."
        if docker pull node:16-alpine; then
            echo -e "${GREEN}✓${NC} node:16-alpine 拉取成功"
            break
        fi

        if [ $i -lt $MAX_RETRIES ]; then
            echo -e "${RED}✗${NC} 拉取失败，${RETRY_DELAY}秒后重试..."
            sleep $RETRY_DELAY
        else
            echo -e "${RED}✗${NC} node:16-alpine 拉取失败，已达最大重试次数"
            return 1
        fi
    done

    for i in $(seq 1 $MAX_RETRIES); do
        echo -e "${YELLOW}尝试 $i/$MAX_RETRIES${NC} 拉取 nginx:1.25-alpine..."
        if docker pull nginx:1.25-alpine; then
            echo -e "${GREEN}✓${NC} nginx:1.25-alpine 拉取成功"
            break
        fi

        if [ $i -lt $MAX_RETRIES ]; then
            echo -e "${RED}✗${NC} 拉取失败，${RETRY_DELAY}秒后重试..."
            sleep $RETRY_DELAY
        else
            echo -e "${RED}✗${NC} nginx:1.25-alpine 拉取失败，已达最大重试次数"
            return 1
        fi
    done

    echo -e "${GREEN}✓${NC} 所有基础镜像拉取成功！"
    return 0
}

# 构建镜像
build_image() {
    echo ""
    echo -e "${YELLOW}[2/2]${NC} 开始构建项目镜像..."

    for i in $(seq 1 $MAX_RETRIES); do
        echo -e "${YELLOW}尝试 $i/$MAX_RETRIES${NC} 构建镜像..."
        if docker-compose build --no-cache; then
            echo -e "${GREEN}✓${NC} 镜像构建成功！"
            return 0
        fi

        if [ $i -lt $MAX_RETRIES ]; then
            echo -e "${RED}✗${NC} 构建失败，${RETRY_DELAY}秒后重试..."
            sleep $RETRY_DELAY
        else
            echo -e "${RED}✗${NC} 镜像构建失败，已达最大重试次数"
            return 1
        fi
    done
}

# 启动服务
start_service() {
    echo ""
    echo -e "${YELLOW}启动服务...${NC}"
    docker-compose up -d

    echo ""
    echo -e "${GREEN}✅ 部署完成！${NC}"
    echo ""
    echo "访问地址: http://localhost:3000"
    echo "查看日志: docker-compose logs -f"
    echo "停止服务: docker-compose down"
}

# 主流程
main() {
    if pull_base_images && build_image; then
        start_service
    else
        echo ""
        echo -e "${RED}❌ 部署失败！${NC}"
        echo ""
        echo "可能的解决方案："
        echo "1. 检查网络连接"
        echo "2. 配置Docker镜像加速器（参考 NETWORK_FIX.md）"
        echo "3. 使用代理"
        echo "4. 稍后重试"
        exit 1
    fi
}

main
