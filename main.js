/* main.js */
/* Entry point: Initializers, Global Event Listeners, and Auto-Labeling */

const mainDb = firebase.database(); // Local ref
window.lastTopVol = 100; // Track last volume for unmuting

/* --- 0. FORCE INJECT STYLES (Fixed Glow to Match Global Theme) --- */
const nameOverlayStyle = document.createElement('style');
nameOverlayStyle.innerHTML = `
    .slot { position: relative !important; }
    .slot-overlay-name {
        position: absolute; 
        bottom: 6px; 
        left: 0; 
        width: 100%;
        text-align: center; 
        font-size: 0.8rem; 
        font-weight: 600;
        text-transform: uppercase; 
        color: #fff; 
        pointer-events: none; 
        z-index: 10;
        white-space: nowrap; 
        overflow: hidden; 
        text-overflow: ellipsis;
        padding: 0 4px;
        font-family: 'Segoe UI', sans-serif;
        
        /* STRONG NEON GLOW USING GLOBAL THEME COLOR */
        text-shadow: 
            0 0 3px var(--theme-green, #00ff9d), 
            0 0 5px var(--theme-green, #00ff9d),
            0 0 10px var(--theme-green, #00ff9d),
            -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    }
`;
document.head.appendChild(nameOverlayStyle);


/* --- 1. UNIVERSAL SMOGON DATA LOADER (All Gens) --- */
window.smogonData = {};
const GENS_TO_LOAD = ['gen9', 'gen8', 'gen7']; 

Promise.all(
    GENS_TO_LOAD.map(gen => 
        fetch(`https://pkmn.github.io/smogon/data/sets/${gen}.json`)
        .then(res => res.json())
        .then(data => ({ gen, data }))
    )
).then(results => {
    results.forEach(({ gen, data }) => {
        for (const [pokemon, formats] of Object.entries(data)) {
            if (!window.smogonData[pokemon]) {
                window.smogonData[pokemon] = formats;
            } else {
                window.smogonData[pokemon] = { ...formats, ...window.smogonData[pokemon] };
            }
        }
    });
    console.log("Universal Smogon Sets Loaded!");
}).catch(err => console.error("Failed to load Smogon sets", err));


// --- 2. GLOBAL MESSAGE LISTENER (Cross-Iframe Comms) ---
window.addEventListener('message', (event) => {
    // Theme Request
    if(event.data && event.data.type === 'REQUEST_THEME') {
        const c = window.currentAccent || '#00ff9d';
        if(event.source) event.source.postMessage({ type: 'THEME_UPDATE', color: c }, '*');
    }

    // Winner celebration from Play iframe
    if (event.data && event.data.type === 'WINNER_CELEBRATION') {
        window.runWinnerCelebration(event.data.winner, event.data.color);
    }
    
    // Clear Columns
    if (event.data && event.data.type === 'requestClearCols') {
        window.clearCol('alb'); 
        window.clearCol('biu');
    }
    
    // Generator Drop Return Logic
    if (event.data && event.data.type === 'GENERATOR_DROP') {
        window.handleReturnLogic();
    }

    // Volume Sync
        if (event.data && event.data.type === 'UPDATE_TOP_VOL') {
        const numeric = Math.max(0, Math.min(100, parseInt(event.data.value, 10) || 0));
        const slider = document.getElementById('top-vol-slider');
        if (slider) slider.value = numeric;
        localStorage.setItem('music_vol', String(numeric));
        if (window.updateTopVolIcon) window.updateTopVolIcon(numeric);
        if (numeric > 0) window.lastTopVol = numeric;
    }

    // TRACK SYNC
    if (event.data && event.data.type === 'TRACK_UPDATE') {
        const titleEl = document.getElementById('np-title-top');
        const imgEl = document.getElementById('np-img-top');
        if(titleEl) titleEl.innerText = event.data.title || "System Ready";
        if(imgEl && event.data.img) imgEl.src = event.data.img;
    }

    // PLAY STATE SYNC
    if (event.data && event.data.type === 'PLAYER_STATE') {
        const btn = document.getElementById('top-play-btn');
        if(btn) {
            btn.innerHTML = (event.data.state === 'playing') 
                ? '<span class="material-icons">pause</span>' 
                : '<span class="material-icons">play_arrow</span>';
        }
    }

    // Auto-Population
    if (event.data && event.data.type === 'POPULATE_SLOTS') {
        if(window.populateColumnSlots) {
            window.populateColumnSlots(event.data.targetCol, event.data.pokemonList);
        }
    }

    // Interaction Reporting
    if (event.data && event.data.type === 'INTERACTION_REPORT') {
        if(window.myRole === 'spectator') return;
        mainDb.ref('presence/' + window.myRole + '/interaction').set({
            id: event.data.id,
            action: event.data.action,
            timestamp: Date.now()
        });
    }
});
window.runWinnerCelebration = function(winnerName, color) {
    const winnerColor = color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ff9d';

    document.body.style.setProperty('--winner-dance-color', winnerColor);

    let banner = document.getElementById('winner-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'winner-banner';
        banner.className = 'winner-banner';
        document.body.appendChild(banner);
    }

    banner.style.setProperty('--winner-dance-color', winnerColor);
    banner.innerText = `Winner: ${winnerName}`;

    document.body.classList.remove('winner-celebrating');
    void document.body.offsetWidth;
    document.body.classList.add('winner-celebrating');

    banner.style.display = 'block';

    clearTimeout(window._winnerBannerTimer);
    clearTimeout(window._winnerDanceTimer);

    window._winnerBannerTimer = setTimeout(() => {
        banner.style.display = 'none';
    }, 2600);

    window._winnerDanceTimer = setTimeout(() => {
        document.body.classList.remove('winner-celebrating');
    }, 4800);
};

