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
    <div class="edit-view__body" />
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
  }

  .edit-view__footer {
    display: flex;
    justify-content: center;
    padding: var(--spacing-100, 16px);
  }
</style>
