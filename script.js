const SITE_CONFIG = {
  whatsappNumber: "",
  businessEmail: "vendas@newage.ind.br",
  formEndpoint: "https://script.google.com/macros/s/AKfycbwJYFnrkMk797-aYGDEbXA1qyT98ObNk0EAtIUxSO_B43mCO-5KVTnWHR4vVGTDZ2og/exec",
  gaMeasurementId: "",
  metaPixelId: ""
};

const RUNTIME_CONFIG_KEY = "newage_runtime_config";
const LEAD_EVENTS_KEY = "newage_lead_events";
const LEADS_STORAGE_KEY = "newage_leads";

function loadRuntimeConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(RUNTIME_CONFIG_KEY) || "{}");
    return { ...SITE_CONFIG, ...stored };
  } catch (error) {
    return { ...SITE_CONFIG };
  }
}

const runtimeConfig = loadRuntimeConfig();

const state = {
  selectedModels: [],
  wizardRecommendation: "",
  modelSpecs: {},
  directSpecs: [],
  showAllModels: false,
  portfolioFilters: {
    intent: "",
    structure: "",
    assembly: "",
    sustainability: "",
    guided: false,
    zeroTape: false,
    zeroGlue: false,
    bct: 0
  }
};

const modal = document.getElementById("success-modal");
const modalWhatsapp = document.querySelector(".modal-whatsapp");
const modalCloseButtons = document.querySelectorAll(".modal-close, .modal-close-action");
const FEFCO_GUIDES = window.FEFCO_GUIDES || {};
const FEFCO_META = window.FEFCO_META || {};
const selectedModelsContainer = document.getElementById("selected-models");
const selectedModelsField = document.getElementById("modelos_padrao") || document.getElementById("modelos_padrão");
const selectedModelSpecsField = document.getElementById("modelos_especificacoes");
const selectedModelsPreview = document.getElementById("modelos_padrao_preview") || document.getElementById("modelos_padrão_preview");
const wizardRecommendationField = document.getElementById("wizard_recomendacao") || document.getElementById("wizard_recomendação");
const wizardResult = document.getElementById("wizard-result");
const modelSpecsContainer = document.getElementById("model-specs-container");
const directSpecsContainer = document.getElementById("direct-specs-container");
const directSpecsField = document.getElementById("itens_personalizados");
const portfolioToggle = document.getElementById("portfolio-toggle");

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || ""
  };
}

function formatPhone(value) {
  return value.replace(/\D/g, "");
}

function formatCnpj(value) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function cnpjDigits(value) {
  return value.replace(/\D/g, "");
}

function formDataToObject(form) {
  const data = new FormData(form);
  const object = Object.fromEntries(data.entries());
  object.descricao_acessorio = object.descricao_acessorio || object["descricao_Acessório"] || "";
  object.material_acessorio = object.material_acessorio || object["material_Acessório"] || "";
  object.dimensoes_acessorio = object.dimensoes_acessorio || object["dimensoes_Acessório"] || "";
  object.quantidade_acessorio = object.quantidade_acessorio || object["quantidade_Acessório"] || "";
  object.modelos_padrao = object.modelos_padrao || object["modelos_padrão"] || "";
  object.wizard_recomendacao = object.wizard_recomendacao || object["wizard_recomendação"] || "";
  object.itens_personalizados = object.itens_personalizados || "";
  return object;
}

function buildLeadMessage(data) {
  const lines = [
    "Olá, quero solicitar um orçamento.",
    `Formulário: ${data.form_name || "-"}`,
    `Nome: ${data.nome || "-"}`,
    `Empresa: ${data.empresa || "-"}`,
    `CNPJ: ${data.cnpj || "-"}`,
    `Telefone: ${data.telefone || "-"}`,
    `E-mail: ${data.email || "-"}`,
    `Tipo de embalagem: ${data.tipo_embalagem || "-"}`,
    `Modelos padrão: ${data.modelos_padrao || "-"}`,
    `Especificações por modelo: ${data.modelos_especificacoes || "-"}`,
    `Itens personalizados: ${data.itens_personalizados || "-"}`,
    `Precisa de ajuda: ${data.precisa_ajuda || "Não"}`,
    `Recomendação guiada: ${data.wizard_recomendacao || "-"}`,
    `Observações: ${data.observacoes || "-"}`,
    `Página: ${data.page_title || "-"} | ${data.page_url || "-"}`,
    `Origem anterior: ${data.referrer || "-"}`,
    `Dispositivo: ${data.device_type || "-"}`,
    `UTM Source: ${data.utm_source || "-"}`,
    `UTM Medium: ${data.utm_medium || "-"}`,
    `UTM Campaign: ${data.utm_campaign || "-"}`
  ];
  return lines.join("\n");
}

function openSuccessModal(whatsAppLink) {
  if (!modal || !modalWhatsapp || !whatsAppLink) return;
  modalWhatsapp.href = whatsAppLink;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  trackEvent("whatsapp_handoff", { destination: "success_modal" });
}

function closeSuccessModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function ensureGuideModal() {
  let guideModal = document.getElementById("guide-modal");
  if (guideModal) return guideModal;

  guideModal = document.createElement("div");
  guideModal.id = "guide-modal";
  guideModal.className = "guide-modal";
  guideModal.setAttribute("aria-hidden", "true");
  guideModal.innerHTML = `
    <div class="guide-modal-card">
      <button class="modal-close" type="button" aria-label="Fechar guia técnico" data-guide-close>&times;</button>
      <div id="guide-modal-content"></div>
    </div>
  `;
  document.body.appendChild(guideModal);

  guideModal.addEventListener("click", (event) => {
    if (event.target === guideModal || event.target.closest("[data-guide-close]")) {
      guideModal.classList.remove("is-open");
      guideModal.setAttribute("aria-hidden", "true");
    }
  });

  return guideModal;
}

function openGuideModal(code) {
  const guide = FEFCO_GUIDES[code];
  if (!guide) return;

  const guideModal = ensureGuideModal();
  const content = guideModal.querySelector("#guide-modal-content");
  if (!content) return;

  const scores = (guide.scores || []).map((item) => `
    <article class="guide-score-item">
      <strong>${item.criterion}</strong>
      <span class="guide-score-note">Nota ${item.score}/5</span>
      <p>${item.reason}</p>
    </article>
  `).join("");

  const applications = (guide.applications || []).map((item) => `<li>${item}</li>`).join("");
  const assembly = (guide.assembly || []).map((item) => `<li>${item}</li>`).join("");
  const seoTags = (guide.seoTags || []).map((item) => `<span>${item}</span>`).join("");

  content.innerHTML = `
    <div class="guide-modal-head">
      <span class="section-kicker">Guia útil do modelo</span>
      <h2>${guide.title}</h2>
      <p class="guide-subtitle">${guide.subtitle || ""}</p>
    </div>
    <div class="guide-section">
      <strong>Nome comercial</strong>
      <p>${guide.commercialName}</p>
    </div>
    <div class="guide-section">
      <strong>O que é na prática</strong>
      <p>${guide.plain}</p>
    </div>
    <div class="guide-section">
      <strong>Análise técnica</strong>
      <p>${guide.technical}</p>
    </div>
    <div class="guide-section">
      <strong>Aplicações de ouro</strong>
      <ul class="guide-list">${applications}</ul>
    </div>
    <div class="guide-score-grid">${scores}</div>
    <div class="guide-section">
      <strong>Instruções de montagem</strong>
      <ul class="guide-list">${assembly}</ul>
    </div>
    <div class="guide-section">
      <strong>Dica pro de logística</strong>
      <p>${guide.logisticsTip}</p>
    </div>
    <div class="guide-section">
      <strong>SEO tags</strong>
      <div class="guide-tags">${seoTags}</div>
    </div>
  `;

  guideModal.classList.add("is-open");
  guideModal.setAttribute("aria-hidden", "false");
}

function trackEvent(eventName, payload = {}) {
  if (typeof window.gtag === "function") window.gtag("event", eventName, payload);
  if (typeof window.fbq === "function") window.fbq("trackCustom", eventName, payload);
  try {
    const stored = JSON.parse(localStorage.getItem(LEAD_EVENTS_KEY) || "[]");
    stored.push({ eventName, payload, createdAt: new Date().toISOString() });
    localStorage.setItem(LEAD_EVENTS_KEY, JSON.stringify(stored.slice(-250)));
  } catch (error) {
    console.warn("Falha ao salvar evento local.", error);
  }
}

