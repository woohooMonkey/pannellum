# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

全景图预览与管理系统 - 基于 Pannellum 实现全景图场景漫游，支持管理员后台管理和普通用户前端预览。

在维护此代码库时，优先保证可读性而非追求代码技巧性。在进行架构层面的修改前，请先提出澄清性问题确认需求。

## 技术栈

- **前端**：Vue2 + JavaScript + Element UI + Pannellum（CDN 引入）
- **后端**：Node.js + Express + MySQL
- **接口规范**：RESTful API，前缀 `/api/v1`

## 项目结构

```
pannellum/
├── frontend/           # Vue2 前端项目
├── backend/            # Express 后端项目
│   ├── config/         # 数据库配置
│   ├── controllers/    # 控制器（业务逻辑）
│   ├── middleware/     # 中间件（JWT 鉴权）
│   ├── routes/         # 路由定义
│   ├── uploads/        # 文件上传目录
│   └── sql/            # 数据库脚本
└── CLAUDE.md
```

## 快速开始

### 1. 环境要求

- Node.js >= 14
- MySQL >= 5.7

### 2. 后端启动

```bash
cd backend

# 安装依赖
npm install

# 配置数据库连接（编辑 .env 文件）
# 修改 DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

# 初始化数据库（首次运行）
npm run init-db

# 启动开发服务器
npm run dev
```

后端默认运行在 http://localhost:3000

### 3. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run serve
```

前端默认运行在 http://localhost:8080

## 常用命令

### 后端命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（带热重载） |
| `npm start` | 启动生产服务器 |
| `npm run init-db` | 初始化数据库和默认管理员 |

### 前端命令

| 命令 | 说明 |
|------|------|
| `npm run serve` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |

## 数据库配置

编辑 `backend/.env` 文件：

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=panorama_db
JWT_SECRET=your_jwt_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## 默认管理员账号

- 用户名：`admin`（由 .env 中 ADMIN_USERNAME 配置）
- 密码：`admin123`（由 .env 中 ADMIN_PASSWORD 配置）

## API 接口

### 认证接口
- `POST /api/v1/auth/login` - 管理员登录

### 全景图接口
- `GET /api/v1/panoramas` - 获取全景图列表
- `GET /api/v1/panoramas/main` - 获取主全景图
- `GET /api/v1/panoramas/:id` - 获取单个全景图
- `POST /api/v1/panoramas` - 上传全景图（需鉴权）
- `PUT /api/v1/panoramas/:id` - 更新全景图（需鉴权）
- `DELETE /api/v1/panoramas/:id` - 删除全景图（需鉴权）

### 标记点接口
- `GET /api/v1/markers` - 获取标记点列表
- `GET /api/v1/markers/:id` - 获取单个标记点
- `POST /api/v1/markers` - 创建标记点（需鉴权）
- `PUT /api/v1/markers/:id` - 更新标记点（需鉴权）
- `DELETE /api/v1/markers/:id` - 删除标记点（需鉴权）

## 核心架构

### Pannellum 坐标系统

标记点使用 `pitch`（俯仰角）和 `yaw`（偏航角）定位：
- `pitch`: 垂直方向角度，-90（底部）到 +90（顶部）
- `yaw`: 水平方向角度，-180 到 +180

通过 `viewer.mouseEventToCoords(event)` 获取点击位置坐标。

### 标记点类型

1. **普通标记（normal）**: 点击显示信息弹窗
2. **导航点（navigation）**: 点击切换到目标全景图场景

### 场景切换逻辑

```javascript
// 销毁当前实例
viewer.destroy();
// 创建新实例
viewer = pannellum.viewer('container', {
  type: 'equirectangular',
  panorama: newPanoramaUrl,
  hotSpots: newHotSpots
});
```

## 关键文件

| 文件 | 说明 |
|------|------|
| `backend/app.js` | Express 应用入口 |
| `backend/config/db.js` | MySQL 数据库连接池配置 |
| `backend/middleware/auth.js` | JWT 鉴权中间件 |
| `frontend/src/components/PanoramaViewer.vue` | 全景图查看器组件 |
| `frontend/src/components/MarkerEditor.vue` | 标记点编辑器组件 |
| `frontend/src/api/index.js` | API 请求封装 |
| `frontend/src/router/index.js` | 路由配置（含鉴权守卫） |

## 文件存储

全景图文件存储在 `backend/uploads/panoramas/` 目录，通过 `/uploads/panoramas/{filename}` 访问。

## 编码规范

- 使用 JavaScript（非 TypeScript）
- 函数必须添加注释说明
- 前端界面简洁现代，风格参考 Element UI，避免紫色配色
