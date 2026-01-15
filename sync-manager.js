/* sync-manager.js */
/* Handles Firebase connection, Identity, and Global State Synchronization */

// --- 1. FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyDz82Dp56EISYqk3hza3upJ2pAjsStgMKo",
  authDomain: "pokemon-masters-d153a.firebaseapp.com",
  databaseURL: "https://pokemon-masters-d153a-default-rtdb.firebaseio.com",
  projectId: "pokemon-masters-d153a",
  storageBucket: "pokemon-masters-d153a.firebasestorage.app",
  messagingSenderId: "67655442054",
  appId: "1:67655442054:web:705baa26ffda58b5d3fb07",
  measurementId: "G-LGW9RJZDP3"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ESTABLISH GLOBAL DB CONNECTION
window.db = firebase.database();

// --- 2. GLOBAL STATE ---
window.appData = {};
window.scores = { alb: 0, biu: 0 };
window.syncLock = false;
window.playerColors = { p1: '#ff4444', p2: '#4488ff' };
window.myRole = localStorage.getItem('myRole') || 'spectator';

// --- 3. IDENTITY & PRESENCE LOGIC ---
var myId = localStorage.getItem('presenceId');
if (!myId) { 
    myId = Date.now().toString() + Math.random().toString().slice(2,5); 
    localStorage.setItem('presenceId', myId); 
}

var presenceRef = window.db.ref('presence');
var connectedRef = window.db.ref('.info/connected');

connectedRef.on('value', function(snap) {
    if (snap.val() === true) {
        var userRef = presenceRef.child('list/' + myId);
        userRef.onDisconnect().remove();
        userRef.set(true);
    }
});

presenceRef.child('list').on('value', function(snap) {
    var val = snap.val() || {};
    var count = Object.keys(val).length;
    document.getElementById('presence-count').innerHTML = `<i class="fas fa-users" style="font-size: 11px;"></i> ${count}`;
});

window.setIdentity = function(role) {
    if(window.myRole && window.myRole !== 'spectator') {
        window.db.ref('presence/' + window.myRole).remove();
        window.db.ref('presence/' + window.myRole).onDisconnect().cancel(); 
    }
    window.myRole = role;
    localStorage.setItem('myRole', role);
    updateIdentityUI();
    if(role !== 'spectator') {
        window.db.ref('presence/' + role).onDisconnect().remove();
        updatePresence();
    }
};

