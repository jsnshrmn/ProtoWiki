export interface CardData {
  type: 'remove-duplicate' | 'add-citation' | 'ai-content'
  previewHTML: string
  /** Plain text extracted from previewHTML — used as seed for the AI-content edit textarea */
  plainText?: string
}
