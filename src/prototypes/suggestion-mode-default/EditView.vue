<script setup lang="ts">
  import { CdxButton, CdxIcon } from '@wikimedia/codex'
  import { cdxIconClose, cdxIconEdit, cdxIconEllipsis } from '@wikimedia/codex-icons'
  import type { CardData } from './types'

  const props = defineProps<{ cards: CardData[] }>()
  const emit = defineEmits<{ close: [] }>()

  function titleFor(type: CardData['type']): string {
    return {
      'remove-duplicate': 'Remove duplicate link',
      'add-citation': 'Add a citation',
      'ai-content': 'Potential AI-generated content',
    }[type]
  }

  function descriptionFor(type: CardData['type']): string {
    return {
      'remove-duplicate': 'This link appears more than once in this section. Help readers navigate more easily by removing <a href="#">repeated links</a>.',
      'add-citation': 'Help readers understand where this information is coming from by adding a citation.',
      'ai-content': 'This text may include <a href="#">AI-generated content</a>. Help readers trust the article by removing any AI content or rewriting any inaccurate, unverifiable, or unencyclopedic information.',
    }[type]
  }

  function actionsFor(type: CardData['type']): { label: string }[] {
    return {
      'remove-duplicate': [{ label: 'Remove link' }, { label: 'Dismiss' }],
      'add-citation': [{ label: 'Add citation' }, { label: 'No' }],
      'ai-content': [{ label: 'Edit' }, { label: 'Dismiss' }],
    }[type]
  }
</script>

<template>
  <div class="edit-view">
    <header class="edit-view__header">
      <h3 class="edit-view__title">Edit: Alan Kay</h3>
      <CdxButton weight="quiet" aria-label="Close" @click="emit('close')">
        <CdxIcon :icon="cdxIconClose" />
      </CdxButton>
    </header>
    <p class="edit-view__suggestion-count">{{ cards.length }} edit suggestions</p>
    <div class="edit-view__body">
      <div class="edit-view__carousel">
        <div v-for="(card, i) in cards" :key="i" class="edit-view__card">
          <div class="card__preview" v-html="card.previewHTML" />
          <div class="card__instructions">
            <div class="card__instructions-header">
              <p class="card__instructions-title">{{ titleFor(card.type) }}</p>
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p class="card__instructions-description" v-html="descriptionFor(card.type)" />
            <div class="card__actions">
              <CdxButton v-for="action in actionsFor(card.type)" :key="action.label">
                {{ action.label }}
              </CdxButton>
              <CdxButton weight="quiet" aria-label="More options" class="card__actions-more">
                <CdxIcon :icon="cdxIconEllipsis" />
              </CdxButton>
            </div>
          </div>
        </div>
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
    position: relative;
  }

  .edit-view__title {
    flex: 1;
    margin: 0;
    font-family: var(--font-family-system-sans);
    text-align: center;
  }

  .edit-view__header > button {
    position: absolute;
    right: var(--spacing-100);
  }

  .edit-view__suggestion-count {
    text-align: center;
    font-weight: bold;
    color: var(--color-success);
    font-size: var(--font-size-small);
    line-height: var(--line-height-small);
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
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .card__preview {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-100, 16px);
    font-size: var(--font-size-medium, 1rem);
    line-height: var(--line-height-medium, 1.6);
  }

  .card__preview :deep(a) {
    color: var(--color-progressive, #3366cc);
    text-decoration: none;
  }

  .card__preview :deep(.card__preview-duplicate) {
    background-color: var(--background-color-warning-subtle, #fef6e7);
  }

  .card__preview :deep(blockquote) {
    border-left: 3px solid var(--border-color-base, #a2a9b1);
    margin: var(--spacing-100, 16px) 0 0 var(--spacing-150, 24px);
    padding-left: var(--spacing-150, 24px);
  }

  .card__preview :deep(h2),
  .card__preview :deep(h3) {
    font-size: 1.5rem;
    border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
    padding-bottom: var(--spacing-75, 6px);
    margin: 0 0 var(--spacing-100, 16px);
  }

  .card__instructions {
    flex-shrink: 0;
    padding: var(--spacing-100, 16px);
    /* border-top: 1px solid var(--border-color-subtle, #c8ccd1); */
    background-color: var(--background-color-neutral);
  }

  .card__instructions-title {
    margin: 0 0 var(--spacing-50, 8px);
    font-weight: var(--font-weight-bold, 700);
  }

  .card__instructions-description {
    margin: 0 0 var(--spacing-100, 16px);
    color: var(--color-base, #202122);
  }

  .card__instructions-description :deep(a) {
    color: var(--color-progressive, #3366cc);
    text-decoration: none;
  }

  .card__actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-75, 12px);
  }

  .card__actions-more {
    margin-inline-start: auto;
  }

  .card__instructions-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-75, 6px);
    margin-bottom: var(--spacing-75, 6px);
  }

  .card__instructions-header .card__instructions-title {
    margin: 0;
  }

  .edit-view__footer {
    display: flex;
    justify-content: center;
    padding: var(--spacing-100, 16px);
  }
</style>
