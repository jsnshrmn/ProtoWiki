<script setup lang="ts">
  import { ref } from 'vue'

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

  function onArticleClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('[aria-label="Edit"]')) {
      editViewOpen.value = true
    }
  }
</script>

<template>
  <ChromeWrapper>
    <div class="article-container" @click="onArticleClick">
      <Article title="Alan Kay" />
    </div>
  </ChromeWrapper>
  <Transition name="edit-view">
    <EditView v-if="editViewOpen" @close="editViewOpen = false" />
  </Transition>
</template>

<style scoped>
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
</style>
