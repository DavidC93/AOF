// ===== Age of Fun - Resource Management Core =====

// === Rarity System ===
const RARITY = {
    common: { name: 'נפוץ', mult: 1, color: '#a0a0a0' },
    uncommon: { name: 'שכיח', mult: 2, color: '#40c070' },
    rare: { name: 'נדיר', mult: 3, color: '#4090ff' },
    epic: { name: 'עילאי', mult: 4, color: '#b040e0' },
    legendary: { name: 'אגדי', mult: 5, color: '#ff9020' }
};

// === Resource Definitions ===
const basicRes = {
    wood: { name: 'עץ', icon: '🌲', rarity: 'common' },
    stone: { name: 'אבן', icon: '🪨', rarity: 'common' },
    wheat: { name: 'חיטה', icon: '🌾', rarity: 'common' },
    wool: { name: 'צמר', icon: '🐑', rarity: 'common' },
    ore: { name: 'עפרת ברזל', icon: '⛰️', rarity: 'common' },
    leather: { name: 'עור', icon: '🦌', rarity: 'common' },
    coal: { name: 'פחם', icon: '⚫', rarity: 'common' },
    nickelOre: { name: 'עפרת ניקל', icon: '💎', rarity: 'rare' }
};

const advRes = {
    plank: { name: 'קרש', icon: '🪵', rarity: 'common', from: 'wood', cost: 3 },
    brick: { name: 'לבנה', icon: '🧱', rarity: 'common', from: 'stone', cost: 3 },
    bread: { name: 'לחם', icon: '🍞', rarity: 'common', from: 'wheat', cost: 3 },
    cloth: { name: 'בד', icon: '🧵', rarity: 'common', from: 'wool', cost: 3 },
    steel: { name: 'פלדה', icon: '⚙️', rarity: 'common', from: 'ore', cost: 3 }
};

// Backwards-compatible icon lookup
const icons = {};
for (const k in basicRes) icons[k] = basicRes[k].icon;
for (const k in advRes) icons[k] = advRes[k].icon;
icons.empty = '🏳️';

// Military config - loaded from DB, these are fallback defaults
let militaryConfig = [
    { id: 'swords', category: 'weapon', name: 'חרב', icon: '🗡️', power: 0, cost: { steel: 2 }, sort_order: 1 },
    { id: 'armors', category: 'weapon', name: 'שריון', icon: '🦺', power: 0, cost: { steel: 2 }, sort_order: 2 },
    { id: 'shields', category: 'weapon', name: 'מגן', icon: '💠', power: 0, cost: { steel: 4 }, sort_order: 3 },
    { id: 'bows', category: 'weapon', name: 'קשת (נשק)', icon: '🏹', power: 0, cost: { plank: 3 }, sort_order: 4 },
    { id: 'horses', category: 'weapon', name: 'סוס', icon: '🐎', power: 0, cost: { bread: 5 }, sort_order: 5 },
    { id: 'archers', category: 'unit', name: 'קשת', icon: '🎯', power: 1, cost: { people: 1, bows: 1 }, sort_order: 10, hp: 8, atk: 3, rate: 1.5, range_m: 10, speed: 1.2, accuracy: 0.85, armor: 5, penetration: 10, is_ranged: true, shape: 'triangle', color: '#6ff0b0' },
    { id: 'warriors', category: 'unit', name: 'לוחם', icon: '⚔️', power: 2, cost: { people: 1, swords: 1, armors: 1 }, sort_order: 11, hp: 10, atk: 2, rate: 1.0, range_m: 1, speed: 1.0, accuracy: 0.90, armor: 10, penetration: 0, is_ranged: false, shape: 'circle', color: '#6aa7ff' },
    { id: 'knights', category: 'unit', name: 'אביר', icon: '🏇', power: 3, cost: { people: 1, swords: 1, armors: 1, shields: 1, horses: 1 }, sort_order: 12, hp: 20, atk: 5, rate: 1.2, range_m: 2, speed: 2.2, accuracy: 0.80, armor: 20, penetration: 0, is_ranged: false, shape: 'square', color: '#9aa7ff' },
];

function getMilItem(id) { return militaryConfig.find(m => m.id === id); }

async function loadMilitaryConfig() {
    try {
        const res = await fetch('/.netlify/functions/military-config');
        const data = await res.json();
        if (data.config && data.config.length > 0) {
            militaryConfig = data.config;
            console.log('Military config loaded from DB');
        }
    } catch (e) { console.warn('Using fallback military config:', e.message); }
}

