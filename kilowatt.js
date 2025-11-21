import { saveDrop } from "./supabaseClient.js";
// kilowatt.js
let skinsData = null;

async function loadSkins() {
    try {
        const response = await fetch('skins.json');
        const data = await response.json();
        // Use the kilowatt section of your JSON
        skinsData = data.kilowatt;
    } catch (e) {
        console.error("Error loading skins:", e);
        
    }
}
loadSkins();

const RARITIES = [
    { name: 'mil_spec',         weight: 79.92, color: '#4a90e2' },
    { name: 'restricted',       weight: 15.98, color: '#9b59b6' },
    { name: 'classified',       weight: 3.20,  color: '#ff4dafff' },
    { name: 'covert',           weight: 0.64,  color: '#e9331fff' },
    { name: 'exceedingly_rare', weight: 0.26,  color: '#f1c40f' }
];

const TOTAL_WEIGHT   = RARITIES.reduce((s, r) => s + r.weight, 0);
const MYSTERY_IMAGE  = 'images/mystery_kukri.png';

const openBtn    = document.getElementById('openBtn');
const skipBtn    = document.getElementById('skipBtn');
const strip      = document.getElementById('strip');
const centerLine = document.getElementById('centerLine');
const resultEl   = document.getElementById('result');
const CASE_COST  = 2.20; // change if needed

const TILE_WIDTH    = 86;
const TILE_GAP      = 4;
const TILE_TOTAL    = TILE_WIDTH + TILE_GAP;
const STRIP_LENGTH  = 100;
const WINNER_INDEX  = 80;
const CENTER_OFFSET = () =>
    (document.getElementById('stripWrap').offsetWidth / 2) - (TILE_WIDTH / 2);

const DURATION = 7000;
const EASING   = 'cubic-bezier(0.0, 0.5, 0.2, 1)';

let skip = false;
let winnerData = null;

// Get a random skin that is NOT exceedingly rare (for filler tiles)
function getRandomNonGoldSkin() {
    if (!skinsData) return null;

    const nonGoldRarities = RARITIES.filter(r => r.name !== 'exceedingly_rare');
    const nonGoldTotalWeight = nonGoldRarities.reduce((s, r) => s + r.weight, 0);
    if (nonGoldTotalWeight === 0) return getRandomSkin(); // fallback

    let roll = Math.random() * nonGoldTotalWeight;
    let rarity = nonGoldRarities[0];

    for (const r of nonGoldRarities) {
        roll -= r.weight;
        if (roll < 0) {
            rarity = r;
            break;
        }
    }

    const pool = skinsData[rarity.name];
    if (!pool || pool.length === 0) return null;

    const skin = pool[Math.floor(Math.random() * pool.length)];
    return { ...skin, color: rarity.color, rarity: rarity.name };
}

// Get a random skin with full rarity weights (can be gold)
function getRandomSkin() {
    if (!skinsData) return null;

    let roll = Math.random() * TOTAL_WEIGHT;
    let rarity = RARITIES[0];

    for (const r of RARITIES) {
        roll -= r.weight;
        if (roll < 0) {
            rarity = r;
            break;
        }
    }

    const pool = skinsData[rarity.name];
    if (!pool || pool.length === 0) return null;

    const skin = pool[Math.floor(Math.random() * pool.length)];
    return { ...skin, color: rarity.color, rarity: rarity.name };
}

