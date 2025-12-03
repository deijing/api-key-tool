#!/bin/bash

# ====================================
# Docker配置检查脚本
# ====================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "===================================="
echo "  Docker配置检查"
echo "===================================="
echo ""

# 检查必需文件
echo "📋 检查必需文件..."
files=(
    "Dockerfile"
    "docker-compose.yml"
    "nginx.conf"
    ".dockerignore"
    ".env.example"
    "deploy.sh"
    "package.json"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file 缺失"
        exit 1
    fi
done

echo ""
echo "📦 检查Docker环境..."

# 检查Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓${NC} Docker已安装: $DOCKER_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Docker未安装"
fi

# 检查Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✓${NC} Docker Compose已安装: $COMPOSE_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Docker Compose未安装"
fi

echo ""
echo "🔍 检查配置文件语法..."

# 检查docker-compose.yml语法
if command -v docker-compose &> /dev/null; then
    if docker-compose config > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} docker-compose.yml语法正确"
    else
        echo -e "${RED}✗${NC} docker-compose.yml语法错误"
        docker-compose config
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC} 跳过docker-compose.yml语法检查（Docker Compose未安装）"
fi

# 检查Dockerfile语法（简单检查）
if grep -q "FROM" Dockerfile && grep -q "COPY" Dockerfile; then
    echo -e "${GREEN}✓${NC} Dockerfile基本语法正确"
else
    echo -e "${RED}✗${NC} Dockerfile可能有问题"
fi

# 检查nginx.conf语法（简单检查）
if grep -q "server {" nginx.conf && grep -q "listen 80" nginx.conf; then
    echo -e "${GREEN}✓${NC} nginx.conf基本语法正确"
else
    echo -e "${RED}✗${NC} nginx.conf可能有问题"
fi

echo ""
echo "📊 统计信息..."
echo "- Dockerfile行数: $(wc -l < Dockerfile)"
echo "- nginx.conf行数: $(wc -l < nginx.conf)"
echo "- docker-compose.yml行数: $(wc -l < docker-compose.yml)"

echo ""
echo -e "${GREEN}✅ Docker配置检查完成！${NC}"
echo ""
echo "下一步操作："
echo "  1. 运行 ./deploy.sh 进行一键部署"
echo "  2. 或手动执行："
echo "     docker-compose build"
echo "     docker-compose up -d"
echo ""
