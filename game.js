// ===== Age of Fun - Resource Management Core =====

const basicRes = { wood: 'עץ', clay: 'חימר', wheat: 'חיטה', wool: 'צמר', ore: 'עפרה' };
const advRes = { plank: 'קרש', brick: 'לבנה', bread: 'לחם', cloth: 'בד', steel: 'פלדה' };
const icons = { wood:'🌲', clay:'🟤', wheat:'🌾', wool:'🐑', ore:'⛰️', plank:'🪵', brick:'🧱', bread:'🍞', cloth:'🧵', steel:'⚙️', empty:'🏳️' };
const craftMap = { plank: 'wood', brick: 'clay', bread: 'wheat', cloth: 'wool', steel: 'ore' };
const validTileNumbers = [4, 5, 6, 7, 8, 9];
const prices = { basic: { sell: 1, buy: 2 }, adv: { sell: 3, buy: 6 } };

let resources = {
    coins: 0, research: 0, maxPop: 5,
    wood: 6, clay: 6, wheat: 6, wool: 3, ore: 0,
    plank: 0, brick: 0, bread: 0, cloth: 0, steel: 0,
    people: 0, swords: 0, armors: 0, shields: 0, bows: 0, horses: 0,
    archers: 0, warriors: 0, knights: 0
};

let townHallLevel = 1, libraryLevel = 1;
let currentEnemyPower = 0, discoveredTilesCount = 0;
let autoRollTimer = null, isAutoRolling = false, isPausedForEvent = false, isResExpanded = false;
let forcedNextRoll = null, isRollLocked = false;

let tiles = [
    { id: 1, type: 'wood', number: 6, level: 1 },
    { id: 2, type: 'clay', number: 7, level: 1 },
    { id: 3, type: 'wheat', number: 8, level: 1 }
];

// Enemy army for battle
let pendingEnemyArmy = { warriors: 0, knights: 0, archers: 0 };
let battlePlayerArmy = { warriors: 0, knights: 0, archers: 0 };

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

