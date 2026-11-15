const FALLBACK = {
  LOC_SQ_CHOICE_TITLE: "Quarter specialization",
  LOC_SQ_CHOICE_FOUNDATION: "This building becomes the foundation. Its archetype is the yield the second building will amplify.",
  LOC_SQ_CHOICE_CATALYST: "This building becomes the catalyst. Its archetype decides how the foundation is amplified.",
  LOC_SQ_ARCH_SCIENCE: "Scientific",
  LOC_SQ_ARCH_CULTURE: "Cultural",
  LOC_SQ_ARCH_GOLD: "Economic",
  LOC_SQ_ARCH_PRODUCTION: "Production",
  LOC_SQ_ARCH_FOOD: "Food",
  LOC_SQ_ARCH_HAPPINESS: "Happiness",
  LOC_SQ_ARCH_MILITARY: "Military",
  LOC_SQ_ARCH_DIPLOMACY: "Diplomatic",
  LOC_SQ_EFFECT_FOUNDATION: "The catalyst adds this yield.",
  LOC_SQ_EFFECT_FOUNDATION_MILITARY: "Each catalyst step is +5% Production toward military units in this city.",
  LOC_SQ_EFFECT_SCIENCE: "+1 of the foundation yield per Technology Mastery this Age.",
  LOC_SQ_EFFECT_CULTURE: "+1 of the foundation yield per Civic Mastery this Age.",
  LOC_SQ_EFFECT_GOLD: "+1 of the foundation yield per Resource assigned to this city.",
  LOC_SQ_EFFECT_FOOD: "+1 of the foundation yield per Farm or Fishing Boat worked by this city.",
  LOC_SQ_EFFECT_HAPPINESS: "+1 of the foundation yield per Celebration this Age.",
  LOC_SQ_EFFECT_DIPLOMACY: "+1 of the foundation yield to each connected Town, plus +1 per Specialist on this quarter. Towns do not stack this bonus.",
  LOC_SQ_EFFECT_AGELESS: "As the second building, it makes the foundation Ageless. The game cannot mark one building Ageless, so this bonus is not paid out yet.",
  LOC_SQ_DETAILS_SECOND: "As the second building of the quarter, it does not keep its adjacency bonuses. It instead grants:",
  LOC_SQ_NO_ADJACENCY: "The second building does not receive adjacency bonuses.",
  LOC_SQ_TOOLTIP_SPEC: "Quarter specialization:",
  LOC_SQ_WAREHOUSE_FOOD: "Food warehouse: +1 of the foundation yield for each Farm or Fishing Boat worked by this city.",
  LOC_SQ_WAREHOUSE_PRODUCTION: "Production warehouse: the foundation becomes Ageless and keeps its yields into the next Age. The game cannot flag a single building as Ageless, so this is not applied yet."
};

const FALLBACK_FR = {
  LOC_SQ_CHOICE_TITLE: "Spécialisation du quartier",
  LOC_SQ_CHOICE_FOUNDATION: "Ce bâtiment devient la fondation. Son archétype est le rendement que le second bâtiment renforcera.",
  LOC_SQ_CHOICE_CATALYST: "Ce bâtiment devient le catalyseur. Son archétype décide comment la fondation est renforcée.",
  LOC_SQ_ARCH_SCIENCE: "Scientifique",
  LOC_SQ_ARCH_CULTURE: "Culturel",
  LOC_SQ_ARCH_GOLD: "Économique",
  LOC_SQ_ARCH_PRODUCTION: "Production",
  LOC_SQ_ARCH_FOOD: "Nourriture",
  LOC_SQ_ARCH_HAPPINESS: "Bonheur",
  LOC_SQ_ARCH_MILITARY: "Militaire",
  LOC_SQ_ARCH_DIPLOMACY: "Diplomatique",
  LOC_SQ_EFFECT_FOUNDATION: "Le catalyseur ajoute ce rendement.",
  LOC_SQ_EFFECT_FOUNDATION_MILITARY: "Chaque palier du catalyseur vaut +5 % de production vers les unités militaires de cette ville.",
  LOC_SQ_EFFECT_SCIENCE: "+1 du rendement de la fondation par maîtrise technologique de cet âge.",
  LOC_SQ_EFFECT_CULTURE: "+1 du rendement de la fondation par maîtrise civique de cet âge.",
  LOC_SQ_EFFECT_GOLD: "+1 du rendement de la fondation par ressource assignée à cette ville.",
  LOC_SQ_EFFECT_FOOD: "+1 du rendement de la fondation par ferme ou bateau de pêche exploité par cette ville.",
  LOC_SQ_EFFECT_HAPPINESS: "+1 du rendement de la fondation par célébration de cet âge.",
  LOC_SQ_EFFECT_DIPLOMACY: "+1 du rendement de la fondation dans chaque ville connectée, plus +1 par spécialiste de ce quartier. Les villes ne cumulent pas ce bonus.",
  LOC_SQ_EFFECT_AGELESS: "En second bâtiment, il rend la fondation Ageless. Le jeu ne peut pas marquer un seul bâtiment Ageless, donc ce bonus n'est pas encore versé.",
  LOC_SQ_DETAILS_SECOND: "En second bâtiment du quartier, il ne garde pas ses bonus de proximité. Il apporte à la place :",
  LOC_SQ_NO_ADJACENCY: "Le second bâtiment ne reçoit pas les bonus de proximité.",
  LOC_SQ_TOOLTIP_SPEC: "Spécialisation du quartier :",
  LOC_SQ_WAREHOUSE_FOOD: "Entrepôt de nourriture : +1 du rendement de la fondation par ferme ou bateau de pêche exploité par la ville.",
  LOC_SQ_WAREHOUSE_PRODUCTION: "Entrepôt de production : la fondation devient Ageless et conserve ses rendements à l'âge suivant. Le jeu ne peut pas marquer un seul bâtiment Ageless, donc ce bonus n'est pas encore versé."
};

