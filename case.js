// case.js
let skinsData = null;
async function loadSkins() {
    try {
        const response = await fetch('skins.json');
        const data = await response.json();
        skinsData = data.kilowatt;
    } catch (e) {
        console.error("Error loading skins data:", e);
        
    }
}
loadSkins();

const openBtn = document.getElementById('openBtn');
const skipBtn = document.getElementById('skipBtn');
const strip = document.getElementById('strip');
const stripWrap = document.getElementById('stripWrap'); 
const centerLine = document.getElementById('centerLine');
const resultEl = document.getElementById('result');
const CASE_COST = 2.20;

// Skin Rarity Weights and Colors
const RARITIES = [
  { name: 'blue', weight: 79.92, color: '#4a90e2' },     
  { name: 'purple', weight: 15.98, color: '#9b59b6' },   
  { name: 'pink', weight: 3.2, color: '#ff4dafff' },    
  { name: 'red', weight: 0.64, color: '#e9331fff' },     
  { name: 'yellow', weight: 0.26, color: '#f1c40f' }   
];
const TOTAL_WEIGHT = RARITIES.reduce((sum, r) => sum + r.weight, 0);
const MYSTERY_IMAGE = 'images/mystery.png'; 

function getRandomSkin() {
  if (!skinsData) return null;

  let randomNum = Math.random() * TOTAL_WEIGHT;
  let selectedRarity = null;
  for (const rarity of RARITIES) {
    randomNum -= rarity.weight;
    if (randomNum < 0) {
      selectedRarity = rarity;
      break;
    }
  }
  if (!selectedRarity) selectedRarity = RARITIES[0]; 

  const arr = skinsData[selectedRarity.name];
  if (!arr || arr.length === 0) return null;

  const skin = arr[Math.floor(Math.random() * arr.length)];
  return { ...skin, color: selectedRarity.color, rarity: selectedRarity.name };
}

function refreshMoney() {
  const moneyEl = document.getElementById('moneyAmount');
  if (moneyEl) {
    moneyEl.textContent = Money.format(Money.get());
  }
}
Money.onChange(refreshMoney);
refreshMoney();

let skip = false;
let winnerData = null; 

const TILE_WIDTH = 86; 
const TILE_GAP = 4;
const TILE_TOTAL_WIDTH = TILE_WIDTH + TILE_GAP; 
const STRIP_LENGTH = 100;
const WINNER_INDEX = 80;
const CENTER_OFFSET = (stripWrap.offsetWidth / 2) - (TILE_WIDTH / 2); 
const DURATION = 7000; 
const EASING = 'cubic-bezier(0.0, 0.5, 0.2, 1)'; 

openBtn.addEventListener('click', () => {
  if (Money.get() < CASE_COST) {  return; }
  Money.sub(CASE_COST);
  refreshMoney();
  openBtn.style.display = 'none';
  skipBtn.style.display = 'inline-block';
  centerLine.style.display = 'block';
  resultEl.style.opacity = 0;
  startSpin();
});

const handleSkipClick = () => { skip = true; skipSpin(winnerData); };
skipBtn.addEventListener('click', handleSkipClick);


function resetStripStyles() {
    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0px)';
    void strip.offsetWidth; 
}


function startSpin() {
  resetStripStyles();
  strip.innerHTML = '';
  skip = false;
  
  const winner = getRandomSkin(); 
  if (!winner) {
    openBtn.style.display = 'inline-block';
    skipBtn.style.display = 'none';
    centerLine.style.display = 'none';
    return;
  }
  winnerData = winner; 

  // Generate the long strip
  for (let i = 0; i < STRIP_LENGTH; i++) {
    let skin = getRandomSkin();
    if (i === WINNER_INDEX) skin = winner; 
    
    // FIX APPLIED: Correctly determine image: mystery for yellow, actual for others.
    let displayImage = skin.image;
    if (skin.rarity === 'yellow') {
        displayImage = MYSTERY_IMAGE;
    }

    const div = document.createElement('div');
    div.className = 'tile';
    div.style.backgroundImage = `url(${displayImage})`; 
    div.style.backgroundColor = skin.color;
    strip.appendChild(div);
  }

  const targetPosition = -(WINNER_INDEX * TILE_TOTAL_WIDTH) + CENTER_OFFSET;

  const finishTransition = () => {
    if (!skip) { 
        strip.removeEventListener('transitionend', finishTransition);
        stopSpin(winnerData);
    }
  };
  
  strip.style.transition = `transform ${DURATION}ms ${EASING}`;
  strip.style.transform = `translateX(${targetPosition}px)`;

  strip.addEventListener('transitionend', finishTransition);
}


function skipSpin(winner) {
  skip = true;
  
  strip.style.transition = 'none'; 
  const targetPosition = -(WINNER_INDEX * TILE_TOTAL_WIDTH) + CENTER_OFFSET;
  strip.style.transform = `translateX(${targetPosition}px)`;
  
  stopSpin(winner);
}


function stopSpin(winnerSkin) {
  skipBtn.removeEventListener('click', handleSkipClick); 
  skipBtn.addEventListener('click', handleSkipClick); 

  centerLine.style.display = 'none';
  skipBtn.style.display = 'none';

  // --- Start Wear, Float, and Price Calculation ---
  const [minFloatStr, maxFloatStr] = winnerSkin.float_range.split('-');
  const minFloat = parseFloat(minFloatStr);
  const maxFloat = parseFloat(maxFloatStr);

  const floatVal = Math.random() * (maxFloat - minFloat) + minFloat;
  const floatFormatted = floatVal.toFixed(5);

  let wear = 'Battle-Scarred';
  let wearKey = 'BS';

  if (floatVal <= 0.07) { 
    wear = 'Factory New'; 
    wearKey = 'FN'; 
  } else if (floatVal <= 0.15) { 
    wear = 'Minimal Wear'; 
    wearKey = 'MW'; 
  } else if (floatVal <= 0.38) { 
    wear = 'Field-Tested'; 
    wearKey = 'FT'; 
  } else if (floatVal <= 0.45) { 
    wear = 'Well-Worn'; 
    wearKey = 'WW'; 
  }

  const price = parseFloat(winnerSkin.price?.[wearKey]) || 0;
  // --- End Wear, Float, and Price Calculation ---

  // --- START StatTrak™ Logic ---
  let finalName = winnerSkin.name;
  let isStatTrak = false;
  
  const ORANGE_STATTRAK = '<span style="color:#e67e22;">StatTrak™</span> '; 
  
  if (Math.random() < 0.10) { 
    finalName = ORANGE_STATTRAK + winnerSkin.name;
    isStatTrak = true; 
  }
  // --- END StatTrak™ Logic ---

  // Display the actual skin details (No ★ prefix)
  resultEl.innerHTML = `
    <div class="title" style="color:${winnerSkin.color}">${finalName}</div>
    <div>Wear: <b>${wear}</b> Float: <b>${floatFormatted}</b> Value: <b>${Money.format(price)}</b></div>
    <img src="${winnerSkin.image}" alt="${winnerSkin.name}" style="border:4px solid ${winnerSkin.color}">
  `;
  resultEl.style.opacity = 1;

  // Save full data to inventory
  let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
  inventory.push({ 
    name: finalName, 
    image: winnerSkin.image, 
    wear, 
    float: floatFormatted,
    price: price, 
    color: winnerSkin.color,
    isStatTrak: isStatTrak 
  });
  localStorage.setItem('inventory', JSON.stringify(inventory));

  openBtn.style.display = 'inline-block';
  openBtn.animate([{ transform: 'scale(0.9)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }], { duration: 600, easing: 'ease-out' });
}