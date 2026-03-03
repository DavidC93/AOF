// ===== Age of Fun - Game Actions =====

// Dice button setup
const btnRoll = document.getElementById('btn-roll');
let pressTimer, isLongPress = false;

function startPress(e) {
    if (btnRoll.disabled) return; isLongPress = false;
    btnRoll.style.transform = 'scale(0.96)';
    pressTimer = setTimeout(() => { isLongPress = true; btnRoll.style.transform = 'scale(1)'; if (!isAutoRolling) { toggleAutoRoll(true); vibe(); } }, 500);
}
function endPress(e) {
    clearTimeout(pressTimer); btnRoll.style.transform = 'scale(1)';
    if (btnRoll.disabled) return;
    if (!isLongPress) { if (e.cancelable && e.type === 'touchend') e.preventDefault(); if (isAutoRolling) toggleAutoRoll(false); else { vibe(); rollDice(); } }
}
function cancelPress() { clearTimeout(pressTimer); btnRoll.style.transform = 'scale(1)'; }

btnRoll.addEventListener('mousedown', startPress);
btnRoll.addEventListener('touchstart', startPress, { passive: true });
btnRoll.addEventListener('mouseup', endPress);
btnRoll.addEventListener('touchend', endPress);
btnRoll.addEventListener('mouseleave', cancelPress);
btnRoll.addEventListener('touchcancel', cancelPress);
btnRoll.addEventListener('contextmenu', e => { e.preventDefault(); cancelPress(); });

function toggleAutoRoll(forceState) {
    vibe(); isAutoRolling = forceState !== undefined ? forceState : !isAutoRolling;
    const hint = document.getElementById('dice-hint');
    if (isAutoRolling) { btnRoll.classList.add('auto-active'); hint.innerText = 'מצב אוטומטי (הקלק לעצירה)'; startAutoRoll(); }
    else { btnRoll.classList.remove('auto-active'); hint.innerText = 'הקלק לזריקה / לחיצה ארוכה לאוטומטי'; stopAutoRoll(); }
}
function startAutoRoll() { if (!autoRollTimer) autoRollTimer = setInterval(() => { if (!btnRoll.disabled && !isPausedForEvent) rollDice(); }, 1000); }
function stopAutoRoll() { clearInterval(autoRollTimer); autoRollTimer = null; }

function rollDice() {
    const display = document.getElementById('dice-result'), log = document.getElementById('action-log');
    btnRoll.disabled = true; display.classList.add('rolling'); log.innerText = "זורק...";
    setTimeout(() => {
        display.classList.remove('rolling');
        let sum;
        if (forcedNextRoll !== null) { sum = forcedNextRoll; if (!isRollLocked) forcedNextRoll = null; }
        else sum = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
        display.innerText = `🎲 ${sum}`;
        if (sum === 2) {
            let space = resources.maxPop - getPopulation();
            if (space > 0) { let r = Math.min(townHallLevel, space); resources.people += r; log.innerText = `יצא 2! העירייה גייסה ${r} 👨.`; }
            else log.innerText = `יצא 2! האוכלוסייה מלאה (מקס ${resources.maxPop}).`;
        } else if (sum === 3) { resources.research += libraryLevel; log.innerText = `יצא 3! הספרייה ייצרה ${libraryLevel} 🧪.`; }
        else if (sum === 10) { handleRoll10(log); }
        else if (sum === 12) { log.innerText = `יצא 12! מצאת תיבת אוצר!`; isPausedForEvent = true; openModal('chestModal'); }
        else {
            let produced = [];
            tiles.forEach(t => { if (t.type !== 'empty' && t.number === sum) { resources[t.type] += t.level; produced.push(`${t.level} ${icons[t.type]}`); } });
            log.innerText = produced.length > 0 ? `הופקו: ${produced.join(', ')}` : "לא הופקו משאבים הפעם.";
        }
        btnRoll.disabled = false; updateUI();
    }, 300);
}

