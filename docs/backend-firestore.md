# Backend Firestore - Cafe Pass

Este projeto usa o Cloud Firestore como backend. Nao existe servidor Node/Express: o frontend Vue conversa diretamente com o Firebase SDK.

## Projeto Firebase

```text
passcafe-225fb
```

Configuracao local:

- `.firebaserc`: aponta o projeto padrao do Firebase CLI.
- `firebase.json`: indica arquivos de regras e indices.
- `firestore.rules`: regras de seguranca do banco.
- `firestore.indexes.json`: indices compostos do Firestore.
- `.env`: credenciais do app Web usadas pelo Vite.

## Colecoes usadas

```text
passcafe/settings
passcafeMembers/{memberId}
```

### `passcafe/settings`

Documento unico com as configuracoes do mes.

Campos:

```js
{
  month: 'AGOSTO / 2026',
  monthlyFee: 15,
  pixType: 'E-mail',
  pixKey: 'cafe-equipe@firma.com.br',
  pixOwner: 'Sr. Cafeeiro do RH'
}
```

### `passcafeMembers/{memberId}`

Um documento por participante.

Campos:

```js
{
  id: '1',
  name: 'Carlinhos do T.I.',
  dept: 'Tecnologia',
  status: 'PAID',
  paidAt: '14/08/2026 09:15'
}
```

Status aceitos:

```text
PAID
UNPAID
```

## Regras configuradas

As regras atuais:

- permitem leitura publica das colecoes usadas pelo app;
- permitem escrita publica apenas nos documentos esperados;
- validam nomes, status, valor mensal e chaves permitidas;
- bloqueiam qualquer outra colecao/documento;
- bloqueiam exclusao de `passcafe/settings`;
- permitem exclusao de integrantes, pois o app tem botao para sair/remover da vaquinha.

Isso e suficiente para iniciar o uso interno do projeto, mas ainda nao e seguranca forte. Como nao existe login, qualquer pessoa com acesso ao app pode alterar os dados permitidos.

## Publicar regras

Faca login no Firebase CLI:

```bash
npm run firebase:login
```

Publique as regras:

```bash
npm run firebase:deploy:rules
```

Publique indices, se algum dia forem adicionados:

```bash
npm run firebase:deploy:indexes
```

## Primeiro uso

Depois de publicar as regras e iniciar o app:

```bash
npm run dev
```

Ao abrir o Cafe Pass, se a colecao `passcafeMembers` estiver vazia, o app cria automaticamente os integrantes padrao definidos em `src/App.vue`.

O documento `passcafe/settings` e criado quando as configuracoes forem salvas no painel admin.

## Evolucao recomendada

Para uma versao mais segura:

- adicionar Firebase Authentication;
- liberar escrita apenas para usuarios autenticados;
- separar permissao de leitura publica e escrita administrativa;
- mover a senha do admin para uma regra real de autenticacao;
- considerar App Check para reduzir abuso fora do app original.