// Add military icons
icons.swords = '🗡️'; icons.armors = '🦺'; icons.shields = '💠'; icons.bows = '🏹'; icons.horses = '🐎';
icons.archers = '🎯'; icons.warriors = '⚔️'; icons.knights = '🏇';

// Craft map: advanced -> { basic, cost }
const craftMap = {};
for (const k in advRes) craftMap[k] = advRes[k].from;

const validTileNumbers = [4, 5, 6, 7, 8, 9];

// Market prices: base sell/buy, multiplied by rarity
const basePrice = { basic: { sell: 1, buy: 2 }, adv: { sell: 3, buy: 6 } };
function getPrice(resId) {
    const info = basicRes[resId] || advRes[resId];
    const mult = info ? RARITY[info.rarity].mult : 1;
    const base = basicRes[resId] ? basePrice.basic : basePrice.adv;
    return { sell: base.sell * mult, buy: base.buy * mult };
}

// === Building Definitions ===
const BUILDINGS = {
    forest: {
        name: 'יער', icon: '🌳',
        tiers: [
            { minLevel: 1, resources: [{ res: 'wood', pct: 100 }] },
            { minLevel: 2, resources: [{ res: 'wood', pct: 75 }, { res: 'coal', pct: 25 }] },
            { minLevel: 4, resources: [{ res: 'wood', pct: 60 }, { res: 'coal', pct: 25 }, { res: 'leather', pct: 15 }] }
        ]
    },
    quarry: {
        name: 'מחצבה', icon: '⛏️',
        tiers: [
            { minLevel: 1, resources: [{ res: 'stone', pct: 100 }] },
            { minLevel: 2, resources: [{ res: 'stone', pct: 70 }, { res: 'ore', pct: 30 }] },
            { minLevel: 4, resources: [{ res: 'stone', pct: 55 }, { res: 'ore', pct: 30 }, { res: 'coal', pct: 15 }] }
        ]
    },
    farm: {
        name: 'חווה', icon: '🏡',
        tiers: [
            { minLevel: 1, resources: [{ res: 'wheat', pct: 100 }] },
            { minLevel: 2, resources: [{ res: 'wheat', pct: 50 }, { res: 'wool', pct: 50 }] },
            { minLevel: 3, resources: [{ res: 'wheat', pct: 40 }, { res: 'wool', pct: 40 }, { res: 'leather', pct: 20 }] }
        ]
    },
    mine: {
        name: 'מכרה', icon: '🏔️',
        tiers: [
            { minLevel: 1, resources: [{ res: 'ore', pct: 100 }] },
            { minLevel: 2, resources: [{ res: 'ore', pct: 65 }, { res: 'coal', pct: 35 }] },
            { minLevel: 5, resources: [{ res: 'ore', pct: 60 }, { res: 'coal', pct: 30 }, { res: 'nickelOre', pct: 10 }] }
        ]
    }
};

const buildingTypes = Object.keys(BUILDINGS);

// Get active production tier for a building at given level
function getProductionTier(buildingType, level) {
    const b = BUILDINGS[buildingType];
    if (!b) return null;
    let active = b.tiers[0];
    for (const tier of b.tiers) {
        if (level >= tier.minLevel) active = tier;
    }
    return active;
}

// Produce resources from a building tile
function produceFromBuilding(tile) {
    if (!tile.type || tile.type === 'empty' || !BUILDINGS[tile.type]) return [];
    const tier = getProductionTier(tile.type, tile.level);
    if (!tier) return [];
    const total = tile.level;
    const produced = [];
    let remaining = total;

    // Sort by pct descending, distribute
    const sorted = [...tier.resources].sort((a, b) => b.pct - a.pct);
    for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i];
        if (i === sorted.length - 1) {
            // Last one gets remaining
            const amt = Math.max(remaining > 0 ? 1 : 0, remaining);
            if (amt > 0) produced.push({ res: r.res, amt });
        } else {
            const amt = Math.max(1, Math.round(total * r.pct / 100));
            produced.push({ res: r.res, amt: Math.min(amt, remaining) });
            remaining -= Math.min(amt, remaining);
        }
    }
    return produced;
}

// === Game State ===
let resources = {
    coins: 0, research: 0, maxPop: 5,
    wood: 6, stone: 6, wheat: 6, wool: 3, ore: 0,
    leather: 0, coal: 0, nickelOre: 0,
    plank: 0, brick: 0, bread: 0, cloth: 0, steel: 0,
    people: 0, swords: 0, armors: 0, shields: 0, bows: 0, horses: 0,
    archers: 0, warriors: 0, knights: 0
};

