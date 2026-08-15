# Café Pass Vue

Conversão do `passcafe.html` para Vue 3 + Vite, mantendo o layout original e usando Firestore como backend quando as credenciais do Firebase estiverem configuradas.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173/`.

## Configurar Firestore

Copie `.env.example` para `.env` e preencha os valores do seu app Firebase:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Com as variáveis preenchidas, o app usa:

- Documento `passcafe/settings` para as configurações da cota.
- Coleção `passcafeMembers` para os integrantes.

Sem `.env`, o sistema funciona em modo local usando `localStorage`.