async function submitToEndpoint(data) {
  if (runtimeConfig.formEndpoint) {
    const response = await fetch(runtimeConfig.formEndpoint, {
      method: "POST",
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error("Falha no envio para o endpoint Configurado.");
    return true;
  }
  return false;
}

function buildDashboardMetrics() {
  try {
    const events = JSON.parse(localStorage.getItem(LEAD_EVENTS_KEY) || "[]");
    const leads = JSON.parse(localStorage.getItem(LEADS_STORAGE_KEY) || "[]");
    const byName = events.reduce((acc, item) => {
      acc[item.eventName] = (acc[item.eventName] || 0) + 1;
      return acc;
    }, {});
    const uniqueCompanies = new Set(leads.map((lead) => `${lead.empresa || ""}::${lead.cnpj || ""}`).filter(Boolean));
    const directOrders = leads.filter((lead) => (lead.itens_personalizados || "").trim()).length;
    const guidedOrders = leads.filter((lead) => (lead.wizard_recomendacao || "").trim()).length;
    const accessoryOrders = leads.filter((lead) => (lead.modelos_especificacoes || "").trim()).length;
    return {
      totalEvents: events.length,
      totalLeads: leads.length,
      uniqueCompanies: uniqueCompanies.size,
      leadSubmit: byName.lead_submit || 0,
      leadFallback: byName.lead_submit_fallback || 0,
      ctaClick: byName.cta_click || 0,
      wizardSubmit: byName.wizard_submit || 0,
      portfolioSelect: byName.portfolio_select || 0,
      wizardApply: byName.wizard_apply_recommendation || 0,
      directOrders,
      guidedOrders,
      accessoryOrders,
      conversionRate: byName.cta_click ? Math.round(((byName.lead_submit || 0) / byName.cta_click) * 100) : 0
    };
  } catch (error) {
    return null;
  }
}

function renderControlPanel() {
  const metricsRoot = document.getElementById("control-metrics");
  const latestRoot = document.getElementById("control-latest-events");
  const integrationRoot = document.getElementById("control-integrations");
  const leadsRoot = document.getElementById("control-latest-leads");
  const funnelRoot = document.getElementById("control-funnel");
  const settingsForm = document.getElementById("runtime-config-form");
  const exportEventsButton = document.getElementById("export-events");
  const exportLeadsButton = document.getElementById("export-leads");
  const clearEventsButton = document.getElementById("clear-events");
  const checklistRoot = document.getElementById("control-activation-checklist");
  if (!metricsRoot && !latestRoot && !integrationRoot && !leadsRoot && !funnelRoot && !settingsForm) return;

  let events = [];
  let leads = [];
  try {
    events = JSON.parse(localStorage.getItem(LEAD_EVENTS_KEY) || "[]");
  } catch (error) {
    events = [];
  }
  try {
    leads = JSON.parse(localStorage.getItem(LEADS_STORAGE_KEY) || "[]");
  } catch (error) {
    leads = [];
  }

  const metrics = buildDashboardMetrics();
  if (metricsRoot && metrics) {
    metricsRoot.innerHTML = `
      <article class="feature-card metric-card"><h3>Leads captados</h3><p>${metrics.totalLeads}</p><span>Pedidos registrados neste navegador</span></article>
      <article class="feature-card metric-card"><h3>Empresas únicas</h3><p>${metrics.uniqueCompanies}</p><span>Combinação empresa + CNPJ</span></article>
      <article class="feature-card metric-card"><h3>Conversão local</h3><p>${metrics.conversionRate}%</p><span>Leads enviados / cliques em CTA</span></article>
      <article class="feature-card metric-card"><h3>Fallback de contato</h3><p>${metrics.leadFallback}</p><span>Leads que precisaram seguir por canal alternativo</span></article>
      <article class="feature-card metric-card"><h3>Pedidos diretos</h3><p>${metrics.directOrders}</p><span>Quem já sabia o que queria</span></article>
      <article class="feature-card metric-card"><h3>Pedidos guiados</h3><p>${metrics.guidedOrders}</p><span>Leads que usaram o fluxo assistido</span></article>
      <article class="feature-card metric-card"><h3>Com ficha técnica</h3><p>${metrics.accessoryOrders}</p><span>Leads com especificações por modelo selecionado</span></article>
      <article class="feature-card metric-card"><h3>Eventos totais</h3><p>${metrics.totalEvents}</p><span>Base local do painel</span></article>
    `;
  }

  if (latestRoot) {
    const latest = events.slice(-10).reverse();
    latestRoot.innerHTML = latest.length
      ? latest.map((item) => `<article class="feature-card timeline-card"><h3>${item.eventName}</h3><p>${item.createdAt}</p><span>${Object.entries(item.payload || {}).slice(0, 2).map(([key, value]) => `${key}: ${value || "-"}`).join(" | ")}</span></article>`).join("")
      : '<div class="empty-specs-state">Nenhum evento local registrado ainda neste navegador.</div>';
  }

  if (leadsRoot) {
    const latestLeads = leads.slice(-10).reverse();
    leadsRoot.innerHTML = latestLeads.length
      ? latestLeads.map((lead) => `
        <article class="feature-card lead-card">
          <h3>${lead.empresa || "Empresa nao informada"}</h3>
          <p>${lead.nome || "-"} | ${lead.cnpj || "-"}</p>
          <span>${lead.tipo_embalagem || "-"} | ${lead.telefone || "-"}</span>
        </article>
      `).join("")
      : '<div class="empty-specs-state">Nenhum lead salvo neste navegador ainda.</div>';
  }

  if (funnelRoot && metrics) {
    funnelRoot.innerHTML = `
      <article class="feature-card metric-card"><h3>Cliques em CTA</h3><p>${metrics.ctaClick}</p><span>Interesse comercial inicial</span></article>
      <article class="feature-card metric-card"><h3>Configurador usado</h3><p>${metrics.wizardSubmit}</p><span>Leads que buscaram ajuda técnica</span></article>
      <article class="feature-card metric-card"><h3>Recomendações aplicadas</h3><p>${metrics.wizardApply}</p><span>Quem avancou para o formulário com base na recomendação</span></article>
      <article class="feature-card metric-card"><h3>Seleções FEFCO</h3><p>${metrics.portfolioSelect}</p><span>Interesse por modelos padrão</span></article>
      <article class="feature-card metric-card"><h3>Leads enviados</h3><p>${metrics.leadSubmit}</p><span>Submissões confirmadas</span></article>
    `;
  }

  if (integrationRoot) {
    integrationRoot.innerHTML = `
      <article class="feature-card"><h3>Captura local</h3><p>Ativa no navegador para preservar leads mesmo sem backend configurado.</p></article>
      <article class="feature-card"><h3>Webhook customizado</h3><p>${runtimeConfig.formEndpoint ? "Configurado" : "Não Configurado"}</p></article>
      <article class="feature-card"><h3>GA4</h3><p>${runtimeConfig.gaMeasurementId ? runtimeConfig.gaMeasurementId : "Não Configurado"}</p></article>
      <article class="feature-card"><h3>Meta Pixel</h3><p>${runtimeConfig.metaPixelId ? runtimeConfig.metaPixelId : "Não Configurado"}</p></article>
      <article class="feature-card"><h3>Contato comercial</h3><p>${runtimeConfig.businessEmail || "-"} | ${runtimeConfig.whatsappNumber || "WhatsApp em implantação"}</p></article>
    `;
  }

  if (checklistRoot) {
    checklistRoot.innerHTML = `
      <article class="feature-card checklist-card"><h3>Dominio</h3><p>${window.location.hostname.includes("newage.ind.br") ? "Rodando no dominio final" : "Ainda fora do domínio final"}</p></article>
      <article class="feature-card checklist-card"><h3>Webhook / CRM</h3><p>${runtimeConfig.formEndpoint ? "Pronto para distribuir leads" : "Configurar endpoint para centralizar captação"}</p></article>
      <article class="feature-card checklist-card"><h3>GA4</h3><p>${runtimeConfig.gaMeasurementId ? "Pronto para medir aquisição e conversão" : "Inserir Measurement ID"}</p></article>
      <article class="feature-card checklist-card"><h3>Meta Pixel</h3><p>${runtimeConfig.metaPixelId ? "Pronto para remarketing" : "Inserir Pixel ID"}</p></article>
    `;
  }

  if (settingsForm) {
    settingsForm.elements.whatsappNumber.value = runtimeConfig.whatsappNumber || "";
    settingsForm.elements.businessEmail.value = runtimeConfig.businessEmail || "";
    settingsForm.elements.formEndpoint.value = runtimeConfig.formEndpoint || "";
    settingsForm.elements.gaMeasurementId.value = runtimeConfig.gaMeasurementId || "";
    settingsForm.elements.metaPixelId.value = runtimeConfig.metaPixelId || "";
    settingsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = formDataToObject(settingsForm);
      localStorage.setItem(RUNTIME_CONFIG_KEY, JSON.stringify(data));
      window.location.reload();
    });
  }

  if (exportEventsButton) {
    exportEventsButton.addEventListener("click", () => downloadJsonFile("newage-eventos.json", events));
  }
  if (exportLeadsButton) {
    exportLeadsButton.addEventListener("click", () => downloadJsonFile("newage-leads.json", leads));
  }
  if (clearEventsButton) {
    clearEventsButton.addEventListener("click", () => {
      localStorage.removeItem(LEAD_EVENTS_KEY);
      localStorage.removeItem(LEADS_STORAGE_KEY);
      window.location.reload();
    });
  }
}

function hydrateTrackingIds() {
  loadGoogleAnalytics(runtimeConfig.gaMeasurementId);
  loadMetaPixel(runtimeConfig.metaPixelId);
}

function loadGoogleAnalytics(measurementId) {
  if (!measurementId) return;
  if (!window.dataLayer) window.dataLayer = [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: true,
    page_path: window.location.pathname,
    page_title: document.title
  });
}

function loadMetaPixel(pixelId) {
  if (!pixelId) return;
  if (typeof window.fbq !== "function") {
    const fbq = function fbq() {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments);
      } else {
        fbq.queue.push(arguments);
      }
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
  }

  if (!document.querySelector('script[src*="connect.facebook.net/en_US/fbevents.js"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

function getDeviceType() {
  const width = window.innerWidth || 0;
  if (width <= 760) return "mobile";
  if (width <= 1080) return "tablet";
  return "desktop";
}

function enrichLeadData(data) {
  return {
    ...data,
    created_at: new Date().toISOString(),
    page_url: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
    referrer: document.referrer || "",
    user_agent: navigator.userAgent || "",
    device_type: getDeviceType(),
    screen_size: `${window.screen?.width || 0}x${window.screen?.height || 0}`
  };
}

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function persistLead(data) {
  try {
    const stored = JSON.parse(localStorage.getItem(LEADS_STORAGE_KEY) || "[]");
    stored.push({
      nome: data.nome || "",
      empresa: data.empresa || "",
      cnpj: data.cnpj || "",
      telefone: data.telefone || "",
      email: data.email || "",
      tipo_embalagem: data.tipo_embalagem || "",
      modelos_padrao: data.modelos_padrao || "",
      modelos_especificacoes: data.modelos_especificacoes || "",
      itens_personalizados: data.itens_personalizados || "",
      wizard_recomendacao: data.wizard_recomendacao || "",
      device_type: data.device_type || "",
      page_path: data.page_path || "",
      utm_source: data.utm_source || "",
      created_at: data.created_at || new Date().toISOString()
    });
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(stored.slice(-250)));
  } catch (error) {
    console.warn("Falha ao salvar lead localmente.", error);
  }
}

function trackPageContext() {
  trackEvent("page_view_local", {
    page_path: window.location.pathname,
    page_title: document.title,
    device_type: getDeviceType(),
    referrer: document.referrer || ""
  });
}

function applyUtmToForms() {
  const utm = getUrlParams();
  document.querySelectorAll("form.lead-form").forEach((form) => {
    Object.entries(utm).forEach(([key, value]) => {
      const input = form.querySelector(`input[name="${key}"]`);
      if (input) input.value = value;
    });
  });
}

function attachClickTracking() {
  document.querySelectorAll("[data-track-click]").forEach((element) => {
    element.addEventListener("click", () => {
      trackEvent("cta_click", { cta_name: element.getAttribute("data-track-click") });
    });
  });
}

function attachCnpjMasks() {
  document.querySelectorAll('input[name="cnpj"]').forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatCnpj(input.value);
    });
  });
}

