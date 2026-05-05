<script setup lang="ts">
  import { CdxButton, CdxIcon } from '@wikimedia/codex'
  import { cdxIconClose, cdxIconEdit, cdxIconEllipsis } from '@wikimedia/codex-icons'

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
        <div class="edit-view__card">
          <div class="card__preview">
            <p>
              <b>Alan Curtis Kay</b> (born May 17, 1940)<sup>[1]</sup> is an American
              <a href="#">computer scientist</a> who pioneered work on
              <a href="#">object-oriented programming</a> and
              <a href="#" class="card__preview-duplicate">windowing graphical user interface</a>
              (GUI) design. At <a href="#">Xerox PARC</a> he led the design and development of
              the first modern windowed <a href="#">computer desktop</a> interface. There he also
              led the development of the influential <a href="#">object-oriented</a>
              <a href="#">programming language Smalltalk</a>, both personally designing most of
              the early versions of the language and coining the term "object-oriented."
            </p>
          </div>
          <div class="card__instructions">
            <p class="card__instructions-title">Remove duplicate link</p>
            <p class="card__instructions-description">
              This link appears more than once in this section. Help readers navigate more easily
              by removing <a href="#">repeated links</a>.
            </p>
            <div class="card__actions">
              <CdxButton>Remove link</CdxButton>
              <CdxButton>Dismiss</CdxButton>
              <CdxButton weight="quiet" aria-label="More options" class="card__actions-more">
                <CdxIcon :icon="cdxIconEllipsis" />
              </CdxButton>
            </div>
          </div>
        </div>
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

  .card__preview a {
    color: var(--color-progressive, #3366cc);
    text-decoration: none;
  }

  .card__preview-duplicate {
    background-color: var(--background-color-warning-subtle, #fef6e7);
  }

  .card__instructions {
    flex-shrink: 0;
    padding: var(--spacing-100, 16px);
    border-top: 1px solid var(--border-color-subtle, #c8ccd1);
  }

  .card__instructions-title {
    margin: 0 0 var(--spacing-50, 8px);
    font-weight: var(--font-weight-bold, 700);
  }

  .card__instructions-description {
    margin: 0 0 var(--spacing-100, 16px);
    color: var(--color-base, #202122);
  }

  .card__instructions-description a {
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

  .edit-view__footer {
    display: flex;
    justify-content: center;
    padding: var(--spacing-100, 16px);
  }
</style>