console.log("SQ ui file parsed");

let panel = null;
let titleNode = null;
let bodyNode = null;
let choicesNode = null;
let current = null;
let useFrench = false;

function detectFrench() {
  try {
    const library = Locale.compose("LOC_BUILDING_LIBRARY_NAME");
    if (library && library !== "LOC_BUILDING_LIBRARY_NAME" && /biblioth/i.test(library)) return true;
  } catch (error) {
    return false;
  }
  return false;
}

function loc(tag) {
  try {
    const text = Locale.compose(tag);
    if (text && text !== tag) return text;
  } catch (error) {
    // Fall through to the embedded strings.
  }
  const table = useFrench ? FALLBACK_FR : FALLBACK;
  return table[tag] || FALLBACK[tag] || tag;
}

function buildingName(building) {
  try {
    const info = GameInfo.Constructibles.lookup(building);
    if (info && info.Name) {
      const name = Locale.compose(info.Name);
      if (name && name !== info.Name) return name;
    }
  } catch (error) {
    return building;
  }
  return building;
}

function effectTag(slot, archetype) {
  if (slot === 1) return archetype === "MILITARY" ? "LOC_SQ_EFFECT_FOUNDATION_MILITARY" : "LOC_SQ_EFFECT_FOUNDATION";
  if (archetype === "PRODUCTION" || archetype === "MILITARY") return "LOC_SQ_EFFECT_AGELESS";
  return "LOC_SQ_EFFECT_" + archetype;
}

function ensurePanel() {
  if (panel) return;
  panel = document.createElement("div");
  panel.id = "sq-archetype-choice";
  panel.style.cssText = [
    "display:none",
    "position:fixed",
    "inset:0",
    "z-index:100000",
    "background:rgba(6,8,14,0.72)",
    "align-items:center",
    "justify-content:center",
    "font-family:serif"
  ].join(";");
  const card = document.createElement("div");
  card.style.cssText = [
    "width:640px",
    "max-width:92vw",
    "padding:28px",
    "background:#1b140c",
    "color:#f3e6c8",
    "border:2px solid #c6a15b",
    "box-shadow:0 18px 50px rgba(0,0,0,0.45)"
  ].join(";");
  titleNode = document.createElement("div");
  titleNode.style.cssText = "font-size:28px;letter-spacing:0.04em;margin-bottom:12px;";
  bodyNode = document.createElement("div");
  bodyNode.style.cssText = "font-size:16px;line-height:1.4;margin-bottom:18px;";
  choicesNode = document.createElement("div");
  choicesNode.style.cssText = "display:flex;gap:12px;";
  card.appendChild(titleNode);
  card.appendChild(bodyNode);
  card.appendChild(choicesNode);
  panel.appendChild(card);
  document.body.appendChild(panel);
}

function hidePanel() {
  current = null;
  if (panel) panel.style.display = "none";
}

