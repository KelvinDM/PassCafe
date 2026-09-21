import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPixPayload, crc16, normalizePixKey } from './pix.js'

function parse(payload) {
  const fields = {}
  for (let offset = 0; offset < payload.length;) {
    const id = payload.slice(offset, offset + 2)
    const lengthText = payload.slice(offset + 2, offset + 4)
    assert.match(lengthText, /^\d{2}$/)
    const length = Number(lengthText)
    const value = payload.slice(offset + 4, offset + 4 + length)
    assert.equal(value.length, length)
    fields[id] = value
    offset += 4 + length
  }
  return fields
}

const settings = { pixType: 'Celular', pixKey: '(65) 99999-9999', pixOwner: 'João Café', monthlyFee: 15, month: 'SETEMBRO / 2026' }

test('normalizes local, country-prefixed and international phone keys', () => {
  for (const key of ['(65) 99999-9999', '5565999999999', '+55 (65) 99999-9999']) {
    assert.equal(normalizePixKey(key, 'Celular'), '+5565999999999')
  }
  assert.equal(normalizePixKey('(55) 99999-9999', 'Celular'), '+5555999999999')
  assert.throws(() => normalizePixKey('telefone inválido', 'Celular'))
})

test('encodes phone, amount, recipient and CRC into a readable TLV structure', () => {
  const payload = buildPixPayload(settings)
  const fields = parse(payload)
  assert.equal(parse(fields['26'])['01'], '+5565999999999')
  assert.equal(fields['54'], '15.00')
  assert.equal(fields['59'], 'JOAO CAFE')
  assert.equal(fields['63'], crc16(payload.slice(0, -4)))
  assert.equal(crc16('123456789'), '29B1')
})

test('limits nested account fields without truncating the recipient key', () => {
  for (const length of [36, 73, 74, 77]) {
    const key = 'a'.repeat(length - 12) + '@example.com'
    const fields = parse(buildPixPayload({ ...settings, pixType: 'E-mail', pixKey: key, month: 'X'.repeat(100) }))
    assert.ok(fields['26'].length <= 99)
    assert.equal(parse(fields['26'])['01'], key)
  }
})

test('preserves document digits and UUID punctuation', () => {
  assert.equal(normalizePixKey('123.456.789-00', 'CPF / CNPJ'), '12345678900')
  assert.equal(normalizePixKey('12.ABC.345/01DE-35', 'CPF / CNPJ'), '12ABC34501DE35')
  const key = '123e4567-e12b-12d1-a456-426655440000'
  assert.equal(normalizePixKey(key.toUpperCase(), 'Chave Aleatória'), key)
})

test('rejects malformed settings instead of emitting an invalid payload', () => {
  for (const monthlyFee of [0, -1, NaN, Infinity, 'abc', 0.001]) {
    assert.throws(() => buildPixPayload({ ...settings, monthlyFee }))
  }
  assert.throws(() => buildPixPayload({ ...settings, pixKey: '' }))
})
