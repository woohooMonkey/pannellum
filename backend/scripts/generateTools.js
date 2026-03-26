/**
 * 工具代码生成器
 * 读取 doc/action.json 配置文件，生成前端工具代码和后端工具代码
 */

const fs = require('fs');
const path = require('path');

// 目录配置
const DOC_DIR = path.join(__dirname, '../doc');
const GENERATED_BACKEND_DIR = path.join(__dirname, '../generated');
const GENERATED_FRONTEND_DIR = path.join(__dirname, '../../frontend/src/generated');

/**
 * 读取配置文件
 */
function loadConfig() {
  const filePath = path.join(DOC_DIR, 'action.json');
  if (!fs.existsSync(filePath)) {
    console.error(`配置文件不存在: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 生成后端工具定义 (tools.mjs)
 */
function generateBackendTools(configs) {
  const tools = configs.map(config => ({
    name: config.name,
    description: config.description,
    inputSchema: config.parameters
  }));

  return `/**
 * 后端工具定义 - 自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

export const tools = ${JSON.stringify(tools, null, 2)};

/**
 * 获取工具列表（用于 API 调用）
 * @returns {Array} 工具定义数组
 */
export function getTools() {
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
}

/**
 * 生成后端执行器 (executor.mjs)
 */
function generateBackendExecutor(configs) {
  const cases = configs.map(config => {
    return `    case '${config.name}':
      // ${config.description}
      console.log('[${config.name}] 执行参数:', params);
      return {
        success: true,
        action: '${config.name}',
        params: params,
        timestamp: new Date().toISOString()
      };`;
  }).join('\n\n');

  return `/**
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
${cases}

    default:
      return {
        success: false,
        error: \`未知的工具: \${toolName}\`,
        availableTools: [${configs.map(c => `'${c.name}'`).join(', ')}]
      };
  }
}

/**
 * 检查工具是否存在
 * @param {string} toolName - 工具名称
 * @returns {boolean}
 */
export function hasTool(toolName) {
  return [${configs.map(c => `'${c.name}'`).join(', ')}].includes(toolName);
}

export default executeTool;
`;
}

/**
 * 生成前端工具定义 (tools.js)
 */
function generateFrontendTools(configs) {
  const toolDescriptions = configs.map(config => ({
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    handler: config.frontend.handler
  }));

  return `/**
 * 前端工具定义 - 自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

// 工具描述信息
export const toolDescriptions = ${JSON.stringify(toolDescriptions, null, 2)};

// 工具名称列表（白名单）
export const toolNames = [${configs.map(c => `'${c.name}'`).join(', ')}];

// 工具处理器映射
export const toolHandlers = {
${configs.map(c => `  '${c.name}': '${c.frontend.handler}'`).join(',\n')}
};

/**
 * 检查工具是否在白名单中
 * @param {string} toolName - 工具名称
 * @returns {boolean}
 */
export function isValidTool(toolName) {
  return toolNames.includes(toolName);
}

/**
 * 获取工具处理器
 * @param {string} toolName - 工具名称
 * @returns {string|null} 处理器路径
 */
export function getToolHandler(toolName) {
  return toolHandlers[toolName] || null;
}

export default {
  toolDescriptions,
  toolNames,
  toolHandlers,
  isValidTool,
  getToolHandler
};
`;
}

/**
 * 主生成函数
 */
function generate() {
  console.log('========================================');
  console.log('开始生成工具代码...\n');

  // 确保输出目录存在
  [GENERATED_BACKEND_DIR, GENERATED_FRONTEND_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 加载配置
  const configs = loadConfig();
  if (configs.length === 0) {
    console.error('未加载到任何工具配置');
    return;
  }

  console.log(`加载了 ${configs.length} 个工具配置:`);
  configs.forEach(c => console.log(`  - ${c.name}: ${c.description}`));
  console.log('');

  // 生成后端工具定义
  const backendToolsCode = generateBackendTools(configs);
  const backendToolsPath = path.join(GENERATED_BACKEND_DIR, 'tools.mjs');
  fs.writeFileSync(backendToolsPath, backendToolsCode);
  console.log(`✓ 后端工具定义已生成: ${backendToolsPath}`);

  // 生成后端执行器
  const backendExecutorCode = generateBackendExecutor(configs);
  const backendExecutorPath = path.join(GENERATED_BACKEND_DIR, 'executor.mjs');
  fs.writeFileSync(backendExecutorPath, backendExecutorCode);
  console.log(`✓ 后端执行器已生成: ${backendExecutorPath}`);

  // 生成前端工具定义
  const frontendToolsCode = generateFrontendTools(configs);
  const frontendToolsPath = path.join(GENERATED_FRONTEND_DIR, 'tools.js');
  fs.writeFileSync(frontendToolsPath, frontendToolsCode);
  console.log(`✓ 前端工具定义已生成: ${frontendToolsPath}`);

  console.log('\n========================================');
  console.log('代码生成完成!');
}

// 执行生成
generate();
