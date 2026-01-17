/* main.js */
/* Entry point: Initializers and Global Event Listeners */

const mainDb = firebase.database(); // Local ref
window.lastTopVol = 100; // Track last volume for unmuting

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

    // NEW: Listen for Volume Updates FROM Music Tab
    if (event.data && event.data.type === 'UPDATE_TOP_VOL') {
        const slider = document.getElementById('top-vol-slider');
        if(slider) slider.value = event.data.value;
        
        // Update the icon/variable without sending the message back down (prevents loop)
        if(window.updateTopVolIcon) window.updateTopVolIcon(event.data.value);
        if(event.data.value > 0) window.lastTopVol = event.data.value;
    }

    // Interaction Reporting (Presence)
    if (event.data && event.data.type === 'INTERACTION_REPORT') {
        if(window.myRole === 'spectator') return;
        mainDb.ref('presence/' + window.myRole + '/interaction').set({
            id: event.data.id,
            action: event.data.action,
            timestamp: Date.now()
        });
    }
});

// --- 2. INITIALIZATION ON LOAD ---
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Dashboard Slots
    if(window.initSlots) {
        window.initSlots('slots-alb'); 
        window.initSlots('slots-biu'); 
    }
    
    // Initialize Systems
    if(window.initPresenceSystem) window.initPresenceSystem();
    
    // Initialize UI States
    if(window.toggleCollapse) window.toggleCollapse(); 
    if(window.toggleCenterCollapse) window.toggleCenterCollapse(); 
    
    // Load Library Data Once
    mainDb.ref('library').once('value').then(snap => {
        window.appData = snap.val() || {};
        // Pass data to iframes if they are already loaded
        ['frame-play', 'frame-gen'].forEach(id => {
            let el = document.getElementById(id);
            if(el && el.contentWindow) { try { el.contentWindow.appData = window.appData; } catch(e) {} }
        });
    });
});

// --- 3. VOLUME CONTROL FUNCTIONS (Parent -> Child) ---

// Called when dragging the Top Bar slider
window.sendVolume = function(val) {
    // 1. Find the music iframe
    const frame = document.getElementById('frame-music');
    
    // 2. Send the message "down" to the iframe
    if(frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'setVolume', value: val }, '*');
    }

    // 3. Update the speaker icon in the top bar
    if(window.updateTopVolIcon) {
        window.updateTopVolIcon(val);
    }
    
    if(val > 0) window.lastTopVol = val;
};

// Called when clicking the speaker icon
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

// Updates the icon visual only
window.updateTopVolIcon = function(val) {
    const icon = document.getElementById('top-vol-icon');
    if(!icon) return;
    
    if(val == 0) icon.innerText = "volume_off";
    else if(val < 50) icon.innerText = "volume_down";
    else icon.innerText = "volume_up";
};