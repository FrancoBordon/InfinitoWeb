import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hashPassword, verifyPassword } from '../../src/lib/password-security.ts'

function legacyDjb2(value) {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) & 0xffffffff
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

test('a legacy admin password can be verified and upgraded to scrypt without changing the password', async () => {
  const password = 'test-admin-password'
  const salt = 'isolated-test-salt'
  const legacyHash = `${salt}:${legacyDjb2(`${salt}:${password}`)}`

  const legacyVerification = await verifyPassword(password, legacyHash)
  assert.deepEqual(legacyVerification, { valid: true, needsRehash: true })

  const upgradedHash = await hashPassword(password)
  assert.match(upgradedHash, /^scrypt\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/)
  assert.deepEqual(await verifyPassword(password, upgradedHash), {
    valid: true,
    needsRehash: false,
  })
  assert.equal((await verifyPassword('wrong-password', upgradedHash)).valid, false)
})

test('an existing scrypt admin password remains verifiable without another rehash', async () => {
  const storedHash = await hashPassword('existing-scrypt-password')
  assert.deepEqual(await verifyPassword('existing-scrypt-password', storedHash), {
    valid: true,
    needsRehash: false,
  })
})
