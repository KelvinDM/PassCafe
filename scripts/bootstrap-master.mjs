import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1)]
    })
)

const projectId = env.VITE_FIREBASE_PROJECT_ID
const apiKey = env.VITE_FIREBASE_API_KEY
const uid = 'OMjgQR2BTlR2UzheRiqF9KMT5Dk1'
const email = 'kelvindaniel1932@gmail.com'

const response = await fetch(
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admins/${uid}?key=${apiKey}`,
  {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        uid: { stringValue: uid },
        email: { stringValue: email },
        role: { stringValue: 'MASTER' },
        createdBy: { stringValue: 'bootstrap' },
        createdAt: { stringValue: new Date().toISOString() }
      }
    })
  }
)

const body = await response.text()
if (!response.ok) {
  console.error(`Bootstrap failed: HTTP ${response.status}`)
  console.error(body)
  process.exit(1)
}

console.log('Mestre do Cafe criado com sucesso:')
console.log(body)
