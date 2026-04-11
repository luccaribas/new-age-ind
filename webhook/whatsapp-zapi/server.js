const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3020);
const LEADS_FILE = path.join(__dirname, "data", "whatsapp-leads.json");
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const SUBJECT_OPTIONS = [
  {
    key: "exact_specs",
    label: "Sei exatamente o que preciso"
  },
  {
    key: "known_model_needs_specs",
    label: "Sei o modelo, mas nao sei as especificacoes tecnicas"
  },
  {
    key: "new_development",
    label: "Preciso desenvolver do zero"
  },
  {
    key: "order_info",
    label: "Quero informacoes do meu pedido"
  },
  {
    key: "reorder",
    label: "Quero recomprar modelos"
  }
];

const BOARD_CATALOG = [
  { code: "2050-MME", wave: "E", color: "Pardo", resin: false, grammage: 334, ect: 3.5 },
  { code: "2100-KME", wave: "E", color: "Pardo", resin: false, grammage: 354, ect: 4.0 },
  { code: "2160-KKE", wave: "E", color: "Pardo", resin: false, grammage: 690, ect: 8.0 },
  { code: "3050-MMB", wave: "B", color: "Pardo", resin: false, grammage: 341, ect: 3.5 },
  { code: "3060-RRB", wave: "B", color: "Pardo", resin: false, grammage: 358, ect: 4.0 },
  { code: "3100-RRB", wave: "B", color: "Pardo", resin: false, grammage: 377, ect: 4.5 },
  { code: "3150-ARB", wave: "B", color: "Pardo", resin: false, grammage: 407, ect: 5.0 },
  { code: "3200-KAB", wave: "B", color: "Pardo", resin: false, grammage: 388, ect: 4.5 },
  { code: "3250-RRB", wave: "B", color: "Pardo", resin: false, grammage: 433, ect: 5.5 },
  { code: "3300-KKB", wave: "B", color: "Pardo", resin: false, grammage: 428, ect: 5.0 },
  { code: "3350-KRB", wave: "B", color: "Pardo", resin: false, grammage: 433, ect: 5.5 },
  { code: "3450-KAB", wave: "B", color: "Pardo", resin: false, grammage: 466, ect: 6.0 },
  { code: "3460-RRB", wave: "B", color: "Pardo", resin: false, grammage: 506, ect: 6.5 },
  { code: "3500-KRB", wave: "B", color: "Pardo", resin: true, grammage: 498, ect: 6.5 },
  { code: "3510-KRB", wave: "B", color: "Pardo", resin: false, grammage: 498, ect: 7.0 },
  { code: "3550-KKB", wave: "B", color: "Pardo", resin: true, grammage: 506, ect: 6.0 },
  { code: "3600-KRB", wave: "B", color: "Pardo", resin: false, grammage: 551, ect: 7.0 },
  { code: "3640-RRB", wave: "B", color: "Pardo", resin: false, grammage: 579, ect: 7.0 },
  { code: "3650-KKB", wave: "B", color: "Pardo", resin: false, grammage: 546, ect: 7.0 },
  { code: "3780-KKB", wave: "B", color: "Pardo", resin: false, grammage: 589, ect: 7.5 },
  { code: "3790-KKB", wave: "B", color: "Pardo", resin: false, grammage: 659, ect: 8.5 },
  { code: "4050-WRB", wave: "B", color: "Branco", resin: false, grammage: 403, ect: 5.5 },
  { code: "4100-WRB", wave: "B", color: "Branco", resin: true, grammage: 457, ect: 6.0 },
  { code: "4150-WKB", wave: "B", color: "Branco", resin: true, grammage: 516, ect: 6.5 },
  { code: "4190-WKB", wave: "B", color: "Branco", resin: true, grammage: 503, ect: 7.0 },
  { code: "4200-WKB", wave: "B", color: "Branco", resin: false, grammage: 529, ect: 7.0 },
  { code: "5050-MMC", wave: "C", color: "Pardo", resin: false, grammage: 356, ect: 3.5 },
  { code: "5100-KAC", wave: "C", color: "Pardo", resin: false, grammage: 396, ect: 4.0 },
  { code: "5150-KAC", wave: "C", color: "Pardo", resin: false, grammage: 445, ect: 5.5 },
  { code: "5200-RRC", wave: "C", color: "Pardo", resin: false, grammage: 415, ect: 5.0 },
  { code: "5300-KAC", wave: "C", color: "Pardo", resin: false, grammage: 482, ect: 6.5 },
  { code: "5350-KRC", wave: "C", color: "Pardo", resin: true, grammage: 524, ect: 7.0 },
  { code: "5400-RRC", wave: "C", color: "Pardo", resin: false, grammage: 503, ect: 6.5 },
  { code: "5450-KKC", wave: "C", color: "Pardo", resin: true, grammage: 539, ect: 6.5 },
  { code: "5550-KKC", wave: "C", color: "Pardo", resin: true, grammage: 589, ect: 7.0 },
  { code: "5600-KKC", wave: "C", color: "Pardo", resin: false, grammage: 589, ect: 7.5 },
  { code: "5650-KKC", wave: "C", color: "Pardo", resin: true, grammage: 659, ect: 8.0 },
  { code: "7050-MMBC", wave: "BC", color: "Pardo", resin: false, grammage: 590, ect: 6.0 },
  { code: "7100-RRBC", wave: "BC", color: "Pardo", resin: false, grammage: 619, ect: 7.0 },
  { code: "7150-KABC", wave: "BC", color: "Pardo", resin: false, grammage: 644, ect: 7.5 },
  { code: "7300-RRBC", wave: "BC", color: "Pardo", resin: true, grammage: 729, ect: 8.5 },
  { code: "7350-KABC", wave: "BC", color: "Pardo", resin: false, grammage: 738, ect: 9.0 },
  { code: "7400-KRBC", wave: "BC", color: "Pardo", resin: false, grammage: 818, ect: 10.5 },
  { code: "7450-KKBC", wave: "BC", color: "Pardo", resin: true, grammage: 866, ect: 10.5 },
  { code: "7500-KABC", wave: "BC", color: "Pardo", resin: false, grammage: 866, ect: 11.5 },
  { code: "7550-KKBC", wave: "BC", color: "Pardo", resin: true, grammage: 948, ect: 11.5 },
  { code: "7600-KKBC", wave: "BC", color: "Pardo", resin: true, grammage: 1053, ect: 12.5 },
  { code: "7710-KKBC", wave: "BC", color: "Pardo", resin: true, grammage: 1122, ect: 15.5 },
  { code: "7750-KKBC", wave: "BC", color: "Pardo", resin: true, grammage: 1190, ect: 18.5 },
  { code: "8050-WRBC", wave: "BC", color: "Branco", resin: false, grammage: 694, ect: 8.0 },
  { code: "8150-WKBC", wave: "BC", color: "Branco", resin: true, grammage: 762, ect: 10.0 },
  { code: "8200-WKBC", wave: "BC", color: "Branco", resin: true, grammage: 931, ect: 11.5 },
  { code: "8250-WKBC", wave: "BC", color: "Branco", resin: true, grammage: 991, ect: 12.0 },
  { code: "8270-WKBC", wave: "BC", color: "Branco", resin: true, grammage: 1063, ect: 14.5 },
  { code: "9100-KKBE", wave: "BE", color: "Pardo", resin: true, grammage: 817, ect: 11.0 },
  { code: "9110-KKBE", wave: "BE", color: "Pardo", resin: true, grammage: 1078, ect: 14.5 },
  { code: "9200-WKBE", wave: "BE", color: "Branco", resin: true, grammage: 1086, ect: 15.5 }
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
    console.log("Webhook Z-API recebido:", JSON.stringify(req.body).slice(0, 2000));

    if (!isAuthorizedWebhook(req)) {
      console.warn("Webhook Z-API recusado por Client-Token invalido.");
      return res.status(401).json({ ok: false, error: "Webhook nao autorizado." });
    }

    const event = parseZapiEvent(req.body);
    if (!event) {
      console.log("Webhook Z-API ignorado: formato nao reconhecido.");
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

    await sendTextMessage(phone, getGreetingMessage());

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
    company: "",
    cnpj: "",
    email: "",
    contactPhone: phone || "",
    subjectKey: "",
    subject: "",
    details: {},
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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function hasKnownContactPhone(lead) {
  return normalizePhone(lead.contactPhone || lead.phone);
}

function isAuthorizedWebhook(req) {
  const expected = String(process.env.ZAPI_WEBHOOK_TOKEN || "").trim();
  if (!expected) {
    return true;
  }

  const received = String(
    req.query?.token ||
    req.query?.webhook_token ||
    req.headers["x-webhook-token"] ||
    req.headers["client-token"] ||
    req.body?.clientToken ||
    req.body?.webhookToken ||
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
    body?.participantPhone ||
    body?.senderPhone ||
    body?.connectedPhone ||
    body?.message?.from ||
    body?.message?.phone ||
    body?.data?.phone ||
    body?.data?.from ||
    body?.data?.sender ||
    body?.data?.chatId
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
    body?.text,
    body?.message,
    body?.message?.text,
    body?.message?.body,
    body?.message?.message,
    body?.body,
    body?.conversation,
    body?.data?.body,
    body?.data?.text,
    body?.data?.message,
    body?.data?.text?.message,
    body?.data?.text?.body
  ];

  const match = candidates.find(Boolean);
  return match ? String(match).trim() : "";
}

async function handleIncomingMessage(event) {
  const leads = readLeads();
  const phone = event.from;
  let lead = leads[phone];
  const incomingText = event.text;

  if (isRestartCommand(incomingText)) {
    lead = buildFreshLead({ phone, origin: "whatsapp_direto", pageOrigin: "" });
    leads[phone] = lead;
    writeLeads(leads);
    await sendTextMessage(phone, getGreetingMessage());
    return;
  }

  if (!lead) {
    lead = buildFreshLead({ phone, origin: "whatsapp_direto", pageOrigin: "" });
    leads[phone] = lead;
    writeLeads(leads);
    await sendTextMessage(phone, getGreetingMessage());
    return;
  }

  if (lead.status === "triado" || lead.step === "handoff") {
    return;
  }

  const nextMessage = advanceLead(lead, incomingText);
  lead.updatedAt = new Date().toISOString();
  leads[phone] = lead;
  writeLeads(leads);

  if (nextMessage) {
    await sendTextMessage(phone, nextMessage);
  }
}

function advanceLead(lead, incomingText) {
  const text = String(incomingText || "").trim();

  switch (lead.step) {
    case "name":
      lead.name = text;
      lead.step = "company";
      return `Perfeito, ${lead.name}. Qual e o nome da empresa que voce representa?`;

    case "company":
      lead.company = text;
      lead.step = "cnpj";
      return "Agora me informe o CNPJ da empresa.";

    case "cnpj": {
      const cnpj = sanitizeCnpj(text);
      if (!isValidCnpj(cnpj)) {
        return "Nao consegui validar esse CNPJ. Pode enviar novamente com 14 digitos?";
      }
      lead.cnpj = cnpj;
      lead.step = "email";
      return "Qual e o seu e-mail corporativo?";
    }

    case "email":
      if (!isValidEmail(text)) {
        return "Pode enviar um e-mail corporativo valido? Exemplo: compras@empresa.com.br";
      }
      lead.email = text;
      if (!hasKnownContactPhone(lead)) {
        lead.step = "contact_phone";
        return "Qual telefone de contato com DDD?";
      }
      lead.step = "subject";
      return getSubjectQuestion();

    case "contact_phone": {
      const contactPhone = normalizePhone(text);
      if (!contactPhone) {
        return "Pode enviar o telefone com DDD? Exemplo: 11999999999";
      }
      lead.contactPhone = contactPhone;
      lead.step = "subject";
      return getSubjectQuestion();
    }

    case "subject": {
      const option = parseSubject(text);
      if (!option) {
        return getSubjectQuestion();
      }
      lead.subjectKey = option.key;
      lead.subject = option.label;
      lead.step = getFirstDetailStep(option.key);
      return getQuestionForStep(lead.step, lead);
    }

    default:
      return handleDetailStep(lead, text);
  }
}

function handleDetailStep(lead, text) {
  if (!lead.details) lead.details = {};

  const step = lead.step;
  const nextStep = getNextDetailStep(lead.subjectKey, step);
  saveDetailAnswer(lead, step, text);

  if (!nextStep) {
    lead.step = "handoff";
    lead.status = "triado";
    return buildFinalSummary(lead);
  }

  lead.step = nextStep;
  return getQuestionForStep(nextStep, lead);
}

function isRestartCommand(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["reiniciar", "recomecar", "recomeçar", "novo atendimento", "menu"].includes(normalized);
}

function getGreetingMessage() {
  return "Ola, aqui e da New Age Embalagens.\n\nPara direcionar seu atendimento comercial, qual e o seu nome?\n\nSe quiser recomecar a qualquer momento, envie: menu";
}

function getSubjectQuestion() {
  return [
    "Como podemos te ajudar?",
    "",
    "1. Sei exatamente o que preciso",
    "2. Sei o modelo que preciso, mas nao sei as especificacoes tecnicas",
    "3. Preciso desenvolver do zero",
    "4. Quero informacoes do meu pedido",
    "5. Quero recomprar modelos",
    "",
    "Responda apenas com o numero da opcao."
  ].join("\n");
}

function parseSubject(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "1" || normalized.includes("exatamente")) return SUBJECT_OPTIONS[0];
  if (normalized === "2" || normalized.includes("modelo") || normalized.includes("especific")) return SUBJECT_OPTIONS[1];
  if (normalized === "3" || normalized.includes("zero") || normalized.includes("desenvolver")) return SUBJECT_OPTIONS[2];
  if (normalized === "4" || normalized.includes("pedido") || normalized.includes("informacao") || normalized.includes("informações")) return SUBJECT_OPTIONS[3];
  if (normalized === "5" || normalized.includes("recomprar") || normalized.includes("recompra")) return SUBJECT_OPTIONS[4];

  return null;
}

function getFirstDetailStep(subjectKey) {
  const flows = getDetailFlows();
  return flows[subjectKey]?.[0] || "";
}

function getNextDetailStep(subjectKey, currentStep) {
  const flow = getDetailFlows()[subjectKey] || [];
  const index = flow.indexOf(currentStep);
  return index >= 0 ? flow[index + 1] || "" : "";
}

function getDetailFlows() {
  return {
    exact_specs: [
      "model_fefco",
      "accessory_fefco",
      "internal_dimensions",
      "minimum_ect",
      "paper_type",
      "grammage",
      "quantity",
      "printing",
      "deadline"
    ],
    known_model_needs_specs: [
      "model_fefco",
      "product",
      "internal_dimensions",
      "product_weight",
      "stacking",
      "transport",
      "humidity",
      "printing",
      "quantity"
    ],
    new_development: [
      "product",
      "product_dimensions",
      "product_weight",
      "fragility",
      "use_case",
      "transport",
      "stacking",
      "humidity",
      "printing",
      "quantity"
    ],
    order_info: [
      "order_reference",
      "order_question"
    ],
    reorder: [
      "previous_model",
      "quantity",
      "changes"
    ]
  };
}

function getQuestionForStep(step, lead) {
  const questions = {
    model_fefco: "Qual modelo FEFCO voce quer cotar? Exemplo: 0201, 0427, 0713. Se tiver variacao, descreva junto.",
    accessory_fefco: "Vai ter acessorio FEFCO ou divisoria interna? Se sim, informe o codigo ou descreva. Se nao tiver, responda: nao.",
    internal_dimensions: "Quais medidas internas deseja? Envie em C x L x A, em mm. Exemplo: 300 x 200 x 150 mm.",
    minimum_ect: "Qual coluna minima / ECT desejada? Exemplo: 5 kN/m, 7 kN/m. Se nao souber, responda: nao sei.",
    paper_type: "Tipo de papel preferido: Kraft, Branco ou Reciclado?",
    grammage: "Gramatura desejada, se ja souber. Exemplo: liner 175 / miolo 120. Se nao souber, responda: nao sei.",
    quantity: "Qual quantidade aproximada para cotacao?",
    printing: [
      "Como sera a impressao?",
      "",
      "1. Sem impressao",
      "2. 1 cor",
      "3. 2 cores",
      "4. 3 cores",
      "5. 4 cores",
      "6. Impressao premium em papelao branco para destacar a marca",
      "",
      "Responda com o numero da opcao ou descreva se ja tiver arte."
    ].join("\n"),
    deadline: "Tem prazo desejado para receber ou aprovar a cotacao?",
    product: "Qual produto sera embalado?",
    product_dimensions: "Quais sao as medidas aproximadas do produto? Envie C x L x A em mm.",
    product_weight: "Qual o peso aproximado por caixa ou por unidade?",
    stacking: "Vai ter empilhamento? Exemplo: sem empilhar, 3 a 5 caixas, 6 ou mais, paletizado.",
    transport: "Como sera o transporte? Exemplo: retirada, entrega local, carga fracionada, transportadora, Correios ou exportacao.",
    humidity: "O ambiente e seco, umido ou camara fria?",
    fragility: "O produto e fragil? Responda: baixa, media ou alta fragilidade.",
    use_case: "A caixa sera usada para envio, armazenagem, exposicao, industria ou e-commerce?",
    order_reference: "Voce tem numero do pedido, nota, nome do produto ou referencia interna?",
    order_question: "Qual informacao voce quer sobre o pedido? Exemplo: prazo, status, recompra, alteracao ou segunda via.",
    previous_model: "Qual modelo ou referencia voce quer recomprar? Pode enviar codigo, foto, pedido anterior ou descricao.",
    changes: "Vai repetir igual ao pedido anterior ou precisa mudar medidas, papel, impressao ou quantidade?"
  };

  if (step === "model_fefco" && lead.subjectKey === "known_model_needs_specs") {
    return "Qual modelo FEFCO voce ja sabe que precisa? Exemplo: 0201, 0427, 0713.";
  }

  return questions[step] || "Pode detalhar melhor sua necessidade?";
}

function saveDetailAnswer(lead, step, text) {
  const map = {
    model_fefco: "modelo_fefco",
    accessory_fefco: "acessorio_fefco",
    internal_dimensions: "medidas_internas",
    minimum_ect: "coluna_minima_ect",
    paper_type: "tipo_papel",
    grammage: "gramatura",
    quantity: "quantidade",
    printing: "impressao",
    deadline: "prazo",
    product: "produto",
    product_dimensions: "medidas_produto",
    product_weight: "peso_produto",
    stacking: "empilhamento",
    transport: "transporte",
    humidity: "umidade",
    fragility: "fragilidade",
    use_case: "uso",
    order_reference: "referencia_pedido",
    order_question: "duvida_pedido",
    previous_model: "modelo_anterior",
    changes: "alteracoes"
  };

  const field = map[step] || step;
  lead.details[field] = field === "impressao" ? normalizePrintingOption(text) : text;
}

function buildFinalSummary(lead) {
  const detailLines = Object.entries(lead.details || {})
    .filter(([, value]) => String(value || "").trim())
    .map(([key, value]) => `- ${formatLabel(key)}: ${value}`);
  const recommendation = buildTechnicalRecommendation(lead);
  const recommendationLines = recommendation
    ? [
        "",
        "Recomendacao tecnica inicial:",
        `- Modelo base: ${recommendation.modelo}`,
        `- Chapa sugerida: ${recommendation.chapa}`,
        `- Estrutura: ${recommendation.parede}`,
        `- Onda: ${recommendation.onda}`,
        `- Coluna minima / ECT: ${recommendation.ect}`,
        `- BCT orientativo: ${recommendation.bct}`,
        `- Papel sugerido: ${recommendation.papel}`,
        `- Gramatura inicial: ${recommendation.gramatura}`,
        `- Observacao: ${recommendation.observacao}`
      ]
    : [];

  return [
    "Perfeito. Recebemos suas informacoes.",
    "",
    `Nome: ${lead.name}`,
    `Empresa: ${lead.company}`,
    `CNPJ: ${formatCnpj(lead.cnpj)}`,
    `E-mail: ${lead.email}`,
    `Telefone: ${lead.contactPhone || lead.phone}`,
    `Assunto: ${lead.subject}`,
    "",
    "Resumo para o comercial:",
    ...detailLines,
    ...recommendationLines,
    "",
    "Nosso comercial vai continuar o atendimento por aqui."
  ].join("\n");
}

function normalizePrintingOption(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "1" || normalized.includes("sem")) return "Sem impressao";
  if (normalized === "2" || normalized.includes("1 cor") || normalized.includes("uma cor")) return "1 cor";
  if (normalized === "3" || normalized.includes("2 cor")) return "2 cores";
  if (normalized === "4" || normalized.includes("3 cor")) return "3 cores";
  if (normalized === "5" || normalized.includes("4 cor")) return "4 cores";
  if (normalized === "6" || normalized.includes("premium") || normalized.includes("branco") || normalized.includes("marca")) {
    return "Impressao premium em papelao branco para destacar a marca";
  }
  return value;
}

