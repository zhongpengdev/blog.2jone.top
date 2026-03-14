<script setup lang="ts">
import { Icon } from '@iconify/vue';

withDefaults(
  defineProps<{
    name: string;
    size?: string | number;
    class?: string;
  }>(),
  {
    size: 18
  }
);
</script>

<template>
  <Icon :icon="name" :width="size" :height="size" :class="$props.class" aria-hidden="true" />
</template>
