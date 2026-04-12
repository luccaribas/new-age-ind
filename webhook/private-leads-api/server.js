const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3030);
const DATA_DIR = path.join(__dirname, "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const MIN_FORM_FILL_MS = 4000;
const MAX_FIELD_LENGTH = 4000;
const MAX_EVENTS_STORED = 20000;
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(express.json({ limit: "1mb", type: ["application/json", "text/plain"] }));
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
    totalEvents: readEvents().length,
    sheetsForwarding: Boolean(String(process.env.PRIVATE_SHEETS_WEBHOOK || "").trim())
  });
});

app.post("/api/leads", async (req, res) => {
  try {
    const origin = req.headers.origin || "";
    if (!isAllowedOrigin(origin)) {
      return res.status(403).json({ ok: false, error: "Origem nao autorizada." });
    }

    const payload = sanitizeLeadPayload(parseBody(req.body));
    validateLeadPayload(payload);

    const lead = {
      ...payload,
      received_at: new Date().toISOString(),
      source: "site"
    };

    const leads = readLeads();
    leads.push(lead);
    writeLeads(leads);

    appendEvent({
      event_name: "lead_submit_server",
      page_url: lead.page_url,
      page_path: lead.page_path,
      page_title: lead.page_title,
      referrer: lead.referrer,
      device_type: lead.device_type,
      screen_size: lead.screen_size,
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
      payload: {
        form_name: lead.form_name,
        tipo_embalagem: lead.tipo_embalagem,
        empresa: lead.empresa
      }
    }, req);

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
    return res.status(401).json({ ok: false, error: "Acesso interno nao autorizado." });
  }

  res.json({ ok: true, items: readLeads() });
});

app.post("/api/events", (req, res) => {
  try {
    const origin = req.headers.origin || "";
    if (!isAllowedOrigin(origin)) {
      return res.status(403).json({ ok: false, error: "Origem nao autorizada." });
    }

    const event = appendEvent(parseBody(req.body), req);
    res.status(201).json({ ok: true, id: event.event_id });
  } catch (error) {
    res.status(400).json({ ok: false, error: String(error.message || error) });
  }
});

app.get("/api/events", (req, res) => {
  if (!hasInternalApiKey(req)) {
    return res.status(401).json({ ok: false, error: "Acesso interno nao autorizado." });
  }

  const limit = Math.min(Number(req.query.limit || 500), 5000);
  res.json({ ok: true, items: readEvents().slice(-limit).reverse() });
});

app.get("/api/analytics", (req, res) => {
  if (!hasInternalApiKey(req)) {
    return res.status(401).json({ ok: false, error: "Acesso interno nao autorizado." });
  }

  const leads = readLeads();
  const events = readEvents();
  res.json({
    ok: true,
    generated_at: new Date().toISOString(),
    summary: buildAnalyticsSummary(leads, events),
    leads: leads.slice(-500).reverse(),
    events: events.slice(-1000).reverse()
  });
});

app.listen(PORT, () => {
  ensureJsonFile(LEADS_FILE);
  ensureJsonFile(EVENTS_FILE);
  console.log(`Private Leads API ativa na porta ${PORT}`);
});

function parseBody(body) {
  if (typeof body === "string") {
    return JSON.parse(body || "{}");
  }
  return body || {};
}

function ensureJsonFile(filePath) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), "utf8");
  }
}

