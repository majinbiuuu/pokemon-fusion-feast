/* drag-drop-manager.js */
/* Handles the Dashboard UI, Drag & Drop Logic, and View States */

window.GEN_DRAG_PAYLOAD = null;
window.returningIndex = -1;
window.returningSide = null;
window.returningId = null;

// --- 1. INITIALIZATION & RENDERING ---
window.initSlots = function(id) { 
    var h = ''; 
    let side = id.includes('alb') ? 'alb' : 'biu';
    for(var i=0; i<6; i++) h += `<div class="slot" data-idx="${i}" data-side="${side}" ondragover="allowDrop(event)" ondragleave="leaveDrop(event)" ondrop="drop(event)"></div>`; 
    document.getElementById(id).innerHTML = h; 
};

window.renderColumn = function(side, data) {
    if(!data) data = [null,null,null,null,null,null]; 
    
    var container = document.getElementById('slots-'+side);
    if(!container) return; // Safety check
    
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
    if(window.isCollapsed) generateMiniIcons(side);
};

// --- 2. DRAG & DROP LOGIC ---
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
        
        if(window.isCollapsed) generateMiniIcons(side);
    } 
};

function slotDragStart(e, id, idx) {
    e.dataTransfer.setData("text/return", id);
    e.dataTransfer.effectAllowed = "move";
    
    let el = e.target;
    if (!el.classList.contains('slot')) {
        el = el.closest('.slot');
    }
    
    window.returningId = id; 
    window.returningIndex = idx;
    window.returningElement = el;
    
    if(el && el.dataset.side) {
        window.returningSide = el.dataset.side;
    } else {
        let p = el.parentElement;
        if(p.id.includes('alb')) window.returningSide = 'alb';
        else window.returningSide = 'biu';
    }
}

// --- 3. RETURN TO GENERATOR LOGIC ---
window.allowReturnDrop = function(ev) { if(window.returningId) ev.preventDefault(); };
window.returnDrop = function(ev) { ev.preventDefault(); handleReturnLogic(); };

window.handleReturnLogic = function() {
    if(window.returningId && window.returningSide && window.returningIndex > -1) {
         let frame = document.getElementById('frame-gen');
         if(frame && frame.contentWindow) frame.contentWindow.postMessage({ type: 'freePokemon', id: window.returningId }, '*');
         
         // Direct Database Update (Surgical Removal)
         let dbKey = (window.returningSide === 'alb') ? 'slotsAlb' : 'slotsBiu';
         
         // Using the global firebase db instance
         firebase.database().ref('dashboard/' + dbKey + '/' + window.returningIndex).set(null);
         
         window.returningId = null; 
         window.returningIndex = -1;
         window.returningSide = null;
    }
};

// --- 4. STATE MANAGEMENT ---
window.saveColumnState = function(side) {
    var slots = [];
    var container = document.getElementById('slots-'+side);
    var kids = container.getElementsByClassName('slot');
    for(var i=0; i<kids.length; i++) {
        var img = kids[i].querySelector('img');
        var txt = kids[i].querySelector('.slot-txt');
        if(img && txt) slots.push({ img: img.src, name: txt.innerText, id: txt.dataset.id });
        else slots.push(null);
    }
    firebase.database().ref('dashboard/slots' + (side==='alb'?'Alb':'Biu')).set(slots);
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
    
    let emptySlots = [null,null,null,null,null,null];
    firebase.database().ref('dashboard/slots' + (p==='alb'?'Alb':'Biu')).set(emptySlots);
    
    setTimeout(() => window.syncLock = false, 1000);
    if(window.isCollapsed) generateMiniIcons(p);
};

// --- 5. VIEW & COLLAPSE LOGIC ---
window.isCollapsed = false;
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

window.generateMiniIcons = function(side) {
    const miniRow = document.getElementById('mini-' + side);
    const slots = document.getElementById('slots-' + side).getElementsByClassName('slot');
    let html = '';
    for(let i=0; i < slots.length; i++) {
        const img = slots[i].querySelector('img');
        if (img) html += `<div class="mini-slot"><img src="${img.src}"></div>`;
        else html += `<div class="mini-slot empty"></div>`;
    }
    miniRow.innerHTML = html;
};

window.centerCollapsed = false;
window.toggleCenterCollapse = function() {
    window.centerCollapsed = !window.centerCollapsed;
    const colC = document.querySelector('.col-c');
    const icon = document.getElementById('c-collapse-icon');
    if(window.centerCollapsed) { colC.classList.add('minimized'); if(icon) icon.className = "fas fa-expand-alt"; }
    else { colC.classList.remove('minimized'); if(icon) icon.className = "fas fa-compress-alt"; }
};

window.switchTab = function(viewId, btn) { 
    if (document.querySelector('.tab.active').dataset.id === 'tab-' + viewId && !window.centerCollapsed) { window.toggleCenterCollapse(); return; }
    if (window.centerCollapsed) { window.toggleCenterCollapse(); }
    
    // UI Update
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active')); 
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active')); 
    document.getElementById('view-'+viewId).classList.add('active'); 
    btn.classList.add('active'); 
    
    // Sync Presence
    if(window.updatePresence) window.updatePresence();
};