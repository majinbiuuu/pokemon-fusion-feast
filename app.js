window.GEN_DRAG_PAYLOAD = null;
var lastTopVol = 100;
window.returningIndex = -1;
window.SETDEX_CACHE = null; 
window.myRole = localStorage.getItem('myRole') || 'spectator';
window.playerColors = { p1: '#ff4444', p2: '#4488ff' };

/* --- CONFIGURATION & DATA --- */
const MEGA_STONE_EXCEPTIONS = {
    'Lucario': 'Lucarionite', 'Garchomp': 'Garchompite', 'Salamence': 'Salamencite',
    'Metagross': 'Metagrossite', 'Gyarados': 'Gyaradosite', 'Alakazam': 'Alakazite',
    'Kangaskhan': 'Kangaskhanite', 'Pinsir': 'Pinsirite', 'Aerodactyl': 'Aerodactylite',
    'Beedrill': 'Beedrillite', 'Pidgeot': 'Pidgeotite', 'Slowbro': 'Slowbronite',
    'Steelix': 'Steelixite', 'Sceptile': 'Sceptilite', 'Swampert': 'Swampertite',
    'Blaziken': 'Blazikenite', 'Gardevoir': 'Gardevoirite', 'Gallade': 'Galladite',
    'Altaria': 'Altarianite', 'Sharpedo': 'Sharpedonite', 'Camerupt': 'Cameruptite',
    'Lopunny': 'Lopunnite', 'Mawile': 'Mawilite', 'Medicham': 'Medichamite',
    'Manectric': 'Manectite', 'Banette': 'Banettite', 'Absol': 'Absolite',
    'Glalie': 'Glalitite', 'Houndoom': 'Houndoominite', 'Tyranitar': 'Tyranitarite',
    'Scizor': 'Scizorite', 'Heracross': 'Heracronite', 'Abomasnow': 'Abomasite',
    'Latias': 'Latiasite', 'Latios': 'Latiosite', 'Gengar': 'Gengarite',
    'Venusaur': 'Venusaurite', 'Charizard X': 'Charizardite X', 'Charizard Y': 'Charizardite Y',
    'Mewtwo X': 'Mewtwonite X', 'Mewtwo Y': 'Mewtwonite Y', 'Ampharos': 'Ampharosite', 
    'Aggron': 'Aggronite', 'Sableye': 'Sablenite'
};

const COMPETITIVE_SETS = {
    'Landorus-Therian': { item: 'Leftovers', nature: 'Impish', evs: '252 HP / 164 Def / 92 Spe', moves: ['Stealth Rock', 'Earthquake', 'U-turn', 'Toxic'] },
    'Ferrothorn': { item: 'Leftovers', nature: 'Careful', evs: '252 HP / 4 Def / 252 SpD', moves: ['Spikes', 'Knock Off', 'Leech Seed', 'Power Whip'] },
    'Toxapex': { item: 'Black Sludge', nature: 'Bold', evs: '252 HP / 252 Def / 4 SpD', moves: ['Scald', 'Recover', 'Haze', 'Toxic'] },
    'Dragapult': { item: 'Choice Specs', nature: 'Timid', evs: '252 SpA / 4 SpD / 252 Spe', moves: ['Draco Meteor', 'Shadow Ball', 'U-turn', 'Flamethrower'] },
    'Weavile': { item: 'Heavy-Duty Boots', nature: 'Jolly', evs: '252 Atk / 4 SpD / 252 Spe', moves: ['Swords Dance', 'Triple Axel', 'Knock Off', 'Ice Shard'] },
    'Heatran': { item: 'Leftovers', nature: 'Calm', evs: '252 HP / 4 SpA / 252 SpD', moves: ['Magma Storm', 'Earth Power', 'Taunt', 'Stealth Rock'] },
    'Zapdos': { item: 'Heavy-Duty Boots', nature: 'Timid', evs: '252 HP / 104 Def / 152 Spe', moves: ['Discharge', 'Hurricane', 'Roost', 'Defog'] },
    'Urshifu-Rapid-Strike': { item: 'Choice Band', nature: 'Jolly', evs: '252 Atk / 4 Def / 252 Spe', moves: ['Surging Strikes', 'Close Combat', 'Aqua Jet', 'U-turn'] },
    'Garchomp': { item: 'Rocky Helmet', nature: 'Jolly', evs: '252 HP / 4 Def / 252 Spe', moves: ['Stealth Rock', 'Earthquake', 'Dragon Tail', 'Fire Blast'] }, 
    'Volcarona': { item: 'Heavy-Duty Boots', nature: 'Timid', evs: '248 HP / 8 Def / 252 Spe', moves: ['Quiver Dance', 'Fiery Dance', 'Bug Buzz', 'Roost'] },
    'Corviknight': { item: 'Leftovers', nature: 'Impish', evs: '252 HP / 168 Def / 88 SpD', moves: ['Roost', 'Defog', 'Brave Bird', 'U-turn'] },
    'Kartana': { item: 'Choice Scarf', nature: 'Jolly', evs: '252 Atk / 4 SpD / 252 Spe', moves: ['Leaf Blade', 'Sacred Sword', 'Smart Strike', 'Knock Off'] },
    'Tapu Lele': { item: 'Choice Specs', nature: 'Timid', evs: '252 SpA / 4 SpD / 252 Spe', moves: ['Psychic', 'Moonblast', 'Focus Blast', 'Psyshock'] }
};

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
    window.playerColors.p1 = p1Color;
    document.documentElement.style.setProperty('--p1-color', p1Color);
    document.getElementById('disp-p1-name').innerText = p1Name;
    document.getElementById('disp-p1-name').style.color = p1Color;
    
    if(document.activeElement !== document.getElementById('st-p1-name')) 
        document.getElementById('st-p1-name').value = p1Name;
    document.getElementById('st-p1-color').value = p1Color;

    // 6. Player 2 Config
    const p2Name = c.p2Name || "BIU";
    const p2Color = c.p2Color || "#4488ff";
    window.playerColors.p2 = p2Color;
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

