import { saveDrop } from "./supabaseClient.js";
// Cobblestone Souvenir Package Script
let skinsData = null;

async function loadSkins() {
    try {
        const response = await fetch('skins.json');
        const data = await response.json();
        // 1. CRITICAL: Ensure this key matches your JSON data precisely.
        // Based on your JSON snippet, it should be 'dreamhack_2014_cobblestone_souvenir'.
        skinsData = data.dreamhack_2014_cobblestone_souvenir; 
    } catch (e) {
        console.error("Error loading skins:", e);
        
    }
}
loadSkins();

// --- CORRECTED RARITIES FOR SOUVENIR PACKAGE ---
const RARITIES = [
    // Consumer 
    { name: 'consumer', weight: 80.0064, color: '#adb4bbff' },
    // Industrial
    { name: 'industrial', weight: 16, color: '#9cc4f1ff' },
    // Mil-Spec 
    { name: 'mil_spec', weight: 3.20,  color: '#4a90e2' },
    // Restricted 
    { name: 'restricted', weight: 0.64,  color: '#9b59b6' },
    // Classified 
    { name: 'classified', weight: 0.128,  color: '#ff4dafff' },
    // Covert 
    { name: 'covert', weight: 0.0256, color: '#e9331fff'}
];

const TOTAL_WEIGHT = RARITIES.reduce((s, r) => s + r.weight, 0);
const MYSTERY_IMAGE = 'images/mystery.png';

const openBtn = document.getElementById('openBtn');
const skipBtn = document.getElementById('skipBtn');
const strip = document.getElementById('strip');
const centerLine = document.getElementById('centerLine');
const resultEl = document.getElementById('result');
const CASE_COST = 1400.00; // Example Case cost

const TILE_WIDTH = 86, TILE_GAP = 4, TILE_TOTAL = TILE_WIDTH + TILE_GAP;
const STRIP_LENGTH = 100, WINNER_INDEX = 80;
const CENTER_OFFSET = () => (document.getElementById('stripWrap').offsetWidth / 2) - (TILE_WIDTH / 2);
const DURATION = 7000, EASING = 'cubic-bezier(0.0, 0.5, 0.2, 1)';

let skip = false, winnerData = null;

// Function is simplified as there is NO Gold (Exceedingly Rare) to filter out
function getRandomNonGoldSkin() {
    return getRandomSkin();
}


function getRandomSkin() {
    if (!skinsData) return null;
    let roll = Math.random() * TOTAL_WEIGHT;
    let rarity = RARITIES[0];
    for (const r of RARITIES) { roll -= r.weight; if (roll < 0) { rarity = r; break; } }
    
    const pool = skinsData[rarity.name];
    if (!pool || pool.length === 0) {
        console.warn(`No skins found for rarity: ${rarity.name}`);
        return getRandomSkin(); 
    }
    const skin = pool[Math.floor(Math.random() * pool.length)];
    return { ...skin, color: rarity.color, rarity: rarity.name };
}

function refreshMoney() {
    const el = document.getElementById('moneyAmount');
    if (el) el.textContent = Money.format(Money.get());
}

openBtn.addEventListener('click', () => {
    if (typeof Money !== 'undefined' && Money.get && Money.get() < CASE_COST) {
        if (window.showNotification) window.showNotification("Not enough money!", "error");
        return;
    }
    if (typeof Money !== 'undefined' && Money.sub) {
        Money.sub(CASE_COST);
        if (typeof refreshMoney === 'function') refreshMoney();
    }
    openBtn.style.display  = 'none';
    skipBtn.style.display  = 'inline-block';
    centerLine.style.display = 'block';
    resultEl.style.opacity = 0;
    startSpin();
});

skipBtn.addEventListener('click', () => {
    if (winnerData) {
        skip = true;
        skipSpin(winnerData);
    }
});

function resetStrip() {
    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0px)';
    strip.innerHTML = '';
    void strip.offsetWidth;
}

