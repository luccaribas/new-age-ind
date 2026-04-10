function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    payload = sanitizePayload(payload);
    validatePayload(payload);

    var spreadsheetId = "COLE_AQUI_O_ID_DA_PLANILHA";
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var leadsSheet = getOrCreateSheet(spreadsheet, "Leads");
    var detailsSheet = getOrCreateSheet(spreadsheet, "Leads_Detalhes");

    ensureLeadHeaders(leadsSheet);
    ensureDetailHeaders(detailsSheet);

    var receivedAt = new Date();
    var resumoPedido = buildOrderSummary(payload);
    var pagePath = extractPagePath(payload.page_url || "");

    leadsSheet.appendRow([
      receivedAt,
      "Novo",
      "",
      "",
      "site",
      payload.form_name || "",
      payload.nome || "",
      payload.empresa || "",
      payload.cnpj || "",
      payload.telefone || "",
      payload.tipo_embalagem || "",
      normalizeNeedHelp(payload.precisa_ajuda || ""),
      resumoPedido,
      pagePath,
      payload.utm_source || "",
      payload.utm_medium || "",
      payload.utm_campaign || ""
    ]);

    detailsSheet.appendRow([
      receivedAt,
      payload.empresa || "",
      payload.modelos_padrao || "",
      payload.modelos_especificacoes || "",
      payload.itens_personalizados || "",
      payload.wizard_recomendacao || "",
      payload.observacoes || "",
      payload.page_title || "",
      payload.page_url || "",
      payload.referrer || "",
      payload.device_type || ""
    ]);

    return jsonResponse({ ok: true, message: "Lead recebido com sucesso." });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

function ensureLeadHeaders(sheet) {
  var headers = [[
    "data_recebimento",
    "status",
    "responsavel",
    "data_contato",
    "origem",
    "formulario",
    "nome",
    "empresa",
    "cnpj",
    "telefone",
    "tipo_embalagem",
    "precisa_ajuda",
    "resumo_pedido",
    "pagina",
    "utm_source",
    "utm_medium",
    "utm_campaign"
  ]];

  ensureHeaders(sheet, headers);
}

function ensureDetailHeaders(sheet) {
  var headers = [[
    "data_recebimento",
    "empresa",
    "modelos_padrao",
    "modelos_especificacoes",
    "itens_personalizados",
    "wizard_recomendacao",
    "observacoes",
    "pagina_titulo",
    "pagina_url",
    "referrer",
    "device_type"
  ]];

  ensureHeaders(sheet, headers);
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
    return;
  }

  var firstRow = sheet.getRange(1, 1, 1, headers[0].length).getValues()[0];
  if (firstRow[0] !== headers[0][0]) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  }
}

function buildOrderSummary(payload) {
  var parts = [];

  if (payload.tipo_embalagem) parts.push(payload.tipo_embalagem);
  if (payload.modelos_padrao) parts.push("Modelos: " + payload.modelos_padrao);
  if (payload.wizard_recomendacao) parts.push("Com recomendacao guiada");
  if (payload.itens_personalizados) parts.push("Com item personalizado");
  if (payload.precisa_ajuda) parts.push("Precisa ajuda: " + normalizeNeedHelp(payload.precisa_ajuda));

  return parts.join(" | ");
}

function sanitizePayload(payload) {
  return {
    form_name: clipValue(payload.form_name, 120),
    nome: clipValue(payload.nome, 120),
    empresa: clipValue(payload.empresa, 140),
    cnpj: String(payload.cnpj || "").replace(/\D/g, "").slice(0, 14),
    telefone: String(payload.telefone || "").replace(/\D/g, "").slice(0, 15),
    tipo_embalagem: clipValue(payload.tipo_embalagem, 80),
    modelos_padrao: clipValue(payload.modelos_padrao, 600),
    modelos_especificacoes: clipValue(payload.modelos_especificacoes, 4000),
    itens_personalizados: clipValue(payload.itens_personalizados, 4000),
    wizard_recomendacao: clipValue(payload.wizard_recomendacao, 1200),
    precisa_ajuda: clipValue(payload.precisa_ajuda, 20),
    observacoes: clipValue(payload.observacoes, 1200),
    page_title: clipValue(payload.page_title, 180),
    page_url: clipValue(payload.page_url, 500),
    referrer: clipValue(payload.referrer, 500),
    device_type: clipValue(payload.device_type, 20),
    utm_source: clipValue(payload.utm_source, 100),
    utm_medium: clipValue(payload.utm_medium, 100),
    utm_campaign: clipValue(payload.utm_campaign, 150),
    bot_field: clipValue(payload.bot_field || payload["bot-field"], 120),
    time_to_submit_ms: Number(payload.time_to_submit_ms || 0),
    submission_id: clipValue(payload.submission_id, 80)
  };
}

function clipValue(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function validatePayload(payload) {
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
  if (payload.time_to_submit_ms && payload.time_to_submit_ms < 4000) {
    throw new Error("Envio rapido demais para validacao.");
  }
  if (payload.page_url && !isAllowedPageUrl(payload.page_url)) {
    throw new Error("Origem do formulario nao autorizada.");
  }
}

function isAllowedPageUrl(value) {
  try {
    var url = new URL(value);
    return ["newage.ind.br", "www.newage.ind.br", "new-age-ind.vercel.app"].indexOf(url.hostname) >= 0;
  } catch (error) {
    return false;
  }
}

function normalizeNeedHelp(value) {
  if (!value) return "Nao";
  return String(value).trim();
}

function extractPagePath(url) {
  if (!url) return "";
  try {
    return new URL(url).pathname;
  } catch (error) {
    return url;
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function criarCabecalhos() {
  var spreadsheetId = "COLE_AQUI_O_ID_DA_PLANILHA";
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  ensureLeadHeaders(getOrCreateSheet(spreadsheet, "Leads"));
  ensureDetailHeaders(getOrCreateSheet(spreadsheet, "Leads_Detalhes"));
}

function testePostLocal() {
  var e = {
    postData: {
      contents: JSON.stringify({
        form_name: "Teste local",
        nome: "Teste",
        empresa: "Empresa Teste",
        cnpj: "00000000000000",
        telefone: "11999999999",
        tipo_embalagem: "Padrao FEFCO",
        modelos_padrao: "0201, 0427",
        wizard_recomendacao: "Sugestao inicial",
        observacoes: "Teste local do Apps Script",
        page_url: "https://www.newage.ind.br/orcamento-rapido/index.html",
        time_to_submit_ms: 9000
      })
    }
  };

  doPost(e);
}
