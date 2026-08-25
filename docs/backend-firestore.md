# Backend Firebase - Cafe Pass

O Cafe Pass usa Cloud Firestore e login Google. O sistema de convites funciona integralmente pelas regras do Firestore e permanece no plano gratuito.

## Cargos

Existem dois cargos na brigada do cafe:

- `MASTER`: Mestre do Cafe. Acessa tudo, altera Pix/valor/mes e cadastra novos usuarios.
- `APPRENTICE`: Aprendiz do Cafe. Ajuda na rotina da lista e pagamentos, mas nao cadastra usuarios nem altera parametros principais.

## Habilitar login Google

No Firebase Console:

1. Va em **Authentication**.
2. Clique em **Get started** se ainda nao estiver habilitado.
3. Entre em **Sign-in method**.
4. Habilite **Google**.
5. Autorize o dominio em que o Cafe Pass sera publicado.

## Configurar o Mestre Supremo

A conta protegida e reconhecida pelo UID do Firebase Authentication. O e-mail nao fica em variavel `VITE_*`, na lista administrativa ou no bundle. No primeiro login, o proprio app cria ou protege `admins/{uid}` conforme as regras publicadas.

## Adicionar usuarios pela aplicacao

Com um Mestre autenticado no painel:

1. Abra **Painel Admin**.
2. Va ate **Brigada do Cafe**.
3. Informe o e-mail da conta Google.
4. Escolha `Aprendiz do Cafe` ou `Mestre do Cafe`.
5. Clique em **Convidar**.

O colega recebe o convite dentro do app e precisa aceitar antes de ganhar acesso. Consulte `docs/admin-invites.md` para o fluxo completo.

## Firestore

Colecoes usadas:

```text
passcafe/settings
passcafeMembers/{memberId}
admins/{uid}
adminInvites/{inviteId}
adminDirectory/{uid}
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
- leitura de `admins/{uid}` apenas pelo proprio usuario; listagem direta bloqueada;
- leitura e escrita direta de `adminInvites` bloqueadas;
- escrita de `passcafe/settings` somente para Mestre;
- convites, cargos, aceitacao e revogacoes validados pelas regras do Firestore;
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
