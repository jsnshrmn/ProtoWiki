<script setup lang="ts">
definePage({
  meta: {
    title: 'Wikipedia 404',
    description: 'Prototype of a Wikipedia "page not found" error page with live typeahead search.',
  },
})

import { computed, ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import * as Matter from 'matter-js'
import { globalTheme } from '@/lib/theming'
import SearchBar from '@/components/SearchBar.vue'

const theme = computed(() => globalTheme.value)
const searchRef = ref<HTMLElement | null>(null)
const globeRef = ref<HTMLDivElement | null>(null)
const isDebug = new URLSearchParams(window.location.search).has('debug')

// IDs are column/row — rows dispatched top (1) to bottom (6)
const ROWS: string[][] = [
  ['1/1'],
  ['1/2', '3/2', '4/2'],
  ['1/3', '2/3', '3/3', '4/3'],
  ['1/4', '2/4', '3/4', '4/4'],
  ['1/5', '2/5', '3/5', '4/5'],
  ['1/6', '2/6', '3/6', '4/6'],
]

// All tuneable variables in one place
const config = reactive({
  // Physics — gravity updates live; others apply on restart
  gravityY:    6,
  gravityX:    0,
  restitution: 0.2,
  friction:    1,
  frictionAir: 0.050,
  // Timing
  staggerMs:   40,   // ms between pieces within a row
  rowGapMs:    40,   // ms gap added after each row
  speedupRate: 0.05,  // fraction faster per row (0 = uniform, 0.18 = row 6 is ~3× faster)
  // Initial motion
  velocityBase: 0,    // peak horizontal velocity (px/step)
  angularBase:  0,  // peak angular velocity (rad/step)
})

// Apply gravity changes live
watch([() => config.gravityY, () => config.gravityX], () => {
  if (engine) {
    engine.gravity.y = config.gravityY
    engine.gravity.x = config.gravityX
  }
})

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
let orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null

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
  if (!globeRef.value) return
  const cleaned = raw
    .replace(/(<svg\b[^>]*)\s+width="\d+"/, '$1')
    .replace(/(<svg\b[^>]*)\s+height="\d+"/, '$1')
    .replace(/<rect[^>]*fill="#F5F5F5"[^>]*\/>/, '')
  globeRef.value.innerHTML = cleaned
  svgEl = globeRef.value.querySelector('svg')
}

function teardown() {
  timers.forEach(clearTimeout)
  timers = []
  cancelAnimationFrame(rafId)
  if (runner) Matter.Runner.stop(runner)
  if (engine) Matter.Engine.clear(engine)
  engine = undefined
  runner = undefined
  overlay?.remove()
  overlay = undefined
  pieces = []
}

function resetPieceVisibility() {
  svgEl?.querySelectorAll<SVGGElement>('g[id]').forEach(g => {
    g.style.visibility = ''
  })
}

