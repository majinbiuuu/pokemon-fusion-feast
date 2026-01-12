window.GEN_DRAG_PAYLOAD = null;
var lastTopVol = 100;
window.returningIndex = -1;
window.SETDEX_CACHE = null; 
window.myRole = localStorage.getItem('myRole') || 'spectator';

// --- SETTINGS LOGIC ---
window.toggleSettings = function() {
    let el = document.getElementById('settings-modal');
    el.style.display = (el.style.display === 'flex') ? 'none' : 'flex';
    if(el.style.display === 'flex') updateIdentityUI();
};

window.saveConfig = function(key, val) {
    db.ref('config/' + key).set(val);
};

// --- IDENTITY LOGIC & GHOST FIX ---
window.setIdentity = function(role) {
    // 1. Clean up old presence
    if(window.myRole && window.myRole !== 'spectator') {
        db.ref('presence/' + window.myRole).remove();
        db.ref('presence/' + window.myRole).onDisconnect().cancel(); 
    }

    // 2. Set New Role
    window.myRole = role;
    localStorage.setItem('myRole', role);
    updateIdentityUI();
    
    // 3. Setup New Presence immediately
    setupPresenceDisconnect();
};

function setupPresenceDisconnect() {
    if(window.myRole !== 'spectator') {
        // This ensures the dot disappears if the user closes the tab
        db.ref('presence/' + window.myRole).onDisconnect().remove();
        updatePresence();
    }
}

function updateIdentityUI() {
    document.querySelectorAll('.who-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('role-' + (window.myRole === 'spectator' ? 'spec' : window.myRole));
    if(btn) btn.classList.add('active');
}

// --- SYNC CONFIG ---
db.ref('config').on('value', snap => {
    const c = snap.val() || {};
    
    if(c.theme) {
        document.documentElement.style.setProperty('--accent', c.theme);
        document.getElementById('st-theme-color').value = c.theme;
        broadcastToIframes({ type: 'THEME_UPDATE', color: c.theme });
    }

    if(c.bgUrl) {
        document.body.style.backgroundImage = `url('${c.bgUrl}')`;
        document.getElementById('st-bg-url').value = c.bgUrl;
    } else {
        document.body.style.backgroundImage = 'none';
        document.getElementById('st-bg-url').value = '';
    }

    if(c.bgColor) {
        document.body.style.backgroundColor = c.bgColor;
        document.getElementById('st-bg-color').value = c.bgColor;
    }

    renderSavedWallpapers(c.savedWallpapers || []);

    // Player Configs
    const p1Name = c.p1Name || "ALB";
    const p1Color = c.p1Color || "#ff4444";
    document.documentElement.style.setProperty('--p1-color', p1Color);
    document.getElementById('disp-p1-name').innerText = p1Name;
    document.getElementById('disp-p1-name').style.color = p1Color;
    
    if(document.activeElement !== document.getElementById('st-p1-name')) 
        document.getElementById('st-p1-name').value = p1Name;
    document.getElementById('st-p1-color').value = p1Color;

    const p2Name = c.p2Name || "BIU";
    const p2Color = c.p2Color || "#4488ff";
    document.documentElement.style.setProperty('--p2-color', p2Color);
    document.getElementById('disp-p2-name').innerText = p2Name;
    document.getElementById('disp-p2-name').style.color = p2Color;

    if(document.activeElement !== document.getElementById('st-p2-name')) 
        document.getElementById('st-p2-name').value = p2Name;
    document.getElementById('st-p2-color').value = p2Color;

    broadcastToIframes({ 
        type: 'CONFIG_UPDATE', 
        p1Name, p1Color, p2Name, p2Color 
    });
});

function broadcastToIframes(msg) {
    ['frame-play', 'frame-gen', 'frame-music', 'frame-hist', 'frame-lib'].forEach(id => {
        let el = document.getElementById(id);
        if(el && el.contentWindow) el.contentWindow.postMessage(msg, '*');
    });
}

// --- WALLPAPER MANAGER ---
function addCurrentToSaved() {
    let current = document.getElementById('st-bg-url').value;
    if(!current) return;
    db.ref('config/savedWallpapers').once('value', snap => {
        let list = snap.val() || [];
        if(!list.includes(current)) {
            list.push(current);
            db.ref('config/savedWallpapers').set(list);
        }
    });
}

function removeWallpaper(idx) {
    db.ref('config/savedWallpapers').once('value', snap => {
        let list = snap.val() || [];
        list.splice(idx, 1);
        db.ref('config/savedWallpapers').set(list);
    });
}

function renderSavedWallpapers(list) {
    const container = document.getElementById('saved-bg-list');
    container.innerHTML = '';
    list.forEach((url, idx) => {
        let d = document.createElement('div');
        d.className = 'saved-thumb';
        d.style.backgroundImage = `url('${url}')`;
        d.onclick = () => saveConfig('bgUrl', url);
        d.innerHTML = `<div class="del-thumb" onclick="event.stopPropagation(); removeWallpaper(${idx})">&times;</div>`;
        container.appendChild(d);
    });
}

window.dragOverHandler = function(ev) { ev.preventDefault(); document.getElementById('drop-zone').classList.add('drag-over'); }
window.dragLeaveHandler = function(ev) { document.getElementById('drop-zone').classList.remove('drag-over'); }
window.dropHandler = function(ev) {
    ev.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-over');
    if(ev.dataTransfer.files && ev.dataTransfer.files.length > 0) {
        const file = ev.dataTransfer.files[0];
        if(file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) { saveConfig('bgUrl', e.target.result); };
            reader.readAsDataURL(file);
        }
    }
}