// --- NEW: TAB PRESENCE SYSTEM (Dynamic Color + Interactions) ---
let currentTabId = 'tab-play';

function initPresenceSystem() {
    // 2. Listen for OTHER players
    db.ref('presence').on('value', snap => {
        const p = snap.val() || {};
        const roles = ['p1', 'p2'];
        
        // A. Handle Tab Dots
        document.querySelectorAll('.tab-badges').forEach(el => el.innerHTML = '');

        roles.forEach(role => {
            if(role === window.myRole) return; // Don't show self
            
            const data = p[role];
            if(!data) return;

            // Show "Present in Tab" Dot with Color
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
            
            // B. Broadcast Interaction (Clicks/Hovers)
            if(data.interaction) {
                broadcastToIframes({
                    type: 'PEER_INTERACTION',
                    role: role,
                    color: window.playerColors[role] || '#fff',
                    id: data.interaction.id,
                    action: data.interaction.action,
                    timestamp: data.interaction.timestamp
                });
            }
        });
    });
}

function updatePresence() {
    if(window.myRole === 'spectator') return;
    let tabShort = currentTabId.replace('tab-', '');
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
    // Listen for Interaction Reports from inside iframes
    if (event.data && event.data.type === 'INTERACTION_REPORT') {
        if(window.myRole === 'spectator') return;
        db.ref('presence/' + window.myRole + '/interaction').set({
            id: event.data.id,
            action: event.data.action,
            timestamp: Date.now()
        });
    }
});

