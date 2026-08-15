# Cafe Pass

> O sistema oficial, semi-oficial e moralmente obrigatorio da vaquinha do cafe da firma.

Cafe Pass e uma aplicacao web feita em **Vue 3 + Vite** para registrar quem pagou a cota mensal do cafe, quem esta devendo, quem merece recibo e quem precisa ouvir a sirene administrativa da cobranca.

Porque planilha ate resolve. Mas planilha nao julga ninguem com estilo.

## O Que Ele Faz

- Registra pagamentos da cota mensal do cafe.
- Mantem uma lista de participantes cafeinados e pendentes.
- Mostra total arrecadado, quantidade de quitados e pendentes.
- Gera recibo de pagamento para quem esta em dia com a cafeina.
- Permite cadastrar novos participantes na vaquinha.
- Tem painel admin para alterar mes, valor e dados Pix.
- Reinicia os pagamentos para um novo mes sem apagar os integrantes.
- Funciona com **Firestore** quando configurado.
- Funciona em modo local com **localStorage** quando nao ha Firebase.
- Faz tudo isso com uma estetica de reparticao cartunesca fiscalizando o bule coletivo.

## Stack

- **Vue 3**
- **Vite**
- **Firebase / Firestore**
- **Tailwind CSS via CDN**
- **Font Awesome via CDN**
- **Google Fonts**
- **JSZip**
- **FileSaver.js**

## Como Rodar

Instale as dependencias:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra no navegador:

```text
http://localhost:5173/
```

Se tudo deu certo, o fiscal do cafe ja esta de plantao.

## Scripts

```bash
npm run dev
```

Roda o projeto em modo desenvolvimento usando Vite.

```bash
npm run build
```

Gera a versao de producao na pasta `dist`.

```bash
npm run preview
```

Serve localmente o build gerado para conferencia antes de publicar.

## Configurando Firebase

O projeto funciona sem Firebase, usando `localStorage`. Mas se quiser que a lista sobreviva fora do navegador de uma unica pessoa sortuda, configure o Firestore.

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Preencha o `.env`:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Com essas variaveis preenchidas, o app usa:

- `passcafe/settings` para configuracoes da cota.
- `passcafeMembers` para a lista de integrantes.

Sem essas variaveis, o Cafe Pass trabalha no modo "cada navegador por si", salvando em `localStorage`.

## Estrutura

```text
.
|-- index.html
|-- package.json
|-- vite.config.js
|-- .env.example
|-- src
|   |-- main.js
|   |-- App.vue
|   |-- firebase.js
|   `-- style.css
|-- docs
|   `-- documentacao-tecnica.md
`-- exemplo_modelo
```

## Painel Admin

O painel administrativo permite:

- alterar mes de referencia;
- alterar valor da mensalidade;
- editar chave Pix e titular;
- adicionar integrantes;
- reiniciar pagamentos do mes;
- acionar a cobranca moral-sonora dos pendentes.

Senha padrao de teste:

```text
cafe123
```

Tambem existe:

```text
admin
```

Aviso de responsabilidade cafeinada: essa senha esta no frontend. Ela serve para brincadeira, teste e controle simples. Para seguranca real, precisa de autenticacao de verdade no backend/Firebase.

## Documentacao

A documentacao tecnica completa esta em:

```text
docs/documentacao-tecnica.md
```

La tem detalhes sobre arquivos principais, persistencia, modelo de dados, integracoes externas e fluxo do sistema.

## Build

Para gerar a versao final:

```bash
npm run build
```

O resultado fica em:

```text
dist/
```

Essa pasta nao deve ir para o Git, porque ela e gerada a partir do codigo fonte. O cafe pode ser artesanal, mas o build nao precisa ser versionado.

## Observacoes Importantes

- `.env` nao deve ser commitado.
- `node_modules` nao deve ser commitado.
- `dist` nao deve ser commitado.
- As regras do Firestore precisam ser configuradas no Firebase.
- O modo local salva dados apenas no navegador atual.
- O QR Code e gerado por uma API externa usando a chave Pix configurada.

## Licenca Moral do Cafe

Pagou, tomou.

Nao pagou, vira estatistica no painel.

Sem cota, sem cafeina.
