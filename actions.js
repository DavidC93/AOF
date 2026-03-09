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
    btnRoll.disabled = true; display.classList.add('rolling'); log.innerText = "זורק..."; SFX.play('dice');
    setTimeout(() => {
        display.classList.remove('rolling');
        let sum;
        if (forcedNextRoll !== null) { sum = forcedNextRoll; if (!isRollLocked) forcedNextRoll = null; }
        else sum = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
        display.innerText = `🎲 ${sum}`;
        if (sum === 2) {
            let space = resources.maxPop - getPopulation();
            if (space > 0) { let r = Math.min(townHallLevel, space); resources.people += r; log.innerText = `יצא 2! העירייה גייסה ${r} 👨.`; SFX.play('collect'); }
            else log.innerText = `יצא 2! האוכלוסייה מלאה (מקס ${resources.maxPop}).`;
        } else if (sum === 3) { resources.research += libraryLevel; log.innerText = `יצא 3! הספרייה ייצרה ${libraryLevel} 🧪.`; SFX.play('collect'); }
        else if (sum === 10) { handleRoll10(log); }
        else if (sum === 11) { handleRoll11(log); }
        else if (sum === 12) { log.innerText = `יצא 12! מצאת תיבת אוצר!`; isPausedForEvent = true; openModal('chestModal'); }
        else {
            let produced = [];
            tiles.forEach(t => {
                if (t.type !== 'empty' && BUILDINGS[t.type] && t.number === sum) {
                    const items = produceFromBuilding(t);
                    items.forEach(p => {
                        resources[p.res] += p.amt;
                        produced.push(`${p.amt} ${icons[p.res]} ${basicRes[p.res] ? basicRes[p.res].name : p.res}`);
                    });
                }
            });
            if (produced.length > 0) { log.innerText = `הופקו: ${produced.join(', ')}`; SFX.play('collect'); }
            else log.innerText = "לא הופקו משאבים הפעם.";
        }
        btnRoll.disabled = false; updateUI();
    }, 300);
}

// Building upgrades
function upgradeTownHall(event) {
    vibe(); const cost = townHallLevel; let m = [];
    if (resources.plank < cost) m.push(`${cost - resources.plank} 🪵 קרשים`);
    if (resources.brick < cost) m.push(`${cost - resources.brick} 🧱 לבנים`);
    if (resources.bread < cost) m.push(`${cost - resources.bread} 🍞 לחם`);
    if (resources.cloth < cost) m.push(`${cost - resources.cloth} 🧵 בד`);
    if (resources.steel < cost) m.push(`${cost - resources.steel} ⚙️ פלדה`);
    if (m.length === 0) { resources.plank -= cost; resources.brick -= cost; resources.bread -= cost; resources.cloth -= cost; resources.steel -= cost; townHallLevel++; resources.maxPop += 3; showFeedback(event, `עירייה רמה ${townHallLevel}!`); SFX.play('upgrade'); updateUI(); }
    else { SFX.play('error'); alert(`חסרים משאבים!\nחסר לך:\n` + m.join('\n')); }
}

function upgradeLibrary(event) {
    vibe(); const cP = 2 * libraryLevel, cB = 2 * libraryLevel, cS = 2 * libraryLevel, cR = 4 * libraryLevel; let m = [];
    if (resources.plank < cP) m.push(`${cP - resources.plank} 🪵 קרשים`);
    if (resources.brick < cB) m.push(`${cB - resources.brick} 🧱 לבנים`);
    if (resources.steel < cS) m.push(`${cS - resources.steel} ⚙️ פלדה`);
    if (resources.research < cR) m.push(`${cR - resources.research} 🧪 מחקר`);
    if (m.length === 0) { resources.plank -= cP; resources.brick -= cB; resources.steel -= cS; resources.research -= cR; libraryLevel++; showFeedback(event, `ספרייה רמה ${libraryLevel}!`); SFX.play('upgrade'); updateUI(); }
    else { SFX.play('error'); alert(`חסרים משאבים!\nחסר לך:\n` + m.join('\n')); }
}

