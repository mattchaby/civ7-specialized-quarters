// Quartiers spécialisés : fondation (slot 1) et catalyseur (slot 2).
// Les spécialistes recopient déjà 100 % de l'adjacence vanilla ; ce script ne la modifie pas.
// Production et Militaire en catalyseur (Ageless sur une seule instance) ne sont pas appliqués.

const STATE_KEY = "SQ_STATE";
const ANSWER_KEY = "SQ_ANSWER";
const PENDING_KEY = "SQ_PENDING";

const YIELD_OF = {
  SCIENCE: "YIELD_SCIENCE",
  CULTURE: "YIELD_CULTURE",
  GOLD: "YIELD_GOLD",
  PRODUCTION: "YIELD_PRODUCTION",
  FOOD: "YIELD_FOOD",
  HAPPINESS: "YIELD_HAPPINESS",
  DIPLOMACY: "YIELD_DIPLOMACY"
};

const FOOD_IMPROVEMENTS = {
  IMPROVEMENT_FARM: true,
  IMPROVEMENT_FISHING_BOAT: true,
  IMPROVEMENT_FISHING_BOAT_RESOURCE: true
};

const EMBEDDED_ARCHETYPES = {
  BUILDING_ACADEMY: ["SCIENCE", null],
  BUILDING_ALTAR: ["HAPPINESS", null],
  BUILDING_AMPHITHEATER: ["CULTURE", null],
  BUILDING_ARENA: ["HAPPINESS", null],
  BUILDING_BARRACKS: ["PRODUCTION", "MILITARY"],
  BUILDING_BATH: ["FOOD", null],
  BUILDING_BLACKSMITH: ["PRODUCTION", null],
  BUILDING_BRICKYARD: ["PRODUCTION", null],
  BUILDING_FISHING_QUAY: ["FOOD", null],
  BUILDING_GARDEN: ["FOOD", "HAPPINESS"],
  BUILDING_GRANARY: ["FOOD", null],
  BUILDING_HARBOR: ["PRODUCTION", null],
  BUILDING_LIBRARY: ["SCIENCE", null],
  BUILDING_LIGHTHOUSE: ["GOLD", null],
  BUILDING_MARKET: ["GOLD", null],
  BUILDING_MONUMENT: ["CULTURE", "DIPLOMACY"],
  BUILDING_SAW_PIT: ["PRODUCTION", null],
  BUILDING_VILLA: ["HAPPINESS", "DIPLOMACY"],
  BUILDING_ARMORER: ["PRODUCTION", "MILITARY"],
  BUILDING_BANK: ["GOLD", null],
  BUILDING_BAZAAR: ["GOLD", null],
  BUILDING_DUNGEON: ["PRODUCTION", "DIPLOMACY"],
  BUILDING_GRISTMILL: ["FOOD", null],
  BUILDING_GUILDHALL: ["DIPLOMACY", "GOLD"],
  BUILDING_HOSPITAL: ["FOOD", null],
  BUILDING_KILN: ["CULTURE", null],
  BUILDING_MENAGERIE: ["HAPPINESS", null],
  BUILDING_OBSERVATORY: ["SCIENCE", null],
  BUILDING_PAVILION: ["CULTURE", null],
  BUILDING_SAWMILL: ["PRODUCTION", null],
  BUILDING_SHIPYARD: ["PRODUCTION", "MILITARY"],
  BUILDING_STONECUTTER: ["PRODUCTION", null],
  BUILDING_TAVERN: ["FOOD", "HAPPINESS"],
  BUILDING_TEMPLE: ["HAPPINESS", null],
  BUILDING_UNIVERSITY: ["SCIENCE", null],
  BUILDING_WHARF: ["FOOD", null],
  BUILDING_AIRFIELD: ["PRODUCTION", "MILITARY"],
  BUILDING_CANNERY: ["FOOD", null],
  BUILDING_CITY_PARK: ["HAPPINESS", null],
  BUILDING_DEPARTMENT_STORE: ["HAPPINESS", null],
  BUILDING_FACTORY: ["PRODUCTION", null],
  BUILDING_GROCER: ["FOOD", null],
  BUILDING_IRONWORKS: ["PRODUCTION", null],
  BUILDING_LABORATORY: ["SCIENCE", null],
  BUILDING_LAUNCH_PAD: ["SCIENCE", null],
  BUILDING_MILITARY_ACADEMY: ["PRODUCTION", "MILITARY"],
  BUILDING_MUSEUM: ["CULTURE", null],
  BUILDING_OPERA_HOUSE: ["CULTURE", "DIPLOMACY"],
  BUILDING_PORT: ["GOLD", null],
  BUILDING_RADIO_STATION: ["DIPLOMACY", "HAPPINESS"],
  BUILDING_RAIL_STATION: ["GOLD", "PRODUCTION"],
  BUILDING_SCHOOLHOUSE: ["SCIENCE", null],
  BUILDING_STOCK_EXCHANGE: ["GOLD", null],
  BUILDING_TENEMENT: ["FOOD", null]
};

