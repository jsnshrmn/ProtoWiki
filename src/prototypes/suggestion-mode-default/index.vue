<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'

  definePage({
    meta: {
      title: 'Suggestion mode: Default',
      description: 'Prototype for suggestion mode default state.',
    },
  })

  import { CdxButton, CdxMessage } from '@wikimedia/codex'
  import Article from '@/components/Article.vue'
  import ChromeWrapper from '@/components/ChromeWrapper.vue'
  import EditView from './EditView.vue'

  const editViewOpen = ref(false)
  const containerRef = ref<HTMLElement | null>(null)

  const params = new URLSearchParams(window.location.search)
  const showHatnotes = params.get('hatnotes') === '1'
  const showHatnoteToast = params.get('toast') === '1'

  const HATNOTE_INJECTIONS: { selector: string; text: string }[] = [
    { selector: '#mwFw', text: '[<i>remove duplicate link?</i>]' },
    { selector: '#mwKA', text: '[<i>add a citation?</i>]' },
    { selector: '#mwLw', text: '[<i>add a citation?</i>]' },
    { selector: '#mwMw', text: '[<i>add a citation?</i>]' },
    { selector: '#mwOA', text: '[<i>add a citation?</i>]' },
    { selector: '#mwPQ', text: '[<i>add a citation?</i>]' },
    { selector: '#mwbA', text: '[<i>add a citation?</i>]' },
    { selector: '#mwfA', text: '[<i>potential AI-generated content?</i>]' },
    { selector: '#mwnQ', text: '[<i>add a citation?</i>]' },
    { selector: '#mwrw', text: '[<i>add a citation?</i>]' },
    { selector: '#mwyQ', text: '[<i>add a citation?</i>]' },
    { selector: '#mw0A', text: '[<i>add a citation?</i>]' },
    { selector: '#mw5A', text: '[<i>add a citation?</i>]' },
    { selector: '#mw7A', text: '[<i>add a citation?</i>]' },
    { selector: '#mw7w', text: '[<i>add a citation?</i>]' },
    { selector: '#mwAVY', text: '[<i>add a citation?</i>]' },
  ]

  const BLOCK_TAGS = new Set(['P', 'DIV', 'SECTION', 'BLOCKQUOTE', 'LI'])

  function collapsedHTML(label: string): string {
    return `[<i>${label}</i>]`
  }

  function expandedHTML(label: string): string {
    return (
      `<span class="protowiki-hatnote__bracket">[</span>` +
      `<i class="protowiki-hatnote__label">${label}</i> ` +
      `<span class="protowiki-hatnote__action protowiki-hatnote__action--yes">yes</span>` +
      `<span class="protowiki-hatnote__bracket"> / </span>` +
      `<span class="protowiki-hatnote__action protowiki-hatnote__action--no">no</span>` +
      `<span class="protowiki-hatnote__bracket">]</span>`
    )
  }

  function injectHatnotes(root: Element) {
    for (const { selector, text } of HATNOTE_INJECTIONS) {
      const el = root.querySelector(selector)
      if (!el || el.classList.contains('protowiki-hatnote-group')) continue
      const label = text.replace(/^\[/, '').replace(/\]$/, '').replace(/<\/?i>/g, '')
      const sup = document.createElement('sup')
      sup.className = 'protowiki-hatnote'
      sup.dataset.hatnoteLabel = label
      sup.innerHTML = collapsedHTML(label)
      sup.addEventListener('click', () => {
        const expanded = sup.classList.toggle('protowiki-hatnote--expanded')
        sup.innerHTML = expanded ? expandedHTML(label) : collapsedHTML(label)
      })
      if (BLOCK_TAGS.has(el.tagName)) {
        el.classList.add('protowiki-hatnote-group')
        el.appendChild(sup)
      } else {
        if (el.parentElement?.classList.contains('protowiki-hatnote-group')) continue
        const wrapper = document.createElement('span')
        wrapper.className = 'protowiki-hatnote-group'
        el.parentNode!.insertBefore(wrapper, el)
        wrapper.appendChild(el)
        wrapper.appendChild(sup)
      }
    }
  }

  const visibleCount = ref(0)
  let observer: MutationObserver | null = null
  let intersectionObserver: IntersectionObserver | null = null

  function startViewportObserver(root: Element) {
    const targets = HATNOTE_INJECTIONS
      .map(({ selector }) => root.querySelector(selector))
      .filter(Boolean) as Element[]

    const visible = new Set<Element>()

    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)
      })
      visibleCount.value = visible.size
    })

    targets.forEach((el) => intersectionObserver!.observe(el))
  }

  function tryActivate() {
    const root = containerRef.value?.querySelector('.mw-parser-output')
    if (!root || root.children.length === 0) return false
    const hasTarget = HATNOTE_INJECTIONS.some(({ selector }) => root.querySelector(selector))
    if (!hasTarget) return false
    if (showHatnotes) injectHatnotes(root)
    if (showHatnoteToast) {
      // Restart with fresh element refs each time article re-renders
      intersectionObserver?.disconnect()
      visibleCount.value = 0
      startViewportObserver(root)
    }
    return true
  }

  onMounted(() => {
    if (!showHatnotes && !showHatnoteToast) return
    if (!containerRef.value) return
    tryActivate()
    observer = new MutationObserver(() => {
      const activated = tryActivate()
      // Mode 1: disconnect once injected; mode 2: keep alive for re-renders
      if (activated && showHatnotes && !showHatnoteToast) {
        observer?.disconnect()
        observer = null
      }
    })
    observer.observe(containerRef.value, { childList: true, subtree: true })
  })

  onUnmounted(() => {
    observer?.disconnect()
    intersectionObserver?.disconnect()
    observer = null
    intersectionObserver = null
  })

  function onArticleClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('[aria-label="Edit"]')) {
      editViewOpen.value = true
    }
  }
