/* poke-run.js - Local Version with Toggle Switch */

const POKE_ROSTER = [
    // Gen 1
    'pikachu', 'gengar', 'eevee', 'mew', 'dragonite', 'snorlax', 'charizard', 'blastoise', 'venusaur',
    'squirtle', 'bulbasaur', 'charmander', 'jigglypuff', 'psyduck', 'machamp', 'gyarados', 'lapras', 'ditto',
    // Gen 2
    'totodile', 'cyndaquil', 'chikorita', 'togepi', 'umbreon', 'espeon', 'tyranitar', 'lugia', 'ho-oh', 
    'scizor', 'heracross', 'wobbuffet', 'ampharos',
    // Gen 3
    'mudkip', 'torchic', 'treecko', 'gardevoir', 'metagross', 'salamence', 'rayquaza', 'kyogre', 'groudon', 
    'ludicolo', 'flygon', 'jirachi', 'deoxys',
    // Gen 4
    'lucario', 'garchomp', 'infernape', 'piplup', 'turtwig', 'darkrai', 'giratina', 'arceus', 'dialga', 'palkia',
    'luxray', 'rotom',
    // Gen 5
    'oshawott', 'snivy', 'tepig', 'zoroark', 'hydreigon', 'haxorus', 'chandelure', 'victini', 'volcarona'
];

const BASE_URL = "https://play.pokemonshowdown.com/sprites/gen5ani/";

// CONFIG
const MIN_WAIT = 10000;  // 10 seconds
const MAX_WAIT = 30000;  // 30 seconds

// STATE
let isMascotEnabled = localStorage.getItem('mascot_enabled') !== 'false'; // Default to true
let mascotTimer = null;

function initMascotSystem() {
    console.log("Mascot System: ONLINE");
    updateMascotUI(); // Set button colors correctly on load

    if (isMascotEnabled) {
        scheduleNextMascot();
    }
}

function scheduleNextMascot() {
    // If disabled, stop the loop immediately
    if (!isMascotEnabled) return;

    const delay = Math.random() * (MAX_WAIT - MIN_WAIT) + MIN_WAIT;
    
    mascotTimer = setTimeout(() => {
        if (!isMascotEnabled) return; // Double check
        spawnMascot();
        scheduleNextMascot();
    }, delay);
}

// --- GLOBAL TOGGLE FUNCTION (Called by Buttons) ---
window.setMascotState = function(enabled) {
    isMascotEnabled = enabled;
    localStorage.setItem('mascot_enabled', enabled); // Save to memory
    
    updateMascotUI(); // Update button colors

    if (enabled) {
        console.log("Mascots: RESUMED");
        // Clear old timer if any, then start fresh
        if (mascotTimer) clearTimeout(mascotTimer);
        spawnMascot(); // Spawn one immediately for feedback
        scheduleNextMascot();
    } else {
        console.log("Mascots: PAUSED");
        if (mascotTimer) clearTimeout(mascotTimer);
        
        // Optional: Instantly remove any Pokemon currently on screen
        document.querySelectorAll('.mascot').forEach(el => el.remove());
    }
}

// Helper to make buttons look active/inactive
function updateMascotUI() {
    const btnOn = document.getElementById('mascot-btn-on');
    const btnOff = document.getElementById('mascot-btn-off');
    
    // Only run if the settings modal exists in HTML
    if (btnOn && btnOff) {
        if (isMascotEnabled) {
            btnOn.classList.add('action');    // Green/Active style
            btnOff.classList.remove('action');
        } else {
            btnOn.classList.remove('action');
            btnOff.classList.add('action');   // Green/Active style
        }
    }
}

function spawnMascot() {
    const name = POKE_ROSTER[Math.floor(Math.random() * POKE_ROSTER.length)];
    const gifUrl = `${BASE_URL}${name}.gif`;

    // 1. Pick a Random Action Zone
    const actions = [
        'run-bottom', 'peek-bottom', 'peek-top-L', 'peek-top-R', 'peek-side-L', 'peek-side-R'
    ];
    const action = actions[Math.floor(Math.random() * actions.length)];

    // 2. Create the Image
    const img = document.createElement('img');
    img.src = gifUrl;
    img.className = `mascot ${action}`;
    
    // 3. Handle Logic
    if (action === 'run-bottom') {
        const direction = Math.random() > 0.5 ? 'left' : 'right';
        img.dataset.dir = direction;
        if (direction === 'left') img.style.transform = "scaleX(-1)";
    } 
    else if (action.includes('side')) {
        const randomTop = Math.floor(Math.random() * 60) + 20; 
        img.style.top = `${randomTop}%`;
    }

    // 4. Add to Stage
    document.body.appendChild(img);

    // 5. Cleanup
    setTimeout(() => {
        img.remove();
    }, 12000);
}

window.addEventListener('DOMContentLoaded', initMascotSystem);