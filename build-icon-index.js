const fs = require("fs");
const path = require("path");

const root = __dirname;
const iconsDir = path.join(root, "Icons");
const namesPath = path.join(root, "items.json");
const outPath = path.join(root, "icon-index.json");
const unturnedItemsDir = "D:\\SteamLibrary\\steamapps\\common\\Unturned\\Bundles\\Items";

function getDisplayName(value) {
  if (value == null) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    const jsonish = trimmed.replace(/^"+|"+$/g, "");
    const match = jsonish.match(/\bItemName\b"?\s*:\s*"?([^"]*)/i);
    return (match ? match[1] : jsonish).trim();
  }
  if (typeof value === "object") {
    for (const key of ["ItemName", "itemName", "Name", "name", "Title", "title"]) {
      if (value[key]) return getDisplayName(value[key]);
    }
  }
  return "";
}

const categoryRules = [
  ["attachments", /\b(scope|sight|iron sights|grip|barrel|suppressor|muzzle|bayonet|tactical|laser|rangefinder|bipod|choke|stock|attachment)\b/i],
  ["magazines", /\b(magazine|drum|clip|shells?|ammo box|rounds?)\b/i],
  ["guns", /\b(rifle|carbine|pistol|shotgun|sniper|smg|lmg|machine gun|bow|crossbow|launcher|eaglefire|maplestrike|zubeknakov|nykorev|timberwolf|honeybadger|heartbreaker|matamorez|shadowstalker|avenger|cobra|viper|tek low|ace|peacemaker|bluntforce|bulldog|scalar|yuri|grizzly|sabertooth|sportshot|schofield|colt|ekho|calling card|hells fury)\b/i],
  ["shirts", /\b(shirt|hoodie|parka|sweater|top|tunic|jacket|coat|ghillie top|poncho)\b/i],
  ["pants", /\b(pants|jeans|trousers|bottom|shorts|ghillie bottom)\b/i],
  ["vests", /\b(vest|armor|chest|plate carrier|carrier)\b/i],
  ["backpacks", /\b(backpack|pack|daypack|rucksack|knapsack|alicepack|duffle)\b/i],
  ["hats", /\b(hat|helmet|cap|beret|mask|balaclava|hood|tophat|crown|headphones|glasses|goggles|bandana|headlamp)\b/i],
  ["medical", /\b(medkit|bandage|dressing|splint|morphine|vaccine|vitamins|painkillers|antibiotics|bloodbag|suture|medic|health)\b/i],
  ["food", /\b(apple|banana|beans|beef|bread|cake|candy|carrot|chips|chocolate|corn|donut|fish|lettuce|mre|pasta|potato|rice|sandwich|soup|tomato|tuna|wheat|food|meal)\b/i],
  ["drinks", /\b(water|juice|soda|cola|bottle|canteen|milk|drink|coffee)\b/i],
  ["tools", /\b(axe|pickaxe|saw|hammer|wrench|blowtorch|jack|fishing rod|shovel|rake|tool|chainsaw)\b/i],
  ["melee", /\b(knife|katana|sword|bat|club|machete|spear|crowbar|pan|paddle|scythe|melee)\b/i],
  ["throwables", /\b(grenade|charge|mine|claymore|sticky|throwable|flare|smoke|molotov|detonator|explosive)\b/i],
  ["vehicles", /\b(car|truck|van|apc|tank|bike|bicycle|plane|helicopter|boat|vehicle|fuel|tire|engine|vehicle battery)\b/i],
  ["building", /\b(wall|floor|roof|pillar|post|doorway|window|ramp|stairs|foundation|garage|hatch|hole|slot|bridge|structure)\b/i],
  ["barricades", /\b(barricade|fortification|door|gate|ladder|storage|crate|locker|bedroll|cot|trap|wire|generator|light|sign|claim flag|pump|planter|safezone|barrier)\b/i],
  ["materials", /\b(log|stick|plank|board|metal|cloth|leather|rope|tape|glue|scrap|sheet|bar|wire|chemicals|fertilizer|raw|ore)\b/i],
  ["keys", /\b(key|ticket|token|coupon|crate|case|box|bundle|skin|mystery)\b/i],
];

const typeCategories = {
  gun: "guns",
  magazine: "magazines",
  sight: "attachments",
  tactical: "attachments",
  grip: "attachments",
  barrel: "attachments",
  shirt: "shirts",
  pants: "pants",
  vest: "vests",
  backpack: "backpacks",
  hat: "hats",
  mask: "hats",
  glasses: "hats",
  food: "food",
  water: "drinks",
  medical: "medical",
  medical_supply: "medical",
  tool: "tools",
  fisher: "tools",
  melee: "melee",
  throwable: "throwables",
  charge: "throwables",
  grenade: "throwables",
  vehicle_repair_tool: "vehicles",
  vehicle: "vehicles",
  structure: "building",
  barricade: "barricades",
  storage: "barricades",
  trap: "barricades",
  fuel: "vehicles",
  supply: "materials",
};

function categoryFor(name, type = "") {
  const typeKey = String(type).trim().toLowerCase();
  if (typeCategories[typeKey]) return typeCategories[typeKey];
  for (const [category, regex] of categoryRules) {
    if (regex.test(name)) return category;
  }
  return "other";
}

function parseLooseDat(text) {
  const data = {};
  for (const line of text.split(/\r?\n/)) {
    const clean = line.replace(/\s+\/\/.*$/, "").trim();
    if (!clean || clean === "[" || clean === "]" || clean === "{" || clean === "}") continue;
    const match = clean.match(/^([A-Za-z0-9_]+)\s+(.+)$/);
    if (!match) continue;
    data[match[1]] = match[2].replace(/^"|"$/g, "").trim();
  }
  return data;
}

function parseItemDat(text) {
  const data = {};
  for (const line of text.split(/\r?\n/)) {
    const clean = line.replace(/\s+\/\/.*$/, "").trim();
    if (!clean) break;
    const match = clean.match(/^([A-Za-z0-9_]+)\s+(.+)$/);
    if (!match) continue;
    data[match[1]] = match[2].replace(/^"|"$/g, "").trim();
  }
  return data;
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.dat$/i.test(entry.name) && !/^English\.dat$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function readGameMetadata() {
  const meta = {};
  for (const datPath of walkFiles(unturnedItemsDir)) {
    const dat = parseItemDat(fs.readFileSync(datPath, "utf8"));
    if (!dat.ID || !/^\d+$/.test(dat.ID)) continue;

    const englishPath = path.join(path.dirname(datPath), "English.dat");
    const english = fs.existsSync(englishPath)
      ? parseLooseDat(fs.readFileSync(englishPath, "utf8"))
      : {};

    meta[dat.ID] = {
      name: english.Name || "",
      type: dat.Type || "",
    };
  }
  return meta;
}

const names = fs.existsSync(namesPath) ? JSON.parse(fs.readFileSync(namesPath, "utf8")) : {};
const gameMeta = readGameMetadata();
const icons = fs.readdirSync(iconsDir)
  .filter((file) => /^\d+\.png$/i.test(file))
  .map((file) => path.basename(file, ".png"))
  .sort((a, b) => Number(a) - Number(b));

const items = icons.map((id) => {
  const game = gameMeta[id] || {};
  const name = game.name || getDisplayName(names[id]) || `Item ${id}`;
  const category = categoryFor(name, game.type);
  return {
    id,
    name,
    category,
    type: game.type || "",
    url: `Icons/${id}.png`,
    named: Boolean(game.name || getDisplayName(names[id])),
  };
});

const counts = items.reduce((acc, item) => {
  acc[item.category] = (acc[item.category] || 0) + 1;
  return acc;
}, {});

fs.writeFileSync(outPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  total: items.length,
  counts,
  items,
}, null, 2) + "\n");

console.log(`Wrote ${items.length} icons to ${path.basename(outPath)}`);
