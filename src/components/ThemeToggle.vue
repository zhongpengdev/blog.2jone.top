<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

type ToggleMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'color-mode-preference';
const mode = ref<ToggleMode>('system');

const resolveTheme = (value: ToggleMode) => {
  if (
    value === 'system' &&
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return value === 'system' ? 'light' : value;
};

const applyTheme = (value: ToggleMode) => {
  const theme = resolveTheme(value);
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, value);
};

const pillOffset = computed(() => {
  if (mode.value === 'dark') {
    return '3px';
  }

  if (mode.value === 'system') {
    return '31px';
  }

  return '59px';
});

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY) as ToggleMode | null;

  if (stored === 'dark' || stored === 'light' || stored === 'system') {
    mode.value = stored;
  }

  applyTheme(mode.value);

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const syncWithSystem = () => {
    if (mode.value === 'system') {
      applyTheme('system');
    }
  };

  mediaQuery.addEventListener('change', syncWithSystem);
  onBeforeUnmount(() => mediaQuery.removeEventListener('change', syncWithSystem));
});

const setMode = (value: ToggleMode) => {
  mode.value = value;
  applyTheme(value);
};
</script>

<template>
  <div class="theme-toggle" aria-label="Theme switcher">
    <span class="theme-toggle__pill" :style="{ left: pillOffset }"></span>

    <button
      type="button"
      class="theme-toggle__button"
      :class="{ 'theme-toggle__button--active': mode === 'dark' }"
      aria-label="Toggle dark mode"
      title="Dark Mode"
      @click="setMode('dark')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21 14.2A9 9 0 1 1 9.8 3a7 7 0 0 0 11.2 11.2Z"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.7"
        />
      </svg>
    </button>

    <button
      type="button"
      class="theme-toggle__button"
      :class="{ 'theme-toggle__button--active': mode === 'system' }"
      aria-label="Follow system theme"
      title="Follow System"
      @click="setMode('system')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3.5"
          y="5"
          width="17"
          height="11.5"
          rx="1.8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        />
        <path
          d="M8 19h8M10.5 16.5v2.5M13.5 16.5v2.5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="1.7"
        />
      </svg>
    </button>

    <button
      type="button"
      class="theme-toggle__button"
      :class="{ 'theme-toggle__button--active': mode === 'light' }"
      aria-label="Toggle light mode"
      title="Light Mode"
      @click="setMode('light')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="4.2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        />
        <path
          d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="1.7"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.theme-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--color-toggle-track);
  isolation: isolate;
}

.theme-toggle__pill {
  position: absolute;
  top: 3px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--color-toggle-pill);
  transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.theme-toggle__button {
  position: relative;
  z-index: 1;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-toggle-icon);
  cursor: pointer;
  transition: color 0.2s linear, background-color 0.2s ease;
}

.theme-toggle__button:hover {
  background: var(--color-toggle-hover);
}

.theme-toggle__button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.theme-toggle__button--active {
  color: var(--color-toggle-active-icon);
}

.theme-toggle__button svg {
  width: 15px;
  height: 15px;
}
</style>
