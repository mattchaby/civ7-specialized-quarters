// Effets des doctrines de fondation. Le rendement est versé à la ville.
// La proximité vanilla du bâtiment reste en place : le jeu ne peut pas la retirer d'une seule instance.

const BY_ID = {};
for (const doctrine of globalThis.SQ_DOCTRINES || []) BY_ID[doctrine.id] = doctrine;

function api() {
  return globalThis.SQ;
}

function doctrinesOf(archetype) {
  return (globalThis.SQ_DOCTRINES || []).filter((doctrine) => doctrine.archetype === archetype);
}

function doctrineYield(doctrine) {
  if (!doctrine) return null;
  if (doctrine.archetype === "MILITARY") return "YIELD_PRODUCTION";
  const map = api().yieldOf || {};
  return map[doctrine.archetype] || null;
}

function cityKey(city) {
  if (!city) return "none";
  if (city.location && city.location.x != null) return city.location.x + "," + city.location.y;
  if (city.id && typeof city.id === "object" && city.id.id != null) return "c" + city.id.id;
  return String(city.id);
}

function lookupName(table, value) {
  if (value == null || value === "" || value === -1 || value === 0) return "";
  if (typeof value === "string") return value;
  try {
    const row = table && table.lookup ? table.lookup(value) : null;
    if (!row) return "";
    return row.FeatureType || row.TerrainType || row.ResourceType || row.ConstructibleType || row.YieldType || row.Type || "";
  } catch (error) {
    return "";
  }
}

function mapName(method, table, x, y) {
  if (!GameplayMap[method]) return "";
  try {
    return lookupName(table, GameplayMap[method](x, y));
  } catch (error) {
    return "";
  }
}

function adjacentLocations(x, y) {
  const sq = api();
  if (!GameplayMap.getPlotIndicesInRadius) return [];
  let indices = [];
  try {
    indices = sq.asList(GameplayMap.getPlotIndicesInRadius(x, y, 1));
  } catch (error) {
    return [];
  }
  const self = sq.plotIndex(x, y);
  const locations = [];
  for (const index of indices) {
    if (index === self) continue;
    const location = sq.locationFromIndex(index);
    if (location) locations.push(location);
  }
  return locations;
}

function plotProfile(x, y, ownerId) {
  const sq = api();
  const terrain = mapName("getTerrainType", GameInfo.Terrains, x, y);
  const feature = mapName("getFeatureType", GameInfo.Features, x, y);
  const resource = mapName("getResourceType", GameInfo.Resources, x, y);
  const buildings = sq.buildingsAt(x, y);
  const archetypes = [];
  for (const building of buildings) {
    const row = sq.archetypes[building];
    if (row && row.primary) archetypes.push(row.primary);
  }
  let improvement = "";
  let buildingCount = 0;
  let wonder = /WONDER|NATURAL/i.test(feature);
  try {
    const ids = MapConstructibles.getConstructibles ? sq.asList(MapConstructibles.getConstructibles(x, y)) : [];
    for (const id of ids) {
      const type = sq.constructibleType(Constructibles.getByComponentID(id));
      const info = type ? GameInfo.Constructibles.lookup(type) : null;
      if (!info) continue;
      if (info.ConstructibleClass === "WONDER") wonder = true;
      if (info.ConstructibleClass === "BUILDING" && !info.ExistingDistrictOnly) buildingCount += 1;
      if (info.ConstructibleClass === "IMPROVEMENT") improvement = type;
    }
  } catch (error) {
    improvement = improvement;
  }
  const city = sq.cityAt(x, y);
  const owner = sq.numericId(sq.playerFromCity(city));
  let urban = buildings.length > 0;
  try {
    const index = sq.plotIndex(x, y);
    const district = index != null && Districts.getAtLocation ? Districts.getAtLocation({ x: x, y: y }) || Districts.getAtLocation(index) : null;
    if (district && (district.isUrban || district.isUrbanCore)) urban = true;
  } catch (error) {
    urban = urban;
  }
  const center = !!(city && city.location && city.location.x === x && city.location.y === y);
  return {
    terrain: terrain,
    feature: feature,
    resource: resource && resource.indexOf("NONE") === -1 ? resource : "",
    vegetated: /FOREST|JUNGLE|MARSH|WOOD|RAINFOREST|MANGROVE/i.test(feature),
    coast: terrain === "TERRAIN_COAST",
    lake: terrain === "TERRAIN_LAKE",
    river: terrain === "TERRAIN_NAVIGABLE_RIVER",
    mountain: terrain === "TERRAIN_MOUNTAIN",
    rough: /HILL|ROUGH/i.test(terrain),
    reef: /REEF/i.test(feature),
    wonder: wonder,
    urban: urban,
    archetypes: archetypes,
    completed: buildings.length >= 2,
    improvement: improvement,
    buildingCount: buildingCount,
    foreign: owner != null && ownerId != null && owner !== ownerId,
    center: center
  };
}

