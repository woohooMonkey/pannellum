/**
 * 工具代码生成器
 * 读取 doc 中的配置文件，生成前后端工具代码
 */

const fs = require('fs');
const path = require('path');

// 目录配置
const DOC_DIR = path.join(__dirname, 'doc');
const BACKEND_DIR = path.join(__dirname, 'backend');
const FRONTEND_DIR = path.join(__dirname, 'frontend');

/**
 * 读取配置文件
 */
function loadConfig() {
  const filePath = path.join(DOC_DIR, 'tools.json');
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
        error: '未知的工具: ' + toolName
      };
  }
}

export default executeTool;
`;
}

/**
 * 生成后端索引文件 (index.mjs)
 */
function generateIndex() {
  return `/**
 * 后端生成代码索引 - 自动生成
 */

export { tools, getToolsForAnthropic, getToolNames } from './tools.mjs';
export { executeTool } from './executor.mjs';
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
    handler: config.handler
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
${configs.map(c => `  '${c.name}': '${c.handler}'`).join(',\n')}
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
  const backendGeneratedDir = path.join(BACKEND_DIR, 'generated');
  const frontendGeneratedDir = path.join(FRONTEND_DIR, 'src', 'generated');

  [backendGeneratedDir, frontendGeneratedDir].forEach(dir => {
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
  const backendToolsPath = path.join(backendGeneratedDir, 'tools.mjs');
  fs.writeFileSync(backendToolsPath, backendToolsCode);
  console.log(`✓ 后端工具定义已生成: ${backendToolsPath}`);

  // 生成后端执行器
  const backendExecutorCode = generateBackendExecutor(configs);
  const backendExecutorPath = path.join(backendGeneratedDir, 'executor.mjs');
  fs.writeFileSync(backendExecutorPath, backendExecutorCode);
  console.log(`✓ 后端执行器已生成: ${backendExecutorPath}`);

  // 生成后端索引
  const backendIndexPath = path.join(backendGeneratedDir, 'index.mjs');
  fs.writeFileSync(backendIndexPath, generateIndex());
  console.log(`✓ 后端索引已生成: ${backendIndexPath}`);

  // 生成前端工具定义
  const frontendToolsCode = generateFrontendTools(configs);
  const frontendToolsPath = path.join(frontendGeneratedDir, 'tools.js');
  fs.writeFileSync(frontendToolsPath, frontendToolsCode);
  console.log(`✓ 前端工具定义已生成: ${frontendToolsPath}`);

  console.log('\n========================================');
  console.log('代码生成完成!');
}

// 执行生成
generate();