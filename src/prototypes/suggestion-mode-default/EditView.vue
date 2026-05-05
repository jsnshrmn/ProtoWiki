<script setup lang="ts">
  import { CdxButton, CdxIcon } from '@wikimedia/codex'
  import { cdxIconClose, cdxIconEdit } from '@wikimedia/codex-icons'

  const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="edit-view">
    <header class="edit-view__header">
      <h3 class="edit-view__title">Edit: Alan Kay</h3>
      <CdxButton weight="quiet" aria-label="Close" @click="emit('close')">
        <CdxIcon :icon="cdxIconClose" />
      </CdxButton>
    </header>
    <div class="edit-view__body">
      <div class="edit-view__carousel">
        <div class="edit-view__card" />
        <div class="edit-view__card" />
        <div class="edit-view__card" />
      </div>
    </div>
    <footer class="edit-view__footer">
      <CdxButton weight="quiet" size="large">
        <CdxIcon :icon="cdxIconEdit" />
        Edit full article
      </CdxButton>
    </footer>
  </div>
</template>

<style scoped>
  .edit-view {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    background-color: var(--background-color-neutral-subtle, #f8f9fa);
  }

  .edit-view__header {
    display: flex;
    align-items: center;
    padding: var(--spacing-100, 16px);
  }

  .edit-view__title {
    flex: 1;
    margin: 0;
    font-family: var(--font-family-system-sans);
  }

  .edit-view__body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .edit-view__carousel {
    flex: 1;
    display: flex;
    align-items: stretch;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: var(--spacing-150, 24px);
    padding-inline: var(--spacing-300, 48px);
    scroll-padding-inline: var(--spacing-300, 48px);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .edit-view__carousel::-webkit-scrollbar {
    display: none;
  }

  .edit-view__card {
    flex-shrink: 0;
    width: 100%;
    scroll-snap-align: center;
    background-color: var(--background-color-base, #fff);
  }

  .edit-view__footer {
    display: flex;
    justify-content: center;
    padding: var(--spacing-100, 16px);
  }
</style>