function updateSelectedModelsUi() {
  const value = state.selectedModels.join(", ");
  if (selectedModelsField) selectedModelsField.value = value;
  if (selectedModelsPreview) selectedModelsPreview.value = value;

  if (!selectedModelsContainer) return;
  if (!state.selectedModels.length) {
    selectedModelsContainer.textContent = "Nenhum modelo selecionado ainda.";
    return;
  }

  selectedModelsContainer.innerHTML = state.selectedModels
    .map((item) => `<span class="model-chip">${item}</span>`)
    .join("");
}

function slugifyModel(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getModelCodeFromLabel(label) {
  const match = String(label || "").match(/^(\d{4})/);
  return match ? match[1] : "";
}

function isFamily900(codeOrLabel) {
  return /^09\d{2}/.test(getModelCodeFromLabel(codeOrLabel) || String(codeOrLabel || ""));
}

function getFamily900Accessories() {
  return filterPortfolioVariants(window.FEFCO_MODELS || []).filter((model) => /^09\d{2}/.test(String(model.code || "")));
}

function parseAccessoryPayload(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value).split("||").map((item) => item.trim()).filter(Boolean);
  }
}

function stringifyAccessoryPayload(items) {
  return JSON.stringify((items || []).filter(Boolean));
}

function buildAccessorySubitemsHtml(items, inputName, modelKey) {
  const accessories = getFamily900Accessories();
  if (!accessories.length) return "";

  const options = accessories.map((item) => {
    const label = `${item.code} - ${getModelDisplayName(item)}`;
    return `<option value="${label.replace(/"/g, "&quot;")}">${label}</option>`;
  }).join("");

  const chips = (items || []).length
    ? items.map((item, index) => `<span class="subitem-chip">${item}<button type="button" aria-label="Remover subitem" data-subitem-remove="${index}" data-subitem-target="${modelKey}">×</button></span>`).join("")
    : '<span class="subitem-empty">Nenhum acessório da família 900 vinculado.</span>';

  return `
    <div class="full-span subitems-builder" data-subitems-block="${modelKey}">
      <div class="specs-builder-header">
        <strong>Subitens da família 900</strong>
        <span>Vincule um ou mais acessórios da família 900 a este projeto.</span>
      </div>
      <div class="subitems-controls">
        <select data-subitem-select="${modelKey}">
          <option value="">Selecionar acessório 900</option>
          ${options}
        </select>
        <button class="btn btn-secondary btn-small" type="button" data-subitem-add="${modelKey}">Adicionar subitem</button>
      </div>
      <div class="subitems-list" data-subitem-list="${modelKey}">${chips}</div>
      <input type="hidden" data-spec="${inputName}" data-model-key="${modelKey}" value="${stringifyAccessoryPayload(items).replace(/"/g, "&quot;")}">
    </div>
  `;
}

function collectRenderedSpecs() {
  if (!modelSpecsContainer) return;
  modelSpecsContainer.querySelectorAll(".model-spec-card").forEach((card) => {
    const label = card.getAttribute("data-model-label");
    if (!label) return;
    state.modelSpecs[label] = {
      dimensoes_internas: card.querySelector('[data-spec="dimensoes_internas"]')?.value || "",
      onda: card.querySelector('[data-spec="onda"]')?.value || "",
      coluna_minima: card.querySelector('[data-spec="coluna_minima"]')?.value || "",
      tipo_papel: card.querySelector('[data-spec="tipo_papel"]')?.value || "",
      fechamento: card.querySelector('[data-spec="fechamento"]')?.value || "",
      carga_paletizada: card.querySelector('[data-spec="carga_paletizada"]')?.value || "",
      furo_alca: card.querySelector('[data-spec="furo_alca"]')?.value || "",
      gramatura: card.querySelector('[data-spec="gramatura"]')?.value || "",
      quantidade: card.querySelector('[data-spec="quantidade"]')?.value || "",
      quantidade_cores: card.querySelector('[data-spec="quantidade_cores"]')?.value || "",
      link_arte: card.querySelector('[data-spec="link_arte"]')?.value || "",
      acessorios_vinculados: card.querySelector('[data-spec="acessorios_vinculados"]')?.value || "",
      subitens_900: parseAccessoryPayload(card.querySelector('[data-spec="subitens_900"]')?.value || "")
    };
  });
}

function serializeModelSpecs() {
  collectRenderedSpecs();
  const payload = state.selectedModels.map((label) => ({
    modelo: label,
    ...state.modelSpecs[label]
  }));
  const serialized = payload.map((item, index) => {
    return [
      `Caixa ${index + 1}: ${item.modelo}`,
      `Dimensoes internas: ${item.dimensoes_internas || "-"}`,
      `Onda: ${item.onda || "-"}`,
      `Coluna minima (ECT): ${item.coluna_minima || "-"}`,
      `Tipo de papel: ${item.tipo_papel || "-"}`,
      `Fechamento: ${item.fechamento || "-"}`,
      `Carga paletizada: ${item.carga_paletizada || "-"}`,
      `Furo alca: ${item.furo_alca || "-"}`,
      `Gramatura: ${item.gramatura || "-"}`,
      `Quantidade: ${item.quantidade || "-"}`,
      `Quantidade de cores: ${item.quantidade_cores || "-"}`,
      `Link da arte: ${item.link_arte || "-"}`,
      `Acessorios vinculados: ${item.acessorios_vinculados || "-"}`,
      `Subitens familia 900: ${(item.subitens_900 || []).join(", ") || "-"}`
    ].join(" | ");
  }).join(" || ");

  if (selectedModelSpecsField) selectedModelSpecsField.value = serialized;
  return serialized;
}

function renderModelSpecs() {
  if (!modelSpecsContainer) return;
  collectRenderedSpecs();

  if (!state.selectedModels.length) {
    modelSpecsContainer.innerHTML = '<div class="empty-specs-state">Selecione um ou mais modelos FEFCO no portfolio para abrir fichas tecnicas independentes por caixa.</div>';
    if (selectedModelSpecsField) selectedModelSpecsField.value = "";
    return;
  }

  modelSpecsContainer.innerHTML = state.selectedModels.map((label) => {
    const specs = state.modelSpecs[label] || {};
    const key = slugifyModel(label);
    const canAttach900 = !isFamily900(label);
    return `
      <article class="model-spec-card" data-model-label="${label.replace(/"/g, "&quot;")}">
        <h3>${label}</h3>
        <div class="model-spec-grid">
          <label>Dimensoes internas
            <input type="text" data-spec="dimensoes_internas" data-model-key="${key}" value="${(specs.dimensoes_internas || "").replace(/"/g, "&quot;")}" placeholder="Ex.: 30 x 20 x 15 cm">
          </label>
          <label>Onda
            <select data-spec="onda" data-model-key="${key}">
              <option value="">Selecionar</option>
              <option value="A" ${specs.onda === "A" ? "selected" : ""}>A</option>
              <option value="B" ${specs.onda === "B" ? "selected" : ""}>B</option>
              <option value="C" ${specs.onda === "C" ? "selected" : ""}>C</option>
              <option value="E" ${specs.onda === "E" ? "selected" : ""}>E</option>
              <option value="BC" ${specs.onda === "BC" ? "selected" : ""}>BC</option>
              <option value="EB" ${specs.onda === "EB" ? "selected" : ""}>EB</option>
            </select>
          </label>
          <label>Coluna minima (ECT)
            <input type="text" data-spec="coluna_minima" data-model-key="${key}" value="${(specs.coluna_minima || "").replace(/"/g, "&quot;")}" placeholder="Ex.: 5">
          </label>
          <label>Tipo de papel
            <select data-spec="tipo_papel" data-model-key="${key}">
              <option value="">Selecionar</option>
              <option value="Kraft" ${specs.tipo_papel === "Kraft" ? "selected" : ""}>Kraft</option>
              <option value="Reciclado" ${specs.tipo_papel === "Reciclado" ? "selected" : ""}>Reciclado</option>
              <option value="Branco" ${specs.tipo_papel === "Branco" ? "selected" : ""}>Branco</option>
            </select>
          </label>
          <label>Fechamento
            <select data-spec="fechamento" data-model-key="${key}">
              <option value="">Selecionar</option>
              <option value="Cola" ${specs.fechamento === "Cola" ? "selected" : ""}>Cola</option>
              <option value="Grampo" ${specs.fechamento === "Grampo" ? "selected" : ""}>Grampo</option>
              <option value="Cola de contato" ${specs.fechamento === "Cola de contato" ? "selected" : ""}>Cola de contato</option>
            </select>
          </label>
          <label>Carga paletizada
            <select data-spec="carga_paletizada" data-model-key="${key}">
              <option value="">Selecionar</option>
              <option value="Sim" ${specs.carga_paletizada === "Sim" ? "selected" : ""}>Sim</option>
              <option value="Não" ${specs.carga_paletizada === "Não" ? "selected" : ""}>Não</option>
            </select>
          </label>
          <label>Furo alça
            <select data-spec="furo_alca" data-model-key="${key}">
              <option value="">Selecionar</option>
              <option value="Sim" ${specs.furo_alca === "Sim" ? "selected" : ""}>Sim</option>
              <option value="Não" ${specs.furo_alca === "Não" ? "selected" : ""}>Não</option>
            </select>
          </label>
          <label>Gramatura
            <input type="text" data-spec="gramatura" data-model-key="${key}" value="${(specs.gramatura || "").replace(/"/g, "&quot;")}" placeholder="Ex.: 125">
          </label>
          <label>Quantidade
            <input type="number" data-spec="quantidade" data-model-key="${key}" value="${(specs.quantidade || "").replace(/"/g, "&quot;")}" placeholder="Ex.: 500 un">
          </label>
          <label>Quantidade de cores
            <input type="number" data-spec="quantidade_cores" data-model-key="${key}" value="${(specs.quantidade_cores || "").replace(/"/g, "&quot;")}" placeholder="Ex.: 2">
          </label>
          <label>Link da arte / impressao
            <input type="url" data-spec="link_arte" data-model-key="${key}" value="${(specs.link_arte || "").replace(/"/g, "&quot;")}" placeholder="https://drive.google.com/...">
          </label>
          <label class="full-span">Acessórios vinculados a esta caixa
            <textarea data-spec="acessorios_vinculados" data-model-key="${key}" rows="3" placeholder="Ex.: divisória, berço, colmeia, reforço interno ou outros sub-itens desta caixa">${(specs.acessorios_vinculados || "").replace(/</g, "&lt;")}</textarea>
          </label>
          ${canAttach900 ? buildAccessorySubitemsHtml(specs.subitens_900 || [], "subitens_900", key) : ""}
        </div>
      </article>
    `;
  }).join("");

  modelSpecsContainer.querySelectorAll("[data-spec]").forEach((field) => {
    field.addEventListener("input", serializeModelSpecs);
    field.addEventListener("change", serializeModelSpecs);
  });

  modelSpecsContainer.querySelectorAll("[data-subitem-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-subitem-add");
      const select = modelSpecsContainer.querySelector(`[data-subitem-select="${target}"]`);
      const hidden = modelSpecsContainer.querySelector(`[data-spec="subitens_900"][data-model-key="${target}"]`);
      if (!select || !hidden || !select.value) return;
      const current = parseAccessoryPayload(hidden.value);
      if (!current.includes(select.value)) current.push(select.value);
      hidden.value = stringifyAccessoryPayload(current);
      collectRenderedSpecs();
      renderModelSpecs();
    });
  });

  modelSpecsContainer.querySelectorAll("[data-subitem-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-subitem-target");
      const hidden = modelSpecsContainer.querySelector(`[data-spec="subitens_900"][data-model-key="${target}"]`);
      if (!hidden) return;
      const index = Number(button.getAttribute("data-subitem-remove"));
      const current = parseAccessoryPayload(hidden.value);
      current.splice(index, 1);
      hidden.value = stringifyAccessoryPayload(current);
      collectRenderedSpecs();
      renderModelSpecs();
    });
  });

  serializeModelSpecs();
}

