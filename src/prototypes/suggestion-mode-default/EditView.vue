<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { CdxButton, CdxField, CdxIcon, CdxTextArea, CdxTextInput } from '@wikimedia/codex'
  import { cdxIconClose, cdxIconEdit, cdxIconCheck } from '@wikimedia/codex-icons'
  import type { CardData } from './types'
  import SaveChangesDialog from './SaveChangesDialog.vue'

  const props = defineProps<{ cards: CardData[] }>()
  const emit = defineEmits<{ close: [] }>()

  type CardMode = 'default' | 'removing' | 'citing' | 'editing' | 'published'

  const cardModes = ref<CardMode[]>([])
  const citationInputs = ref<string[]>([])
  const editTexts = ref<string[]>([])

  watch(() => props.cards, (cards) => {
    cardModes.value = cards.map(() => 'default')
    citationInputs.value = cards.map(() => '')
    editTexts.value = cards.map((c) => c.plainText ?? '')
  }, { immediate: true })

  const saveDialogOpen = ref(false)
  const saveDialogCardIdx = ref(-1)
  const saveDialogSummary = ref('')

  function buildCumulativeSummary(): string {
    return props.cards
      .map((card, idx) => {
        const mode = cardModes.value[idx]
        if (mode === 'default' || mode === 'published') return null
        if (card.type === 'remove-duplicate') return 'Removed duplicate link'
        if (card.type === 'add-citation') {
          const url = (citationInputs.value[idx] ?? '').trim()
          return url ? `Added citation: ${url}` : 'Added citation'
        }
        if (card.type === 'ai-content') return 'Removed potential AI-generated content'
        return null
      })
      .filter(Boolean)
      .join('\n')
  }

  function openSaveDialog(idx: number) {
    saveDialogCardIdx.value = idx
    saveDialogSummary.value = buildCumulativeSummary()
    saveDialogOpen.value = true
  }

  function onSaveDialogPublish() {
    saveDialogOpen.value = false
    if (saveDialogCardIdx.value >= 0) cardModes.value[saveDialogCardIdx.value] = 'published'
    emit('close')
  }

  function removedLinksHTML(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html
    div.querySelectorAll('.card__preview-duplicate').forEach((highlight) => {
      highlight.querySelectorAll('a').forEach((a) => {
        a.replaceWith(document.createTextNode(a.textContent ?? ''))
      })
    })
    return div.innerHTML
  }

  function resolvedPreviewHTML(card: CardData, idx: number): string {
    const mode = cardModes.value[idx]
    if (card.type === 'remove-duplicate' && (mode === 'removing' || mode === 'published')) {
      return removedLinksHTML(card.previewHTML)
    }
    return card.previewHTML
  }

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

  function handlePrimaryAction(card: CardData, idx: number) {
    const mode = cardModes.value[idx]
    if (mode !== 'default') return
    if (card.type === 'remove-duplicate') cardModes.value[idx] = 'removing'
    else if (card.type === 'add-citation') cardModes.value[idx] = 'citing'
    else if (card.type === 'ai-content') cardModes.value[idx] = 'editing'
  }

  function handleRevert(idx: number) { cardModes.value[idx] = 'default' }

  function handleContinue(idx: number) {
    const nextIdx = idx + 1
    if (nextIdx >= props.cards.length) return
    const card = carouselRef.value?.children[nextIdx] as HTMLElement | undefined
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  const carouselRef = ref<HTMLElement | null>(null)
  const is = (idx: number, ...modes: CardMode[]) => modes.includes(cardModes.value[idx])
  const citingDisabled = (idx: number) => (citationInputs.value[idx] ?? '').trim() === ''
  const aiEditDisabled = (idx: number) => {
    const cur = (editTexts.value[idx] ?? '').trim()
    return cur === (props.cards[idx].plainText ?? '').trim() || cur === ''
  }
</script>

<template>
  <div class="edit-view">
    <header class="edit-view__header">
      <h3 class="edit-view__title">Edit: Alan Kay</h3>
      <CdxButton weight="quiet" aria-label="Close" @click="emit('close')"><CdxIcon :icon="cdxIconClose" /></CdxButton>
    </header>
    <p class="edit-view__suggestion-count">{{ cards.length }} edit suggestions</p>

    <div class="edit-view__body">
      <div ref="carouselRef" class="edit-view__carousel">
        <div v-for="(card, i) in cards" :key="i" class="edit-view__card">
          <div
            class="card__preview"
            :class="{ 'card__preview--removing': is(i, 'removing', 'published'), 'card__preview--done': is(i, 'published') }"
            v-html="resolvedPreviewHTML(card, i)"
          />

          <div class="card__instructions">
            <template v-if="is(i, 'published')">
              <div class="card__success-row">
                <CdxIcon :icon="cdxIconCheck" class="card__success-icon" />
                <p class="card__instructions-title card__instructions-title--success">Published</p>
              </div>
            </template>

            <template v-else-if="is(i, 'removing')">
              <p class="card__instructions-title">Remove duplicate link?</p>
              <p class="card__instructions-hint">The link has been removed in the preview above.</p>
              <div class="card__actions card__actions--ready">
                <CdxButton action="progressive" weight="primary" @click="openSaveDialog(i)">Publish</CdxButton>
                <CdxButton v-if="i < cards.length - 1" weight="normal" @click="handleContinue(i)">Continue</CdxButton>
                <CdxButton weight="quiet" @click="handleRevert(i)">Cancel</CdxButton>
              </div>
            </template>

            <template v-else-if="is(i, 'citing')">
              <p class="card__instructions-title">Add a citation</p>
              <p class="card__instructions-hint">Paste a URL or enter a reference.</p>
              <CdxField class="card__citation-field">
                <template #label>Citation URL or reference</template>
                <CdxTextInput v-model="citationInputs[i]" placeholder="https://example.com/source" input-type="url" />
              </CdxField>
              <div class="card__actions card__actions--ready">
                <CdxButton action="progressive" weight="primary" :disabled="citingDisabled(i)" @click="openSaveDialog(i)">Publish</CdxButton>
                <CdxButton v-if="i < cards.length - 1" weight="normal" :disabled="citingDisabled(i)" @click="handleContinue(i)">Continue</CdxButton>
                <CdxButton weight="quiet" @click="handleRevert(i)">Cancel</CdxButton>
              </div>
            </template>

            <template v-else-if="is(i, 'editing')">
              <p class="card__instructions-title">Edit content</p>
              <p class="card__instructions-hint">Remove or rewrite any AI-generated, inaccurate, or unencyclopedic text.</p>
              <CdxField class="card__edit-field">
                <template #label>Article text</template>
                <CdxTextArea v-model="editTexts[i]" :rows="5" class="card__edit-textarea" />
              </CdxField>
              <div class="card__actions card__actions--ready">
                <CdxButton action="progressive" weight="primary" :disabled="aiEditDisabled(i)" @click="openSaveDialog(i)">Publish</CdxButton>
                <CdxButton v-if="i < cards.length - 1" weight="normal" :disabled="aiEditDisabled(i)" @click="handleContinue(i)">Continue</CdxButton>
                <CdxButton weight="quiet" @click="handleRevert(i)">Cancel</CdxButton>
              </div>
            </template>

            <template v-else>
              <div class="card__instructions-header"><p class="card__instructions-title">{{ titleFor(card.type) }}</p></div>
              <p class="card__instructions-description" v-html="descriptionFor(card.type)" />
              <div class="card__actions">
                <CdxButton action="progressive" weight="primary" @click="handlePrimaryAction(card, i)">
                  <template v-if="card.type === 'remove-duplicate'">Remove link</template>
                  <template v-else-if="card.type === 'add-citation'">Add citation</template>
                  <template v-else>Edit</template>
                </CdxButton>
                <CdxButton v-if="i < cards.length - 1" weight="quiet" @click="handleContinue(i)">Continue</CdxButton>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <footer class="edit-view__footer">
      <CdxButton weight="quiet" size="large"><CdxIcon :icon="cdxIconEdit" />Edit full article</CdxButton>
    </footer>

    <SaveChangesDialog :open="saveDialogOpen" :initial-summary="saveDialogSummary" @back="saveDialogOpen = false" @publish="onSaveDialogPublish" />
  </div>
</template>

<style scoped>
  .edit-view { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; background-color: var(--background-color-neutral-subtle, #f8f9fa); }
  .edit-view__header { display: flex; align-items: center; padding: var(--spacing-100, 16px); position: relative; }
  .edit-view__title { flex: 1; margin: 0; font-family: var(--font-family-system-sans); text-align: center; }
  .edit-view__header > button { position: absolute; right: var(--spacing-100); }
  .edit-view__suggestion-count { text-align: center; font-weight: bold; color: var(--color-success); font-size: var(--font-size-small); line-height: var(--line-height-small); }
  .edit-view__body { flex: 1; display: flex; overflow: hidden; }
  .edit-view__carousel { flex: 1; display: flex; align-items: stretch; overflow-x: auto; scroll-snap-type: x mandatory; gap: var(--spacing-150, 24px); padding-inline: var(--spacing-300, 48px); scroll-padding-inline: var(--spacing-300, 48px); -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .edit-view__carousel::-webkit-scrollbar { display: none; }
  .edit-view__card { flex-shrink: 0; width: 100%; scroll-snap-align: center; background-color: var(--background-color-base, #fff); display: flex; flex-direction: column; overflow: hidden; }

  .card__preview { flex: 1; overflow-y: auto; padding: var(--spacing-100, 16px); font-size: var(--font-size-medium, 1rem); line-height: var(--line-height-medium, 1.6); transition: opacity 200ms ease; }
  .card__preview :deep(a) { color: var(--color-progressive, #3366cc); text-decoration: none; }
  .card__preview :deep(.card__preview-duplicate) { background-color: var(--background-color-warning-subtle, #fef6e7); }
  .card__preview--removing :deep(.card__preview-duplicate a) { text-decoration: line-through; opacity: 0.5; }
  .card__preview--done { opacity: 0.45; }

  .card__preview :deep(blockquote) { border-left: 3px solid var(--border-color-base, #a2a9b1); margin: var(--spacing-100, 16px) 0 0 var(--spacing-150, 24px); padding-left: var(--spacing-150, 24px); }
  .card__preview :deep(h2), .card__preview :deep(h3) { font-size: 1.5rem; border-bottom: 1px solid var(--border-color-subtle, #c8ccd1); padding-bottom: var(--spacing-75, 6px); margin: 0 0 var(--spacing-100, 16px); }

  .card__instructions { flex-shrink: 0; padding: var(--spacing-100, 16px); background-color: var(--background-color-neutral); }
  .card__instructions-title { margin: 0 0 var(--spacing-50, 8px); font-weight: var(--font-weight-bold, 700); }
  .card__instructions-title--success { color: var(--color-success, #00af89); }
  .card__instructions-hint { margin: 0 0 var(--spacing-75, 12px); font-size: var(--font-size-small); color: var(--color-subtle, #72777d); }
  .card__instructions-description { margin: 0 0 var(--spacing-100, 16px); color: var(--color-base, #202122); }
  .card__instructions-description :deep(a) { color: var(--color-progressive, #3366cc); text-decoration: none; }

  .card__actions { display: flex; align-items: center; gap: var(--spacing-75, 12px); flex-wrap: wrap; }
  .card__actions--ready { flex-wrap: nowrap; }
  .card__instructions-header { display: flex; align-items: center; gap: var(--spacing-75, 6px); margin-bottom: var(--spacing-75, 6px); }
  .card__instructions-header .card__instructions-title { margin: 0; }

  .card__success-row { display: flex; align-items: center; gap: var(--spacing-50, 8px); }
  .card__success-icon { color: var(--color-success, #00af89); flex-shrink: 0; }
  .card__success-row .card__instructions-title--success { margin: 0; }

  .card__citation-field, .card__edit-field { margin-bottom: var(--spacing-100, 16px); }
  .card__edit-textarea { width: 100%; font-size: var(--font-size-small); font-family: var(--font-family-system-sans); }
  .edit-view__footer { display: flex; justify-content: center; padding: var(--spacing-100, 16px); }
</style>
