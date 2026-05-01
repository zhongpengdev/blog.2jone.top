<template>
  <div class="smart-image-container" ref="container">
    <div v-if="loading && !error" class="skeleton-loader"></div>
    <transition name="fade">
      <img
        v-if="isVisible && !error"
        :src="src"
        :alt="alt"
        @load="onLoad"
        @error="onError"
        :class="{ loaded: !loading }"
        loading="lazy"
        decoding="async"
      />
    </transition>
    <div v-if="error" class="error-placeholder">
      <span>Failed to load image</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{
  src: string;
  alt?: string;
}>();

const isVisible = ref(false);
const loading = ref(true);
const error = ref(false);
const container = ref<HTMLElement | null>(null);

const onLoad = () => {
  loading.value = false;
};

const onError = () => {
  loading.value = false;
  error.value = true;
};

onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      isVisible.value = true;
      observer.disconnect();
    }
  }, {
    rootMargin: '200px', // 提前 200px 开始加载
  });

  if (container.value) {
    observer.observe(container.value);
  }
});
</script>

<style scoped>
.smart-image-container {
  position: relative;
  width: 100%;
  min-height: 100px;
  background: var(--color-background-secondary, #f4f4f4);
  border-radius: 8px;
  overflow: hidden;
  margin: 1.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
}

img.loaded {
  opacity: 1;
}

.skeleton-loader {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.error-placeholder {
  font-size: 0.8rem;
  color: #999;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.fade-enter-active {
  transition: opacity 0.5s;
}
.fade-enter-from {
  opacity: 0;
}
</style>
