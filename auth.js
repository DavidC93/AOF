// ===== Cloud Auth & Save System =====

let authToken = localStorage.getItem('aof_token') || null;
let authEmail = localStorage.getItem('aof_email') || null;
let authMode = 'login'; // 'login' or 'register'
let cloudSaveTimer = null;
let currentSignature = localStorage.getItem('aof_sig') || '__first_save__';

// API base (empty for same-origin Netlify Functions)
const API = '/.netlify/functions';

// ===== Auth UI =====

function updateAuthUI() {
    const statusEl = document.getElementById('auth-status');
    if (!statusEl) return;

    if (authToken && authEmail) {
        statusEl.innerHTML = `
            <div class="cloud-info">
                <div class="cloud-email">☁️ ${authEmail}</div>
                <div class="cloud-btns">
                    <button class="cheat-btn" style="background:var(--green)" onclick="cloudSave(event)">💾 שמור בענן</button>
                    <button class="cheat-btn" style="background:var(--blue)" onclick="cloudLoad(event)">📥 טען מענן</button>
                </div>
                <button class="cheat-btn" style="background:var(--red);margin-top:4px" onclick="logout(event)">🚪 התנתק</button>
            </div>
        `;
    } else {
        statusEl.innerHTML = `
            <button class="cheat-btn" style="width:100%; background:var(--blue);" onclick="closeModal('menuModal');openModal('authModal')">🔑 התחבר / הירשם</button>
        `;
    }
}

function toggleAuthMode(e) {
    if (e) e.preventDefault();
    authMode = authMode === 'login' ? 'register' : 'login';
    document.getElementById('auth-modal-title').innerText = authMode === 'login' ? '🔑 התחברות' : '📝 הרשמה';
    document.getElementById('auth-submit-btn').innerText = authMode === 'login' ? 'התחבר' : 'הירשם';
    document.getElementById('auth-toggle-text').innerText = authMode === 'login' ? 'אין לך חשבון?' : 'כבר יש לך חשבון?';
    document.getElementById('auth-toggle-btn').innerText = authMode === 'login' ? 'הירשם' : 'התחבר';
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('auth-success').style.display = 'none';
}

async function submitAuth() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    const btn = document.getElementById('auth-submit-btn');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (!email || !password) {
        errorEl.innerText = 'נדרשים אימייל וסיסמה';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerText = '⏳ מתחבר...';

    try {
        const endpoint = authMode === 'login' ? 'login' : 'register';
        const res = await fetch(`${API}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            errorEl.innerText = data.error || 'שגיאה';
            errorEl.style.display = 'block';
            return;
        }

        // Success
        authToken = data.token;
        authEmail = data.email;
        localStorage.setItem('aof_token', authToken);
        localStorage.setItem('aof_email', authEmail);

        successEl.innerText = data.message || 'בוצע!';
        successEl.style.display = 'block';

        SFX.play('victory');

        // Load cloud save on login
        setTimeout(async () => {
            closeModal('authModal');
            updateAuthUI();
            await cloudLoad(null); // silent load
        }, 1000);
    } catch (err) {
        errorEl.innerText = 'שגיאת חיבור לשרת';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerText = authMode === 'login' ? 'התחבר' : 'הירשם';
    }
}

function logout(event) {
    vibe();
    authToken = null;
    authEmail = null;
    currentSignature = '__first_save__';
    localStorage.removeItem('aof_token');
    localStorage.removeItem('aof_email');
    localStorage.removeItem('aof_sig');
    showFeedback(event, '🚪 התנתקת');
    SFX.play('click');
    updateAuthUI();
}

// ===== Cloud Save/Load =====

async function cloudSave(event) {
    if (!authToken) {
        if (event) showFeedback(event, '❌ לא מחובר', 'error');
        return;
    }

    if (event) {
        vibe();
        showFeedback(event, '☁️ שומר...');
    }

    try {
        const saveData = {
            resources,
            townHallLevel,
            libraryLevel,
            discoveredTilesCount,
            tiles
        };

        const res = await fetch(`${API}/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ saveData, signature: currentSignature })
        });

        const data = await res.json();

        if (res.ok) {
            // Update signature for next save
            currentSignature = data.signature;
            localStorage.setItem('aof_sig', currentSignature);
            if (event) {
                setTimeout(() => showFeedback(event, '✅ נשמר!'), 300);
                SFX.play('collect');
            }
            if (data.warning) console.warn('Cloud save warning:', data.warning);
        } else if (res.status === 401) {
            logout(event);
            alert('התחברותך פגה. התחבר שוב.');
        } else if (res.status === 429) {
            // Rate limited — silent on auto, show on manual
            if (event) showFeedback(event, '⏳ מהר מדי', 'error');
        } else {
            if (event) showFeedback(event, '❌ שגיאה', 'error');
        }
    } catch (err) {
        if (event) showFeedback(event, '❌ שגיאת רשת', 'error');
    }
}

async function cloudLoad(event) {
    if (!authToken) {
        if (event) showFeedback(event, '❌ לא מחובר', 'error');
        return;
    }

    if (event) {
        vibe();
        showFeedback(event, '☁️ טוען...');
    }

    try {
        const res = await fetch(`${API}/load`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await res.json();

        if (res.ok && data.saveData) {
            const s = data.saveData;
            Object.assign(resources, s.resources);
            townHallLevel = s.townHallLevel || 1;
            libraryLevel = s.libraryLevel || 1;
            discoveredTilesCount = s.discoveredTilesCount || 0;
            if (s.tiles) tiles = s.tiles;
            // Store signature for next save
            currentSignature = data.signature;
            localStorage.setItem('aof_sig', currentSignature);
            updateUI();
            if (event) {
                setTimeout(() => showFeedback(event, '✅ נטען!'), 300);
                SFX.play('collect');
            }
        } else if (res.ok && !data.saveData) {
            currentSignature = data.signature || '__first_save__';
            localStorage.setItem('aof_sig', currentSignature);
            if (event) showFeedback(event, '📭 אין שמירה', 'error');
        } else {
            if (res.status === 401) {
                logout(event);
                alert('התחברותך פגה. התחבר שוב.');
            }
        }
    } catch (err) {
        if (event) showFeedback(event, '❌ שגיאת רשת', 'error');
    }
}

// Debounced auto cloud save (saves 10 seconds after last change, silently)
function scheduleCloudSave() {
    if (!authToken) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => cloudSave(null), 10000);
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
});

// Hook into autoSave to also schedule cloud save
const originalAutoSave = typeof autoSave === 'function' ? autoSave : null;
if (originalAutoSave) {
    window.autoSave = function () {
        originalAutoSave();
        scheduleCloudSave();
    };
}

// Hook into resetGame to clear cloud signature
const originalResetGame = typeof resetGame === 'function' ? resetGame : null;
if (originalResetGame) {
    window.resetGame = function (event) {
        currentSignature = '__first_save__';
        localStorage.setItem('aof_sig', '__first_save__');
        originalResetGame(event);
    };
}
