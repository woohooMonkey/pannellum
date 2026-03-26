/**
 * 主应用逻辑
 */

// UI 模块 - 主题控制
const ui = {
  setTheme(color) {
    document.documentElement.style.setProperty('--primary-color', color);
    document.querySelector('.body').style.backgroundColor = color;
    Toast.show(`主题颜色已更改为 ${color}`, 'success');
  }
};

// Toast 模块 - 通知显示
const Toast = {
  container: null,

  init() {
    this.container = document.querySelector('.toast-container');
  },

  show(message, type = 'info') {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);

    // 3秒后移除
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
};

// UI对象 - 人物控制
const UI = {
  character: null,

  init() {
    this.character = document.querySelector('.character');
  },

  // 移动人物
  mv(value) {
    if (!this.character) this.init();

    const stageWidth = 400;
    const currentValue = parseFloat(this.character.style.left) || 50;
    let newValue = currentValue + (value || 0);
    newValue = Math.max(10, Math.min(90, newValue));

    this.character.style.left = `${newValue}%`;
    this.character.style.transform = 'translateX(-50%)';

    Toast.show(`人物已移动 ${value}px`, 'success');
  },

  // 调整大小
  rs(width, height) {
    if (!this.character) this.init();

    if (width) {
      const scale = width / 100;
      this.character.style.transform = `translateX(-50%) scale(${scale})`;
    }

    Toast.show(`人物大小已调整`, 'success');
  }
};

// 应用主模块
const App = {
  messagesContainer: null,
  chatInput: null,
  sendBtn: null,
  isLoading: false,

  /**
   * 初始化应用
   */
  init() {
    // 初始化UI组件
    Toast.init();
    UI.init();

    // 注册工具到安全执行器
    this.registerTools();

    // 绑定事件
    this.bindEvents();

    // 显示已注册的工具
    console.log('已注册工具:', SafeExecutor.getMethodNames());

    Toast.show('应用已就绪，试试输入"把人物移动到右边"', 'info');
  },

  /**
   * 注册工具到安全执行器
   */
  registerTools() {
    // 注册主题切换
    SafeExecutor.register('change_theme', (params) => {
      ui.setTheme(params.color || params);
    });

    // 注册通知显示
    SafeExecutor.register('show_notification', (params) => {
      Toast.show(params.message, params.type || 'info');
    });

    // 注册移动
    SafeExecutor.register('move', (params) => {
      UI.mv(params.value || params.color || 50);
    });

    // 注册缩放
    SafeExecutor.register('resize', (params) => {
      UI.rs(params.width, params.height);
    });
  },

  /**
   * 绑定事件
   */
  bindEvents() {
    this.messagesContainer = document.querySelector('.messages-container');
    this.chatInput = document.querySelector('.chat-input');
    this.sendBtn = document.querySelector('.chat-send-btn');

    // 发送按钮点击
    this.sendBtn.addEventListener('click', () => this.sendMessage());

    // 回车发送
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
  },

  /**
   * 发送消息
   */
  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message || this.isLoading) return;

    // 显示用户消息
    this.addMessage(message, 'user');
    this.chatInput.value = '';

    // 设置加载状态
    this.setLoading(true);

    try {
      // 调用后端API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (data.success) {
        // 处理响应
        this.handleResponse(data);
      } else {
        this.addMessage(`错误: ${data.error}`, 'system');
      }
    } catch (error) {
      console.error('请求错误:', error);
      this.addMessage(`网络错误: ${error.message}`, 'system');
    } finally {
      this.setLoading(false);
    }
  },

  /**
   * 处理响应
   */
  handleResponse(data) {
    // 显示文本响应
    const textContent = data.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');

    if (textContent) {
      this.addMessage(textContent, 'assistant');
    }

    // 执行工具调用
    if (data.toolCalls && data.toolCalls.length > 0) {
      for (const toolCall of data.toolCalls) {
        const result = SafeExecutor.execute(toolCall.name, toolCall.input);

        if (result.success) {
          this.addMessage(`执行: ${toolCall.name}`, 'system');
        } else {
          this.addMessage(`执行失败: ${result.error}`, 'system');
        }
      }
    }
  },

  /**
   * 添加消息到显示区域
   */
  addMessage(text, type) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;
    this.messagesContainer.appendChild(messageEl);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  },

  /**
   * 设置加载状态
   */
  setLoading(loading) {
    this.isLoading = loading;
    this.sendBtn.disabled = loading;

    if (loading) {
      this.sendBtn.innerHTML = '<span class="loading"></span>';
    } else {
      this.sendBtn.textContent = '发送';
    }
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
