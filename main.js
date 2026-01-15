/* main.js */
/* Entry point: Initializers and Global Event Listeners */

// USE GLOBAL DB (Defined in sync-manager.js)

// --- 1. GLOBAL MESSAGE LISTENER (Cross-Iframe Comms) ---
window.addEventListener('message', (event) => {
    // Theme Request from iframes
    if(event.data && event.data.type === 'REQUEST_THEME') {
        const c = window.currentAccent || '#00ff9d';
        if(event.source) event.source.postMessage({ type: 'THEME_UPDATE', color: c }, '*');
    }
    
    // Clear Columns Request
    if (event.data && event.data.type === 'requestClearCols') {
        window.clearCol('alb'); 
        window.clearCol('biu');
    }
    
    // Generator Drop Return Logic
    if (event.data && event.data.type === 'GENERATOR_DROP') {
        window.handleReturnLogic();
    }
    
    // Interaction Reporting (Presence)
    if (event.data && event.data.type === 'INTERACTION_REPORT') {
        if(window.myRole === 'spectator') return;
        window.db.ref('presence/' + window.myRole + '/interaction').set({
            id: event.data.id,
            action: event.data.action,
            timestamp: Date.now()
        });
    }
});

// --- 2. INITIALIZATION ON LOAD ---
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Dashboard Slots
    window.initSlots('slots-alb'); 
    window.initSlots('slots-biu'); 
    
    // Initialize Systems
    if(window.initPresenceSystem) window.initPresenceSystem();
    
    // Initialize UI States
    window.toggleCollapse(); 
    window.toggleCenterCollapse(); 
    
    // Load Library Data Once
    window.db.ref('library').once('value').then(snap => {
        window.appData = snap.val() || {};
        ['frame-play', 'frame-gen'].forEach(id => {
            let el = document.getElementById(id);
            if(el && el.contentWindow) { try { el.contentWindow.appData = window.appData; } catch(e) {} }
        });
    });
});