const ARCHETYPES = {};
const warned = {};
let tableLoaded = false;

function warnOnce(key, message) {
  if (warned[key]) return;
  warned[key] = true;
  console.warn("SQ:", message);
}

function archetypeRow(primary, secondary) {
  return { primary: primary, secondary: secondary || null };
}

function installEmbeddedArchetypes() {
  for (const building in EMBEDDED_ARCHETYPES) {
    const pair = EMBEDDED_ARCHETYPES[building];
    ARCHETYPES[building] = archetypeRow(pair[0], pair[1]);
  }
}

function absorbRow(building, primary, secondary) {
  if (!building || !primary) return;
  ARCHETYPES[building] = archetypeRow(primary, secondary || null);
}

function loadArchetypeTable() {
  if (tableLoaded) return;
  tableLoaded = true;
  installEmbeddedArchetypes();
  try {
    const table = GameInfo.Mod_BuildingArchetypes;
    if (table && typeof table.length === "number" && table.length > 0) {
      for (let i = 0; i < table.length; i++) {
        const row = table[i];
        absorbRow(row.BuildingType, row.PrimaryArchetype, row.SecondaryArchetype);
      }
      console.log("SQ: archetypes loaded from Mod_BuildingArchetypes (" + table.length + ")");
      return;
    }
  } catch (error) {
    console.warn("SQ: GameInfo archetype table unavailable", error);
  }
  console.log("SQ: archetypes using embedded fallback");
}

function readProp(obj, key) {
  if (!obj || typeof obj.getProperty !== "function") return undefined;
  const direct = obj.getProperty(key);
  if (direct != null && direct !== "") return direct;
  try {
    if (typeof Database !== "undefined" && Database.makeHash) {
      return obj.getProperty(Database.makeHash(key));
    }
  } catch (error) {
    return direct;
  }
  return direct;
}

function writeProp(obj, key, value) {
  if (!obj || typeof obj.setProperty !== "function") return false;
  try {
    obj.setProperty(key, value);
    return true;
  } catch (error) {
    console.warn("SQ setProperty", key, error);
    return false;
  }
}

function blankState() {
  return {
    age: "",
    celebrations: 0,
    wasCelebrating: false,
    lastGrantTurn: -1,
    probed: false,
    plots: {},
    militaryPercent: {}
  };
}

function loadState(player) {
  const raw = readProp(player, STATE_KEY);
  if (!raw || typeof raw !== "string") return blankState();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return blankState();
    parsed.plots = parsed.plots || {};
    parsed.militaryPercent = parsed.militaryPercent || {};
    parsed.celebrations = parsed.celebrations || 0;
    return parsed;
  } catch (error) {
    return blankState();
  }
}

function saveState(player, state) {
  writeProp(player, STATE_KEY, JSON.stringify(state));
}

function playerIdOf(player) {
  if (!player) return null;
  if (typeof player.id === "number" || typeof player.id === "string") return player.id;
  if (player.id && player.id.id != null) return player.id.id;
  return player.id;
}

function asList(value) {
  if (!value) return [];
  if (typeof value.length === "number") {
    const list = [];
    for (let i = 0; i < value.length; i++) list.push(value[i]);
    return list;
  }
  return [];
}

function numericPlayerId(value, depth) {
  if (value == null || depth > 4) return null;
  if (typeof value === "number" || typeof value === "bigint") return value;
  if (typeof value !== "object") return null;
  if (value.Cities && (typeof value.id === "number" || typeof value.id === "bigint")) return value.id;
  if (typeof value.owner === "number" || typeof value.owner === "bigint") return value.owner;
  if (value.id != null && value.id !== value) return numericPlayerId(value.id, (depth || 0) + 1);
  return null;
}

