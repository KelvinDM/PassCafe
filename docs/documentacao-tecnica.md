# Documentacao tecnica - Cafe Pass

## Visao geral

O Cafe Pass e uma aplicacao web para controlar a vaquinha mensal do cafe da firma. O sistema permite registrar pagamentos, acompanhar pessoas pendentes, emitir recibos, configurar dados de Pix e administrar a lista de participantes.

O projeto atual e uma conversao do arquivo estatico `passcafe.html` para uma aplicacao Vue 3 com Vite. A aplicacao funciona com Firestore quando as variaveis do Firebase estao configuradas e usa `localStorage` como fallback quando nao ha configuracao de Firebase.

## Stack utilizada

- Vue 3: framework principal da interface.
- Vite: servidor de desenvolvimento e ferramenta de build.
- Firebase / Firestore: persistencia remota opcional.
- Iconify + Pixelarticons: icones pixelados/cartunescos usados na interface Vue.
- Tailwind CSS via CDN: classes utilitarias e tema visual definido no `index.html`.
- Google Fonts via CDN: fontes `Fredoka` e `Space Grotesk`.
- API externa de QR Code: geracao do QR Code visual da chave Pix.

## Dependencias do `package.json`

```json
{
  "@vitejs/plugin-vue": "^5.2.4",
  "@iconify-json/pixelarticons": "^1.2.8",
  "@iconify/vue": "^5.0.1",
  "vite": "^6.3.5",
  "vue": "^3.5.18",
  "firebase": "^12.1.0"
}
```

Observacao: `@vitejs/plugin-vue` e `vite` normalmente ficam em `devDependencies`, mas neste projeto eles estao cadastrados em `dependencies`.

## Scripts disponiveis

```bash
npm install
npm run dev
npm run build
npm run preview
```

- `npm run dev`: inicia o Vite em modo desenvolvimento, expondo em `0.0.0.0`.
- `npm run build`: gera a versao de producao na pasta `dist`.
- `npm run preview`: serve localmente o build gerado.

## Estrutura principal

```text
.
|-- index.html
|-- package.json
|-- vite.config.js
|-- firebase.json
|-- firestore.rules
|-- firestore.indexes.json
|-- .env.example
|-- README.md
|-- passcafe.html
|-- src
|   |-- main.js
|   |-- App.vue
|   |-- firebase.js
|   `-- style.css
|-- dist
|-- exemplo_modelo
`-- docs
    |-- documentacao-tecnica.md
    `-- backend-firestore.md
```

## Arquivos importantes

### `index.html`

Arquivo HTML de entrada da aplicacao. Ele:

- cria o elemento `#app` onde o Vue e montado;
- importa o script principal `/src/main.js`;
- carrega Tailwind CSS via CDN;
- configura o tema do Tailwind direto no navegador;
- carrega Google Fonts.

As cores personalizadas do tema ficam neste arquivo:

- `espresso`
- `roast`
- `mocha`
- `caramel`
- `crema`
- `latte`
- `foam`
- `mint`
- `chili`

### `src/main.js`

Ponto de entrada da aplicacao Vue.

Responsabilidades:

- importar `App.vue`;
- importar o CSS global;
- montar a aplicacao no elemento `#app`.

### `src/App.vue`

Componente principal da aplicacao. Ele concentra a maior parte da interface e das regras de tela.

Funcionalidades principais:

- registro de pagamento por nome e setor;
- cadastro de participante na vaquinha do mes;
- listagem de integrantes;
- filtro por status: todos, pagos e pendentes;
- busca de participantes;
- marcacao manual de pagamento;
- remocao de participante;
- consulta e impressao de recibo;
- painel administrativo com senha simples;
- edicao de mes, valor da mensalidade e dados Pix;
- reinicio mensal dos pagamentos;
- alertas visuais por toast;
- efeitos sonoros simples usando Web Audio API;
- alternancia de mensagens/banners humoristicos;

Dados padrao definidos no componente:

- configuracoes do mes, valor da cota e Pix em `DEFAULT_SETTINGS`;
- participantes iniciais em `DEFAULT_MEMBERS`;
- frases e banners em `FUNNY_EXCUSES` e `FUNNY_BANNERS`.

Senha de teste do painel admin:

```text
cafe123
admin
```

Importante: essa senha esta no frontend e nao deve ser tratada como seguranca real em producao.

### `src/firebase.js`

Modulo de integracao com Firebase/Firestore.

Responsabilidades:

- ler configuracoes do Firebase via `import.meta.env`;
- detectar se existe configuracao minima valida;
- inicializar o app Firebase quando configurado;
- ler e salvar configuracoes da cota;
- ler, salvar e remover membros;
- criar dados iniciais no Firestore quando a colecao esta vazia.

Colecoes/documentos usados:

```text
passcafe/settings
passcafeMembers/{memberId}
```

Funcoes exportadas:

- `hasFirebaseConfig`
- `loadSettings(defaultSettings)`
- `saveSettings(settings)`
- `loadMembers(defaultMembers)`
- `saveMember(member)`
- `deleteMember(id)`
- `saveMembers(members)`

