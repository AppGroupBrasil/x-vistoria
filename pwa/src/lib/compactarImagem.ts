// Compacta a imagem no navegador antes do upload.
// Retorna sempre um File JPEG com no máximo MAX_BYTES (default 1 MB).

const MAX_BYTES = 1024 * 1024
const MAX_LADO = 2000 // dimensão máxima (px) de qualquer lado

async function carregar(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function desenhar(img: HTMLImageElement, escala: number): HTMLCanvasElement {
  const w = Math.round(img.naturalWidth * escala)
  const h = Math.round(img.naturalHeight * escala)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))), 'image/jpeg', quality)
  })
}

export async function compactarImagem(file: File, maxBytes = MAX_BYTES): Promise<File> {
  // Se já é pequeno e é jpeg/png, devolve como está
  if (file.size <= maxBytes && /^image\/(jpeg|jpg|png)$/i.test(file.type)) {
    return file
  }

  try {
    const img = await carregar(file)
    const ladoMaior = Math.max(img.naturalWidth, img.naturalHeight)
    let escala = ladoMaior > MAX_LADO ? MAX_LADO / ladoMaior : 1

    // Tenta qualidades decrescentes; se ainda passar do limite, reduz escala
    for (let tentativa = 0; tentativa < 8; tentativa++) {
      const canvas = desenhar(img, escala)
      for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
        const blob = await toBlob(canvas, q)
        if (blob.size <= maxBytes) {
          return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
        }
      }
      escala *= 0.75 // reduz mais e tenta de novo
      if (escala < 0.1) break
    }
    // Último recurso: devolve o menor que conseguiu
    const canvas = desenhar(img, escala)
    const blob = await toBlob(canvas, 0.4)
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Se falhar (ex.: HEIC sem decoder), devolve o original
    return file
  }
}