// Market
function createMarketRow(resId, resName, priceData, rarity) {
    const canSell = resources[resId] > 0, canBuy = resources.coins >= priceData.buy;
    const rc = RARITY[rarity] || RARITY.common;
    const rarityTag = rarity !== 'common' ? ` <span style="color:${rc.color};font-size:10px">[${rc.name}]</span>` : '';
    return `<div class="market-item"><div class="market-res" title="${resName}">${icons[resId]}${rarityTag} <span class="market-amt">(${resources[resId]})</span></div><div class="market-actions"><button class="btn-sell ${canSell ? '' : 'disabled-btn'}" onclick="tradeMarket('sell','${resId}',${priceData.sell},event)">מכור (+${priceData.sell}🪙)</button><button class="btn-buy ${canBuy ? '' : 'disabled-btn'}" onclick="tradeMarket('buy','${resId}',${priceData.buy},event)">קנה (-${priceData.buy}🪙)</button></div></div>`;
}

function tradeMarket(action, resId, amount, event) {
    vibe();
    if (action === 'sell') { if (resources[resId] > 0) { resources[resId]--; resources.coins += amount; showFeedback(event, `+${amount}🪙`); SFX.play('coins'); } else { SFX.play('error'); alert(`חסר ${icons[resId]} למכירה.`); } }
    else { if (resources.coins >= amount) { resources.coins -= amount; resources[resId]++; showFeedback(event, `+1 ${icons[resId]}`); SFX.play('coins'); } else { SFX.play('error'); alert(`חסרים ${amount - resources.coins} 🪙.`); } }
    updateUI();
}

// Crafting
function craft(advType, mode, event) {
    vibe();
    const a = advRes[advType];
    if (a.ingredients) {
        // Multi-ingredient recipe
        const entries = Object.entries(a.ingredients);
        const maxCraft = Math.min(...entries.map(([r, amt]) => Math.floor(resources[r] / amt)));
        if (maxCraft > 0) {
            const amt = mode === 'max' ? maxCraft : 1;
            for (const [r, need] of entries) resources[r] -= amt * need;
            resources[advType] += amt;
            showFeedback(event, `+${amt} ${a.icon}`);
            SFX.play('craft');
            updateUI();
        } else {
            SFX.play('error');
            const missing = entries.filter(([r, amt]) => resources[r] < amt)
                .map(([r, amt]) => { const ri = basicRes[r] || advRes[r] || { icon: '?', name: r }; return `${amt - resources[r]} ${ri.icon} ${ri.name}`; })
                .join(', ');
            alert(`חסרים: ${missing}`);
        }
    } else {
        // Simple single-ingredient recipe
        const bType = a.from, need = a.cost;
        const avail = resources[bType], max = Math.floor(avail / need);
        const bInfo = basicRes[bType];
        if (max > 0) { let amt = mode === 'max' ? max : 1; resources[bType] -= amt * need; resources[advType] += amt; showFeedback(event, `+${amt} ${a.icon}`); SFX.play('craft'); updateUI(); }
        else { SFX.play('error'); alert(`חסרים ${need - avail} ${bInfo.icon} ${bInfo.name}.`); }
    }
}

const MAX_SOLDIERS = 10;
function getTotalSoldiers() { return resources.archers + resources.warriors + resources.knights; }

