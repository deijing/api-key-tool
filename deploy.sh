#!/bin/bash

# ====================================
# API Key Tool - 一键部署脚本
# ====================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi

    print_info "Docker环境检查通过"
}

# 检查.env文件
check_env_file() {
    if [ ! -f .env ]; then
        print_warn ".env文件不存在，从.env.example创建..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_info ".env文件已创建，请根据需要修改配置"
        else
            print_error ".env.example文件不存在"
            exit 1
        fi
    else
        print_info ".env文件已存在"
    fi
}

# 停止并删除旧容器
stop_old_container() {
    print_info "停止旧容器..."
    docker-compose down 2>/dev/null || true
}

# 构建并启动容器
build_and_start() {
    print_info "开始构建Docker镜像..."
    docker-compose build --no-cache

    print_info "启动容器..."
    docker-compose up -d

    print_info "等待容器启动..."
    sleep 5
}

# 检查容器健康状态
check_health() {
    print_info "检查容器健康状态..."

    for i in {1..30}; do
        if docker-compose ps | grep -q "healthy"; then
            print_info "容器启动成功！"
            return 0
        fi
        echo -n "."
        sleep 2
    done

    print_warn "健康检查超时，但容器可能正常运行"
}

# 显示容器状态
show_status() {
    print_info "容器状态："
    docker-compose ps

    echo ""
    print_info "查看日志命令: docker-compose logs -f"
    print_info "停止服务命令: docker-compose down"
    print_info "重启服务命令: docker-compose restart"

    # 获取端口
    PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' || echo "3000")
    echo ""
    print_info "访问地址: http://localhost:${PORT}"
}

# 主函数
main() {
    echo "===================================="
    echo "  API Key Tool - 一键部署脚本"
    echo "===================================="
    echo ""

    check_docker
    check_env_file
    stop_old_container
    build_and_start
    check_health
    show_status

    echo ""
    print_info "部署完成！🎉"
}

# 执行主函数
main