function matches(match, tile, archetype) {
  if (match === "vegetated") return tile.vegetated;
  if (match === "coast-lake") return tile.coast || tile.lake;
  if (match === "coast-lake-reef") return tile.coast || tile.lake || tile.reef;
  if (match === "coast-lake-river") return tile.coast || tile.lake || tile.river;
  if (match === "river-coast" || match === "coast-river") return tile.river || tile.coast;
  if (match === "rough") return tile.rough;
  if (match === "mountain-rough") return tile.mountain || tile.rough;
  if (match === "resource") return !!tile.resource;
  if (match === "urban") return tile.urban;
  if (match === "urban-other") return tile.urban && tile.archetypes.length > 0 && tile.archetypes.indexOf(archetype) === -1;
  if (match === "pasture-plantation") return /PASTURE|PLANTATION/i.test(tile.improvement);
  if (match === "rural") return !!tile.improvement;
  if (match === "resource-wonder") return !!tile.resource || tile.wonder;
  if (match === "foreign") return tile.foreign;
  if (match === "palace") return tile.center ? tile.buildingCount : 0;
  if (match === "resource-quarter") return (tile.resource ? 1 : 0) + (tile.completed ? 1 : 0);
  return false;
}

function adjacencyAmount(doctrine, x, y, ownerId) {
  let total = 0;
  for (const location of adjacentLocations(x, y)) {
    const tile = plotProfile(location.x, location.y, ownerId);
    const matched = matches(doctrine.match, tile, doctrine.archetype);
    total += matched === true ? 1 : (typeof matched === "number" ? matched : 0);
  }
  return total;
}

function listLength(obj, names) {
  if (!obj) return null;
  for (const name of names) {
    if (typeof obj[name] !== "function") continue;
    try {
      const value = obj[name]();
      if (typeof value === "number") return value;
      const list = api().asList(value);
      if (list) return list.length;
    } catch (error) {
      continue;
    }
  }
  return null;
}

function empireFacts(player) {
  const sq = api();
  const facts = { wonders: 0, strategic: 0, suzerain: 0, promotions: 0, commanders: 0, traditions: null };
  const ownerId = sq.numericId(player);
  try {
    const ids = player.Cities && player.Cities.getCityIds ? sq.asList(player.Cities.getCityIds()) : [];
    for (const id of ids) {
      const city = Cities.get(id);
      if (!city || typeof city.getPurchasedPlots !== "function") continue;
      for (const index of sq.asList(city.getPurchasedPlots())) {
        const location = sq.locationFromIndex(index);
        if (!location) continue;
        const idsOnPlot = MapConstructibles.getConstructibles ? sq.asList(MapConstructibles.getConstructibles(location.x, location.y)) : [];
        for (const constructibleId of idsOnPlot) {
          const instance = Constructibles.getByComponentID(constructibleId);
          const info = instance ? GameInfo.Constructibles.lookup(instance.type) : null;
          if (info && info.ConstructibleClass === "WONDER") facts.wonders += 1;
        }
      }
    }
  } catch (error) {
    facts.wonders = facts.wonders;
  }
  try {
    if (GameInfo.Resources && player.Resources) {
      for (let i = 0; i < GameInfo.Resources.length; i++) {
        const row = GameInfo.Resources[i];
        if (!row || row.ResourceClassType !== "RESOURCECLASS_STRATEGIC") continue;
        const amount = typeof player.Resources.getResourceAmount === "function" ? player.Resources.getResourceAmount(row.ResourceType) : 0;
        if (amount > 0) facts.strategic += 1;
      }
    }
  } catch (error) {
    facts.strategic = facts.strategic;
  }
  try {
    const ids = Players.getWasEverAliveIds ? sq.asList(Players.getWasEverAliveIds()) : [];
    for (const id of ids) {
      const other = sq.playerFromId(id);
      if (!other || !other.Influence || typeof other.Influence.getSuzerain !== "function") continue;
      if (other.Influence.getSuzerain() == ownerId) facts.suzerain += 1;
    }
  } catch (error) {
    facts.suzerain = facts.suzerain;
  }
  try {
    const units = player.Units && player.Units.getUnits ? sq.asList(player.Units.getUnits()) : [];
    for (const unit of units) {
      const type = unit && (unit.typeName || unit.unitType || "");
      const info = GameInfo.Units && unit ? GameInfo.Units.lookup(unit.type || type) : null;
      const name = (info && (info.UnitType || info.CoreClass || "")) + " " + type;
      if (!/COMMANDER/i.test(name)) continue;
      facts.commanders += 1;
      const promotions = listLength(unit, ["getPromotions", "getEarnedPromotions"]);
      if (promotions) facts.promotions += promotions;
    }
  } catch (error) {
    facts.commanders = facts.commanders;
  }
  facts.traditions = listLength(player.Government, ["getActiveTraditions", "getSlottedTraditions", "getTraditions"]);
  if (facts.traditions == null) facts.traditions = listLength(player.Culture, ["getActiveTraditions", "getSlottedTraditions"]);
  return facts;
}

