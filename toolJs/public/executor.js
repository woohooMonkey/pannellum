/**
 * 安全执行器
 * 使用白名单机制执行方法，不使用eval
 */

const SafeExecutor = {
  // 已注册的方法白名单
  methods: new Map(),

  /**
   * 注册方法到白名单
   * @param {string} name - 方法名称
   * @param {Function} fn - 方法函数
   */
  register(name, fn) {
    if (typeof fn !== 'function') {
      console.error(`注册失败: ${name} 不是函数`);
      return false;
    }
    this.methods.set(name, fn);
    console.log(`已注册方法: ${name}`);
    return true;
  },

  /**
   * 批量注册方法
   * @param {Object} methodsObj - 方法对象 { name: fn, ... }
   */
  registerAll(methodsObj) {
    for (const [name, fn] of Object.entries(methodsObj)) {
      this.register(name, fn);
    }
  },

  /**
   * 安全执行方法
   * @param {string} methodName - 方法名称
   * @param {Object} params - 参数对象
   * @returns {any} - 执行结果
   */
  execute(methodName, params = {}) {
    const fn = this.methods.get(methodName);

    if (!fn) {
      const error = `安全执行器: 未知方法 "${methodName}"`;
      console.error(error);
      return { success: false, error };
    }

    try {
      const result = fn(params);
      console.log(`执行成功: ${methodName}`, params);
      return { success: true, result };
    } catch (error) {
      console.error(`执行错误: ${methodName}`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 检查方法是否已注册
   * @param {string} methodName - 方法名称
   * @returns {boolean}
   */
  hasMethod(methodName) {
    return this.methods.has(methodName);
  },

  /**
   * 获取所有已注册的方法名
   * @returns {string[]}
   */
  getMethodNames() {
    return Array.from(this.methods.keys());
  }
};

// 导出到全局
window.SafeExecutor = SafeExecutor;
