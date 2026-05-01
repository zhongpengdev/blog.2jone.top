<script setup lang="ts">
defineProps<{
  dateTime: Date;
}>();

function formatDate(date: Date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
</script>

<template>
  <time :datetime="dateTime.toISOString()">{{ formatDate(dateTime) }}</time>
</template>