// Building upgrades
function upgradeTownHall(event) {
    vibe(); const cost = townHallLevel; let m = [];
    if (resources.plank < cost) m.push(`${cost - resources.plank} 🪵`);
    if (resources.brick < cost) m.push(`${cost - resources.brick} 🧱`);
    if (resources.bread < cost) m.push(`${cost - resources.bread} 🍞`);
    if (resources.cloth < cost) m.push(`${cost - resources.cloth} 🧵`);
    if (resources.steel < cost) m.push(`${cost - resources.steel} ⚙️`);
    if (m.length === 0) { resources.plank -= cost; resources.brick -= cost; resources.bread -= cost; resources.cloth -= cost; resources.steel -= cost; townHallLevel++; resources.maxPop += 3; showFeedback(event, `עירייה רמה ${townHallLevel}!`); updateUI(); }
    else alert(`חסרים משאבים!\nחסר לך:\n` + m.join('\n'));
}

function upgradeLibrary(event) {
    vibe(); const cP = 2 * libraryLevel, cB = 2 * libraryLevel, cS = 2 * libraryLevel, cR = 4 * libraryLevel; let m = [];
    if (resources.plank < cP) m.push(`${cP - resources.plank} 🪵`);
    if (resources.brick < cB) m.push(`${cB - resources.brick} 🧱`);
    if (resources.steel < cS) m.push(`${cS - resources.steel} ⚙️`);
    if (resources.research < cR) m.push(`${cR - resources.research} 🧪`);
    if (m.length === 0) { resources.plank -= cP; resources.brick -= cB; resources.steel -= cS; resources.research -= cR; libraryLevel++; showFeedback(event, `ספרייה רמה ${libraryLevel}!`); updateUI(); }
    else alert(`חסרים משאבים!\nחסר לך:\n` + m.join('\n'));
}

// Market
function createMarketRow(resId, resName, priceData) {
    const canSell = resources[resId] > 0, canBuy = resources.coins >= priceData.buy;
    return `<div class="market-item"><div class="market-res" title="${resName}">${icons[resId]} <span class="market-amt">(יש: ${resources[resId]})</span></div><div class="market-actions"><button class="btn-sell ${canSell ? '' : 'disabled-btn'}" onclick="tradeMarket('sell','${resId}',${priceData.sell},event)">מכור (+${priceData.sell}🪙)</button><button class="btn-buy ${canBuy ? '' : 'disabled-btn'}" onclick="tradeMarket('buy','${resId}',${priceData.buy},event)">קנה (-${priceData.buy}🪙)</button></div></div>`;
}

function tradeMarket(action, resId, amount, event) {
    vibe();
    if (action === 'sell') { if (resources[resId] > 0) { resources[resId]--; resources.coins += amount; showFeedback(event, `+${amount}🪙`); } else alert(`חסר ${icons[resId]} למכירה.`); }
    else { if (resources.coins >= amount) { resources.coins -= amount; resources[resId]++; showFeedback(event, `+1 ${icons[resId]}`); } else alert(`חסרים ${amount - resources.coins} 🪙.`); }
    updateUI();
}

// Crafting
function craft(advType, mode, event) {
    vibe(); const bType = craftMap[advType], avail = resources[bType], max = Math.floor(avail / 3);
    if (max > 0) { let amt = mode === 'max' ? max : 1; resources[bType] -= amt * 3; resources[advType] += amt; showFeedback(event, `+${amt} ${icons[advType]}`); updateUI(); }
    else alert(`חסרים ${3 - avail} ${icons[bType]}.`);
}

