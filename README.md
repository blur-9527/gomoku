# 五子棋对战网页

一个基于 WebSocket 实现的五子棋对战网页，支持双人跨设备实时对战。

## 🎮 功能特性

- **标准五子棋**: 15×15 标准棋盘，支持五子连珠判定
- **房间系统**: 创建房间、输入房间号加入
- **分享功能**: 支持分享邀请链接和房间号
- **准备机制**: 双方都准备后才开始游戏
- **倒计时开始**: 准备完成后 3-2-1 倒计时
- **悔棋功能**: 需要对方确认才能悔棋
- **投降功能**: 支持投降认输
- **再次对局**: 游戏结束后可发起再次对战
- **响应式设计**: 适配桌面和移动端
- **跨设备对战**: 支持电脑、手机等不同设备对战

## 🛠️ 技术栈

- **前端**: HTML5 + CSS3 + JavaScript
- **后端**: Node.js + Express
- **实时通信**: Socket.io
- **部署**: Vercel / Render / Heroku

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 访问 http://localhost:3000
```

### 测试方法

1. 打开第一个浏览器（或设备），进入首页，点击"创建房间"
2. 打开第二个浏览器（或设备），进入首页，点击"加入房间"，输入房间号
3. 双方都点击"准备"按钮，等待倒计时后开始游戏

## 📦 部署到 Vercel

### 方法一：使用 Vercel CLI

1. 安装 Vercel CLI：
```bash
npm install -g vercel
```

2. 登录 Vercel：
```bash
vercel login
```

3. 创建 `vercel.json` 配置文件：
```json
{
  "builds": [
    { "src": "server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "server.js" }
  ]
}
```

4. 进入项目目录并部署：
```bash
cd path/to/blur-wzq
vercel --prod
```

### 方法二：使用 GitHub 仓库

1. 将项目推送到 GitHub 仓库
2. 访问 [Vercel](https://vercel.com/) 并登录
3. 点击 "New Project"，选择你的 GitHub 仓库
4. 在配置页面：
   - **Framework Preset**: 选择 `Other`
   - **Root Directory**: 留空或设置为 `.`
   - **Build Command**: 留空
5. 点击 "Deploy" 完成部署

## 🌐 部署到其他平台

### 部署到 Render

1. 访问 [Render](https://render.com/) 并登录
2. 点击 "New" > "Web Service"
3. 选择你的 GitHub 仓库
4. 配置：
   - **Name**: 输入项目名称
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Port**: 3000
5. 点击 "Create Web Service"

### 部署到 Heroku

1. 安装 Heroku CLI：
```bash
npm install -g heroku
```

2. 登录 Heroku：
```bash
heroku login
```

3. 创建 Heroku 应用：
```bash
heroku create your-app-name
```

4. 部署：
```bash
git push heroku main
```

5. 打开应用：
```bash
heroku open
```

## 📁 文件结构

```
blur-wzq/
├── public/
│   ├── index.html    # 主页（创建房间/加入房间）
│   └── game.html     # 游戏页面
├── server.js         # 后端服务器（Express + Socket.io）
├── package.json      # 项目配置
├── vercel.json       # Vercel 部署配置
└── README.md         # 项目说明文档
```

## 🔌 API 接口

### 创建房间

**POST** `/create-room`

响应：
```json
{
  "success": true,
  "roomId": "ABC123"
}
```

### 加入房间

**POST** `/join-room`

请求体：
```json
{
  "roomId": "ABC123"
}
```

响应：
```json
{
  "success": true
}
```

## 📡 WebSocket 事件

| 事件名 | 说明 | 方向 |
|--------|------|------|
| `createRoom` | 创建房间 | 客户端 → 服务器 |
| `joinRoom` | 加入房间 | 客户端 → 服务器 |
| `ready` | 玩家准备 | 客户端 → 服务器 |
| `move` | 落子 | 双向 |
| `undoRequest` | 请求悔棋 | 客户端 → 服务器 → 客户端 |
| `undoResponse` | 悔棋响应 | 客户端 → 服务器 → 客户端 |
| `surrender` | 投降 | 客户端 → 服务器 |
| `rematch` | 请求再次对局 | 客户端 → 服务器 → 客户端 |
| `exit` | 退出房间 | 客户端 → 服务器 |
| `gameStart` | 游戏开始 | 服务器 → 客户端 |
| `gameEnd` | 游戏结束 | 服务器 → 客户端 |
| `opponentJoined` | 对手加入 | 服务器 → 客户端 |
| `playerReady` | 玩家准备 | 服务器 → 客户端 |

## 🎯 游戏规则

1. **黑方先行**: 黑方玩家首先落子
2. **轮流下棋**: 双方轮流在棋盘上放置棋子
3. **获胜条件**: 任意一方在横、竖、斜方向连成五子即为获胜
4. **悔棋规则**: 需要对方同意才能撤回上一步
5. **投降规则**: 可以随时投降，投降后对方获胜

## ⚠️ 注意事项

- 需要部署后端服务器才能实现跨设备对战
- 本地测试时，确保所有玩家连接到同一网络
- Socket.io 会自动处理断线重连
- 房间在最后一个玩家离开后会自动销毁

## 📝 更新日志

### v1.0.0
- 初始版本
- 支持基本五子棋对战
- 支持房间系统
- 支持准备机制和倒计时
- 支持悔棋和投降功能
- 支持再次对局功能

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**享受五子棋对战的乐趣！** 🎉
