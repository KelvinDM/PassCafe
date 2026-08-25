# Backend Firebase - Cafe Pass

O Cafe Pass usa Firebase direto no frontend:

- Cloud Firestore para os dados da vaquinha.
- Firebase Authentication para o login do painel admin.

Nao existe senha de admin no codigo. O acesso ao painel e feito por e-mail e senha cadastrados no Firebase.

## Cargos

Existem dois cargos na brigada do cafe:

- `MASTER`: Mestre do Cafe. Acessa tudo, altera Pix/valor/mes e cadastra novos usuarios.
- `APPRENTICE`: Aprendiz do Cafe. Ajuda na rotina da lista e pagamentos, mas nao cadastra usuarios nem altera parametros principais.

## Habilitar login admin

No Firebase Console:

1. Va em **Authentication**.
2. Clique em **Get started** se ainda nao estiver habilitado.
3. Entre em **Sign-in method**.
4. Habilite **Email/Password**.
5. Va em **Users**.
6. Clique em **Add user**.
7. Cadastre o e-mail do primeiro Mestre do Cafe e uma senha inicial.

## Criar o primeiro Mestre

O primeiro Mestre precisa ser criado uma vez pelo Firebase Console:

1. Crie o usuario em **Authentication > Users**.
2. Copie o `uid` desse usuario.
3. Va em **Firestore Database**.
4. Crie a colecao `admins`.
5. Crie um documento com ID igual ao `uid`.
6. Adicione os campos:

```js
{
  uid: 'UID_DO_USUARIO',
  email: 'email@exemplo.com',
  role: 'MASTER',
  createdBy: 'bootstrap',
  createdAt: '2026-08-15T00:00:00.000Z'
}
```

Depois disso, o Mestre entra pelo painel usando esse e-mail e senha.

## Adicionar usuarios pela aplicacao

Com um Mestre autenticado no painel:

1. Abra **Painel Admin**.
2. Va ate **Brigada do Cafe**.
3. Informe e-mail e senha inicial.
4. Escolha `Aprendiz do Cafe` ou `Mestre do Cafe`.
5. Clique em **Cadastrar na Brigada**.

O app cria o usuario no Firebase Authentication e registra o cargo em `admins/{uid}`.

## Recuperacao de senha

O botao **Esqueci a senha, mandar link por e-mail** usa o Firebase Authentication para enviar um link de redefinicao para o e-mail digitado.

Se o dev esquecer a senha:

1. Abra o app.
2. Va em **Painel Admin**.
3. Digite o e-mail cadastrado.
4. Clique em **Esqueci a senha, mandar link por e-mail**.
5. Abra o e-mail e crie uma nova senha.

## Firestore

Colecoes usadas:

```text
passcafe/settings
passcafeMembers/{memberId}
admins/{uid}
```

### `passcafe/settings`

Documento com configuracoes do mes:

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

Um documento por participante:

```js
{
  id: '1',
  name: 'Carlinhos do T.I.',
  dept: 'Tecnologia',
  status: 'PAID',
  paidAt: '14/08/2026 09:15'
}
```

## Regras

As regras estao em:

```text
firestore.rules
```

Resumo:

- leitura publica para os dados da vaquinha;
- leitura da lista `admins` apenas para Mestre/Aprendiz autenticado;
- escrita de `passcafe/settings` somente para Mestre;
- criacao de novos documentos `admins/{uid}` somente para Mestre;
- criacao/atualizacao de integrantes liberada para manter o fluxo publico de pagamento/entrada;
- exclusao de integrantes somente para Mestre ou para o proprio usuario que criou a entrada, desde que ainda nao esteja quitada no mes;
- qualquer outro caminho fica bloqueado.

## Publicar regras

Faca login:

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

## Observacao de seguranca

Este modelo protege a senha do admin e diferencia Mestre/Aprendiz. Como o app permite que usuarios registrem pagamentos sem login, a colecao `passcafeMembers` ainda aceita criacao/atualizacao publica validada.

Para uma versao mais fechada, o proximo passo seria exigir login tambem para registrar pagamentos ou criar uma Cloud Function para validar acoes sensiveis.