// --- UPDATED RETURN LOGIC: FORCE SAVE ENTIRE COLUMN ---
// This ensures that "What You See" (an empty slot) is "What Is Saved" to DB.
function handleReturnLogic() {
    if(window.returningId && window.returningElement) {
         // 1. Tell the generator this ID is free so it's no longer greyed out for anyone
         let frame = document.getElementById('frame-gen');
         if(frame && frame.contentWindow) frame.contentWindow.postMessage({ type: 'freePokemon', id: window.returningId }, '*');
         
         // 2. Clear the local UI
         window.returningElement.innerHTML = "";
         window.returningElement.classList.remove('filled');
         window.returningElement.draggable = false;
         
         var parentId = window.returningElement.parentElement.id;
         var side = parentId.split('-')[1]; 
         
         // 3. FORCE SAVE the entire column state. 
         // We do not rely on calculating indexes anymore. We just save the current empty state.
         saveColumnState(side);
         
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

// --- UPDATED CLEAR COLUMN (SYNCS ACROSS USERS) ---
window.clearCol = function(p) { 
    window.syncLock = true;
    var container = document.getElementById('slots-'+p);
    var kids = container.getElementsByClassName('slot');
    let frame = document.getElementById('frame-gen');
    
    // Free all pokemon in this column from the 'used' list in DB
    for(var i=0; i<kids.length; i++) {
       var txt = kids[i].querySelector('.slot-txt');
       if(txt && txt.dataset.id && frame && frame.contentWindow) {
           frame.contentWindow.postMessage({ type: 'freePokemon', id: txt.dataset.id }, '*');
       }
    }
    
    // Reset the slots in Firebase so User 2 sees them clear
    window.initSlots('slots-'+p); 
    db.ref('dashboard/slots' + (p==='alb'?'Alb':'Biu')).set(null);
    
    setTimeout(() => window.syncLock = false, 1000);
    if(window.isCollapsed) generateMiniIcons(p);
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
            // Using a more reliable proxy or direct link if possible
            const proxyUrl = "https://corsproxy.io/?";
            const calcUrl = "https://calc.pokemonshowdown.com/data/sets/gen9.js"; 
            const res = await fetch(proxyUrl + calcUrl);
            if(res.ok) {
                let text = await res.text();
                // Format is: var SETDEX_SV = { ... };
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
        let set = null;
        
        // --- MEGA DETECTION & NAME CLEANING ---
        let baseName = mon.name;
        let isMega = false;
        let megaStone = "";
        
        if(baseName.includes("Mega")) {
            isMega = true;
            let parts = baseName.split(" Mega");
            let cleanBase = parts[0].trim(); // e.g., "Lucario"
            let suffix = parts[1] ? parts[1].trim() : ""; // "X", "Y" or empty
            
            // Construct Lookup Name for dictionary
            let lookupName = cleanBase + (suffix ? " " + suffix : "");
            
            // 1. Check Exceptions Dictionary (e.g. Lucario -> Lucarionite)
            if(MEGA_STONE_EXCEPTIONS[lookupName]) {
                megaStone = MEGA_STONE_EXCEPTIONS[lookupName];
            } 
            // 2. Check Exceptions Dictionary using just base name (e.g. Lucario)
            else if(MEGA_STONE_EXCEPTIONS[cleanBase]) {
                megaStone = MEGA_STONE_EXCEPTIONS[cleanBase];
            }
            else {
                // 3. Default Rule: Name + "ite" (e.g. Pidgeot -> Pidgeotite)
                megaStone = cleanBase + "ite" + (suffix ? " " + suffix : "");
            }
            
            // Special Orbs logic
            if(cleanBase === "Kyogre" && suffix.includes("Primal")) megaStone = "Blue Orb";
            if(cleanBase === "Groudon" && suffix.includes("Primal")) megaStone = "Red Orb";
            if(cleanBase === "Rayquaza") megaStone = ""; 
            
            // Use base name for set lookup so we find the base pokemon's stats/moves
            baseName = cleanBase;
        }

        // --- STRATEGY 1: CHECK PREDEFINED SETS ---
        if (COMPETITIVE_SETS[baseName]) {
            set = COMPETITIVE_SETS[baseName];
        } 
        
        // --- STRATEGY 2: LOOKUP IN SMOGON DUMP ---
        else if (window.SETDEX_CACHE) {
            // Try exact match
            let setData = window.SETDEX_CACHE[baseName];
            
            // Try fuzzy match (ignore case/spaces)
            if (!setData) {
                let cleanId = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
                let foundKey = Object.keys(window.SETDEX_CACHE).find(k => 
                    k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanId
                );
                if(foundKey) setData = window.SETDEX_CACHE[foundKey];
            }

            if (setData) {
                // Get the first available set (usually the most common one)
                let firstSetName = Object.keys(setData)[0];
                set = setData[firstSetName];
            }
        }

        if (set) {
            // --- BUILD EXPORT FROM SMOGON/PRESET ---
            let item = isMega && megaStone ? megaStone : (set.item || 'Leftovers');
            
            exportText += `${baseName} @ ${item}\n`;
            if(set.ability) exportText += `Ability: ${set.ability}\n`;
            if(set.level && set.level != 100) exportText += `Level: ${set.level}\n`;
            if(set.teraType && !isMega) exportText += `Tera Type: ${set.teraType}\n`;
            
            if(set.evs) {
                if(typeof set.evs === 'string') {
                    exportText += `EVs: ${set.evs}\n`;
                } else {
                    let evList = [];
                    for (const [stat, val] of Object.entries(set.evs)) {
                        if(val > 0) evList.push(`${val} ${stat.replace('spa','SpA').replace('spd','SpD').replace('spe','Spe').replace('atk','Atk').replace('def','Def').replace('hp','HP')}`);
                    }
                    if(evList.length > 0) exportText += `EVs: ${evList.join(' / ')}\n`;
                }
            }

            if(set.nature) exportText += `${set.nature} Nature\n`;
            if(set.moves) set.moves.forEach(m => exportText += `- ${m}\n`);
            exportText += `\n`;

        } else {
            // --- STRATEGY 3: SMART FALLBACK (PokeAPI + Logic) ---
            try {
                let query = baseName.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
                let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
                if(!res.ok) throw new Error("Not found");
                let data = await res.json();
                
                // 1. Analyze Stats for Item/Nature Choice
                let stats = {};
                data.stats.forEach(s => stats[s.stat.name] = s.base_stat);
                
                // Identify highest stats
                let sortedStats = data.stats.sort((a,b) => b.base_stat - a.base_stat);
                let best1 = sortedStats[0].stat.name;
                
                let isFast = stats['speed'] >= 100;
                let isAttacker = stats['attack'] > stats['special-attack'];
                let isBulky = (stats['hp'] > 90 || stats['defense'] > 90 || stats['special-defense'] > 90) && stats['speed'] < 80;

                // 2. Smart Item Selection
                let smartItem = 'Leftovers'; // Default for balanced mons
                
                if (isMega && megaStone) {
                    smartItem = megaStone;
                } else {
                    if (isFast && (stats['attack'] > 100 || stats['special-attack'] > 100)) {
                        smartItem = 'Life Orb'; // Fast attackers get Life Orb
                        if (stats['speed'] > 120) smartItem = 'Choice Specs'; // Very fast special -> Specs? (Simplified)
                        if (isAttacker && stats['speed'] > 110) smartItem = 'Choice Band';
                    } else if (isBulky) {
                        smartItem = 'Leftovers';
                    } else if (stats['speed'] > 130) {
                        smartItem = 'Focus Sash'; // Frail speedsters
                    } else {
                        smartItem = 'Heavy-Duty Boots'; // Good generic pivot item
                    }
                }

                // 3. Nature Selection
                const natureMap = { 'attack':'Adamant', 'defense':'Impish', 'special-attack':'Modest', 'special-defense':'Calm', 'speed':'Jolly' };
                // If speed is good, boost it; otherwise boost main attack stat
                let natureStat = isFast ? 'speed' : (isAttacker ? 'attack' : 'special-attack');
                if (isBulky && !isAttacker) natureStat = 'special-defense'; // Bulky special defender
                if (isBulky && isAttacker) natureStat = 'attack'; // Bulky physical
                let nature = natureMap[natureStat] || 'Serious';

                // 4. Moves (Last 4 Level Up moves as heuristic)
                let levelMoves = data.moves.filter(m => m.version_group_details.some(d => d.move_learn_method.name === 'level-up'));
                let moves = levelMoves.slice(-4).map(m => m.move.name);
                moves = moves.map(m => m.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

                // 5. Build String
                exportText += `${baseName} @ ${smartItem}\n`;
                let abil = data.abilities[0].ability.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                exportText += `Ability: ${abil}\n`;
                exportText += `${nature} Nature\n`;
                
                // Simple 252/252 Spread based on best stats
                let evStat1 = isFast ? 'Spe' : 'HP';
                let evStat2 = isAttacker ? 'Atk' : 'SpA';
                if(isBulky) { evStat1 = 'HP'; evStat2 = (stats['defense'] > stats['special-defense']) ? 'Def' : 'SpD'; }
                
                exportText += `EVs: 252 ${evStat1} / 252 ${evStat2} / 4 SpD\n`;
                
                if(moves.length > 0) moves.forEach(m => exportText += `- ${m}\n`);
                else exportText += `- Tackle\n`;
                
                exportText += `\n`;

            } catch(e) {
                console.log("Export fallback failed for", baseName);
                exportText += `${baseName}\n\n`;
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
    if(!data) {
        // If data is null (cleared), wipe column
        data = [null,null,null,null,null,null];
    }
    
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
