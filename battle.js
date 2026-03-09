// ===== Age of Fun - Battle Simulation Engine =====

const METER_PX = 30, BASE_MOVE_PX = 70;
let bTimeScale = 1, bEnding = false, bEndTimer = 0;

const TEAM_STYLE = {
    player: { glow: "rgba(150,220,255,.75)", ring: "rgba(255,255,255,.96)", hpStroke: "rgba(220,245,255,.75)", hpBack: "rgba(80,160,255,.14)", tint: "rgba(80,180,255,.16)", arrow: "rgba(200,245,255,.95)" },
    enemy: { glow: "rgba(255,110,110,.80)", ring: "rgba(255,85,85,.98)", hpStroke: "rgba(255,140,140,.78)", hpBack: "rgba(255,110,110,.14)", tint: "rgba(255,80,80,.22)", arrow: "rgba(255,160,160,.95)" }
};

const UNIT_STATS_DEFAULT = {
    warrior: { name: "לוחם", hp: 10, atk: 2, rate: 1.0, range_m: 1, speedStat: 1.0, acc: 0.90, armor: 10, pen: 0, shape: "circle", color: "#6aa7ff" },
    knight: { name: "אביר", hp: 20, atk: 5, rate: 1.2, range_m: 2, speedStat: 2.2, acc: 0.80, armor: 20, pen: 0, shape: "square", color: "#9aa7ff" },
    archer: { name: "קשת", hp: 8, atk: 3, rate: 1.5, range_m: 10, speedStat: 1.2, acc: 0.85, armor: 5, pen: 10, shape: "triangle", color: "#6ff0b0", projectile: true }
};

// Map militaryConfig id to battle typeKey
const UNIT_ID_MAP = { archers: 'archer', warriors: 'warrior', knights: 'knight' };

function getUnitStats() {
    const stats = { ...UNIT_STATS_DEFAULT };
    const units = militaryConfig.filter(m => m.category === 'unit');
    for (const u of units) {
        const key = UNIT_ID_MAP[u.id] || u.id;
        if (u.hp > 0) { // Has combat stats from DB
            stats[key] = {
                name: u.name,
                hp: Number(u.hp),
                atk: Number(u.atk),
                rate: Number(u.rate),
                range_m: Number(u.range_m),
                speedStat: Number(u.speed),
                acc: Number(u.accuracy),
                armor: Number(u.armor),
                pen: Number(u.penetration) || 0,
                shape: u.shape || 'circle',
                color: u.color || '#6aa7ff',
                projectile: !!u.is_ranged
            };
        }
    }
    return stats;
}

let bUnits = [], bProjectiles = [], bEffects = [], bFloaters = [];
let bRunning = false, bPaused = false, bLastT = 0, bBattleOver = false;
let bCanvas, bCtx, bWon = false;

function bRand(a, b) { return Math.random() * (b - a) + a }
function bClamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
function bDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function bRound1(x) { return Math.round(x * 10) / 10 }

function bMakeUnit(typeKey, team, x, y) {
    const UNIT_STATS = getUnitStats();
    const t = UNIT_STATS[typeKey];
    return {
        id: String(Math.random()).slice(2), typeKey, team, x, y, r: 14,
        hp: t.hp, maxHp: t.hp, atk: t.atk, rate: t.rate, range: t.range_m * METER_PX,
        speedStat: t.speedStat, moveSpeed: BASE_MOVE_PX * t.speedStat, acc: t.acc, armor: t.armor, pen: t.pen || 0,
        cooldown: bRand(0, 0.5), alive: true, color: t.color, shape: t.shape, projectile: !!t.projectile,
        meleeAnimT: 0, meleeAnimDur: 0.16, lungeDx: 0, lungeDy: 0, hitFlashT: 0
    };
}

