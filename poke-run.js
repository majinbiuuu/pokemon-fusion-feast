/* poke-run.js - Physics V2 (Fixed Button & Tank Release) */

(function() { 

    // ==========================================
    // 1. FIREBASE SETUP
    // ==========================================
    const pokeRunConfig = {
        apiKey: "AIzaSyDz82Dp56EISYqk3hza3upJ2pAjsStgMKo",
        authDomain: "pokemon-masters-d153a.firebaseapp.com",
        databaseURL: "https://pokemon-masters-d153a-default-rtdb.firebaseio.com",
        projectId: "pokemon-masters-d153a",
        storageBucket: "pokemon-masters-d153a.firebasestorage.app",
        messagingSenderId: "67655442054",
        appId: "1:67655442054:web:705baa26ffda58b5d3fb07",
        measurementId: "G-LGW9RJZDP3"
    };

    if (!firebase.apps.length) firebase.initializeApp(pokeRunConfig);
    const pokeRunDb = firebase.database();

    // ==========================================
    // 2. CONFIG & STATE
    // ==========================================
    const POKE_ROSTER = [
        'pikachu', 'gengar', 'eevee', 'mew', 'dragonite', 'snorlax', 'charizard', 'blastoise', 'venusaur',
        'squirtle', 'bulbasaur', 'charmander', 'jigglypuff', 'psyduck', 'machamp', 'gyarados', 'lapras', 'ditto',
        'totodile', 'cyndaquil', 'chikorita', 'togepi', 'umbreon', 'espeon', 'tyranitar', 'lugia', 'ho-oh', 
        'scizor', 'heracross', 'wobbuffet', 'ampharos',
        'mudkip', 'torchic', 'treecko', 'gardevoir', 'metagross', 'salamence', 'rayquaza', 'kyogre', 'groudon', 
        'ludicolo', 'flygon', 'jirachi', 'deoxys',
        'lucario', 'garchomp', 'infernape', 'piplup', 'turtwig', 'darkrai', 'giratina', 'arceus', 'dialga', 'palkia',
        'luxray', 'rotom',
        'oshawott', 'snivy', 'tepig', 'zoroark', 'hydreigon', 'haxorus', 'chandelure', 'victini', 'volcarona'
    ];
    
    const BASE_URL = "https://play.pokemonshowdown.com/sprites/gen5ani/";
    const MIN_WAIT = 5000;
    const MAX_WAIT = 20000;

    let isMascotEnabled = localStorage.getItem('mascot_enabled') !== 'false';
    let spawnTimeout = null;
    let localCount = 0;

    const PHYSICS = {
        gravity: 0.8,      
        power: 0.5,       
        maxPull: 75,       
    };

    // ==========================================
    // 3. UI INJECTION (CSS & HTML)
    // ==========================================
    function injectResources() {
        // A. Inject CSS
        if (!document.getElementById('poke-run-styles')) {
            const css = `
                body { user-select: none; -webkit-user-select: none; }
                .mascot { position: fixed; pointer-events: auto; z-index: 2000; image-rendering: pixelated; }
                
                /* Animations */
                .run-bottom { bottom: -20px; width: 96px; animation: runAcross 12s linear forwards; }
                .run-bottom[data-dir="left"] { animation: runAcrossLeft 12s linear forwards; }
                @keyframes runAcross { from { left: -150px; } to { left: 110vw; } }
                @keyframes runAcrossLeft { from { right: -150px; } to { right: 110vw; } }
                .peek-bottom { bottom: -120px; left: 50%; transform: translateX(-50%); width: 120px; animation: peekUp 6s ease-in-out forwards; }
                @keyframes peekUp { 0% { bottom: -120px; } 20% { bottom: 0; } 80% { bottom: 0; } 100% { bottom: -120px; } }
                .peek-side-L { left: -120px; width: 100px; animation: peekRight 5s ease-in-out forwards; }
                .peek-side-R { right: -120px; width: 100px; transform: scaleX(-1); animation: peekLeft 5s ease-in-out forwards; }
                @keyframes peekRight { 0% { left: -120px; } 20% { left: 0; } 80% { left: 0; } 100% { left: -120px; } }
                @keyframes peekLeft { 0% { right: -120px; } 20% { right: 0; } 80% { right: 0; } 100% { right: -120px; } }

                /* Game UI */
                #minigame-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2100; }

                /* Tank UI */
                .glass-tank {
                    position: absolute; bottom: 20px; right: 20px;
                    width: 300px; height: 200px;
                    background: rgba(0, 0, 0, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px; backdrop-filter: blur(5px);
                    overflow: hidden; 
                    pointer-events: auto !important; /* Force clicks to work */
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    transition: opacity 0.5s;
                }
                .tank-header {
                    position: absolute; top: 0; left: 0; right: 0; height: 32px;
                    background: rgba(255,255,255,0.1);
                    display: flex; justify-content: flex-end; align-items: center;
                    padding: 0 10px; gap: 10px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    pointer-events: auto !important; /* Force clicks to work */
                }
                .tank-count {
                    font-family: 'Segoe UI', sans-serif; font-size: 0.9rem; font-weight: 800; color: #44ff44;
                    margin-right: auto; padding-left: 5px;
                }
                .release-btn {
                    background: #d32f2f; color: #fff; border: 1px solid #ff5555; 
                    padding: 4px 12px; border-radius: 4px; font-weight: 800; font-size: 0.75rem;
                    cursor: pointer; text-transform: uppercase; 
                    pointer-events: auto !important; /* Force clicks to work */
                    transition: all 0.2s ease;
                    z-index: 2200; /* Ensure it sits on top */
                }
                .release-btn:hover { 
                    background: #ff0000; 
                    transform: scale(1.1); 
                    box-shadow: 0 0 8px #ff0000;
                }
                .tank-pet {
                    position: absolute; width: 40px; height: 40px; object-fit: contain;
                    transition: top 3s linear, left 3s linear;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                }

                /* Slingshot & Ball */
                #sling-anchor {
                    position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
                    width: 140px; height: 140px;
                    border: 2px dashed rgba(255,255,255,0.15); border-radius: 50%; pointer-events: none;
                }
                #throw-ball {
                    position: absolute; width: 60px; height: 60px;
                    background-image: url('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png');
                    background-size: contain; background-repeat: no-repeat;
                    cursor: grab; pointer-events: auto; z-index: 2200; transition: transform 0.1s; 
                }
                #throw-ball:active { cursor: grabbing; }
                .traj-dot {
                    position: absolute; width: 8px; height: 8px; background: #fff; border-radius: 50%;
                    pointer-events: none; z-index: 2150; opacity: 0.6; box-shadow: 0 0 4px #fff;
                }
                .flying-ball {
                    position: absolute; width: 40px; height: 40px;
                    background-image: url('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png');
                    background-size: contain; background-repeat: no-repeat; pointer-events: none; z-index: 2200;
                }
            `;
            const style = document.createElement('style');
            style.id = 'poke-run-styles';
            style.innerHTML = css;
            document.head.appendChild(style);
        }

        // B. Inject HTML (With ID for button)
        if (!document.getElementById('minigame-layer')) {
            const container = document.createElement('div');
            container.id = 'minigame-layer';
            container.style.display = 'none'; 
            container.innerHTML = `
                <div id="poke-tank" class="glass-tank">
                    <div class="tank-header">
                        <span id="catch-counter" class="tank-count">0</span>
                        <button id="btn-release-tank" class="release-btn">Release</button>
                    </div>
                    <div id="tank-inner" style="position:relative; width:100%; height:100%;"></div>
                </div>
                <div id="sling-anchor"></div>
                <div id="throw-ball"></div>
                <div id="trajectory-line"></div>
                <div id="projectile-container"></div>
            `;
            document.body.appendChild(container);
        }
    }

    // ==========================================
    // 4. GLOBAL EXPORTS
    // ==========================================
    
    // Toggle On/Off
    window.setMascotState = function(enabled) {
        isMascotEnabled = enabled;
        localStorage.setItem('mascot_enabled', enabled);
        
        const layer = document.getElementById('minigame-layer');
        if(layer) layer.style.display = enabled ? 'block' : 'none';

        if (enabled) {
            attemptSpawnLoop();
            initSlingshotInput();
        } else {
            if (spawnTimeout) clearTimeout(spawnTimeout);
            document.querySelectorAll('.mascot').forEach(el => el.remove());
        }
    };

    // ==========================================
    // 5. INITIALIZATION & LISTENERS
    // ==========================================
    function initSync() {
        console.log("PokeRun: Physics V2 Active");
        injectResources();
        resetBallPosition();
        window.setMascotState(isMascotEnabled);

        // --- ATTACH BUTTON LISTENER SAFELY ---
        // We do this here to ensure the element exists
        const relBtn = document.getElementById('btn-release-tank');
        if (relBtn) {
            relBtn.addEventListener('click', () => {
                console.log("RELEASE CLICKED");
                // 1. Clear Database
                pokeRunDb.ref('pokeRun/tank').remove();
                
                // 2. Clear UI Immediately
                const tank = document.getElementById('tank-inner');
                if(tank) tank.innerHTML = '';
                const cnt = document.getElementById('catch-counter');
                if(cnt) cnt.innerText = 0;
                localCount = 0;
            });
        }

        // A. Spawn Listener
        pokeRunDb.ref('pokeRun/current').on('value', (snap) => {
            const data = snap.val();
            const existing = document.querySelector('.mascot');
            if (!data) { if (existing) existing.remove(); return; }
            if (!existing || existing.dataset.timestamp != data.timestamp) {
                if(existing) existing.remove();
                renderMascotVisuals(data);
            }
        });

        // B. Tank Listener
        pokeRunDb.ref('pokeRun/tank').on('value', (snap) => {
            const tank = document.getElementById('tank-inner');
            if(tank) tank.innerHTML = '';
            
            const val = snap.val();
            if(val) {
                const pets = Object.values(val);
                localCount = pets.length;
                pets.forEach(pet => addPetToTank(pet));
            } else {
                localCount = 0;
            }
            
            const cnt = document.getElementById('catch-counter');
            if(cnt) cnt.innerText = localCount;
        });

        // C. Throw Listener
        pokeRunDb.ref('pokeRun/throws').on('child_added', (snap) => {
            const d = snap.val();
            if(Date.now() - d.timestamp < 2000) {
                simulateThrow(d.vx, d.vy, d.startX, d.startY);
            }
        });

        attemptSpawnLoop(); 
    }

    // ==========================================
    // 6. GAME LOGIC HANDLERS
    // ==========================================

    function attemptSpawnLoop() {
        if (!isMascotEnabled) { spawnTimeout = setTimeout(attemptSpawnLoop, 5000); return; }
        const delay = Math.random() * (MAX_WAIT - MIN_WAIT) + MIN_WAIT;
        
        spawnTimeout = setTimeout(() => {
            if (!isMascotEnabled) { attemptSpawnLoop(); return; }

            pokeRunDb.ref('pokeRun/current').once('value', snap => {
                if (!snap.exists()) {
                    const name = POKE_ROSTER[Math.floor(Math.random() * POKE_ROSTER.length)];
                    const actions = ['run-bottom', 'peek-bottom', 'peek-side-L', 'peek-side-R'];
                    const action = actions[Math.floor(Math.random() * actions.length)];
                    const dir = Math.random() > 0.5 ? 'left' : 'right';
                    const randTop = Math.floor(Math.random() * 60) + 20;

                    pokeRunDb.ref('pokeRun/current').set({
                        name: name, action: action, direction: dir, randTop: randTop, timestamp: Date.now()
                    });

                    setTimeout(() => {
                        pokeRunDb.ref('pokeRun/current').once('value', s => {
                            if (s.exists() && s.val().timestamp < Date.now() - 11000) {
                                pokeRunDb.ref('pokeRun/current').remove();
                            }
                        });
                    }, 12000);
                }
            });
            attemptSpawnLoop();
        }, delay);
    }

    function renderMascotVisuals(data) {
        const gifUrl = `${BASE_URL}${data.name}.gif`;
        const img = document.createElement('img');
        img.src = gifUrl;
        img.className = `mascot ${data.action}`;
        img.classList.add('running-poke');
        img.dataset.timestamp = data.timestamp;
        
        if (data.action === 'run-bottom') {
            img.dataset.dir = data.direction;
            if (data.direction === 'left') img.style.transform = "scaleX(-1)";
        } else if (data.action.includes('side')) {
            img.style.top = `${data.randTop}%`;
        }
        document.body.appendChild(img);
    }

    function addPetToTank(petData) {
        const tank = document.getElementById('tank-inner');
        if(!tank) return;
        const pet = document.createElement('img');
        pet.src = petData.url;
        pet.className = 'tank-pet';
        tank.appendChild(pet);
        pet.style.left = Math.random() * 80 + '%';
        pet.style.top = Math.random() * 70 + '%';
        petWander(pet);
    }

    function petWander(pet) {
        if(!pet.parentElement) return;
        const destX = Math.random() * 80; 
        const destY = Math.random() * 70;
        const curX = parseFloat(pet.style.left);
        if(destX < curX) pet.style.transform = "scaleX(-1)";
        else pet.style.transform = "scaleX(1)";
        pet.style.left = destX + '%';
        pet.style.top = destY + '%';
        setTimeout(() => petWander(pet), Math.random() * 3000 + 2000);
    }

    // ==========================================
    // 7. INPUT & PHYSICS
    // ==========================================
    function resetBallPosition() {
        const ball = document.getElementById('throw-ball');
        if(ball) {
            const anchorBottom = 80;
            const anchorHeight = 140;
            const centerYFromBottom = anchorBottom + (anchorHeight / 2);
            ball.style.left = '50%';
            ball.style.top = (window.innerHeight - centerYFromBottom) + 'px'; 
            ball.style.transform = 'translate(-50%, -50%)';
        }
    }

    function initSlingshotInput() {
        const ball = document.getElementById('throw-ball');
        if(!ball) return;

        let isDragging = false;
        const anchorX = window.innerWidth / 2;
        const anchorY = window.innerHeight - (80 + 70); 

        ball.addEventListener('mousedown', (e) => {
            isDragging = true;
            ball.style.transition = 'none'; 
            e.preventDefault(); 
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            let dx = e.clientX - anchorX;
            let dy = e.clientY - anchorY;
            
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > PHYSICS.maxPull) {
                const ratio = PHYSICS.maxPull / dist;
                dx *= ratio;
                dy *= ratio;
            }

            ball.style.left = (anchorX + dx) + 'px';
            ball.style.top = (anchorY + dy) + 'px';

            const vx = -dx * PHYSICS.power;
            const vy = -dy * PHYSICS.power;
            drawTrajectory(anchorX, anchorY, vx, vy);
        });

        window.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const tLine = document.getElementById('trajectory-line');
            if(tLine) tLine.innerHTML = '';

            const rect = ball.getBoundingClientRect();
            const currentX = rect.left + rect.width/2;
            const currentY = rect.top + rect.height/2;

            let dx = currentX - anchorX;
            let dy = currentY - anchorY;

            const vx = -dx * PHYSICS.power;
            const vy = -dy * PHYSICS.power;

            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                resetBallPosition();
                ball.style.transition = 'transform 0.2s ease-out';
                const throwData = { vx: vx, vy: vy, startX: anchorX, startY: anchorY, timestamp: Date.now() };
                pokeRunDb.ref('pokeRun/throws').push(throwData);
            } else {
                resetBallPosition();
                ball.style.transition = 'top 0.3s ease-out, left 0.3s ease-out';
            }
        });
    }

    function drawTrajectory(startX, startY, vx, vy) {
        const container = document.getElementById('trajectory-line');
        if(!container) return;
        container.innerHTML = ''; 

        let simX = startX;
        let simY = startY;
        let simVx = vx;
        let simVy = vy;

        const speed = Math.sqrt(vx*vx + vy*vy);
        let color = '#44ff44'; 
        if(speed > 25) color = '#ffff00'; 
        if(speed > 35) color = '#ff4444'; 

        for (let i = 0; i < 20; i++) {
            simVy += PHYSICS.gravity;
            simX += simVx;
            simY += simVy;

            const dot = document.createElement('div');
            dot.className = 'traj-dot';
            dot.style.left = simX + 'px';
            dot.style.top = simY + 'px';
            dot.style.backgroundColor = color;
            dot.style.opacity = 1 - (i / 25); 
            dot.style.width = (8 - i * 0.2) + 'px';
            dot.style.height = (8 - i * 0.2) + 'px';

            container.appendChild(dot);
            if (simY > window.innerHeight) break;
        }
    }

    function simulateThrow(vx, vy, startX, startY) {
        const ball = document.createElement('div');
        ball.className = 'flying-ball';
        ball.style.left = startX + 'px';
        ball.style.top = startY + 'px';
        document.getElementById('projectile-container').appendChild(ball);

        let posX = startX;
        let posY = startY;
        let velX = vx;
        let velY = vy;

        function frame() {
            if (!ball.parentElement) return;

            velY += PHYSICS.gravity;
            posX += velX;
            posY += velY;

            ball.style.left = posX + 'px';
            ball.style.top = posY + 'px';

            const rot = Math.atan2(velY, velX) * (180/Math.PI);
            ball.style.transform = `rotate(${rot}deg)`;

            const ballRect = ball.getBoundingClientRect();
            checkCollision(ball, ballRect);

            if (posY > window.innerHeight + 50 || posX < -50 || posX > window.innerWidth + 50) {
                ball.remove();
            } else {
                requestAnimationFrame(frame);
            }
        }
        requestAnimationFrame(frame);
    }

    function checkCollision(ball, ballRect) {
        const targets = document.querySelectorAll('.running-poke'); 
        targets.forEach(poke => {
            const pRect = poke.getBoundingClientRect();
            if (ballRect.left < pRect.right && ballRect.right > pRect.left &&
                ballRect.top < pRect.bottom && ballRect.bottom > pRect.top) {
                
                ball.remove();
                pokeRunDb.ref('pokeRun/current').remove().then(() => {
                    pokeRunDb.ref('pokeRun/tank').push({ url: poke.src, caughtAt: Date.now() });
                }).catch(() => {});
            }
        });
    }

    window.addEventListener('DOMContentLoaded', initSync);

})();