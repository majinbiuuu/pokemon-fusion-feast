/* chat-manager.js */
/* Upgraded Chat Logic: bubbles, timestamps, cleanup, draggable window */

window.isChatOpen = false;
window.chatCleanupRan = false;

document.addEventListener('DOMContentLoaded', () => {
    initChatSystem();
    initDraggableChat();
});

function initChatSystem() {
    const chatOutput = document.getElementById('chat-output');
    const input = document.getElementById('chat-input');

    if (!chatOutput) return;

    renderEmptyState();

    if (window.db) {
        runChatCleanup();

        window.db.ref('chat').limitToLast(100).on('value', snap => {
            const data = snap.val() || {};
            renderAllMessages(data);
        });
    }

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

function renderEmptyState() {
    const out = document.getElementById('chat-output');
    if (!out) return;
    out.innerHTML = `<div class="chat-empty">No messages yet.</div>`;
}

function formatChatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[m];
    });
}

function getCurrentUserInfo() {
    let name = "Guest";
    let color = "#ffffff";

    if (document.getElementById('st-p1-name') && window.myRole === 'p1') {
        name = document.getElementById('st-p1-name').value || "Player 1";
        color = document.getElementById('st-p1-color').value || "#ff4444";
    } else if (document.getElementById('st-p2-name') && window.myRole === 'p2') {
        name = document.getElementById('st-p2-name').value || "Player 2";
        color = document.getElementById('st-p2-color').value || "#4488ff";
    } else {
        name = "Spectator";
        color = "#999999";
    }

    return { name, color };
}

function isOwnMessage(msg) {
    const me = getCurrentUserInfo();
    return msg && msg.name === me.name;
}

function renderAllMessages(data) {
    const out = document.getElementById('chat-output');
    if (!out) return;

    const entries = Object.values(data)
        .filter(msg => msg && msg.text)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    if (entries.length === 0) {
        renderEmptyState();
        return;
    }

    out.innerHTML = entries.map(msg => buildMessageHTML(msg)).join('');
    out.scrollTop = out.scrollHeight;
}

function buildMessageHTML(msg) {
    const own = isOwnMessage(msg);
    const rowClass = own ? 'self' : 'other';
    const safeName = escapeHtml(msg.name || 'Guest');
    const safeText = escapeHtml(msg.text || '');
    const timeText = formatChatTime(msg.timestamp);
    const nameColor = msg.color || '#fff';

    return `
        <div class="chat-row ${rowClass}">
            <div class="chat-meta">
                <span class="chat-name" style="color:${nameColor}">${safeName}</span>
                <span class="chat-time">${timeText}</span>
            </div>
            <div class="chat-bubble">${safeText}</div>
        </div>
    `;
}

window.toggleChat = function() {
    const win = document.getElementById('chat-window');
    if (!win) return;

    window.isChatOpen = !window.isChatOpen;

    if (window.isChatOpen) {
        win.style.display = 'flex';

        if (win.style.top === '' || win.style.left === '') {
            win.style.top = '90px';
            win.style.left = '90px';
        }

        setTimeout(() => {
            const out = document.getElementById('chat-output');
            if (out) out.scrollTop = out.scrollHeight;
        }, 50);
    } else {
        win.style.display = 'none';
    }
};

window.sendMessage = function() {
    const input = document.getElementById('chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const user = getCurrentUserInfo();

    const payload = {
        name: user.name,
        color: user.color,
        text: text,
        timestamp: Date.now()
    };

    if (window.db) {
        window.db.ref('chat').push(payload);
    }

    input.value = "";
};



/* --- 30 DAY CLEANUP --- */
function runChatCleanup() {
    if (window.chatCleanupRan) return;
    window.chatCleanupRan = true;

    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - THIRTY_DAYS;

    window.db.ref('chat').once('value').then(snap => {
        const data = snap.val() || {};
        const updates = {};

        Object.keys(data).forEach(key => {
            const msg = data[key];
            if (!msg || !msg.timestamp || msg.timestamp < cutoff) {
                updates[key] = null;
            }
        });

        if (Object.keys(updates).length > 0) {
            window.db.ref('chat').update(updates);
        }
    }).catch(err => {
        console.log('Chat cleanup error:', err);
    });
}

/* --- DRAGGABLE WINDOW --- */
function initDraggableChat() {
    const win = document.getElementById('chat-window');
    const header = document.getElementById('chat-header');

    if (!win || !header) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - win.offsetLeft;
        offsetY = e.clientY - win.offsetTop;
        win.classList.add('dragging');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        let nextLeft = e.clientX - offsetX;
        let nextTop = e.clientY - offsetY;

        const maxLeft = window.innerWidth - win.offsetWidth;
        const maxTop = window.innerHeight - win.offsetHeight;

        nextLeft = Math.max(0, Math.min(nextLeft, maxLeft));
        nextTop = Math.max(0, Math.min(nextTop, maxTop));

        win.style.left = nextLeft + 'px';
        win.style.top = nextTop + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        win.classList.remove('dragging');
    });
}