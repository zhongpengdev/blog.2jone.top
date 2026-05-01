<script setup lang="ts">
import ReadableArea from '@/components/ReadableArea.vue';
import NavBar from '@/components/NavBar.vue';
import Footer from '@/components/Footer.vue';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const isRootPage = computed(() => route.path === '/');
</script>

<template>
  <ReadableArea>
    <NavBar :hide-home="isRootPage" />
  </ReadableArea>
  <ReadableArea class="mt-12 mb-20">
    <RouterView />
  </ReadableArea>
  <ReadableArea>
    <Footer/>
  </ReadableArea>
</template>
