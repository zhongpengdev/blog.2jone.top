<script setup lang="ts">
import { computed, useSlots, type VNode, type VNodeArrayChildren } from 'vue';
import katex from 'katex';

const props = defineProps<{
  math?: string;
}>();

const slots = useSlots();

const readChildren = (children: VNodeArrayChildren | undefined): string => {
  if (!children) {
    return '';
  }

  return children
    .map((child) => {
      if (typeof child === 'string') {
        return child;
      }

      if (typeof child === 'number') {
        return String(child);
      }

      if (Array.isArray(child)) {
        return readChildren(child);
      }

      const vnode = child as VNode;
      const nested = vnode.children;

      if (typeof nested === 'string') {
        return nested;
      }

      if (Array.isArray(nested)) {
        return readChildren(nested);
      }

      return '';
    })
    .join('')
    .trim();
};

const expression = computed(() => props.math?.trim() || readChildren(slots.default?.()));

const rendered = computed(() =>
  katex.renderToString(expression.value || '', {
    throwOnError: false,
    displayMode: true,
    output: 'html'
  })
);
</script>

<template>
  <div class="block-math" v-html="rendered"></div>
</template>
