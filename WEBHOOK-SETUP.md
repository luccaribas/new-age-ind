# Webhook Simples Para os Formularios

O caminho mais simples para captar os formularios hoje e usar `Google Apps Script` + `Google Sheets`.

## 1. Criar a planilha

Crie uma planilha no Google Sheets. O script vai trabalhar com 2 abas:

- `Leads`
- `Leads_Detalhes`

Se elas nao existirem, o script cria automaticamente.

### Aba `Leads`

Esta e a aba operacional, pensada para comercial e atendimento.

Colunas:

```text
data_recebimento | status | responsavel | data_contato | origem | formulario | nome | empresa | cnpj | telefone | tipo_embalagem | precisa_ajuda | resumo_pedido | pagina | utm_source | utm_medium | utm_campaign
```

### Aba `Leads_Detalhes`

Esta e a aba de memoria tecnica, para guardar os campos mais longos e menos operacionais.

Colunas:

```text
data_recebimento | empresa | modelos_padrao | modelos_especificacoes | itens_personalizados | wizard_recomendacao | observacoes | pagina_titulo | pagina_url | referrer | device_type
```

## 2. Criar o Apps Script

1. Abra a planilha.
2. Clique em `Extensoes` > `Apps Script`.
3. Apague o conteudo padrao.
4. Cole o codigo de [webhook/google-apps-script.gs](./webhook/google-apps-script.gs).
5. Troque:

```js
var spreadsheetId = "COLE_AQUI_O_ID_DA_PLANILHA";
```

Pelo ID real da sua planilha.

## 3. Publicar como Web App

1. Clique em `Implantar` > `Nova implantacao`.
2. Escolha `Aplicativo da Web`.
3. Em `Executar como`, use sua conta.
4. Em `Quem tem acesso`, escolha `Qualquer pessoa`.
5. Clique em `Implantar`.
6. Copie a URL gerada.

## 4. Conectar ao site

No arquivo [script.js](./script.js), troque:

```js
formEndpoint: "",
```

por:

```js
formEndpoint: "COLE_AQUI_A_URL_DO_WEBHOOK"
```

Opcionalmente, preencha tambem:

```js
whatsappNumber: "5511999999999",
  businessEmail: "",
```

## 5. Publicar a alteracao

```powershell
cd C:\Users\lucca\new-age-embalagens-site
git add script.js WEBHOOK-SETUP.md webhook/google-apps-script.gs
git commit -m "Adiciona setup de webhook via Google Apps Script"
git push
```

## 6. Criar os cabecalhos

No Apps Script, execute a funcao:

```js
criarCabecalhos()
```

Ela cria os cabecalhos das duas abas automaticamente.

## 7. Testar

1. Envie um formulario no site.
2. Veja se uma nova linha entrou na aba `Leads`.
3. Veja se os detalhes tecnicos entraram na aba `Leads_Detalhes`.
4. Se nao entrar, teste a funcao `testePostLocal()` dentro do Apps Script primeiro.

## Observacao

Sem `formEndpoint`, os dados continuam ficando apenas no `localStorage` do navegador.