// --- FULLSCREEN LOGIC ---
window.toggleFullScreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((e) => { console.log(`Error: ${e.message}`); });
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
};

// --- PRESENCE LOGIC ---
var myId = localStorage.getItem('presenceId');
if (!myId) {
    myId = Date.now().toString() + Math.random().toString().slice(2,5);
    localStorage.setItem('presenceId', myId);
}

var presenceRef = db.ref('presence');
var connectedRef = db.ref('.info/connected');

connectedRef.on('value', function(snap) {
    if (snap.val() === true) {
        var userRef = presenceRef.child('list/' + myId);
        userRef.onDisconnect().remove();
        userRef.set(true);
        // Re-establish role disconnect on reconnect
        setupPresenceDisconnect();
    }
});

presenceRef.child('list').on('value', function(snap) {
    var val = snap.val() || {};
    var count = Object.keys(val).length;
    document.getElementById('presence-count').innerHTML = `<i class="fas fa-users" style="font-size: 11px;"></i> ${count}`;
});

// --- TAB & HOVER PRESENCE SYSTEM ---
let currentTabId = 'tab-play';
let currentHoverId = null;

function initPresenceSystem() {
    // 1. Mouse Listeners (Hover reporting)
    document.querySelectorAll('.track-hover').forEach(el => {
        el.addEventListener('mouseenter', () => { currentHoverId = el.getAttribute('data-id'); updatePresence(); });
        el.addEventListener('mouseleave', () => { currentHoverId = null; updatePresence(); });
    });

    // 2. Database Listeners (Receiving data)
    db.ref('presence').on('value', snap => {
        const p = snap.val() || {};
        const roles = ['p1', 'p2'];
        
        // Clear visuals
        document.querySelectorAll('.tab-badges').forEach(el => el.innerHTML = '');
        // Clear Glows
        document.querySelectorAll('.peer-hover-p1, .peer-hover-p2').forEach(el => {
            el.classList.remove('peer-hover-p1', 'peer-hover-p2');
        });
        // Clear Iframe Glows
        broadcastToIframes({ type: 'PEER_HOVER', id: null, role: null });

        roles.forEach(role => {
            if(role === window.myRole) return; 
            const data = p[role];
            if(!data) return; // User offline

            // Tab Dot
            if(data.tab) {
                const targetTab = document.querySelector(`.tab[data-id="tab-${data.tab}"]`);
                if(targetTab) {
                    const badgeContainer = targetTab.querySelector('.tab-badges');
                    if(badgeContainer) {
                        const dot = document.createElement('div');
                        dot.className = `p-dot ${role}`;
                        badgeContainer.appendChild(dot);
                    }
                }
            }

            // Hover Glow
            if(data.hover) {
                const targetEl = document.querySelector(`[data-id="${data.hover}"]`);
                if(targetEl) {
                    targetEl.classList.add(`peer-hover-${role}`);
                }
                broadcastToIframes({ type: 'PEER_HOVER', id: data.hover, role: role });
            }
        });
    });
}