function playerFromId(id) {
  if (id && id.Cities) return id;
  const numeric = numericPlayerId(id, 0);
  if (numeric == null) return null;
  try {
    return Players.get(numeric);
  } catch (error) {
    warnOnce("player-get", "Players.get rejected " + numeric);
    return null;
  }
}

function playerFromCity(city) {
  if (!city) return null;
  if (city.owner && city.owner.Cities) return city.owner;
  return playerFromId(city.owner);
}

function isPlayableMajor(player) {
  if (!player || player.isAlive === false) return false;
  if (player.isIndependent) return false;
  if (player.isMajor === false) return false;
  return true;
}

function eachMajor(fn) {
  let ids = [];
  try {
    if (Players.getWasEverAliveIds) ids = asList(Players.getWasEverAliveIds());
    else if (Players.getEverAlive) ids = asList(Players.getEverAlive());
  } catch (error) {
    console.warn("SQ players", error);
    return;
  }
  for (const entry of ids) {
    const player = playerFromId(entry);
    if (isPlayableMajor(player)) fn(player);
  }
}

function plotIndex(x, y) {
  if (GameplayMap.getIndexFromXY) return GameplayMap.getIndexFromXY(x, y);
  if (GameplayMap.getIndexFromLocation) return GameplayMap.getIndexFromLocation({ x: x, y: y });
  return null;
}

function locationFromIndex(index) {
  if (GameplayMap.getLocationFromIndex) return GameplayMap.getLocationFromIndex(index);
  return null;
}

function cityAt(x, y) {
  const index = plotIndex(x, y);
  if (index == null || !Cities.getAtLocation) return null;
  return Cities.getAtLocation(index);
}

function cityKey(city) {
  if (!city) return "none";
  if (city.id == null) return String(city.name);
  if (typeof city.id === "object") return String(city.id.id ?? city.id);
  return String(city.id);
}

function constructibleType(instance) {
  if (!instance) return null;
  const info = GameInfo.Constructibles.lookup(instance.type);
  return info?.ConstructibleType || null;
}

function buildingsAt(x, y) {
  let ids = [];
  try {
    if (MapConstructibles.getConstructibles) ids = asList(MapConstructibles.getConstructibles(x, y));
    else if (MapConstructibles.getHiddenFilteredConstructibles) ids = asList(MapConstructibles.getHiddenFilteredConstructibles(x, y));
  } catch (error) {
    return [];
  }
  const found = [];
  for (const id of ids) {
    const instance = Constructibles.getByComponentID(id);
    if (!instance || instance.complete === false) continue;
    const type = constructibleType(instance);
    if (!type || !ARCHETYPES[type]) continue;
    const info = GameInfo.Constructibles.lookup(instance.type);
    if (info && info.ConstructibleClass && info.ConstructibleClass !== "BUILDING") continue;
    if (!found.includes(type)) found.push(type);
  }
  return found;
}

function rememberAge(state) {
  const age = String(Game && Game.age != null ? Game.age : "");
  if (state.age && age && state.age !== age) {
    state.celebrations = 0;
    state.wasCelebrating = false;
  }
  state.age = age;
}

function publishPending(player, x, y, building, slot) {
  const row = ARCHETYPES[building];
  if (!row || !row.secondary || player.isHuman === false) return;
  const payload = {
    x: x,
    y: y,
    slot: slot,
    building: building,
    primary: row.primary,
    secondary: row.secondary
  };
  const encoded = JSON.stringify(payload);
  if (readProp(player, PENDING_KEY) === encoded) return;
  writeProp(player, PENDING_KEY, encoded);
}

function reconcile(player, x, y, present) {
  const state = loadState(player);
  const key = x + "," + y;
  const prev = state.plots[key] || {};
  const known = {};
  if (prev.slot1 && prev.slot1.building) known[prev.slot1.building] = prev.slot1.archetype;
  if (prev.slot2 && prev.slot2.building) known[prev.slot2.building] = prev.slot2.archetype;
  const ordered = [];
  if (prev.slot1 && present.includes(prev.slot1.building)) ordered.push(prev.slot1.building);
  if (prev.slot2 && present.includes(prev.slot2.building) && ordered.indexOf(prev.slot2.building) === -1) {
    ordered.push(prev.slot2.building);
  }
  for (const type of present) {
    if (ordered.indexOf(type) === -1) ordered.push(type);
  }
  if (ordered.length === 0) {
    delete state.plots[key];
    saveState(player, state);
    return;
  }
  const next = { slot1: null, slot2: null };
  for (let index = 0; index < 2; index++) {
    const type = ordered[index];
    if (!type) continue;
    const row = ARCHETYPES[type];
    let archetype;
    if (Object.prototype.hasOwnProperty.call(known, type)) archetype = known[type];
    else if (!row.secondary || player.isHuman === false) archetype = row.primary;
    else archetype = null;
    next[index === 0 ? "slot1" : "slot2"] = { building: type, archetype: archetype };
  }
  state.plots[key] = next;
  saveState(player, state);
  if (next.slot1 && next.slot1.archetype == null) publishPending(player, x, y, next.slot1.building, 1);
  else if (next.slot2 && next.slot2.archetype == null) publishPending(player, x, y, next.slot2.building, 2);
}