function bSpawnTeam(team, counts) {
    const rect = bCanvas.getBoundingClientRect();
    const w = rect.width, h = rect.height, total = counts.warrior + counts.knight + counts.archer;
    if (total <= 0) return;
    const pad = 28, uw = Math.max(200, w - pad * 2);
    const order = [];
    for (let i = 0; i < counts.warrior; i++) order.push("warrior");
    for (let i = 0; i < counts.knight; i++) order.push("knight");
    for (let i = 0; i < counts.archer; i++) order.push("archer");
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[order[i], order[j]] = [order[j], order[i]]; }
    const baseY = team === "player" ? (h - 90) : 90;
    for (let i = 0; i < order.length; i++) {
        const t = total === 1 ? 0.5 : (i / (total - 1));
        bUnits.push(bMakeUnit(order[i], team, pad + t * uw + bRand(-10, 10), baseY + bRand(-10, 10)));
    }
}

function bNearestEnemy(u) { let best = null, bd = Infinity; for (const e of bUnits) { if (!e.alive || e.team === u.team) continue; const d = bDist(u, e); if (d < bd) { bd = d; best = e; } } return best; }
function bAliveCounts() { let p = 0, e = 0; for (const u of bUnits) { if (!u.alive) continue; u.team === "player" ? p++ : e++; } return { p, e }; }

function bAddSlash(x, y, dx, dy) { const n = Math.hypot(dx, dy) || 1; bEffects.push({ type: "slash", x, y, dx: dx / n, dy: dy / n, t: 0.14, dur: 0.14 }) }
function bAddImpact(x, y) { bEffects.push({ type: "impact", x, y, t: 0.18, dur: 0.18, sparks: Array.from({ length: 7 }, () => { const a = bRand(0, Math.PI * 2); return { dx: Math.cos(a), dy: Math.sin(a), s: bRand(40, 95) } }) }) }
function bAddDust(x, y) { bEffects.push({ type: "dust", x, y, t: 0.20, dur: 0.20 }) }
function bAddFloater(x, y, text, kind) { bFloaters.push({ x, y, text, kind, t: 0.75, dur: 0.75, vx: bRand(-18, 18), vy: bRand(-70, -95), scale0: kind === "dmg" ? 1.1 : 1.0 }) }

function bComputeDmg(atk, tgt) { const ea = Math.max(0, tgt.armor - (atk.pen || 0)); let d = bRound1(Math.max(0.5, atk.atk * bClamp(1 - ea / 100, 0, 1))); return d }
function bKnockback(t, dx, dy, s) { const l = Math.hypot(dx, dy) || 1; t.x += dx / l * s; t.y += dy / l * s; const r = bCanvas.getBoundingClientRect(); t.x = bClamp(t.x, 22, r.width - 22); t.y = bClamp(t.y, 70, r.height - 40) }

function bApplyHit(atk, tgt, hx, hy, dx, dy) {
    if (!tgt.alive) return; const d = bComputeDmg(atk, tgt);
    tgt.hp = bRound1(tgt.hp - d); tgt.hitFlashT = Math.max(tgt.hitFlashT, 0.10);
    bAddImpact(hx, hy); bAddFloater(tgt.x, tgt.y - tgt.r - 16, `-${d.toFixed(1)}`, "dmg");
    bKnockback(tgt, dx, dy, bRand(5, 9));
    if (tgt.hp <= 0) { tgt.hp = 0; tgt.alive = false; SFX.play('unitDeath'); }
}
function bApplyMiss(atk, tgt, mx, my) { bAddDust(mx, my); bAddFloater(tgt.x, tgt.y - tgt.r - 16, "פספוס", "miss"); SFX.play('miss'); }

