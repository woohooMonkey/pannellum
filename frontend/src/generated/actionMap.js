/**
 * 前端动作映射 - 自动生成，请勿手动修改
 * 生成时间: 2026-04-02T01:38:52.149Z
 */

export const actionMap = {
  'navigate_to_scene': {
    handler: "navigator.navigateToScene",
    description: "跳转到指定的全景图场景。当用户想去的"目的地"是一个场景名称时使用此工具。"
  },
  'navigate_to_marker': {
    handler: "navigator.navigateToMarker",
    description: "导航到指定的标记点。当用户想去或者想找的的"目的地"是一个具体的普通标记点（如某个展品、某个位置,某个物品/动物）时使用此工具。会自动跳转到标记点所在的场景，并将视角对准该标记点。"
  },
  'start_scene_tour': {
    handler: "navigator.startSceneTour",
    description: "开始场景漫游，按照指定顺序依次游览多个场景。当用户想要游览多个地方时使用： 例如: "带我去大厅和会议室"、"先去大厅，再去会议室" ;【重要】sceneIds 必须按用户提到的先后顺序排列"
  }
};

export default actionMap;