function craftMilitary(type, event) {
    vibe();
    const item = getMilItem(type);
    if (!item) { SFX.play('error'); return; }

    // Check soldier cap for units
    if (item.category === 'unit' && getTotalSoldiers() >= MAX_SOLDIERS) {
        SFX.play('error'); alert(`מקסימום ${MAX_SOLDIERS} חיילים!`); return;
    }

    // Check costs
    let missing = [];
    const costEntries = Object.entries(item.cost);
    for (const [res, amt] of costEntries) {
        if (resources[res] < amt) {
            const ri = basicRes[res] || advRes[res] || { icon: icons[res] || '?', name: res === 'people' ? 'אדם' : res };
            missing.push(`${amt - resources[res]} ${ri.icon || icons[res]} ${ri.name}`);
        }
    }

    if (missing.length > 0) {
        SFX.play('error'); alert("חסרים משאבים:\n" + missing.join('\n')); return;
    }

    // Deduct costs
    for (const [res, amt] of costEntries) resources[res] -= amt;
    resources[type]++;
    showFeedback(event, `+1 ${item.icon}`);
    SFX.play(item.category === 'weapon' ? 'craft' : 'train');
    updateUI();
}

// Disassemble soldiers to recover components (data-driven)
function disassembleSoldier(type, event) {
    vibe();
    const item = getMilItem(type);
    if (!item || item.category !== 'unit') { SFX.play('error'); return; }
    if ((resources[type] || 0) <= 0) { SFX.play('error'); alert('אין יחידה לפירוק!'); return; }

    resources[type]--;
    // Return all cost components
    for (const [res, amt] of Object.entries(item.cost)) resources[res] += amt;
    showFeedback(event, `${item.icon}→ פירוק`);
    SFX.play('disassemble');
    updateUI();
}

// Tiles
function setTileType(i, bType, event) { vibe(); tiles[i].type = bType; showFeedback(event, "נבחר!"); updateUI(); }
function upgradeTile(i, event) {
    vibe(); const t = tiles[i], cP = t.level, cS = Math.max(0, t.level - 1); let m = [];
    if (resources.plank < cP) m.push(`${cP - resources.plank} 🪵 קרשים`);
    if (resources.steel < cS) m.push(`${cS - resources.steel} ⚙️ פלדה`);
    if (!m.length) { resources.steel -= cS; resources.plank -= cP; t.level++; showFeedback(event, `רמה ${t.level}!`); SFX.play('upgrade'); updateUI(); }
    else { SFX.play('error'); alert("חסרים משאבים:\n" + m.join('\n')); }
}

// Roll 10 handler - always enemies (land discovery)
function handleRoll10(log) {
    log.innerText = "10! התגלו אויבים...";
    isPausedForEvent = true;
    initiateCombat();
}

// Roll 11 handler - base raid
function handleRoll11(log) {
    log.innerText = "11! פשיטה על הבסיס! ⚔️";
    isPausedForEvent = true;
    initiateRaid();
}

// Shared enemy generation
function generateEnemyArmy() {
    const maxEnemies = Math.min(Math.max(1, discoveredTilesCount), 10);
    const totalEnemies = Math.floor(Math.random() * maxEnemies) + 1;
    const types = ['warriors', 'knights', 'archers'];
    const army = { warriors: 0, knights: 0, archers: 0 };
    for (let i = 0; i < totalEnemies; i++) {
        army[types[Math.floor(Math.random() * types.length)]]++;
    }
    if (army.warriors + army.knights + army.archers === 0) army.warriors = 1;
    return { army, total: totalEnemies };
}

function addEmptyTile() {
    let rn;
    // Assign dice number based on rarity balance
    let counts = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    tiles.forEach(t => { if (counts[t.number] !== undefined) counts[t.number]++; });
    let min = Infinity; for (let n in counts) if (counts[n] < min) min = counts[n];
    let rarest = []; for (let n in counts) if (counts[n] === min) rarest.push(parseInt(n));
    rn = Math.random() < 0.8 ? rarest[Math.floor(Math.random() * rarest.length)] : validTileNumbers[Math.floor(Math.random() * validTileNumbers.length)];

    discoveredTilesCount++;
    tiles.push({ id: Date.now(), type: 'empty', number: rn, level: 1 });
    updateUI();
    if (!isAutoRolling) setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 500);
}

