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
const db = firebase.database();

// Global Data Storage
window.appData = {};
window.scores = { alb: 0, biu: 0 };
window.syncLock = false;

// --- 2. THEME LOGIC (SYNCED & EXPANDED) ---

const themeColors = [
    '#00ff9d', '#ff0055', '#00aaff', '#ffaa00', 
    '#d400ff', '#ffee00', '#ff00ff', '#00ffff', 
    '#ff4400', '#88ff00', '#ffffff', '#6e00ff'
];

// Local state tracker to make button click instant
let currentThemeMode = 'static';

function applyThemeColor(color) {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--theme-green', color);
    window.currentAccent = color;

    ['play', 'gen', 'music', 'hist'].forEach(id => {
        const frame = document.getElementById('frame-' + id);
        if(frame && frame.contentWindow) {
            try {
                frame.contentWindow.document.documentElement.style.setProperty('--accent', color);
                frame.contentWindow.document.documentElement.style.setProperty('--theme-green', color);
            } catch(e) {}
            frame.contentWindow.postMessage({ type: 'THEME_UPDATE', color: color }, '*');
        }
    });
}

// ACTION: User Clicks Theme Button
window.changeTheme = function() {
    const newColor = themeColors[Math.floor(Math.random() * themeColors.length)];
    // Force static mode when picking a color
    db.ref('theme').set({
        color: newColor,
        mode: 'static'
    });
};

// ACTION: User Clicks Party Button (FIXED)
window.toggleParty = function() {
    // Use local state for immediate toggle decision
    const next = (currentThemeMode === 'party') ? 'static' : 'party';
    db.ref('theme/mode').set(next);
};

// LISTENER: React to Firebase Changes
let partyInterval = null;
let hue = 0;

db.ref('theme').on('value', snap => {
    const t = snap.val() || { color: '#00ff9d', mode: 'static' };
    
    // Update local state tracker
    currentThemeMode = t.mode;

    // Update Buttons Visual State
    const partyBtn = document.querySelector('.theme-party-btn');
    const colorBtn = document.querySelector('.theme-color-btn');

    if(t.mode === 'party') {
        if(partyBtn) partyBtn.classList.add('party-active-btn');
        if(colorBtn) colorBtn.style.opacity = '0.4'; // Dim static button
        
        if (!partyInterval) {
            partyInterval = setInterval(() => {
                hue = (hue + 2) % 360; 
                const hslColor = `hsl(${hue}, 100%, 60%)`;
                applyThemeColor(hslColor);
            }, 50); 
        }
    } else {
        if(partyBtn) partyBtn.classList.remove('party-active-btn');
        if(colorBtn) colorBtn.style.opacity = '1'; // Light up static button
        
        if (partyInterval) {
            clearInterval(partyInterval);
            partyInterval = null;
        }
        applyThemeColor(t.color);
    }
});

window.addEventListener('message', (e) => {
    if(e.data && e.data.type === 'REQUEST_THEME') {
        const c = window.currentAccent || '#00ff9d';
        if(e.source) e.source.postMessage({ type: 'THEME_UPDATE', color: c }, '*');
    }
});

// --- 3. MUSIC SYNC ---
db.ref('music/status').on('value', snap => {
  const m = snap.val() || {};
  const topTitle = document.getElementById('np-title-top');
  if(topTitle) topTitle.innerText = m.currentTitle || "System Ready";
  
  const topIcon = document.querySelector('#top-play-btn i');
  if(topIcon) topIcon.className = (m.state === 'PLAYING') ? 'fas fa-pause' : 'fas fa-play';
});

// --- 4. LIBRARY LOADER ---
db.ref('library').once('value').then(snap => {
  window.appData = snap.val() || {};
  ['play', 'gen'].forEach(id => {
      let f = document.getElementById('frame-'+id);
      if(f && f.contentWindow) {
          try { f.contentWindow.appData = window.appData; } catch(e) {}
      }
  });
});

// --- 5. POOL LOGIC ---
window.markPokemonUsed = function(id) {
  if(!id) return;
  db.ref('gen/used/' + id).set(true);
};

window.freePokemon = function(id) {
  if(!id) return;
  db.ref('gen/used/' + id).remove();
};