function choose(archetype) {
  if (!current) return;
  const answer = {
    x: current.x,
    y: current.y,
    slot: current.slot,
    building: current.building,
    archetype: archetype
  };
  const player = Players.get(GameContext.localPlayerID);
  try {
    if (player && player.setProperty) player.setProperty("SQ_ANSWER", JSON.stringify(answer));
  } catch (error) {
    console.warn("SQ ui answer", error);
  }
  try {
    engine.trigger("sq-archetype-chosen", answer);
  } catch (error) {
    console.warn("SQ ui trigger", error);
  }
  try {
    if (player && player.setProperty) player.setProperty("SQ_PENDING", "");
  } catch (error) {
    console.warn("SQ ui pending clear", error);
  }
  hidePanel();
}

function sameChoice(left, right) {
  return left && right && left.x === right.x && left.y === right.y && left.slot === right.slot && left.building === right.building;
}

function showChoice(payload) {
  if (!payload || payload.primary == null || payload.secondary == null) return;
  if (sameChoice(current, payload) && panel && panel.style.display === "flex") return;
  const localId = GameContext.localPlayerID;
  const owner = Players.get(localId);
  if (!owner || owner.isHuman === false) return;
  ensurePanel();
  current = payload;
  titleNode.textContent = loc("LOC_SQ_CHOICE_TITLE");
  const intro = payload.slot === 2 ? loc("LOC_SQ_CHOICE_CATALYST") : loc("LOC_SQ_CHOICE_FOUNDATION");
  bodyNode.textContent = buildingName(payload.building) + " — " + intro;
  choicesNode.textContent = "";
  [payload.primary, payload.secondary].forEach((archetype) => {
    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText = [
      "flex:1",
      "text-align:left",
      "padding:14px",
      "background:#2a2116",
      "color:#f3e6c8",
      "border:1px solid #c6a15b",
      "cursor:pointer"
    ].join(";");
    const name = document.createElement("div");
    name.style.cssText = "font-size:18px;margin-bottom:6px;";
    name.textContent = loc("LOC_SQ_ARCH_" + archetype);
    const detail = document.createElement("div");
    detail.style.cssText = "font-size:14px;line-height:1.35;";
    detail.textContent = loc(effectTag(payload.slot, archetype));
    button.appendChild(name);
    button.appendChild(detail);
    button.addEventListener("click", () => choose(archetype));
    choicesNode.appendChild(button);
  });
  panel.style.display = "flex";
}

function pullPending() {
  try {
    const player = Players.get(GameContext.localPlayerID);
    if (!player || !player.getProperty) return;
    let raw = player.getProperty("SQ_PENDING");
    if ((raw == null || raw === "") && typeof Database !== "undefined" && Database.makeHash) {
      raw = player.getProperty(Database.makeHash("SQ_PENDING"));
    }
    if (!raw || typeof raw !== "string") return;
    showChoice(JSON.parse(raw));
  } catch (error) {
    console.warn("SQ ui pending", error);
  }
}

function effectForSecond(building, archetype) {
  const kind = globalThis.SQ && globalThis.SQ.warehouseKind ? globalThis.SQ.warehouseKind(building) : null;
  if (kind === "FOOD") return loc("LOC_SQ_WAREHOUSE_FOOD");
  if (kind === "PRODUCTION") return loc("LOC_SQ_WAREHOUSE_PRODUCTION");
  if (archetype === "PRODUCTION" || archetype === "MILITARY") return loc("LOC_SQ_EFFECT_AGELESS");
  if (!archetype) return "";
  return loc("LOC_SQ_EFFECT_" + archetype);
}

function secondBuildingText(building) {
  const row = globalThis.SQ && globalThis.SQ.archetypes ? globalThis.SQ.archetypes[building] : null;
  if (!row) return "";
  const primary = effectForSecond(building, row.primary);
  const secondary = row.secondary ? effectForSecond(building, row.secondary) : "";
  return loc("LOC_SQ_DETAILS_SECOND") + " " + primary + (secondary ? " / " + secondary : "");
}

function annotateDetails(panel) {
  const type = panel.constructibleType;
  const text = secondBuildingText(type);
  if (!text) return;
  let note = panel.querySelector(".sq-details-note");
  if (!note) {
    note = document.createElement("div");
    note.className = "sq-details-note mb-2";
    if (panel.modifierTextDiv) panel.modifierTextDiv.appendChild(note);
    else panel.appendChild(note);
  }
  note.textContent = text;
}