function collectRenderedDirectSpecs() {
  if (!directSpecsContainer) return;
  state.directSpecs = [...directSpecsContainer.querySelectorAll(".direct-spec-card")].map((card) => ({
    referencia: card.querySelector('[data-direct="referencia"]')?.value || "",
    descricao: card.querySelector('[data-direct="descricao"]')?.value || "",
    dimensoes_internas: card.querySelector('[data-direct="dimensoes_internas"]')?.value || "",
    onda: card.querySelector('[data-direct="onda"]')?.value || "",
    coluna_minima: card.querySelector('[data-direct="coluna_minima"]')?.value || "",
    tipo_papel: card.querySelector('[data-direct="tipo_papel"]')?.value || "",
    gramatura: card.querySelector('[data-direct="gramatura"]')?.value || "",
    quantidade: card.querySelector('[data-direct="quantidade"]')?.value || "",
    quantidade_cores: card.querySelector('[data-direct="quantidade_cores"]')?.value || "",
    link_arte: card.querySelector('[data-direct="link_arte"]')?.value || "",
    observacoes: card.querySelector('[data-direct="observacoes"]')?.value || "",
    subitens_900: parseAccessoryPayload(card.querySelector('[data-direct="subitens_900"]')?.value || "")
  }));
}

function serializeDirectSpecs() {
  collectRenderedDirectSpecs();
  const serialized = state.directSpecs.map((item, index) => [
    `Item ${index + 1}: ${item.referencia || "Sem referência"}`,
    `Descrição: ${item.descricao || "-"}`,
    `Dimensões internas: ${item.dimensoes_internas || "-"}`,
    `Onda: ${item.onda || "-"}`,
    `Coluna mínima (ECT): ${item.coluna_minima || "-"}`,
    `Tipo de papel: ${item.tipo_papel || "-"}`,
    `Gramatura: ${item.gramatura || "-"}`,
    `Quantidade: ${item.quantidade || "-"}`,
    `Quantidade de cores: ${item.quantidade_cores || "-"}`,
    `Link da arte: ${item.link_arte || "-"}`,
    `Observações: ${item.observacoes || "-"}`,
    `Subitens familia 900: ${(item.subitens_900 || []).join(", ") || "-"}`
  ].join(" | ")).join(" || ");
  if (directSpecsField) directSpecsField.value = serialized;
  return serialized;
}

function buildDirectSpecCard(spec = {}, index = 0) {
  const canAttach900 = !isFamily900(spec.referencia || spec.descricao || "");
  return `
    <article class="model-spec-card direct-spec-card">
      <div class="direct-spec-head">
        <h3>Item personalizado ${index + 1}</h3>
        <button class="btn btn-secondary btn-small" type="button" data-direct-remove="${index}">Remover</button>
      </div>
      <div class="model-spec-grid">
        <label>Referência do item
          <input type="text" data-direct="referencia" value="${(spec.referencia || "").replace(/"/g, "&quot;")}" placeholder="Ex.: caixa para kit promocional">
        </label>
        <label>Descrição
          <input type="text" data-direct="descricao" value="${(spec.descricao || "").replace(/"/g, "&quot;")}" placeholder="Ex.: caixa com berço interno e tampa">
        </label>
        <label>Dimensões internas
          <input type="text" data-direct="dimensoes_internas" value="${(spec.dimensoes_internas || "").replace(/"/g, "&quot;")}" placeholder="Ex.: 30 x 20 x 15 cm">
        </label>
        <label>Onda
          <select data-direct="onda">
            <option value="">Selecionar</option>
            <option value="A" ${spec.onda === "A" ? "selected" : ""}>A</option>
            <option value="B" ${spec.onda === "B" ? "selected" : ""}>B</option>
            <option value="C" ${spec.onda === "C" ? "selected" : ""}>C</option>
            <option value="E" ${spec.onda === "E" ? "selected" : ""}>E</option>
            <option value="BC" ${spec.onda === "BC" ? "selected" : ""}>BC</option>
            <option value="EB" ${spec.onda === "EB" ? "selected" : ""}>EB</option>
          </select>
        </label>
        <label>Coluna mínima (ECT)
          <input type="text" data-direct="coluna_minima" value="${(spec.coluna_minima || "").replace(/"/g, "&quot;")}" placeholder="Ex.: 5">
        </label>
        <label>Tipo de papel
          <select data-direct="tipo_papel">
            <option value="">Selecionar</option>
            <option value="Kraft" ${spec.tipo_papel === "Kraft" ? "selected" : ""}>Kraft</option>
            <option value="Reciclado" ${spec.tipo_papel === "Reciclado" ? "selected" : ""}>Reciclado</option>
            <option value="Branco" ${spec.tipo_papel === "Branco" ? "selected" : ""}>Branco</option>
          </select>
        </label>
        <label>Gramatura
          <input type="text" data-direct="gramatura" value="${(spec.gramatura || "").replace(/"/g, "&quot;")}" placeholder="Ex.: 125">
        </label>
        <label>Quantidade
          <input type="number" data-direct="quantidade" value="${(spec.quantidade || "").replace(/"/g, "&quot;")}" placeholder="Ex.: 500">
        </label>
        <label>Quantidade de cores
          <input type="number" data-direct="quantidade_cores" value="${(spec.quantidade_cores || "").replace(/"/g, "&quot;")}" placeholder="Ex.: 2">
        </label>
        <label>Link da arte / impressão
          <input type="url" data-direct="link_arte" value="${(spec.link_arte || "").replace(/"/g, "&quot;")}" placeholder="https://drive.google.com/...">
        </label>
        <label class="full-span">Observações do item
          <textarea data-direct="observacoes" rows="3" placeholder="Ex.: item fora do padrão FEFCO, precisa de desenvolvimento específico">${(spec.observacoes || "").replace(/</g, "&lt;")}</textarea>
        </label>
        ${canAttach900 ? buildAccessorySubitemsHtml(spec.subitens_900 || [], "subitens_900", `direct-${index}`).replace(/data-spec=/g, "data-direct=").replace(/data-model-key=/g, "data-direct-key=") : ""}
      </div>
    </article>
  `;
}

function renderDirectSpecs() {
  if (!directSpecsContainer) return;
  if (!state.directSpecs.length) state.directSpecs = [{}];
  directSpecsContainer.innerHTML = state.directSpecs.map((spec, index) => buildDirectSpecCard(spec, index)).join("");
  directSpecsContainer.querySelectorAll("[data-direct]").forEach((field) => {
    field.addEventListener("input", serializeDirectSpecs);
    field.addEventListener("change", serializeDirectSpecs);
  });
  directSpecsContainer.querySelectorAll("[data-direct-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.getAttribute("data-direct-remove"));
      state.directSpecs.splice(index, 1);
      if (!state.directSpecs.length) state.directSpecs = [{}];
      renderDirectSpecs();
    });
  });

  directSpecsContainer.querySelectorAll("[data-subitem-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-subitem-add");
      const select = directSpecsContainer.querySelector(`[data-subitem-select="${target}"]`);
      const hidden = directSpecsContainer.querySelector(`[data-direct="subitens_900"][data-direct-key="${target}"]`);
      if (!select || !hidden || !select.value) return;
      const current = parseAccessoryPayload(hidden.value);
      if (!current.includes(select.value)) current.push(select.value);
      hidden.value = stringifyAccessoryPayload(current);
      collectRenderedDirectSpecs();
      renderDirectSpecs();
    });
  });

  directSpecsContainer.querySelectorAll("[data-subitem-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-subitem-target");
      const hidden = directSpecsContainer.querySelector(`[data-direct="subitens_900"][data-direct-key="${target}"]`);
      if (!hidden) return;
      const index = Number(button.getAttribute("data-subitem-remove"));
      const current = parseAccessoryPayload(hidden.value);
      current.splice(index, 1);
      hidden.value = stringifyAccessoryPayload(current);
      collectRenderedDirectSpecs();
      renderDirectSpecs();
    });
  });

  serializeDirectSpecs();
}