window.updateIdentityUI = function() {
    document.querySelectorAll('.who-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('role-' + (window.myRole === 'spectator' ? 'spec' : window.myRole));
    if(btn) btn.classList.add('active');
};

window.updatePresence = function() {
    if(window.myRole === 'spectator') return;
    let currentTabId = document.querySelector('.tab.active') ? document.querySelector('.tab.active').dataset.id : 'tab-play';
    let tabShort = currentTabId.replace('tab-', '');
    window.db.ref('presence/' + window.myRole).update({ tab: tabShort, timestamp: Date.now() });
};

// REPORT INTERACTION (Helper function)
window.reportInteraction = function(elementId, type, x, y) {
    if(window.myRole === 'spectator') return;
    window.db.ref('presence/' + window.myRole + '/universal').set({
        elementId: elementId,
        type: type, // 'click' or 'hover'
        x: x || 0,
        y: y || 0,
        timestamp: Date.now()
    });
};

window.initPresenceSystem = function() {
    window.db.ref('presence').on('value', snap => {
        const p = snap.val() || {};
        const roles = ['p1', 'p2'];
        
        // 1. Tab Dots Logic
        document.querySelectorAll('.tab-badges').forEach(el => el.innerHTML = '');
        roles.forEach(role => {
            if(role === window.myRole) return; 
            const data = p[role];
            if(!data) return;
            
            // Render Tabs
            if(data.tab) {
                const targetTab = document.querySelector(`.tab[data-id="tab-${data.tab}"]`);
                if(targetTab) {
                    const badgeContainer = targetTab.querySelector('.tab-badges');
                    if(badgeContainer) {
                        const dot = document.createElement('div');
                        dot.className = `p-dot ${role}`;
                        dot.style.backgroundColor = window.playerColors[role] || (role==='p1'?'#ff4444':'#4488ff');
                        dot.style.color = dot.style.backgroundColor;
                        badgeContainer.appendChild(dot);
                    }
                }
            }

            // 2. Universal Interaction Logic (Clicks & Hovers)
            if(data.universal) {
                const u = data.universal;
                // Only process fresh events (within last 2 seconds)
                if (Date.now() - u.timestamp < 2000) {
                    const el = document.getElementById(u.elementId);
                    const roleColor = window.playerColors[role];

                    if (u.type === 'click' && el) {
                        // Create Ripple
                        const ripple = document.createElement('div');
                        ripple.className = 'peer-click-effect';
                        ripple.style.left = u.x + 'px';
                        ripple.style.top = u.y + 'px';
                        ripple.style.color = roleColor;
                        document.body.appendChild(ripple);
                        setTimeout(() => ripple.remove(), 600);
                    } 
                    
                    if (u.type === 'hover' && el) {
                        // Apply Hover Border
                        el.classList.add('peer-hover-' + role);
                        // Auto remove after 2 seconds of inactivity
                        setTimeout(() => el.classList.remove('peer-hover-' + role), 2000);
                    }
                }
            }
        });
    });
};

// --- 4. CONFIG SYNC ---
window.saveConfig = function(key, val) {
    window.db.ref('config/' + key).set(val);
};

window.db.ref('config').on('value', snap => {
    const c = snap.val() || {};
    
    if(c.theme) {
        document.documentElement.style.setProperty('--accent', c.theme);
        if(document.getElementById('st-theme-color')) document.getElementById('st-theme-color').value = c.theme;
    }
    
    const p1Name = c.p1Name || "ALB";
    const p1Color = c.p1Color || "#ff4444";
    window.playerColors.p1 = p1Color;
    document.documentElement.style.setProperty('--p1-color', p1Color);
    
    const p2Name = c.p2Name || "BIU";
    const p2Color = c.p2Color || "#4488ff";
    window.playerColors.p2 = p2Color;
    document.documentElement.style.setProperty('--p2-color', p2Color);

    if(document.getElementById('disp-p1-name')) {
        document.getElementById('disp-p1-name').innerText = p1Name;
        document.getElementById('disp-p1-name').style.color = p1Color;
    }
    if(document.getElementById('disp-p2-name')) {
        document.getElementById('disp-p2-name').innerText = p2Name;
        document.getElementById('disp-p2-name').style.color = p2Color;
    }

    if(document.activeElement !== document.getElementById('st-p1-name') && document.getElementById('st-p1-name')) 
        document.getElementById('st-p1-name').value = p1Name;
    if(document.getElementById('st-p1-color')) document.getElementById('st-p1-color').value = p1Color;

    if(document.activeElement !== document.getElementById('st-p2-name') && document.getElementById('st-p2-name')) 
        document.getElementById('st-p2-name').value = p2Name;
    if(document.getElementById('st-p2-color')) document.getElementById('st-p2-color').value = p2Color;

    ['frame-play', 'frame-gen', 'frame-music', 'frame-hist', 'frame-lib'].forEach(id => {
        let el = document.getElementById(id);
        if(el && el.contentWindow) el.contentWindow.postMessage({ type: 'CONFIG_UPDATE', p1Name, p1Color, p2Name, p2Color }, '*');
        if(el && el.contentWindow && c.theme) el.contentWindow.postMessage({ type: 'THEME_UPDATE', color: c.theme }, '*');
    });
});

// --- 5. SCORE & DASHBOARD SYNC ---
window.modScore = function(p, op) {
    window.syncLock = true;
    if(op==='add') window.scores[p]++; else window.scores[p] = Math.max(0, window.scores[p]-1);
    document.getElementById('score-'+p).innerText = window.scores[p];
    window.db.ref('dashboard/score' + (p==='alb'?'Alb':'Biu')).set(window.scores[p]);
    setTimeout(() => window.syncLock = false, 500);
};

window.db.ref('dashboard').on('value', snap => {
    if(window.syncLock) return; 
    const s = snap.val() || {};
    window.scores.alb = s.scoreAlb || 0; 
    window.scores.biu = s.scoreBiu || 0;
    
    if(document.getElementById('score-alb')) document.getElementById('score-alb').innerText = window.scores.alb;
    if(document.getElementById('score-biu')) document.getElementById('score-biu').innerText = window.scores.biu;
    
    if(typeof window.renderColumn === 'function') {
        window.renderColumn('alb', s.slotsAlb);
        window.renderColumn('biu', s.slotsBiu);
    }
});
