<script setup lang="ts">
definePage({
  meta: {
    title: 'Wikipedia 404',
    description: 'Prototype of a Wikipedia "page not found" error page with live typeahead search.',
  },
})

import { computed, ref, onMounted, onUnmounted } from 'vue'
import * as Matter from 'matter-js'
import { globalTheme } from '@/lib/theming'
import SearchBar from '@/components/SearchBar.vue'

const theme = computed(() => globalTheme.value)
const searchRef = ref<HTMLElement | null>(null)
const globeRef = ref<HTMLDivElement | null>(null)

// IDs are column/row — rows dispatched top (1) to bottom (6)
const ROWS: string[][] = [
  ['1/1'],
  ['1/2', '3/2', '4/2'],
  ['1/3', '2/3', '3/3', '4/3'],
  ['1/4', '2/4', '3/4', '4/4'],
  ['1/5', '2/5', '3/5', '4/5'],
  ['1/6', '2/6', '3/6', '4/6'],
]

interface PieceState {
  cloneEl: SVGSVGElement
  body: Matter.Body
  initX: number
  initY: number
}

let svgEl: SVGSVGElement | null = null
let overlay: HTMLDivElement | undefined
let engine: Matter.Engine | undefined
let runner: Matter.Runner | undefined
let pieces: PieceState[] = []
let rafId = 0
let timers: ReturnType<typeof setTimeout>[] = []

function updateMenuMaxHeight() {
  if (!searchRef.value) return
  const bottom = searchRef.value.getBoundingClientRect().bottom
  const available = window.innerHeight - bottom
  document.documentElement.style.setProperty('--search-menu-max-height', `${available * 0.8}px`)
}

async function initGlobe() {
  if (!globeRef.value) return
  const res = await fetch('/wikipedia-globe-pieces.svg')
  const raw = await res.text()
  if (!globeRef.value) return  // guard: component may have unmounted during fetch
  // Make SVG responsive + remove gray background rect
  const cleaned = raw
    .replace(/(<svg\b[^>]*)\s+width="\d+"/, '$1')
    .replace(/(<svg\b[^>]*)\s+height="\d+"/, '$1')
    .replace(/<rect[^>]*fill="#F5F5F5"[^>]*\/>/, '')
  globeRef.value.innerHTML = cleaned
  svgEl = globeRef.value.querySelector('svg')
}

function startAnimation() {
  if (!svgEl || !globeRef.value) return

  const globeRect = globeRef.value.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  engine = Matter.Engine.create({ gravity: { y: 2 } })
  runner = Matter.Runner.create()

  const ground = Matter.Bodies.rectangle(vw / 2, vh + 25, vw * 3, 50, { isStatic: true })
  const wallL = Matter.Bodies.rectangle(-25, vh / 2, 50, vh * 3, { isStatic: true })
  const wallR = Matter.Bodies.rectangle(vw + 25, vh / 2, 50, vh * 3, { isStatic: true })
  Matter.Composite.add(engine.world, [ground, wallL, wallR])
  Matter.Runner.run(runner, engine)

  overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:10'
  document.body.appendChild(overlay)

  function tick() {
    for (const p of pieces) {
      const dx = p.body.position.x - p.initX
      const dy = p.body.position.y - p.initY
      p.cloneEl.style.transform = `translate(${dx}px,${dy}px) rotate(${p.body.angle}rad)`
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)

  // Dispatch rows top→bottom, randomized within each row
  let delay = 0
  for (const row of ROWS) {
    const shuffled = [...row].sort(() => Math.random() - 0.5)
    shuffled.forEach((id, i) => {
      timers.push(setTimeout(() => dropPiece(id, globeRect), delay + i * 130))
    })
    delay += shuffled.length * 130 + 220
  }
}

function dropPiece(id: string, globeRect: DOMRect) {
  if (!svgEl || !overlay || !engine) return
  const groupEl = svgEl.querySelector(`[id="${id}"]`) as SVGGElement | null
  if (!groupEl) return

  const bbox = groupEl.getBBox()
  if (bbox.width === 0 || bbox.height === 0) return

  const scaleX = globeRect.width / 100
  const scaleY = globeRect.height / 100

  // Piece center in SVG user-units → screen coords
  const svgCx = bbox.x + bbox.width / 2
  const svgCy = bbox.y + bbox.height / 2
  const screenCx = globeRect.left + svgCx * scaleX
  const screenCy = globeRect.top + svgCy * scaleY
  const pxW = bbox.width * scaleX
  const pxH = bbox.height * scaleY

  // SVG clone covering globe bounds — piece renders at its natural position
  const cloneEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
  cloneEl.setAttribute('viewBox', '0 0 100 100')
  cloneEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  // transform-origin at piece center so rotation is around the piece, not the SVG corner
  cloneEl.style.cssText = [
    'position:fixed',
    `top:${globeRect.top}px`,
    `left:${globeRect.left}px`,
    `width:${globeRect.width}px`,
    `height:${globeRect.height}px`,
    'overflow:visible',
    'pointer-events:none',
    `transform-origin:${svgCx * scaleX}px ${svgCy * scaleY}px`,
  ].join(';')
  cloneEl.appendChild(groupEl.cloneNode(true))
  overlay.appendChild(cloneEl)

  // Hole in globe
  groupEl.style.visibility = 'hidden'

  const body = Matter.Bodies.rectangle(screenCx, screenCy, pxW, pxH, {
    restitution: 0.2,
    friction: 0.6,
    frictionAir: 0.008,
  })
  // Random sideways scatter + tumble
  Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 4, y: 0 })
  Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4)
  Matter.Composite.add(engine.world, body)

  pieces.push({ cloneEl, body, initX: screenCx, initY: screenCy })
}

onMounted(async () => {
  try {
    updateMenuMaxHeight()
    window.addEventListener('resize', updateMenuMaxHeight)
    await initGlobe()
    timers.push(setTimeout(startAnimation, 1000))
  } catch (err) {
    console.error('[wikipedia-404] mounted error:', err)
  }
})

onUnmounted(() => {
  timers.forEach(clearTimeout)
  timers = []
  cancelAnimationFrame(rafId)
  if (runner) Matter.Runner.stop(runner)
  if (engine) Matter.Engine.clear(engine)
  overlay?.remove()
  overlay = undefined
  pieces = []
  svgEl = null
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
      <div
        class="not-found__globe"
        ref="globeRef"
        aria-label="Wikipedia globe logo"
        role="img"
      />
      <h1 class="not-found__heading">This page doesn't exist.</h1>
      <div class="not-found__search" ref="searchRef">
        <SearchBar @select="onSelect" @submit="onSubmit" />
      </div>
    </div>
  </div>
</template>

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

.not-found__globe :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.not-found__heading {
  margin-block: 0;
  text-align: center;
  margin-bottom: 16px;
}

.not-found__search {
  width: 100%;
}

@media (min-width: 768px) {
  .not-found {
    padding-top: 96px;
  }

  .not-found__globe {
    width: 200px;
    height: 200px;
  }
}
</style>