function attachDirectSpecsControls() {
  document.querySelectorAll("[data-add-direct-spec]").forEach((button) => {
    button.addEventListener("click", () => {
      collectRenderedDirectSpecs();
      state.directSpecs.push({});
      renderDirectSpecs();
    });
  });
  if (directSpecsContainer) renderDirectSpecs();
}

function toggleModelSelection(label) {
  collectRenderedSpecs();
  const exists = state.selectedModels.includes(label);
  state.selectedModels = exists
    ? state.selectedModels.filter((item) => item !== label)
    : [...state.selectedModels, label];

  document.querySelectorAll(".model-card").forEach((card) => {
    const current = card.getAttribute("data-model-label");
    const selected = state.selectedModels.includes(current);
    card.classList.toggle("is-selected", selected);
    const button = card.querySelector("button");
    if (button) button.textContent = selected ? "Selecionado" : "Selecionar modelo";
  });

  updateSelectedModelsUi();
  renderModelSpecs();
}

function getSiteRootForLocalPreview() {
  const marker = "/new-age-embalagens-site/";
  const pathname = window.location.pathname.replace(/\\/g, "/");
  const index = pathname.toLowerCase().indexOf(marker);
  if (index === -1) return "";
  return pathname.slice(0, index + marker.length);
}

function resolveModelImage(imagePath) {
  if (!imagePath) return "";
  if (window.location.protocol === "file:" && imagePath.startsWith("/assets/")) {
    const siteRoot = getSiteRootForLocalPreview();
    if (siteRoot) return encodeURI(`file://${siteRoot}${imagePath.slice(1)}`);
  }
  return encodeURI(imagePath);
}

function getPreviewPngPath(imagePath) {
  if (!imagePath) return "";
  return imagePath
    .replace("/assets/fefco/", "/assets/fefco-png/")
    .replace(/\.svg$/i, ".png");
}

function normalizeBrokenText(text) {
  const value = String(text || "");
  const replacements = [
    ["ÃƒÂ©", "é"],
    ["ÃƒÂª", "ê"],
    ["ÃƒÂ£", "ã"],
    ["ÃƒÂ§", "ç"],
    ["ÃƒÂ¡", "á"],
    ["ÃƒÂ³", "ó"],
    ["ÃƒÂº", "ú"],
    ["ÃƒÂ­", "í"],
    ["ÃƒÂ´", "ô"],
    ["ÃƒÂ‰", "É"],
    ["ÃƒÂ“", "Ó"],
    ["ÃƒÂ‡", "Ç"],
    ["Ã§", "ç"],
    ["Ã£", "ã"],
    ["Ã¡", "á"],
    ["Ã ", "à"],
    ["Ã¢", "â"],
    ["Ãª", "ê"],
    ["Ã©", "é"],
    ["Ã­", "í"],
    ["Ã³", "ó"],
    ["Ã´", "ô"],
    ["Ãº", "ú"],
    ["Ã¼", "ü"],
    ["Ã‰", "É"],
    ["Ã“", "Ó"],
    ["ÃŠ", "Ê"],
    ["Ã‡", "Ç"],
    ["Ãƒ", "Ã"],
    ["Âº", "º"],
    ["Âª", "ª"],
    ["Â", ""],
    ["MÃ©dia", "Média"],
    ["cenario", "cenário"],
    ["cenario", "cenário"],
    ["nivel", "nível"],
    ["logistico", "logístico"],
    ["cotacao", "cotação"],
    ["recomendacao", "recomendação"],
    ["formulario", "formulário"],
    ["tecnica", "técnica"],
    ["tecnico", "técnico"],
    ["direcao", "direção"],
    ["proximo", "próximo"],
    ["propria", "própria"],
    ["voce", "você"],
    ["interMédiario", "intermediário"],
    ["apresentacao", "apresentação"],
    ["impressao", "impressão"],
    ["validacao", "validação"],
    ["solucao", "solução"],
    ["conversao", "conversão"],
    ["confianca", "confiança"],
    ["especificacoes", "especificações"],
    ["protecao", "proteção"],
    ["divisoria", "divisória"],
    ["berco", "berço"],
    ["reforco", "reforço"],
    ["Industria", "Indústria"]
  ];
  return replacements.reduce((acc, [from, to]) => acc.replaceAll(from, to), value);
}

function normalizePageContent() {
  if (
    typeof document === "undefined" ||
    !document.body ||
    typeof document.createTreeWalker !== "function" ||
    typeof NodeFilter === "undefined"
  ) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue || !node.nodeValue.trim()) continue;
    const normalized = normalizeBrokenText(node.nodeValue);
    if (normalized !== node.nodeValue) node.nodeValue = normalized;
  }

  document.querySelectorAll("[placeholder],[title],[aria-label]").forEach((element) => {
    ["placeholder", "title", "aria-label"].forEach((attr) => {
      const value = element.getAttribute(attr);
      if (!value) return;
      const normalized = normalizeBrokenText(value);
      if (normalized !== value) element.setAttribute(attr, normalized);
    });
  });

  document.querySelectorAll("option").forEach((option) => {
    const normalized = normalizeBrokenText(option.textContent);
    if (normalized !== option.textContent) option.textContent = normalized;
  });

  document.title = normalizeBrokenText(document.title);
}

function publishDiagnostics() {
  window.NEWAGE_DIAGNOSTICS = {
    models: Array.isArray(window.FEFCO_MODELS) ? window.FEFCO_MODELS.length : 0,
    guides: Object.keys(window.FEFCO_GUIDES || {}).length,
    meta: Object.keys(window.FEFCO_META || {}).length,
    currentPath: window.location.pathname
  };
}

function safeRun(label, callback) {
  try {
    callback();
  } catch (error) {
    console.error(`[newage] Falha em ${label}`, error);
  }
}

function translateModelNameToPortuguese(name) {
  let value = normalizeBrokenText(name);
  const replacements = [
    ["Carrying Handle", "alça de transporte"],
    ["Self Locking", "automontável"],
    ["Self-Locking", "automontável"],
    ["Snap Lock", "trava de encaixe"],
    ["Ear Hook Lock", "travamento por orelhas"],
    ["Foot-Lock", "trava de fundo"],
    ["Tuck Top", "tampa de encaixe"],
    ["Reverse Friction Tuck", "fechamento por atrito reverso"],
    ["Straight Friction Tuck", "fechamento por atrito reto"],
    ["Friction Tuck", "fechamento por atrito"],
    ["Double Crease Top", "topo com vinco duplo"],
    ["Regular Slotted Container", "Caixa RSC (abas regulares)"],
    ["Half Slotted Container", "Caixa HSC (meia caixa com abas)"],
    ["Overlap Slotted Container", "Caixa OSC (abas sobrepostas)"],
    ["Full Overlap Slotted Container", "Caixa FOL (abas totalmente sobrepostas)"],
    ["Center Special Slotted Container", "Caixa especial com abas centrais"],
    ["Center Special Overlap Slotted Container", "Caixa especial com abas centrais sobrepostas"],
    ["Center Special Full Overlap Slotted Container", "Caixa especial de sobreposição total"],
    ["Regular Container", "Caixa regular"],
    ["Half Container", "Meia caixa"],
    ["Overlap Container", "Caixa sobreposta"],
    ["Full Telescope", "Telescópica total"],
    ["One Piece Folder", "Caixa folder de uma peça"],
    ["Wrap Around Blank", "Caixa envolvente"],
    ["Five Panel Folder", "Caixa folder de cinco painéis"],
    ["Folder Type Tube", "Tubo tipo folder"],
    ["Bliss Style Container", "Caixa tipo Bliss"],
    ["Tray", "Bandeja"],
    ["Container and Cover", "caixa e tampa"],
    ["Container", "Caixa"],
    ["Cover", "tampa"],
    ["Bottom", "fundo"],
    ["Top", "topo"],
    ["Side", "lateral"],
    ["End", "extremidade"],
    ["Wall", "parede"],
    ["Walls", "paredes"],
    ["Hinged Lid", "tampa articulada"],
    ["Locking Ears", "orelhas de travamento"],
    ["Folding Flaps", "abas dobráveis"],
    ["Folding Wall", "parede dobrável"],
    ["Double Wall", "parede dupla"],
    ["Notch Lock Corners", "cantos com trava por encaixe"],
    ["Rigid", "rígida"],
    ["Jointless", "sem emenda"],
    ["Scored Sheet", "chapa vincada"],
    ["Corner Protector", "cantoneira de proteção"],
    ["Corner Brace Pad", "reforço de canto"],
    ["Cushion Pad", "calço amortecedor"],
    ["Clearance Pad", "calço de espaçamento"],
    ["Partition", "colmeia"],
    ["Open Liner", "berço aberto"]
  ];
  replacements.forEach(([from, to]) => {
    value = value.replaceAll(from, to);
  });
  return normalizeBrokenText(value);
}

