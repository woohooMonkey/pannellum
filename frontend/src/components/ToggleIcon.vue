<template>
  <div class="icon-circle" :class="{ 'active': isActive }" @click="handleClick" @mouseenter="showTitle = true" @mouseleave="showTitle = false">
    <svg class="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        v-if="type === 'menu'"
        d="M3 12H21M3 6H21M3 18H21"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        v-else-if="type === 'close'"
        d="M6 18L18 6M6 6l12 12"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        v-else-if="type === 'arrow'"
        d="M9 18l6-6-6-6"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        v-else
        d="M3 12H21M3 6H21M3 18H21"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <div class="icon-title" v-if="title && showTitle">{{ title }}</div>
  </div>
</template>

<script>
export default {
  name: 'ToggleIcon',
  props: {
    type: {
      type: String,
      default: 'menu',
      validator: (value) => ['menu', 'close', 'arrow'].includes(value)
    },
    isActive: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      showTitle: false
    }
  },
  methods: {
    handleClick() {
      this.$emit('toggle');
    }
  }
}
</script>

<style scoped>
.icon-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  backdrop-filter: blur(10px);
}

.icon-circle:hover {
  background-color: rgba(0, 0, 0, 0.3);
  transform: scale(1.05);
}

.icon-circle.active {
  background-color: rgba(64, 158, 255, 0.3);
}

.icon-circle.active:hover {
  background-color: rgba(64, 158, 255, 0.4);
}

.icon-svg {
  width: 16px;
  height: 16px;
  color: white;
  transition: all 0.3s ease;
}

.icon-circle:hover .icon-svg {
  transform: scale(1.1);
}

.icon-title {
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 13px;
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.6);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  line-height: 1.4;
}

.icon-circle:hover .icon-title {
  opacity: 1;
}
</style>