</script>

<template>
  <ChromeWrapper>
    <div ref="containerRef" class="article-container" @click="onArticleClick">
      <Article title="Alan Kay" />
    </div>
  </ChromeWrapper>
  <Transition name="edit-view">
    <EditView v-if="editViewOpen" @close="editViewOpen = false" />
  </Transition>
  <Transition name="hatnote-toast">
    <div v-if="showHatnoteToast && visibleCount > 0" class="protowiki-hatnote-toast">
      <CdxMessage type="progressive">
        <div class="protowiki-hatnote-toast__inner">
          <span><span class="protowiki-hatnote-toast__count">{{ visibleCount }}</span> edit suggestions in this section.</span>
          <CdxButton action="progressive" weight="primary" size="small">Edit</CdxButton>
        </div>
      </CdxMessage>
    </div>
  </Transition>
</template>

<style scoped>
  .article-container {
    padding: 0 var(--spacing-100);
  }

  .edit-view-enter-active {
    transition: opacity 200ms ease-out;
  }

  .edit-view-leave-active {
    transition: opacity 150ms ease-out;
  }

  .edit-view-enter-from,
  .edit-view-leave-to {
    opacity: 0;
  }

  :deep(.protowiki-hatnote-group),
  :deep(.protowiki-hatnote-group a) {
    text-decoration: underline;
    text-decoration-style: dashed;
    text-decoration-color: var(--border-color-subtle);
    text-decoration-thickness: 1px;
    text-underline-offset: 4px;
  }

  :deep(.protowiki-hatnote) {
    font-family: var(--font-family-system-sans);
    color: var(--color-base);
    cursor: pointer;
  }

  :deep(.protowiki-hatnote i) {
    color: var(--color-warning);
  }

  :deep(sup.mw-ref > a) {
    text-decoration: none;
  }

  /* :deep(.protowiki-hatnote__bracket) {
    color: var(--color-base);
  } */

  :deep(.protowiki-hatnote__label) {
    color: var(--color-warning);
    font-style: italic;
  }

  :deep(.protowiki-hatnote__action) {
    color: var(--color-progressive);
  }

  .protowiki-hatnote-toast {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: var(--spacing-150, 24px);
  }

  .protowiki-hatnote-toast__count {
    font-variant-numeric: tabular-nums;
  }

  .protowiki-hatnote-toast__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-75);
    font-size: var(--font-size-small);
  }

  :deep(.cdx-message--progressive) {
    background-color: var(--background-color-progressive);
    border-color: var(--border-color-progressive);
    color: #fff;
  }

  :deep(.cdx-message__icon--vue) {
    display: none;
  }

  :deep(.cdx-message__content) {
    margin-left: 0;
  }

  .hatnote-toast-enter-active {
    transition: transform 320ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .hatnote-toast-leave-active {
    transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  .hatnote-toast-enter-from,
  .hatnote-toast-leave-to {
    transform: translateY(100%);
  }

  @media (prefers-reduced-motion: reduce) {
    .hatnote-toast-enter-active,
    .hatnote-toast-leave-active {
      transition: opacity 200ms ease;
      transform: none;
    }

    .hatnote-toast-enter-from,
    .hatnote-toast-leave-to {
      opacity: 0;
    }
  }
</style>