// Chest
function openChest() {
    vibe(); document.getElementById('btn-open-chest').style.display = 'none';
    const anim = document.getElementById('chest-animation'); let ticks = 0;
    const final = Math.floor(Math.random() * 91) + 10;
    const iv = setInterval(() => {
        anim.innerText = (Math.floor(Math.random() * 100) + 10) + "🪙"; ticks++; SFX.play('chest');
        if (ticks > 20) {
            clearInterval(iv); anim.innerText = final + "🪙"; anim.classList.add('chest-success'); resources.coins += final;
            document.getElementById('action-log').innerText = `פתחת תיבה וקיבלת ${final}🪙!`; document.getElementById('btn-close-chest').style.display = 'inline-block';
            SFX.play('chestOpen'); updateUI();
        }
    }, 50);
}
function closeChest() {
    vibe(); closeModal('chestModal'); isPausedForEvent = false;
    document.getElementById('btn-open-chest').style.display = 'inline-block'; document.getElementById('btn-close-chest').style.display = 'none';
    const a = document.getElementById('chest-animation'); a.innerText = '❓🪙'; a.classList.remove('chest-success');
}

// Combat initiation - land discovery
function initiateCombat() {
    battleType = 'land';
    const { army } = generateEnemyArmy();
    pendingEnemyArmy = army;

    const pInfo = document.getElementById('combat-player-info');
    const eInfo = document.getElementById('combat-enemy-info');
    document.querySelector('#combatModal .modal-title').innerText = '⚔️ אויבים לפניך!';
    document.querySelector('#combatModal .modal-content p').innerText = 'מצאת אדמה חדשה, אך היא מוחזקת על ידי אויבים!';
    pInfo.innerHTML = `⚔️ ${resources.warriors} לוחמים<br>🏇 ${resources.knights} אבירים<br>🎯 ${resources.archers} קשתים<br><strong>כוח: ${getPlayerPower()}</strong>`;
    const ePower = pendingEnemyArmy.warriors * 2 + pendingEnemyArmy.knights * 3 + pendingEnemyArmy.archers * 1;
    eInfo.innerHTML = `⚔️ ${pendingEnemyArmy.warriors} לוחמים<br>🏇 ${pendingEnemyArmy.knights} אבירים<br>🎯 ${pendingEnemyArmy.archers} קשתים<br><strong>כוח: ${ePower}</strong>`;
    const atkBtn = document.getElementById('btn-combat-attack');
    if (getPlayerPower() === 0) { atkBtn.disabled = true; atkBtn.innerText = "אמן חיילים!"; atkBtn.style.background = 'rgba(255,255,255,0.1)'; }
    else { atkBtn.disabled = false; atkBtn.innerText = "הסתער!"; atkBtn.style.background = ''; }
    openModal('combatModal');
}

// Raid initiation - enemy attacks base
function initiateRaid() {
    battleType = 'raid';
    const { army, total } = generateEnemyArmy();
    pendingEnemyArmy = army;
    raidEnemyCount = total;

    const pInfo = document.getElementById('combat-player-info');
    const eInfo = document.getElementById('combat-enemy-info');
    document.querySelector('#combatModal .modal-title').innerText = '🚨 פשיטה על הבסיס!';
    document.querySelector('#combatModal .modal-content p').innerText = 'אויבים תוקפים את הבסיס שלך! הגן את המשאבים!';
    pInfo.innerHTML = `⚔️ ${resources.warriors} לוחמים<br>🏇 ${resources.knights} אבירים<br>🎯 ${resources.archers} קשתים<br><strong>כוח: ${getPlayerPower()}</strong>`;
    const ePower = pendingEnemyArmy.warriors * 2 + pendingEnemyArmy.knights * 3 + pendingEnemyArmy.archers * 1;
    eInfo.innerHTML = `⚔️ ${pendingEnemyArmy.warriors} לוחמים<br>🏇 ${pendingEnemyArmy.knights} אבירים<br>🎯 ${pendingEnemyArmy.archers} קשתים<br><strong>כוח: ${ePower}</strong>`;
    const atkBtn = document.getElementById('btn-combat-attack');
    if (getPlayerPower() === 0) { atkBtn.disabled = true; atkBtn.innerText = "אמן חיילים!"; atkBtn.style.background = 'rgba(255,255,255,0.1)'; }
    else { atkBtn.disabled = false; atkBtn.innerText = "הגן!"; atkBtn.style.background = ''; }
    openModal('combatModal');
}

