<script setup lang="ts">
import Logo from './Logo.vue';

defineProps<{
  hideHome?: boolean;
}>();
</script>

<template>
  <nav
    class="flex h-24 items-center transition-transform ease-out-cubic duration-500"
    :class="{ '-translate-x-24': hideHome }"
  >
    <router-link
      class="inline-block w-24 font-mono font-bold transition-all duration-500"
      :class="{ 'opacity-0 blur-xs': hideHome }"
      to="/"
    >
      <Logo />
    </router-link>
    <router-link
      class="text-secondary hover:text-primary transition-all duration-500"
      :class="{ 'opacity-0 blur-xs': !hideHome }"
      to="/about"
    >
      about
    </router-link>
  </nav>
</template>