let townHallLevel = 1, libraryLevel = 1;
let currentEnemyPower = 0, discoveredTilesCount = 0;
let autoRollTimer = null, isAutoRolling = false, isPausedForEvent = false, isResExpanded = false;
let forcedNextRoll = null, isRollLocked = false;

let tiles = [
    { id: 1, type: 'forest', number: 6, level: 1 },
    { id: 2, type: 'quarry', number: 7, level: 1 },
    { id: 3, type: 'farm', number: 8, level: 1 },
    { id: 4, type: 'mine', number: 9, level: 1 }
];

// Enemy army for battle
let pendingEnemyArmy = { warriors: 0, knights: 0, archers: 0 };
let battlePlayerArmy = { warriors: 0, knights: 0, archers: 0 };
let battleType = 'land';
let raidEnemyCount = 0;

function vibe() { if (navigator.vibrate) navigator.vibrate(15); }



function showFeedback(event, text, type = 'success') {
    if (!event) return;
    const floater = document.createElement('div');
    floater.innerText = text;
    floater.style.cssText = `position:fixed;pointer-events:none;z-index:9999;font-weight:900;font-size:24px;
        text-shadow:0 2px 4px rgba(0,0,0,0.5),0 0 2px black;transition:all 0.8s cubic-bezier(0.25,1,0.5,1);
        transform:translate(-50%,-50%) scale(0.5);opacity:1;color:${type === 'success' ? '#40c070' : '#e05050'}`;
    let x = event.clientX, y = event.clientY;
    if (x === undefined && event.touches?.length > 0) { x = event.touches[0].clientX; y = event.touches[0].clientY; }
    else if (x === undefined && event.changedTouches) { x = event.changedTouches[0].clientX; y = event.changedTouches[0].clientY; }
    if (!x) { x = window.innerWidth / 2; y = window.innerHeight / 2; }
    floater.style.left = x + 'px'; floater.style.top = (y - 20) + 'px';
    document.body.appendChild(floater);
    requestAnimationFrame(() => { floater.style.transform = 'translate(-50%,-200%) scale(1.2)'; floater.style.opacity = '0'; });
    setTimeout(() => floater.remove(), 800);
}

function getPlayerPower() {
    let power = 0;
    const units = militaryConfig.filter(m => m.category === 'unit');
    for (const u of units) power += (resources[u.id] || 0) * (u.power || 0);
    return power;
}
function getPopulation() { return resources.people + resources.archers + resources.warriors + resources.knights; }

// Rarity badge HTML
function rarityBadge(rarityKey) {
    const r = RARITY[rarityKey];
    return `<span style="color:${r.color};font-size:10px;font-weight:bold;">${r.name}</span>`;
}