function cityCount(city, names) {
  const found = listLength(city, names);
  if (found != null) return found;
  return listLength(city && city.GreatWorks, names);
}

function passiveAmount(doctrine, player, city, facts) {
  const each = doctrine.amount || 1;
  if (doctrine.match === "resources") return api().assignedResources(city) * each;
  if (doctrine.match === "strategic") return facts.strategic * each;
  if (doctrine.match === "suzerain") return facts.suzerain * each;
  if (doctrine.match === "wonders") return facts.wonders * each;
  if (doctrine.match === "promotions") return facts.promotions * each;
  if (doctrine.match === "farm-pasture") return workedRural(city, /FARM|PASTURE/i) * each;
  if (doctrine.match === "codex") return cityCount(city, ["getCodexes", "getGreatWorks", "getSlottedGreatWorks"]) * each;
  if (doctrine.match === "greatwork") return cityCount(city, ["getGreatWorks", "getRelics", "getSlottedGreatWorks"]) * each;
  return 0;
}

function workedRural(city, pattern) {
  const sq = api();
  if (!city || typeof city.getPurchasedPlots !== "function") return 0;
  let count = 0;
  try {
    for (const index of sq.asList(city.getPurchasedPlots())) {
      const location = sq.locationFromIndex(index);
      if (!location) continue;
      const ids = MapConstructibles.getConstructibles ? sq.asList(MapConstructibles.getConstructibles(location.x, location.y)) : [];
      for (const id of ids) {
        const type = sq.constructibleType(Constructibles.getByComponentID(id)) || "";
        if (pattern.test(type)) count += 1;
      }
    }
  } catch (error) {
    return count;
  }
  return count;
}

function specialistAmount(doctrine, player, city, x, y, facts) {
  const specialists = api().specialistsAt(city, x, y);
  if (doctrine.extra === "commanders") return specialists * facts.commanders;
  if (doctrine.extra === "traditions") {
    const traditions = facts.traditions == null ? 1 : facts.traditions;
    return specialists * (doctrine.flat || 2) * traditions;
  }
  return specialists * (doctrine.flat || 0);
}

function specialistYield(doctrine) {
  if (doctrine.extra === "commanders") return "YIELD_GOLD";
  return doctrineYield(doctrine);
}

function callFirst(obj, names, args) {
  if (!obj) return false;
  for (const name of names) {
    if (typeof obj[name] !== "function") continue;
    try {
      obj[name].apply(obj, args);
      return true;
    } catch (error) {
      continue;
    }
  }
  return false;
}

