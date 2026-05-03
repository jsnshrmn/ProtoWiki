<script setup lang="ts">
definePage({
  meta: {
    title: 'Wikipedia 404',
    description: 'Prototype of a Wikipedia "page not found" error page with live typeahead search.',
  },
})

import { computed, ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { globalTheme } from '@/lib/theming'
import SearchBar from '@/components/SearchBar.vue'

const theme = computed(() => globalTheme.value)
const searchRef = ref<HTMLElement | null>(null)
const globeRef = ref<HTMLElement | null>(null)

// Clip-path polygons that tile the globe area (~11 irregular fragments)
const PIECES = [
  // Row 1
  'polygon(0% 0%, 34% 0%, 31% 29%, 0% 27%)',
  'polygon(34% 0%, 68% 0%, 66% 27%, 31% 29%)',
  'polygon(68% 0%, 100% 0%, 100% 27%, 66% 27%)',
  // Row 2
  'polygon(0% 27%, 31% 29%, 27% 55%, 0% 53%)',
  'polygon(31% 29%, 66% 27%, 64% 54%, 27% 55%)',
  'polygon(66% 27%, 100% 27%, 100% 53%, 64% 54%)',
  // Row 3
  'polygon(0% 53%, 27% 55%, 32% 76%, 0% 75%)',
  'polygon(27% 55%, 64% 54%, 70% 75%, 32% 76%)',
  'polygon(64% 54%, 100% 53%, 100% 75%, 70% 75%)',
  // Row 4
  'polygon(0% 75%, 32% 76%, 48% 78%, 48% 100%, 0% 100%)',
  'polygon(32% 76%, 70% 75%, 100% 75%, 100% 100%, 48% 100%, 48% 78%)',
]

function updateMenuMaxHeight() {
  if (!searchRef.value) return
  const bottom = searchRef.value.getBoundingClientRect().bottom
  const available = window.innerHeight - bottom
  document.documentElement.style.setProperty('--search-menu-max-height', `${available * 0.8}px`)
}

let tweens: gsap.core.Tween[] = []
let timer: ReturnType<typeof setTimeout> | undefined
let overlay: HTMLDivElement | undefined

onMounted(() => {
  updateMenuMaxHeight()
  window.addEventListener('resize', updateMenuMaxHeight)

  timer = setTimeout(() => {
    if (!globeRef.value) return
    const globeRect = globeRef.value.getBoundingClientRect()

    // Fixed overlay so animated pieces never extend page scroll height
    overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0'
    document.body.appendChild(overlay)

    const clones = PIECES.map(clipPath => {
      const el = document.createElement('div')
      el.style.cssText = `position:absolute;top:${globeRect.top}px;left:${globeRect.left}px;width:${globeRect.width}px;height:${globeRect.height}px;background-image:url('/wikipedia-globe.svg');background-size:100% 100%;background-repeat:no-repeat;clip-path:${clipPath}`
      overlay!.appendChild(el)
      return el
    })

    globeRef.value.style.opacity = '0'

    // Land piece bottom at viewport bottom (subtract piece height + margin)
    const fallDistance = window.innerHeight - globeRect.top - globeRect.height - 20
    const tween = gsap.to(clones, {
      y: fallDistance,
      x: () => gsap.utils.random(-40, 40),
      rotation: () => gsap.utils.random(-45, 45),
      ease: 'power2.in',
      duration: () => gsap.utils.random(0.7, 1.3),
      stagger: { each: 0.07, from: 'random' },
    })
    tweens.push(tween)
  }, 1000)
})

onUnmounted(() => {
  clearTimeout(timer)
  overlay?.remove()
  tweens.forEach(t => t.kill())
  tweens = []
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
      <div class="not-found__globe" ref="globeRef" aria-label="Wikipedia globe logo" role="img">
        <div
          v-for="(clipPath, i) in PIECES"
          :key="i"
          class="not-found__globe-piece"
          :style="{ clipPath }"
        />
      </div>
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
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 36rem;
  padding: 0 var(--spacing-100, 16px) var(--spacing-200, 32px) var(--spacing-100, 16px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.not-found__globe {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 32px;
  overflow: visible;
}

.not-found__globe-piece {
  position: absolute;
  inset: 0;
  background-image: url('/wikipedia-globe.svg');
  background-size: 100% 100%;
  background-repeat: no-repeat;
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
    width: 200px;
    height: 200px;
  }
}
</style>
