# WhatsApp Z-API - Backend Inicial

Este backend faz a triagem comercial inicial da New Age Embalagens com:

- nome
- CNPJ
- assunto

Depois disso, ele encerra a automacao e deixa o atendimento humano continuar.

## Rotas

- `GET /health`
- `POST /webhooks/zapi`
- `POST /api/whatsapp/start-triage`
- `POST /api/whatsapp/send-text`
- `GET /api/leads`

## 1. Instalar

```powershell
cd C:\Users\lucca\new-age-embalagens-site\webhook\whatsapp-zapi
npm install
```

## 2. Configurar ambiente

Copie `.env.example` para `.env` e preencha:

- `ZAPI_INSTANCE_ID`
- `ZAPI_INSTANCE_TOKEN`
- `ZAPI_CLIENT_TOKEN` se sua conta usar esse header
- `INTERNAL_API_KEY`
- `PUBLIC_BASE_URL`
- `ALLOWED_ORIGIN`

## 3. Executar

```powershell
npm run dev
```

## 4. Configurar a Z-API

Na area de webhooks da instancia:

- `Ao receber`: `https://SEU_BACKEND/webhooks/zapi`
- `Ao conectar`: `https://SEU_BACKEND/webhooks/zapi`
- `Ao desconectar`: `https://SEU_BACKEND/webhooks/zapi`

Toggles recomendados:

- `Rejeitar chamadas automatico`: ligado
- `Ler mensagens automatico`: ligado
- `Ler status automaticamente`: desligado
- `Desabilitar enfileiramento quando whatsapp estiver desconectado`: ligado

## 5. Iniciar triagem manual

```http
POST /api/whatsapp/start-triage
Content-Type: application/json
X-API-Key: SUA_CHAVE_INTERNA

{
  "phone": "5511999999999",
  "origin": "site",
  "pageOrigin": "/orcamento-rapido/"
}
```

## 6. Persistencia

Os leads ficam em:

- `data/whatsapp-leads.json`

Para MVP isso basta. Em producao, troque por banco ou CRM.
