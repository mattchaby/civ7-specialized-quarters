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

function sameComponentId(left, right) {
  if (left == null || right == null) return false;
  if (left === right) return true;
  if (typeof ComponentID !== "undefined" && ComponentID.isMatch) return ComponentID.isMatch(left, right);
  return left.owner === right.owner && left.id === right.id;
}

function placingAsSecondBuilding(manager, plotIndex) {
  if (plotIndex == null || !GameplayMap.getLocationFromIndex || !Districts.getAtLocation) return false;
  const location = GameplayMap.getLocationFromIndex(plotIndex);
  if (!location) return false;
  const district = Districts.getAtLocation(location);
  if (!district || !district.getConstructibleIds) return false;
  let replaced = null;
  try {
    replaced = manager.getOverbuildConstructibleID(plotIndex);
  } catch (error) {
    replaced = null;
  }
  let remaining = 0;
  for (const id of district.getConstructibleIds()) {
    if (replaced != null && sameComponentId(id, replaced)) continue;
    const instance = Constructibles.getByComponentID(id);
    if (!instance || instance.complete === false) continue;
    const info = GameInfo.Constructibles.lookup(instance.type);
    if (!info || info.ConstructibleClass !== "BUILDING" || info.ExistingDistrictOnly) continue;
    remaining += 1;
  }
  return remaining >= 1;
}

function overbuildType(manager, plotIndex) {
  try {
    const id = manager.getOverbuildConstructibleID(plotIndex);
    const instance = id && Constructibles.getByComponentID(id);
    const info = instance && GameInfo.Constructibles.lookup(instance.type);
    return info ? info.ConstructibleType : null;
  } catch (error) {
    return null;
  }
}

function placementPreview(manager, plotIndex) {
  if (!globalThis.SQ || !globalThis.SQ.previewPlacement) return null;
  const location = GameplayMap.getLocationFromIndex(plotIndex);
  const building = manager.currentConstructible && manager.currentConstructible.ConstructibleType;
  if (!location || !building) return null;
  try {
    return globalThis.SQ.previewPlacement(location.x, location.y, building, overbuildType(manager, plotIndex));
  } catch (error) {
    console.warn("SQ placement preview", error);
    return null;
  }
}

function addCityYield(yields, yieldType, amount) {
  if (!yields || !yieldType || !amount) return;
  const definition = GameInfo.Yields.lookup(yieldType);
  if (!definition || yields[definition.$index] == null) return;
  yields[definition.$index] += amount;
}

function yieldBonusHtml(amount, yieldType) {
  try {
    return Locale.stylize("LOC_BUILDING_PLACEMENT_YIELD_BONUS", amount > 0 ? "text-positive" : "text-negative", amount, yieldType);
  } catch (error) {
    return (amount > 0 ? "+" : "") + amount;
  }
}

function composeLine(key, args) {
  try {
    return Locale.compose.apply(Locale, [key].concat(args));
  } catch (error) {
    return "";
  }
}

function optionSentence(option, alternate) {
  if (option.ageless) return composeLine(alternate ? "LOC_SQ_PLACEMENT_ALT_AGELESS" : "LOC_SQ_EFFECT_AGELESS", []);
  if (option.diplomacy && option.military) {
    return composeLine(alternate ? "LOC_SQ_PLACEMENT_ALT_TOWN_PERCENT" : "LOC_SQ_PLACEMENT_TOWN_PERCENT", [option.amount, option.towns]);
  }
  if (option.military) return composeLine(alternate ? "LOC_SQ_PLACEMENT_ALT_PERCENT" : "LOC_SQ_PLACEMENT_PERCENT", [option.amount]);
  if (option.diplomacy) {
    return composeLine(alternate ? "LOC_SQ_PLACEMENT_ALT_TOWNS" : "LOC_SQ_PLACEMENT_TOWNS", [option.amount, option.yieldType || "", option.towns]);
  }
  return composeLine(alternate ? "LOC_SQ_PLACEMENT_ALT" : "LOC_SQ_PLACEMENT_LINE", [option.amount, option.yieldType || ""]);
}

function catalystLines(preview) {
  const lines = [];
  const sentences = [];
  if (!preview) return { lines: lines, sentences: sentences };
  for (let index = 0; index < preview.options.length; index++) {
    const option = preview.options[index];
    const alternate = index > 0;
    const sentence = optionSentence(option, alternate);
    if (sentence) sentences.push(sentence);
    const bonuses = [];
    if (option.ageless || option.military || option.diplomacy) {
      if (sentence) bonuses.push(sentence);
    } else if (option.yieldType) {
      bonuses.push(yieldBonusHtml(option.amount, option.yieldType));
    }
    if (bonuses.length) {
      lines.push({
        description: alternate ? "LOC_SQ_PLACEMENT_ALT_LABEL" : "LOC_SQ_PLACEMENT_SYNERGY",
        bonuses: bonuses
      });
    }
  }
  return { lines: lines, sentences: sentences };
}