// --- 3. INITIALIZATION ON LOAD ---
document.addEventListener('DOMContentLoaded', function() {
    if(window.initSlots) {
        window.initSlots('slots-alb'); 
        window.initSlots('slots-biu'); 
    }
    if(window.initPresenceSystem) window.initPresenceSystem();
    if(window.toggleCollapse) window.toggleCollapse(); 
    if(window.toggleCenterCollapse) window.toggleCenterCollapse(); 
    
    mainDb.ref('library').on('value', snap => {
        window.appData = snap.val() || {};
        ['frame-play', 'frame-gen', 'frame-battle'].forEach(id => {
            let el = document.getElementById(id);
            if(el && el.contentWindow) { try { el.contentWindow.appData = window.appData; } catch(e) {} }
        });
    });

    // --- AUTO-LABELER (Updated Cleaner) ---
    const observeColumn = (colId) => {
        const container = document.getElementById(colId);
        if (!container) return;

        // Run once on load for existing items
        container.querySelectorAll('.slot.filled img').forEach(img => addLabelToSlot(img.parentElement, img));

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'IMG') {
                        addLabelToSlot(node.parentElement, node);
                    }
                    if (node.nodeType === 1 && (node.classList.contains('filled') || node.querySelector('img'))) {
                        const img = node.tagName === 'IMG' ? node : node.querySelector('img');
                        if (img) addLabelToSlot(img.parentElement, img);
                    }
                });
            });
        });

        observer.observe(container, { childList: true, subtree: true });
    };

    const addLabelToSlot = (slot, img) => {
        if (!slot || !img) return;
        if (slot.querySelector('.slot-overlay-name')) return;

        let rawName = img.dataset.name || img.alt;
        if (!rawName) {
            const srcParts = img.src.split('/');
            const file = srcParts[srcParts.length - 1];
            // REMOVE .gif, .png, .jpg, .webp
            rawName = file.replace(/\.(gif|png|jpg|jpeg|webp)$/i, '').replace(/-/g, ' ');
        }
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'slot-overlay-name';
        nameDiv.innerText = rawName;
        
        slot.style.position = 'relative'; 
        slot.appendChild(nameDiv);
    };

     const savedVol = Math.max(0, Math.min(100, parseInt(localStorage.getItem('music_vol') || '100', 10) || 100));
    const topSlider = document.getElementById('top-vol-slider');

    if (topSlider) {
        topSlider.value = savedVol;
        window.lastTopVol = savedVol > 0 ? savedVol : 100;
        if (window.updateTopVolIcon) window.updateTopVolIcon(savedVol);
    }

    const musicFrame = document.getElementById('frame-music');
    if (musicFrame) {
        musicFrame.addEventListener('load', () => {
            window.sendVolume(savedVol);
        }, { once: true });
    }

    observeColumn('slots-alb');
    observeColumn('slots-biu');
});

// --- 4. MEDIA CONTROLS ---
window.mediaAction = function(action) {
    const frame = document.getElementById('frame-music');
    if(frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'mediaControl', action: action }, '*');
    }
};

window.sendVolume = function(val) {
    const numeric = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    localStorage.setItem('music_vol', String(numeric));

    const frame = document.getElementById('frame-music');
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'setVolume', value: numeric }, '*');
    }

    if (window.updateTopVolIcon) window.updateTopVolIcon(numeric);
    if (numeric > 0) window.lastTopVol = numeric;
};

window.toggleTopMute = function() {
    const slider = document.getElementById('top-vol-slider');
    let current = slider.value;
    if (current > 0) {
        window.lastTopVol = current;
        slider.value = 0;
        window.sendVolume(0);
    } else {
        let restore = window.lastTopVol || 100;
        slider.value = restore;
        window.sendVolume(restore);
    }
};

window.updateTopVolIcon = function(val) {
    const icon = document.getElementById('top-vol-icon');
    if(!icon) return;
    if(val == 0) icon.innerText = "volume_off";
    else if(val < 50) icon.innerText = "volume_down";
    else icon.innerText = "volume_up";
};