function updateUI() {
    document.getElementById('res-coins').innerText = resources.coins;
    document.getElementById('res-research').innerText = resources.research;
    document.getElementById('res-power').innerText = getPlayerPower();
    document.getElementById('res-pop').innerText = `${getPopulation()}/${resources.maxPop}`;

    // Update all resource counts
    for (let res in resources) {
        const el = document.getElementById(`res-${res}`);
        if (el) el.innerText = resources[res];
    }



    // Town Hall
    document.getElementById('th-level').innerText = townHallLevel;
    document.getElementById('th-prod').innerText = townHallLevel;
    const thCost = townHallLevel;
    const canTH = resources.plank >= thCost && resources.brick >= thCost && resources.bread >= thCost && resources.cloth >= thCost && resources.steel >= thCost;
    document.getElementById('btn-upgrade-th').classList.toggle('disabled-btn', !canTH);
    document.getElementById('th-cost-display').innerHTML =
        `<span class="${resources.plank >= thCost ? '' : 'missing-res'}">${thCost}</span>🪵 <span class="${resources.brick >= thCost ? '' : 'missing-res'}">${thCost}</span>🧱 <span class="${resources.bread >= thCost ? '' : 'missing-res'}">${thCost}</span>🍞<br><span class="${resources.cloth >= thCost ? '' : 'missing-res'}">${thCost}</span>🧵 <span class="${resources.steel >= thCost ? '' : 'missing-res'}">${thCost}</span>⚙️`;

    // Library
    document.getElementById('lib-level').innerText = libraryLevel;
    document.getElementById('lib-prod').innerText = libraryLevel;
    const lP = 2 * libraryLevel, lB = 2 * libraryLevel, lS = 2 * libraryLevel, lR = 4 * libraryLevel;
    const canLib = resources.plank >= lP && resources.brick >= lB && resources.steel >= lS && resources.research >= lR;
    document.getElementById('btn-upgrade-lib').classList.toggle('disabled-btn', !canLib);
    document.getElementById('lib-cost-display').innerHTML =
        `<span class="${resources.plank >= lP ? '' : 'missing-res'}">${lP}</span>🪵 <span class="${resources.brick >= lB ? '' : 'missing-res'}">${lB}</span>🧱<br><span class="${resources.steel >= lS ? '' : 'missing-res'}">${lS}</span>⚙️ <span class="${resources.research >= lR ? '' : 'missing-res'}">${lR}</span>🧪`;

    // Crafting grid (only when crafting modal is open)
    const craftModal = document.getElementById('craftingModal');
    if (craftModal && craftModal.style.display !== 'none') {
        const craftGrid = document.getElementById('crafting-grid');
        craftGrid.innerHTML = '';
        for (let adv in advRes) {
            const a = advRes[adv], basic = a.from, need = a.cost;
            const have = resources[basic], can = have >= need;
            const bInfo = basicRes[basic];
            craftGrid.innerHTML += `<div class="craft-card"><div style="font-size:24px">${a.icon}</div><div style="font-size:13px;font-weight:bold;color:var(--text)">${a.name}</div><div style="font-size:11px;color:var(--muted)">(<span class="${can ? '' : 'missing-res'}">${need}</span> ${bInfo.icon} ${bInfo.name})</div><div class="craft-actions"><button class="craft-btn ${can ? '' : 'disabled-btn'}" onclick="craft('${adv}','single',event)">צור 1</button><button class="craft-btn btn-max ${can ? '' : 'disabled-btn'}" onclick="craft('${adv}','max',event)">הכל</button></div></div>`;
        }
    }

    // Military grid (only when military modal is open)
    const milModal = document.getElementById('militaryModal');
    if (milModal && milModal.style.display !== 'none') {
        const mg = document.getElementById('military-grid');
        const totalSoldiers = resources.archers + resources.warriors + resources.knights;
        const maxSol = MAX_SOLDIERS;
        const soldierCapFull = totalSoldiers >= maxSol;
        const availPeople = resources.people;

        let milHTML = `<div style="grid-column:1/-1;text-align:center;font-size:13px;color:var(--muted);padding:4px 0;">
        חיילים: <strong style="color:${soldierCapFull ? 'var(--red)' : 'var(--green)'}">${totalSoldiers}/${maxSol}</strong>
        &nbsp;|&nbsp; אנשים זמינים: <strong style="color:${availPeople > 0 ? 'var(--blue)' : 'var(--red)'}">${availPeople}</strong> 👨
    </div>`;

        const weapons = militaryConfig.filter(m => m.category === 'weapon');
        const units = militaryConfig.filter(m => m.category === 'unit');

        // Category: Weapons
        milHTML += `<div style="grid-column:1/-1;font-size:13px;font-weight:bold;color:var(--muted);padding:8px 0 2px;border-top:1px solid var(--glass2)">🗡️ כלי נשק</div>`;
        for (const item of weapons) {
            const costEntries = Object.entries(item.cost);
            const canAfford = costEntries.every(([res, amt]) => resources[res] >= amt);
            const costStr = costEntries.map(([res, amt]) => {
                const have = resources[res] >= amt;
                const ri = basicRes[res] || advRes[res] || { icon: icons[res] || '?', name: res };
                return `<span class="${have ? '' : 'missing-res'}">${amt}</span> ${ri.icon} ${ri.name}`;
            }).join(', ');
            milHTML += `<div class="craft-card"><div style="font-size:24px">${item.icon}</div><div style="color:var(--text)"><strong>${item.name}</strong></div><div style="font-size:12px;color:var(--gold);font-weight:bold">ברשותך: ${resources[item.id] || 0}</div><div style="font-size:11px;color:var(--muted)">(${costStr})</div><div class="craft-actions"><button class="craft-btn ${canAfford ? '' : 'disabled-btn'}" onclick="craftMilitary('${item.id}',event)">צור</button></div></div>`;
        }

        // Category: Units
        milHTML += `<div style="grid-column:1/-1;font-size:13px;font-weight:bold;color:var(--muted);padding:8px 0 2px;border-top:1px solid var(--glass2)">⚔️ יחידות צבא</div>`;
        for (const item of units) {
            const costEntries = Object.entries(item.cost);
            const canAfford = costEntries.every(([res, amt]) => resources[res] >= amt) && !soldierCapFull;
            const costStr = costEntries.map(([res, amt]) => {
                const have = resources[res] >= amt;
                const ri = basicRes[res] || advRes[res] || { icon: icons[res] || '👨', name: res === 'people' ? 'אדם' : res };
                return `<span class="${have ? '' : 'missing-res'}">${amt}</span> ${ri.icon || icons[res]} ${ri.name}`;
            }).join(', ');
            milHTML += `<div class="craft-card"><div style="font-size:24px">${item.icon}</div><div style="color:var(--text)"><strong>${item.name}</strong> (כוח ${item.power})</div>
        ${item.hp > 0 ? `<div style="font-size:10px;color:var(--muted);display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin:2px 0"><span title="חיים">❤️${item.hp}</span><span title="התקפה">⚔️${item.atk}</span><span title="מהירות">💨${Number(item.speed || 1).toFixed(1)}</span><span title="טווח">📏${item.range_m}</span><span title="דיוק">🎯${Math.round((item.accuracy || 0.9) * 100)}%</span><span title="שריון">🛡️${item.armor || 0}</span></div>` : ''}
        <div style="font-size:12px;color:var(--gold);font-weight:bold">ברשותך: ${resources[item.id] || 0}</div><div style="font-size:11px;color:var(--muted)">(${costStr})</div><div class="craft-actions"><button class="craft-btn btn-soldier ${canAfford ? '' : 'disabled-btn'}" onclick="craftMilitary('${item.id}',event)">אמן</button><button class="craft-btn ${(resources[item.id] || 0) > 0 ? '' : 'disabled-btn'}" style="background:var(--red)" onclick="disassembleSoldier('${item.id}',event)">פרק</button></div></div>`;
        }

        mg.innerHTML = milHTML;
    }

    // Market (only when market modal is open)
    const mktModal = document.getElementById('marketModal');
    if (mktModal && mktModal.style.display !== 'none') {
        const ml = document.getElementById('market-list'); ml.innerHTML = '';
        ml.innerHTML = `<div style="text-align:center;padding:8px 0;font-size:14px;font-weight:bold;color:var(--gold);border-bottom:1px solid var(--glass2);margin-bottom:8px;">🪙 מטבעות: ${resources.coins}</div>`;
        for (let b in basicRes) {
            const p = getPrice(b);
            ml.innerHTML += createMarketRow(b, basicRes[b].name, p, basicRes[b].rarity);
        }
        for (let a in advRes) {
            const p = getPrice(a);
            ml.innerHTML += createMarketRow(a, advRes[a].name, p, advRes[a].rarity);
        }
    }
}

