# Private Leads API

Backend privado para substituir o Apps Script na captura de leads do site.

## Objetivo

- receber os formulários do site
- validar origem, CNPJ, telefone e anti-spam
- armazenar os leads em backend privado
- expor leitura apenas com chave interna

## Rotas

- `GET /health`
- `POST /api/leads`
- `GET /api/leads`

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

## 4. Teste de saúde

```powershell
Invoke-RestMethod -Uri http://localhost:3030/health -Method Get
```

## 5. Teste de lead

```powershell
Invoke-RestMethod -Uri http://localhost:3030/api/leads -Method Post -ContentType "application/json" -Headers @{"Origin"="https://www.newage.ind.br"} -Body '{"nome":"Teste","empresa":"Empresa Teste","cnpj":"00000000000000","telefone":"11999999999","tipo_embalagem":"Padrao FEFCO","time_to_submit_ms":9000,"page_url":"https://www.newage.ind.br/orcamento-rapido/index.html"}'
```

## 6. Teste de leitura interna

```powershell
Invoke-RestMethod -Uri http://localhost:3030/api/leads -Method Get -Headers @{"X-API-Key"="SUA_CHAVE_INTERNA"}
```

## Persistência

Por padrão, os leads são armazenados em:

- `data/leads.json`

Se `PRIVATE_SHEETS_WEBHOOK` estiver preenchido, o backend também encaminha cada lead para a planilha.

Isso permite:

- manter o endpoint da planilha fora do front
- continuar com backup local no backend
- centralizar a segurança no servidor

Para produção mais robusta, o próximo passo continua sendo banco ou CRM.
