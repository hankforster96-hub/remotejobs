/* ===========================
   RemoteJobs — app.js  v3
   Backend: Supabase (auth + database) + Paystack (payments)
   Paystack works for Kenya-based businesses AND accepts cards
   from customers anywhere in the world (Visa, Mastercard, Amex, M-Pesa).

   BEFORE THIS WORKS — fill in the CONFIG section below.
   See SETUP_GUIDE.md for full step-by-step instructions.
   =========================== */

/* ── CONFIG ── */
const CONFIG = {
  SUPABASE_URL:      "https://flfpduujawqesapgglki.supabase.co",       // paste your Supabase project URL here
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsZnBkdXVqYXdxZXNhcGdnbGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzI2ODEsImV4cCI6MjA5NzI0ODY4MX0.84y6ABt1iNGzRaKI4fqgK5zj4Ai9xgadpSd1JjWHS-0",  // paste your Supabase anon key here
  ADMIN_EMAIL:       "hankforster96@gmail.com",

  // Paystack subscription page links (live — do not change)
  PAYSTACK_LINKS: {
    starter: "https://paystack.shop/pay/5f21tz8dfs",   // $4/mo  — 5 links/day
    pro:     "https://paystack.shop/pay/op06lc64l5",   // $7/mo  — 13 links/day
    elite:   "https://paystack.shop/pay/g47o7eyvco"    // $10/mo — 20 links/day
  }
};

/* ── PLAN DEFINITIONS ── */
const PLANS = {
  starter: { name: "Starter", price: 4,  perDay: 5,  label: "5 job links / day"  },
  pro:     { name: "Pro",     price: 7,  perDay: 13, label: "13 job links / day" },
  elite:   { name: "Elite",   price: 10, perDay: 20, label: "20 job links / day" }
};

/* ── SUPABASE CLIENT ── */
function getSupabase() {
  if (typeof supabase === "undefined") {
    console.error("Supabase CDN not loaded.");
    return null;
  }
  return supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}

/* ── TOAST NOTIFICATION ── */
function toast(message, type = "success") {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.className = `toast toast--${type} show`;
  el.innerHTML = message;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove("show"), 4500);
}

/* ── AUTH ── */

async function signUp(email, password) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, user: data.user };
}

async function logIn(email, password) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, user: data.user, session: data.session };
}

async function logOut() {
  const sb = getSupabase();
  await sb.auth.signOut();
  window.location.href = "login.html";
}

async function getSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function requireAuth() {
  const session = await getSession();
  if (!session) { window.location.href = "login.html"; return null; }
  return session.user;
}

/* ── PROFILE ── */

async function getProfile(userId) {
  const sb = getSupabase();
  const { data, error } = await sb.from("profiles").select("*").eq("id", userId).single();
  if (error) return null;
  return data;
}

async function getAllProfiles() {
  const sb = getSupabase();
  const { data, error } = await sb.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

/* ── PAYSTACK CHECKOUT ── */
// Redirects visitor to their chosen Paystack subscription page.
// After payment Paystack redirects them back to login.html to create their account.

function goToPaystackCheckout(planKey) {
  const plan = PLANS[planKey];
  const link = CONFIG.PAYSTACK_LINKS[planKey];
  if (!plan || !link) return;

  // Store chosen plan so dashboard knows what to activate after signup
  sessionStorage.setItem("rj_pending_plan", planKey);

  // Send them straight to the Paystack payment page
  window.location.href = link;
}

/* ── JOBS ── */

async function getJobsForPlan(planKey) {
  const sb = getSupabase();
  const quota = PLANS[planKey]?.perDay || 0;
  const { data, error } = await sb
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(quota);
  if (error) { console.error(error); return []; }
  return data || [];
}

async function getAllJobs() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

async function insertJobs(rows) {
  const sb = getSupabase();
  const { data, error } = await sb.from("jobs").insert(rows).select();
  if (error) throw error;
  return data;
}

async function deleteJob(id) {
  const sb = getSupabase();
  const { error } = await sb.from("jobs").delete().eq("id", id);
  if (error) throw error;
}

/* ── HELPERS ── */

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = Math.floor((now - d) / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  return `${diffD}d ago`;
}

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

function escapeAttr(str) {
  return (str ?? "").replace(/"/g, "&quot;");
}