function bUpdate(dt) {
    if (bBattleOver) return;
    for (const f of bFloaters) { f.t -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= (1 - 1.5 * dt); f.vy *= (1 - 1.2 * dt) }
    bFloaters = bFloaters.filter(f => f.t > 0);
    for (const fx of bEffects) fx.t -= dt; bEffects = bEffects.filter(fx => fx.t > 0);

    for (const u of bUnits) {
        if (!u.alive) continue;
        if (u.meleeAnimT > 0) u.meleeAnimT = Math.max(0, u.meleeAnimT - dt);
        if (u.hitFlashT > 0) u.hitFlashT = Math.max(0, u.hitFlashT - dt);
        const en = bNearestEnemy(u); if (!en) continue;
        const d = bDist(u, en);
        if (d > u.range) {
            const dx = en.x - u.x, dy = en.y - u.y, l = Math.hypot(dx, dy) || 1;
            u.x += (dx / l) * u.moveSpeed * dt; u.y += (dy / l) * u.moveSpeed * dt;
            const r = bCanvas.getBoundingClientRect(); u.x = bClamp(u.x, 22, r.width - 22); u.y = bClamp(u.y, 70, r.height - 40);
        } else {
            u.cooldown -= dt;
            if (u.cooldown <= 0) {
                u.cooldown = u.rate;
                if (u.projectile) {
                    const hit = Math.random() <= u.acc, mo = 38;
                    bProjectiles.push({
                        x: u.x, y: u.y, sid: u.id, sType: u.typeKey, sTeam: u.team, tid: en.id, speed: 440, alive: true,
                        willHit: hit, aimX: hit ? null : en.x + bRand(-mo, mo), aimY: hit ? null : en.y + bRand(-mo, mo), angle: 0
                    });
                    SFX.play('arrowShot');
                } else {
                    const dx = en.x - u.x, dy = en.y - u.y, l = Math.hypot(dx, dy) || 1;
                    u.meleeAnimT = u.meleeAnimDur; u.lungeDx = dx / l; u.lungeDy = dy / l;
                    bAddSlash(en.x - (dx / l) * 8, en.y - (dy / l) * 8, dx, dy);
                    SFX.play('meleeHit');
                    if (Math.random() <= u.acc) bApplyHit(u, en, en.x, en.y, dx, dy);
                    else bApplyMiss(u, en, en.x + bRand(-10, 10), en.y + bRand(-10, 10));
                }
            }
        }
    }

    // Projectiles
    for (const p of bProjectiles) {
        if (!p.alive) continue;
        const shooter = bUnits.find(u => u.id === p.sid);
        const UNIT_STATS = getUnitStats();
        const atk = shooter || { team: p.sTeam, typeKey: p.sType, atk: UNIT_STATS[p.sType].atk, pen: UNIT_STATS[p.sType].pen, acc: UNIT_STATS[p.sType].acc };
        const tgt = bUnits.find(u => u.id === p.tid);
        let tx, ty;
        if (p.willHit) { if (!tgt || !tgt.alive) { p.alive = false; continue; } tx = tgt.x; ty = tgt.y; }
        else { if (p.aimX == null) { if (!tgt) { p.alive = false; continue; } p.aimX = tgt.x + bRand(-30, 30); p.aimY = tgt.y + bRand(-30, 30); } tx = p.aimX; ty = p.aimY; }
        const dx = tx - p.x, dy = ty - p.y, l = Math.hypot(dx, dy) || 1;
        p.angle = Math.atan2(dy, dx); p.x += (dx / l) * p.speed * dt; p.y += (dy / l) * p.speed * dt;
        if (Math.hypot(tx - p.x, ty - p.y) < 12) {
            if (p.willHit && tgt && tgt.alive) { bApplyHit(atk, tgt, tgt.x, tgt.y, dx, dy); SFX.play('arrowHit'); }
            else { if (tgt) bApplyMiss(atk, tgt, tx, ty); else bAddDust(tx, ty); }
            p.alive = false;
        }
    }
    bProjectiles = bProjectiles.filter(p => p.alive);

    const { p, e } = bAliveCounts();
    document.getElementById('battle-score').innerHTML = `<b>יחידות:</b> אני ${p} | אויב ${e}`;
    if (!bEnding && (p === 0 || e === 0)) {
        bEnding = true; bEndTimer = 0.4; bTimeScale = 0.25; bWon = p > 0;
        document.getElementById('battle-status').innerHTML = p === 0 ? `<b>סטטוס:</b> הפסדת!` : `<b>סטטוס:</b> ניצחת!`;
    }
    if (bEnding) { bEndTimer -= dt; if (bEndTimer <= 0) { bBattleOver = true; bRunning = false; bPaused = false; bTimeScale = 1; bEnding = false; onBattleEnd(); } }
}

