import { customAlphabet } from 'nanoid'

const nano = customAlphabet('0123456789', 8)

export function gerarProtocolo(): string {
  const ano = new Date().getFullYear()
  return `${ano}-${nano()}`
}