function startSpin() {
    resetStrip();
    skip = false;
    const winner = getRandomSkin();
    if (!winner) return;
    winnerData = winner;

    for (let i = 0; i < STRIP_LENGTH; i++) {
        let skin;

        // 1. Determine the skin for the tile
        if (i === WINNER_INDEX) {
            skin = winner;
        } else {
            // Use a filler skin that CANNOT be Exceedingly Rare (Gold)
            skin = getRandomNonGoldSkin();
            if (!skin) { // Safety check
                skin = getRandomSkin(); 
            }
        }
        
        let img = skin.image;
        let color = skin.color;
        
        // 2. Hide the actual winner's image behind the MYSTERY_IMAGE if it's Exceedingly Rare (Gold).
        // This makes the Gold item a surprise, which is the desired CS2 behavior.
        if (i === WINNER_INDEX && winner.rarity === 'exceedingly_rare') {
            img = MYSTERY_IMAGE;
            // The color remains the gold color of the winner
        }

        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.style.backgroundImage = `url(${img})`;
        tile.style.backgroundColor = color;
        strip.appendChild(tile);
    }

    // --- 👇 THIS IS THE NEW LOGIC FOR RANDOM TILE ENDING 👇 ---
    // 1. Calculate the initial target position (center of the winning tile)
    const centerTarget = -(WINNER_INDEX * TILE_TOTAL) + CENTER_OFFSET();

    // 2. Calculate a random offset within the width of a single tile (TILE_WIDTH)
    // The offset should be from the left edge of the winning tile to the right edge.
    // We subtract half the tile width (TILE_WIDTH / 2) from the random value (0 to TILE_WIDTH) 
    // because the `centerTarget` is already positioning the strip relative to the center of the tile.
    const randomOffset = (Math.random() * TILE_WIDTH) - (TILE_WIDTH / 2);

    // 3. Apply the random offset to the center target
    const finalTargetX = centerTarget + randomOffset;
    // --- 👆 END OF NEW LOGIC 👆 ---

    strip.style.transition = `transform ${DURATION}ms ${EASING}`;
    strip.style.transform = `translateX(${finalTargetX}px)`; // Use finalTargetX
    strip.ontransitionend = () => { if (!skip) stopSpin(winnerData); };
}

function skipSpin(winner) {
    strip.style.transition = 'none';
    strip.style.transform = `translateX(${-(WINNER_INDEX * TILE_TOTAL) + CENTER_OFFSET()}px)`;
    stopSpin(winner);
}

function stopSpin(winnerSkin) {
    skipBtn.style.display = 'none';

    // --- FLOAT GENERATION (Uses min/max from JSON) ---
    // FIX: Robustly parse the float range, adding a fallback for safety
    const floatParts = winnerSkin.float_range ? winnerSkin.float_range.split('-').map(parseFloat) : [0.00, 1.00];

    const min = !isNaN(floatParts[0]) ? floatParts[0] : 0.00;
    const max = !isNaN(floatParts[1]) ? floatParts[1] : 1.00;

    const float = (Math.random() * (max - min) + min).toFixed(5);

    // --- WEAR ASSIGNMENT (Uses Standard CS:GO Tiers) ---
    let wear; 
    let wearKey;

    if (float <= 0.07) { 
        wear = 'Factory New';       
        wearKey = 'FN'; 
    }
    else if (float <= 0.15) { 
        wear = 'Minimal Wear';     
        wearKey = 'MW'; 
    }
    else if (float <= 0.38) { 
        wear = 'Field-Tested';    
        wearKey = 'FT'; 
    }
    else if (float <= 0.45) { 
        wear = 'Well-Worn';         
        wearKey = 'WW'; 
    }
    else {
        wear = 'Battle-Scarred';         
        wearKey = 'BS'; 
    }

    const price = parseFloat(winnerSkin.price?.[wearKey]) || 0;
    
    // --- STATTRAK CHECK (Souvenir packages DO NOT have StatTrak) ---
    let isStatTrak = false;
    
    // --- SOUVENIR TEXT MODIFICATION ---
    const yellowColor = '#FFFF00'; 
    const rarityColor = winnerSkin.color;
    
    let prefixHTML = '';
    let itemName = winnerSkin.name;
    let finalNameHTML;

    // 1. Check for Souvenir prefix
    if (itemName.startsWith('Souvenir')) {
        prefixHTML += `<span style="color:${yellowColor}">Souvenir </span>`;
        itemName = itemName.substring('Souvenir '.length).trim(); 
    }
    
    // 2. StatTrak check is skipped/false.
    
    // 3. Assemble the final name HTML.
    finalNameHTML = `${prefixHTML}<span style="color:${rarityColor}">${itemName}</span>`;


    // --- DISPLAY RESULT ---
    resultEl.innerHTML = `
        <div class="title">
            ${finalNameHTML}
        </div>
        <div>Wear: <b>${wear}</b> | Float: <b>${float}</b> | Value: <b>${Money.format(price)}</b></div>
        <img src="${winnerSkin.image}" alt="${winnerSkin.name}" style="border:4px solid ${rarityColor}">
    `;
    resultEl.style.opacity = 1;

    // --- INVENTORY LOGIC (Now uncommented and fixed to use correct rarity) ---
    const droppedItem = {
    name: winnerSkin.name,
    image: winnerSkin.image,
    wear,
    float: parseFloat(float),
    price,
    color: winnerSkin.color,
    stattrak: isStatTrak,
    rarity: winnerSkin.rarity
};


    saveDrop(localStorage.uid, droppedItem).catch(console.error);
const inv = JSON.parse(localStorage.getItem('inventory')) || [];
inv.push(droppedItem);
localStorage.setItem('inventory', JSON.stringify(inv));

})
.catch(err => {
    console.error("Error saving to backend:", err);
});

openBtn.style.display = 'inline-block';
}