function toSentenceCase(value) {
  const text = normalizeBrokenText(String(value || "").replace(/-/g, " ").replace(/\s+/g, " ").trim());
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function prettifyModelText(value) {
  let text = translateModelNameToPortuguese(value);
  const replacements = [
    ["caixas do tipo com abas", "Caixas do tipo com abas"],
    ["caixa do tipo com abas", "Caixa do tipo com abas"],
    ["telescope type", "tipo telescópico"],
    ["self locking", "automontável"],
    ["self-locking", "automontável"],
    ["bero", "berço"],
    ["divisria", "divisória"],
    ["clulas", "células"],
    ["sobreposio", "sobreposição"],
    ["telescpica", "telescópica"],
    ["dobrveis", "dobráveis"],
    ["trs", "três"],
    ["clula", "célula"]
  ];
  replacements.forEach(([from, to]) => {
    text = text.replaceAll(from, to);
  });
  return toSentenceCase(text);
}

function getModelDisplayName(model) {
  const preferred = model?.name_pt && model.name_pt !== model.name
    ? model.name_pt
    : translateModelNameToPortuguese(model?.name_pt || model?.name || "");
  return prettifyModelText(preferred);
}

function getModelDescription(model) {
  const description = normalizeBrokenText(model?.description_pt || "");
  if (!description) return "Descrição técnica em atualização.";

  const match = description.match(/^Grupo:\s*(.+?)\.\s*Tipo:\s*(.+?)\.\s*(.+)$/i);
  if (match) {
    const grupo = prettifyModelText(match[1]);
    const tipo = prettifyModelText(match[2]);
    const detalhe = toSentenceCase(match[3]);
    return `${tipo}. Grupo: ${grupo}. ${detalhe}`;
  }

  return toSentenceCase(description);
}

function getModelLabel(model) {
  return `${model.code} - ${getModelDisplayName(model)}`;
}

function getModelLabelByCode(code) {
  const models = filterPortfolioVariants(window.FEFCO_MODELS || []);
  const match = models.find((model) => model.code === code);
  return match ? getModelLabel(match) : code;
}

function getCanonicalModelCode(code) {
  const match = String(code || "").match(/^(\d+)/);
  return match ? match[1] : String(code || "");
}

function filterPortfolioVariants(models) {
  const canonicalMap = new Map();

  models.forEach((model) => {
    const canonical = getCanonicalModelCode(model.code);
    const current = canonicalMap.get(canonical);
    if (!current) {
      canonicalMap.set(canonical, model);
      return;
    }

    if (current.code !== canonical && model.code === canonical) {
      canonicalMap.set(canonical, model);
    }
  });

  return models.filter((model) => canonicalMap.get(getCanonicalModelCode(model.code))?.code === model.code);
}

function normalizeSearchTerm(value) {
  return normalizeBrokenText(String(value || ""))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchTokens(value) {
  return normalizeSearchTerm(value)
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function getModelSearchCorpus(model) {
  const guide = FEFCO_GUIDES[model.code] || {};
  return normalizeSearchTerm([
    model.code,
    guide.title,
    guide.subtitle,
    guide.commercialName,
    guide.plain,
    guide.technical,
    guide.logisticsTip,
    ...(guide.applications || []),
    ...(guide.seoTags || [])
  ].filter(Boolean).join(" "));
}

function getModelInsights(model) {
  const corpus = getModelSearchCorpus(model);
  const code = String(model.code || "");
  const meta = FEFCO_META[code] || {};
  const structure = meta.structure || "caixa";

  const badges = [];
  if (meta.intent?.correios) badges.push("Correios / Sedex");
  if (meta.intent?.pdv) badges.push("PDV");
  if (meta.assembly_mode === "instantanea") badges.push("Montagem instantânea");
  if (meta.green_seal) badges.push("Selo Verde");
  if (meta.residue_zero) badges.push("Resíduo Zero");
  if (FEFCO_GUIDES[code]) badges.push("Com guia útil");

  return { corpus, meta, structure, badges: badges.slice(0, 3) };
}

function modelMatchesPortfolioFilters(model, insights, query) {
  const tokens = getSearchTokens(query);
  if (tokens.length && !tokens.every((token) => insights.corpus.includes(token))) return false;
  if (state.portfolioFilters.intent && !insights.meta.intent?.[state.portfolioFilters.intent]) return false;
  if (state.portfolioFilters.structure && insights.structure !== state.portfolioFilters.structure) return false;
  if (state.portfolioFilters.assembly && insights.meta.assembly_mode !== state.portfolioFilters.assembly) return false;
  if (state.portfolioFilters.sustainability === "green" && !insights.meta.green_seal) return false;
  if (state.portfolioFilters.sustainability === "residue_zero" && !insights.meta.residue_zero) return false;
  if (state.portfolioFilters.guided && !FEFCO_GUIDES[model.code]) return false;
  if (state.portfolioFilters.zeroTape && !insights.meta.zero_tape) return false;
  if (state.portfolioFilters.zeroGlue && !insights.meta.zero_glue) return false;
  if (Number(state.portfolioFilters.bct || 0) > 0 && Number(insights.meta.bct_rating || 0) < Number(state.portfolioFilters.bct || 0)) return false;
  return true;
}

function getSearchRelevance(model, insights, query) {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return 0;

  const tokens = getSearchTokens(normalizedQuery);
  const label = normalizeSearchTerm(`${model.code} ${FEFCO_GUIDES[model.code]?.title || ""} ${FEFCO_GUIDES[model.code]?.commercialName || ""}`);
  let score = 0;

  if (String(model.code) === normalizedQuery) score += 100;
  if (String(model.code).startsWith(normalizedQuery)) score += 40;
  if (label.includes(normalizedQuery)) score += 20;
  score += tokens.reduce((total, token) => total + (insights.corpus.includes(token) ? 4 : 0), 0);
  if (FEFCO_GUIDES[model.code]) score += 1;

  return score;
}

function resetPortfolioFilters() {
  state.portfolioFilters = {
    intent: "",
    structure: "",
    assembly: "",
    sustainability: "",
    guided: false,
    zeroTape: false,
    zeroGlue: false,
    bct: 0
  };

  const intentSelect = document.getElementById("portfolio-intent-filter");
  const structureSelect = document.getElementById("portfolio-structure-filter");
  const assemblySelect = document.getElementById("portfolio-assembly-filter");
  const sustainabilitySelect = document.getElementById("portfolio-sustainability-filter");
  const guideCheck = document.getElementById("portfolio-guide-filter");
  const zeroTapeCheck = document.getElementById("portfolio-zero-tape-filter");
  const zeroGlueCheck = document.getElementById("portfolio-zero-glue-filter");
  const bctInput = document.getElementById("portfolio-bct-filter");
  const bctValue = document.getElementById("portfolio-bct-value");
  if (intentSelect) intentSelect.value = "";
  if (structureSelect) structureSelect.value = "";
  if (assemblySelect) assemblySelect.value = "";
  if (sustainabilitySelect) sustainabilitySelect.value = "";
  if (guideCheck) guideCheck.checked = false;
  if (zeroTapeCheck) zeroTapeCheck.checked = false;
  if (zeroGlueCheck) zeroGlueCheck.checked = false;
  if (bctInput) bctInput.value = "0";
  if (bctValue) bctValue.textContent = "Todos";
}

function renderPortfolio(models) {
  const grid = document.getElementById("fefco-grid");
  const searchInput = document.getElementById("fefco-search");
  const intentFilter = document.getElementById("portfolio-intent-filter");
  const structureFilter = document.getElementById("portfolio-structure-filter");
  const assemblyFilter = document.getElementById("portfolio-assembly-filter");
  const sustainabilityFilter = document.getElementById("portfolio-sustainability-filter");
  const guideFilter = document.getElementById("portfolio-guide-filter");
  const zeroTapeFilter = document.getElementById("portfolio-zero-tape-filter");
  const zeroGlueFilter = document.getElementById("portfolio-zero-glue-filter");
  const bctFilter = document.getElementById("portfolio-bct-filter");
  const bctValue = document.getElementById("portfolio-bct-value");
  const clearFiltersButton = document.getElementById("portfolio-clear-filters");
  const resultsSummary = document.getElementById("portfolio-results-summary");
  if (!grid || !Array.isArray(models)) return;
  const canonicalModels = filterPortfolioVariants(models);
  const prioritizeGuidedModels = (items, query) => {
    const hasAdvancedFilter = Boolean(
      query ||
      state.portfolioFilters.intent ||
      state.portfolioFilters.structure ||
      state.portfolioFilters.assembly ||
      state.portfolioFilters.sustainability ||
      state.portfolioFilters.guided ||
      state.portfolioFilters.zeroTape ||
      state.portfolioFilters.zeroGlue ||
      Number(state.portfolioFilters.bct || 0) > 0
    );
    if (hasAdvancedFilter) return items;
    return [...items].sort((left, right) => {
      if (query) {
        const leftInsights = getModelInsights(left);
        const rightInsights = getModelInsights(right);
        const relevanceDelta = getSearchRelevance(right, rightInsights, query) - getSearchRelevance(left, leftInsights, query);
        if (relevanceDelta !== 0) return relevanceDelta;
      }
      const leftHasGuide = Number(Boolean(FEFCO_GUIDES[left.code]));
      const rightHasGuide = Number(Boolean(FEFCO_GUIDES[right.code]));
      if (leftHasGuide !== rightHasGuide) return rightHasGuide - leftHasGuide;
      return left.code.localeCompare(right.code, "pt-BR", { numeric: true });
    });
  };

  const draw = (term = "") => {
    const query = normalizeSearchTerm(term);
    const filtered = canonicalModels.filter((model) => {
      const insights = getModelInsights(model);
      return modelMatchesPortfolioFilters(model, insights, query);
    });
    const prioritized = prioritizeGuidedModels(filtered, query);
    const visibleModels = state.showAllModels ? prioritized : prioritized.slice(0, 8);

    if (resultsSummary) {
      const summaryBits = [];
      if (state.portfolioFilters.intent) summaryBits.push("intenção filtrada");
      if (state.portfolioFilters.structure) summaryBits.push("estrutura filtrada");
      if (state.portfolioFilters.assembly) summaryBits.push("montagem filtrada");
      if (state.portfolioFilters.sustainability) summaryBits.push("sustentabilidade filtrada");
      if (state.portfolioFilters.guided) summaryBits.push("somente com guia útil");
      if (state.portfolioFilters.zeroTape) summaryBits.push("zero fita");
      if (state.portfolioFilters.zeroGlue) summaryBits.push("zero cola");
      if (Number(state.portfolioFilters.bct || 0) > 0) summaryBits.push(`BCT ${state.portfolioFilters.bct}+`);
      resultsSummary.textContent = prioritized.length
        ? `${prioritized.length} modelo(s) encontrado(s)${summaryBits.length ? ` com ${summaryBits.join(", ")}` : ""}.`
        : "Nenhum modelo encontrado com essa combinação. Tente abrir um filtro ou buscar por outro termo.";
    }

    if (!visibleModels.length) {
      grid.innerHTML = `
        <article class="portfolio-empty-state">
          <h3>Nenhum modelo correspondeu a essa busca.</h3>
          <p>Tente buscar pelo produto, pelo canal de venda ou por uma necessidade técnica mais ampla, como "garrafas", "frágil", "display" ou "exportação".</p>
        </article>
      `;
    } else {
      grid.innerHTML = visibleModels
        .map((model) => {
          const insights = getModelInsights(model);
          const modelTags = insights.badges.map((tag) => `<span class="model-tag">${tag}</span>`).join("");
        const label = getModelLabel(model);
        const description = getModelDescription(model);
        return `
          <article class="model-card" data-model-label="${label.replace(/"/g, "&quot;")}" data-model-code="${model.code}" title="${description.replace(/"/g, "&quot;")}">
            <span class="model-code">${model.code}</span>
            <div class="model-preview" tabindex="0" role="button" aria-label="Ver descrição do modelo ${label}">
              <img class="model-preview-svg" src="${resolveModelImage(model.image)}" alt="${label}">
              <img class="model-preview-png" src="${resolveModelImage(model.preview_png || getPreviewPngPath(model.image))}" alt="${label}">
            </div>
            <h3>${getModelDisplayName(model)}</h3>
            <p>Código FEFCO ${model.code}</p>
            <p class="model-meta">${prettifyModelText(model.family_pt || "Família FEFCO")}${model.kind_pt ? ` • ${prettifyModelText(model.kind_pt)}` : ""}</p>
            ${modelTags ? `<div class="model-tags">${modelTags}</div>` : ""}
            <div class="model-description">
              <strong>Descrição do modelo</strong>
              <span>${description}</span>
            </div>
            <div class="model-actions">
              <button class="btn btn-secondary" type="button" data-model-select="${label.replace(/"/g, "&quot;")}">Selecionar modelo</button>
              ${FEFCO_GUIDES[model.code] ? `<button class="btn btn-tertiary" type="button" data-model-guide="${model.code}">Ver informações úteis</button>` : ""}
            </div>
          </article>
        `;
      })
      .join("");
    }

    grid.querySelectorAll("[data-model-select]").forEach((button) => {
      button.addEventListener("click", () => {
        const label = button.getAttribute("data-model-select");
        toggleModelSelection(label);
        trackEvent("portfolio_select", { model: label });
      });
    });

    grid.querySelectorAll("[data-model-guide]").forEach((button) => {
      button.addEventListener("click", () => {
        const code = button.getAttribute("data-model-guide");
        openGuideModal(code);
        trackEvent("portfolio_guide_open", { code });
      });
    });

    document.querySelectorAll(".model-card").forEach((card) => {
      const current = card.getAttribute("data-model-label");
      if (state.selectedModels.includes(current)) card.classList.add("is-selected");
    });

    grid.querySelectorAll(".model-preview").forEach((preview) => {
      const toggleCard = () => preview.closest(".model-card")?.classList.toggle("is-open");
      preview.addEventListener("click", toggleCard);
      preview.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleCard();
        }
      });
    });

    if (portfolioToggle) {
      const hasMore = prioritized.length > 8;
      portfolioToggle.classList.toggle("is-hidden", !hasMore);
      portfolioToggle.textContent = state.showAllModels ? "Ver menos modelos" : `Ver mais modelos (${prioritized.length - 8})`;
    }
  };

  if (!grid.dataset.filtersBound) {
    grid.dataset.filtersBound = "true";
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.showAllModels = false;
        draw(event.target.value);
      });
    }
    document.querySelectorAll("[data-search-example]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.getAttribute("data-search-example") || "";
        if (searchInput) searchInput.value = value;
        state.showAllModels = false;
        draw(value);
      });
    });
    if (intentFilter) {
      intentFilter.addEventListener("change", (event) => {
        state.portfolioFilters.intent = event.target.value;
        state.showAllModels = false;
        draw(searchInput?.value || "");
      });
    }
    if (structureFilter) {
      structureFilter.addEventListener("change", (event) => {
        state.portfolioFilters.structure = event.target.value;
        state.showAllModels = false;
        draw(searchInput?.value || "");
      });
    }
    if (guideFilter) {
      guideFilter.addEventListener("change", (event) => {
        state.portfolioFilters.guided = event.target.checked;
        state.showAllModels = false;
        draw(searchInput?.value || "");
      });
    }
    if (assemblyFilter) {
      assemblyFilter.addEventListener("change", (event) => {
        state.portfolioFilters.assembly = event.target.value;
        state.showAllModels = false;
        draw(searchInput?.value || "");
      });
    }
    if (sustainabilityFilter) {
      sustainabilityFilter.addEventListener("change", (event) => {
        state.portfolioFilters.sustainability = event.target.value;
        state.showAllModels = false;
        draw(searchInput?.value || "");
      });
    }
    if (zeroTapeFilter) {
      zeroTapeFilter.addEventListener("change", (event) => {
        state.portfolioFilters.zeroTape = event.target.checked;
        state.showAllModels = false;
        draw(searchInput?.value || "");
      });
    }
    if (zeroGlueFilter) {
      zeroGlueFilter.addEventListener("change", (event) => {
        state.portfolioFilters.zeroGlue = event.target.checked;
        state.showAllModels = false;
        draw(searchInput?.value || "");
      });
    }
    if (bctFilter) {
      bctFilter.addEventListener("input", (event) => {
        state.portfolioFilters.bct = Number(event.target.value || 0);
        if (bctValue) bctValue.textContent = state.portfolioFilters.bct > 0 ? `${state.portfolioFilters.bct}+` : "Todos";
        state.showAllModels = false;
        draw(searchInput?.value || "");
      });
    }
    if (clearFiltersButton) {
      clearFiltersButton.addEventListener("click", () => {
        resetPortfolioFilters();
        if (searchInput) searchInput.value = "";
        state.showAllModels = false;
        draw("");
      });
    }
    if (portfolioToggle) {
      portfolioToggle.addEventListener("click", () => {
        state.showAllModels = !state.showAllModels;
        draw(searchInput?.value || "");
      });
    }
  }

  draw();
}