function readJsonArray(filePath) {
  ensureJsonFile(filePath);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeJsonArray(filePath, rows) {
  ensureJsonFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf8");
}

function readLeads() {
  return readJsonArray(LEADS_FILE);
}

function readEvents() {
  return readJsonArray(EVENTS_FILE);
}

function writeLeads(leads) {
  writeJsonArray(LEADS_FILE, leads);
}

function writeEvents(events) {
  writeJsonArray(EVENTS_FILE, events);
}

function appendEvent(payload, req) {
  const event = sanitizeEventPayload(payload, req);
  const events = readEvents();
  events.push(event);
  writeEvents(events.slice(-MAX_EVENTS_STORED));
  return event;
}

function hasInternalApiKey(req) {
  const expected = String(process.env.INTERNAL_API_KEY || "").trim();
  if (!expected) return false;
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
    email: truncateField(payload.email, 140),
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

function sanitizeEventPayload(payload, req) {
  const eventName = truncateField(payload.event_name || payload.eventName, 80);
  if (!eventName) {
    throw new Error("Nome do evento ausente.");
  }

  const pageUrl = truncateField(payload.page_url, 500);
  if (pageUrl && !isAllowedPageUrl(pageUrl)) {
    throw new Error("Pagina de origem nao autorizada.");
  }

  return {
    event_id: `evt_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
    event_name: eventName,
    created_at: new Date().toISOString(),
    page_url: pageUrl,
    page_path: truncateField(payload.page_path, 180),
    page_title: truncateField(payload.page_title, 180),
    referrer: truncateField(payload.referrer, 500),
    device_type: truncateField(payload.device_type, 20),
    screen_size: truncateField(payload.screen_size, 40),
    language: truncateField(payload.language, 40),
    timezone: truncateField(payload.timezone, 80),
    utm_source: truncateField(payload.utm_source, 100),
    utm_medium: truncateField(payload.utm_medium, 100),
    utm_campaign: truncateField(payload.utm_campaign, 150),
    payload: sanitizeEventDetails(payload.payload || {}),
    visitor: buildVisitorContext(req)
  };
}

function sanitizeEventDetails(value) {
  const output = {};
  Object.entries(value || {}).slice(0, 20).forEach(([key, item]) => {
    output[truncateField(key, 60)] = truncateField(item, 300);
  });
  return output;
}

function validateLeadPayload(payload) {
  if (payload.bot_field) {
    throw new Error("Lead bloqueado pelo honeypot.");
  }
  if (!payload.nome || !payload.empresa || !payload.cnpj || !payload.telefone) {
    throw new Error("Campos obrigatorios ausentes.");
  }
  if (payload.cnpj.length !== 14) {
    throw new Error("CNPJ invalido.");
  }
  if (payload.telefone.length < 10) {
    throw new Error("Telefone invalido.");
  }
  if (payload.time_to_submit_ms && payload.time_to_submit_ms < MIN_FORM_FILL_MS) {
    throw new Error("Envio rapido demais para validacao.");
  }
  if (!payload.page_url) {
    throw new Error("Pagina de origem ausente.");
  }
  if (!isAllowedPageUrl(payload.page_url)) {
    throw new Error("Pagina de origem nao autorizada.");
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

function buildVisitorContext(req) {
  const ip = getClientIp(req);
  return {
    ip_hash: ip ? crypto.createHash("sha256").update(`${ip}:${process.env.INTERNAL_API_KEY || "newage"}`).digest("hex").slice(0, 18) : "",
    country: truncateField(req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"], 80),
    region: decodeHeaderLocation(req.headers["x-vercel-ip-country-region"]),
    city: decodeHeaderLocation(req.headers["x-vercel-ip-city"]),
    user_agent: truncateField(req.headers["user-agent"], 240)
  };
}

function decodeHeaderLocation(value) {
  try {
    return truncateField(decodeURIComponent(String(value || "")), 120);
  } catch (error) {
    return truncateField(value, 120);
  }
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "";
}

function buildAnalyticsSummary(leads, events) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const events7d = events.filter((event) => now - Date.parse(event.created_at || 0) <= 7 * dayMs);
  const leads7d = leads.filter((lead) => now - Date.parse(lead.received_at || lead.created_at || 0) <= 7 * dayMs);
  const pageViews = events.filter((event) => event.event_name === "page_view");
  const ctaClicks = events.filter((event) => event.event_name === "cta_click");
  const whatsappClicks = events.filter((event) => event.event_name === "whatsapp_handoff");
  const uniqueVisitors = new Set(events.map((event) => event.visitor && event.visitor.ip_hash).filter(Boolean));

  return {
    total_leads: leads.length,
    total_events: events.length,
    total_pageviews: pageViews.length,
    unique_visitors: uniqueVisitors.size,
    leads_7d: leads7d.length,
    events_7d: events7d.length,
    cta_clicks: ctaClicks.length,
    whatsapp_clicks: whatsappClicks.length,
    conversion_rate: pageViews.length ? Math.round((leads.length / pageViews.length) * 1000) / 10 : 0,
    top_pages: rankBy(pageViews, "page_path", 10),
    top_referrers: rankBy(events, "referrer", 10),
    top_utm_sources: rankBy(events, "utm_source", 10),
    devices: rankBy(events, "device_type", 10),
    locations: rankBy(events, (event) => [event.visitor && event.visitor.city, event.visitor && event.visitor.region, event.visitor && event.visitor.country, event.timezone].filter(Boolean).join(" / ") || "Nao identificado", 12),
    funnel: {
      page_view: pageViews.length,
      cta_click: ctaClicks.length,
      wizard_submit: events.filter((event) => event.event_name === "wizard_submit").length,
      portfolio_select: events.filter((event) => event.event_name === "portfolio_select").length,
      lead_submit: events.filter((event) => event.event_name === "lead_submit").length,
      whatsapp_handoff: whatsappClicks.length
    }
  };
}

function rankBy(items, keyOrGetter, limit) {
  const getter = typeof keyOrGetter === "function" ? keyOrGetter : (item) => item[keyOrGetter];
  const counts = new Map();
  items.forEach((item) => {
    const key = truncateField(getter(item), 180) || "Nao informado";
    if (key === "Nao informado" || key === "Nao identificado") return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
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