function updatePresence() {
    if(window.myRole === 'spectator') return;
    let tabShort = currentTabId.replace('tab-', '');
    db.ref('presence/' + window.myRole).update({
        tab: tabShort,
        hover: currentHoverId,
        timestamp: Date.now()
    });
}

// --- DATA SYNC & GHOST POKEMON FIX ---
db.ref('dashboard').on('value', snap => {
    if(window.syncLock) return; 
    const s = snap.val() || {};
    window.scores.alb = s.scoreAlb || 0; window.scores.biu = s.scoreBiu || 0;
    document.getElementById('score-alb').innerText = window.scores.alb;
    document.getElementById('score-biu').innerText = window.scores.biu;
    
    renderColumn('alb', s.slotsAlb);
    renderColumn('biu', s.slotsBiu);
});

function renderColumn(side, data) {
    var container = document.getElementById('slots-'+side);
    if(!container) return;
    var kids = container.getElementsByClassName('slot');
    
    // FIX: Iterate fixed 0-5 to ensure we clear empty slots
    for(var i=0; i<6; i++) {
        if(data && data[i]) {
            // Fill slot
            if(!kids[i].classList.contains('filled') || kids[i].innerText !== data[i].name) {
                kids[i].innerHTML = `<img src="${data[i].img}" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/${data[i].id}.png'"><div class="slot-txt" data-id="${data[i].id}">${data[i].name}</div>`;
                kids[i].classList.add('filled');
                kids[i].draggable = true;
                let pid = data[i].id; 
                let idx = i; 
                kids[i].ondragstart = function(e) { slotDragStart(e, pid, idx); };
            }
        } else {
            // Clear slot
            if(kids[i].classList.contains('filled')) {
                kids[i].innerHTML = "";
                kids[i].classList.remove('filled');
                kids[i].draggable = false;
            }
        }
    }
    if(window.isCollapsed) generateMiniIcons(side);
}

db.ref('music/status').on('value', snap => {
    const m = snap.val() || {};
    const titleEl = document.getElementById('np-title-top');
    if(titleEl) titleEl.innerText = m.currentTitle || "System Ready";
    const imgEl = document.getElementById('np-img-top');
    if(imgEl) {
        imgEl.src = m.currentId ? `https://img.youtube.com/vi/${m.currentId}/mqdefault.jpg` : "";
        imgEl.style.display = m.currentId ? 'block' : 'none';
    }
    const playBtn = document.getElementById('top-play-btn');
    if(playBtn) playBtn.innerHTML = (m.state === 'PLAYING') ? '<span class="material-icons">pause</span>' : '<span class="material-icons">play_arrow</span>';
});

window.mediaAction = function(action) {
    if(action === 'play') {
        db.ref('music/status/state').once('value', snap => {
            let next = (snap.val() === 'PLAYING') ? 'PAUSED' : 'PLAYING';
            db.ref('music/status/state').set(next);
        });
    } else db.ref('music/cmd').set({ action: action, time: Date.now() });
};

window.sendVolume = function(val) {
    let frame = document.getElementById('frame-music');
    if(frame && frame.contentWindow) frame.contentWindow.postMessage({ type: 'setVolume', value: val }, '*');
    updateTopVolIcon(val);
    if(val > 0) lastTopVol = val;
}

window.toggleTopMute = function() {
    let slider = document.getElementById('top-vol-slider');
    if(slider.value > 0) { sendVolume(0); slider.value = 0; } 
    else { sendVolume(lastTopVol); slider.value = lastTopVol; }
}

function updateTopVolIcon(val) {
    let icon = document.getElementById('top-vol-icon');
    if(val == 0) icon.innerText = "volume_off";
    else if(val < 50) icon.innerText = "volume_down";
    else icon.innerText = "volume_up";
}

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'requestClearCols') { clearCol('alb'); clearCol('biu'); }
    if (event.data && event.data.type === 'GENERATOR_DROP') { handleReturnLogic(); }
    if (event.data && event.data.type === 'HOVER_REPORT') { currentHoverId = event.data.id; updatePresence(); }
});

