<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue';

defineProps<{
  copyrightName: string;
  socialLinks: ReadonlyArray<{
    label: string;
    href: string;
  }>;
}>();

const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__column">
      <div class="site-footer__copyright">&copy; {{ year }} {{ copyrightName }}</div>

      <div class="site-footer__socials">
        <a
          v-for="link in socialLinks"
          :key="link.href"
          :href="link.href"
          class="site-footer__social-link"
          :target="link.href.startsWith('http') ? '_blank' : undefined"
          :rel="link.href.startsWith('http') ? 'noopener noreferrer' : undefined"
        >
          {{ link.label }}
        </a>
      </div>
    </div>

    <ThemeToggle />
  </footer>
</template>

<style scoped>
.site-footer {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border-soft);
}

.site-footer__column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}

.site-footer__copyright {
  color: var(--color-muted);
  font-size: 0.875rem;
  font-weight: 400;
  opacity: 0.7;
}

.site-footer__socials {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  flex-wrap: wrap;
}

.site-footer__social-link {
  display: inline-flex;
  align-items: center;
  color: var(--color-muted);
  opacity: 0.75;
  text-decoration: none;
  font-size: 0.92rem;
  transition: color 0.3s ease, opacity 0.3s ease;
}

.site-footer__social-link:hover {
  color: var(--color-heading);
  opacity: 1;
}

.site-footer__social-link:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 3px;
  border-radius: 3px;
}

@media (max-width: 639px) {
  .site-footer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 1.25rem;
    padding-top: 1.25rem;
  }

  .site-footer__column {
    width: auto;
  }

  .site-footer__copyright {
    font-size: 0.95rem;
  }

  .site-footer__socials {
    gap: 0.85rem;
  }

  .site-footer :deep(.theme-toggle) {
    justify-self: end;
    align-self: end;
  }
}
</style>
