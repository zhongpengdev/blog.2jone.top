<script setup lang="ts">
import ReadableArea from '@/components/ReadableArea.vue';
import NavBar from '@/components/NavBar.vue';
</script>

<template>
  <main class="relative flex min-h-[720px] h-screen flex-col items-center justify-center overflow-hidden">
    <div class="relative text-4xl md:text-6xl font-bold select-none z-0">
      <div class="opacity-20">Oops, it's 404</div>
      <div class="absolute top-0 animate-glitch-blink">
        Oops, it's 404
      </div>
    </div>

    <div class="absolute top-0 left-0 w-full h-full flex flex-col justify-between pointer-events-none z-10">
      <ReadableArea class="w-full pointer-events-auto">
        <NavBar :hide-home="false" />
      </ReadableArea>
    </div>
  </main>
</template>

<style scoped>
/* 继承 themes.css 中的动画 */
</style>
