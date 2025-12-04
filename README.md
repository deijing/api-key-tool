![img.png](img.png)

# API Key Tool - 令牌查询工具

一个优雅的API令牌查询工具，支持查看令牌余额、使用明细等信息。

> 该项目需配合NewAPI才能正常使用：[https://github.com/Calcium-Ion/new-api](https://github.com/Calcium-Ion/new-api)

## ✨ 功能特性

- 🔍 **令牌查询** - 支持查询API令牌的余额和使用情况
- 📊 **使用明细** - 详细记录每次调用的模型、时间、花费等信息
- 💰 **余额展示** - 实时显示令牌的总额、剩余额度和已用额度
- ⚙️ **界面配置** - 可在界面上直接修改配置，无需重启
- 📦 **一键部署** - 支持Docker一键部署
- 🎨 **美观界面** - 基于Semi UI的现代化界面设计
- 📈 **流量监控** - 集成Vercel Analytics流量统计和Speed Insights性能监控（生产环境自动启用）

## 🚀 快速开始

### 方式一：Docker部署（推荐）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd api-key-tool

# 2. 一键部署
./deploy.sh
```

部署完成后访问：http://localhost:3000

📖 **详细部署文档**:
- [Docker部署指南](./DOCKER_DEPLOY.md)
- [OrbStack部署指南](./ORBSTACK.md) - macOS用户推荐，性能更好

### 方式二：Vercel一键部署（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/deijing/api-key-tool)

点击上方按钮即可一键部署到Vercel，完全免费！

**部署后访问域名**：
- 固定域名：`https://api-key-tool-indol.vercel.app`
- 自定义域名：`https://nekoapi-token.vercel.app`
- 或者你自己绑定的域名（支持未备案域名）

### 方式三：本地开发

#### 1. 安装依赖

```bash
npm install
```

#### 2. 配置环境变量

复制.env.example文件为.env：
```bash
cp .env.example .env
```

修改.env文件中的配置：
```bash
# 展示使用明细
REACT_APP_SHOW_DETAIL="true"

# 展示余额
REACT_APP_SHOW_BALANCE="true"

# 填写你的API BaseURL（结尾不要带/）
REACT_APP_BASE_URL="https://api.oaipro.com"
```

#### 3. 启动开发服务器

```bash
npm start
```

访问：http://localhost:3000

#### 4. 构建生产版本

```bash
npm run build
```

## 🎯 使用说明

### 1. 输入令牌

在输入框中输入你的API令牌（格式：`sk-xxxxxxxx...`），然后点击"查询"按钮。

### 2. 查看信息

- **令牌信息面板**：显示令牌总额、剩余额度、已用额度和有效期
- **调用详情面板**：显示令牌的详细调用记录，包括时间、模型、用时、tokens数量和花费

### 3. 界面配置

点击右上角的"⚙️ 设置"按钮，可以修改以下配置：
- **展示使用明细** - 开关控制是否显示调用记录
- **展示余额** - 开关控制是否显示余额信息
- **API Base URL** - 修改API服务地址

**注意**：修改配置后需要刷新页面才能生效。

### 4. 导出数据

在调用详情面板中，可以点击"导出为CSV文件"按钮，将数据导出为CSV格式。

## 📋 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `REACT_APP_SHOW_DETAIL` | 是否展示使用明细 | `true` |
| `REACT_APP_SHOW_BALANCE` | 是否展示余额 | `true` |
| `REACT_APP_BASE_URL` | API服务地址 | `https://api.oaipro.com` |
| `PORT` | 服务端口（仅Docker） | `3000` |

### 配置优先级

1. **浏览器本地存储** - 通过界面设置修改的配置（最高优先级）
2. **环境变量** - .env文件中的配置
3. **默认值** - 代码中的默认配置

## 🛠️ 技术栈

- **前端框架**: React 18
- **UI组件库**: Semi UI
- **HTTP客户端**: Axios
- **表格导出**: PapaParse
- **通知组件**: React Toastify
- **流量统计**: Vercel Analytics
- **性能监控**: Vercel Speed Insights
- **构建工具**: React Scripts (Create React App)
- **Web服务器**: Nginx (生产环境)
- **容器化**: Docker + Docker Compose
- **支持平台**: OrbStack (推荐) / Docker Desktop

## 📦 Docker镜像信息

- **基础镜像**: node:16-alpine (构建阶段) + nginx:1.25-alpine (运行阶段)
- **镜像大小**: ~40-50MB
- **健康检查**: 每30秒检查一次
- **资源限制**: CPU 1核心 / 内存 512MB
- **日志管理**: 自动轮转，最多保留3个文件

## 🔧 开发

### 项目结构

```
api-key-tool/
├── public/              # 静态资源
├── src/
│   ├── components/      # React组件
│   │   ├── HeaderBar.js       # 顶部导航栏
│   │   ├── LogsTable.js       # 令牌查询主组件
│   │   └── SettingsPanel.js   # 设置面板
│   ├── helpers/         # 工具函数
│   │   ├── api.js            # API请求封装
│   │   ├── utils.js          # 通用工具函数
│   │   └── render.js         # 渲染辅助函数
│   ├── constants/       # 常量定义
│   ├── pages/           # 页面组件
│   └── App.js           # 应用入口
├── Dockerfile           # Docker构建文件
├── docker-compose.yml   # Docker Compose配置
├── nginx.conf          # Nginx配置
├── deploy.sh           # 一键部署脚本
└── .env.example        # 环境变量示例

```

### 可用脚本

```bash
# 启动开发服务器
npm start

# 运行测试
npm test

# 构建生产版本
npm run build

# 弹出配置（不可逆）
npm run eject
```

## 🐛 故障排查

### 令牌格式错误

确保令牌格式为 `sk-` 开头，且至少包含20个字符的字母数字组合。

### 查询失败

1. 检查API Base URL是否正确（结尾不要带 `/`）
2. 确认令牌是否有效
3. 查看浏览器控制台是否有错误信息

### Docker部署问题

请参考：[DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md) 的故障排查章节

## 📄 许可证

MIT License

## 🤝 贡献

欢��提交Issue和Pull Request！

## 📞 联系方式

如有问题或建议，请提交Issue。

---

**Made with ❤️ by 老王**
