export interface PhotoFile {
  type: string
  size: number
}

export interface Effects {
  schedule(task: () => void, milliseconds: number): () => void
  scrollToTop(): void
  onPageRestored(listener: () => void): () => void
  reload(): void
  openWhatsApp(phone: string, message: string): void
  createPreview(file: PhotoFile): string
  revokePreview(url: string): void
  now(): Date
  newId(): string
}