function applySideEffects(player, city, x, y, doctrine, state) {
  const key = x + "," + y + ":" + doctrine.id;
  state.doctrineMods = state.doctrineMods || {};
  if (state.doctrineMods[key]) return;
  const sq = api();
  const index = sq.plotIndex(x, y);
  let applied = false;
  if (doctrine.kind === "specialist" && index != null) {
    applied = callFirst(city && city.Workers, ["changeTileMaxWorkers", "adjustTileMaxWorkers", "setTileMaxWorkers"], [index, 1]) || applied;
  }
  if (doctrine.extra === "science-speed") {
    applied = callFirst(player.Techs, ["changeMasterySpeedPercent", "changeResearchPercent"], [10]) || applied;
  }
  if (doctrine.extra === "culture-speed") {
    applied = callFirst(player.Culture, ["changeMasterySpeedPercent", "changeCulturePercent"], [10]) || applied;
  }
  if (doctrine.extra === "purchase") {
    applied = callFirst(city && city.Production, ["changePurchaseCostPercent", "adjustPurchaseCostPercent"], [-10]) || applied;
  }
  if (doctrine.extra === "buildings") {
    applied = callFirst(city && city.Production, ["changeBuildingProductionPercent", "adjustBuildingProductionPercent"], [10]) || applied;
  }
  if (doctrine.extra === "food-upkeep" && index != null) {
    applied = callFirst(city && city.Workers, ["waiveTileFoodUpkeep", "setTileFoodUpkeep"], [index, 0]) || applied;
  }
  if (doctrine.extra === "traditions" && index != null) {
    applied = callFirst(city && city.Workers, ["waiveTileHappinessUpkeep", "setTileHappinessUpkeep"], [index, 0]) || applied;
  }
  if (doctrine.extra === "influence-cost") {
    applied = callFirst(player.Diplomacy, ["changeActionCostPercent", "adjustInfluenceCostPercent"], [-10]) || applied;
  }
  if (doctrine.extra === "commanders") {
    applied = callFirst(city && city.Production, ["changeTrainedUnitExperience", "grantTrainedUnitXp"], [1]) || applied;
  }
  if (doctrine.match === "resources") {
    applied = callFirst(city && city.Resources, ["changeResourceSlotCount", "adjustResourceSlots"], [1]) || applied;
  }
  state.doctrineMods[key] = true;
  if (!applied && doctrine.kind !== "adjacency" && doctrine.kind !== "passive" && doctrine.kind !== "outburst" && doctrine.kind !== "standard") {
    console.warn("SQ doctrine side effect unavailable", doctrine.id);
  }
}

function quarterOutput(player, x, y, yieldType) {
  const sq = api();
  const index = sq.plotIndex(x, y);
  const ownerId = sq.numericId(player);
  if (index == null || ownerId == null || !GameplayMap.getYields) return 0;
  try {
    const yields = GameplayMap.getYields(index, ownerId);
    let total = 0;
    if (yields && typeof yields[Symbol.iterator] === "function") {
      for (const pair of yields) {
        if (!pair || pair.length < 2) continue;
        if (lookupName(GameInfo.Yields, pair[0]) === yieldType || pair[0] === yieldType) total += Number(pair[1]) || 0;
      }
    }
    return total;
  } catch (error) {
    return 0;
  }
}

function addDesired(bucket, city, yieldType, amount) {
  if (!city || !yieldType || !amount) return;
  const key = cityKey(city) + ":" + yieldType;
  if (!bucket[key]) bucket[key] = { city: city, yieldType: yieldType, amount: 0 };
  bucket[key].amount += amount;
}

function payDesired(player, state, bucket) {
  const turn = typeof Game.turn === "number" ? Game.turn : 0;
  if (state.doctrineTurn !== turn) {
    state.doctrineTurn = turn;
    state.doctrinePaid = {};
  }
  state.doctrinePaid = state.doctrinePaid || {};
  for (const key in bucket) {
    const entry = bucket[key];
    const already = state.doctrinePaid[key] || 0;
    if (entry.amount > already) api().grant(player, entry.city, entry.yieldType, entry.amount - already);
    state.doctrinePaid[key] = entry.amount;
  }
}

function burstPlots(player, state, burstOn, times, city) {
  if (!times) return;
  for (const key in state.plots) {
    const slot = state.plots[key].slot1;
    const doctrine = slot && BY_ID[slot.doctrine];
    if (!doctrine || doctrine.kind !== "outburst" || doctrine.burstOn !== burstOn) continue;
    const parts = key.split(",");
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const plotCity = api().cityAt(x, y);
    if (city && cityKey(plotCity) !== cityKey(city)) continue;
    const source = doctrine.archetype === "MILITARY" ? "YIELD_PRODUCTION" : doctrineYield(doctrine);
    const amount = quarterOutput(player, x, y, source) * times;
    if (amount) api().grant(player, plotCity, doctrine.burstYield, amount);
  }
}