function startAnimation() {
  if (!svgEl || !globeRef.value) return

  const globeRect = globeRef.value.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  const totalPieces = ROWS.flat().length
  engine = Matter.Engine.create({ gravity: { x: config.gravityX, y: config.gravityY }, enableSleeping: true })
  runner = Matter.Runner.create()

  const ground = Matter.Bodies.rectangle(vw / 2, vh + 25, vw * 3, 50, { isStatic: true })
  const wallL  = Matter.Bodies.rectangle(-25, vh / 2, 50, vh * 3, { isStatic: true })
  const wallR  = Matter.Bodies.rectangle(vw + 25, vh / 2, 50, vh * 3, { isStatic: true })
  Matter.Composite.add(engine.world, [ground, wallL, wallR])
  Matter.Runner.run(runner, engine)

  // Device orientation → live gravity (silent, no permission prompt)
  if (typeof DeviceOrientationEvent !== 'undefined') {
    const toRad = Math.PI / 180
    orientationHandler = (e: DeviceOrientationEvent) => {
      if (!engine || e.beta === null || e.gamma === null) return
      engine.gravity.x = Math.sin(e.gamma * toRad) * config.gravityY
      engine.gravity.y = Math.cos(e.beta  * toRad) * config.gravityY
    }
    window.addEventListener('deviceorientation', orientationHandler)
  }

  overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0'
  document.body.appendChild(overlay)

  function tick() {
    let allSettled = pieces.length === totalPieces
    for (const p of pieces) {
      const dx = p.body.position.x - p.initX
      const dy = p.body.position.y - p.initY
      p.cloneEl.style.transform = `translate(${dx}px,${dy}px) rotate(${p.body.angle}rad)`
      if (allSettled && !p.body.isSleeping) allSettled = false
    }
    if (allSettled) {
      if (runner) Matter.Runner.stop(runner)
      return
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)

  // Dispatch rows top→bottom. Each row is faster than the last.
  let delay = 0
  ROWS.forEach((row, rowIndex) => {
    // t < 1 as rowIndex grows → faster timing, higher velocity
    const t = Math.max(0.15, 1 - config.speedupRate * rowIndex)
    const stagger     = config.staggerMs * t
    const velocityMult = 1 / t

    const shuffled = [...row].sort(() => Math.random() - 0.5)
    shuffled.forEach((id, i) => {
      timers.push(setTimeout(
        () => dropPiece(id, globeRect, velocityMult),
        delay + i * stagger,
      ))
    })
    delay += shuffled.length * stagger + config.rowGapMs * t
  })
}

// Sample points along SVG path outlines → screen coordinates
function sampleVertices(
  groupEl: SVGGElement,
  globeRect: DOMRect,
  scaleX: number,
  scaleY: number,
): Matter.Vector[] {
  const paths = groupEl.querySelectorAll<SVGPathElement>('path')
  const pts: Matter.Vector[] = []
  const PER_PATH = 28
  paths.forEach(path => {
    const len = path.getTotalLength()
    if (len < 1) return
    for (let i = 0; i < PER_PATH; i++) {
      const p = path.getPointAtLength((i / PER_PATH) * len)
      pts.push({ x: globeRect.left + p.x * scaleX, y: globeRect.top + p.y * scaleY })
    }
  })
  return pts
}

function dropPiece(id: string, globeRect: DOMRect, velocityMult = 1) {
  if (!svgEl || !overlay || !engine) return
  const groupEl = svgEl.querySelector(`[id="${id}"]`) as SVGGElement | null
  if (!groupEl) return

  const bbox = groupEl.getBBox()
  if (bbox.width === 0 || bbox.height === 0) return

  const scaleX = globeRect.width  / 100
  const scaleY = globeRect.height / 100
  const svgCx  = bbox.x + bbox.width  / 2
  const svgCy  = bbox.y + bbox.height / 2
  const screenCx = globeRect.left + svgCx * scaleX
  const screenCy = globeRect.top  + svgCy * scaleY

  // Sample actual piece outline → use as physics shape
  const verts = sampleVertices(groupEl, globeRect, scaleX, scaleY)
  const bodyOpts = { restitution: config.restitution, friction: config.friction, frictionAir: config.frictionAir }

  let body: Matter.Body
  if (verts.length >= 3) {
    // Use convex hull of sampled path points as physics shape.
    // Body.create bypasses fromVertices (avoids poly-decomp warnings for concave inputs).
    const hull = Matter.Vertices.hull(verts)
    const cx = hull.reduce((s, v) => s + v.x, 0) / hull.length
    const cy = hull.reduce((s, v) => s + v.y, 0) / hull.length
    body = Matter.Body.create({
      label: 'Piece Body',
      position: { x: cx, y: cy },
      vertices: hull.map(v => ({ x: v.x - cx, y: v.y - cy })),
      ...bodyOpts,
    })
  } else {
    body = Matter.Bodies.rectangle(screenCx, screenCy, bbox.width * scaleX, bbox.height * scaleY, bodyOpts)
  }

  // Use actual body centroid (fromVertices may shift it slightly from the sampled centroid)
  const initX = body.position.x
  const initY = body.position.y

  const cloneEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
  cloneEl.setAttribute('viewBox', '0 0 100 100')
  cloneEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  cloneEl.style.cssText = [
    'position:fixed',
    `top:${globeRect.top}px`,
    `left:${globeRect.left}px`,
    `width:${globeRect.width}px`,
    `height:${globeRect.height}px`,
    'overflow:visible',
    'pointer-events:none',
    // Rotate around the physics centroid, not the SVG bbox center
    `transform-origin:${initX - globeRect.left}px ${initY - globeRect.top}px`,
  ].join(';')
  cloneEl.appendChild(groupEl.cloneNode(true))
  overlay.appendChild(cloneEl)
  groupEl.style.visibility = 'hidden'

  Matter.Body.setVelocity(body, {
    x: (Math.random() - 0.5) * config.velocityBase * velocityMult,
    y: 0,
  })
  Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * config.angularBase * velocityMult)
  Matter.Composite.add(engine.world, body)

  pieces.push({ cloneEl, body, initX, initY })
}

