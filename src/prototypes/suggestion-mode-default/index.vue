<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'

  definePage({
    meta: {
      title: 'Suggestion mode: Default',
      description: 'Prototype for suggestion mode default state.',
    },
  })

  import Article from '@/components/Article.vue'
  import ChromeWrapper from '@/components/ChromeWrapper.vue'
  import EditView from './EditView.vue'

  const editViewOpen = ref(false)
  const containerRef = ref<HTMLElement | null>(null)

  const showHatnotes = new URLSearchParams(window.location.search).get('hatnotes') === '1'

  const HATNOTE_INJECTIONS: { selector: string; text: string }[] = [
    { selector: '#mwFw', text: '[<i>remove duplicate link?</i>]' },
    { selector: '#mwKA', text: '[<i>add a citation?</i>]' },
    { selector: '#mwLw', text: '[<i>add a citation?</i>]' },
    { selector: '#mwMw', text: '[<i>add a citation?</i>]' },
    { selector: '#mwOA', text: '[<i>add a citation?</i>]' },
    { selector: '#mwPQ', text: '[<i>add a citation?</i>]' },
    { selector: '#mwbA', text: '[<i>add a citation?</i>]' },
    { selector: '#mwfA', text: '[<i>potential AI-generated content?</i>]' },
  ]

  const BLOCK_TAGS = new Set(['P', 'DIV', 'SECTION', 'BLOCKQUOTE', 'LI'])

  function injectHatnotes(root: Element) {
    for (const { selector, text } of HATNOTE_INJECTIONS) {
      const el = root.querySelector(selector)
      if (!el || el.classList.contains('protowiki-hatnote-group')) continue
      const sup = document.createElement('sup')
      sup.className = 'protowiki-hatnote'
      sup.innerHTML = text
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

  let observer: MutationObserver | null = null

  onMounted(() => {
    if (!showHatnotes || !containerRef.value) return
    observer = new MutationObserver(() => {
      const root = containerRef.value?.querySelector('.mw-parser-output')
      if (root && root.children.length > 0) {
        injectHatnotes(root)
        observer?.disconnect()
        observer = null
      }
    })
    observer.observe(containerRef.value, { childList: true, subtree: true })
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
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
    color: var(--color-warning);
  }
</style>
