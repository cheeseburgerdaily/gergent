const inventoryGrid = document.getElementById('inventoryGrid');
const sellAllBtn = document.getElementById('sellAllBtn');
const totalValueEl = document.getElementById('totalValue');
const searchBar = document.getElementById('searchBar');
const rarityFilter = document.getElementById('rarityFilter');
const sortOrder = document.getElementById('sortOrder');
const sellSelectedBtn = document.getElementById('sellSelectedBtn');

const selectedItems = new Set();

let backendInventory = [];


const RARITY_FILTER_MAP = {
    'all': ['consumer','industrial','mil_spec','restricted','classified','covert','exceedingly_rare'],
    'gray': ['consumer'], 'consumer': ['consumer'],
    'lightblue': ['industrial'], 'industrial': ['industrial'],
    'blue': ['mil_spec'], 'mil-spec': ['mil_spec'], 'mil_spec': ['mil_spec'],
    'purple': ['restricted'], 'restricted': ['restricted'],
    'pink': ['classified'], 'classified': ['classified'],
    'red': ['covert'], 'covert': ['covert'],
    'yellow': ['exceedingly_rare'], 'exceedingly rare': ['exceedingly_rare'], 'exceedingly_rare': ['exceedingly_rare']
};

function getInventory(){ return backendInventory; }
function saveInventory(inv){ backendInventory = inv; localStorage.setItem('inventory', JSON.stringify(inv)); }

function refreshMoney(){
    const moneyEl=document.getElementById('moneyAmount');
    if(moneyEl) moneyEl.textContent = Money.format(Money.get());
}
if(typeof Money!=='undefined'){ Money.onChange(refreshMoney); refreshMoney(); }

function getItemRarity(item){ return (item.rarity||'mil_spec').toLowerCase().trim().replace(/\s+/g,'_'); }
function getAllowedRarities(){
    const key=(rarityFilter?.value||'all').toLowerCase().trim().replace(/\s+/g,'_');
    return RARITY_FILTER_MAP[key] || ['mil_spec'];
}

function getFilteredAndSortedInventory() {
    const inv = getInventory(); // original inventory
    const searchTerm = (searchBar?.value || '').toLowerCase().trim();
    const allowedRarities = getAllowedRarities();
    const sortType = sortOrder?.value || '';

    // Filter
    let filtered = inv
      .map((item, index) => ({ item, _invIndex: index })) // keep original item
      .filter(entry => {
          const nameMatch = entry.item.name.toLowerCase().includes(searchTerm);
          const itemRarity = getItemRarity(entry.item);
          const rarityMatch = allowedRarities.includes(itemRarity);
          return nameMatch && rarityMatch;
      });

    // Sort
    filtered.sort((a, b) => {
        switch (sortType) {
            case 'price_desc': return (b.item.price || 0) - (a.item.price || 0);
            case 'price_asc': return (a.item.price || 0) - (b.item.price || 0);
            case 'float_asc': return (a.item.float || 0) - (b.item.float || 0);
            case 'float_desc': return (b.item.float || 0) - (a.item.float || 0);
            case 'newest': return b._invIndex - a._invIndex;
            case 'oldest': return a._invIndex - b._invIndex;
            default: return 0;
        }
    });

    return filtered; // returns array of { item, _invIndex }
}


function updateSellSelectedButton() {
    const selectedCount = selectedItems.size || 0;

    if (selectedCount > 0) {
        sellSelectedBtn.style.display = 'inline-block';
        sellSelectedBtn.textContent = `Sell Selected (${selectedCount})`;
        sellAllBtn.style.display = 'none'; // hide Sell All while selecting
    } else {
        sellSelectedBtn.style.display = 'none';
        sellAllBtn.style.display = 'inline-block';
    }
}