function restart() {
  teardown()
  resetPieceVisibility()
  startAnimation()
}

onMounted(async () => {
  updateMenuMaxHeight()
  window.addEventListener('resize', updateMenuMaxHeight)
  try {
    await initGlobe()
    timers.push(setTimeout(startAnimation, 1000))
  } catch (err) {
    console.error('[wikipedia-404] mounted error:', err)
  }
})

onUnmounted(() => {
  teardown()
  if (orientationHandler) {
    window.removeEventListener('deviceorientation', orientationHandler)
    orientationHandler = null
  }
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

    <!-- Debug panel: append ?debug to URL to show -->
    <div v-if="isDebug" class="dbg">
      <div class="dbg__header">
        <span class="dbg__title">Physics</span>
        <button class="dbg__restart" @click="restart">↺ Restart</button>
      </div>

      <p class="dbg__note">Gravity updates live. All other params apply on restart.</p>

      <div class="dbg__group">
        <label class="dbg__label">
          Gravity Y
          <span class="dbg__val">{{ config.gravityY.toFixed(1) }}</span>
          <input type="range" v-model.number="config.gravityY" min="0.1" max="6" step="0.1" />
        </label>
        <label class="dbg__label">
          Gravity X
          <span class="dbg__val">{{ config.gravityX.toFixed(1) }}</span>
          <input type="range" v-model.number="config.gravityX" min="-3" max="3" step="0.1" />
        </label>
        <label class="dbg__label">
          Restitution (bounce)
          <span class="dbg__val">{{ config.restitution.toFixed(2) }}</span>
          <input type="range" v-model.number="config.restitution" min="0" max="0.9" step="0.05" />
        </label>
        <label class="dbg__label">
          Friction
          <span class="dbg__val">{{ config.friction.toFixed(2) }}</span>
          <input type="range" v-model.number="config.friction" min="0" max="1" step="0.05" />
        </label>
        <label class="dbg__label">
          Air friction
          <span class="dbg__val">{{ config.frictionAir.toFixed(3) }}</span>
          <input type="range" v-model.number="config.frictionAir" min="0" max="0.05" step="0.001" />
        </label>
      </div>

      <div class="dbg__group">
        <label class="dbg__label">
          Piece stagger (ms)
          <span class="dbg__val">{{ config.staggerMs }}</span>
          <input type="range" v-model.number="config.staggerMs" min="20" max="500" step="10" />
        </label>
        <label class="dbg__label">
          Row gap (ms)
          <span class="dbg__val">{{ config.rowGapMs }}</span>
          <input type="range" v-model.number="config.rowGapMs" min="20" max="600" step="20" />
        </label>
        <label class="dbg__label">
          Speedup rate
          <span class="dbg__val">{{ config.speedupRate.toFixed(2) }}</span>
          <input type="range" v-model.number="config.speedupRate" min="0" max="0.5" step="0.01" />
        </label>
        <label class="dbg__label">
          Velocity
          <span class="dbg__val">{{ config.velocityBase.toFixed(1) }}</span>
          <input type="range" v-model.number="config.velocityBase" min="0" max="12" step="0.5" />
        </label>
        <label class="dbg__label">
          Angular velocity
          <span class="dbg__val">{{ config.angularBase.toFixed(2) }}</span>
          <input type="range" v-model.number="config.angularBase" min="0" max="2" step="0.05" />
        </label>
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

/* Debug panel */
.dbg {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
  width: 260px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 12px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: #333;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.dbg__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.dbg__title {
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.dbg__restart {
  font-size: 11px;
  font-family: inherit;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  background: #fff;
  cursor: pointer;
}

.dbg__restart:hover {
  background: #f5f5f5;
}

.dbg__note {
  margin: 0 0 10px;
  color: #888;
  font-size: 10px;
  line-height: 1.4;
}

.dbg__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.dbg__group:last-child {
  margin-bottom: 0;
}

.dbg__group + .dbg__group {
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.dbg__label {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 2px 8px;
  align-items: center;
}

.dbg__label input[type='range'] {
  grid-column: 1 / -1;
  width: 100%;
  margin: 0;
  accent-color: #000;
}

.dbg__val {
  font-variant-numeric: tabular-nums;
  color: #555;
  text-align: right;
}
</style>
