<script setup lang="ts">
import { ref } from 'vue';

type WorkLinkMap = Record<string, string>;

defineProps<{
  projects: ReadonlyArray<{
    name: string;
    description: string;
    tags: readonly string[];
    links: WorkLinkMap;
  }>;
  publications: ReadonlyArray<{
    title: string;
    authors: readonly string[];
    journal: string;
    time: string;
    links: WorkLinkMap;
  }>;
}>();

const activeTab = ref<'projects' | 'publications'>('projects');
</script>

<template>
  <section class="works-tabs">
    <div class="works-tabs__nav" role="tablist" aria-label="Works categories">
      <button
        type="button"
        class="works-tabs__button"
        :class="{ 'works-tabs__button--active': activeTab === 'projects' }"
        @click="activeTab = 'projects'"
      >
        Projects
      </button>
      <button
        type="button"
        class="works-tabs__button"
        :class="{ 'works-tabs__button--active': activeTab === 'publications' }"
        @click="activeTab = 'publications'"
      >
        Publications
      </button>
    </div>

    <div v-if="activeTab === 'projects'" class="works-tabs__panel">
      <article v-for="project in projects" :key="project.name" class="work-card">
        <div class="work-card__head">
          <h2 class="work-card__title">{{ project.name }}</h2>
          <div class="work-card__links">
            <a
              v-for="(url, label) in project.links"
              :key="label"
              :href="url"
              target="_blank"
              rel="noreferrer"
              class="work-card__link"
            >
              [{{ label }}]
            </a>
          </div>
        </div>

        <p class="work-card__description">{{ project.description }}</p>

        <div class="work-card__tags">
          <span v-for="tag in project.tags" :key="tag" class="work-card__tag">{{ tag }}</span>
        </div>
      </article>
    </div>

    <div v-else class="works-tabs__panel works-tabs__panel--empty">
      <p>Null</p>
    </div>
  </section>
</template>

<style scoped>
.works-tabs {
  margin-top: 2.6rem;
}

.works-tabs__nav {
  display: flex;
  gap: 0.6rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid var(--color-border-soft);
}

.works-tabs__button {
  border: 0;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
}

.works-tabs__button:hover {
  color: var(--color-heading);
}

.works-tabs__button--active {
  background: var(--color-skill-bg);
  color: var(--color-heading);
}

.works-tabs__panel {
  margin-top: 1.6rem;
}

.works-tabs__panel--empty {
  color: var(--color-text);
  font-size: 1rem;
  line-height: 1.8;
}

.work-card {
  padding: 1.35rem 0;
  border-bottom: 1px solid var(--color-border-soft);
}

.work-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.work-card__title {
  margin: 0;
  color: var(--color-heading);
  font-size: 1.1rem;
  line-height: 1.35;
  font-weight: 600;
}

.work-card__links {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.work-card__link {
  color: var(--color-muted);
  text-decoration: none;
  font-size: 0.85rem;
}

.work-card__description {
  margin: 0;
  color: var(--color-text);
  line-height: 1.8;
}

.work-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.9rem;
}

.work-card__tag {
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: var(--color-skill-bg);
  color: var(--color-muted);
  font-size: 0.78rem;
}
</style>
