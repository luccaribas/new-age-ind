const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3030);
const LEADS_FILE = path.join(__dirname, "data", "leads.json");
const MIN_FORM_FILL_MS = 4000;
const MAX_FIELD_LENGTH = 4000;
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  if (origin && isAllowedOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "new-age-private-leads-api",
    totalLeads: readLeads().length,
    sheetsForwarding: Boolean(String(process.env.PRIVATE_SHEETS_WEBHOOK || "").trim())
  });
});

app.post("/api/leads", async (req, res) => {
  try {
    const origin = req.headers.origin || "";
    if (!isAllowedOrigin(origin)) {
      return res.status(403).json({ ok: false, error: "Origem não autorizada." });
    }

    const payload = sanitizeLeadPayload(req.body || {});
    validateLeadPayload(payload);

    const leads = readLeads();
    const lead = {
      ...payload,
      received_at: new Date().toISOString(),
      source: "site"
    };

    leads.push(lead);
    writeLeads(leads);

    const sheetsForwarded = await forwardLeadToSheets(lead);

    res.status(201).json({
      ok: true,
      id: lead.submission_id,
      message: "Lead recebido com sucesso.",
      sheetsForwarded
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: String(error.message || error) });
  }
});

app.get("/api/leads", (req, res) => {
  if (!hasInternalApiKey(req)) {
    return res.status(401).json({ ok: false, error: "Acesso interno não autorizado." });
  }

  res.json({ ok: true, items: readLeads() });
});

app.listen(PORT, () => {
  ensureLeadsFile();
  console.log(`Private Leads API ativa na porta ${PORT}`);
});

function ensureLeadsFile() {
  const dir = path.dirname(LEADS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2), "utf8");
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

function hasInternalApiKey(req) {
  const expected = String(process.env.INTERNAL_API_KEY || "").trim();
  if (!expected) {
    return false;
  }

  const received = String(req.headers["x-api-key"] || "").trim();
  return received === expected;
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

function truncateField(value, max = MAX_FIELD_LENGTH) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function digitsOnly(value, max) {
  return String(value || "").replace(/\D/g, "").slice(0, max);
}

function sanitizeLeadPayload(payload) {
  return {
    submission_id: truncateField(payload.submission_id, 80) || `lead_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
    form_name: truncateField(payload.form_name, 120),
    nome: truncateField(payload.nome, 120),
    empresa: truncateField(payload.empresa, 140),
    cnpj: digitsOnly(payload.cnpj, 14),
    telefone: digitsOnly(payload.telefone, 15),
    tipo_embalagem: truncateField(payload.tipo_embalagem, 80),
    modelos_padrao: truncateField(payload.modelos_padrao, 600),
    modelos_especificacoes: truncateField(payload.modelos_especificacoes, 4000),
    itens_personalizados: truncateField(payload.itens_personalizados, 4000),
    wizard_recomendacao: truncateField(payload.wizard_recomendacao, 1200),
    precisa_ajuda: truncateField(payload.precisa_ajuda, 20),
    observacoes: truncateField(payload.observacoes, 1200),
    page_title: truncateField(payload.page_title, 180),
    page_url: truncateField(payload.page_url, 500),
    page_path: truncateField(payload.page_path, 180),
    referrer: truncateField(payload.referrer, 500),
    device_type: truncateField(payload.device_type, 20),
    screen_size: truncateField(payload.screen_size, 40),
    utm_source: truncateField(payload.utm_source, 100),
    utm_medium: truncateField(payload.utm_medium, 100),
    utm_campaign: truncateField(payload.utm_campaign, 150),
    bot_field: truncateField(payload.bot_field || payload["bot-field"], 120),
    time_to_submit_ms: Number(payload.time_to_submit_ms || 0)
  };
}

function validateLeadPayload(payload) {
  if (payload.bot_field) {
    throw new Error("Lead bloqueado pelo honeypot.");
  }
  if (!payload.nome || !payload.empresa || !payload.cnpj || !payload.telefone) {
    throw new Error("Campos obrigatórios ausentes.");
  }
  if (payload.cnpj.length !== 14) {
    throw new Error("CNPJ inválido.");
  }
  if (payload.telefone.length < 10) {
    throw new Error("Telefone inválido.");
  }
  if (payload.time_to_submit_ms && payload.time_to_submit_ms < MIN_FORM_FILL_MS) {
    throw new Error("Envio rápido demais para validação.");
  }
  if (!payload.page_url) {
    throw new Error("Página de origem ausente.");
  }
  if (!isAllowedPageUrl(payload.page_url)) {
    throw new Error("Página de origem não autorizada.");
  }
}

function isAllowedPageUrl(value) {
  try {
    const url = new URL(value);
    return ["newage.ind.br", "www.newage.ind.br", "new-age-ind.vercel.app"].includes(url.hostname);
  } catch (error) {
    return false;
  }
}

async function forwardLeadToSheets(lead) {
  const webhookUrl = String(process.env.PRIVATE_SHEETS_WEBHOOK || "").trim();
  if (!webhookUrl) {
    return false;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(lead)
  });

  if (!response.ok) {
    throw new Error(`Falha ao encaminhar lead para a planilha: ${response.status}`);
  }

  return true;
}
