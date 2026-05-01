<script setup lang="ts">
import { Icon } from '@iconify/vue';
import ThemeSwitcher from './ThemeSwitcher.vue';
import me from '../../data/me.json';
</script>

<template>
  <footer class="mt-20 flex flex-col gap-8 border-t border-separator py-10 text-secondary">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-6">
        <a 
          v-for="link in me.links" 
          :key="link.title"
          :href="link.url" 
          target="_blank" 
          class="hover:text-primary transition-colors duration-200"
          :title="link.title"
        >
          <Icon :icon="link.icon" width="20" />
        </a>
      </div>

      <div class="flex items-center gap-4">
        <ThemeSwitcher />
      </div>
    </div>
  </footer>
</template>