function handleReturnLogic() {
    if(window.returningId && window.returningElement) {
         let frame = document.getElementById('frame-gen');
         if(frame && frame.contentWindow) frame.contentWindow.postMessage({ type: 'freePokemon', id: window.returningId }, '*');
         
         window.returningElement.innerHTML = "";
         window.returningElement.classList.remove('filled');
         window.returningElement.draggable = false;
         
         var parentId = window.returningElement.parentElement.id;
         var side = parentId.split('-')[1]; 
         
         if(window.returningIndex !== -1) {
             var dbKey = side === 'alb' ? 'slotsAlb' : 'slotsBiu';
             var updateObj = {}; updateObj[window.returningIndex] = null;
             db.ref('dashboard/' + dbKey).update(updateObj);
         } else {
             saveColumnState(side);
         }
         window.returningId = null; window.returningElement = null; window.returningIndex = -1;
    }
}

window.modScore = function(p, op) {
    window.syncLock = true;
    if(op==='add') window.scores[p]++; else window.scores[p] = Math.max(0, window.scores[p]-1);
    document.getElementById('score-'+p).innerText = window.scores[p];
    db.ref('dashboard/score' + (p==='alb'?'Alb':'Biu')).set(window.scores[p]);
    setTimeout(() => window.syncLock = false, 500);
};

window.initSlots = function(id) { 
    var h = ''; 
    for(var i=0; i<6; i++) h += `<div class="slot" data-idx="${i}" ondragover="allowDrop(event)" ondragleave="leaveDrop(event)" ondrop="drop(event)"></div>`; 
    document.getElementById(id).innerHTML = h; 
};

window.allowDrop = function(ev) { ev.preventDefault(); ev.currentTarget.classList.add('drag-over'); ev.dataTransfer.dropEffect = "copy"; };
window.leaveDrop = function(ev) { ev.currentTarget.classList.remove('drag-over'); };

window.drop = function(ev) { 
    ev.preventDefault(); ev.currentTarget.classList.remove('drag-over'); 
    var data = window.GEN_DRAG_PAYLOAD;
    if(!data) { try { data = JSON.parse(ev.dataTransfer.getData("text/plain")); } catch(e){} }
    if(data) { 
        window.syncLock = true;
        ev.currentTarget.innerHTML = `<img src="${data.img}" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/${data.id}.png'"><div class="slot-txt" data-id="${data.id}">${data.name}</div>`; 
        ev.currentTarget.classList.add('filled'); 
        ev.currentTarget.draggable = true;
        let idx = ev.currentTarget.dataset.idx;
        ev.currentTarget.ondragstart = function(e) { slotDragStart(e, data.id, idx); };
        var parentId = ev.currentTarget.parentElement.id;
        var side = parentId.split('-')[1]; 
        saveColumnState(side);
        let frame = document.getElementById('frame-gen');
        if(frame && frame.contentWindow) frame.contentWindow.postMessage({ type: 'markUsed', id: data.id }, '*');
        window.GEN_DRAG_PAYLOAD = null;
        setTimeout(() => window.syncLock = false, 1000);
        if(window.isCollapsed) generateMiniIcons(side);
    } 
};

function slotDragStart(e, id, idx) {
    e.dataTransfer.setData("text/return", id);
    e.dataTransfer.effectAllowed = "move";
    window.returningId = id; window.returningElement = e.target; window.returningIndex = idx;
}

window.allowReturnDrop = function(ev) { if(window.returningId) ev.preventDefault(); };
window.returnDrop = function(ev) { ev.preventDefault(); handleReturnLogic(); };

window.clearCol = function(p) { 
    window.syncLock = true;
    var container = document.getElementById('slots-'+p);
    var kids = container.getElementsByClassName('slot');
    let frame = document.getElementById('frame-gen');
    for(var i=0; i<kids.length; i++) {
       var txt = kids[i].querySelector('.slot-txt');
       if(txt && txt.dataset.id && frame && frame.contentWindow) {
           frame.contentWindow.postMessage({ type: 'freePokemon', id: txt.dataset.id }, '*');
       }
    }
    window.initSlots('slots-'+p); 
    saveColumnState(p);
    setTimeout(() => window.syncLock = false, 1000);
    if(window.isCollapsed) generateMiniIcons(p);
};