function handleConstruct(data, removed) {
  loadArchetypeTable();
  const info = data ? GameInfo.Constructibles.lookup(data.constructibleType) : null;
  const type = info ? info.ConstructibleType : null;
  const loc = data ? data.location : null;
  if (!loc || loc.x == null || loc.y == null) return;
  const player = playerFromCity(cityAt(loc.x, loc.y));
  if (!isPlayableMajor(player)) return;
  let present = buildingsAt(loc.x, loc.y);
  if (!removed && type && ARCHETYPES[type] && present.indexOf(type) === -1) present.push(type);
  if (removed && type) present = present.filter((item) => item !== type);
  reconcile(player, loc.x, loc.y, present);
  applyBonuses(player);
}

function consumeAnswer(payload) {
  if (!payload || payload.x == null || payload.y == null) return;
  const player = playerFromCity(cityAt(payload.x, payload.y));
  if (!isPlayableMajor(player)) return;
  const state = loadState(player);
  const plot = state.plots[payload.x + "," + payload.y];
  if (!plot) return;
  const slot = payload.slot === 2 ? plot.slot2 : plot.slot1;
  if (!slot || slot.building !== payload.building) return;
  const row = ARCHETYPES[slot.building];
  if (!row) return;
  if (payload.archetype !== row.primary && payload.archetype !== row.secondary) return;
  slot.archetype = payload.archetype;
  saveState(player, state);
  applyBonuses(player);
  const pending = readProp(player, PENDING_KEY);
  if (typeof pending === "string" && pending.indexOf('"building":"' + payload.building + '"') !== -1) {
    writeProp(player, PENDING_KEY, "");
  }
}

function consumeStoredAnswer(player) {
  const raw = readProp(player, ANSWER_KEY);
  if (!raw || typeof raw !== "string") return;
  writeProp(player, ANSWER_KEY, "");
  try {
    consumeAnswer(JSON.parse(raw));
  } catch (error) {
    console.warn("SQ answer", error);
  }
}

function scanPlayer(player) {
  const ids = player.Cities && player.Cities.getCityIds ? asList(player.Cities.getCityIds()) : [];
  for (const id of ids) {
    const city = Cities.get(id);
    if (!city || typeof city.getPurchasedPlots !== "function") continue;
    let plots = [];
    try {
      plots = asList(city.getPurchasedPlots());
    } catch (error) {
      continue;
    }
    for (const index of plots) {
      const loc = locationFromIndex(index);
      if (!loc) continue;
      const present = buildingsAt(loc.x, loc.y);
      if (present.length > 0) reconcile(player, loc.x, loc.y, present);
    }
  }
  const state = loadState(player);
  let changed = false;
  for (const key in state.plots) {
    const parts = key.split(",");
    if (buildingsAt(Number(parts[0]), Number(parts[1])).length === 0) {
      delete state.plots[key];
      changed = true;
    }
  }
  if (changed) saveState(player, state);
}

