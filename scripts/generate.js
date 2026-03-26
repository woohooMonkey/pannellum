/**
 * 代码生成脚本
 * 读取 /doc 目录下的 JSON 配置文件， 生成前端和后端代码
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const DOC_DIR = path.join(__dirname, '..', 'doc');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'src', 'generated');
const BACKEND_DIR = path.join(__dirname, '..', 'backend', 'generated');

/**
 * 读取所有 JSON 配置文件
 * @returns {Array} 所有配置项的合并数组
 */
function loadConfigs() {
  const configs = [];
  const files = fs.readdirSync(DOC_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(DOC_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);

    if (Array.isArray(json)) {
      configs.push(...json);
    } else {
      configs.push(json);
    }
  }

  return configs;
}

/**
 * 生成前端 actionMap.js
 * @param {Array} configs - 配置项数组
 */
function generateActionMap(configs) {
  const actionMapEntries = configs.map(config => {
    const handlerStr = config.frontend?.handler || '';
    const descStr = config.description || '';
    return `  '${config.name}': {
    handler: "${handlerStr}",
    description: "${descStr}"
  }`;
  });

  const content = `/**
 * 前端动作映射 - 自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

export const actionMap = {
${actionMapEntries.join(',\n')}
;

export default actionMap;
`;

  // 确保目录存在
  if (!fs.existsSync(FRONTEND_DIR)) {
    fs.mkdirSync(FRONTEND_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(FRONTEND_DIR, 'actionMap.js'), content);
  console.log('已生成: frontend/src/generated/actionMap.js');
}

/**
 * 生成前端 actionCommand.js
 * @param {Array} configs - 配置项数组
 */
function generateActionCommand(configs) {
  const commands = configs.map(config => {
    // 提取参数信息
    const params = config.parameters?. properties || {};
    const required = config.parameters?. required || [];

    // 构建参数提取代码
    const paramExtraction = [];
    if (params) {
      for (const [key] of Object.entries(params)) {
        paramExtraction.push(`        ${key}: params.${key}`);
      }
    }

    // 构建验证代码
    const validationLines = [];
    if (required && required.length > 0) {
      for (const req of required) {
        validationLines.push(`    if (!params.${req}) { throw new Error(\`参数 ${req} 是必需的\`); }`);
      }
    }

    const validationBlock = validationLines.length > 0 ? validationLines.join('\n') + '\n' : '';


    const paramBlock = paramExtraction.length > 0 ? paramExtraction.join(',\n') + '';

    return `  '${config.name}': async (params) => {
${validationBlock}
    return {
      action: '${config.name}',
      params: {
${paramBlock}
      }
    };
  }`;
  });

  const content = `/**
 * 半端动作命令 - 自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

export const actionCommand = {
${commands.join(',\n')}
};

/**
 * 执行动作命令
 * @param {string} actionName - 动作名称
 * @param {Object} params - 参数
 * @returns {Promise<Object>} 动作结果
 */
export async function executeAction(actionName, params = {}) {
  if (!actionCommand[actionName]) {
    throw new Error(\`未知的动作: ${actionName}\`);
  }
  return await actionCommand[actionName](params);
}

export default actionCommand;
`;

  fs.writeFileSync(path.join(FRONTEND_DIR, 'actionCommand.js'), content);
  console.log('已生成: frontend/src/generated/actionCommand.js');
}

/**
 * 生成后端 tools.js (MCP 工具定义)
 * @param {Array} configs - 配置项数组
 */
function generateBackendTools(configs) {
  const tools = configs.map(config => {
    const paramsJson = JSON.stringify(config.parameters, null, 2);
    const indentedParams = '    ' + paramsJson.split('\n').join('\n    ');
    return `  {
    name: '${config.name}',
    description: '${config.description}',
    inputSchema: ${indentedParams}
  }`;
  });

  const content = `/**
 * 后端 MCP 工具定义 - 自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

export const tools = [
${tools.join(',\n')}
];

/**
 * 获取工具列表（用于 Anthropic API)
 * @returns {Array} 工具定义数组
 */
export function getToolsForAnthropic() {
  return tools;
}

/**
 * 获取工具名称列表
 * @returns {Array<string>} 工具名称数组
 */
export function getToolNames() {
  return tools.map(t => t.name);
}

export default tools;
`;

  // 确保目录存在
  if (!fs.existsSync(BACKEND_DIR)) {
    fs.mkdirSync(BACKEND_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(BACKEND_DIR, 'tools.mjs'), content);
  console.log('已生成: backend/generated/tools.mjs');
}

/**
 * 生成后端工具执行器
 * @param {Array} configs - 配置项数组
 */
function generateToolExecutor(configs) {
  const handlers = configs.map(config => {
    return `    case '${config.name}':
      // ${config.description}
      console.log('[${config.name}] 执行参数:', params);
      return {
        success: true,
        action: '${config.name}',
        params: params,
        timestamp: new Date().toISOString()
      };`;
  });

  const content = `/**
 * 后端工具执行器 - 自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

/**
 * 执行工具
 * @param {string} toolName - 工具名称
 * @param {Object} params - 参数
 * @returns {Object} 执行结果
 */
export function executeTool(toolName, params = {}) {
  switch (toolName) {
${handlers.join('\n')}

    default:
      return {
        success: false,
        error: \`未知的工具: ${toolName}\`
      };
  }
}

export default executeTool;
`;

  fs.writeFileSync(path.join(BACKEND_DIR, 'executor.mjs'), content);
  console.log('已生成: backend/generated/executor.mjs');
}

/**
 * 生成索引文件
 */
function generateIndex() {
  // 前端索引
  const frontendIndex = `/**
 * 前端生成代码索引 - 自动生成
 */

export { actionMap } from './actionMap.js';
export { actionCommand, executeAction } from './actionCommand.js';
`;

  fs.writeFileSync(path.join(FRONTEND_DIR, 'index.js'), frontendIndex);
  console.log('已生成: frontend/src/generated/index.js');

  // 后端索引
  const backendIndex = `/**
 * 后端生成代码索引 - 自动生成
 */

export { tools, getToolsForAnthropic, getToolNames } from './tools.mjs';
export { executeTool } from './executor.mjs';
`;

  fs.writeFileSync(path.join(BACKEND_DIR, 'index.mjs'), backendIndex);
  console.log('已生成: backend/generated/index.mjs');
}

/**
 * 主函数
 */
function main() {
  console.log('========================================');
  console.log('开始生成代码...');
  console.log('========================================\n');

  try {
    // 加载配置
    const configs = loadConfigs();
    console.log(`已加载 ${configs.length} 个配置项\n`);

    // 生成代码
    generateActionMap(configs);
    generateActionCommand(configs);
    generateBackendTools(configs);
    generateToolExecutor(configs);
    generateIndex();

    console.log('\n========================================');
    console.log('代码生成完成!');
    console.log('========================================');
  } catch (error) {
    console.error('代码生成失败:', error);
    process.exit(1);
  }
}

main();