function buildRecommendation(data) {
  let formato = getModelLabelByCode("0201");
  let parede = "Parede simples";
  let onda = "B";
  let ect = "4 a 5 kN/m";
  let bct = "Baixo a moderado";
  let papel = "Kraft";
  let gramatura = "Liners 125 a 175 g/m² | Miolo 90 a 125 g/m²";
  let Confiança = "Média";
  const motivos = [];
  const alertas = [];

  if (data.uso === "ecommerce") {
    formato = getModelLabelByCode("0427");
    motivos.push("expedição unitária pede formato postal mais previsível");
  }

  if (data.uso === "ecommerce" && data.peso === "leve" && data.impressao === "premium") {
    formato = getModelLabelByCode("0427");
    parede = "Parede simples";
    onda = "E";
    ect = "3 a 5 kN/m";
    bct = "Baixo";
    papel = "Branco";
    gramatura = "Liners 125 a 150 g/m² | Miolo 90 a 105 g/m²";
    Confiança = "Alta";
    motivos.push("prioridade para apresentação visual e envio unitário");
  }

  if (data.peso === "medio" || data.fragilidade === "alta") {
    onda = data.impressao === "premium" ? "E ou B" : "B ou C";
    ect = "5 a 7 kN/m";
    bct = "Moderado";
    gramatura = data.impressao === "premium"
      ? "Liners 150 a 175 g/m² | Miolo 105 a 125 g/m²"
      : "Liners 150 a 200 g/m² | Miolo 105 a 150 g/m²";
    Confiança = "Alta";
    motivos.push("produto com maior sensibilidade ou peso intermediário");
  }

  if (data.transporte === "paletizado" || data.empilhamento === "alto" || data.peso === "alto") {
    formato = getModelLabelByCode("0201");
    parede = "Parede dupla";
    onda = "BC";
    ect = "7 a 10 kN/m";
    bct = "Alto";
    papel = "Kraft";
    gramatura = "Liners 175 a 250 g/m² | Combinação para parede dupla";
    Confiança = "Alta";
    motivos.push("necessidade maior de empilhamento e robustez");
  }

  if (data.transporte === "exportacao" || data.peso === "pesado") {
    formato = "0201 reforcado ou projeto especial";
    parede = "Parede dupla ou tripla";
    onda = "BC";
    ect = "10 a 14+ kN/m";
    bct = "Muito alto";
    papel = "Kraft";
    gramatura = "Liners 200 a 250+ g/m² | Combinação reforçada";
    Confiança = "Média/Alta";
    motivos.push("cenário mais severo de transporte ou carga elevada");
    alertas.push("casos de exportação ou peso muito alto pedem validação técnica e, idealmente, teste físico");
  }

  if (data.uso === "alimento") {
    papel = "Branco ou Kraft com validação de compliance";
    motivos.push("avaliar conformidade para contato com alimento");
    if (data.contato_alimento === "sim") {
      alertas.push("contato direto com alimento exige validação do material conforme compliance sanitário do fornecedor");
    }
  }

  if (data.impressao === "simples") {
    motivos.push("impressão simples permite equilíbrio entre custo e desempenho");
  }

  if (data.impressao === "premium" && formato.startsWith("0201")) {
    motivos.push("se a arte for prioridade, avaliar micro-onda ou solução especial");
  }

  if (data.armazenagem === "longa") {
    bct = bct === "Baixo" ? "Moderado" : bct === "Moderado" ? "Moderado a alto" : bct;
    ect = ect === "3 a 5 kN/m" ? "4 a 5 kN/m" : ect;
    motivos.push("armazenagem longa exige mais reserva de empilhamento");
  }

  if (data.umidade === "umida") {
    papel = papel === "Branco" ? "Branco com validação de umidade" : "Kraft";
    motivos.push("umidade pede margem maior de segurança estrutural");
    alertas.push("em ambiente úmido, a resistência real tende a cair e a recomendação deve ser confirmada comercialmente");
  }

  if (data.umidade === "severa") {
    parede = parede === "Parede simples" ? "Parede dupla" : parede;
    onda = parede === "Parede dupla" ? "BC" : onda;
    ect = ect === "3 a 5 kN/m" ? "5 a 7 kN/m" : ect === "5 a 7 kN/m" ? "7 a 10 kN/m" : ect;
    bct = bct === "Baixo" ? "Moderado" : bct === "Moderado" ? "Alto" : bct;
    papel = "Kraft com barreira ou validação para umidade";
    motivos.push("umidade severa ou câmara fria exigem especificação mais conservadora");
    alertas.push("ambiente muito úmido pede teste ou histórico validado de campo");
  }

  if (data.prioridade === "custo") {
    motivos.push("prioridade de custo reduz excesso de material quando o risco logístico permite");
  }

  if (data.prioridade === "protecao") {
    bct = bct === "Baixo" ? "Moderado" : bct === "Moderado" ? "Alto" : "Muito alto";
    ect = ect === "3 a 5 kN/m" ? "5 a 7 kN/m" : ect === "5 a 7 kN/m" ? "7 a 10 kN/m" : ect;
    parede = parede === "Parede simples" && (data.peso === "alto" || data.fragilidade === "alta" || data.transporte === "exportacao")
      ? "Parede dupla"
      : parede;
    motivos.push("prioridade declarada de proteção aumenta a reserva estrutural");
  }

  return {
    formato,
    parede,
    onda,
    ect,
    bct,
    papel,
    gramatura,
    Confiança,
    resumo: motivos.join("; "),
    alertas
  };
}