// Board
const board = document.getElementById('board-section'); board.innerHTML = '';
tiles.forEach((tile, i) => {
    const isRed = (tile.number === 6 || tile.number === 8) ? 'red' : '';
    const el = document.createElement('div'); el.className = 'tile'; el.setAttribute('data-type', tile.type);
    if (tile.type === 'empty') {
        el.style.padding = '12px 8px';
        let ch = '<div class="empty-choices">';
        for (let bt of buildingTypes) {
            const b = BUILDINGS[bt];
            ch += `<button class="choice-btn" onclick="event.stopPropagation();setTileType(${i},'${bt}',event)" title="${b.name}"><img src="images/${bt}.png" class="choice-img" onerror="this.style.display='none';this.parentNode.insertAdjacentText('afterbegin','${b.icon}')"><span class="choice-label">${b.name}</span></button>`;
        }
        el.innerHTML = `<div class="tile-number ${isRed}">${tile.number}</div><div class="tile-info"><strong>🏳️ שטח ריק</strong><br><span style="font-size:11px;color:var(--muted)">בחר מבנה</span></div>${ch}</div>`;
    } else if (BUILDINGS[tile.type]) {
        const b = BUILDINGS[tile.type];
        el.style.backgroundImage = `url('images/${tile.type}.png')`;
        el.classList.add('tile-with-img');
        el.onclick = () => openTileDetail(i);
        el.innerHTML = `<div class="tile-overlay"></div><div class="tile-compact"><div class="tile-number ${isRed}">${tile.number}</div><div class="tile-level-badge">${b.icon} Lv.${tile.level}</div></div>`;
    }
    board.appendChild(el);
});

