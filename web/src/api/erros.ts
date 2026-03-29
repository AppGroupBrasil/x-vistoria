/**
 * Extrai mensagem de erro legível de respostas da API.
 * O interceptor do axios já faz unwrap de err.response.data,
 * então `err` aqui é o objeto { statusCode, message, ... } da API.
 */
export function extrairErro(err: any, fallback: string): string {
  if (!err) return fallback

  if (err.statusCode === 401) return 'Não autorizado. Faça login novamente.'
  if (err.statusCode === 403) return 'Sem permissão para esta ação.'
  if (err.statusCode === 404) return 'Recurso não encontrado.'
  if (err.statusCode === 409) return err.message || 'Conflito: registro já existe.'
  if (err.statusCode === 422) return Array.isArray(err.message) ? err.message.join(', ') : (err.message || 'Dados inválidos.')
  if (err.statusCode === 429) return 'Muitas requisições. Aguarde um momento.'
  if (err.statusCode === 400) return Array.isArray(err.message) ? err.message.join(', ') : (err.message || 'Dados inválidos.')
  if (err.statusCode >= 500) return `Erro no servidor (${err.statusCode}). Tente novamente.`

  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK')
    return 'Sem conexão com o servidor. Verifique sua internet.'
  if (err.code === 'ECONNABORTED')
    return 'Tempo de conexão esgotado. Tente novamente.'

  if (typeof err.message === 'string') return err.message
  if (Array.isArray(err.message)) return err.message.join(', ')

  return fallback
}
