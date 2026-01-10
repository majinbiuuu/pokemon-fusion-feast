window.GEN_DRAG_PAYLOAD = null;
var lastTopVol = 100;
window.returningIndex = -1;
window.SETDEX_CACHE = null; // Renamed from SMOGON_CACHE

// --- SETTINGS LOGIC ---
window.toggleSettings = function() {
    let el = document.getElementById('settings-modal');
    el.style.display = (el.style.display === 'flex') ? 'none' : 'flex';
};

window.saveConfig = function(key, val) {
    db.ref('config/' + key).set(val);
};

// --- SYNC CONFIG ---
db.ref('config').on('value', snap => {
    const c = snap.val() || {};
    
    // 1. Theme Color & Sync
    if(c.theme) {
        document.documentElement.style.setProperty('--accent', c.theme);
        document.getElementById('st-theme-color').value = c.theme;
        // SYNC IFRAMES
        ['frame-play', 'frame-gen', 'frame-music', 'frame-hist'].forEach(id => {
            let el = document.getElementById(id);
            if(el && el.contentWindow) el.contentWindow.postMessage({ type: 'THEME_UPDATE', color: c.theme }, '*');
        });
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

    // 5. Player 1
    const p1Name = c.p1Name || "ALB";
    const p1Color = c.p1Color || "#ff4444";
    document.getElementById('disp-p1-name').innerText = p1Name;
    document.getElementById('disp-p1-name').style.color = p1Color;
    if(document.activeElement !== document.getElementById('st-p1-name')) 
        document.getElementById('st-p1-name').value = p1Name;
    document.getElementById('st-p1-color').value = p1Color;

    // 6. Player 2
    const p2Name = c.p2Name || "BIU";
    const p2Color = c.p2Color || "#4488ff";
    document.getElementById('disp-p2-name').innerText = p2Name;
    document.getElementById('disp-p2-name').style.color = p2Color;
    if(document.activeElement !== document.getElementById('st-p2-name')) 
        document.getElementById('st-p2-name').value = p2Name;
    document.getElementById('st-p2-color').value = p2Color;
});

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
        var userRef = presenceRef.child(myId);
        userRef.onDisconnect().remove();
        userRef.set(true);
    }
});

presenceRef.on('value', function(snap) {
    var val = snap.val() || {};
    var count = Object.keys(val).length;
    document.getElementById('presence-count').innerHTML = `<i class="fas fa-users" style="font-size: 11px;"></i> ${count}`;
});


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
};