function retreat() {
    vibe(); SFX.play('retreat');
    if (battleType === 'raid') {
        // Retreating from raid = resources get plundered (same as losing)
        const allRes = Object.keys(basicRes).concat(Object.keys(advRes));
        const shuffledRes = [...allRes].sort(() => Math.random() - 0.5);
        let losses = [];
        for (let i = 0; i < 3 && i < shuffledRes.length; i++) {
            const r = shuffledRes[i];
            if (resources[r] > 0) {
                const maxLoss = Math.max(1, Math.floor(resources[r] * 0.2));
                const loss = Math.floor(Math.random() * maxLoss) + 1;
                const actualLoss = Math.min(loss, resources[r]);
                resources[r] -= actualLoss;
                const rInfo = basicRes[r] || advRes[r];
                losses.push(`${actualLoss} ${rInfo.icon} ${rInfo.name}`);
            }
        }
        document.getElementById('action-log').innerText = `נסגת מהפשיטה. משאבים נבזזו: ${losses.join(', ')}`;
    } else {
        document.getElementById('action-log').innerText = "נסגת מהקרב.";
    }
    closeModal('combatModal'); isPausedForEvent = false; updateUI();
}

// Cheats
function setNextRoll(event) { vibe(); const v = parseInt(document.getElementById('cheat-dice-val').value); if (v >= 2 && v <= 12) { forcedNextRoll = v; isRollLocked = document.getElementById('cheat-roll-persist').checked; showFeedback(event, "✅ נקבע!"); setTimeout(() => closeModal('menuModal'), 500); } else alert("מספר 2-12."); }
function clearForcedRoll(event) { vibe(); forcedNextRoll = null; isRollLocked = false; document.getElementById('cheat-roll-persist').checked = false; showFeedback(event, "✅ בוטל!"); setTimeout(() => closeModal('menuModal'), 500); }
function addCheatCoins(event) { vibe(); const v = parseInt(document.getElementById('cheat-coins-val').value) || 1000; resources.coins += v; showFeedback(event, `+${v}🪙`); updateUI(); }
function cheatAddLand(event) { vibe(); showFeedback(event, "🌍 שטח!"); addEmptyTile(); setTimeout(() => closeModal('menuModal'), 500); }
function openModal(id) {
    vibe(); SFX.play('click');
    const overlay = document.getElementById(id);
    overlay.style.display = 'flex';
    // Click outside to close (except combat/chest modals which need explicit action)
    if (id !== 'combatModal' && id !== 'chestModal') {
        overlay.onclick = function (e) {
            if (e.target === overlay) { closeModal(id); }
        };
    }
    updateUI();
}
function closeModal(id) { vibe(); SFX.play('click'); document.getElementById(id).style.display = 'none'; }

// Mute toggle
function toggleMute(event) {
    vibe(); const muted = SFX.toggleMute();
    document.getElementById('btn-mute').innerText = muted ? '🔇 צלילים כבויים' : '🔊 צלילים פעילים';
    document.getElementById('btn-mute').style.background = muted ? 'var(--muted)' : 'var(--blue)';
    showFeedback(event, muted ? '🔇' : '🔊');
    if (!muted) SFX.play('click');
}

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
loadMilitaryConfig().then(() => updateUI());
updateUI();
// Init mute button state
if (SFX.isMuted()) {
    document.getElementById('btn-mute').innerText = '🔇 צלילים כבויים';
    document.getElementById('btn-mute').style.background = 'var(--muted)';
}