// Resources modal (only when open)
const resModal = document.getElementById('resourcesModal');
if (resModal && resModal.style.display !== 'none') {
    const rl = document.getElementById('resources-list');
    if (rl) {
        let rhtml = '<div style="text-align:right;">';
        rhtml += '<div style="font-size:13px;font-weight:bold;color:var(--muted);margin:8px 0 6px">📋 חומרי גלם</div>';
        for (let k in basicRes) {
            const r = basicRes[k];
            const rarityInfo = RARITY[r.rarity];
            rhtml += `<div class="detail-prod-item" style="margin-bottom:4px"><span style="font-size:20px">${r.icon}</span><div style="flex:1"><strong>${r.name}</strong> <span style="font-size:10px;color:${rarityInfo.color}">[${rarityInfo.name}]</span></div><div style="font-size:16px;font-weight:bold;color:var(--gold)">${resources[k]}</div></div>`;
        }
        rhtml += '<div style="font-size:13px;font-weight:bold;color:var(--muted);margin:12px 0 6px">🔧 חומרים מעובדים</div>';
        for (let k in advRes) {
            const r = advRes[k];
            const rarityInfo = RARITY[r.rarity];
            rhtml += `<div class="detail-prod-item" style="margin-bottom:4px"><span style="font-size:20px">${r.icon}</span><div style="flex:1"><strong>${r.name}</strong> <span style="font-size:10px;color:${rarityInfo.color}">[${rarityInfo.name}]</span></div><div style="font-size:16px;font-weight:bold;color:var(--gold)">${resources[k]}</div></div>`;
        }
        rhtml += '</div>';
        rl.innerHTML = rhtml;
    }
}

// Throttled autoSave (every 5 seconds instead of every updateUI call)
const now = Date.now();
if (!window._lastAutoSave || now - window._lastAutoSave >= 5000) {
    window._lastAutoSave = now;
    autoSave();
}
}

// Open tile detail modal
function openTileDetail(tileIndex) {
    vibe(); SFX.play('click');
    const tile = tiles[tileIndex];
    const b = BUILDINGS[tile.type];
    if (!b) return;
    const tier = getProductionTier(tile.type, tile.level);
    const prodHTML = tier.resources.map(r => {
        const ri = basicRes[r.res];
        const rarityInfo = RARITY[ri.rarity];
        return `<div class="detail-prod-item"><span style="font-size:20px">${ri.icon}</span><div><strong>${ri.name}</strong> <span style="font-size:11px;color:${rarityInfo.color}">[${rarityInfo.name}]</span><br><span style="color:var(--gold);font-weight:bold">${r.pct}%</span></div></div>`;
    }).join('');

    const cP = tile.level, cS = Math.max(0, tile.level - 1);
    const can = resources.steel >= cS && resources.plank >= cP;
    let costText = '';
    if (cS > 0) costText += `<span class="${resources.steel >= cS ? '' : 'missing-res'}">${cS}</span> ⚙️ פלדה + `;
    costText += `<span class="${resources.plank >= cP ? '' : 'missing-res'}">${cP}</span> 🪵 קרשים`;

    const content = document.getElementById('tile-detail-content');
    content.innerHTML = `
        <img src="images/${tile.type}.png" class="modal-banner" onerror="this.style.display='none'">
        <h3 class="modal-title">${b.icon} ${b.name}</h3>
        <div style="font-size:14px;color:var(--muted);margin-bottom:12px">רמה ${tile.level} | קוביות: ${tile.number}</div>
        <div style="text-align:right;margin-bottom:12px">
            <div style="font-size:13px;font-weight:bold;color:var(--text);margin-bottom:8px">📦 ייצור משאבים:</div>
            <div class="detail-prod-list">${prodHTML}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:6px">סה"כ ${tile.level} יחידות לכל זריקה תואמת</div>
        </div>
        <div style="border-top:1px solid var(--glass2);padding-top:12px">
            <div style="font-size:12px;color:var(--muted);margin-bottom:8px">עלות שדרוג: ${costText}</div>
            <button class="upgrade-btn ${can ? '' : 'disabled-btn'}" style="width:100%;padding:10px" onclick="upgradeTile(${tileIndex},event);openTileDetail(${tileIndex})">⬆️ שדרג לרמה ${tile.level + 1}</button>
        </div>
    `;
    openModal('tileDetailModal');
}