// --- EXPORT WITH SETDEX DATA (Showdown Calc) ---
window.exportTeam = async function(side) {
    var btn = document.getElementById('export-' + side);
    var originalIcon = '<i class="fas fa-file-export"></i> Export Team';
    
    // VISUAL LOADING
    btn.innerHTML = '<i class="fas fa-spinner"></i> Exporting...';
    
    var container = document.getElementById('slots-' + side);
    var kids = container.getElementsByClassName('slot');
    var exportText = "";
    var monsToFetch = [];
    
    for(var i=0; i<kids.length; i++) {
        var txt = kids[i].querySelector('.slot-txt');
        if(txt && txt.dataset.id) {
            // Trim and clean name for better matching
            monsToFetch.push({ 
                name: txt.innerText.trim(), 
                id: txt.dataset.id 
            });
        }
    }
    
    if(monsToFetch.length === 0) { 
        alert("Column is empty!"); 
        btn.innerHTML = originalIcon;
        return; 
    }

    // 1. Fetch SETDEX Data if not cached
    if (!window.SETDEX_CACHE) {
        try {
            // Fetch from official calc source via CORS proxy
            const proxyUrl = "https://corsproxy.io/?";
            const calcUrl = "https://calc.pokemonshowdown.com/data/sets/gen9.js"; 
            const res = await fetch(proxyUrl + calcUrl);
            if(res.ok) {
                let text = await res.text();
                // Format is: var SETDEX_SV = { ... };
                // We strip the variable declaration to parse pure JSON
                let start = text.indexOf('{');
                let end = text.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    let jsonStr = text.substring(start, end + 1);
                    window.SETDEX_CACHE = JSON.parse(jsonStr);
                }
            }
        } catch(e) {
            console.warn("Setdex fetch failed, using fallback mode.", e);
        }
    }

    for (let mon of monsToFetch) {
        let setData = null;
        let set = null;

        // --- STRATEGY A: LOOKUP IN SETDEX ---
        if (window.SETDEX_CACHE) {
            // Direct match
            setData = window.SETDEX_CACHE[mon.name];
            
            // If direct match failed, try fuzzy match on ID (e.g. Iron Bundle vs ironbundle)
            if (!setData) {
                let cleanId = mon.id.toLowerCase().replace(/[^a-z0-9]/g, '');
                let foundKey = Object.keys(window.SETDEX_CACHE).find(k => 
                    k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanId
                );
                if(foundKey) setData = window.SETDEX_CACHE[foundKey];
            }

            // If we found the pokemon, pick the first available set (usually the standard meta set)
            if (setData) {
                let firstSetName = Object.keys(setData)[0];
                set = setData[firstSetName];
            }
        }

        if (set) {
            // --- BUILD EXPORT FROM SETDEX ---
            exportText += `${mon.name} @ ${set.item || 'Leftovers'}\n`;
            if(set.ability) exportText += `Ability: ${set.ability}\n`;
            if(set.level && set.level != 100) exportText += `Level: ${set.level}\n`;
            if(set.teraType) exportText += `Tera Type: ${set.teraType}\n`;
            
            // EVs
            if(set.evs) {
                let evList = [];
                for (const [stat, val] of Object.entries(set.evs)) {
                    if(val > 0) evList.push(`${val} ${stat.replace('spa','SpA').replace('spd','SpD').replace('spe','Spe').replace('atk','Atk').replace('def','Def').replace('hp','HP')}`);
                }
                if(evList.length > 0) exportText += `EVs: ${evList.join(' / ')}\n`;
            }

            if(set.nature) exportText += `${set.nature} Nature\n`;
            
            // Moves
            if(set.moves) {
                set.moves.forEach(m => exportText += `- ${m}\n`);
            }
            exportText += `\n`;

        } else {
            // --- STRATEGY B: FALLBACK (PokéAPI) ---
            try {
                let query = mon.id.toLowerCase().replace(/[^a-z0-9]/g, '');
                let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
                if(!res.ok) throw new Error("Not found");
                let data = await res.json();
                
                let stats = data.stats; 
                let sortedStats = [...stats].sort((a,b) => b.base_stat - a.base_stat);
                let best1 = sortedStats[0].stat.name;
                let best2 = sortedStats[1].stat.name;
                
                const statMap = { 'hp':'HP', 'attack':'Atk', 'defense':'Def', 'special-attack':'SpA', 'special-defense':'SpD', 'speed':'Spe' };
                let natureStat = best1 === 'hp' ? best2 : best1;
                let natureMap = { 'attack':'Adamant', 'defense':'Impish', 'special-attack':'Modest', 'special-defense':'Calm', 'speed':'Jolly' };
                let nature = natureMap[natureStat] || 'Serious';

                let levelMoves = data.moves.filter(m => m.version_group_details.some(d => d.move_learn_method.name === 'level-up'));
                let moves = levelMoves.slice(-4).map(m => m.move.name);
                moves = moves.map(m => m.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

                exportText += `${mon.name} @ Leftovers\n`;
                exportText += `Ability: ${data.abilities[0].ability.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n`;
                exportText += `${nature} Nature\n`;
                exportText += `EVs: 252 ${statMap[best1]} / 252 ${statMap[best2]} / 4 HP\n`;
                if(moves.length > 0) moves.forEach(m => exportText += `- ${m}\n`);
                else exportText += `- Tackle\n`;
                exportText += `\n`;

            } catch(e) {
                console.log("Export fallback failed for", mon.name);
                exportText += `${mon.name}\n\n`;
            }
        }
    }

    // VISUAL DONE
    navigator.clipboard.writeText(exportText).then(function() {
        btn.innerHTML = '<i class="fas fa-check" style="color:#0f0"></i> Copied!';
        setTimeout(() => { btn.innerHTML = originalIcon; }, 2000);
    });
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
    if(!data) return;
    var container = document.getElementById('slots-'+side);
    var kids = container.getElementsByClassName('slot');
    for(var i=0; i<kids.length; i++) {
        if(data[i]) {
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
}

window.switchTab = function(viewId, btn) { 
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active')); 
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active')); 
    document.getElementById('view-'+viewId).classList.add('active'); 
    btn.classList.add('active'); 
};

document.addEventListener('DOMContentLoaded', function() {
    window.initSlots('slots-alb'); window.initSlots('slots-biu'); 
});
