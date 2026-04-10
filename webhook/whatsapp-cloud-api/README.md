# WhatsApp Cloud API - Backend Inicial

Este backend foi pensado para a triagem comercial da New Age Embalagens.

Objetivo:

- captar `nome`
- captar `CNPJ`
- captar `assunto`
- gravar o estado da conversa
- encerrar a automacao e deixar o atendimento humano assumir

## Estrutura

- `GET /health`
- `GET /webhooks/whatsapp`
- `POST /webhooks/whatsapp`
- `POST /api/whatsapp/start-triage`
- `POST /api/whatsapp/send-text`
- `GET /api/leads`

## 1. Instalar

```powershell
cd C:\Users\lucca\new-age-embalagens-site\webhook\whatsapp-cloud-api
npm install
```

## 2. Configurar ambiente

Copie `.env.example` para `.env` e preencha:

- `META_ACCESS_TOKEN`
- `META_PHONE_NUMBER_ID`
- `META_VERIFY_TOKEN`
- `INTERNAL_API_KEY`
- `PUBLIC_BASE_URL`
- `ALLOWED_ORIGIN`

## 3. Executar

```powershell
npm run dev
```

## 4. Configurar webhook na Meta

Na configuracao do app WhatsApp na Meta:

- Callback URL:
  - `https://SEU_BACKEND/webhooks/whatsapp`
- Verify token:
  - o mesmo valor de `META_VERIFY_TOKEN`

Assine pelo menos:

- `messages`
- `message_template_status_update`

## 5. Iniciar uma triagem manual

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

## 6. Fluxo

1. backend envia pergunta do nome
2. cliente responde
3. backend pede CNPJ
4. cliente responde
5. backend envia lista de assuntos
6. cliente escolhe
7. backend marca o lead como `triado`
8. atendimento humano assume

## 7. Persistencia

Os leads ficam em:

- `data/whatsapp-leads.json`

Isso e suficiente para MVP. Em producao, troque por banco ou CRM.