// --- 5. SLOT POPULATION & EXPORT ---
window.populateColumnSlots = async function(colSuffix, pokemonList) {
    const colId = 'slots-' + colSuffix;
    const container = document.getElementById(colId);
    if (!container) return;

    const emptySlots = Array.from(container.querySelectorAll('.slot:not(.filled)'));
    if (emptySlots.length < pokemonList.length) {
        alert(`Not enough slots in ${colSuffix.toUpperCase()}! Need ${pokemonList.length}.`);
        return;
    }

    for (let i = 0; i < pokemonList.length; i++) {
        const slot = emptySlots[i];
        const rawName = pokemonList[i];
        
        slot.innerText = "..."; 
        
        try {
            const cleanName = rawName.toLowerCase().replace(/[ .]/g, '-').replace(/'/g, '');
            const imgUrl = `https://img.pokemondb.net/sprites/home/normal/${cleanName}.png`;
            
            const img = document.createElement('img');
            img.src = imgUrl;
            img.classList.add('slot-img');
            img.alt = rawName; 
            img.dataset.name = rawName; 
            
            let buildData = null;
            if (window.smogonData && window.smogonData[rawName]) {
                const availableFormats = window.smogonData[rawName];
                const formatKeys = Object.keys(availableFormats);
                if (formatKeys.length > 0) {
                    let bestFormat = formatKeys.find(k => k.toLowerCase().includes('natdex')) 
                                  || formatKeys.find(k => k.toLowerCase().includes('ou'))
                                  || formatKeys[0];
                    buildData = availableFormats[bestFormat]; 
                    const setNames = Object.keys(buildData);
                    if (setNames.length > 0) {
                        const setName = setNames[0]; 
                        buildData = buildData[setName];
                        buildData.format = bestFormat;
                        buildData.setName = setName;
                    }
                }
            }

            if (buildData) {
                img.dataset.hasBuild = "true";
                img.dataset.moves = JSON.stringify(buildData.moves || []);
                img.dataset.item = buildData.item || "";
                img.dataset.ability = buildData.ability || "";
                img.dataset.nature = buildData.nature || "";
                img.dataset.evs = JSON.stringify(buildData.evs || {});
                img.title = `Set: ${buildData.setName} (${buildData.format})`;
            } else {
                img.dataset.hasBuild = "false";
                img.title = "No competitive data found";
            }

            slot.innerHTML = '';
            slot.appendChild(img);
            
            // Manual label addition (Observer will catch it anyway, but this is faster)
            const nameDiv = document.createElement('div');
            nameDiv.className = 'slot-overlay-name';
            nameDiv.innerText = rawName;
            slot.appendChild(nameDiv);

            slot.classList.add('filled');
        } catch (error) {
            console.error(error);
            slot.innerText = "Err";
        }
    }
};

window.exportTeamToClipboard = function(colSuffix) {
    const colId = 'slots-' + colSuffix;
    const container = document.getElementById(colId);
    if (!container) return;

    let exportText = "";
    const filledSlots = container.querySelectorAll('.slot.filled img');
    filledSlots.forEach(img => {
        const name = img.dataset.name || img.alt || "Pokemon";
        if (img.dataset.hasBuild === "true") {
            const item = img.dataset.item ? ` @ ${img.dataset.item}` : "";
            const ability = img.dataset.ability ? `Ability: ${img.dataset.ability}` : "";
            const nature = img.dataset.nature ? `${img.dataset.nature} Nature` : "";
            const moves = JSON.parse(img.dataset.moves || "[]");
            const evsObj = JSON.parse(img.dataset.evs || "{}");
            
            let evsLine = "";
            let evParts = [];
            for (const [stat, val] of Object.entries(evsObj)) {
                evParts.push(`${val} ${stat}`);
            }
            if (evParts.length > 0) evsLine = `EVs: ${evParts.join(' / ')}`;

            exportText += `${name}${item}\n`;
            if(ability) exportText += `${ability}\n`;
            if(evsLine) exportText += `${evsLine}\n`;
            if(nature) exportText += `${nature}\n`;
            moves.forEach(move => exportText += `- ${move}\n`);
        } else {
            exportText += `${name} (No Set Found)\n`;
        }
        exportText += "\n";
    });

    navigator.clipboard.writeText(exportText).then(() => {
        alert(`Team for ${colSuffix.toUpperCase()} copied to clipboard!`);
    });
};

window.sideColumnsPopout = null;

window.openSideColumnsPopout = function() {
    const width = 760;
    const height = 920;

    const left = Math.max(40, window.screenX + Math.round((window.outerWidth - width) / 2));
    const top = Math.max(40, window.screenY + 40);

    const features = [
        `width=${width}`,
        `height=${height}`,
        `left=${left}`,
        `top=${top}`,
        'resizable=yes',
        'scrollbars=no'
    ].join(',');

    if (window.sideColumnsPopout && !window.sideColumnsPopout.closed) {
        window.sideColumnsPopout.focus();
        return;
    }

    const pop = window.open('columns-popout.html', 'sideColumnsPopout', features);

    if (!pop) {
        window.open('columns-popout.html', '_blank');
        return;
    }

    window.sideColumnsPopout = pop;
    pop.focus();
};