// Drawing
function bDrawEffects() {
    for (const fx of bEffects) {
        if (fx.type === "slash") { const p = 1 - (fx.t / fx.dur), f = 1 - p, len = 18 + p * 10; bCtx.save(); bCtx.globalAlpha = 0.85 * f; bCtx.strokeStyle = "rgba(240,250,255,1)"; bCtx.lineWidth = 2; const ax = fx.dx, ay = fx.dy, nx = -ay, ny = ax; bCtx.beginPath(); bCtx.moveTo(fx.x - ax * len * 0.6 - nx * 6, fx.y - ay * len * 0.6 - ny * 6); bCtx.lineTo(fx.x + ax * len * 0.6 + nx * 6, fx.y + ay * len * 0.6 + ny * 6); bCtx.stroke(); bCtx.beginPath(); bCtx.moveTo(fx.x - ax * len * 0.6 + nx * 6, fx.y - ay * len * 0.6 + ny * 6); bCtx.lineTo(fx.x + ax * len * 0.6 - nx * 6, fx.y + ay * len * 0.6 - ny * 6); bCtx.stroke(); bCtx.restore(); }
        if (fx.type === "impact") { const p = 1 - (fx.t / fx.dur), f = 1 - p; bCtx.save(); bCtx.globalAlpha = 0.9 * f; bCtx.strokeStyle = "rgba(255,255,255,1)"; bCtx.lineWidth = 2; const r = 6 + p * 22; bCtx.beginPath(); bCtx.arc(fx.x, fx.y, r, 0, Math.PI * 2); bCtx.stroke(); bCtx.strokeStyle = "rgba(255,255,255,.9)"; bCtx.lineWidth = 2; for (const s of fx.sparks) { const L = (s.s * (0.15 + p)) * 0.32; bCtx.beginPath(); bCtx.moveTo(fx.x + s.dx * (r * 0.4), fx.y + s.dy * (r * 0.4)); bCtx.lineTo(fx.x + s.dx * (r * 0.4 + L), fx.y + s.dy * (r * 0.4 + L)); bCtx.stroke(); } bCtx.restore(); }
        if (fx.type === "dust") { const p = 1 - (fx.t / fx.dur), f = 1 - p; bCtx.save(); bCtx.globalAlpha = 0.45 * f; bCtx.fillStyle = "rgba(220,230,255,1)"; const r = 4 + p * 12; bCtx.beginPath(); bCtx.arc(fx.x, fx.y, r, 0, Math.PI * 2); bCtx.fill(); bCtx.restore(); }
    }
}

function bDrawFloaters() {
    for (const f of bFloaters) { const p = 1 - (f.t / f.dur), fade = 1 - p, scale = f.scale0 + p * 0.15; bCtx.save(); bCtx.globalAlpha = 0.95 * fade; const fill = f.kind === "miss" ? "rgba(200,210,230,.95)" : "rgba(255,255,255,.98)"; const stroke = f.kind === "miss" ? "rgba(0,0,0,.55)" : "rgba(0,0,0,.60)"; bCtx.font = `800 ${Math.round(16 * scale)}px system-ui`; bCtx.textAlign = "center"; bCtx.textBaseline = "middle"; bCtx.lineWidth = 4; bCtx.strokeStyle = stroke; bCtx.strokeText(f.text, f.x, f.y); bCtx.fillStyle = fill; bCtx.fillText(f.text, f.x, f.y); bCtx.restore(); }
}