function progressionCount(player, progression) {
  const sq = api();
  if (!progression || typeof progression.getTreeType !== "function" || !Game.ProgressionTrees) return 0;
  let treeType = null;
  try {
    treeType = progression.getTreeType();
  } catch (error) {
    return 0;
  }
  const nodes = [];
  try {
    if (Game.ProgressionTrees.getTreeStructure) nodes.push.apply(nodes, sq.asList(Game.ProgressionTrees.getTreeStructure(treeType)));
  } catch (error) {
    return 0;
  }
  const ownerId = sq.numericId(player);
  const seen = {};
  let count = 0;
  for (const node of nodes) {
    const nodeType = node && (node.nodeType || node.ProgressionTreeNodeType) ? node.nodeType || node.ProgressionTreeNodeType : node;
    if (!nodeType || seen[nodeType]) continue;
    seen[nodeType] = true;
    try {
      const data = Game.ProgressionTrees.getNode ? Game.ProgressionTrees.getNode(ownerId, nodeType) : null;
      if (data && (data.isUnlocked || data.unlocked || data.isMastered || data.mastered || data.depthUnlocked > 0)) count += 1;
    } catch (error) {
      continue;
    }
  }
  return count;
}

function tradeRouteCount(player) {
  const sq = api();
  let count = 0;
  const ids = player.Cities && player.Cities.getCityIds ? sq.asList(player.Cities.getCityIds()) : [];
  for (const id of ids) {
    const city = Cities.get(id);
    const routes = listLength(city && city.Trade, ["getOutgoingRoutes", "getTradeRoutes", "getRoutes"]);
    if (routes) count += routes;
  }
  const playerRoutes = listLength(player.Trade, ["getTradeRoutes", "getOutgoingRoutes", "getRoutes"]);
  return playerRoutes != null ? playerRoutes : count;
}

function populationOf(city) {
  if (!city) return 0;
  if (typeof city.population === "number") return city.population;
  const value = listLength(city.Population, ["getPopulation", "getCitizens"]);
  return value || 0;
}

function watchSnapshots(player, state) {
  state.snapshots = state.snapshots || {};
  const snap = state.snapshots;
  const tech = progressionCount(player, player.Techs);
  const civic = progressionCount(player, player.Culture);
  const routes = tradeRouteCount(player);
  if (snap.tech == null) snap.tech = tech;
  else if (tech > snap.tech) {
    burstPlots(player, state, "tech", tech - snap.tech, null);
    snap.tech = tech;
  }
  if (snap.civic == null) snap.civic = civic;
  else if (civic > snap.civic) {
    burstPlots(player, state, "civic", civic - snap.civic, null);
    snap.civic = civic;
  }
  if (snap.routes == null) snap.routes = routes;
  else if (routes > snap.routes) {
    burstPlots(player, state, "merchant", routes - snap.routes, null);
    snap.routes = routes;
  }
  if (snap.celebrations == null) snap.celebrations = state.celebrations || 0;
  else if ((state.celebrations || 0) > snap.celebrations) {
    burstPlots(player, state, "celebration", (state.celebrations || 0) - snap.celebrations, null);
    snap.celebrations = state.celebrations || 0;
  }
  snap.population = snap.population || {};
  const ids = player.Cities && player.Cities.getCityIds ? api().asList(player.Cities.getCityIds()) : [];
  for (const id of ids) {
    const city = Cities.get(id);
    const key = cityKey(city);
    const population = populationOf(city);
    if (snap.population[key] == null) snap.population[key] = population;
    else if (population > snap.population[key]) {
      burstPlots(player, state, "population", population - snap.population[key], city);
      snap.population[key] = population;
    }
  }
}

function apply(player) {
  const sq = api();
  if (!sq || !sq.isMajor(player)) return;
  const state = sq.readState(player);
  const facts = empireFacts(player);
  const desired = {};
  const ownerId = sq.numericId(player);
  for (const key in state.plots) {
    const slot = state.plots[key].slot1;
    const doctrine = slot && BY_ID[slot.doctrine];
    if (!doctrine || doctrine.kind === "standard" || doctrine.kind === "outburst") continue;
    const parts = key.split(",");
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const city = sq.cityAt(x, y);
    if (!city) continue;
    applySideEffects(player, city, x, y, doctrine, state);
    let amount = 0;
    let yieldType = doctrineYield(doctrine);
    if (doctrine.kind === "adjacency") amount = adjacencyAmount(doctrine, x, y, ownerId);
    if (doctrine.kind === "passive") amount = passiveAmount(doctrine, player, city, facts);
    if (doctrine.kind === "specialist") {
      amount = specialistAmount(doctrine, player, city, x, y, facts);
      yieldType = specialistYield(doctrine);
    }
    addDesired(desired, city, yieldType, amount);
  }
  watchSnapshots(player, state);
  payDesired(player, state, desired);
  delete state._cache;
  sq.writeState(player, state);
}

