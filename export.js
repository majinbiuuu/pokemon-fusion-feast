/* --- EXPORT LOGIC & DATA --- */

window.SETDEX_CACHE = null;

const MEGA_STONE_EXCEPTIONS = {
    'Lucario': 'Lucarionite', 'Garchomp': 'Garchompite', 'Salamence': 'Salamencite',
    'Metagross': 'Metagrossite', 'Gyarados': 'Gyaradosite', 'Alakazam': 'Alakazite',
    'Kangaskhan': 'Kangaskhanite', 'Pinsir': 'Pinsirite', 'Aerodactyl': 'Aerodactylite',
    'Beedrill': 'Beedrillite', 'Pidgeot': 'Pidgeotite', 'Slowbro': 'Slowbronite',
    'Steelix': 'Steelixite', 'Sceptile': 'Sceptilite', 'Swampert': 'Swampertite',
    'Blaziken': 'Blazikenite', 'Gardevoir': 'Gardevoirite', 'Gallade': 'Galladite',
    'Altaria': 'Altarianite', 'Sharpedo': 'Sharpedonite', 'Camerupt': 'Cameruptite',
    'Lopunny': 'Lopunnite', 'Mawile': 'Mawilite', 'Medicham': 'Medichamite',
    'Manectric': 'Manectite', 'Banette': 'Banettite', 'Absol': 'Absolite',
    'Glalie': 'Glalitite', 'Houndoom': 'Houndoominite', 'Tyranitar': 'Tyranitarite',
    'Scizor': 'Scizorite', 'Heracross': 'Heracronite', 'Abomasnow': 'Abomasite',
    'Latias': 'Latiasite', 'Latios': 'Latiosite', 'Gengar': 'Gengarite',
    'Venusaur': 'Venusaurite', 'Charizard X': 'Charizardite X', 'Charizard Y': 'Charizardite Y',
    'Mewtwo X': 'Mewtwonite X', 'Mewtwo Y': 'Mewtwonite Y', 'Ampharos': 'Ampharosite', 
    'Aggron': 'Aggronite', 'Sableye': 'Sablenite'
};

const COMPETITIVE_SETS = {
    'Landorus-Therian': { item: 'Leftovers', nature: 'Impish', evs: '252 HP / 164 Def / 92 Spe', moves: ['Stealth Rock', 'Earthquake', 'U-turn', 'Toxic'] },
    'Ferrothorn': { item: 'Leftovers', nature: 'Careful', evs: '252 HP / 4 Def / 252 SpD', moves: ['Spikes', 'Knock Off', 'Leech Seed', 'Power Whip'] },
    'Toxapex': { item: 'Black Sludge', nature: 'Bold', evs: '252 HP / 252 Def / 4 SpD', moves: ['Scald', 'Recover', 'Haze', 'Toxic'] },
    'Dragapult': { item: 'Choice Specs', nature: 'Timid', evs: '252 SpA / 4 SpD / 252 Spe', moves: ['Draco Meteor', 'Shadow Ball', 'U-turn', 'Flamethrower'] },
    'Weavile': { item: 'Heavy-Duty Boots', nature: 'Jolly', evs: '252 Atk / 4 SpD / 252 Spe', moves: ['Swords Dance', 'Triple Axel', 'Knock Off', 'Ice Shard'] },
    'Heatran': { item: 'Leftovers', nature: 'Calm', evs: '252 HP / 4 SpA / 252 SpD', moves: ['Magma Storm', 'Earth Power', 'Taunt', 'Stealth Rock'] },
    'Zapdos': { item: 'Heavy-Duty Boots', nature: 'Timid', evs: '252 HP / 104 Def / 152 Spe', moves: ['Discharge', 'Hurricane', 'Roost', 'Defog'] },
    'Urshifu-Rapid-Strike': { item: 'Choice Band', nature: 'Jolly', evs: '252 Atk / 4 Def / 252 Spe', moves: ['Surging Strikes', 'Close Combat', 'Aqua Jet', 'U-turn'] },
    'Garchomp': { item: 'Rocky Helmet', nature: 'Jolly', evs: '252 HP / 4 Def / 252 Spe', moves: ['Stealth Rock', 'Earthquake', 'Dragon Tail', 'Fire Blast'] }, 
    'Volcarona': { item: 'Heavy-Duty Boots', nature: 'Timid', evs: '248 HP / 8 Def / 252 Spe', moves: ['Quiver Dance', 'Fiery Dance', 'Bug Buzz', 'Roost'] },
    'Corviknight': { item: 'Leftovers', nature: 'Impish', evs: '252 HP / 168 Def / 88 SpD', moves: ['Roost', 'Defog', 'Brave Bird', 'U-turn'] },
    'Kartana': { item: 'Choice Scarf', nature: 'Jolly', evs: '252 Atk / 4 SpD / 252 Spe', moves: ['Leaf Blade', 'Sacred Sword', 'Smart Strike', 'Knock Off'] },
    'Tapu Lele': { item: 'Choice Specs', nature: 'Timid', evs: '252 SpA / 4 SpD / 252 Spe', moves: ['Psychic', 'Moonblast', 'Focus Blast', 'Psyshock'] }
};