function countMasteries(player, progression) {
  if (!progression || typeof progression.getTreeType !== "function" || !Game.ProgressionTrees) return 0;
  let treeType = null;
  try {
    treeType = progression.getTreeType();
  } catch (error) {
    return 0;
  }
  if (!treeType) return 0;
  const structure = [];
  const seen = {};
  if (Game.ProgressionTrees.getTreeStructure) {
    for (const node of asList(Game.ProgressionTrees.getTreeStructure(treeType))) structure.push(node);
  }
  try {
    const tree = Game.ProgressionTrees.getTree(playerIdOf(player), treeType);
    for (const node of asList(tree && tree.nodes)) structure.push(node);
  } catch (error) {
    warnOnce("tree", "getTree failed");
  }
  if (structure.length === 0) return 0;
  const full = typeof ProgressionTreeNodeState !== "undefined" ? ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED : null;
  const id = playerIdOf(player);
  let count = 0;
  for (const node of structure) {
    const nodeType = node && (node.nodeType || node.ProgressionTreeNodeType) ? node.nodeType || node.ProgressionTreeNodeType : node;
    if (!nodeType || seen[nodeType]) continue;
    seen[nodeType] = true;
    let mastered = false;
    if (full != null) {
      try {
        mastered = Game.ProgressionTrees.getNodeState(id, nodeType) === full;
      } catch (error) {
        mastered = false;
      }
    }
    if (!mastered && Game.ProgressionTrees.getNode) {
      try {
        const data = Game.ProgressionTrees.getNode(id, nodeType);
        if (data && (data.isMastered || data.mastered)) mastered = true;
        if (data && typeof data.depthUnlocked === "number" && data.depthUnlocked >= 2) mastered = true;
      } catch (error) {
        mastered = false;
      }
    }
    if (mastered) count += 1;
  }
  return count;
}

function countFoodImprovements(city) {
  if (!city || typeof city.getPurchasedPlots !== "function") return 0;
  let plots = [];
  try {
    plots = asList(city.getPurchasedPlots());
  } catch (error) {
    return 0;
  }
  let count = 0;
  for (const index of plots) {
    const loc = locationFromIndex(index);
    if (!loc) continue;
    let ids = [];
    try {
      ids = MapConstructibles.getConstructibles ? asList(MapConstructibles.getConstructibles(loc.x, loc.y)) : [];
    } catch (error) {
      continue;
    }
    for (const id of ids) {
      const type = constructibleType(Constructibles.getByComponentID(id));
      if (FOOD_IMPROVEMENTS[type]) count += 1;
    }
  }
  return count;
}

function assignedResources(city) {
  try {
    const list = city.Resources && city.Resources.getAssignedResources ? asList(city.Resources.getAssignedResources()) : [];
    return list.length;
  } catch (error) {
    return 0;
  }
}

function specialistsAt(city, x, y) {
  if (!city || !city.Workers || typeof city.Workers.GetTilePlacementInfo !== "function") return 0;
  const index = plotIndex(x, y);
  if (index == null) return 0;
  try {
    const info = city.Workers.GetTilePlacementInfo(index);
    return info && info.NumWorkers ? info.NumWorkers : 0;
  } catch (error) {
    return 0;
  }
}

function connectedTowns(city) {
  if (!city || typeof city.getConnectedCities !== "function") return [];
  let ids = [];
  try {
    ids = asList(city.getConnectedCities());
  } catch (error) {
    return [];
  }
  const towns = [];
  for (const id of ids) {
    const other = id && id.isTown != null ? id : Cities.get(id);
    if (other && other.isTown) towns.push(other);
  }
  return towns;
}

function functionNames(obj) {
  const names = [];
  if (!obj) return names;
  for (const key in obj) {
    try {
      if (typeof obj[key] === "function") names.push(key);
    } catch (error) {
      continue;
    }
  }
  return names;
}

function probeOnce(player, city) {
  const state = loadState(player);
  if (state.probed) return;
  state.probed = true;
  saveState(player, state);
  console.log("SQ probe Treasury", functionNames(player.Treasury).join(" "));
  console.log("SQ probe Techs", functionNames(player.Techs).join(" "));
  console.log("SQ probe Culture", functionNames(player.Culture).join(" "));
  console.log("SQ probe Happiness", functionNames(player.Happiness).join(" "));
  console.log("SQ probe Growth", functionNames(city && city.Growth).join(" "));
  console.log("SQ probe Production", functionNames(city && city.Production).join(" "));
  console.log("SQ probe Yields", functionNames(city && city.Yields).join(" "));
  console.log("SQ probe Resources", functionNames(city && city.Resources).join(" "));
  console.log("SQ probe Workers", functionNames(city && city.Workers).join(" "));
}

function callMethod(obj, name, args) {
  if (!obj || typeof obj[name] !== "function") return false;
  try {
    obj[name].apply(obj, args);
    return true;
  } catch (error) {
    console.warn("SQ", name, error);
    return false;
  }
}