function renderInventory(){
    const displayed=getFilteredAndSortedInventory();
    const allItems=getInventory();
    inventoryGrid.innerHTML='';

    const totalValue=allItems.reduce((sum,item)=>sum+(item.price||0),0);
    totalValueEl.innerHTML=`Total Value: <b>${Money.format(totalValue)}</b>`;

    if(!allItems.length){ inventoryGrid.innerHTML='<p style="color:var(--muted);text-align:center;margin-top:60px;">Your inventory is empty.</p>'; sellAllBtn.style.display='none'; return; }
    if(!displayed.length){ inventoryGrid.innerHTML='<p style="color:var(--muted);text-align:center;margin-top:60px;">No items match your filters.</p>'; sellAllBtn.style.display='block'; return; }

    sellAllBtn.style.display='block';

    displayed.forEach(entry => {
        const item = entry.item;
        const originalIndex = entry._invIndex;

        // … rest of your rendering code remains the same


        const itemEl=document.createElement('div');
        itemEl.className='inventory-item';
        itemEl.style.border=`2px solid ${item.color||'#4A90E2'}`;

        // Name + Star + StatTrak + Souvenir
        let nameHTML='';
        let star=item.rarity==='exceedingly_rare'?'★ ':'';
        let stattrak=item.stattrak?`<span style="color:#e67e22">StatTrak™</span> `:'';
        let isSouvenir=item.name.startsWith('Souvenir');
        let displayName=item.name;
        if(isSouvenir){
            const rest=displayName.substring('Souvenir'.length).trim();
            displayName=`<span style="color:#FFFF00;">Souvenir</span> <span style="color:${item.color};">${rest}</span>`;
        } else displayName=`<span style="color:${item.color};">${displayName}</span>`;

        nameHTML=`<div class="name">${star}${stattrak}${displayName}</div>`;
        const rarityText=item.rarity.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

        itemEl.innerHTML=`
            ${nameHTML}
            <div class="rarity-text">${rarityText}</div>
            <img src="${item.image||'images/mystery.png'}" alt="${item.name}" style="width:100%;height:140px;object-fit:contain;border-radius:6px;">
            <div class="details">${item.wear} | Float: ${parseFloat(item.float||0).toFixed(4)}</div>
            <span class="price">${Money.format(item.price||0)}</span>
            <button class="sell-btn" data-index="${originalIndex}">Sell</button>
        `;
        inventoryGrid.appendChild(itemEl);

        itemEl.addEventListener('click',()=>{
            if(selectedItems.has(originalIndex)) selectedItems.delete(originalIndex);
            else selectedItems.add(originalIndex);
            itemEl.classList.toggle('selected');
            updateSellSelectedButton();
        });

        itemEl.querySelector('.sell-btn').addEventListener('click',e=>{
            e.stopPropagation();
            const inv=getInventory();
            Money.add(item.price||0);
            inv.splice(originalIndex,1);
            saveInventory(inv);
            selectedItems.delete(originalIndex);
            renderInventory();
            updateSellSelectedButton();
        });
    });
}

// Sell all
sellAllBtn.addEventListener('click',()=>{
    const inv=getInventory();
    if(!inv.length) return;
    const total=inv.reduce((sum,item)=>sum+(item.price||0),0);
    Money.add(total);
    saveInventory([]);
    selectedItems.clear();
    renderInventory();
    updateSellSelectedButton();
});

// Sell selected
sellSelectedBtn.addEventListener('click',()=>{
    const inv=getInventory();
    if(!selectedItems.size) return;
    let total=0;
    const newInv=inv.filter((item,idx)=>{
        if(selectedItems.has(idx)){ total+=item.price||0; return false; }
        return true;
    });
    Money.add(total);
    saveInventory(newInv);
    selectedItems.clear();
    renderInventory();
    updateSellSelectedButton();
});

// Event listeners
searchBar?.addEventListener('input',renderInventory);
rarityFilter?.addEventListener('change',renderInventory);
sortOrder?.addEventListener('change',renderInventory);

// Initial render

loadInventoryFromBackend();




async function loadInventoryFromBackend(){
    
    }

    try{
        const res = await fetch("/.netlify/functions/getInventory?uid=" + encodeURIComponent(localStorage.uid));
        if(!res.ok){
            throw new Error("Failed to load inventory from backend");
        }
        const data = await res.json();
        // Expecting data.items to be an array of rows from DB
        backendInventory = (data.items || []).map(row => ({
            name: row.item_name,
            image: row.image_url,
            wear: row.wear,
            float: row.float_value,
            price: row.price,
            color: row.color || '#4A90E2',
            stattrak: row.stattrak,
            rarity: row.rarity
        }));
        renderInventory();
        updateSellSelectedButton();
    }catch(err){
        console.error(err);
        // fallback to localStorage if backend fails
        backendInventory = JSON.parse(localStorage.getItem('inventory')) || [];
        renderInventory();
        updateSellSelectedButton();
    }
}