window.exportTeam = async function(side) {
    var btn = document.getElementById('export-' + side);
    var originalIcon = '<i class="fas fa-file-export"></i> Export Team';
    
    // VISUAL LOADING
    btn.innerHTML = '<i class="fas fa-spinner"></i> Exporting...';
    
    var container = document.getElementById('slots-' + side);
    var kids = container.getElementsByClassName('slot');
    var exportText = "";
    var monsToFetch = [];
    
    for(var i=0; i<kids.length; i++) {
        var txt = kids[i].querySelector('.slot-txt');
        if(txt && txt.dataset.id) {
            monsToFetch.push({ 
                name: txt.innerText.trim(), 
                id: txt.dataset.id 
            });
        }
    }
    
    if(monsToFetch.length === 0) { 
        alert("Column is empty!"); 
        btn.innerHTML = originalIcon;
        return; 
    }

    // 1. Fetch SETDEX Data if not cached
    if (!window.SETDEX_CACHE) {
        try {
            // Using a more reliable proxy or direct link if possible
            const proxyUrl = "https://corsproxy.io/?";
            const calcUrl = "https://calc.pokemonshowdown.com/data/sets/gen9.js"; 
            const res = await fetch(proxyUrl + calcUrl);
            if(res.ok) {
                let text = await res.text();
                // Format is: var SETDEX_SV = { ... };
                let start = text.indexOf('{');
                let end = text.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    let jsonStr = text.substring(start, end + 1);
                    window.SETDEX_CACHE = JSON.parse(jsonStr);
                }
            }
        } catch(e) {
            console.warn("Setdex fetch failed, using fallback mode.", e);
        }
    }

    for (let mon of monsToFetch) {
        let set = null;
        
        // --- MEGA DETECTION & NAME CLEANING ---
        let baseName = mon.name;
        let isMega = false;
        let megaStone = "";
        
        if(baseName.includes("Mega")) {
            isMega = true;
            let parts = baseName.split(" Mega");
            let cleanBase = parts[0].trim(); // e.g., "Lucario"
            let suffix = parts[1] ? parts[1].trim() : ""; // "X", "Y" or empty
            
            // Construct Lookup Name for dictionary
            let lookupName = cleanBase + (suffix ? " " + suffix : "");
            
            // 1. Check Exceptions Dictionary (e.g. Lucario -> Lucarionite)
            if(MEGA_STONE_EXCEPTIONS[lookupName]) {
                megaStone = MEGA_STONE_EXCEPTIONS[lookupName];
            } 
            // 2. Check Exceptions Dictionary using just base name (e.g. Lucario)
            else if(MEGA_STONE_EXCEPTIONS[cleanBase]) {
                megaStone = MEGA_STONE_EXCEPTIONS[cleanBase];
            }
            else {
                // 3. Default Rule: Name + "ite" (e.g. Pidgeot -> Pidgeotite)
                megaStone = cleanBase + "ite" + (suffix ? " " + suffix : "");
            }
            
            // Special Orbs logic
            if(cleanBase === "Kyogre" && suffix.includes("Primal")) megaStone = "Blue Orb";
            if(cleanBase === "Groudon" && suffix.includes("Primal")) megaStone = "Red Orb";
            if(cleanBase === "Rayquaza") megaStone = ""; 
            
            // Use base name for set lookup so we find the base pokemon's stats/moves
            baseName = cleanBase;
        }

        // --- STRATEGY 1: CHECK PREDEFINED SETS ---
        if (COMPETITIVE_SETS[baseName]) {
            set = COMPETITIVE_SETS[baseName];
        } 
        
        // --- STRATEGY 2: LOOKUP IN SMOGON DUMP ---
        else if (window.SETDEX_CACHE) {
            // Try exact match
            let setData = window.SETDEX_CACHE[baseName];
            
            // Try fuzzy match (ignore case/spaces)
            if (!setData) {
                let cleanId = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
                let foundKey = Object.keys(window.SETDEX_CACHE).find(k => 
                    k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanId
                );
                if(foundKey) setData = window.SETDEX_CACHE[foundKey];
            }

            if (setData) {
                // Get the first available set (usually the most common one)
                let firstSetName = Object.keys(setData)[0];
                set = setData[firstSetName];
            }
        }

        if (set) {
            // --- BUILD EXPORT FROM SMOGON/PRESET ---
            let item = isMega && megaStone ? megaStone : (set.item || 'Leftovers');
            
            exportText += `${baseName} @ ${item}\n`;
            if(set.ability) exportText += `Ability: ${set.ability}\n`;
            if(set.level && set.level != 100) exportText += `Level: ${set.level}\n`;
            if(set.teraType && !isMega) exportText += `Tera Type: ${set.teraType}\n`;
            
            if(set.evs) {
                if(typeof set.evs === 'string') {
                    exportText += `EVs: ${set.evs}\n`;
                } else {
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
            // --- STRATEGY 3: SMART FALLBACK (PokeAPI + Logic) ---
            try {
                let query = baseName.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
                let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
                if(!res.ok) throw new Error("Not found");
                let data = await res.json();
                
                // 1. Analyze Stats for Item/Nature Choice
                let stats = {};
                data.stats.forEach(s => stats[s.stat.name] = s.base_stat);
                
                // Identify highest stats
                let sortedStats = data.stats.sort((a,b) => b.base_stat - a.base_stat);
                let best1 = sortedStats[0].stat.name;
                
                let isFast = stats['speed'] >= 100;
                let isAttacker = stats['attack'] > stats['special-attack'];
                let isBulky = (stats['hp'] > 90 || stats['defense'] > 90 || stats['special-defense'] > 90) && stats['speed'] < 80;

                // 2. Smart Item Selection
                let smartItem = 'Leftovers'; // Default for balanced mons
                
                if (isMega && megaStone) {
                    smartItem = megaStone;
                } else {
                    if (isFast && (stats['attack'] > 100 || stats['special-attack'] > 100)) {
                        smartItem = 'Life Orb'; // Fast attackers get Life Orb
                        if (stats['speed'] > 120) smartItem = 'Choice Specs'; // Very fast special -> Specs? (Simplified)
                        if (isAttacker && stats['speed'] > 110) smartItem = 'Choice Band';
                    } else if (isBulky) {
                        smartItem = 'Leftovers';
                    } else if (stats['speed'] > 130) {
                        smartItem = 'Focus Sash'; // Frail speedsters
                    } else {
                        smartItem = 'Heavy-Duty Boots'; // Good generic pivot item
                    }
                }

                // 3. Nature Selection
                const natureMap = { 'attack':'Adamant', 'defense':'Impish', 'special-attack':'Modest', 'special-defense':'Calm', 'speed':'Jolly' };
                // If speed is good, boost it; otherwise boost main attack stat
                let natureStat = isFast ? 'speed' : (isAttacker ? 'attack' : 'special-attack');
                if (isBulky && !isAttacker) natureStat = 'special-defense'; // Bulky special defender
                if (isBulky && isAttacker) natureStat = 'attack'; // Bulky physical
                let nature = natureMap[natureStat] || 'Serious';

                // 4. Moves (Last 4 Level Up moves as heuristic)
                let levelMoves = data.moves.filter(m => m.version_group_details.some(d => d.move_learn_method.name === 'level-up'));
                let moves = levelMoves.slice(-4).map(m => m.move.name);
                moves = moves.map(m => m.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

                // 5. Build String
                exportText += `${baseName} @ ${smartItem}\n`;
                let abil = data.abilities[0].ability.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                exportText += `Ability: ${abil}\n`;
                exportText += `${nature} Nature\n`;
                
                // Simple 252/252 Spread based on best stats
                let evStat1 = isFast ? 'Spe' : 'HP';
                let evStat2 = isAttacker ? 'Atk' : 'SpA';
                if(isBulky) { evStat1 = 'HP'; evStat2 = (stats['defense'] > stats['special-defense']) ? 'Def' : 'SpD'; }
                
                exportText += `EVs: 252 ${evStat1} / 252 ${evStat2} / 4 SpD\n`;
                
                if(moves.length > 0) moves.forEach(m => exportText += `- ${m}\n`);
                else exportText += `- Tackle\n`;
                
                exportText += `\n`;

            } catch(e) {
                console.log("Export fallback failed for", baseName);
                exportText += `${baseName}\n\n`;
            }
        }
    }

    // VISUAL DONE
    navigator.clipboard.writeText(exportText).then(function() {
        btn.innerHTML = '<i class="fas fa-check" style="color:#0f0"></i> Copied!';
        setTimeout(() => { btn.innerHTML = originalIcon; }, 2000);
    });
}