<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

#app {
  height: 100%;
}

/* Pannellum 自定义标记点样式 */
.custom-marker-normal {
  width: 30px;
  height: 30px;
  background-color: #409EFF;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.2s;
}

.custom-marker-normal:hover {
  transform: scale(1.2);
}

.custom-marker-navigation {
  width: 40px;
  height: 40px;
  background-color: #67C23A;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.custom-marker-navigation:hover {
  transform: scale(1.2);
}

.custom-marker-navigation::after {
  content: '';
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 15px solid #fff;
  transform: rotate(45deg);
}
</style>
