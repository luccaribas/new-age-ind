# Private Leads API

Backend privado para leads, eventos de navegacao e painel comercial da New Age.

## Objetivo

- receber formularios do site
- validar origem, CNPJ, telefone e anti-spam
- armazenar leads fora do front-end
- registrar page views, cliques, WhatsApp, catalogo, calculadora e envios
- expor leitura apenas com chave interna
- encaminhar leads para planilha quando `PRIVATE_SHEETS_WEBHOOK` estiver configurado

## Rotas publicas por origem autorizada

- `GET /health`
- `POST /api/leads`
- `POST /api/events`

## Rotas privadas com `X-API-Key`

- `GET /api/leads`
- `GET /api/events`
- `GET /api/analytics`

## 1. Instalar

```powershell
cd C:\Users\lucca\new-age-embalagens-site\webhook\private-leads-api
npm install
```

## 2. Configurar ambiente

Copie `.env.example` para `.env` e preencha:

- `ALLOWED_ORIGINS`
- `INTERNAL_API_KEY`
- `PUBLIC_BASE_URL`
- `PRIVATE_SHEETS_WEBHOOK` opcional, para gravar em planilha sem expor o endpoint no front

## 3. Executar

```powershell
npm run dev
```

## 4. Teste de saude

```powershell
Invoke-RestMethod -Uri http://localhost:3030/health -Method Get
```

## 5. Teste de lead

```powershell
Invoke-RestMethod -Uri http://localhost:3030/api/leads -Method Post -ContentType "application/json" -Headers @{"Origin"="https://www.newage.ind.br"} -Body '{"nome":"Teste","empresa":"Empresa Teste","cnpj":"00000000000000","telefone":"11999999999","tipo_embalagem":"Padrao FEFCO","time_to_submit_ms":9000,"page_url":"https://www.newage.ind.br/orcamento-rapido/index.html"}'
```

## 6. Teste de evento

```powershell
Invoke-RestMethod -Uri http://localhost:3030/api/events -Method Post -ContentType "application/json" -Headers @{"Origin"="https://www.newage.ind.br"} -Body '{"event_name":"page_view","page_url":"https://www.newage.ind.br/","page_path":"/","device_type":"desktop"}'
```

## 7. Teste do painel

```powershell
Invoke-RestMethod -Uri http://localhost:3030/api/analytics -Method Get -Headers @{"X-API-Key"="SUA_CHAVE_INTERNA"}
```

## Persistencia

Por padrao, o backend armazena:

- `data/leads.json`
- `data/events.json`

Esses arquivos ficam ignorados pelo Git. Para producao mais robusta, o proximo passo e trocar JSON local por banco persistente ou CRM.

## Painel

Depois do deploy, acesse:

```text
https://www.newage.ind.br/painel-controle/
```

Cole a `INTERNAL_API_KEY` no campo do painel. A chave fica salva apenas no navegador usado para acessar o painel.
