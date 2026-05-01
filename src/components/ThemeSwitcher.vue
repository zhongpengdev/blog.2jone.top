<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Icon } from '@iconify/vue'

type Theme = 'light' | 'dark' | 'system'

const theme = ref<Theme>('system')

/**
 * Apply the theme to the document element and persist to localStorage
 */
const applyTheme = (newTheme: Theme) => {
  theme.value = newTheme
  document.documentElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
}

/**
 * Change theme without complex View Transitions
 */
const changeTheme = (nextTheme: Theme) => {
  if (theme.value === nextTheme) return
  applyTheme(nextTheme)
}

onMounted(() => {
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved) {
    theme.value = saved
  }
  document.documentElement.setAttribute('data-theme', theme.value)
})

const INDICATOR_OFFSET_MAP: Record<Theme, number> = {
  dark: 2,
  system: 32,
  light: 62,
}

const thumbStyle = computed(() => ({
  left: `${INDICATOR_OFFSET_MAP[theme.value]}px`,
}))
</script>

<template>
  <div
    class="theme-switcher relative flex items-center bg-separator p-0.5 rounded-full shadow-inner"
    role="radiogroup"
    aria-label="Theme Switcher"
  >
    <!-- Sliding Thumb -->
    <div
      class="theme-switcher-thumb absolute z-10 h-[30px] w-[30px] rounded-full bg-background shadow-sm transition-all duration-300 ease-out-cubic"
      :style="thumbStyle"
    ></div>

    <!-- Radio Buttons -->
    <div class="relative z-20 flex">
      <button
        v-for="(icon, mode) in { dark: 'lucide:moon', system: 'lucide:monitor', light: 'lucide:sun' }"
        :key="mode"
        class="flex h-[30px] w-[30px] cursor-pointer items-center justify-center transition-colors duration-200 hover:text-primary"
        :class="theme === mode ? 'text-primary' : 'text-secondary'"
        @click="changeTheme(mode as Theme)"
        :aria-label="mode"
        :aria-checked="theme === mode"
        role="radio"
      >
        <Icon :icon="icon" width="15" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-switcher {
  width: 94px; /* (30 * 3) + (2 * 2) padding */
}

/* Optimization: Avoid layout shifts for the thumb */
.theme-switcher-thumb {
  will-change: left;
}

/* Custom easing from your themes.css */
.ease-out-cubic {
  transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
}
</style>
