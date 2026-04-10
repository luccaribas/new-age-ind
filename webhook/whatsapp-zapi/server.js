const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3020);
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
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Client-Token");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "new-age-whatsapp-zapi",
    leads: Object.keys(readLeads()).length
  });
});

app.post("/webhooks/zapi", async (req, res) => {
  try {
    if (!isAuthorizedWebhook(req)) {
      return res.status(401).json({ ok: false, error: "Webhook nao autorizado." });
    }

    const event = parseZapiEvent(req.body);
    if (!event) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    if (event.type === "message") {
      await handleIncomingMessage(event);
    }

    if (event.type === "connected") {
      console.log("Instancia conectada na Z-API");
    }

    if (event.type === "disconnected") {
      console.log("Instancia desconectada na Z-API");
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Erro no webhook Z-API:", error);
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
      "Ola, aqui e da New Age Embalagens.\n\nPara direcionar seu atendimento comercial, qual e o seu nome?"
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
  console.log(`WhatsApp Z-API backend ativo na porta ${PORT}`);
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

function sanitizeCnpj(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidCnpj(cnpj) {
  return sanitizeCnpj(cnpj).length === 14;
}

function isAuthorizedWebhook(req) {
  const expected = String(process.env.ZAPI_CLIENT_TOKEN || "").trim();
  if (!expected) {
    return true;
  }

  const received = String(
    req.headers["client-token"] ||
    req.headers["Client-Token"] ||
    req.body?.clientToken ||
    ""
  ).trim();

  return received === expected;
}

function hasInternalApiKey(req) {
  const expected = String(process.env.INTERNAL_API_KEY || "").trim();
  if (!expected) {
    return false;
  }

  const received = String(req.headers["x-api-key"] || req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return received === expected;
}

function parseZapiEvent(body) {
  const text = getBodyText(body);
  const phone = normalizePhone(
    body?.phone ||
    body?.from ||
    body?.chatId ||
    body?.sender ||
    body?.message?.from
  );

  if (text && phone) {
    return {
      type: "message",
      from: phone,
      text
    };
  }

  const eventType = String(body?.type || body?.event || "").toLowerCase();
  if (eventType.includes("connected")) {
    return { type: "connected" };
  }
  if (eventType.includes("disconnected")) {
    return { type: "disconnected" };
  }

  return null;
}

function getBodyText(body) {
  const candidates = [
    body?.text?.message,
    body?.text?.body,
    body?.message,
    body?.body,
    body?.conversation,
    body?.data?.body,
    body?.data?.text
  ];

  const match = candidates.find(Boolean);
  return match ? String(match).trim() : "";
}

async function handleIncomingMessage(event) {
  const leads = readLeads();
  const phone = event.from;
  const lead = leads[phone] || buildFreshLead({ phone, origin: "whatsapp_direto", pageOrigin: "" });
  const incomingText = event.text;

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
    await sendTextMessage(
      phone,
      "Qual assunto deseja tratar?\n\n1. Cotacao de caixa padrao\n2. Caixa sob medida\n3. Ajuda para escolher modelo\n4. Prazo / entrega\n5. Pedido recorrente\n6. Outro"
    );
    return;
  }

  if (!lead.subject) {
    lead.subject = parseSubject(incomingText);
    lead.step = "handoff";
    lead.status = "triado";
    lead.updatedAt = new Date().toISOString();
    leads[phone] = lead;
    writeLeads(leads);

    await sendTextMessage(
      phone,
      `Perfeito. Recebemos seus dados.\n\nNome: ${lead.name}\nCNPJ: ${formatCnpj(lead.cnpj)}\nAssunto: ${lead.subject}\n\nNosso comercial vai continuar o atendimento por aqui.`
    );
  }
}

function parseSubject(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "1" || normalized.includes("cotacao")) {
    return SUBJECT_OPTIONS[0];
  }
  if (normalized === "2" || normalized.includes("sob medida")) {
    return SUBJECT_OPTIONS[1];
  }
  if (normalized === "3" || normalized.includes("escolher")) {
    return SUBJECT_OPTIONS[2];
  }
  if (normalized === "4" || normalized.includes("prazo") || normalized.includes("entrega")) {
    return SUBJECT_OPTIONS[3];
  }
  if (normalized === "5" || normalized.includes("recorrente")) {
    return SUBJECT_OPTIONS[4];
  }
  return SUBJECT_OPTIONS[5];
}

function formatCnpj(cnpj) {
  const digits = sanitizeCnpj(cnpj);
  if (digits.length !== 14) {
    return digits;
  }
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

async function sendTextMessage(phone, message) {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const instanceToken = process.env.ZAPI_INSTANCE_TOKEN;
  const clientToken = String(process.env.ZAPI_CLIENT_TOKEN || "").trim();

  if (!instanceId || !instanceToken) {
    throw new Error("ZAPI_INSTANCE_ID ou ZAPI_INSTANCE_TOKEN nao configurado.");
  }

  const headers = {
    "Content-Type": "application/json"
  };

  if (clientToken) {
    headers["Client-Token"] = clientToken;
  }

  const response = await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}/send-text`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone,
        message
      })
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Erro na Z-API: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}