function bDrawUnit(u) {
    let ox = 0, oy = 0;
    if (u.meleeAnimT > 0) { const pg = 1 - (u.meleeAnimT / u.meleeAnimDur), k = Math.sin(pg * Math.PI) * 10; ox = u.lungeDx * k; oy = u.lungeDy * k; }
    const ts = TEAM_STYLE[u.team];
    bCtx.save(); bCtx.translate(u.x + ox, u.y + oy);
    bCtx.shadowBlur = u.team === "enemy" ? 22 : 20; bCtx.shadowColor = ts.glow;
    const flash = u.hitFlashT > 0 ? (0.6 + (u.hitFlashT / 0.10) * 0.4) : 1; bCtx.globalAlpha = flash;
    bCtx.fillStyle = u.color; bCtx.lineWidth = 3.2; bCtx.strokeStyle = ts.ring;
    if (u.shape === "circle") { bCtx.beginPath(); bCtx.arc(0, 0, u.r, 0, Math.PI * 2); bCtx.fill(); bCtx.stroke(); }
    else if (u.shape === "square") { bCtx.beginPath(); if (bCtx.roundRect) bCtx.roundRect(-u.r, -u.r, u.r * 2, u.r * 2, 7); else bCtx.rect(-u.r, -u.r, u.r * 2, u.r * 2); bCtx.fill(); bCtx.stroke(); }
    else { bCtx.beginPath(); bCtx.moveTo(0, -u.r); bCtx.lineTo(u.r, u.r); bCtx.lineTo(-u.r, u.r); bCtx.closePath(); bCtx.fill(); bCtx.stroke(); }
    // Team tint
    bCtx.shadowBlur = 0; bCtx.globalAlpha = 1; bCtx.fillStyle = ts.tint;
    if (u.shape === "circle") { bCtx.beginPath(); bCtx.arc(0, 0, u.r - 1, 0, Math.PI * 2); bCtx.fill(); }
    else if (u.shape === "square") { bCtx.beginPath(); if (bCtx.roundRect) bCtx.roundRect(-u.r + 1, -u.r + 1, (u.r - 1) * 2, (u.r - 1) * 2, 6); else bCtx.rect(-u.r + 1, -u.r + 1, (u.r - 1) * 2, (u.r - 1) * 2); bCtx.fill(); }
    else { bCtx.beginPath(); bCtx.moveTo(0, -u.r + 1); bCtx.lineTo(u.r - 1, u.r - 1); bCtx.lineTo(-u.r + 1, u.r - 1); bCtx.closePath(); bCtx.fill(); }
    // Outer ring
    bCtx.lineWidth = 2.2; bCtx.strokeStyle = u.team === "enemy" ? "rgba(255,120,120,.85)" : "rgba(235,250,255,.70)"; bCtx.beginPath(); bCtx.arc(0, 0, u.r + 5, 0, Math.PI * 2); bCtx.stroke();
    // Letter
    bCtx.fillStyle = u.team === "enemy" ? "rgba(255,120,120,.85)" : "rgba(255,255,255,.70)"; bCtx.beginPath(); bCtx.arc(0, 0, 8.5, 0, Math.PI * 2); bCtx.fill();
    bCtx.fillStyle = "rgba(0,0,0,.70)"; bCtx.font = "800 12px system-ui"; bCtx.textAlign = "center"; bCtx.textBaseline = "middle";
    bCtx.fillText(u.typeKey === "warrior" ? "ל" : u.typeKey === "knight" ? "א" : "ק", 0, 0.5);
    // Team dot
    bCtx.fillStyle = u.team === "enemy" ? "rgba(255,80,80,1)" : "rgba(190,245,255,1)"; bCtx.beginPath(); bCtx.arc(0, u.r + 9, 4, 0, Math.PI * 2); bCtx.fill();
    bCtx.restore();
    // HP bar
    const bW = 40, bH = 7, bx = u.x - bW / 2, by = u.y - u.r - 17;
    bCtx.fillStyle = "rgba(0,0,0,.45)"; bCtx.fillRect(bx, by, bW, bH);
    bCtx.fillStyle = TEAM_STYLE[u.team].hpBack; bCtx.fillRect(bx, by, bW, bH);
    const ratio = u.maxHp <= 0 ? 0 : u.hp / u.maxHp;
    bCtx.fillStyle = ratio > 0.5 ? "rgba(80,220,120,.95)" : ratio > 0.25 ? "rgba(255,210,90,.95)" : "rgba(255,90,90,.95)";
    bCtx.fillRect(bx, by, bW * bClamp(ratio, 0, 1), bH);
    bCtx.strokeStyle = TEAM_STYLE[u.team].hpStroke; bCtx.lineWidth = 1.6; bCtx.strokeRect(bx, by, bW, bH);
}

