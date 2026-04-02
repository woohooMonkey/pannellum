# AI 导航系统说明文档

## 概述

本系统实现了一个智能的 AI 导航功能，能够理解用户意图并规划最优路径进行导航。导航系统包含路径规划、平滑过渡动画和进度管理等功能。

## 功能特性

### 1. 智能意图识别
- 使用智谱 AI 识别用户输入的目的地
- 支持场景导航、标记点导航和场景漫游
- 提供友好的文本响应当无法识别意图时

### 2. 路径规划算法
- 使用 BFS 算法查找最短路径
- 支持场景连通性分析
- 自动构建导航路径：导航点 → 场景 → 导航点 → 场景 → ... → 目标标记点

### 3. 平滑导航体验
- 导航点：指向 → 等待1秒 → 缩放 → 等待1秒
- 场景切换：加载 → 等待1秒
- 标记点：直接定位（1.5秒）

### 4. 进度管理
- 实时显示导航进度
- 支持暂停和停止导航
- 显示当前步骤详情

## 数据库结构

### panoramas 表
- `id`: 场景ID
- `name`: 场景名称
- `type`: 场景类型（main/main, scene/scene）
- `description`: 场景描述
- `file_path`: 全景图文件路径

### markers 表
- `id`: 标记点ID
- `panorama_id`: 所属场景ID
- `type`: 标记类型（normal/normal, navigation/navigation）
- `title`: 标题
- `description`: 描述
- `pitch`: 俯仰角
- `yaw`: 偏航角
- `target_panorama_id`: 导航目标场景ID（仅导航点使用）

## API 接口

### 导航相关接口

#### 1. 获取场景连通图
```
GET /api/v1/navigation/scene-graph
```
返回所有场景和它们之间的连接关系。

#### 2. 查找最短路径
```
POST /api/v1/navigation/find-path
{
  "fromSceneId": 1,
  "toSceneId": 2
}
```
返回从起始场景到目标场景的最短路径。

#### 3. 获取场景标记点
```
GET /api/v1/navigation/markers/:sceneId
```
获取指定场景的所有普通标记点（排除导航点）。

#### 4. 计算导航路径
```
POST /api/v1/navigation/calculate-path
{
  "currentSceneId": 1,
  "targetMarkerId": 123
}
```
计算到目标标记点的完整导航路径。

### AI 导航接口

#### 1. AI 导航请求
```
POST /api/v1/ai/navigate
{
  "input": "我想去看看那个展品",
  "currentSceneId": 1,
  "currentSceneName": "大厅"
}
```
使用 AI 识别用户意图并返回导航路径。

## 前端组件

### 1. NavigationController
导航控制器，负责管理导航队列和执行导航步骤。

```javascript
import NavigationController from '@/components/navigator/NavigationController';

// 创建实例
const navigationController = new NavigationController(viewer, eventBus);
navigationController.setCurrentPanoramaId(sceneId);

// 开始导航
await navigationController.navigateToMarker(targetMarker);
```

### 2. NavigationProgress
导航进度显示组件。

```vue
<NavigationProgress />
```

## 工具定义

### navigate_to_scene
导航到指定场景。

### navigate_to_marker
导航到指定标记点。

### start_scene_tour
开始场景漫游。

### text_response
文本响应，当无法识别用户意图时使用。

## 使用示例

### 1. 基本导航流程

```javascript
// 1. 用户输入目的地
const userInput = "我想去看看那个展品";

// 2. 调用 AI 接口
const response = await fetch('/api/v1/ai/navigate', {
  method: 'POST',
  body: JSON.stringify({
    input: userInput,
    currentSceneId: currentSceneId
  })
});

// 3. 获取导航路径
const result = await response.json();
if (result.success && result.navigationPath) {
  // 4. 执行导航
  await navigationController.executeNavigation(result.navigationPath);
}
```

### 2. 自定义导航

```javascript
// 直接计算导航路径
const pathResponse = await fetch('/api/v1/navigation/calculate-path', {
  method: 'POST',
  body: JSON.stringify({
    currentSceneId: 1,
    targetMarkerId: 123
  })
});

const path = await pathResponse.json();
if (path.success) {
  // 执行导航
  await navigationController.executeNavigation(path.data);
}
```

## 性能优化

1. **路径缓存**：可以缓存常用路径的查询结果
2. **懒加载**：只在需要时加载场景和标记点数据
3. **预加载**：提前加载下一个场景的全景图
4. **Web Worker**：将路径计算放到 Web Worker 中执行

## 注意事项

1. 确保数据库中有足够的导航点连接各个场景
2. 导航点的 target_panorama_id 必须有效
3. 前端需要正确处理场景切换和视角变化
4. 导航过程中不要频繁切换场景，可能会导致性能问题

## 扩展功能

1. **语音导航**：添加语音提示功能
2. **AR 导航**：增强现实导航体验
3. **多人导航**：支持多个用户同时导航
4. **路径分享**：分享导航路径给其他用户
5. **历史记录**：记录用户的导航历史