/**
 * 安全执行器
 * 使用白名单机制执行方法，避免使用 eval
 *
 * 核心功能：
 * 1. 工具名称白名单校验
 * 2. 工具处理器注册
 * 3. 安全执行工具调用
 */

const SafeExecutor = {
  // 已注册的方法白名单（工具名称 -> 处理函数）
  methods: new Map(),

  // 工具定义（包含描述信息）
  toolDefinitions: new Map(),

  /**
   * 注册方法到白名单
   * @param {string} name - 方法名称
   * @param {Function} fn - 方法函数
   * @param {Object} definition - 可选的工具定义信息
   * @returns {boolean} - 注册是否成功
   */
  register(name, fn, definition = null) {
    if (typeof fn !== 'function') {
      console.error(`[SafeExecutor] 注册失败: ${name} 不是函数`);
      return false;
    }
    if (typeof name !== 'string' || !name.trim()) {
      console.error('[SafeExecutor] 注册失败: 方法名称必须是非空字符串');
      return false;
    }
    if (this.methods.has(name)) {
      console.warn(`[SafeExecutor] 方法 "${name}" 已存在，将被覆盖`);
    }
    this.methods.set(name, fn);
    if (definition) {
      this.toolDefinitions.set(name, definition);
    }
    console.log(`[SafeExecutor] 已注册方法: ${name}`);
    return true;
  },

  /**
   * 批量注册方法
   * @param {Object} methodsObj - 方法对象 { name: fn, ... }
   * @param {Object} definitions - 可选的工具定义对象 { name: definition, ... }
   */
  registerAll(methodsObj, definitions = null) {
    if (!methodsObj || typeof methodsObj !== 'object') {
      console.error('[SafeExecutor] registerAll 参数无效');
      return;
    }
    for (const [name, fn] of Object.entries(methodsObj)) {
      const definition = definitions ? definitions[name] : null;
      this.register(name, fn, definition);
    }
  },

  /**
   * 从工具定义批量注册（结合 tools.js 的定义）
   * @param {Array} toolDescriptions - 工具描述数组
   * @param {Object} handlerMap - 处理器映射对象 { toolName: handlerFn }
   */
  registerFromDefinitions(toolDescriptions, handlerMap) {
    if (!Array.isArray(toolDescriptions)) {
      console.error('[SafeExecutor] registerFromDefinitions: toolDescriptions 必须是数组');
      return;
    }
    if (!handlerMap || typeof handlerMap !== 'object') {
      console.error('[SafeExecutor] registerFromDefinitions: handlerMap 必须是对象');
      return;
    }

    toolDescriptions.forEach(tool => {
      const handler = handlerMap[tool.name];
      if (handler && typeof handler === 'function') {
        this.register(tool.name, handler, tool);
      } else {
        console.warn(`[SafeExecutor] 工具 "${tool.name}" 没有对应的处理器`);
      }
    });

    console.log(`[SafeExecutor] 已注册 ${this.methods.size} 个工具`);
  },

  /**
   * 校验工具名称是否在白名单中
   * @param {string} toolName - 工具名称
   * @returns {boolean}
   */
  isValidTool(toolName) {
    return this.methods.has(toolName);
  },

  /**
   * 安全执行方法
   * @param {string} action - action 名称
   * @param {Object} params - 参数对象
   * @returns {Object} - 执行结果 { success, result/error }
   */
  execute(action, params = {}) {
    // 1. 白名单校验
    if (!this.isValidTool(action)) {
      const error = `[SafeExecutor] 拒绝执行: "${action}" 不在白名单中`;
      console.error(error);
      console.log(`[SafeExecutor] 可用方法: ${this.getMethodNames().join(', ')}`);
      return { success: false, error };
    }

    // 2. 获取处理函数
    const fn = this.methods.get(action);

    // 3. 执行工具
    try {
      console.log(`[SafeExecutor] 执行: ${action}`, params);
      const result = fn(params);
      console.log(`[SafeExecutor] 执行成功: ${action}`);
      return { success: true, result };
    } catch (error) {
      console.error(`[SafeExecutor] 执行错误: ${action}`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 异步执行方法（支持异步处理器）
   * @param {string} action - action 名称
   * @param {Object} params - 参数对象
   * @returns {Promise<Object>} - 执行结果 { success, result/error }
   */
  async executeAsync(action, params = {}) {
    // 1. 白名单校验
    if (!this.isValidTool(action)) {
      const error = `[SafeExecutor] 拒绝执行: "${action}" 不在白名单中`;
      console.error(error);
      console.log(`[SafeExecutor] 可用方法: ${this.getMethodNames().join(', ')}`);
      return { success: false, error };
    }

    // 2. 获取处理函数
    const fn = this.methods.get(action);

    // 3. 执行工具（支持异步）
    try {
      console.log(`[SafeExecutor] 异步执行: ${action}`, params);
      const result = await Promise.resolve(fn(params));
      console.log(`[SafeExecutor] 异步执行成功: ${action}`);
      return { success: true, result };
    } catch (error) {
      console.error(`[SafeExecutor] 异步执行错误: ${action}`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 批量执行工具调用
   * @param {Array} toolCalls - 工具调用数组 [{ name, input }, ...]
   * @returns {Promise<Array>} - 执行结果数组
   */
  async executeBatch(toolCalls) {
    if (!Array.isArray(toolCalls)) {
      console.error('[SafeExecutor] executeBatch 参数必须是数组');
      return [];
    }

    const results = [];
    for (const call of toolCalls) {
      const result = await this.executeAsync(call.name, call.input || call.params);
      results.push({
        name: call.name,
        ...result
      });
    }
    return results;
  },

  /**
   * 检查方法是否已注册
   * @param {string} action - action 名称
   * @returns {boolean}
   */
  hasMethod(action) {
    return this.methods.has(action);
  },

  /**
   * 获取所有已注册的方法名
   * @returns {string[]}
   */
  getMethodNames() {
    return Array.from(this.methods.keys());
  },

  /**
   * 获取工具定义
   * @param {string} name - 工具名称
   * @returns {Object|null} 工具定义
   */
  getToolDefinition(name) {
    return this.toolDefinitions.get(name) || null;
  },

  /**
   * 获取所有工具定义
   * @returns {Array} 工具定义数组
   */
  getAllToolDefinitions() {
    return Array.from(this.toolDefinitions.values());
  },

  /**
   * 清除所有已注册的方法
   */
  clear() {
    this.methods.clear();
    this.toolDefinitions.clear();
    console.log('[SafeExecutor] 已清除所有方法和定义');
  },

  /**
   * 获取执行器状态信息
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      registeredCount: this.methods.size,
      methods: this.getMethodNames(),
      hasDefinitions: this.toolDefinitions.size > 0
    };
  }
};

export default SafeExecutor;