function bDrawArrow(p) {
    bCtx.save(); bCtx.translate(p.x, p.y); bCtx.rotate(p.angle);
    const c = TEAM_STYLE[p.sTeam]?.arrow || "rgba(240,250,255,.9)"; bCtx.strokeStyle = c; bCtx.lineWidth = 2;
    bCtx.beginPath(); bCtx.moveTo(-10, 0); bCtx.lineTo(10, 0); bCtx.stroke();
    bCtx.beginPath(); bCtx.moveTo(10, 0); bCtx.lineTo(5, -4); bCtx.moveTo(10, 0); bCtx.lineTo(5, 4); bCtx.stroke();
    bCtx.globalAlpha = 0.85; bCtx.beginPath(); bCtx.moveTo(-10, 0); bCtx.lineTo(-14, -3); bCtx.moveTo(-10, 0); bCtx.lineTo(-14, 3); bCtx.stroke();
    bCtx.restore();
}

function bDraw() {
    const rect = bCanvas.getBoundingClientRect(), w = rect.width, h = rect.height; bCtx.clearRect(0, 0, w, h);
    bCtx.strokeStyle = "rgba(255,255,255,.06)"; bCtx.lineWidth = 2; bCtx.beginPath(); bCtx.moveTo(18, h / 2); bCtx.lineTo(w - 18, h / 2); bCtx.stroke();
    bCtx.fillStyle = "rgba(255,110,110,.18)"; bCtx.fillRect(18, 18, w - 36, 10);
    bCtx.fillStyle = "rgba(150,220,255,.16)"; bCtx.fillRect(18, h - 28, w - 36, 10);
    for (const p of bProjectiles) bDrawArrow(p);
    bDrawEffects();
    for (const u of bUnits) if (u.alive) bDrawUnit(u);
    bDrawFloaters();
    if (bBattleOver) { bCtx.fillStyle = "rgba(0,0,0,.35)"; bCtx.fillRect(w / 2 - 180, 40, 360, 46); bCtx.strokeStyle = "rgba(255,255,255,.15)"; bCtx.strokeRect(w / 2 - 180, 40, 360, 46); bCtx.fillStyle = "rgba(255,255,255,.92)"; bCtx.font = "bold 18px system-ui"; bCtx.textAlign = "center"; bCtx.textBaseline = "middle"; bCtx.fillText(bWon ? "ניצחת!" : "הפסדת!", w / 2, 63); }
}

function bLoop(t) {
    if (!bRunning) return; if (!bLastT) bLastT = t;
    const raw = Math.min(0.033, (t - bLastT) / 1000); bLastT = t; const dt = raw * bTimeScale;
    if (!bPaused) bUpdate(dt); bDraw(); requestAnimationFrame(bLoop);
}

function bResizeCanvas() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = bCanvas.getBoundingClientRect();
    bCanvas.width = Math.floor(rect.width * dpr); bCanvas.height = Math.floor(rect.height * dpr);
    bCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// === Integration with resource management ===
function startBattleSimulation() {
    closeModal('combatModal');
    battlePlayerArmy = { warriors: resources.warriors, knights: resources.knights, archers: resources.archers };
    // Remove units from resource pool (they go to battle)
    resources.warriors = 0; resources.knights = 0; resources.archers = 0;
    updateUI();

    const overlay = document.getElementById('battle-overlay');
    overlay.classList.add('active');
    bCanvas = document.getElementById('battle-canvas');
    bCtx = bCanvas.getContext('2d');
    bResizeCanvas();

    bUnits = []; bProjectiles = []; bEffects = []; bFloaters = [];
    bRunning = true; bPaused = false; bLastT = 0; bBattleOver = false; bWon = false;
    bTimeScale = 1; bEnding = false; bEndTimer = 0;

    bSpawnTeam("enemy", { warrior: pendingEnemyArmy.warriors, knight: pendingEnemyArmy.knights, archer: pendingEnemyArmy.archers });
    bSpawnTeam("player", { warrior: battlePlayerArmy.warriors, knight: battlePlayerArmy.knights, archer: battlePlayerArmy.archers });

    document.getElementById('battle-status').innerHTML = `<b>סטטוס:</b> הקרב בעיצומו`;
    const { p, e } = bAliveCounts();
    document.getElementById('battle-score').innerHTML = `<b>יחידות:</b> אני ${p} | אויב ${e}`;

    SFX.play('warHorn');
    requestAnimationFrame(bLoop);
}

