import { getMoney, setMoney } from "./supabaseClient.js";
// money.js
const Money = (function(){
    const KEY = 'cs_money_balance';

    function precisionHelper(value) {
        return Math.round(value * 100);
    }

    function getRaw() {
        const v = localStorage.getItem(KEY);
        return v ? Number(v) : 10;
    }

    function setRaw(n) {
        const cleaned = Number(n).toFixed(2);
        localStorage.setItem(KEY, cleaned);
        notify();
    }

    function add(n) {
        const current = getRaw();
        const toAdd = Number(n || 0);
        const newTotalInCents = precisionHelper(current) + precisionHelper(toAdd);
        setRaw(newTotalInCents / 100);
    }

    function sub(n) {
        const current = getRaw();
        const toSub = Number(n || 0);
        const newTotalInCents = precisionHelper(current) - precisionHelper(toSub);
        setRaw(Math.max(0, newTotalInCents / 100));
    }

    function format(n = getRaw()) {
        return '$' + Number(n).toFixed(2);
    }

    const listeners = new Set();
    function notify() {
        listeners.forEach(fn => { try { fn(getRaw()); } catch(e) {} });
    }

    function onChange(fn) { 
        listeners.add(fn); 
        return () => listeners.delete(fn); 
    }

    if (localStorage.getItem(KEY) === null) {
        setRaw(10);
    }

    return { get: getRaw, set: setRaw, add, sub, format, onChange };
})();
(async () => {
  try {
    if (localStorage.uid) {
      const bal = await getMoney(localStorage.uid);
      if (typeof bal === "number") {
        localStorage.setItem("money", String(bal));
      }
    }
  } catch(e) {}
})();