function craftMilitary(type, event) {
    vibe(); let m = [];
    if (type === 'swords') { if (resources.steel < 2) m.push('2 ⚙️'); if (!m.length) { resources.steel -= 2; resources.swords++; showFeedback(event, '+1 🗡️'); } }
    else if (type === 'armors') { if (resources.steel < 2) m.push('2 ⚙️'); if (!m.length) { resources.steel -= 2; resources.armors++; showFeedback(event, '+1 🦺'); } }
    else if (type === 'shields') { if (resources.steel < 4) m.push('4 ⚙️'); if (!m.length) { resources.steel -= 4; resources.shields++; showFeedback(event, '+1 💠'); } }
    else if (type === 'bows') { if (resources.plank < 3) m.push('3 🪵'); if (!m.length) { resources.plank -= 3; resources.bows++; showFeedback(event, '+1 🏹'); } }
    else if (type === 'horses') { if (resources.bread < 5) m.push('5 🍞'); if (!m.length) { resources.bread -= 5; resources.horses++; showFeedback(event, '+1 🐎'); } }
    else if (type === 'archers') { if (resources.people < 1) m.push('1 👨'); if (resources.bows < 1) m.push('1 🏹'); if (!m.length) { resources.people--; resources.bows--; resources.archers++; showFeedback(event, '+1 🎯'); } }
    else if (type === 'warriors') { if (resources.people < 1) m.push('1 👨'); if (resources.swords < 1) m.push('1 🗡️'); if (resources.armors < 1) m.push('1 🦺'); if (!m.length) { resources.people--; resources.swords--; resources.armors--; resources.warriors++; showFeedback(event, '+1 ⚔️'); } }
    else if (type === 'knights') { if (resources.people < 1) m.push('1 👨'); if (resources.swords < 1) m.push('1 🗡️'); if (resources.armors < 1) m.push('1 🦺'); if (resources.shields < 1) m.push('1 💠'); if (resources.horses < 1) m.push('1 🐎'); if (!m.length) { resources.people--; resources.swords--; resources.armors--; resources.shields--; resources.horses--; resources.knights++; showFeedback(event, '+1 🏇'); } }
    if (m.length > 0) alert("חסרים:\n" + m.join('\n')); else updateUI();
}

// Tiles
function setTileType(i, bType, event) { vibe(); tiles[i].type = bType; showFeedback(event, "נבחר!"); updateUI(); }
function upgradeTile(i, event) {
    vibe(); const t = tiles[i], cP = t.level, cS = Math.max(0, t.level - 1); let m = [];
    if (resources.plank < cP) m.push(`${cP - resources.plank} 🪵`);
    if (resources.steel < cS) m.push(`${cS - resources.steel} ⚙️`);
    if (!m.length) { resources.steel -= cS; resources.plank -= cP; t.level++; showFeedback(event, `רמה ${t.level}!`); updateUI(); }
    else alert("חסרים:\n" + m.join('\n'));
}

// Roll 10 handler
function handleRoll10(log) {
    if (Math.random() < 0.3) { log.innerText = "10! מצאת אדמה ריקה! 🎉"; addEmptyTile(); }
    else { log.innerText = "10! התגלו אויבים..."; isPausedForEvent = true; initiateCombat(); }
}

function addEmptyTile() {
    let rn, st = 'empty';
    if (discoveredTilesCount === 0) { rn = 9; st = 'ore'; }
    else if (discoveredTilesCount === 1) { rn = 5; st = 'wool'; }
    else if (discoveredTilesCount === 2) { rn = 4; }
    else {
        let counts = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
        tiles.forEach(t => { if (counts[t.number] !== undefined) counts[t.number]++; });
        let min = Infinity; for (let n in counts) if (counts[n] < min) min = counts[n];
        let rarest = []; for (let n in counts) if (counts[n] === min) rarest.push(parseInt(n));
        rn = Math.random() < 0.8 ? rarest[Math.floor(Math.random() * rarest.length)] : validTileNumbers[Math.floor(Math.random() * validTileNumbers.length)];
    }
    discoveredTilesCount++; tiles.push({ id: Date.now(), type: st, number: rn, level: 1 }); updateUI();
    if (!isAutoRolling) setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 500);
}

// Chest
function openChest() {
    vibe(); document.getElementById('btn-open-chest').style.display = 'none';
    const anim = document.getElementById('chest-animation'); let ticks = 0;
    const final = Math.floor(Math.random() * 91) + 10;
    const iv = setInterval(() => {
        anim.innerText = (Math.floor(Math.random() * 100) + 10) + "🪙"; ticks++;
        if (ticks > 20) {
            clearInterval(iv); anim.innerText = final + "🪙"; anim.classList.add('chest-success'); resources.coins += final;
            document.getElementById('action-log').innerText = `פתחת תיבה וקיבלת ${final}🪙!`; document.getElementById('btn-close-chest').style.display = 'inline-block'; updateUI();
        }
    }, 50);
}
function closeChest() {
    vibe(); closeModal('chestModal'); isPausedForEvent = false;
    document.getElementById('btn-open-chest').style.display = 'inline-block'; document.getElementById('btn-close-chest').style.display = 'none';
    const a = document.getElementById('chest-animation'); a.innerText = '❓🪙'; a.classList.remove('chest-success');
}

