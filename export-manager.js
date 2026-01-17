/* export-manager.js */
/* Handles fetching data and generating the Showdown export text */

window.exportTeam = async function(side) {
    var btn = document.getElementById('export-' + side);
    var originalIcon = '<i class="fas fa-file-export"></i> Export Team';
    btn.innerHTML = '<i class="fas fa-spinner"></i> Exporting...';
    
    var container = document.getElementById('slots-' + side);
    var kids = container.getElementsByClassName('slot');
    var exportText = "";
    var monsToFetch = [];
    
    // 1. Collect Pokemon from slots
    for(var i=0; i<kids.length; i++) {
        var txt = kids[i].querySelector('.slot-txt');
        if(txt && txt.dataset.id) {
            monsToFetch.push({ name: txt.innerText.trim(), id: txt.dataset.id });
        }
    }
    
    if(monsToFetch.length === 0) { 
        alert("Column is empty!"); 
        btn.innerHTML = originalIcon; 
        return; 
    }

    // 2. Load Setdex if not cached
    if (!window.SETDEX_CACHE) {
        try {
            const proxyUrl = "https://corsproxy.io/?";
            const calcUrl = "https://calc.pokemonshowdown.com/data/sets/gen9.js"; 
            const res = await fetch(proxyUrl + calcUrl);
            if(res.ok) {
                let text = await res.text();
                let start = text.indexOf('{');
                let end = text.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    window.SETDEX_CACHE = JSON.parse(text.substring(start, end + 1));
                }
            }
        } catch(e) { console.warn("Setdex fetch failed", e); }
    }

    // 3. Generate Set Data
    for (let mon of monsToFetch) {
        let set = null;
        let baseName = mon.name;
        let isMega = false;
        let megaStone = "";
        
        // Handle Mega Logic
        if(baseName.includes("Mega")) {
            isMega = true;
            let parts = baseName.split(" Mega");
            let cleanBase = parts[0].trim();
            let suffix = parts[1] ? parts[1].trim() : "";
            let lookupName = cleanBase + (suffix ? " " + suffix : "");
            
            if(window.MEGA_STONE_EXCEPTIONS[lookupName]) megaStone = window.MEGA_STONE_EXCEPTIONS[lookupName];
            else if(window.MEGA_STONE_EXCEPTIONS[cleanBase]) megaStone = window.MEGA_STONE_EXCEPTIONS[cleanBase];
            else megaStone = cleanBase + "ite" + (suffix ? " " + suffix : "");
            
            if(cleanBase === "Kyogre" && suffix.includes("Primal")) megaStone = "Blue Orb";
            if(cleanBase === "Groudon" && suffix.includes("Primal")) megaStone = "Red Orb";
            if(cleanBase === "Rayquaza") megaStone = ""; 
            baseName = cleanBase;
        }

        // Try to find a set in local constants or external cache
        if (window.COMPETITIVE_SETS[baseName]) {
            set = window.COMPETITIVE_SETS[baseName];
        } else if (window.SETDEX_CACHE) {
            let setData = window.SETDEX_CACHE[baseName];
            if (!setData) {
                let cleanId = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
                let foundKey = Object.keys(window.SETDEX_CACHE).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanId);
                if(foundKey) setData = window.SETDEX_CACHE[foundKey];
            }
            if (setData) {
                let firstSetName = Object.keys(setData)[0];
                set = setData[firstSetName];
            }
        }

        // Build String
        if (set) {
            let item = isMega && megaStone ? megaStone : (set.item || 'Leftovers');
            exportText += `${baseName} @ ${item}\n`;
            if(set.ability) exportText += `Ability: ${set.ability}\n`;
            if(set.level && set.level != 100) exportText += `Level: ${set.level}\n`;
            if(set.teraType && !isMega) exportText += `Tera Type: ${set.teraType}\n`;
            if(set.evs) {
                if(typeof set.evs === 'string') exportText += `EVs: ${set.evs}\n`;
                else {
                    let evList = [];
                    for (const [stat, val] of Object.entries(set.evs)) {
                        if(val > 0) evList.push(`${val} ${stat.replace('spa','SpA').replace('spd','SpD').replace('spe','Spe').replace('atk','Atk').replace('def','Def').replace('hp','HP')}`);
                    }
                    if(evList.length > 0) exportText += `EVs: ${evList.join(' / ')}\n`;
                }
            }
            if(set.nature) exportText += `${set.nature} Nature\n`;
            if(set.moves) set.moves.forEach(m => exportText += `- ${m}\n`);
            exportText += `\n`;
        } else {
            // FALLBACK API FETCH
            try {
                let query = baseName.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
                let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
                if(!res.ok) throw new Error("Not found");
                let data = await res.json();
                let stats = {};
                data.stats.forEach(s => stats[s.stat.name] = s.base_stat);
                let isFast = stats['speed'] >= 100;
                let isAttacker = stats['attack'] > stats['special-attack'];
                let isBulky = (stats['hp'] > 90 || stats['defense'] > 90 || stats['special-defense'] > 90) && stats['speed'] < 80;
                let smartItem = 'Leftovers';
                if (isMega && megaStone) smartItem = megaStone;
                else {
                    if (isFast && (stats['attack'] > 100 || stats['special-attack'] > 100)) smartItem = 'Life Orb';
                    else if (isBulky) smartItem = 'Leftovers';
                    else if (stats['speed'] > 130) smartItem = 'Focus Sash';
                    else smartItem = 'Heavy-Duty Boots';
                }
                const natureMap = { 'attack':'Adamant', 'defense':'Impish', 'special-attack':'Modest', 'special-defense':'Calm', 'speed':'Jolly' };
                let natureStat = isFast ? 'speed' : (isAttacker ? 'attack' : 'special-attack');
                if (isBulky && !isAttacker) natureStat = 'special-defense'; 
                if (isBulky && isAttacker) natureStat = 'attack'; 
                let nature = natureMap[natureStat] || 'Serious';
                let levelMoves = data.moves.filter(m => m.version_group_details.some(d => d.move_learn_method.name === 'level-up'));
                let moves = levelMoves.slice(-4).map(m => m.move.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

                exportText += `${baseName} @ ${smartItem}\n`;
                let abil = data.abilities[0].ability.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                exportText += `Ability: ${abil}\n`;
                exportText += `${nature} Nature\n`;
                let evStat1 = isFast ? 'Spe' : 'HP';
                let evStat2 = isAttacker ? 'Atk' : 'SpA';
                if(isBulky) { evStat1 = 'HP'; evStat2 = (stats['defense'] > stats['special-defense']) ? 'Def' : 'SpD'; }
                exportText += `EVs: 252 ${evStat1} / 252 ${evStat2} / 4 SpD\n`;
                if(moves.length > 0) moves.forEach(m => exportText += `- ${m}\n`);
                else exportText += `- Tackle\n`;
                exportText += `\n`;
            } catch(e) { console.log("Export fallback failed", baseName); exportText += `${baseName}\n\n`; }
        }
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(exportText).then(function() {
        btn.innerHTML = '<i class="fas fa-check" style="color:#0f0"></i> Copied!';
        setTimeout(() => { btn.innerHTML = originalIcon; }, 2000);
    });
};