/**
 * 代码生成器
 * 读取 doc/*.json 配置文件，生成前端工具代码和后端MCP工具代码
 */

const fs = require('fs');
const path = require('path');

// 目录配置
const DOC_DIR = path.join(__dirname, '../doc');
const GENERATED_FRONTEND_DIR = path.join(__dirname, '../generated/frontend');
const GENERATED_BACKEND_DIR = path.join(__dirname, '../generated/backend');

/**
 * 读取所有配置文件
 */
function loadAllConfigs() {
  const configs = [];
  const files = fs.readdirSync(DOC_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(DOC_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    configs.push(...parsed);
  }

  return configs;
}

/**
 * 生成前端工具代码
 */
function generateFrontendTools(configs) {
  const methods = configs.map(config => {
    const paramsName = 'params';
    const handler = config.frontend.handler;
    const paramNames = Object.keys(config.parameters.properties || {});

    // 生成参数提取代码
    let handlerCall;
    if (paramNames.length === 0) {
      handlerCall = `${handler}()`;
    } else if (paramNames.length === 1) {
      handlerCall = `${handler}(${paramsName}.${paramNames[0]})`;
    } else {
      const args = paramNames.map(p => `${paramsName}.${p}`).join(', ');
      handlerCall = `${handler}(${args})`;
    }

    return `  ${config.name}: (${paramsName}) => ${handlerCall}`;
  }).join(',\n');

  return `/**
 * 前端工具方法 - 自动生成
 * 生成时间: ${new Date().toISOString()}
 */

const FrontendTools = {
${methods}
};

// 工具描述信息
const ToolDescriptions = ${JSON.stringify(configs.map(c => ({
  name: c.name,
  description: c.description,
  parameters: c.parameters
})), null, 2)};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FrontendTools, ToolDescriptions };
}
`;
}

/**
 * 生成后端MCP工具代码
 */
function generateBackendMCPTools(configs) {
  const tools = configs.map(config => {
    return {
      name: config.name,
      description: config.description,
      input_schema: {
        type: 'object',
        properties: config.parameters.properties || {},
        required: config.parameters.required || []
      }
    };
  });

  return `/**
 * 后端MCP工具定义 - 自动生成
 * 生成时间: ${new Date().toISOString()}
 */

const MCPTools = ${JSON.stringify(tools, null, 2)};

// 工具处理函数映射
const ToolHandlers = {
${configs.map(c => `  '${c.name}': (params) => {
    // 前端将执行: ${c.frontend.handler}
    return {
      success: true,
      action: '${c.name}',
      params: params,
      frontendCall: '${c.frontend.handler}'
    };
  }`).join(',\n')}
};

// 导出
module.exports = { MCPTools, ToolHandlers };
`;
}

/**
 * 主生成函数
 */
function generate() {
  console.log('开始生成代码...\n');

  // 确保输出目录存在
  [GENERATED_FRONTEND_DIR, GENERATED_BACKEND_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 加载配置
  const configs = loadAllConfigs();
  console.log(`加载了 ${configs.length} 个工具配置:`);
  configs.forEach(c => console.log(`  - ${c.name}: ${c.description}`));
  console.log('');

  // 生成前端代码
  const frontendCode = generateFrontendTools(configs);
  const frontendPath = path.join(GENERATED_FRONTEND_DIR, 'tools.js');
  fs.writeFileSync(frontendPath, frontendCode);
  console.log(`前端工具已生成: ${frontendPath}`);

  // 生成后端代码
  const backendCode = generateBackendMCPTools(configs);
  const backendPath = path.join(GENERATED_BACKEND_DIR, 'mcp-tools.js');
  fs.writeFileSync(backendPath, backendCode);
  console.log(`后端MCP工具已生成: ${backendPath}`);

  console.log('\n代码生成完成!');
}

// 执行生成
generate();