function onSlots(player) {
  const sq = api();
  if (!sq || !sq.isMajor(player)) return;
  const state = sq.readState(player);
  state.usedDoctrines = state.usedDoctrines || {};
  let offer = null;
  let changed = false;
  for (const key in state.plots) {
    const slot = state.plots[key].slot1;
    if (!slot || !slot.archetype || slot.doctrine) continue;
    if (player.isHuman === false) {
      slot.doctrine = slot.archetype + "_0";
      changed = true;
      continue;
    }
    if (!offer) {
      const parts = key.split(",");
      offer = { x: Number(parts[0]), y: Number(parts[1]), building: slot.building, archetype: slot.archetype };
    }
  }
  const previous = state.doctrineOffer;
  state.doctrineOffer = offer;
  if (offer || previous) changed = true;
  if (changed) sq.writeState(player, state);
  const same = previous && offer && previous.x === offer.x && previous.y === offer.y && previous.archetype === offer.archetype;
  if (offer && !same && typeof engine !== "undefined") engine.trigger("sq-doctrine-offer", offer);
}

function choices() {
  const sq = api();
  const player = sq.playerFromId(GameContext.localPlayerID);
  if (!sq.isMajor(player)) return null;
  const state = sq.readState(player);
  const offer = state.doctrineOffer;
  if (!offer) return null;
  const options = doctrinesOf(offer.archetype).filter((doctrine) => {
    return doctrine.slot === 0 || !state.usedDoctrines[doctrine.id];
  });
  return { offer: offer, options: options };
}

function choose(x, y, id) {
  const sq = api();
  const doctrine = BY_ID[id];
  const player = sq.playerFromId(GameContext.localPlayerID);
  if (!doctrine || !sq.isMajor(player)) return false;
  const state = sq.readState(player);
  const offer = state.doctrineOffer;
  if (!offer || offer.x !== x || offer.y !== y || offer.archetype !== doctrine.archetype) return false;
  if (doctrine.slot !== 0 && state.usedDoctrines[id]) return false;
  const plot = state.plots[x + "," + y];
  if (!plot || !plot.slot1 || plot.slot1.doctrine) return false;
  plot.slot1.doctrine = id;
  if (doctrine.slot !== 0) state.usedDoctrines[id] = true;
  state.doctrineOffer = null;
  sq.writeState(player, state);
  apply(player);
  onSlots(player);
  if (typeof engine !== "undefined") engine.trigger("sq-doctrine-close");
  return true;
}

function onConstruct(data) {
  const sq = api();
  if (!data || !data.location) return;
  const info = GameInfo.Constructibles.lookup(data.constructibleType);
  if (!info || (info.ConstructibleClass !== "BUILDING" && info.ConstructibleClass !== "WONDER")) return;
  const city = sq.cityAt(data.location.x, data.location.y);
  const player = sq.playerFromCity(city);
  if (!sq.isMajor(player)) return;
  const state = sq.readState(player);
  burstPlots(player, state, "building", 1, city);
  sq.writeState(player, state);
}

function onCombat(data) {
  const sq = api();
  const owner = data && (data.attacker != null ? data.attacker : data.player);
  const player = sq.playerFromId(owner != null ? owner : GameContext.localPlayerID);
  if (!sq.isMajor(player)) return;
  const state = sq.readState(player);
  burstPlots(player, state, "kill", 1, null);
  sq.writeState(player, state);
}

function onDiplomacy() {
  const sq = api();
  const player = sq.playerFromId(GameContext.localPlayerID);
  if (!sq.isMajor(player)) return;
  const state = sq.readState(player);
  burstPlots(player, state, "diplomacy", 1, null);
  sq.writeState(player, state);
}

if (!globalThis.__SQ_DOCTRINE_BOUND && api()) {
  globalThis.__SQ_DOCTRINE_BOUND = true;
  api().doctrineChoices = choices;
  api().chooseDoctrine = choose;
  globalThis.SQDoctrine = { onSlots: onSlots, apply: apply };
  engine.on("ConstructibleBuildCompleted", (data) => {
    try { onConstruct(data); } catch (error) { console.warn("SQ doctrine construct", error); }
  });
  engine.on("UnitKilledInCombat", (data) => {
    try { onCombat(data); } catch (error) { console.warn("SQ doctrine combat", error); }
  });
  engine.on("DiplomacyEventCompleted", () => {
    try { onDiplomacy(); } catch (error) { console.warn("SQ doctrine diplomacy", error); }
  });
  console.log("SQ doctrines ready", (globalThis.SQ_DOCTRINES || []).length);
}
