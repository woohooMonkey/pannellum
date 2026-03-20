<template>
  <div class="login-container">
    <div class="login-box">
      <h2 class="login-title">全景图管理系统</h2>
      <p class="login-subtitle">管理员登录</p>

      <el-form ref="loginForm" :model="form" :rules="rules" @submit.native.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            prefix-icon="el-icon-user"
            placeholder="请输入用户名"
            size="large"
          ></el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            prefix-icon="el-icon-lock"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter.native="handleLogin"
          ></el-input>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            style="width: 100%;"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <el-link type="primary" href="/preview">返回首页预览</el-link>
      </div>
    </div>
  </div>
</template>

<script>
import { authApi } from '@/api';
import { setToken, setUsername } from '@/utils/auth';

export default {
  name: 'AdminLogin',
  data() {
    return {
      form: {
        username: '',
        password: ''
      },
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' }
        ]
      },
      loading: false
    };
  },
  methods: {
    async handleLogin() {
      this.$refs.loginForm.validate(async (valid) => {
        if (!valid) return;

        this.loading = true;
        try {
          const res = await authApi.login(this.form);
          if (res.success) {
            // 保存登录信息
            setToken(res.data.token);
            setUsername(res.data.username);

            this.$message.success('登录成功');

            // 跳转到管理页面
            const redirect = this.$route.query.redirect || '/admin';
            this.$router.push(redirect);
          }
        } catch (error) {
          this.$message.error(error.message || '登录失败，请检查用户名和密码');
        } finally {
          this.loading = false;
        }
      });
    }
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.login-title {
  text-align: center;
  color: #303133;
  margin-bottom: 10px;
}

.login-subtitle {
  text-align: center;
  color: #909399;
  margin-bottom: 30px;
  font-size: 14px;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
}
</style>
