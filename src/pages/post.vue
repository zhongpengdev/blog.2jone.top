<script setup lang="ts">
import { useRoute } from 'vue-router';
import posts from 'virtual:post';
import postIndex from 'virtual:postIndex';
import FormattedTime from '@/components/FormattedTime.vue';

const route = useRoute();
const slug = route.params.slug as string;
const PostContent = posts[slug];
const metadata = postIndex.find(p => p.slug === slug);
</script>

<template>
  <main>
    <h1 class="page-title">{{ metadata?.title }}</h1>
    <p v-if="metadata?.date" class="page-subtitle">
      <FormattedTime :date-time="new Date(metadata.date)" />
    </p>
    <article class="mt-16 md-reader">
      <PostContent />
    </article>
  </main>
</template>