function withoutPlacedAdjacency(plotIndex, data, manager) {
  if (!data || !data.changeDetails || typeof YieldSourceTypes === "undefined") return data;
  if (!placingAsSecondBuilding(manager, plotIndex)) return data;
  const yields = data.yieldChanges ? data.yieldChanges.slice() : null;
  const details = [];
  for (const change of data.changeDetails) {
    if (change.sourceType === YieldSourceTypes.ADJACENCY) {
      if (yields) {
        const yieldDefinition = GameInfo.Yields.lookup(change.yieldType);
        if (yieldDefinition && yields[yieldDefinition.$index] != null) {
          yields[yieldDefinition.$index] -= change.change;
        }
      }
      continue;
    }
    details.push(change);
  }
  const preview = placementPreview(manager, plotIndex);
  const shown = catalystLines(preview);
  const primary = preview && preview.options[0];
  if (primary && yields && !primary.ageless && !primary.diplomacy && !primary.military) {
    addCityYield(yields, primary.yieldType, primary.amount);
  }
  return Object.assign({}, data, {
    changeDetails: details,
    yieldChanges: yields || data.yieldChanges,
    __sqLines: shown.lines,
    __sqSentences: shown.sentences
  });
}

let placementManager = null;

function hideSecondBuildingAdjacency(manager) {
  if (!manager || manager.__sqAdjacency) return;
  placementManager = manager;
  const originalPlotData = manager.getPlacementPlotData.bind(manager);
  const originalChangeDetails = manager.getPlacementChangeDetails.bind(manager);
  const originalBreakdown = manager.getYieldBonusBreakdownFromPlacementData.bind(manager);
  manager.getPlacementPlotData = function(plotIndex) {
    return withoutPlacedAdjacency(plotIndex, originalPlotData(plotIndex), manager);
  };
  manager.getPlacementChangeDetails = function(plotIndex, sourceType) {
    if (typeof YieldSourceTypes !== "undefined" && sourceType === YieldSourceTypes.ADJACENCY && placingAsSecondBuilding(manager, plotIndex)) {
      return [];
    }
    return originalChangeDetails(plotIndex, sourceType);
  };
  manager.getYieldBonusBreakdownFromPlacementData = function(placementData) {
    const bonuses = originalBreakdown(placementData);
    if (placementData && placementData.__sqLines) {
      for (const line of placementData.__sqLines) bonuses.push(line);
    }
    return bonuses;
  };
  manager.__sqAdjacency = true;
  console.log("SQ placement adjacency hidden for second buildings");
}

function notePlacement(model) {
  if (!model || model.selectedPlotIndex == null || !placementManager) return;
  if (!placingAsSecondBuilding(placementManager, model.selectedPlotIndex)) return;
  const data = placementManager.getPlacementPlotData(model.selectedPlotIndex);
  const sentences = data && data.__sqSentences;
  if (!sentences || !sentences.length) return;
  const note = sentences.filter(Boolean).join(" ");
  if (!note) return;
  model.tileConversionText = model.tileConversionText ? model.tileConversionText + " " + note : note;
}

function watchPlacementModel(model) {
  if (!model || model.__sqWatch) return;
  model.__sqWatch = true;
  setInterval(() => {
    if (!model._OnUpdate || model._OnUpdate.__sq) return;
    const original = model._OnUpdate;
    const wrapped = function(self) {
      try {
        notePlacement(self || model);
      } catch (error) {
        console.warn("SQ placement note", error);
      }
      return original(self || model);
    };
    wrapped.__sq = true;
    model.updateCallback = wrapped;
  }, 400);
}

import("../../base-standard/ui/building-placement/building-placement-manager.js").then((mod) => {
  hideSecondBuildingAdjacency(mod.BuildingPlacementManager);
}).catch((error) => {
  console.warn("SQ placement manager", error);
});

import("../../base-standard/ui/place-building/model-place-building-v2.js").then((mod) => {
  watchPlacementModel(mod.PlaceBuildingV2);
}).catch((error) => {
  console.warn("SQ placement model", error);
});

console.log("SQ second-building panel registered");