function onBattleEnd() {
    // Count surviving player units
    let surW = 0, surK = 0, surA = 0;
    for (const u of bUnits) {
        if (!u.alive || u.team !== "player") continue;
        if (u.typeKey === "warrior") surW++;
        else if (u.typeKey === "knight") surK++;
        else if (u.typeKey === "archer") surA++;
    }
    // Return survivors to resources
    resources.warriors += surW;
    resources.knights += surK;
    resources.archers += surA;

    // Show result
    const rm = document.getElementById('battle-result-modal');
    const title = document.getElementById('result-title');
    const sub = document.getElementById('result-subtitle');
    const stats = document.getElementById('result-stats');

    const lostW = battlePlayerArmy.warriors - surW;
    const lostK = battlePlayerArmy.knights - surK;
    const lostA = battlePlayerArmy.archers - surA;
    const totalLost = lostW + lostK + lostA;

    if (battleType === 'raid') {
        // === RAID OUTCOMES ===
        if (bWon) {
            // Win raid: get random war items, 1 to raidEnemyCount
            const lootTypes = ['swords', 'armors', 'shields', 'bows', 'horses'];
            const lootNames = { swords: '🗡️ חרב', armors: '🦺 שריון', shields: '💠 מגן', bows: '🏹 קשת', horses: '🐎 סוס' };
            let lootList = [];
            const numLootTypes = Math.min(2 + Math.floor(Math.random() * 2), lootTypes.length); // 2-3 item types
            const shuffled = [...lootTypes].sort(() => Math.random() - 0.5);
            for (let i = 0; i < numLootTypes; i++) {
                const type = shuffled[i];
                const amt = Math.floor(Math.random() * raidEnemyCount) + 1;
                resources[type] += amt;
                lootList.push(`${amt} ${lootNames[type]}`);
            }
            title.innerText = "🛡️ הבסיס הוגן!";
            sub.innerText = "הדפת את הפשיטה ושללת!";
            title.style.color = "var(--green)";
            stats.innerHTML = `
                <div class="result-stat"><div class="result-stat-label">שרדו</div><div class="result-stat-value" style="color:var(--green)">${surW + surK + surA}</div></div>
                <div class="result-stat"><div class="result-stat-label">נפלו</div><div class="result-stat-value" style="color:var(--red)">${totalLost}</div></div>
                <div class="result-stat" style="grid-column:1/-1"><div class="result-stat-label">שלל מלחמה</div><div class="result-stat-value" style="color:var(--gold)">${lootList.join(' • ')}</div></div>
            `;
            SFX.play('victory');
        } else {
            // Lose raid: lose 3 random resources, 1 to 20% of stock each
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
            title.innerText = "💥 הבסיס נפל!";
            sub.innerText = "האויבים בזזו את המשאבים שלך.";
            title.style.color = "var(--red)";
            stats.innerHTML = `
                <div class="result-stat"><div class="result-stat-label">שרדו</div><div class="result-stat-value" style="color:var(--green)">${surW + surK + surA}</div></div>
                <div class="result-stat"><div class="result-stat-label">נפלו</div><div class="result-stat-value" style="color:var(--red)">${totalLost}</div></div>
                <div class="result-stat" style="grid-column:1/-1"><div class="result-stat-label">משאבים שנבזזו</div><div class="result-stat-value" style="color:var(--red)">${losses.length > 0 ? losses.join(' • ') : 'אין משאבים לאבד'}</div></div>
            `;
            SFX.play('defeat');
        }
    } else {
        // === LAND DISCOVERY OUTCOMES ===
        if (bWon) {
            title.innerText = "🏆 ניצחון!";
            sub.innerText = "כבשת את האדמה החדשה!";
            title.style.color = "var(--green)";
        } else {
            title.innerText = "💀 תבוסה";
            sub.innerText = "האויב ניצח. האדמה לא נכבשה.";
            title.style.color = "var(--red)";
        }

        stats.innerHTML = `
            <div class="result-stat"><div class="result-stat-label">שרדו</div><div class="result-stat-value" style="color:var(--green)">${surW + surK + surA}</div></div>
            <div class="result-stat"><div class="result-stat-label">נפלו</div><div class="result-stat-value" style="color:var(--red)">${totalLost}</div></div>
            <div class="result-stat"><div class="result-stat-label">לוחמים ששרדו</div><div class="result-stat-value">⚔️ ${surW}</div></div>
            <div class="result-stat"><div class="result-stat-label">אבירים ששרדו</div><div class="result-stat-value">🏇 ${surK}</div></div>
            <div class="result-stat"><div class="result-stat-label">קשתים ששרדו</div><div class="result-stat-value">🎯 ${surA}</div></div>
            <div class="result-stat"><div class="result-stat-label">תוצאה</div><div class="result-stat-value">${bWon ? '✅ ניצחון' : '❌ תבוסה'}</div></div>
        `;

        if (bWon) { addEmptyTile(); SFX.play('victory'); }
        else SFX.play('defeat');
    }

    rm.style.display = 'flex';
    updateUI();
}

