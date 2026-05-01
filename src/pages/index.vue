<script setup lang="ts">
import Logo from '@/components/Logo.vue';
import FormattedTime from '@/components/FormattedTime.vue';
import postIndex from 'virtual:postIndex';
</script>

<template>
  <main>
    <h1 class="page-title font-mono">
      <Logo />
    </h1>
    <p class="page-subtitle">
      powered by vite and markdown, performance-first
    </p>
    <div class="mt-16">
      <ul>
        <li
          v-for="post in postIndex"
          :key="post.slug"
          class="flex flex-col gap-1 mb-8"
        >
          <router-link
            class="text-xl font-semibold underline decoration-transparent hover:decoration-primary transition-colors duration-200"
            :to="`/notes/${post.slug}`"
          >
            {{ post.title }}
          </router-link>
          <FormattedTime class="text-sm text-secondary" :date-time="new Date(post.date!)" />
        </li>
      </ul>
    </div>
  </main>
</template>