function grantYield(player, city, yieldType, amount) {
  if (!amount) return;
  if (yieldType === "YIELD_GOLD") {
    if (callMethod(player.Treasury, "changeGoldBalance", [amount, -1])) return;
  }
  if (yieldType === "YIELD_DIPLOMACY") {
    if (callMethod(player.DiplomacyTreasury, "changeDiplomacyBalance", [amount])) return;
  }
  if (yieldType === "YIELD_SCIENCE") {
    if (callMethod(player.Techs, "changeProgress", [amount])) return;
    if (callMethod(player.Techs, "grantYield", [amount])) return;
    if (callMethod(player.Techs, "addYield", [yieldType, amount])) return;
  }
  if (yieldType === "YIELD_CULTURE") {
    if (callMethod(player.Culture, "changeProgress", [amount])) return;
    if (callMethod(player.Culture, "grantYield", [amount])) return;
    if (callMethod(player.Culture, "addYield", [yieldType, amount])) return;
  }
  if (yieldType === "YIELD_FOOD" && city) {
    if (callMethod(city.Growth, "changeFood", [amount])) return;
    if (callMethod(city.Growth, "addFood", [amount])) return;
    if (callMethod(city.Growth, "changeProgress", [amount])) return;
  }
  if (yieldType === "YIELD_PRODUCTION" && city) {
    if (callMethod(city.Production, "changeProduction", [amount])) return;
    if (callMethod(city.Production, "addProduction", [amount])) return;
    if (callMethod(city.Production, "changeProgress", [amount])) return;
  }
  if (yieldType === "YIELD_HAPPINESS") {
    if (callMethod(player.Happiness, "changeBalance", [amount])) return;
    if (callMethod(player.Happiness, "changeHappiness", [amount])) return;
    if (callMethod(player.Happiness, "addHappiness", [amount])) return;
  }
  if (city && callMethod(city.Yields, "changeYield", [yieldType, amount])) return;
  if (city && callMethod(city.Yields, "addYield", [yieldType, amount])) return;
  warnOnce("grant-" + yieldType, "no grant method for " + yieldType);
}

function applyMilitary(city, percent, state) {
  if (!city) return;
  const key = cityKey(city);
  const previous = state.militaryPercent[key] || 0;
  if (previous === percent) return;
  const delta = percent - previous;
  const production = city.Production;
  let applied = false;
  if (callMethod(production, "setUnitProductionPercent", ["CORE_CLASS_MILITARY", percent])) applied = true;
  else if (callMethod(production, "adjustUnitProductionPercent", ["CORE_CLASS_MILITARY", delta])) applied = true;
  else if (callMethod(production, "changeUnitProductionPercent", ["CORE_CLASS_MILITARY", delta])) applied = true;
  if (applied) state.militaryPercent[key] = percent;
  else if (percent !== 0) warnOnce("military", "no military production percent method");
}

function catalystStacks(player, city, catalyst) {
  if (catalyst === "PRODUCTION" || catalyst === "MILITARY") {
    warnOnce("ageless", "Production and Military catalysts do not grant Ageless on a single building");
    return 0;
  }
  if (catalyst === "SCIENCE") return countMasteries(player, player.Techs);
  if (catalyst === "CULTURE") return countMasteries(player, player.Culture);
  if (catalyst === "GOLD") return assignedResources(city);
  if (catalyst === "FOOD") return countFoodImprovements(city);
  if (catalyst === "HAPPINESS") return loadState(player).celebrations || 0;
  return 0;
}

function ensureBucket(map, city) {
  const key = cityKey(city);
  if (!map[key]) map[key] = { city: city, yields: {}, military: 0 };
  return map[key];
}

function addYield(bucket, yieldType, amount) {
  if (!yieldType || !amount) return;
  bucket.yields[yieldType] = (bucket.yields[yieldType] || 0) + amount;
}

function addMilitary(bucket, percent) {
  if (!percent) return;
  bucket.military += percent;
}

function bumpMax(map, city, yieldType, military, amount) {
  const bucket = ensureBucket(map, city);
  if (military) {
    if (amount > bucket.military) bucket.military = amount;
    return;
  }
  const prev = bucket.yields[yieldType] || 0;
  if (amount > prev) bucket.yields[yieldType] = amount;
}