function buildTechnicalRecommendation(lead) {
  if (!["known_model_needs_specs", "new_development"].includes(lead.subjectKey)) {
    return null;
  }

  const details = lead.details || {};
  const text = Object.values(details).join(" ").toLowerCase();
  let tier = 1;
  const motivos = [];

  const weightClass = inferWeightClass(details.peso_produto || text);
  if (weightClass === "medio") {
    tier = Math.max(tier, 2);
    motivos.push("peso intermediario");
  }
  if (weightClass === "alto") {
    tier = Math.max(tier, 4);
    motivos.push("peso alto");
  }
  if (weightClass === "pesado") {
    tier = Math.max(tier, 6);
    motivos.push("peso pesado");
  }

  if (includesAny(text, ["fragil", "vidro", "ceramica", "quebra", "eletronico"])) {
    tier = Math.max(tier, 3);
    motivos.push("produto sensivel");
  }

  if (includesAny(text, ["fracionada", "transportadora", "correios", "courier"])) {
    tier += 1;
    motivos.push("transporte com mais manuseio");
  }

  if (includesAny(text, ["palet", "6 ou mais", "empilhamento alto", "empilha alto"])) {
    tier = Math.max(tier, 4);
    motivos.push("empilhamento/paletizacao");
  } else if (includesAny(text, ["3 a 5", "3-5", "empilha"])) {
    tier = Math.max(tier + 1, 2);
    motivos.push("empilhamento moderado");
  }

  if (includesAny(text, ["exportacao", "exportação"])) {
    tier = Math.max(tier, 6);
    motivos.push("exportacao");
  }

  if (includesAny(text, ["umido", "umidade", "camara fria", "câmara fria", "frio"])) {
    tier = Math.max(tier + 1, 3);
    motivos.push("umidade");
  }

  if (String(details.impressao || "").toLowerCase().includes("premium")) {
    motivos.push("impressao premium");
  }

  tier = Math.max(0, Math.min(tier, 6));
  const specs = [
    { parede: "Parede simples", waves: ["E", "B"], targetEct: 4.0, bct: "Baixo" },
    { parede: "Parede simples", waves: ["B"], targetEct: 5.0, bct: "Baixo a moderado" },
    { parede: "Parede simples", waves: ["B", "C"], targetEct: 6.0, bct: "Moderado" },
    { parede: "Parede simples reforcada", waves: ["C", "B"], targetEct: 7.0, bct: "Moderado a alto" },
    { parede: "Parede dupla", waves: ["BC"], targetEct: 9.0, bct: "Alto" },
    { parede: "Parede dupla reforcada", waves: ["BC", "BE"], targetEct: 11.5, bct: "Muito alto" },
    { parede: "Parede dupla ou tripla", waves: ["BC", "BE"], targetEct: 14.5, bct: "Muito alto" }
  ];

  const selectedSpec = specs[tier];
  const needsWhite = String(details.impressao || "").toLowerCase().includes("premium");
  const needsResin = includesAny(text, ["umido", "umidade", "camara fria", "câmara fria", "frio"]);
  const board = selectBoard({
    waves: needsWhite && tier <= 3 ? ["B", "E", "C"] : selectedSpec.waves,
    minEct: selectedSpec.targetEct,
    preferWhite: needsWhite,
    preferResin: needsResin
  });
  const selected = {
    parede: selectedSpec.parede,
    onda: board?.wave || selectedSpec.waves[0],
    ect: board ? `${board.ect.toFixed(1).replace(".", ",")} kN/m` : `${selectedSpec.targetEct.toFixed(1).replace(".", ",")} kN/m`,
    bct: selectedSpec.bct,
    papel: board ? `${board.color}${board.resin ? " com resina" : ""}` : needsWhite ? "Branco" : "Kraft",
    gramatura: board ? `${board.grammage} g/m²` : "A definir pela chapa disponivel"
  };

  return {
    modelo: details.modelo_fefco || (lead.subjectKey === "new_development" ? "A definir pelo projeto" : "Modelo informado pelo cliente"),
    chapa: board ? board.code : "A definir",
    ...selected,
    observacao: motivos.length
      ? `Chapa sugerida a partir da tabela New Age: ${board ? board.code : "a definir"}. Motivos: ${motivos.join(", ")}. Validar medidas finais e viabilidade produtiva antes da proposta.`
      : `Chapa sugerida a partir da tabela New Age: ${board ? board.code : "a definir"}. Validar medidas finais e viabilidade produtiva antes da proposta.`
  };
}