function patchDetails() {
  const ctor = window.customElements && customElements.get("constructible-details");
  if (!ctor || ctor.prototype.__sq) return;
  const original = ctor.prototype.update;
  if (typeof original !== "function") return;
  ctor.prototype.update = function() {
    const result = original.apply(this, arguments);
    try {
      annotateDetails(this);
    } catch (error) {
      console.warn("SQ details", error);
    }
    return result;
  };
  ctor.prototype.__sq = true;
}

function isPlacingSecondBuilding(panel) {
  const placeIcons = panel.querySelectorAll('fxs-icon[data-icon-id="BUILDING_PLACE"]');
  for (const icon of placeIcons) {
    const slot = icon.parentElement;
    const row = slot && slot.parentElement;
    if (!row) continue;
    const siblings = Array.from(row.children).filter((child) => child.tagName && child.tagName.toLowerCase() === "fxs-icon");
    if (siblings.length >= 2 && siblings[1] === slot) return true;
  }
  return false;
}

function patchPlacementPanels() {
  const panels = document.querySelectorAll("panel-place-building-v2");
  panels.forEach((panel) => {
    const placingSecond = isPlacingSecondBuilding(panel);
    panel.querySelectorAll("[data-l10n-id]").forEach((el) => {
      const id = el.getAttribute("data-l10n-id") || "";
      const adjacency = id.indexOf("LOC_BUILDING_PLACEMENT_FROM_") === 0 || id.indexOf("LOC_BUILDING_PLACEMENT_TO_") === 0;
      if (!adjacency) return;
      const row = el.parentElement;
      if (row) row.style.display = placingSecond ? "none" : "";
    });
    let note = panel.querySelector(".sq-placement-note");
    if (!placingSecond) {
      if (note) note.remove();
      return;
    }
    const type = panel.getAttribute("constructible-type") || "";
    const selected = document.querySelector("constructible-details");
    const building = type || (selected && selected.constructibleType) || "";
    if (!note) {
      note = document.createElement("div");
      note.className = "sq-placement-note";
      note.style.cssText = "margin:8px 12px;font-size:13px;line-height:1.35;";
      panel.appendChild(note);
    }
    note.textContent = secondBuildingText(building);
  });
}

function tooltipLines(x, y) {
  if (!globalThis.SQ || !globalThis.SQ.quarterInfo) return null;
  const info = globalThis.SQ.quarterInfo(x, y);
  if (!info || !info.foundation || !info.foundation.archetype) return null;
  const lines = [loc("LOC_SQ_TOOLTIP_SPEC") + " " + loc("LOC_SQ_ARCH_" + info.foundation.archetype)];
  if (info.catalyst && info.catalyst.building) {
    lines.push(loc("LOC_SQ_NO_ADJACENCY"));
    lines.push(effectForSecond(info.catalyst.building, info.catalyst.archetype));
    if (info.amount > 0) lines.push("+" + info.amount);
  }
  return lines;
}

function injectTooltip(plot) {
  if (!plot || plot.x == null) return;
  const lines = tooltipLines(plot.x, plot.y);
  document.querySelectorAll(".sq-quarter-note").forEach((note) => {
    if (!lines) note.remove();
  });
  if (!lines) return;
  const glows = document.querySelectorAll(".tooltip-frame-focus-glow");
  glows.forEach((glow) => {
    const root = glow.parentElement;
    if (!root) return;
    let note = root.querySelector(".sq-quarter-note");
    if (!note) {
      note = document.createElement("div");
      note.className = "sq-quarter-note";
      note.style.cssText = "margin-top:8px;padding:0 8px 8px;font-size:13px;line-height:1.35;white-space:pre-line;";
      root.appendChild(note);
    }
    note.textContent = lines.join("\n");
  });
}

function boot() {
  if (!document.body) return;
  useFrench = detectFrench();
  console.log("SQ ui loaded");
  window.addEventListener("cursor-updated", (event) => {
    const plot = event.detail && event.detail.plot;
    window.setTimeout(() => injectTooltip(plot), 60);
  });
  window.setInterval(() => {
    try {
      patchDetails();
      patchPlacementPanels();
    } catch (error) {
      console.warn("SQ ui patch", error);
    }
  }, 400);
}

if (typeof engine !== "undefined" && engine.whenReady && engine.whenReady.then) {
  engine.whenReady.then(boot);
} else {
  boot();
}
