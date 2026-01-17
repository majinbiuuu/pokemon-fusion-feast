/* constants.js */
/* Holds static game data and configuration constants */

window.MEGA_STONE_EXCEPTIONS = {
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

window.COMPETITIVE_SETS = {
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

window.SETDEX_CACHE = null;