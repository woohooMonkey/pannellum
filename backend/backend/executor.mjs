/**
 * 后端工具执行器 - 自动生成，请勿手动修改
 * 生成时间: 2026-04-02T01:56:15.943Z
 */

/**
 * 执行工具
 * @param {string} toolName - 工具名称
 * @param {Object} params - 参数
 * @returns {Object} 执行结果
 */
export function executeTool(toolName, params = {}) {
  switch (toolName) {
    case 'navigate_to_scene':
      // 跳转到指定的全景图场景。当用户想去的"目的地"是一个场景名称时使用此工具。
      console.log('[navigate_to_scene] 执行参数:', params);
      return {
        success: true,
        action: 'navigate_to_scene',
        params: params,
        timestamp: new Date().toISOString()
      };

    case 'navigate_to_marker':
      // 导航到指定的标记点。当用户想去的"目的地"是一个具体的普通标记点（如某个展品、某个位置,某个物品/动物）时使用此工具。会自动跳转到标记点所在的场景，并将视角对准该标记点。
      console.log('[navigate_to_marker] 执行参数:', params);
      return {
        success: true,
        action: 'navigate_to_marker',
        params: params,
        timestamp: new Date().toISOString()
      };

    case 'start_scene_tour':
      // 开始场景漫游，按照指定顺序依次游览多个场景。当用户想要游览多个地方时使用： 例如: "带我去大厅和会议室"、"先去大厅，再去会议室" ;【重要】sceneIds 必须按用户提到的先后顺序排列
      console.log('[start_scene_tour] 执行参数:', params);
      return {
        success: true,
        action: 'start_scene_tour',
        params: params,
        timestamp: new Date().toISOString()
      };

    case 'text_response':
      // 当无法匹配到具体操作时，返回文本响应给用户，提供可用场景和标记点列表。
      console.log('[text_response] 执行参数:', params);
      return {
        success: true,
        action: 'text_response',
        params: params,
        timestamp: new Date().toISOString()
      };

    default:
      return {
        success: false,
        error: '未知的工具: ' + toolName
      };
  }
}

export default executeTool;
