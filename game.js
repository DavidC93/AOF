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

function toggleResources() {
    vibe(); isResExpanded = !isResExpanded;
    document.getElementById('collapsible-res').style.display = isResExpanded ? 'flex' : 'none';
    document.getElementById('res-toggle-icon').style.transform = isResExpanded ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0deg)';
}

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

function getPlayerPower() { return (resources.archers * 1) + (resources.warriors * 2) + (resources.knights * 3); }
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

    // Resource rows (dynamic)
    const basicRow1 = document.getElementById('res-row-basic1');
    const basicRow2 = document.getElementById('res-row-basic2');
    const advRow = document.getElementById('res-row-adv');
    if (basicRow1) {
        const keys1 = ['wood', 'stone', 'wheat', 'wool'];
        basicRow1.innerHTML = keys1.map(k => {
            const r = basicRes[k];
            return `<div class="res-item" style="width:25%">${r.icon} <span class="res-count" id="res-${k}">${resources[k]}</span></div>`;
        }).join('');
    }
    if (basicRow2) {
        const keys2 = ['ore', 'leather', 'coal', 'nickelOre'];
        basicRow2.innerHTML = keys2.map(k => {
            const r = basicRes[k];
            const rc = RARITY[r.rarity].color;
            return `<div class="res-item" style="width:25%">${r.icon} <span class="res-count" id="res-${k}" ${r.rarity !== 'common' ? `style="color:${rc}"` : ''}>${resources[k]}</span></div>`;
        }).join('');
    }
    if (advRow) {
        advRow.innerHTML = Object.keys(advRes).map(k => {
            const r = advRes[k];
            return `<div class="res-item" style="width:20%" title="${r.name}">${r.icon} <span class="res-count" id="res-${k}">${resources[k]}</span></div>`;
        }).join('');
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

    // Crafting grid
    const craftGrid = document.getElementById('crafting-grid');
    craftGrid.innerHTML = '';
    for (let adv in advRes) {
        const a = advRes[adv], basic = a.from, need = a.cost;
        const have = resources[basic], can = have >= need;
        const bInfo = basicRes[basic];
        craftGrid.innerHTML += `<div class="craft-card"><div style="font-size:24px">${a.icon}</div><div style="font-size:13px;font-weight:bold;color:var(--text)">${a.name}</div><div style="font-size:11px;color:var(--muted)">(<span class="${can ? '' : 'missing-res'}">${need}</span> ${bInfo.icon} ${bInfo.name})</div><div class="craft-actions"><button class="craft-btn ${can ? '' : 'disabled-btn'}" onclick="craft('${adv}','single',event)">צור 1</button><button class="craft-btn btn-max ${can ? '' : 'disabled-btn'}" onclick="craft('${adv}','max',event)">הכל</button></div></div>`;
    }

    // Military grid
    const mg = document.getElementById('military-grid');
    const cs = resources.steel >= 2, ca = resources.steel >= 2, csh = resources.steel >= 4, cb = resources.plank >= 3, ch = resources.bread >= 5;
    const cAr = resources.people >= 1 && resources.bows >= 1;
    const cW = resources.people >= 1 && resources.swords >= 1 && resources.armors >= 1;
    const cK = resources.people >= 1 && resources.swords >= 1 && resources.armors >= 1 && resources.shields >= 1 && resources.horses >= 1;
    const totalSoldiers = resources.archers + resources.warriors + resources.knights;
    const maxSol = 10;
    const soldierCapFull = totalSoldiers >= maxSol;
    mg.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;font-size:13px;color:var(--muted);padding:4px 0;">חיילים: <strong style="color:${soldierCapFull ? 'var(--red)' : 'var(--green)'}">${totalSoldiers}/${maxSol}</strong></div>
        <div class="craft-card"><div style="font-size:24px">🗡️</div><div style="color:var(--text)"><strong>חרב</strong></div><div style="font-size:11px;color:var(--muted)">(<span class="${cs ? '' : 'missing-res'}">${cs ? 2 : 2 - resources.steel}</span> ⚙️ פלדה)</div><div class="craft-actions"><button class="craft-btn ${cs ? '' : 'disabled-btn'}" onclick="craftMilitary('swords',event)">חשל</button></div></div>
        <div class="craft-card"><div style="font-size:24px">🦺</div><div style="color:var(--text)"><strong>שריון</strong></div><div style="font-size:11px;color:var(--muted)">(<span class="${ca ? '' : 'missing-res'}">${ca ? 2 : 2 - resources.steel}</span> ⚙️ פלדה)</div><div class="craft-actions"><button class="craft-btn ${ca ? '' : 'disabled-btn'}" onclick="craftMilitary('armors',event)">צור</button></div></div>
        <div class="craft-card"><div style="font-size:24px">💠</div><div style="color:var(--text)"><strong>מגן</strong></div><div style="font-size:11px;color:var(--muted)">(<span class="${csh ? '' : 'missing-res'}">${csh ? 4 : 4 - resources.steel}</span> ⚙️ פלדה)</div><div class="craft-actions"><button class="craft-btn ${csh ? '' : 'disabled-btn'}" onclick="craftMilitary('shields',event)">צור</button></div></div>
        <div class="craft-card"><div style="font-size:24px">🏹</div><div style="color:var(--text)"><strong>קשת (נשק)</strong></div><div style="font-size:11px;color:var(--muted)">(<span class="${cb ? '' : 'missing-res'}">${cb ? 3 : 3 - resources.plank}</span> 🪵 קרשים)</div><div class="craft-actions"><button class="craft-btn ${cb ? '' : 'disabled-btn'}" onclick="craftMilitary('bows',event)">צור</button></div></div>
        <div class="craft-card" style="grid-column:1/-1"><div style="font-size:24px">🐎</div><div style="color:var(--text)"><strong>סוס</strong></div><div style="font-size:11px;color:var(--muted)">(<span class="${ch ? '' : 'missing-res'}">${ch ? 5 : 5 - resources.bread}</span> 🍞 לחם)</div><div class="craft-actions"><button class="craft-btn ${ch ? '' : 'disabled-btn'}" onclick="craftMilitary('horses',event)">אמן</button></div></div>
        <div class="craft-card" style="background:rgba(64,192,112,0.08);border-color:rgba(64,192,112,0.3)"><div style="font-size:24px">🎯</div><div style="color:var(--text)"><strong>קשת</strong> (כוח 1)</div><div style="font-size:11px;color:var(--muted)">(1👨 אדם, 1🏹 קשת)</div><div class="craft-actions"><button class="craft-btn btn-soldier ${cAr && !soldierCapFull ? '' : 'disabled-btn'}" onclick="craftMilitary('archers',event)">אמן</button><button class="craft-btn ${resources.archers > 0 ? '' : 'disabled-btn'}" style="background:var(--red)" onclick="disassembleSoldier('archers',event)">פרק</button></div></div>
        <div class="craft-card" style="background:rgba(224,80,80,0.08);border-color:rgba(224,80,80,0.3)"><div style="font-size:24px">⚔️</div><div style="color:var(--text)"><strong>לוחם</strong> (כוח 2)</div><div style="font-size:11px;color:var(--muted)">(1👨, 1🗡️ חרב, 1🦺 שריון)</div><div class="craft-actions"><button class="craft-btn btn-soldier ${cW && !soldierCapFull ? '' : 'disabled-btn'}" onclick="craftMilitary('warriors',event)">אמן</button><button class="craft-btn ${resources.warriors > 0 ? '' : 'disabled-btn'}" style="background:var(--red)" onclick="disassembleSoldier('warriors',event)">פרק</button></div></div>
        <div class="craft-card" style="grid-column:1/-1;background:rgba(144,96,208,0.08);border-color:rgba(144,96,208,0.3)"><div style="font-size:24px">🏇</div><div style="color:var(--text)"><strong>אביר</strong> (כוח 3)</div><div style="font-size:11px;color:var(--muted)">(👨+🗡️+🦺+1💠 מגן+1🐎 סוס)</div><div class="craft-actions"><button class="craft-btn btn-soldier ${cK && !soldierCapFull ? '' : 'disabled-btn'}" onclick="craftMilitary('knights',event)">אמן</button><button class="craft-btn ${resources.knights > 0 ? '' : 'disabled-btn'}" style="background:var(--red)" onclick="disassembleSoldier('knights',event)">פרק</button></div></div>`;

    // Market
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
    autoSave();
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
