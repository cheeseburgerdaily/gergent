// priceManager.js
let skinportCache = null;
let lastFetch = 0;

async function fetchSkinportItems() {
    const now = Date.now();
    // Cache for 5 minutes to avoid rate limits
    if (skinportCache && (now - lastFetch) < 5 * 60 * 1000) {
        return skinportCache;
    }

    const params = new URLSearchParams({ app_id: 730, currency: 'USD' });

    try {
        const response = await fetch(`https://api.skinport.com/v1/items?${params.toString()}`);
        const data = await response.json();
        skinportCache = data;
        lastFetch = now;
        return data;
    } catch (e) {
        console.error("Failed to fetch Skinport prices:", e);
        return [];
    }
}

async function getSkinPrice(skinName, wearKey) {
    const items = await fetchSkinportItems();

    const wearMap = {
        'FN': 'Factory New',
        'MW': 'Minimal Wear',
        'FT': 'Field-Tested',
        'WW': 'Well-Worn',
        'BS': 'Battle-Scarred'
    };

    const searchKey = `${skinName} (${wearMap[wearKey] || 'Battle-Scarred'})`;

    const item = items.find(i => i.market_hash_name === searchKey);
    return item?.min_price ?? item?.mean_price ?? 0;
}
