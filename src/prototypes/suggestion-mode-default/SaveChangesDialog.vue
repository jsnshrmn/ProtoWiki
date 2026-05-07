<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { CdxButton, CdxCheckbox, CdxField, CdxTextArea } from '@wikimedia/codex'

  const props = defineProps<{ open: boolean; initialSummary?: string }>()
  const emit = defineEmits<{
    publish: [{ summary: string; minor: boolean; watch: boolean }]
    back: []
  }>()

  const summary = ref('')
  const minor = ref(false)
  const watchPage = ref(false)

  // Seed summary from the prop each time the dialog opens
  watch(
    () => props.open,
    (open) => {
      if (open) {
        summary.value = props.initialSummary ?? ''
        minor.value = false
        watchPage.value = false
      }
    }
  )

  function handlePublish() {
    emit('publish', { summary: summary.value, minor: minor.value, watch: watchPage.value })
  }
</script>

<template>
  <Transition name="save-dialog">
    <div v-if="open" class="save-dialog-backdrop" @click.self="emit('back')">
      <div class="save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title">
        <!-- drag handle -->
        <div class="save-dialog__handle" aria-hidden="true" />

        <h2 id="save-dialog-title" class="save-dialog__title">Save your changes</h2>

        <CdxField class="save-dialog__field">
          <template #label>Describe what you changed</template>
          <template #description>
            Briefly describe the change (required for non-minor edits)
          </template>
          <CdxTextArea
            v-model="summary"
            placeholder="Added citation, removed duplicate link…"
            :rows="4"
            class="save-dialog__summary"
          />
        </CdxField>

        <div class="save-dialog__checks">
          <CdxCheckbox v-model="minor" input-value="minor">
            This is a minor edit
          </CdxCheckbox>
          <CdxCheckbox v-model="watchPage" input-value="watch">
            Watch this page
          </CdxCheckbox>
        </div>

        <div class="save-dialog__actions">
          <CdxButton
            action="progressive"
            weight="primary"
            class="save-dialog__publish-btn"
            @click="handlePublish"
          >
            Publish changes
          </CdxButton>
          <CdxButton weight="quiet" @click="emit('back')">
            Back
          </CdxButton>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
  /* Backdrop */
  .save-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background-color: rgba(0, 0, 0, 0.48);
    display: flex;
    align-items: flex-end;
  }

  /* Sheet */
  .save-dialog {
    width: 100%;
    background-color: var(--background-color-base, #fff);
    border-radius: 12px 12px 0 0;
    padding: var(--spacing-100, 16px) var(--spacing-150, 24px) var(--spacing-200, 32px);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-100, 16px);
    /* prevent content going behind home indicator on iOS */
    padding-bottom: max(var(--spacing-200, 32px), env(safe-area-inset-bottom));
  }

  /* Drag handle */
  .save-dialog__handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background-color: var(--border-color-subtle, #c8ccd1);
    margin: 0 auto var(--spacing-50, 8px);
  }

  .save-dialog__title {
    margin: 0;
    font-size: var(--font-size-large, 1.125rem);
    font-weight: var(--font-weight-bold, 700);
    font-family: var(--font-family-system-sans);
  }

  .save-dialog__field {
    margin: 0;
  }

  .save-dialog__summary {
    width: 100%;
  }

  .save-dialog__checks {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-50, 8px);
  }

  .save-dialog__actions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-75, 12px);
    margin-top: var(--spacing-50, 8px);
  }

  .save-dialog__publish-btn {
    width: 100%;
    justify-content: center;
  }

  /* Slide-up transition */
  .save-dialog-enter-active {
    transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1),
                opacity 200ms ease;
  }
  .save-dialog-leave-active {
    transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1),
                opacity 160ms ease;
  }
  .save-dialog-enter-from,
  .save-dialog-leave-to {
    opacity: 0;
  }
  .save-dialog-enter-from .save-dialog,
  .save-dialog-leave-to .save-dialog {
    transform: translateY(100%);
  }

  @media (prefers-reduced-motion: reduce) {
    .save-dialog-enter-active,
    .save-dialog-leave-active {
      transition: opacity 200ms ease;
    }
    .save-dialog-enter-from .save-dialog,
    .save-dialog-leave-to .save-dialog {
      transform: none;
    }
  }
</style>
