<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  photos: ReadonlyArray<{
    src: string;
    alt: string;
    filename: string;
    width?: number;
    height?: number;
  }>;
}>();

const activeIndex = ref<number | null>(null);

const activePhoto = computed(() =>
  activeIndex.value === null ? null : props.photos[activeIndex.value] ?? null
);

const open = (index: number) => {
  activeIndex.value = index;
};

const close = () => {
  activeIndex.value = null;
};

const next = () => {
  if (activeIndex.value === null) {
    return;
  }

  activeIndex.value = (activeIndex.value + 1) % props.photos.length;
};

const prev = () => {
  if (activeIndex.value === null) {
    return;
  }

  activeIndex.value = (activeIndex.value - 1 + props.photos.length) % props.photos.length;
};
</script>

<template>
  <section class="photo-gallery">
    <button
      v-for="(photo, index) in photos"
      :key="photo.filename"
      type="button"
      class="photo-gallery__item"
      :aria-label="`View photo ${index + 1}`"
      @click="open(index)"
    >
      <img
        :src="photo.src"
        :alt="photo.alt"
        :width="photo.width"
        :height="photo.height"
        class="photo-gallery__thumb"
        loading="lazy"
        decoding="async"
      />
    </button>

    <div v-if="activePhoto" class="photo-lightbox" @click.self="close">
      <button type="button" class="photo-lightbox__close" aria-label="Close photo" @click="close">
        ×
      </button>
      <button type="button" class="photo-lightbox__nav photo-lightbox__nav--prev" @click="prev">
        ‹
      </button>
      <figure class="photo-lightbox__figure">
        <img
          :src="activePhoto.src"
          :alt="activePhoto.alt"
          :width="activePhoto.width"
          :height="activePhoto.height"
          class="photo-lightbox__image"
          decoding="async"
        />
      </figure>
      <button type="button" class="photo-lightbox__nav photo-lightbox__nav--next" @click="next">
        ›
      </button>
    </div>
  </section>
</template>

<style scoped>
.photo-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 2.2rem;
}

.photo-gallery__item {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
  overflow: hidden;
}

.photo-gallery__thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease, filter 0.35s ease;
}

.photo-gallery__item:hover .photo-gallery__thumb {
  transform: scale(1.03);
  filter: contrast(1.03);
}

.photo-lightbox {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 12, 0.92);
  padding: 2rem;
}

.photo-lightbox__figure {
  margin: 0;
  max-width: min(1200px, calc(100vw - 7rem));
  max-height: calc(100vh - 4rem);
}

.photo-lightbox__image {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 4rem);
  object-fit: contain;
}

.photo-lightbox__close,
.photo-lightbox__nav {
  border: 0;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
}

.photo-lightbox__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  font-size: 1.8rem;
  line-height: 1;
}

.photo-lightbox__nav {
  width: 44px;
  height: 72px;
  border-radius: 999px;
  font-size: 2rem;
  line-height: 1;
}

.photo-lightbox__nav--prev {
  margin-right: 1rem;
}

.photo-lightbox__nav--next {
  margin-left: 1rem;
}

@media (max-width: 900px) {
  .photo-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .photo-gallery {
    grid-template-columns: 1fr;
  }

  .photo-lightbox {
    padding: 1rem;
  }

  .photo-lightbox__figure {
    max-width: calc(100vw - 4rem);
  }

  .photo-lightbox__nav {
    width: 38px;
    height: 60px;
  }
}
</style>
