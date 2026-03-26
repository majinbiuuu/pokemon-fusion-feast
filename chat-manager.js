/* chat-manager.js */
/* Compact chat: room tabs + message-only zoom + draggable window */

const CHAT_ROOMS = {
    general: { path: 'chat' },
    improvements: { path: 'chatRooms/improvements' },
    other: { path: 'chatRooms/other' }
};

window.isChatOpen = false;
window.chatCleanupRan = false;
window.chatRoomRef = null;
window.currentChatRoom = CHAT_ROOMS[localStorage.getItem('chatRoom')] ? localStorage.getItem('chatRoom') : 'general';

let savedFont = parseInt(localStorage.getItem('chatMessageFontPx') || '15', 10);
window.chatMessageFontPx = Number.isNaN(savedFont) ? 15 : savedFont;

document.addEventListener('DOMContentLoaded', () => {
    initChatSystem();
    initDraggableChat();
    applyChatMessageFont(window.chatMessageFontPx);
    syncChatTabs();
});

function initChatSystem() {
    const chatOutput = document.getElementById('chat-output');
    const input = document.getElementById('chat-input');

    if (!chatOutput) return;

    renderEmptyState();

    if (window.db) {
        runChatCleanup();
        subscribeToChatRoom(window.currentChatRoom);
    }

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

function getChatPath(room) {
    return (CHAT_ROOMS[room] || CHAT_ROOMS.general).path;
}

function getChatRoomLabel(room) {
    const safeRoom = CHAT_ROOMS[room] ? room : 'general';
    return safeRoom.charAt(0).toUpperCase() + safeRoom.slice(1);
}

window.switchChatRoom = function(room) {
    subscribeToChatRoom(room);
};

function subscribeToChatRoom(room) {
    const safeRoom = CHAT_ROOMS[room] ? room : 'general';
    window.currentChatRoom = safeRoom;
    localStorage.setItem('chatRoom', safeRoom);

    if (window.chatRoomRef) {
        window.chatRoomRef.off();
        window.chatRoomRef = null;
    }

    syncChatTabs();

    if (!window.db) return;

    window.chatRoomRef = window.db.ref(getChatPath(safeRoom));
    window.chatRoomRef.limitToLast(100).on('value', snap => {
        const data = snap.val() || {};
        renderAllMessages(data);
    });
}

function syncChatTabs() {
    document.querySelectorAll('.chat-room-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.room === window.currentChatRoom);
    });
}

function applyChatMessageFont(px) {
    const win = document.getElementById('chat-window');
    const clamped = Math.max(12, Math.min(22, px));

    window.chatMessageFontPx = clamped;
    localStorage.setItem('chatMessageFontPx', String(clamped));

    if (win) {
        win.style.setProperty('--chat-message-size', `${clamped}px`);
    }
}

window.zoomChatFont = function(step) {
    const delta = step > 0 ? 1 : -1;
    applyChatMessageFont(window.chatMessageFontPx + delta);
};

function renderEmptyState() {
    const out = document.getElementById('chat-output');
    if (!out) return;
    out.innerHTML = `<div class="chat-empty">No messages in ${getChatRoomLabel(window.currentChatRoom)} yet.</div>`;
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

        syncChatTabs();

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
        text,
        timestamp: Date.now()
    };

    if (window.db) {
        window.db.ref(getChatPath(window.currentChatRoom)).push(payload);
    }

    input.value = "";
};

/* --- 30 DAY CLEANUP --- */
function runChatCleanup() {
    if (window.chatCleanupRan || !window.db) return;
    window.chatCleanupRan = true;

    ['chat', 'chatRooms/improvements', 'chatRooms/other'].forEach(cleanupChatPath);
}

function cleanupChatPath(path) {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - THIRTY_DAYS;

    window.db.ref(path).once('value').then(snap => {
        const data = snap.val() || {};
        const updates = {};

        Object.keys(data).forEach(key => {
            const msg = data[key];
            if (!msg || !msg.timestamp || msg.timestamp < cutoff) {
                updates[key] = null;
            }
        });

        if (Object.keys(updates).length > 0) {
            window.db.ref(path).update(updates);
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
        if (e.target.closest('.chat-room-tab, .chat-header-actions, .chat-close')) {
            return;
        }

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