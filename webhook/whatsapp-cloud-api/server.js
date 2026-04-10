const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3010);
const GRAPH_BASE_URL = "https://graph.facebook.com/v22.0";
const LEADS_FILE = path.join(__dirname, "data", "whatsapp-leads.json");
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const SUBJECT_OPTIONS = [
  "Cotacao de caixa padrao",
  "Caixa sob medida",
  "Ajuda para escolher modelo",
  "Prazo / entrega",
  "Pedido recorrente",
  "Outro"
];

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "new-age-whatsapp-cloud-api",
    leads: Object.keys(readLeads()).length
  });
});

app.get("/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ ok: false, error: "Webhook verify token invalido." });
});

app.post("/webhooks/whatsapp", async (req, res) => {
  try {
    const events = extractWhatsAppEvents(req.body);

    for (const event of events) {
      if (event.type === "message") {
        await handleIncomingMessage(event);
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Erro ao processar webhook do WhatsApp:", error);
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.post("/api/whatsapp/start-triage", async (req, res) => {
  try {
    if (!hasInternalApiKey(req)) {
      return res.status(401).json({ ok: false, error: "Acesso interno nao autorizado." });
    }

    const phone = normalizePhone(req.body.phone);
    if (!phone) {
      return res.status(400).json({ ok: false, error: "Telefone invalido." });
    }

    const leads = readLeads();
    leads[phone] = buildFreshLead({
      phone,
      origin: req.body.origin || "site",
      pageOrigin: req.body.pageOrigin || ""
    });
    writeLeads(leads);

    await sendTextMessage(
      phone,
      "Olá, aqui é da New Age Embalagens.\n\nPara direcionar seu atendimento comercial, me informe primeiro o seu nome."
    );

    res.json({ ok: true, lead: leads[phone] });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.post("/api/whatsapp/send-text", async (req, res) => {
  try {
    if (!hasInternalApiKey(req)) {
      return res.status(401).json({ ok: false, error: "Acesso interno nao autorizado." });
    }

    const phone = normalizePhone(req.body.phone);
    const message = String(req.body.message || "").trim();

    if (!phone || !message) {
      return res.status(400).json({ ok: false, error: "Telefone ou mensagem invalidos." });
    }

    const result = await sendTextMessage(phone, message);
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get("/api/leads", (req, res) => {
  if (!hasInternalApiKey(req)) {
    return res.status(401).json({ ok: false, error: "Acesso interno nao autorizado." });
  }
  res.json({ ok: true, items: Object.values(readLeads()) });
});

app.listen(PORT, () => {
  ensureLeadsFile();
  console.log(`WhatsApp Cloud API backend ativo na porta ${PORT}`);
});

function ensureLeadsFile() {
  const dir = path.dirname(LEADS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify({}, null, 2), "utf8");
  }
}

function readLeads() {
  ensureLeadsFile();
  return JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
}

function writeLeads(leads) {
  ensureLeadsFile();
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf8");
}

function buildFreshLead({ phone, origin, pageOrigin }) {
  return {
    phone,
    status: "em_triagem",
    step: "name",
    name: "",
    cnpj: "",
    subject: "",
    origin,
    pageOrigin,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 12 ? digits : "";
}

function hasInternalApiKey(req) {
  const expected = String(process.env.INTERNAL_API_KEY || "").trim();
  if (!expected) {
    return false;
  }

  const received = String(req.headers["x-api-key"] || req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return received === expected;
}

function sanitizeCnpj(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidCnpj(cnpj) {
  return sanitizeCnpj(cnpj).length === 14;
}

function extractWhatsAppEvents(payload) {
  const entries = payload?.entry || [];
  const events = [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const message of value.messages || []) {
        events.push({
          type: "message",
          from: normalizePhone(message.from),
          message
        });
      }
    }
  }

  return events;
}

async function handleIncomingMessage(event) {
  const leads = readLeads();
  const phone = event.from;
  const lead = leads[phone] || buildFreshLead({ phone, origin: "whatsapp_direto", pageOrigin: "" });
  const incomingText = getIncomingText(event.message);
  const selectedSubject = getIncomingSelection(event.message);

  if (!lead.name) {
    lead.name = incomingText;
    lead.step = "cnpj";
    lead.updatedAt = new Date().toISOString();
    leads[phone] = lead;
    writeLeads(leads);
    await sendTextMessage(phone, `Perfeito, ${lead.name}. Agora me informe o CNPJ da empresa.`);
    return;
  }

  if (!lead.cnpj) {
    const cnpj = sanitizeCnpj(incomingText);
    if (!isValidCnpj(cnpj)) {
      await sendTextMessage(phone, "Nao consegui validar esse CNPJ. Pode enviar novamente com 14 digitos?");
      return;
    }

    lead.cnpj = cnpj;
    lead.step = "subject";
    lead.updatedAt = new Date().toISOString();
    leads[phone] = lead;
    writeLeads(leads);
    await sendSubjectList(phone);
    return;
  }

  if (!lead.subject) {
    lead.subject = selectedSubject || normalizeSubject(incomingText);
    lead.step = "handoff";
    lead.status = "triado";
    lead.updatedAt = new Date().toISOString();
    leads[phone] = lead;
    writeLeads(leads);

    await sendTextMessage(
      phone,
      `Perfeito. Recebemos seus dados.\n\nNome: ${lead.name}\nCNPJ: ${formatCnpj(lead.cnpj)}\nAssunto: ${lead.subject}\n\nNosso comercial vai continuar o atendimento por aqui.`
    );
    return;
  }
}

function getIncomingText(message) {
  if (message?.text?.body) {
    return String(message.text.body).trim();
  }
  if (message?.interactive?.button_reply?.title) {
    return String(message.interactive.button_reply.title).trim();
  }
  if (message?.interactive?.list_reply?.title) {
    return String(message.interactive.list_reply.title).trim();
  }
  return "";
}

function getIncomingSelection(message) {
  return message?.interactive?.list_reply?.title || message?.interactive?.button_reply?.title || "";
}

function normalizeSubject(value) {
  const normalized = String(value || "").trim();
  return SUBJECT_OPTIONS.includes(normalized) ? normalized : "Outro";
}

function formatCnpj(cnpj) {
  const digits = sanitizeCnpj(cnpj);
  if (digits.length !== 14) {
    return digits;
  }
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

async function sendTextMessage(to, body) {
  return callMetaMessagesApi({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      preview_url: false,
      body
    }
  });
}

async function sendSubjectList(to) {
  return callMetaMessagesApi({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "Assunto do atendimento"
      },
      body: {
        text: "Qual assunto voce deseja tratar?"
      },
      footer: {
        text: "New Age Embalagens"
      },
      action: {
        button: "Selecionar assunto",
        sections: [
          {
            title: "Assuntos comerciais",
            rows: SUBJECT_OPTIONS.map((subject, index) => ({
              id: `subject_${index + 1}`,
              title: subject,
              description: "Selecionar este assunto"
            }))
          }
        ]
      }
    }
  });
}

async function callMetaMessagesApi(payload) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error("META_ACCESS_TOKEN ou META_PHONE_NUMBER_ID nao configurado.");
  }

  const response = await fetch(`${GRAPH_BASE_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Erro na Cloud API: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}
