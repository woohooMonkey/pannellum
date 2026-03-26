/**
 * 前端动作命令 - 自动生成，请勿手动修改
 * 生成时间: 2026-03-23T06:18:28.822Z
 */

export const actionCommand = {
  /**
   * 移动对象
   * @param {Object} params - 参数
   * @param {number} params.color - 移动的数值，如100
   */
  'move': async (params) => {
    if (!params.value) { throw new Error('参数 value 是必需的'); }

    return {
      action: 'move',
      params: {
      color: params.color
      }
    };
  },
  /**
   * 修改对象的宽度或者高度
   * @param {Object} params - 参数
   * @param {number} params.width - 宽度
   * @param {umbe} params.height - 高度
   */
  'resize': async (params) => {
    if (!params.message) { throw new Error('参数 message 是必需的'); }

    return {
      action: 'resize',
      params: {
      width: params.width,
      height: params.height
      }
    };
  },
  /**
   * 跳转到指定的全景图场景
   * @param {Object} params - 参数
   * @param {number} params.sceneId - 目标场景的ID
   * @param {string} params.sceneName - 目标场景的名称
   */
  'navigate_to_scene': async (params) => {
    if (!params.sceneId) { throw new Error('参数 sceneId 是必需的'); }

    return {
      action: 'navigate_to_scene',
      params: {
      sceneId: params.sceneId,
      sceneName: params.sceneName
      }
    };
  },
  /**
   * 开始场景漫游，按照指定顺序依次游览多个场景
   * @param {Object} params - 参数
   * @param {array} params.sceneIds - 漫游场景ID列表，按顺序排列
   * @param {array} params.sceneNames - 漫游场景名称列表
   */
  'start_scene_tour': async (params) => {
    if (!params.sceneIds) { throw new Error('参数 sceneIds 是必需的'); }

    return {
      action: 'start_scene_tour',
      params: {
      sceneIds: params.sceneIds,
      sceneNames: params.sceneNames
      }
    };
  },
  /**
   * 跳转到指定的全景图场景
   * @param {Object} params - 参数
   * @param {number} params.sceneId - 目标场景的ID
   * @param {string} params.sceneName - 目标场景的名称
   */
  'navigate_to_scene': async (params) => {
    if (!params.sceneId) { throw new Error('参数 sceneId 是必需的'); }

    return {
      action: 'navigate_to_scene',
      params: {
      sceneId: params.sceneId,
      sceneName: params.sceneName
      }
    };
  },
  /**
   * 开始场景漫游，按照指定顺序依次游览多个场景
   * @param {Object} params - 参数
   * @param {array} params.sceneIds - 漫游场景ID列表，按顺序排列
   * @param {array} params.sceneNames - 漫游场景名称列表
   */
  'start_scene_tour': async (params) => {
    if (!params.sceneIds) { throw new Error('参数 sceneIds 是必需的'); }

    return {
      action: 'start_scene_tour',
      params: {
      sceneIds: params.sceneIds,
      sceneNames: params.sceneNames
      }
    };
  }
};

/**
 * 执行动作命令
 * @param {string} actionName - 动作名称
 * @param {Object} params - 参数
 * @returns {Promise<Object>} 动作结果
 */
export async function executeAction(actionName, params = {}) {
  if (!actionCommand[actionName]) {
    throw new Error(`未知的动作: ${actionName}`);
  }
  return await actionCommand[actionName](params);
}

export default actionCommand;
