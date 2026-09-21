function emv(id, content) {
  if (!content.length || content.length > 99) throw new Error(`Campo Pix ${id} com tamanho inválido.`)
  return `${id}${String(content.length).padStart(2, '0')}${content}`
}

function normalizeText(value, limit) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .,&-]/g, '').trim().toUpperCase().slice(0, limit)
}

export function normalizePixKey(value, type) {
  let key = String(value || '').trim()
  if (type === 'CPF / CNPJ') {
    key = key.replace(/[.\/\s-]/g, '').toUpperCase()
    if (!/^(?:\d{11}|[A-Z0-9]{12}\d{2})$/.test(key)) throw new Error('Informe um CPF ou CNPJ válido para a chave Pix.')
  } else if (type === 'Celular') {
    key = key.replace(/[()\s-]/g, '')
    if (/^\d{10,11}$/.test(key)) key = `+55${key}`
    else if (/^55\d{10,11}$/.test(key)) key = `+${key}`
    if (!/^\+[1-9]\d{1,14}$/.test(key)) throw new Error('Informe o celular com DDD e código do país para a chave Pix.')
  } else if (type === 'E-mail') {
    key = key.toLowerCase()
    if (!/^[\x21-\x7E]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(key)) throw new Error('Informe um e-mail válido para a chave Pix.')
  } else {
    key = key.toLowerCase()
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(key)) throw new Error('Informe a chave Pix aleatória completa, incluindo os hífens.')
  }
  if (!key || key.length > 77) throw new Error('A chave Pix deve ter entre 1 e 77 caracteres.')
  return key
}

export function crc16(payload) {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(payload)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = ((crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function buildPixPayload(settings) {
  const key = normalizePixKey(settings.pixKey, settings.pixType)
  const amount = Number(settings.monthlyFee)
  if (!Number.isFinite(amount) || amount <= 0 || amount.toFixed(2) === '0.00' || amount.toFixed(2).length > 13) {
    throw new Error('Informe uma cota mensal válida e maior que zero.')
  }
  let account = emv('00', 'br.gov.bcb.pix') + emv('01', key)
  // The entire merchant account template, including nested headers, has a 99-character limit.
  const description = normalizeText(`Cafe Pass ${settings.month || ''}`, Math.max(0, 99 - account.length - 4))
  if (description) account += emv('02', description)
  const payload = [
    emv('00', '01'), emv('26', account), emv('52', '0000'), emv('53', '986'),
    emv('54', amount.toFixed(2)), emv('58', 'BR'),
    emv('59', normalizeText(settings.pixOwner, 25) || 'CAFE PASS'),
    emv('60', 'FIRMA'), emv('62', emv('05', 'CAFEPASS')), '6304'
  ].join('')
  return payload + crc16(payload)
}