function closeBattleResult() {
    document.getElementById('battle-result-modal').style.display = 'none';
    document.getElementById('battle-overlay').classList.remove('active');
    isPausedForEvent = false;
    updateUI();
}

// Battle controls
document.getElementById('btn-battle-pause').addEventListener('click', () => {
    if (!bRunning) return; bPaused = !bPaused;
    document.getElementById('btn-battle-pause').textContent = bPaused ? "המשך" : "השהה";
    document.getElementById('battle-status').innerHTML = bPaused ? `<b>סטטוס:</b> מושהה` : `<b>סטטוס:</b> הקרב בעיצומו`;
});

document.getElementById('btn-battle-retreat').addEventListener('click', () => {
    if (!bRunning || bBattleOver) return;
    bBattleOver = true; bRunning = false; bWon = false;
    SFX.play('retreat');
    // Return half of surviving soldiers on retreat
    let surW = 0, surK = 0, surA = 0;
    for (const u of bUnits) {
        if (!u.alive || u.team !== "player") continue;
        if (u.typeKey === "warrior") surW++;
        else if (u.typeKey === "knight") surK++;
        else if (u.typeKey === "archer") surA++;
    }
    // Some units lost during retreat
    resources.warriors += Math.ceil(surW * 0.7);
    resources.knights += Math.ceil(surK * 0.7);
    resources.archers += Math.ceil(surA * 0.7);

    document.getElementById('battle-result-modal').style.display = 'flex';
    document.getElementById('result-title').innerText = "🏃 נסיגה";
    document.getElementById('result-title').style.color = "var(--orange)";
    document.getElementById('result-subtitle').innerText = "נסגת מהקרב. חלק מהלוחמים איבדו את דרכם.";
    const rW = Math.ceil(surW * 0.7), rK = Math.ceil(surK * 0.7), rA = Math.ceil(surA * 0.7);
    document.getElementById('result-stats').innerHTML = `
        <div class="result-stat"><div class="result-stat-label">חזרו</div><div class="result-stat-value" style="color:var(--orange)">${rW + rK + rA}</div></div>
        <div class="result-stat"><div class="result-stat-label">אבדו בנסיגה</div><div class="result-stat-value" style="color:var(--red)">${(surW - rW) + (surK - rK) + (surA - rA)}</div></div>
    `;
    updateUI();
});

window.addEventListener('resize', () => { if (bCanvas && bRunning) bResizeCanvas(); });