function applyRecommendationToForm(recommendation) {
  const form = document.querySelector(".lead-form-full");
  if (!form) return;

  const tipo = form.querySelector('[name="tipo_embalagem"]');

  if (tipo && !tipo.value) tipo.value = "Padrão FEFCO";

  if (!state.selectedModels.length && recommendation.formato.includes("0201")) {
    toggleModelSelection(getModelLabelByCode("0201"));
  }

  modelSpecsContainer?.querySelectorAll(".model-spec-card").forEach((card) => {
    const onda = card.querySelector('[data-spec="onda"]');
    const ect = card.querySelector('[data-spec="coluna_minima"]');
    const papel = card.querySelector('[data-spec="tipo_papel"]');
    const gramatura = card.querySelector('[data-spec="gramatura"]');
    const normalizedPaper = recommendation.papel.includes("Branco")
      ? "Branco"
      : recommendation.papel.includes("Reciclado")
        ? "Reciclado"
        : recommendation.papel.includes("Kraft")
          ? "Kraft"
          : "";
    const normalizedWave = recommendation.onda.includes("BC")
      ? "BC"
      : recommendation.onda.includes("EB")
        ? "EB"
        : recommendation.onda.includes("E")
          ? "E"
          : recommendation.onda.includes("C")
            ? "C"
            : recommendation.onda.includes("B")
              ? "B"
              : "";
    if (onda && [...onda.options].some((option) => option.value === normalizedWave)) onda.value = normalizedWave;
    if (ect) ect.value = recommendation.ect;
    if (papel && [...papel.options].some((option) => option.value === normalizedPaper)) papel.value = normalizedPaper;
    if (gramatura) gramatura.value = recommendation.gramatura;
  });

  serializeModelSpecs();
}

function renderRecommendation(recommendation) {
  state.wizardRecommendation = `${recommendation.formato} | ${recommendation.parede} | Onda ${recommendation.onda} | ECT ${recommendation.ect} | BCT ${recommendation.bct} | Papel ${recommendation.papel} | Gramatura ${recommendation.gramatura} | Confiança ${recommendation.Confiança} | ${recommendation.resumo}`;
  if (wizardRecommendationField) wizardRecommendationField.value = state.wizardRecommendation;
  if (!wizardResult) return;

  const alerts = (recommendation.alertas || []).length
    ? `<div class="recommendation-alerts">${recommendation.alertas.map((item) => `<p>${item}</p>`).join("")}</div>`
    : "";

  wizardResult.innerHTML = `
    <span class="section-kicker">Resultado guiado</span>
    <h3>Recomendação inicial para o seu cenário</h3>
    <div class="confidence-badge">Confiança ${recommendation.Confiança}</div>
    <div class="recommendation-grid">
      <div class="recommendation-item"><strong>Formato base</strong><span>${recommendation.formato}</span></div>
      <div class="recommendation-item"><strong>Estrutura</strong><span>${recommendation.parede}</span></div>
      <div class="recommendation-item"><strong>Onda sugerida</strong><span>${recommendation.onda}</span></div>
      <div class="recommendation-item"><strong>Faixa de ECT</strong><span>${recommendation.ect}</span></div>
      <div class="recommendation-item"><strong>BCT orientativo</strong><span>${recommendation.bct}</span></div>
      <div class="recommendation-item"><strong>Papel sugerido</strong><span>${recommendation.papel}</span></div>
      <div class="recommendation-item"><strong>Gramatura inicial</strong><span>${recommendation.gramatura}</span></div>
    </div>
    <p>${normalizeBrokenText(recommendation.resumo || "Recomendação baseada em uso, risco logístico, empilhamento e nível de impressão.")}</p>
    ${alerts}
    <button class="btn btn-primary" type="button" id="apply-recommendation">Aplicar no formulário de cotação</button>
  `;

  const action = document.getElementById("apply-recommendation");
  if (action) {
    action.addEventListener("click", () => {
      applyRecommendationToForm(recommendation);
      document.getElementById("orcamento")?.scrollIntoView({ behavior: "smooth" });
      trackEvent("wizard_apply_recommendation", { formato: recommendation.formato, onda: recommendation.onda });
    });
  }
}

function attachWizard() {
  const wizard = document.getElementById("guided-wizard");
  if (!wizard) return;

  wizard.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formDataToObject(wizard);
    const recommendation = buildRecommendation(data);
    renderRecommendation(recommendation);
    trackEvent("wizard_submit", recommendation);
  });
}

function attachFormHandlers() {
  document.querySelectorAll("form.lead-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const feedback = form.querySelector(".form-feedback");
      const submitButton = form.querySelector('button[type="submit"]');
      const formType = form.getAttribute("data-form-type") || "unknown";
      serializeModelSpecs();
      serializeDirectSpecs();
      const data = formDataToObject(form);

      if (!data.nome || !data.empresa || !data.telefone) {
      if (feedback) feedback.textContent = "Preencha nome, empresa e telefone para continuar.";
        return;
      }

      const cnpj = cnpjDigits(data.cnpj || "");
      if (cnpj.length !== 14) {
        if (feedback) feedback.textContent = "Informe o CNPJ da empresa para prosseguir com o orçamento.";
        return;
      }

      const phoneDigits = formatPhone(data.telefone);
      if (phoneDigits.length < 10) {
        if (feedback) feedback.textContent = "Informe um telefone válido.";
        return;
      }

      if (submitButton) submitButton.disabled = true;
      if (feedback) feedback.textContent = "Preparando seu pedido de orçamento...";

      const enrichedData = enrichLeadData(data);
      const message = buildLeadMessage(enrichedData);
      const whatsAppLink = runtimeConfig.whatsappNumber ? `https://wa.me/${runtimeConfig.whatsappNumber}?text=${encodeURIComponent(message)}` : "";

      try {
        const endpointSubmitted = await submitToEndpoint(enrichedData);
        persistLead(enrichedData);
        trackEvent("lead_submit", {
          form_type: formType,
          tipo_embalagem: enrichedData.tipo_embalagem || "",
          modelos_padrao: enrichedData.modelos_padrao || "",
          device_type: enrichedData.device_type || "",
          page_path: enrichedData.page_path || ""
        });
        if (typeof window.gtag === "function") {
          window.gtag("event", "generate_lead", {
            currency: "BRL",
            page_location: enrichedData.page_url,
            lead_type: enrichedData.tipo_embalagem || formType
          });
        }
        if (typeof window.fbq === "function") {
          window.fbq("track", "Lead", {
            content_name: enrichedData.tipo_embalagem || "Orcamento",
            status: "submitted"
          });
        }
        if (feedback) {
          feedback.textContent = endpointSubmitted
            ? "Pedido enviado com sucesso. Nossa equipe fará o retorno com base nos dados recebidos."
            : "Pedido preparado com sucesso. Seus dados ficaram registrados com segurança nesta sessão e o próximo passo pode ser feito pelo WhatsApp.";
        }
        form.reset();
        updateSelectedModelsUi();
        renderModelSpecs();
        applyUtmToForms();
        if (wizardRecommendationField) wizardRecommendationField.value = state.wizardRecommendation;
        if (whatsAppLink) { openSuccessModal(whatsAppLink); }
      } catch (error) {
        console.error(error);
        trackEvent("lead_submit_fallback", { form_type: formType });
        if (feedback) feedback.textContent = "Seu pedido foi registrado. Como o WhatsApp ainda está em implantação, o retorno acontecerá pelos dados informados.";
        if (whatsAppLink) { openSuccessModal(whatsAppLink); }
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  });
}

modalCloseButtons.forEach((button) => button.addEventListener("click", closeSuccessModal));
if (modal) modal.addEventListener("click", (event) => { if (event.target === modal) closeSuccessModal(); });

safeRun("publishDiagnostics", publishDiagnostics);
safeRun("hydrateTrackingIds", hydrateTrackingIds);
safeRun("trackPageContext", trackPageContext);
safeRun("applyUtmToForms", applyUtmToForms);
safeRun("attachClickTracking", attachClickTracking);
safeRun("normalizePageContent", normalizePageContent);
safeRun("renderPortfolio", () => renderPortfolio(window.FEFCO_MODELS || []));
safeRun("updateSelectedModelsUi", updateSelectedModelsUi);
safeRun("renderModelSpecs", renderModelSpecs);
safeRun("attachWizard", attachWizard);
safeRun("attachDirectSpecsControls", attachDirectSpecsControls);
safeRun("attachCnpjMasks", attachCnpjMasks);
safeRun("attachFormHandlers", attachFormHandlers);
safeRun("renderControlPanel", renderControlPanel);

