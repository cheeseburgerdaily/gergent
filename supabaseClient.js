import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient("https://uxspzmdbvmhlvtrobivl.supabase.co", "sb_publishable_g2Ps2f-GIL8wdOAvYz86NQ_BPqxLKTa");

export async function signupUsername(username, password) {
  const { data: existing } = await supabase.from("users").select("id").eq("username", username).maybeSingle();
  if (existing) throw new Error("Username already exists");
  const { data, error } = await supabase.from("users").insert({ username, password }).select("id").single();
  if (error) throw error;
  const uid = data.id;
  await supabase.from("money").insert({ user_id: uid, balance: 0 });
  await supabase.from("stats").insert({ user_id: uid, cases_opened: 0, total_value: 0 });
  return uid;
}

export async function loginUsername(username, password) {
  const { data, error } = await supabase.from("users").select("id,password").eq("username", username).maybeSingle();
  if (error) throw error;
  if (!data || data.password !== password) throw new Error("Invalid username or password");
  return data.id;
}

export async function saveDrop(uid, item) {
  if (!uid) return;
  await supabase.from("inventory").insert({
    user_id: uid,
    item_name: item.name,
    rarity: item.rarity,
    image: item.image,
    price: item.price,
    float_value: item.float
  });
  await supabase.from("stats").upsert({ user_id: uid, cases_opened: 0, total_value: 0 });
  await supabase.rpc("increment_cases_opened", { uid });
}

export async function getMoney(uid) {
  if (!uid) return null;
  const { data } = await supabase.from("money").select("balance").eq("user_id", uid).maybeSingle();
  return data?.balance ?? 0;
}

export async function setMoney(uid, balance) {
  if (!uid) return;
  await supabase.from("money").upsert({ user_id: uid, balance });
}