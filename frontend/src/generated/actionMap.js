/**
 * 前端动作映射 - 自动生成，请勿手动修改
 * 生成时间: 2026-03-23T06:18:28.821Z
 */

export const actionMap = {
  'move': {
      "handler": "UI.mv",
      "description": "移动对象"
  },
  'resize': {
      "handler": "UI.rs",
      "description": "修改对象的宽度或者高度"
  },
  'navigate_to_scene': {
      "handler": "viewer.loadPanorama",
      "description": "跳转到指定的全景图场景"
  },
  'start_scene_tour': {
      "handler": "viewer.startRoaming",
      "description": "开始场景漫游，按照用户输入的文本顺序依次游览多个场景"
  },
  'navigate_to_scene': {
      "handler": "viewer.loadPanorama",
      "description": "跳转到指定的全景图场景"
  }
};

export default actionMap;
