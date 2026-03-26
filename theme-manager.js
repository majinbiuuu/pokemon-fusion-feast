/* theme-manager.js */
/* Handles Themes, Party Mode, Settings Modal, Backgrounds, and Music Sync */

// USE GLOBAL DB (Defined in sync-manager.js)

// --- 1. THEME LOGIC ---
const themeColors = [
    '#00ff9d', '#ff0055', '#00aaff', '#ffaa00', 
    '#d400ff', '#ffee00', '#ff00ff', '#00ffff', 
    '#ff4400', '#88ff00', '#ffffff', '#6e00ff'
];

let currentThemeMode = 'static';
let partyInterval = null;
let hue = 0;

function applyThemeColor(color) {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--theme-green', color);
    window.currentAccent = color; 

    ['frame-play', 'frame-gen', 'frame-music', 'frame-hist', 'frame-lib', 'frame-battle'].forEach(id => {
        const frame = document.getElementById(id);
        if(frame && frame.contentWindow) {
            try {
                frame.contentWindow.document.documentElement.style.setProperty('--accent', color);
                frame.contentWindow.document.documentElement.style.setProperty('--theme-green', color);
            } catch(e) {}
            frame.contentWindow.postMessage({ type: 'THEME_UPDATE', color: color }, '*');
        }
    });
}

window.changeTheme = function() {
    const newColor = themeColors[Math.floor(Math.random() * themeColors.length)];
    window.db.ref('theme').set({ color: newColor, mode: 'static' });
};

window.toggleParty = function() {
    const next = (currentThemeMode === 'party') ? 'static' : 'party';
    window.db.ref('theme/mode').set(next);
};

window.db.ref('theme').on('value', snap => {
    const t = snap.val() || { color: '#00ff9d', mode: 'static' };
    currentThemeMode = t.mode;

    const partyBtn = document.querySelector('.theme-party-btn');
    const colorBtn = document.querySelector('.theme-color-btn');

    if(t.mode === 'party') {
        if(partyBtn) partyBtn.classList.add('party-active-btn');
        if(colorBtn) colorBtn.style.opacity = '0.4'; 
        
        if (!partyInterval) {
            partyInterval = setInterval(() => {
                hue = (hue + 2) % 360; 
                const hslColor = `hsl(${hue}, 100%, 60%)`;
                applyThemeColor(hslColor);
            }, 50); 
        }
    } else {
        if(partyBtn) partyBtn.classList.remove('party-active-btn');
        if(colorBtn) colorBtn.style.opacity = '1'; 
        
        if (partyInterval) {
            clearInterval(partyInterval);
            partyInterval = null;
        }
        applyThemeColor(t.color);
    }
});

// --- 2. SETTINGS & WALLPAPER LOGIC ---

window.switchSettingsTab = function(tabName) {
  // panels
  const panels = {
    theme: document.getElementById('st-panel-theme'),
    players: document.getElementById('st-panel-players'),
    mascots: document.getElementById('st-panel-mascots')
  };

  Object.values(panels).forEach(p => { if(p) p.classList.remove('active'); });
  if (panels[tabName]) panels[tabName].classList.add('active');

  // tabs
  document.querySelectorAll('.st-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
};

window.toggleSettings = function() {
    let el = document.getElementById('settings-modal');
    el.style.display = (el.style.display === 'flex') ? 'none' : 'flex';
    if(el.style.display === 'flex' && window.updateIdentityUI) window.updateIdentityUI();
    window.switchSettingsTab('theme');
    
};

window.toggleFullScreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((e) => { console.log(e.message); });
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
};

window.dragOverHandler = function(ev) { ev.preventDefault(); document.getElementById('drop-zone').classList.add('drag-over'); };
window.dragLeaveHandler = function(ev) { document.getElementById('drop-zone').classList.remove('drag-over'); };
window.dropHandler = function(ev) {
    ev.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-over');
    if(ev.dataTransfer.files && ev.dataTransfer.files.length > 0) {
        const file = ev.dataTransfer.files[0];
        if(file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) { window.saveConfig('bgUrl', e.target.result); };
            reader.readAsDataURL(file);
        }
    }
};

window.addCurrentToSaved = function() {
    let current = document.getElementById('st-bg-url').value;
    if(!current) return;
    window.db.ref('config/savedWallpapers').once('value', snap => {
        let list = snap.val() || [];
        if(!list.includes(current)) {
            list.push(current);
            window.db.ref('config/savedWallpapers').set(list);
        }
    });
};

window.removeWallpaper = function(idx) {
    window.db.ref('config/savedWallpapers').once('value', snap => {
        let list = snap.val() || [];
        list.splice(idx, 1);
        window.db.ref('config/savedWallpapers').set(list);
    });
};

window.renderSavedWallpapers = function(list) {
    const container = document.getElementById('saved-bg-list');
    if(!container) return;
    container.innerHTML = '';
    list.forEach((url, idx) => {
        let d = document.createElement('div');
        d.className = 'saved-thumb';
        d.style.backgroundImage = `url('${url}')`;
        d.onclick = () => window.saveConfig('bgUrl', url);
        d.innerHTML = `<div class="del-thumb" onclick="event.stopPropagation(); removeWallpaper(${idx})">&times;</div>`;
        container.appendChild(d);
    });
};

window.db.ref('config').on('value', snap => {
    const c = snap.val() || {};
    if(c.bgUrl) {
        document.body.style.backgroundImage = `url('${c.bgUrl}')`;
        if(document.getElementById('st-bg-url')) document.getElementById('st-bg-url').value = c.bgUrl;
    } else {
        document.body.style.backgroundImage = 'none';
        if(document.getElementById('st-bg-url')) document.getElementById('st-bg-url').value = '';
    }
    if(c.bgColor) {
        document.body.style.backgroundColor = c.bgColor;
        if(document.getElementById('st-bg-color')) document.getElementById('st-bg-color').value = c.bgColor;
    }
    if(c.savedWallpapers) window.renderSavedWallpapers(c.savedWallpapers);
});


// --- 3. MUSIC SYNC LOGIC ---
// Intentionally removed.
// Top-bar / music-frame sync now lives in main.js + music.html
// so there is only one source of truth.