function updateUI() {
    document.getElementById('res-coins').innerText = resources.coins;
    document.getElementById('res-research').innerText = resources.research;
    document.getElementById('res-power').innerText = getPlayerPower();
    document.getElementById('res-pop').innerText = `${getPopulation()}/${resources.maxPop}`;
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

    // Crafting grid
    const craftGrid = document.getElementById('crafting-grid');
    craftGrid.innerHTML = '';
    for (let adv in advRes) {
        const basic = craftMap[adv], can = resources[basic] >= 3;
        craftGrid.innerHTML += `<div class="craft-card"><div style="font-size:24px">${icons[adv]}</div><div style="font-size:13px;font-weight:bold;color:var(--text)">${advRes[adv]}</div><div style="font-size:11px;color:var(--muted)">(<span class="${can ? '' : 'missing-res'}">3</span> ${icons[basic]})</div><div class="craft-actions"><button class="craft-btn ${can ? '' : 'disabled-btn'}" onclick="craft('${adv}','single',event)">צור 1</button><button class="craft-btn btn-max ${can ? '' : 'disabled-btn'}" onclick="craft('${adv}','max',event)">הכל</button></div></div>`;
    }

    // Military grid
    const mg = document.getElementById('military-grid');
    const cs = resources.steel >= 2, ca = resources.steel >= 2, csh = resources.steel >= 4, cb = resources.plank >= 3, ch = resources.bread >= 5;
    const cAr = resources.people >= 1 && resources.bows >= 1;
    const cW = resources.people >= 1 && resources.swords >= 1 && resources.armors >= 1;
    const cK = resources.people >= 1 && resources.swords >= 1 && resources.armors >= 1 && resources.shields >= 1 && resources.horses >= 1;
    mg.innerHTML = `
        <div class="craft-card"><div style="font-size:24px">🗡️</div><div style="color:var(--text)"><strong>חרב</strong></div><div style="font-size:11px;color:var(--muted)">(<span class="${cs?'':'missing-res'}">2</span> ⚙️)</div><div class="craft-actions"><button class="craft-btn ${cs?'':'disabled-btn'}" onclick="craftMilitary('swords',event)">חשל</button></div></div>
        <div class="craft-card"><div style="font-size:24px">🦺</div><div style="color:var(--text)"><strong>שריון</strong></div><div style="font-size:11px;color:var(--muted)">(<span class="${ca?'':'missing-res'}">2</span> ⚙️)</div><div class="craft-actions"><button class="craft-btn ${ca?'':'disabled-btn'}" onclick="craftMilitary('armors',event)">צור</button></div></div>
        <div class="craft-card"><div style="font-size:24px">💠</div><div style="color:var(--text)"><strong>מגן</strong></div><div style="font-size:11px;color:var(--muted)">(<span class="${csh?'':'missing-res'}">4</span> ⚙️)</div><div class="craft-actions"><button class="craft-btn ${csh?'':'disabled-btn'}" onclick="craftMilitary('shields',event)">צור</button></div></div>
        <div class="craft-card"><div style="font-size:24px">🏹</div><div style="color:var(--text)"><strong>קשת (נשק)</strong></div><div style="font-size:11px;color:var(--muted)">(<span class="${cb?'':'missing-res'}">3</span> 🪵)</div><div class="craft-actions"><button class="craft-btn ${cb?'':'disabled-btn'}" onclick="craftMilitary('bows',event)">צור</button></div></div>
        <div class="craft-card" style="grid-column:1/-1"><div style="font-size:24px">🐎</div><div style="color:var(--text)"><strong>סוס</strong></div><div style="font-size:11px;color:var(--muted)">(<span class="${ch?'':'missing-res'}">5</span> 🍞)</div><div class="craft-actions"><button class="craft-btn ${ch?'':'disabled-btn'}" onclick="craftMilitary('horses',event)">אמן</button></div></div>
        <div class="craft-card" style="background:rgba(64,192,112,0.08);border-color:rgba(64,192,112,0.3)"><div style="font-size:24px">🎯</div><div style="color:var(--text)"><strong>קשת</strong> (כוח 1)</div><div style="font-size:11px;color:var(--muted)">(<span class="${resources.people>=1?'':'missing-res'}">1</span>👨, <span class="${resources.bows>=1?'':'missing-res'}">1</span>🏹)</div><div class="craft-actions"><button class="craft-btn btn-soldier ${cAr?'':'disabled-btn'}" onclick="craftMilitary('archers',event)">אמן קשת</button></div></div>
        <div class="craft-card" style="background:rgba(224,80,80,0.08);border-color:rgba(224,80,80,0.3)"><div style="font-size:24px">⚔️</div><div style="color:var(--text)"><strong>לוחם</strong> (כוח 2)</div><div style="font-size:11px;color:var(--muted)">(<span class="${resources.people>=1?'':'missing-res'}">1</span>👨, <span class="${resources.swords>=1?'':'missing-res'}">1</span>🗡️, <span class="${resources.armors>=1?'':'missing-res'}">1</span>🦺)</div><div class="craft-actions"><button class="craft-btn btn-soldier ${cW?'':'disabled-btn'}" onclick="craftMilitary('warriors',event)">אמן לוחם</button></div></div>
        <div class="craft-card" style="grid-column:1/-1;background:rgba(144,96,208,0.08);border-color:rgba(144,96,208,0.3)"><div style="font-size:24px">🏇</div><div style="color:var(--text)"><strong>אביר</strong> (כוח 3)</div><div style="font-size:11px;color:var(--muted)">(👨+🗡️+🦺+<span class="${resources.shields>=1?'':'missing-res'}">1</span>💠+<span class="${resources.horses>=1?'':'missing-res'}">1</span>🐎)</div><div class="craft-actions"><button class="craft-btn btn-soldier ${cK?'':'disabled-btn'}" onclick="craftMilitary('knights',event)">אמן אביר</button></div></div>`;

    // Market
    const ml = document.getElementById('market-list'); ml.innerHTML = '';
    for (let b in basicRes) ml.innerHTML += createMarketRow(b, basicRes[b], prices.basic);
    for (let a in advRes) ml.innerHTML += createMarketRow(a, advRes[a], prices.adv);

    // Board
    const board = document.getElementById('board-section'); board.innerHTML = '';
    tiles.forEach((tile, i) => {
        const isRed = (tile.number === 6 || tile.number === 8) ? 'red' : '';
        const el = document.createElement('div'); el.className = 'tile'; el.setAttribute('data-type', tile.type);
        if (tile.type === 'empty') {
            let ch = '<div class="empty-choices">';
            for (let b in basicRes) ch += `<button class="choice-btn" onclick="setTileType(${i},'${b}',event)">${icons[b]}</button>`;
            el.innerHTML = `<div class="tile-number ${isRed}">${tile.number}</div><div class="tile-info"><strong>🏳️ שטח ריק</strong></div>${ch}</div>`;
        } else {
            const cP = tile.level, cS = Math.max(0, tile.level - 1);
            const can = resources.steel >= cS && resources.plank >= cP;
            let ut = `שדרג (`; if (cS > 0) ut += `<span class="${resources.steel >= cS ? '' : 'missing-res'}">${cS}</span>⚙️, `;
            ut += `<span class="${resources.plank >= cP ? '' : 'missing-res'}">${cP}</span>🪵)`;
            el.innerHTML = `<div class="tile-number ${isRed}">${tile.number}</div><div class="tile-info"><strong>${icons[tile.type]} ${basicRes[tile.type]||advRes[tile.type]}</strong><br>רמה ${tile.level}</div><button class="upgrade-btn ${can?'':'disabled-btn'}" onclick="upgradeTile(${i},event)">${ut}</button>`;
        }
        board.appendChild(el);
    });
    autoSave();
}
