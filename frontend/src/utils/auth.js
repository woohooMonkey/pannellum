/**
 * 鉴权相关工具函数
 */

// Token 存储 Key
const TOKEN_KEY = 'admin_token';
const USERNAME_KEY = 'admin_username';

/**
 * 获取存储的 Token
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 设置 Token
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 移除 Token
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 获取存储的用户名
 */
export function getUsername() {
  return localStorage.getItem(USERNAME_KEY);
}

/**
 * 设置用户名
 */
export function setUsername(username) {
  localStorage.setItem(USERNAME_KEY, username);
}

/**
 * 移除用户名
 */
export function removeUsername() {
  localStorage.removeItem(USERNAME_KEY);
}

/**
 * 检查是否已登录
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * 清除所有登录信息
 */
export function clearAuth() {
  removeToken();
  removeUsername();
}
