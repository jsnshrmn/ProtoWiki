<script setup lang="ts">
definePage({
  meta: {
    title: 'Wikipedia 404',
    description: 'Prototype of a Wikipedia "page not found" error page with live typeahead search.',
  },
})

import { computed, ref, onMounted, onUnmounted } from 'vue'
import { globalTheme } from '@/lib/theming'
import SearchBar from '@/components/SearchBar.vue'

const theme = computed(() => globalTheme.value)
const searchRef = ref<HTMLElement | null>(null)

function updateMenuMaxHeight() {
  if (!searchRef.value) return
  const bottom = searchRef.value.getBoundingClientRect().bottom
  const available = window.innerHeight - bottom
  document.documentElement.style.setProperty('--search-menu-max-height', `${available * 0.8}px`)
}

onMounted(() => {
  updateMenuMaxHeight()
  window.addEventListener('resize', updateMenuMaxHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMenuMaxHeight)
})

function onSelect(title: string) {
  window.location.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

function onSubmit(query: string) {
  window.location.href = `https://en.wikipedia.org/w/index.php?title=Special:Search&search=${encodeURIComponent(query)}`
}
</script>

<template>
  <div class="not-found" :data-theme="theme">
    <div class="not-found__inner">
      <img
        class="not-found__globe"
        src="/wikipedia-globe.svg"
        alt="Wikipedia globe logo"
        width="200"
        height="200"
      />
      <h1 class="not-found__heading">This page doesn't exist.</h1>
      <div class="not-found__search" ref="searchRef">
        <SearchBar @select="onSelect" @submit="onSubmit" />
      </div>
    </div>
  </div>
</template>

<style>

</style>

<style scoped>
.not-found {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 72px;
  min-height: 100dvh;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

.not-found__inner {
  width: 100%;
  max-width: 36rem;
  padding: 0 var(--spacing-100, 16px) var(--spacing-200, 32px) var(--spacing-100, 16px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.not-found__globe {
  min-width: 120px;
  max-width: 120px;
  margin-bottom: 32px;
}

.not-found__heading {
  margin-block: 0;
  text-align: center;
  margin-bottom: 16px;
}

.not-found__search {
  width: 100%;
}

@media  (min-width: 768px) {
  .not-found {
    padding-top: 96px;
  }

  .not-found__globe {
    min-width: 200px;
  }
}
</style>