function applyBonuses(player) {
  const state = loadState(player);
  const direct = {};
  const exported = {};
  let sampleCity = null;
  for (const key in state.plots) {
    const plot = state.plots[key];
    const foundation = plot.slot1;
    const catalyst = plot.slot2;
    if (!foundation || !foundation.archetype || !catalyst || !catalyst.archetype) continue;
    const parts = key.split(",");
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const city = cityAt(x, y);
    if (!city) continue;
    sampleCity = sampleCity || city;
    if (catalyst.archetype === "DIPLOMACY") {
      const amount = 1 + specialistsAt(city, x, y);
      const military = foundation.archetype === "MILITARY";
      const yieldType = military ? null : YIELD_OF[foundation.archetype];
      const percent = military ? amount * 5 : 0;
      for (const town of connectedTowns(city)) {
        bumpMax(exported, town, yieldType, military, military ? percent : amount);
      }
      continue;
    }
    const stacks = catalystStacks(player, city, catalyst.archetype);
    if (!stacks) continue;
    const bucket = ensureBucket(direct, city);
    if (foundation.archetype === "MILITARY") addMilitary(bucket, stacks * 5);
    else addYield(bucket, YIELD_OF[foundation.archetype], stacks);
  }
  probeOnce(player, sampleCity);
  const fresh = loadState(player);
  const turn = typeof Game.turn === "number" ? Game.turn : 0;
  if (fresh.grantTurn !== turn) {
    fresh.grantTurn = turn;
    fresh.granted = {};
  }
  fresh.granted = fresh.granted || {};
  const pay = (bucket) => {
    for (const yieldType in bucket.yields) {
      const desired = bucket.yields[yieldType];
      const grantKey = cityKey(bucket.city) + ":" + yieldType;
      const already = fresh.granted[grantKey] || 0;
      if (desired > already) grantYield(player, bucket.city, yieldType, desired - already);
      fresh.granted[grantKey] = desired;
    }
    applyMilitary(bucket.city, bucket.military, fresh);
  };
  for (const key in direct) pay(direct[key]);
  for (const key in exported) pay(exported[key]);
  saveState(player, fresh);
}

function onPlayerTurn(player) {
  if (!isPlayableMajor(player)) return;
  loadArchetypeTable();
  consumeStoredAnswer(player);
  const state = loadState(player);
  rememberAge(state);
  saveState(player, state);
  scanPlayer(player);
  applyBonuses(player);
}

const ARCHETYPE_NAMES = ["SCIENCE", "CULTURE", "GOLD", "PRODUCTION", "FOOD", "HAPPINESS", "MILITARY", "DIPLOMACY"];

function parseChoiceStory(type) {
  if (!type || type.indexOf("SQ_") !== 0) return null;
  const parts = type.split("_");
  const archetype = parts[parts.length - 1];
  if (ARCHETYPE_NAMES.indexOf(archetype) === -1) return null;
  if (!/^[0-9]+$/.test(parts[parts.length - 2] || "")) return null;
  const building = "BUILDING_" + parts.slice(1, parts.length - 2).join("_");
  if (!ARCHETYPES[building]) return null;
  return { building: building, archetype: archetype };
}

function collectStrings(value, found) {
  if (value == null) return;
  if (typeof value === "string") {
    found.push(value);
    return;
  }
  if (typeof value !== "object") return;
  for (const key in value) {
    try {
      collectStrings(value[key], found);
    } catch (error) {
      continue;
    }
  }
}

function applyChoice(player, building, archetype) {
  const row = ARCHETYPES[building];
  if (!row || (archetype !== row.primary && archetype !== row.secondary)) return false;
  const state = loadState(player);
  let applied = false;
  for (const key in state.plots) {
    const plot = state.plots[key];
    for (const slotName of ["slot1", "slot2"]) {
      const slot = plot[slotName];
      if (slot && slot.building === building && slot.archetype == null) {
        slot.archetype = archetype;
        applied = true;
      }
    }
  }
  if (!applied) return false;
  saveState(player, state);
  writeProp(player, PENDING_KEY, "");
  applyBonuses(player);
  return true;
}

function onNarrativeChoice(data) {
  const player = playerFromId(data && (data.player != null ? data.player : data.playerID));
  if (!isPlayableMajor(player) && data && data.player == null) return;
  const target = isPlayableMajor(player) ? player : null;
  const strings = [];
  collectStrings(data, strings);
  for (const value of strings) {
    const parsed = parseChoiceStory(value);
    if (parsed && target && applyChoice(target, parsed.building, parsed.archetype)) return;
  }
}