### `src/style.css`

CSS global do projeto.

Responsabilidades:

- definir fonte padrao e fundo;
- criar classes de borda estilo quadrinhos;
- animar vapor do icone de cafe;
- estilizar carimbo de recibo aprovado;
- esconder scrollbar em navegacao horizontal;
- ajustar impressao para mostrar apenas o recibo.

### `vite.config.js`

Configuracao minima do Vite com plugin Vue.

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()]
})
```

### `firebase.json`

Configuracao do Firebase CLI. Aponta quais arquivos devem ser usados para Firestore Rules e indices.

### `firestore.rules`

Regras de seguranca do Firestore. O projeto permite leitura e escrita apenas nas estruturas usadas pelo app:

- `passcafe/settings`
- `passcafeMembers/{memberId}`

Qualquer outro caminho fica bloqueado.

### `firestore.indexes.json`

Arquivo de indices compostos do Firestore. No momento esta vazio porque as consultas atuais nao precisam de indice customizado.

### `.env.example`

Modelo das variaveis necessarias para conectar no Firebase:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Para usar Firestore, copie este arquivo para `.env` e preencha com os dados do app Firebase.

## Persistencia de dados

O projeto possui dois modos de persistencia.

### Modo local

Quando as variaveis do Firebase nao estao configuradas, o app usa `localStorage`.

Chaves usadas:

```text
cafe_settings
cafe_members
```

Esse modo e util para desenvolvimento, testes rapidos e uso local.

### Modo Firestore

Quando `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` e `VITE_FIREBASE_APP_ID` estao preenchidas, o app inicializa o Firebase e usa Firestore.

Dados salvos:

- configuracoes em `passcafe/settings`;
- integrantes em `passcafeMembers`;
- cada integrante usa o proprio `id` como ID do documento.

As regras e instrucoes do backend estao detalhadas em `docs/backend-firestore.md`.

## Modelo de dados

### Configuracoes

```js
{
  month: 'AGOSTO / 2026',
  monthlyFee: 15,
  pixType: 'E-mail',
  pixKey: 'cafe-equipe@firma.com.br',
  pixOwner: 'Sr. Cafeeiro do RH'
}
```

### Integrante

```js
{
  id: '1',
  name: 'Carlinhos do T.I.',
  dept: 'Tecnologia',
  status: 'PAID',
  paidAt: '14/08/2026 09:15'
}
```

Status possiveis:

- `PAID`: pagamento registrado.
- `UNPAID`: pagamento pendente.

## Fluxos principais

### Registrar pagamento

1. Usuario informa nome e, opcionalmente, setor.
2. O app procura integrante com o mesmo nome.
3. Se encontrar, marca como `PAID` e atualiza `paidAt`.
4. Se nao encontrar, cria um novo integrante ja marcado como pago.
5. Salva localmente e, se configurado, no Firestore.
6. Redireciona para a aba de recibos.

### Entrar na vaquinha

1. Usuario abre o modal "Entrar Este Mes".
2. Informa nome e setor.
3. Se o nome ainda nao existir, o app cria um integrante com status `UNPAID`.

### Reiniciar mes

1. Admin acessa o painel.
2. Aciona o reinicio mensal.
3. Todos os integrantes permanecem cadastrados.
4. Todos os status voltam para `UNPAID` e `paidAt` vira `null`.

### Gerar recibo

1. Usuario busca pelo nome.
2. O app valida se o integrante existe.
3. O recibo so e exibido se o status for `PAID`.
4. O botao de impressao usa `window.print()`.

## Integracoes externas

- QR Code: `https://api.qrserver.com/v1/create-qr-code/`
- Tailwind CDN: `https://cdn.tailwindcss.com`
- Google Fonts: `https://fonts.googleapis.com` e `https://fonts.gstatic.com`
- Iconify Vue: pacote `@iconify/vue`
- Pixelarticons: pacote `@iconify-json/pixelarticons`

## Build e distribuicao

Para gerar os arquivos finais:

```bash
npm run build
```

O resultado e criado em:

```text
dist/
```

Para testar o build:

```bash
npm run preview
```

## Pontos de atencao

- A senha do admin esta exposta no frontend e serve apenas para uso simples/teste.
- O Firestore depende de regras de seguranca configuradas no console do Firebase.
- O Tailwind esta sendo carregado por CDN; para producao mais robusta, pode valer migrar para Tailwind instalado no build.
- O app usa `localStorage` como fallback, entao dados locais ficam somente no navegador atual.
- Ha arquivos gerados como `dist`, `node_modules` e logs do Vite no diretorio do projeto.
- O projeto nao parece estar inicializado como repositorio Git no momento desta documentacao.

## Checklist para novo desenvolvedor

1. Rodar `npm install`.
2. Rodar `npm run dev`.
3. Abrir `http://localhost:5173/`.
4. Se for usar Firebase, copiar `.env.example` para `.env`.
5. Preencher as variaveis `VITE_FIREBASE_*`.
6. Conferir regras do Firestore antes de publicar.
7. Rodar `npm run build` antes de distribuir.