function refreshMoney() {
    const el = document.getElementById('moneyAmount');
    if (el) el.textContent = Money.format(Money.get());
}
Money.onChange(refreshMoney);
refreshMoney();

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
    strip.style.transform  = 'translateX(0px)';
    strip.innerHTML        = '';
    // force reflow
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

        // Choose which skin goes on this tile
        if (i === WINNER_INDEX) {
            skin = winner;
        } else {
            // Filler skin that can't be gold
            skin = getRandomNonGoldSkin();
            if (!skin) skin = getRandomSkin(); // safety fallback
        }

        let img   = skin.image;
        let color = skin.color;

        // Hide the actual winner's image if it's gold, but keep gold color
        if (i === WINNER_INDEX && winner.rarity === 'exceedingly_rare') {
            img = MYSTERY_IMAGE;
        }

        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.style.backgroundImage = `url(${img})`;
        tile.style.backgroundColor = color;
        strip.appendChild(tile);
    }

    // Where the center of the winning tile would normally land
    const centerTarget = -(WINNER_INDEX * TILE_TOTAL) + CENTER_OFFSET();

    // Random offset within the tile width for more natural stopping
    const randomOffset = (Math.random() * TILE_WIDTH) - (TILE_WIDTH / 2);
    const finalTargetX = centerTarget + randomOffset;

    strip.style.transition = `transform ${DURATION}ms ${EASING}`;
    strip.style.transform  = `translateX(${finalTargetX}px)`;

    strip.ontransitionend = () => {
        if (!skip) {
            stopSpin(winnerData);
        }
    };
}

function skipSpin(winner) {
    strip.style.transition = 'none';
    strip.style.transform  =
        `translateX(${-(WINNER_INDEX * TILE_TOTAL) + CENTER_OFFSET()}px)`;
    stopSpin(winner);
}

function stopSpin(winnerSkin) {
    skipBtn.style.display = 'none';
    // We *don't* hide centerLine, as you mentioned

    const [min, max] = winnerSkin.float_range.split('-').map(parseFloat);
    const float = (Math.random() * (max - min) + min).toFixed(5);

    let wear    = 'Battle-Scarred';
    let wearKey = 'BS';

    if (float <= 0.07) {
        wear = 'Factory New'; wearKey = 'FN';
    } else if (float <= 0.15) {
        wear = 'Minimal Wear'; wearKey = 'MW';
    } else if (float <= 0.38) {
        wear = 'Field-Tested'; wearKey = 'FT';
    } else if (float <= 0.45) {
        wear = 'Well-Worn'; wearKey = 'WW';
    }

    const price = parseFloat(winnerSkin.price?.[wearKey]) || 0;

    // StatTrak logic: only if allowed in JSON
    const isStatTrak =
        winnerSkin.stattrak_available === false
            ? false
            : Math.random() < 0.10;

    const star = (winnerSkin.rarity === 'exceedingly_rare') ? '★ ' : '';
    const nameHTML = isStatTrak
        ? `<span style="color:${winnerSkin.color}">${star}</span><span style="color:#e67e22;">StatTrak™</span> <span style="color:${winnerSkin.color}">${winnerSkin.name}</span>`
        : `<span style="color:${winnerSkin.color}">${star}${winnerSkin.name}</span>`;

    resultEl.innerHTML = `
        <div class="title">
            ${nameHTML}
        </div>
        <div>Wear: <b>${wear}</b> | Float: <b>${float}</b> | Value: <b>${Money.format(price)}</b></div>
        <img src="${winnerSkin.image}" alt="${winnerSkin.name}" style="border:4px solid ${winnerSkin.color}">
    `;
    resultEl.style.opacity = 1;

    // Build the item object we want to save in the DATABASE
    const droppedItem = {
        name:      winnerSkin.name,
        image:     winnerSkin.image,
        wear,
        float:     parseFloat(float),
        price,
        color:     winnerSkin.color,
        stattrak:  isStatTrak,
        rarity:    winnerSkin.rarity
    };

    
    saveDrop(localStorage.uid, droppedItem).catch(console.error);
// Optional: still keep a local inventory for offline viewing
    const inv = JSON.parse(localStorage.getItem('inventory')) || [];
    inv.push(droppedItem);
    localStorage.setItem('inventory', JSON.stringify(inv));

    // 🔥 Send the item to your Netlify Function backend
    })
    .catch(err => {
        console.error("Error saving to backend:", err);
    });

    openBtn.style.display = 'inline-block';
}
