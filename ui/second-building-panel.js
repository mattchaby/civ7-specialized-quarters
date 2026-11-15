import { ComponentRegistry } from "../../core/ui-next/services/component-registry.js";

const FOOD_WAREHOUSES = {
  BUILDING_GRANARY: true,
  BUILDING_FISHING_QUAY: true,
  BUILDING_GRISTMILL: true,
  BUILDING_GROCER: true
};

const PRODUCTION_WAREHOUSES = {
  BUILDING_BRICKYARD: true,
  BUILDING_SAW_PIT: true,
  BUILDING_HARBOR: true,
  BUILDING_SAWMILL: true,
  BUILDING_STONECUTTER: true,
  BUILDING_IRONWORKS: true
};

function french() {
  try {
    const library = Locale.compose("LOC_BUILDING_LIBRARY_NAME");
    return !!(library && /biblioth/i.test(library));
  } catch (error) {
    return true;
  }
}

function text(key) {
  const fr = french();
  const table = fr ? FR : EN;
  return table[key] || EN[key] || key;
}

const EN = {
  lead: "As the second building of the quarter, it does not keep adjacency bonuses. It grants:",
  SCIENCE: "+1 of the foundation yield per Technology Mastery this Age.",
  CULTURE: "+1 of the foundation yield per Civic Mastery this Age.",
  GOLD: "+1 of the foundation yield per Resource assigned to this city.",
  FOOD: "+1 of the foundation yield per Farm or Fishing Boat worked by this city.",
  HAPPINESS: "+1 of the foundation yield per Celebration this Age.",
  DIPLOMACY: "+1 of the foundation yield in each connected Town, plus +1 per Specialist. Towns do not stack this.",
  PRODUCTION: "The foundation becomes Ageless. The game cannot flag one building as Ageless, so this bonus is not applied yet.",
  MILITARY: "The foundation becomes Ageless. The game cannot flag one building as Ageless, so this bonus is not applied yet.",
  FOOD_WAREHOUSE: "Food warehouse: +1 of the foundation yield per Farm or Fishing Boat worked by this city.",
  PRODUCTION_WAREHOUSE: "Production warehouse: the foundation becomes Ageless and keeps its yields into the next Age. This is not applied yet, because one building cannot be flagged Ageless."
};

const FR = {
  lead: "En second bâtiment du quartier, il ne garde pas ses bonus de proximité. Il apporte :",
  SCIENCE: "+1 du rendement de la fondation par maîtrise technologique de cet âge.",
  CULTURE: "+1 du rendement de la fondation par maîtrise civique de cet âge.",
  GOLD: "+1 du rendement de la fondation par ressource assignée à cette ville.",
  FOOD: "+1 du rendement de la fondation par ferme ou bateau de pêche exploité par la ville.",
  HAPPINESS: "+1 du rendement de la fondation par célébration de cet âge.",
  DIPLOMACY: "+1 du rendement de la fondation dans chaque ville connectée, plus +1 par spécialiste. Les villes ne cumulent pas ce bonus.",
  PRODUCTION: "La fondation devient Ageless. Le jeu ne peut pas marquer un seul bâtiment Ageless, donc ce bonus n'est pas encore versé.",
  MILITARY: "La fondation devient Ageless. Le jeu ne peut pas marquer un seul bâtiment Ageless, donc ce bonus n'est pas encore versé.",
  FOOD_WAREHOUSE: "Entrepôt de nourriture : +1 du rendement de la fondation par ferme ou bateau de pêche exploité par la ville.",
  PRODUCTION_WAREHOUSE: "Entrepôt de production : la fondation devient Ageless et conserve ses rendements à l'âge suivant. Ce bonus n'est pas encore versé, car un seul bâtiment ne peut pas être marqué Ageless."
};

function effectLine(building, archetype) {
  if (FOOD_WAREHOUSES[building]) return text("FOOD_WAREHOUSE");
  if (PRODUCTION_WAREHOUSES[building]) return text("PRODUCTION_WAREHOUSE");
  return text(archetype);
}

function describe(type) {
  const row = globalThis.SQ && globalThis.SQ.archetypes ? globalThis.SQ.archetypes[type] : null;
  if (!row) return "";
  const lines = [text("lead"), effectLine(type, row.primary)];
  if (row.secondary) lines.push(effectLine(type, row.secondary));
  return lines.join("\n");
}

function hideAdjacency(node) {
  const card = node.closest(".img-base-ticket-bg-container") || node.parentElement;
  if (!card) return;
  card.querySelectorAll("[data-l10n-id]").forEach((el) => {
    const id = el.getAttribute("data-l10n-id") || "";
    if (id === "LOC_BUILDING_PLACEMENT_HIGHEST_ADJACENCIES" || id.indexOf("ADJACEN") !== -1) {
      const row = el.closest(".flex") || el.parentElement;
      if (row && row !== card) row.style.display = "none";
    }
  });
}

function SecondBuildingInfo(props) {
  const type = props.definition && (props.definition.ConstructibleType || props.definition.Type);
  const message = describe(type);
  const el = document.createElement("div");
  el.className = "sq-second-building mb-2 mt-2";
  el.style.whiteSpace = "pre-line";
  el.style.color = "#f3e6c8";
  el.textContent = message;
  if (message) {
    queueMicrotask(() => hideAdjacency(el));
  }
  return el;
}

ComponentRegistry.register({
  name: "ProductionModBuildingTTInfo",
  createInstance: SecondBuildingInfo,
  overridePriority: 10
});

console.log("SQ second-building panel registered");