// Combat initiation
function initiateCombat() {
    const baseW = 1 + Math.floor(discoveredTilesCount * 0.8);
    const baseK = Math.floor(discoveredTilesCount * 0.3);
    const baseA = Math.floor(discoveredTilesCount * 0.5);
    pendingEnemyArmy = {
        warriors: Math.max(1, baseW + Math.floor(Math.random() * 3)),
        knights: Math.max(0, baseK + Math.floor(Math.random() * 2)),
        archers: Math.max(0, baseA + Math.floor(Math.random() * 2))
    };
    const pInfo = document.getElementById('combat-player-info');
    const eInfo = document.getElementById('combat-enemy-info');
    pInfo.innerHTML = `⚔️ ${resources.warriors} לוחמים<br>🏇 ${resources.knights} אבירים<br>🎯 ${resources.archers} קשתים<br><strong>כוח: ${getPlayerPower()}</strong>`;
    const ePower = pendingEnemyArmy.warriors * 2 + pendingEnemyArmy.knights * 3 + pendingEnemyArmy.archers * 1;
    eInfo.innerHTML = `⚔️ ${pendingEnemyArmy.warriors} לוחמים<br>🏇 ${pendingEnemyArmy.knights} אבירים<br>🎯 ${pendingEnemyArmy.archers} קשתים<br><strong>כוח: ${ePower}</strong>`;
    const atkBtn = document.getElementById('btn-combat-attack');
    if (getPlayerPower() === 0) { atkBtn.disabled = true; atkBtn.innerText = "אמן חיילים!"; atkBtn.style.background = 'rgba(255,255,255,0.1)'; }
    else { atkBtn.disabled = false; atkBtn.innerText = "הסתער!"; atkBtn.style.background = ''; }
    openModal('combatModal');
}

function retreat() { vibe(); document.getElementById('action-log').innerText = "נסגת מהקרב."; closeModal('combatModal'); isPausedForEvent = false; updateUI(); }

// Cheats
function setNextRoll(event) { vibe(); const v = parseInt(document.getElementById('cheat-dice-val').value); if (v >= 2 && v <= 12) { forcedNextRoll = v; isRollLocked = document.getElementById('cheat-roll-persist').checked; showFeedback(event, "✅ נקבע!"); setTimeout(() => closeModal('menuModal'), 500); } else alert("מספר 2-12."); }
function clearForcedRoll(event) { vibe(); forcedNextRoll = null; isRollLocked = false; document.getElementById('cheat-roll-persist').checked = false; showFeedback(event, "✅ בוטל!"); setTimeout(() => closeModal('menuModal'), 500); }
function addCheatCoins(event) { vibe(); const v = parseInt(document.getElementById('cheat-coins-val').value) || 1000; resources.coins += v; showFeedback(event, `+${v}🪙`); updateUI(); }
function cheatAddLand(event) { vibe(); showFeedback(event, "🌍 שטח!"); addEmptyTile(); setTimeout(() => closeModal('menuModal'), 500); }
function openModal(id) { vibe(); document.getElementById(id).style.display = 'flex'; updateUI(); }
function closeModal(id) { vibe(); document.getElementById(id).style.display = 'none'; }

// Save/Load
function autoSave() {
    const state = { resources, townHallLevel, libraryLevel, discoveredTilesCount, tiles };
    try { localStorage.setItem('aof_save', JSON.stringify(state)); } catch (e) { }
}
function loadGame() {
    try {
        const s = JSON.parse(localStorage.getItem('aof_save'));
        if (s) { Object.assign(resources, s.resources); townHallLevel = s.townHallLevel || 1; libraryLevel = s.libraryLevel || 1; discoveredTilesCount = s.discoveredTilesCount || 0; if (s.tiles) tiles = s.tiles; }
    } catch (e) { }
}
function saveGame(event) { vibe(); autoSave(); showFeedback(event, "💾 נשמר!"); }
function resetGame(event) {
    vibe(); if (confirm("בטוח? כל ההתקדמות תימחק!")) {
        localStorage.removeItem('aof_save'); location.reload();
    }
}

// Init
loadGame();
updateUI();
