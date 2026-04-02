/**
 * 半端动作命令 - 自动生成，请勿手动修改
 * 生成时间: 2026-04-02T01:38:52.150Z
 */

export const actionCommand = {
  'navigate_to_scene': async (params) => {
    if (!params.sceneId) { throw new Error(`参数 sceneId 是必需的`); }
    if (!params.sceneName) { throw new Error(`参数 sceneName 是必需的`); }

    return {
      action: 'navigate_to_scene',
      params: {
        sceneId: params.sceneId,
        sceneName: params.sceneName
      }
    };
  },
  'navigate_to_marker': async (params) => {
    if (!params.markerId) { throw new Error(`参数 markerId 是必需的`); }
    if (!params.sceneId) { throw new Error(`参数 sceneId 是必需的`); }
    if (!params.markerTitle) { throw new Error(`参数 markerTitle 是必需的`); }
    if (!params.sceneName) { throw new Error(`参数 sceneName 是必需的`); }

    return {
      action: 'navigate_to_marker',
      params: {
        markerId: params.markerId,
        markerTitle: params.markerTitle,
        sceneId: params.sceneId,
        sceneName: params.sceneName
      }
    };
  },
  'start_scene_tour': async (params) => {
    if (!params.sceneIds) { throw new Error(`参数 sceneIds 是必需的`); }

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
    throw new Error('未知的动作: ' + actionName);
  }
  return await actionCommand[actionName](params);
}

export default actionCommand;