function selectBoard({ waves, minEct, preferWhite, preferResin }) {
  const allowedWaves = Array.isArray(waves) ? waves : [waves];
  const normalizedWaves = allowedWaves.map((wave) => String(wave || "").toUpperCase());
  const candidates = BOARD_CATALOG
    .filter((board) => normalizedWaves.includes(board.wave))
    .filter((board) => board.ect >= minEct)
    .map((board) => {
      let score = board.grammage;
      if (preferWhite && board.color !== "Branco") score += 250;
      if (!preferWhite && board.color === "Branco") score += 120;
      if (preferResin && !board.resin) score += 150;
      if (!preferResin && board.resin) score += 40;
      return { board, score };
    })
    .sort((a, b) => a.score - b.score || a.board.ect - b.board.ect);

  return candidates[0]?.board || BOARD_CATALOG
    .filter((board) => normalizedWaves.includes(board.wave))
    .sort((a, b) => b.ect - a.ect)[0] || null;
}

function inferWeightClass(value) {
  const text = String(value || "").toLowerCase().replace(",", ".");
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return "";
  const kg = Number(match[1]);
  if (!Number.isFinite(kg)) return "";
  if (kg <= 1) return "leve";
  if (kg <= 5) return "medio";
  if (kg <= 15) return "alto";
  return "pesado";
}

function includesAny(value, patterns) {
  const text = String(value || "").toLowerCase();
  return patterns.some((pattern) => text.includes(pattern));
}

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
