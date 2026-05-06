<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'

  definePage({
    meta: {
      title: 'Suggestion mode: Default',
      description: 'Prototype for suggestion mode default state.',
    },
  })

  import { CdxButton, CdxIcon, CdxMessage } from '@wikimedia/codex'
  import { cdxIconUserAvatarOutline } from '@wikimedia/codex-icons'
  import Article from '@/components/Article.vue'
  import ChromeWrapper from '@/components/ChromeWrapper.vue'
  import EditView from './EditView.vue'
  import type { CardData } from './types'

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
  const PREVIEW_BLOCK_TAGS = new Set([...BLOCK_TAGS, 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'])

  // --- hatnote injection helpers ---

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

  // --- card building helpers ---

  function getParentBlock(el: Element): Element | null {
    let current: Element | null = el
    while (current && !PREVIEW_BLOCK_TAGS.has(current.tagName)) {
      current = current.parentElement
    }
    return current
  }

  function cleanClone(el: Element): Element {
    const STRIP = ['id', 'about', 'data-mw', 'typeof', 'rel']
    ;[el, ...Array.from(el.querySelectorAll('*'))].forEach(node => {
      STRIP.forEach(attr => node.removeAttribute(attr))
    })
    el.querySelectorAll('a[href]').forEach(a => a.setAttribute('href', '#'))
    el.querySelectorAll('.protowiki-hatnote').forEach(n => n.remove())
    return el
  }

  // Tighter block set for duplicate link: skip large containers like DIV/SECTION
  const INLINE_BLOCK_TAGS = new Set(['P', 'BLOCKQUOTE', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'])

  function getNearestInlineBlock(el: Element): Element | null {
    let current: Element | null = el
    while (current && !INLINE_BLOCK_TAGS.has(current.tagName)) {
      current = current.parentElement
    }
    return current
  }

  function buildDuplicateCard(root: Element, el: Element): CardData | null {
    const targetHref = el.getAttribute('href')
    if (!targetHref) return null

    // Anchor to the flagged element's nearest inline block (P, BLOCKQUOTE, LI…)
    const primaryBlock = getNearestInlineBlock(el)
    if (!primaryBlock) return null

    // Find another occurrence in a different inline block
    let secondaryBlock: Element | null = null
    for (const link of root.querySelectorAll<HTMLAnchorElement>(`a[href="${targetHref}"]`)) {
      const block = getNearestInlineBlock(link)
      if (block && block !== primaryBlock) {
        secondaryBlock = block
        break
      }
    }

    // Show blocks in document order
    let blocks: Element[]
    if (secondaryBlock) {
      const primFirst = !!(primaryBlock.compareDocumentPosition(secondaryBlock) & Node.DOCUMENT_POSITION_FOLLOWING)
      blocks = primFirst ? [primaryBlock, secondaryBlock] : [secondaryBlock, primaryBlock]
    } else {
      blocks = [primaryBlock]
    }

    const previewHTML = blocks.map(block => {
      const clone = block.cloneNode(true) as Element
      clone.querySelectorAll<HTMLAnchorElement>(`a[href="${targetHref}"]`).forEach(a => {
        a.classList.add('card__preview-duplicate')
      })
      return cleanClone(clone).outerHTML
    }).join('')

    return { type: 'remove-duplicate', previewHTML }
  }

  function nextMeaningfulSibling(el: Element): Element | null {
    let sib = el.nextElementSibling
    while (sib?.tagName === 'STYLE') sib = sib.nextElementSibling
    return sib ?? null
  }

  function prevMeaningfulSibling(el: Element): Element | null {
    let sib = el.previousElementSibling
    while (sib?.tagName === 'STYLE') sib = sib.previousElementSibling
    return sib ?? null
  }

  function wrapAllContent(el: Element): void {
    const wrapper = document.createElement('span')
    wrapper.className = 'card__preview-duplicate'
    while (el.firstChild) wrapper.appendChild(el.firstChild)
    el.appendChild(wrapper)
  }

  function findInlineTarget(el: Element, blockRoot: Element): Element {
    if (el.tagName === 'A') return el
    const sup = el.closest('sup')
    if (sup && sup !== blockRoot && blockRoot.contains(sup)) return sup
    const inline = el.closest('a, b, strong, em, i')
    if (inline && inline !== blockRoot && blockRoot.contains(inline)) return inline
    return el
  }

  function buildCitationCard(el: Element, block: Element): CardData | null {
    const blockClone = block.cloneNode(true) as Element

    if (el === block) {
      wrapAllContent(blockClone)
    } else {
      // selector is a descendant — highlight the specific inline element
      el.setAttribute('data-highlight-target', '1')
      const targetInClone = blockClone.querySelector('[data-highlight-target]') as Element | null
      el.removeAttribute('data-highlight-target')
      if (targetInClone) {
        targetInClone.removeAttribute('data-highlight-target')
        findInlineTarget(targetInClone, blockClone).classList.add('card__preview-duplicate')
      }
    }

    let previewHTML = ''
    if (block.tagName === 'BLOCKQUOTE') {
      const prev = prevMeaningfulSibling(block)
      if (prev?.tagName === 'P' && (prev.textContent?.length ?? 0) < 200) {
        previewHTML = cleanClone(prev.cloneNode(true) as Element).outerHTML
      }
      previewHTML += cleanClone(blockClone).outerHTML
    } else {
      previewHTML = cleanClone(blockClone).outerHTML
      const next = nextMeaningfulSibling(block)
      if (next?.tagName === 'BLOCKQUOTE') {
        previewHTML += cleanClone(next.cloneNode(true) as Element).outerHTML
      }
    }

    return { type: 'add-citation', previewHTML }
  }

  function buildAiCard(el: Element, block: Element): CardData | null {
    const blockClone = block.cloneNode(true) as Element

    if (el === block) {
      wrapAllContent(blockClone)
    } else {
      el.setAttribute('data-highlight-target', '1')
      const targetInClone = blockClone.querySelector('[data-highlight-target]') as Element | null
      el.removeAttribute('data-highlight-target')
      if (targetInClone) {
        targetInClone.removeAttribute('data-highlight-target')
        findInlineTarget(targetInClone, blockClone).classList.add('card__preview-duplicate')
      } else {
        wrapAllContent(blockClone)
      }
    }

    let previewHTML = ''
    if (block.tagName === 'BLOCKQUOTE') {
      const prev = prevMeaningfulSibling(block)
      if (prev?.tagName === 'P' && (prev.textContent?.length ?? 0) < 200) {
        previewHTML = cleanClone(prev.cloneNode(true) as Element).outerHTML
      }
    }
    previewHTML += cleanClone(blockClone).outerHTML

    return { type: 'ai-content', previewHTML }
  }

  function buildCards(root: Element): CardData[] {
    return HATNOTE_INJECTIONS.flatMap(({ selector, text }): CardData[] => {
      const el = root.querySelector(selector)
      if (!el) return []

      const type: CardData['type'] = text.includes('duplicate')
        ? 'remove-duplicate'
        : text.toLowerCase().includes('ai-generated')
          ? 'ai-content'
          : 'add-citation'

      if (type === 'remove-duplicate') {
        const card = buildDuplicateCard(root, el)
        return card ? [card] : []
      }

      const block = getParentBlock(el)
      if (!block) return []

      const card = type === 'add-citation'
        ? buildCitationCard(el, block)
        : buildAiCard(el, block)

      return card ? [card] : []
    })
  }

  // --- viewport/toast observer ---

  const visibleCount = ref(0)
  const cards = ref<CardData[]>([])
  let observer: MutationObserver | null = null
  let intersectionObserver: IntersectionObserver | null = null
  let observedTargets: Element[] = []

  function startViewportObserver(root: Element) {
    observedTargets = HATNOTE_INJECTIONS
      .map(({ selector }) => root.querySelector(selector))
      .filter(Boolean) as Element[]

    const visible = new Set<Element>()

    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)
      })
      visibleCount.value = visible.size
    })

    observedTargets.forEach((el) => intersectionObserver!.observe(el))
  }

  function tryActivate() {
    const root = containerRef.value?.querySelector('.mw-parser-output')
    if (!root || root.children.length === 0) return false
    const hasTarget = HATNOTE_INJECTIONS.some(({ selector }) => root.querySelector(selector))
    if (!hasTarget) return false

    cards.value = buildCards(root)

    if (showHatnotes) injectHatnotes(root)
    if (showHatnoteToast) {
      // Only restart if the observed nodes themselves are stale (detached by v-html re-render)
      if (intersectionObserver && observedTargets[0]?.isConnected) return true
      intersectionObserver?.disconnect()
      visibleCount.value = 0
      startViewportObserver(root)
    }
    return true
  }

  onMounted(() => {
    if (!containerRef.value) return
    tryActivate()
    observer = new MutationObserver(() => {
      const activated = tryActivate()
      if (activated && !showHatnoteToast) {
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
    <template #mobile-actions-extra>
      <CdxButton weight="quiet" size="large" aria-label="User menu">
        <CdxIcon :icon="cdxIconUserAvatarOutline" />
      </CdxButton>
    </template>
    <div ref="containerRef" class="article-container" @click="onArticleClick">
      <Article title="Alan Kay" />
    </div>
  </ChromeWrapper>
  <Transition name="edit-view">
    <EditView v-if="editViewOpen" :cards="cards" @close="editViewOpen = false" />
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
