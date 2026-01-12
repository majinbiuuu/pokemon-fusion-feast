window.GEN_DRAG_PAYLOAD = null;
var lastTopVol = 100;
window.returningIndex = -1;
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

// --- IDENTITY LOGIC ---
window.setIdentity = function(role) {
    // 1. Remove old presence if exists
    if(window.myRole && window.myRole !== 'spectator') {
        db.ref('presence/' + window.myRole).remove();
        db.ref('presence/' + window.myRole).onDisconnect().cancel(); 
    }

    // 2. Set New Role
    window.myRole = role;
    localStorage.setItem('myRole', role);
    updateIdentityUI();
    
    // 3. Setup New Presence (with Disconnect Handler)
    if(role !== 'spectator') {
        db.ref('presence/' + role).onDisconnect().remove();
        updatePresence();
    }
};

function updateIdentityUI() {
    document.querySelectorAll('.who-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('role-' + (window.myRole === 'spectator' ? 'spec' : window.myRole));
    if(btn) btn.classList.add('active');
}

// --- SYNC CONFIG (Updated for P1/P2) ---
db.ref('config').on('value', snap => {
    const c = snap.val() || {};
    
    // 1. Theme Color & Sync
    if(c.theme) {
        document.documentElement.style.setProperty('--accent', c.theme);
        document.getElementById('st-theme-color').value = c.theme;
        broadcastToIframes({ type: 'THEME_UPDATE', color: c.theme });
    }

    // 2. Background Image
    if(c.bgUrl) {
        document.body.style.backgroundImage = `url('${c.bgUrl}')`;
        document.getElementById('st-bg-url').value = c.bgUrl;
    } else {
        document.body.style.backgroundImage = 'none';
        document.getElementById('st-bg-url').value = '';
    }

    // 3. Background Color
    if(c.bgColor) {
        document.body.style.backgroundColor = c.bgColor;
        document.getElementById('st-bg-color').value = c.bgColor;
    }

    // 4. Saved Wallpapers
    renderSavedWallpapers(c.savedWallpapers || []);

    // 5. Player 1 Config
    const p1Name = c.p1Name || "ALB";
    const p1Color = c.p1Color || "#ff4444";
    document.documentElement.style.setProperty('--p1-color', p1Color);
    document.getElementById('disp-p1-name').innerText = p1Name;
    document.getElementById('disp-p1-name').style.color = p1Color;
    
    if(document.activeElement !== document.getElementById('st-p1-name')) 
        document.getElementById('st-p1-name').value = p1Name;
    document.getElementById('st-p1-color').value = p1Color;

    // 6. Player 2 Config
    const p2Name = c.p2Name || "BIU";
    const p2Color = c.p2Color || "#4488ff";
    document.documentElement.style.setProperty('--p2-color', p2Color);
    document.getElementById('disp-p2-name').innerText = p2Name;
    document.getElementById('disp-p2-name').style.color = p2Color;

    if(document.activeElement !== document.getElementById('st-p2-name')) 
        document.getElementById('st-p2-name').value = p2Name;
    document.getElementById('st-p2-color').value = p2Color;

    // Broadcast Config Update to Iframes (so they can update names/colors)
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

// --- SETTINGS DRAG DROP ---
window.dragOverHandler = function(ev) {
    ev.preventDefault();
    document.getElementById('drop-zone').classList.add('drag-over');
}

window.dragLeaveHandler = function(ev) {
    document.getElementById('drop-zone').classList.remove('drag-over');
}

window.dropHandler = function(ev) {
    ev.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-over');
    if(ev.dataTransfer.files && ev.dataTransfer.files.length > 0) {
        const file = ev.dataTransfer.files[0];
        if(file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                saveConfig('bgUrl', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }
}

// --- FULLSCREEN LOGIC ---
window.toggleFullScreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((e) => {
            console.log(`Error attempting to enable fullscreen: ${e.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
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

// Standard "Online Count" Logic
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

// --- NEW: TAB PRESENCE SYSTEM (Glow Removed) ---
let currentTabId = 'tab-play';

function initPresenceSystem() {
    // 2. Listen for OTHER players
    db.ref('presence').on('value', snap => {
        const p = snap.val() || {};
        const roles = ['p1', 'p2'];
        
        // Clear old indicators in Shell
        document.querySelectorAll('.tab-badges').forEach(el => el.innerHTML = '');

        roles.forEach(role => {
            if(role === window.myRole) return; // Don't show self
            
            const data = p[role];
            if(!data) return;

            // Show "Present in Tab" Dot ONLY
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
        });
    });
}

function updatePresence() {
    if(window.myRole === 'spectator') return;
    
    let tabShort = currentTabId.replace('tab-', '');
    
    // We do NOT send hover data anymore as requested
    db.ref('presence/' + window.myRole).update({
        tab: tabShort,
        timestamp: Date.now()
    });
}


// --- DASHBOARD SYNC ---
db.ref('dashboard').on('value', snap => {
    if(window.syncLock) return; 
    const s = snap.val() || {};
    window.scores.alb = s.scoreAlb || 0; window.scores.biu = s.scoreBiu || 0;
    document.getElementById('score-alb').innerText = window.scores.alb;
    document.getElementById('score-biu').innerText = window.scores.biu;
    if(s.slotsAlb) renderColumn('alb', s.slotsAlb);
    if(s.slotsBiu) renderColumn('biu', s.slotsBiu);
});

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
    if(playBtn) {
        let isPlaying = (m.state === 'PLAYING');
        playBtn.innerHTML = isPlaying ? '<span class="material-icons">pause</span>' : '<span class="material-icons">play_arrow</span>';
    }
});

window.mediaAction = function(action) {
    if(action === 'play') {
        db.ref('music/status/state').once('value', snap => {
            let current = snap.val() || 'PAUSED'; 
            let next = (current === 'PLAYING') ? 'PAUSED' : 'PLAYING';
            db.ref('music/status/state').set(next);
        });
    } 
    else {
         db.ref('music/cmd').set({ action: action, time: Date.now() });
    }
};

window.sendVolume = function(val) {
    let frame = document.getElementById('frame-music');
    if(frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'setVolume', value: val }, '*');
    }
    updateTopVolIcon(val);
    if(val > 0) lastTopVol = val;
}

window.toggleTopMute = function() {
    let slider = document.getElementById('top-vol-slider');
    let current = slider.value;
    if(current > 0) {
        sendVolume(0);
        slider.value = 0;
    } else {
        sendVolume(lastTopVol);
        slider.value = lastTopVol;
    }
}

function updateTopVolIcon(val) {
    let icon = document.getElementById('top-vol-icon');
    if(val == 0) icon.innerText = "volume_off";
    else if(val < 50) icon.innerText = "volume_down";
    else icon.innerText = "volume_up";
}

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'requestClearCols') {
        clearCol('alb'); clearCol('biu');
    }
    if (event.data && event.data.type === 'GENERATOR_DROP') {
        handleReturnLogic();
    }
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
             db.ref('dashboard/' + dbKey + '/' + window.returningIndex).set(null);
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
    ev.preventDefault(); 
    ev.currentTarget.classList.remove('drag-over'); 
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
        
        // Refresh Icons if collapsed
        if(window.isCollapsed) generateMiniIcons(side);
    } 
};

function slotDragStart(e, id, idx) {
    e.dataTransfer.setData("text/return", id);
    e.dataTransfer.effectAllowed = "move";
    window.returningId = id; 
    window.returningElement = e.target;
    window.returningIndex = idx;
}

window.allowReturnDrop = function(ev) { if(window.returningId) ev.preventDefault(); };

window.returnDrop = function(ev) {
    ev.preventDefault();
    handleReturnLogic();
};

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
    
    // Refresh Icons if collapsed
    if(window.isCollapsed) generateMiniIcons(p);
};

// --- EXPORT WITH SETDEX DATA (Showdown Calc) ---
// MOVED TO export.js - Logic stub remains here to ensure no errors if called before load
if (!window.exportTeam) {
    window.exportTeam = function() { console.log("Export module not loaded."); };
}

function saveColumnState(side) {
    var slots = [];
    var container = document.getElementById('slots-'+side);
    var kids = container.getElementsByClassName('slot');
    for(var i=0; i<kids.length; i++) {
        var img = kids[i].querySelector('img');
        var txt = kids[i].querySelector('.slot-txt');
        if(img && txt) slots.push({ img: img.src, name: txt.innerText, id: txt.dataset.id });
        else slots.push(null);
    }
    db.ref('dashboard/slots' + (side==='alb'?'Alb':'Biu')).set(slots);
}

function renderColumn(side, data) {
    // FIX: Handle null/undefined data by forcing empty check loop
    var container = document.getElementById('slots-'+side);
    var kids = container.getElementsByClassName('slot');
    
    for(var i=0; i<kids.length; i++) {
        // If data exists AND data[i] exists, fill. Otherwise clear.
        if(data && data[i]) {
            if(!kids[i].classList.contains('filled') || kids[i].innerText !== data[i].name) {
                kids[i].innerHTML = `<img src="${data[i].img}" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/${data[i].id}.png'"><div class="slot-txt" data-id="${data[i].id}">${data[i].name}</div>`;
                kids[i].classList.add('filled');
                kids[i].draggable = true;
                let pid = data[i].id; 
                let idx = i; 
                kids[i].ondragstart = function(e) { slotDragStart(e, pid, idx); };
            }
        } else {
            if(kids[i].classList.contains('filled')) {
                kids[i].innerHTML = "";
                kids[i].classList.remove('filled');
                kids[i].draggable = false;
            }
        }
    }
    // Update Mini Icons if Collapsed
    if(window.isCollapsed) generateMiniIcons(side);
}


/* --- COLLAPSE / EXPAND LOGIC (PLAYERS) --- */
window.isCollapsed = false;

window.toggleCollapse = function() {
    window.isCollapsed = !window.isCollapsed;
    
    // Update Button Icons
    const icons = document.querySelectorAll('.collapse-btn i');
    icons.forEach(icon => {
        icon.className = window.isCollapsed ? "fas fa-expand-alt" : "fas fa-compress-alt";
    });

    // Handle Animation & Mini Row Generation for BOTH sides
    ['alb', 'biu'].forEach(side => {
        // Target the container directly using the IDs added to index.html
        const col = document.getElementById('col-' + side);
        const list = document.getElementById('slots-' + side);
        const miniRow = document.getElementById('mini-' + side);
        
        if (window.isCollapsed) {
            // 1. Generate Mini Icons from current slots
            generateMiniIcons(side);
            
            // 2. Hide List, Show Mini, Shrink Container
            list.classList.add('collapsed');
            miniRow.classList.add('active');
            col.classList.add('collapsed-view'); // Shrinks the glass pane
        } else {
            // 1. Show List, Hide Mini, Expand Container
            list.classList.remove('collapsed');
            miniRow.classList.remove('active');
            col.classList.remove('collapsed-view'); // Restores size
        }
    });
};

window.generateMiniIcons = function(side) {
    const miniRow = document.getElementById('mini-' + side);
    const slots = document.getElementById('slots-' + side).getElementsByClassName('slot');
    
    let html = '';
    
    // Loop through existing slots to grab images
    for(let i=0; i < slots.length; i++) {
        const img = slots[i].querySelector('img');
        if (img) {
            html += `<div class="mini-slot"><img src="${img.src}"></div>`;
        } else {
            html += `<div class="mini-slot empty"></div>`;
        }
    }
    
    miniRow.innerHTML = html;
}

/* --- COLLAPSE / EXPAND LOGIC (CENTER WINDOW) --- */
window.centerCollapsed = false;

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

    // --- NEW: SYNC COLUMNS WITH CENTER ---
    // If center is collapsed, ensure columns are collapsed.
    // If center is expanded, ensure columns are expanded.
    if (window.centerCollapsed !== window.isCollapsed) {
        window.toggleCollapse();
    }
};

window.switchTab = function(viewId, btn) { 
    // TOGGLE LOGIC:
    // 1. If currently OPEN and click SAME tab -> Close it (Minimize)
    if (currentTabId === 'tab-' + viewId && !window.centerCollapsed) {
        window.toggleCenterCollapse();
        return;
    }

    // 2. If minimized -> Open it
    if (window.centerCollapsed) {
        window.toggleCenterCollapse();
    }

    // 3. Switch active view
    currentTabId = 'tab-' + viewId;
    updatePresence();

    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active')); 
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active')); 
    document.getElementById('view-'+viewId).classList.add('active'); 
    btn.classList.add('active'); 
};

document.addEventListener('DOMContentLoaded', function() {
    window.initSlots('slots-alb'); window.initSlots('slots-biu'); 
    
    // Init Presence
    initPresenceSystem();

    // START MINIMIZED (Both Columns and Center)
    window.toggleCollapse();       // Collapse Side Columns
    window.toggleCenterCollapse(); // Collapse Center Window
    
    // --- LIBRARY LOADER (DATA ONLY) ---
    // This fetches data so other tabs like Generator/Play can use it
    db.ref('library').once('value').then(snap => {
        window.appData = snap.val() || {};
        ['frame-play', 'frame-gen'].forEach(id => {
            let el = document.getElementById(id);
            if(el && el.contentWindow) {
                try { el.contentWindow.appData = window.appData; } catch(e) {}
            }
        });
    });
});
