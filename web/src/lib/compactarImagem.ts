// Compacta imagem no navegador antes do upload. Sempre devolve JPEG <= maxBytes.
const MAX_BYTES = 1024 * 1024
const MAX_LADO = 2000

async function carregar(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally { URL.revokeObjectURL(url) }
}

function desenhar(img: HTMLImageElement, escala: number): HTMLCanvasElement {
  const w = Math.round(img.naturalWidth * escala)
  const h = Math.round(img.naturalHeight * escala)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))), 'image/jpeg', quality)
  })
}

export async function compactarImagem(file: File, maxBytes = MAX_BYTES): Promise<File> {
  if (file.size <= maxBytes && /^image\/(jpeg|jpg|png)$/i.test(file.type)) return file
  try {
    const img = await carregar(file)
    const ladoMaior = Math.max(img.naturalWidth, img.naturalHeight)
    let escala = ladoMaior > MAX_LADO ? MAX_LADO / ladoMaior : 1
    for (let i = 0; i < 8; i++) {
      const canvas = desenhar(img, escala)
      for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
        const blob = await toBlob(canvas, q)
        if (blob.size <= maxBytes) {
          return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
        }
      }
      escala *= 0.75
      if (escala < 0.1) break
    }
    const canvas = desenhar(img, escala)
    const blob = await toBlob(canvas, 0.4)
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch { return file }
}