// --- LAYOUT LOGIC (REFACTORED) ---
window.isCollapsed = false;
window.centerCollapsed = false;

// 1. Column Buttons: ONLY toggle side columns
window.toggleCollapse = function() {
    window.isCollapsed = !window.isCollapsed;
    const icons = document.querySelectorAll('.collapse-btn i');
    icons.forEach(icon => { icon.className = window.isCollapsed ? "fas fa-expand-alt" : "fas fa-compress-alt"; });

    ['alb', 'biu'].forEach(side => {
        const col = document.getElementById('col-' + side);
        const list = document.getElementById('slots-' + side);
        const miniRow = document.getElementById('mini-' + side);
        
        if (window.isCollapsed) {
            generateMiniIcons(side);
            list.classList.add('collapsed');
            miniRow.classList.add('active');
            col.classList.add('collapsed-view');
        } else {
            list.classList.remove('collapsed');
            miniRow.classList.remove('active');
            col.classList.remove('collapsed-view');
        }
    });
};

// 2. Center Button: Toggles BOTH center window and columns
window.toggleCenterCollapse = function() {
    window.centerCollapsed = !window.centerCollapsed;
    const colC = document.querySelector('.col-c');
    const icon = document.getElementById('c-collapse-icon');
    
    if(window.centerCollapsed) {
        colC.classList.add('minimized');
        if(icon) icon.className = "fas fa-expand-alt"; 
    } else {
        colC.classList.remove('minimized');
        if(icon) icon.className = "fas fa-compress-alt"; 
    }

    if (window.centerCollapsed !== window.isCollapsed) {
        window.toggleCollapse();
    }
};

// 3. Tab Clicks: ONLY toggle center window
window.switchTab = function(viewId, btn) { 
    // Logic: If clicking SAME tab that is open, minimize center.
    if (currentTabId === 'tab-' + viewId && !window.centerCollapsed) {
        window.centerCollapsed = true;
        document.querySelector('.col-c').classList.add('minimized');
        const icon = document.getElementById('c-collapse-icon');
        if(icon) icon.className = "fas fa-expand-alt";
        return;
    }

    // Logic: If minimized, open center (but don't touch columns)
    if (window.centerCollapsed) {
        window.centerCollapsed = false;
        document.querySelector('.col-c').classList.remove('minimized');
        const icon = document.getElementById('c-collapse-icon');
        if(icon) icon.className = "fas fa-compress-alt";
    }

    currentTabId = 'tab-' + viewId;
    updatePresence();

    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active')); 
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active')); 
    document.getElementById('view-'+viewId).classList.add('active'); 
    btn.classList.add('active'); 
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', function() {
    window.initSlots('slots-alb'); window.initSlots('slots-biu'); 
    initPresenceSystem();
    setupPresenceDisconnect(); // FIX GHOST INDICATOR

    // START MINIMIZED
    window.centerCollapsed = true;
    document.querySelector('.col-c').classList.add('minimized');
    const icon = document.getElementById('c-collapse-icon');
    if(icon) icon.className = "fas fa-expand-alt";

    window.isCollapsed = true;
    const icons = document.querySelectorAll('.collapse-btn i');
    icons.forEach(icon => { icon.className = "fas fa-expand-alt"; });
    ['alb', 'biu'].forEach(side => {
        document.getElementById('col-' + side).classList.add('collapsed-view');
        document.getElementById('slots-' + side).classList.add('collapsed');
        document.getElementById('mini-' + side).classList.add('active');
        generateMiniIcons(side);
    });

    db.ref('library').once('value').then(snap => {
        window.appData = snap.val() || {};
        ['frame-play', 'frame-gen'].forEach(id => {
            let el = document.getElementById(id);
            if(el && el.contentWindow) try { el.contentWindow.appData = window.appData; } catch(e) {}
        });
    });
});
