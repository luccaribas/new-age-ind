(() => {
  const guides = window.FEFCO_GUIDES || {};
  const models = window.FEFCO_MODELS || [];

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function getGuideText(guide) {
    return normalize([
      guide?.title,
      guide?.subtitle,
      guide?.commercialName,
      guide?.plain,
      guide?.technical,
      guide?.logisticsTip,
      ...(guide?.applications || []),
      ...(guide?.seoTags || [])
    ].filter(Boolean).join(" "));
  }

  function getScore(guide, pattern) {
    const match = (guide?.scores || []).find((item) => pattern.test(normalize(item.criterion)));
    return Number(match?.score || 0);
  }

  function hasAny(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
  }

  function getIntent(text, structure) {
    return {
      correios: hasAny(text, [/\bcorreios\b/, /\bsedex\b/, /\bpostal\b/, /\bmailer\b/, /\be-commerce\b/, /\becommerce\b/]),
      exportacao: hasAny(text, [/\bexportacao\b/, /\bexporta\b/, /\bmarit/i, /\bpesad/i, /\bheavy/i, /\bpalet/i, /\bempilh/i]),
      pdv: hasAny(text, [/\bpdv\b/, /\bvarejo\b/, /\bdisplay\b/, /\bgondola\b/, /\bvitrine\b/, /\bcheckout\b/, /\bcheck-out\b/]) || structure === "bandeja",
      interna: structure === "acessorio" || hasAny(text, [/\bacessorio interno\b/, /\bdivis/i, /\bcolmeia\b/, /\bberco\b/, /\bcalco\b/, /\bcantoneira\b/, /\bprotetor interno\b/])
    };
  }

  function getAssemblyMode(text) {
    if (hasAny(text, [/\binstantan/i, /\bmontagem rapida\b/, /\bcrash-lock\b/, /\bcrash lock\b/, /\bsnap-lock\b/, /\bsnap lock\b/, /\bfundo automatic/i])) {
      return "instantanea";
    }
    if (hasAny(text, [/\bautomatica\b/, /\bautomatica\b/, /\barmadora\b/, /\bhot-melt\b/, /\bhot melt\b/, /\bfolder-gluer\b/, /\bfolder gluer\b/])) {
      return "automatica";
    }
    return "manual";
  }

  function getStructure(text) {
    if (hasAny(text, [/\bacessorio\b/, /\bdivis/i, /\bcolmeia\b/, /\bberco\b/, /\bcalco\b/, /\bcantoneira\b/, /\bliner\b/])) return "acessorio";
    if (hasAny(text, [/\bbandeja\b/, /\bdisplay\b/, /\btabuleiro\b/, /\btray\b/, /\bpdv\b/])) return "bandeja";
    if (hasAny(text, [/\bpasta\b/, /\benvoltorio\b/, /\bluva\b/, /\bsleeve\b/, /\bfolder\b/, /\bgaveta\b/, /\bshell\b/])) return "envoltorio";
    if (hasAny(text, [/\btelescop/i, /\bbliss\b/, /\boctabin\b/, /\boctogonal\b/, /\boitavad/i, /\bespecial\b/, /\bindustrial\b/])) return "especial";
    return "caixa";
  }

  function getZeroTape(text) {
    return hasAny(text, [/\bsem fita\b/, /\bdispensa fita\b/, /\bzero fita\b/]);
  }

  function getZeroGlue(text) {
    return hasAny(text, [/\bsem cola\b/, /\bdispensa cola\b/, /\bzero cola\b/, /\blivre de adesivos\b/, /\bsem adesivos\b/]);
  }

  function getGreenSeal(guide) {
    return getScore(guide, /recicl|sustent/) >= 5;
  }

  function getResidueZero(text, guide) {
    const economy = getScore(guide, /econom/);
    const recycle = getScore(guide, /recicl|sustent/);
    return hasAny(text, [/\bdesperdicio zero\b/, /\bresiduo zero\b/, /\bresiduo minimo\b/, /\brefugo de corte minimo\b/, /\bdesperdicio minimo\b/]) ||
      (economy >= 5 && recycle >= 5 && hasAny(text, [/\bmonomaterial\b/, /\b100% recicl/i, /\b100% celul/i]));
  }

  function getBctRating(guide) {
    const score = getScore(guide, /resist|empilh|compress/);
    return score || 0;
  }

  const meta = {};

  models.forEach((model) => {
    const code = String(model.code || "");
    const guide = guides[code];
    const text = getGuideText(guide);
    const structure = getStructure(text);

    meta[code] = {
      code,
      bct_rating: getBctRating(guide),
      intent: getIntent(text, structure),
      zero_tape: getZeroTape(text),
      zero_glue: getZeroGlue(text),
      assembly_mode: getAssemblyMode(text),
      structure,
      green_seal: getGreenSeal(guide),
      residue_zero: getResidueZero(text, guide)
    };
  });

  window.FEFCO_META = meta;
})();
