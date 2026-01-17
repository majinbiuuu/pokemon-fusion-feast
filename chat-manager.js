/* chat-manager.js */
/* Handles Chat Logic, Firebase Sync, and Draggable Window */

window.isChatOpen = false;

document.addEventListener('DOMContentLoaded', () => {
    initChatSystem();
    initDraggableChat();
});

function initChatSystem() {
    const chatOutput = document.getElementById('chat-output');
    
    // Listen for new messages (Limit to last 50 to save data)
    if(window.db) {
        window.db.ref('chat').limitToLast(50).on('child_added', snap => {
            const msg = snap.val();
            if (!msg) return;
            renderMessage(msg);
        });
    }

    // Send Message on Enter
    const input = document.getElementById('chat-input');
    if(input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

window.toggleChat = function() {
    const win = document.getElementById('chat-window');
    window.isChatOpen = !window.isChatOpen;
    
    if (window.isChatOpen) {
        win.style.display = 'flex';
        // Reset position if it's off-screen or first open
        if(win.style.top === '' || win.style.left === '') {
            win.style.top = '100px';
            win.style.left = '100px';
        }
        setTimeout(() => {
            const out = document.getElementById('chat-output');
            if(out) out.scrollTop = out.scrollHeight;
        }, 100);
    } else {
        win.style.display = 'none';
    }
};

window.sendMessage = function() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    // Get current user config
    let name = "Guest";
    let color = "#fff";
    
    // Attempt to grab from inputs or defaults
    if(document.getElementById('st-p1-name') && window.myRole === 'p1') {
        name = document.getElementById('st-p1-name').value;
        color = document.getElementById('st-p1-color').value;
    } else if(document.getElementById('st-p2-name') && window.myRole === 'p2') {
        name = document.getElementById('st-p2-name').value;
        color = document.getElementById('st-p2-color').value;
    } else {
        // Fallback for spectators
        name = "Spectator"; 
        color = "#888";
    }

    const payload = {
        name: name,
        color: color,
        text: text,
        timestamp: Date.now()
    };

    if(window.db) window.db.ref('chat').push(payload);
    input.value = "";
};

function renderMessage(msg) {
    const out = document.getElementById('chat-output');
    if(!out) return;
    
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `
        <span class="chat-user" style="color:${msg.color}">${msg.name}:</span>
        <span class="chat-text">${msg.text}</span>
    `;
    
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
}

// --- DRAGGABLE & RESIZABLE LOGIC ---
function initDraggableChat() {
    const win = document.getElementById('chat-window');
    const header = document.getElementById('chat-header');
    
    if(!win || !header) return;

    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - win.offsetLeft;
        offsetY = e.clientY - win.offsetTop;
        win.classList.add('dragging');
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            win.style.left = (e.clientX - offsetX) + 'px';
            win.style.top = (e.clientY - offsetY) + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        win.classList.remove('dragging');
    });
}