function watchNarrativeChoices() {
  if (!Game || !Game.PlayerOperations || Game.PlayerOperations.__sqWrapped) return;
  const operations = Game.PlayerOperations;
  const original = operations.sendRequest;
  if (typeof original !== "function") return;
  operations.sendRequest = function(playerId, operation, args) {
    try {
      const operationName = operation && operation.toString ? operation.toString() : String(operation);
      if (operationName.indexOf("NARRATIVE_STORY") !== -1 && args && args.TargetType) {
        const parsed = parseChoiceStory(args.TargetType);
        const player = playerFromId(playerId);
        if (parsed && isPlayableMajor(player)) applyChoice(player, parsed.building, parsed.archetype);
      }
    } catch (error) {
      console.warn("SQ narrative choice", error);
    }
    return original.apply(this, arguments);
  };
  operations.__sqWrapped = true;
}

function onGoldenAge() {
  eachMajor((player) => {
    const state = loadState(player);
    rememberAge(state);
    const celebrating = !!(player.Happiness && player.Happiness.isInGoldenAge && player.Happiness.isInGoldenAge());
    if (celebrating && !state.wasCelebrating) state.celebrations += 1;
    state.wasCelebrating = celebrating;
    saveState(player, state);
  });
}

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

function warehouseKind(building) {
  if (FOOD_WAREHOUSES[building]) return "FOOD";
  if (PRODUCTION_WAREHOUSES[building]) return "PRODUCTION";
  return null;
}

function quarterInfo(x, y) {
  loadArchetypeTable();
  const city = cityAt(x, y);
  const player = playerFromCity(city);
  if (!isPlayableMajor(player)) return null;
  const plot = loadState(player).plots[x + "," + y];
  if (!plot || !plot.slot1) return null;
  const catalyst = plot.slot2;
  let amount = 0;
  if (plot.slot1.archetype && catalyst && catalyst.archetype && catalyst.archetype !== "DIPLOMACY" && catalyst.archetype !== "PRODUCTION" && catalyst.archetype !== "MILITARY") {
    amount = catalystStacks(player, city, catalyst.archetype);
  } else if (plot.slot1.archetype && catalyst && catalyst.archetype === "DIPLOMACY") {
    amount = 1 + specialistsAt(city, x, y);
  }
  return {
    foundation: plot.slot1,
    catalyst: catalyst,
    amount: amount,
    yieldType: plot.slot1.archetype && plot.slot1.archetype !== "MILITARY" ? YIELD_OF[plot.slot1.archetype] : null,
    warehouse: catalyst ? warehouseKind(catalyst.building) : null
  };
}

globalThis.SQ = {
  quarterInfo: quarterInfo,
  warehouseKind: warehouseKind,
  archetypes: ARCHETYPES
};

loadArchetypeTable();
if (globalThis.__SQ_BOUND) {
  console.log("SQ synergy gameplay already bound");
} else {
  globalThis.__SQ_BOUND = true;
  console.log("SQ synergy gameplay loaded");
  watchNarrativeChoices();
engine.on("NarrativeChoiceMade", (data) => {
  try {
    onNarrativeChoice(data);
  } catch (error) {
    console.error("SQ narrative", error);
  }
});
engine.on("ConstructibleBuildCompleted", (data) => {
  try {
    handleConstruct(data, false);
  } catch (error) {
    console.error("SQ construct", error);
  }
});
engine.on("ConstructibleRemovedFromMap", (data) => {
  try {
    handleConstruct(data, true);
  } catch (error) {
    console.error("SQ remove", error);
  }
});
engine.on("TurnBegin", (arg) => {
  try {
    const player = playerFromId(arg);
    if (isPlayableMajor(player)) onPlayerTurn(player);
  } catch (error) {
    console.error("SQ turn", error);
  }
});
engine.on("PlayerGoldenAgeChanged", () => {
  try {
    onGoldenAge();
  } catch (error) {
    console.error("SQ celebration", error);
  }
});
engine.on("sq-archetype-chosen", (payload) => {
  try {
    consumeAnswer(payload);
  } catch (error) {
    console.error("SQ choice", error);
  }
});
engine.on("LocalPlayerTurnBegin", () => {
  try {
    const player = Players.get(GameContext.localPlayerID);
    if (isPlayableMajor(player)) onPlayerTurn(player);
  } catch (error) {
    console.error("SQ local turn", error);
  }
});
engine.on("GameStarted", () => {
  try {
    eachMajor(scanPlayer);
  } catch (error) {
    console.error("SQ start", error);
  }
});
}
