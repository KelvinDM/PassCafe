# Convites e cargos administrativos

O gerenciamento da Brigada do Cafe usa somente Firebase Authentication e Cloud Firestore, permanecendo compativel com o plano gratuito.

## Fluxo de convite

1. Um usuario com cargo `MASTER` abre **Painel do Cafe > Brigada Administrativa**.
2. Informa o e-mail da conta Google e escolhe `MASTER` ou `APPRENTICE`.
3. O convite fica com status `PENDING` em `adminInvites`.
4. Ao entrar com a conta Google convidada, o colega recebe um aviso dentro da aplicacao.
5. Se aceitar, uma operacao atomica cria `admins/{uid}` e `adminDirectory/{uid}` e marca o convite como `ACCEPTED`.
6. Se recusar, o convite passa para `DECLINED` e nenhum acesso e criado.

Convites pendentes podem ser cancelados. Depois da aceitacao, o Mestre pode alterar o cargo ou remover o acesso. Um administrador nao pode alterar nem remover a si mesmo.

## Protecoes

- cada usuario pode ler somente o proprio documento `admins/{uid}`;
- um usuario so pode consultar convites destinados ao e-mail autenticado dele;
- apenas Mestres podem criar, listar ou cancelar convites;
- a aceitacao exige que e-mail, cargo e convite coincidam nas regras do Firestore;
- `adminDirectory` contem apenas contas gerenciaveis e nunca inclui a conta protegida;
- a conta protegida e reconhecida por UID, nao por e-mail publicado no frontend;
- alteracoes de cargo atualizam `admins` e `adminDirectory` na mesma operacao atomica;
- nenhuma Cloud Function, Secret Manager ou plano Blaze e necessario.

## Publicacao

Depois de atualizar o codigo, publique as regras:

```bash
npm run firebase:deploy:rules
```

Em seguida, gere e publique o frontend normalmente.
