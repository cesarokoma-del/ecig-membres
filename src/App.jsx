// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, getDoc, doc, runTransaction, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import {
  getAuth, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  setPersistence, browserSessionPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "ecig-gestion.firebaseapp.com",
  projectId: "ecig-gestion",
  storageBucket: "ecig-gestion.firebasestorage.app",
  messagingSenderId: "1014513113938",
  appId: "1:1014513113938:web:6f242739c5fb6ef3a9388b",
  measurementId: "G-DS7XEV4SND"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

const saveData = async (key, data) => {
  try { await setDoc(doc(db, "ecig_data", key), { value: JSON.stringify(data) }); } catch(e) {}
};
/**
 * Mise à jour ATOMIQUE d'une liste stockée en bloc (ecig_membres, ecig_familles).
 * Relit la version actuelle sur le serveur, applique la modification, réécrit :
 * une saisie faite entre-temps sur un autre appareil n'est jamais écrasée.
 */
const majListe = async (key, fn) => {
  const ref = doc(db, "ecig_data", key);
  return runTransaction(db, async (txn) => {
    const snap = await txn.get(ref);
    const liste = snap.exists() ? JSON.parse(snap.data().value || "[]") : [];
    const nouvelle = fn(liste);
    txn.set(ref, { value: JSON.stringify(nouvelle) });
    return nouvelle;
  });
};
const majMembre = (id, patch) =>
  majListe("ecig_membres", l => l.map(m => String(m.id) === String(id) ? { ...m, ...patch } : m));

/** Les codes ne restent jamais en mémoire dans l'application */
const sansCodes = (liste) => (liste || []).map(({ pin, ...m }) => m);

// ── Authentification Firebase des membres ─────────────────────────────────
// Identifiant technique dérivé de l'email : il ne peut pas entrer en collision
// avec les comptes d'ECIG-Finances, qui utilisent l'email réel.
// Identifiant de connexion : téléphone ou email, au choix.
// DOIT rester identique à la fonction du même nom dans ECIG-Gestion.
const normaliserIdentifiant = (brut) => {
  const s = (brut || "").trim();
  if (!s) return null;
  if (s.includes("@")) {
    const e = s.toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return null;
    return { type: "email", affichage: e, slug: e.replace(/[^a-z0-9]/g, ".") };
  }
  let d = s.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "243" + d.slice(1);
  if (d.length === 9) d = "243" + d;
  if (d.length < 10 || d.length > 15) return null;
  return { type: "tel", affichage: "+" + d, slug: "t" + d };
};
// Version de l'identifiant technique (augmente à chaque code d'activation émis).
// 0 = aucun code jamais émis pour cet identifiant.
const versionAcces = async (slug) => {
  try {
    const sn = await getDoc(doc(db, "versions_acces", slug));
    return sn.exists() ? (Number(sn.data().v) || 0) : 0;
  } catch (e) { return 0; }
};
// Dès qu'un code a été émis, l'identifiant technique porte toujours sa version :
// il ne peut jamais coïncider avec un compte plus ancien.
const emailAuthMembre = (slug, v = 0) => `${slug}${v > 0 ? ".v" + v : ""}@membres.ecig.local`;
setPersistence(auth, browserSessionPersistence).catch(() => {});
const PIN_LONGUEUR = 6;
// Succursales : liste à garder identique à celle d'ECIG-Gestion
const SUCCURSALES = { "01": "Siège — Kinshasa (Ngaliema)", "02": "Demba (Sankuru)" };
const PIN_VIDE = () => Array(PIN_LONGUEUR).fill("");

/** Champ PIN à cases */
function PinInput({ value, onChange, prefix, longueur = PIN_LONGUEUR, onEnter }) {
  const set = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const arr = [...value]; arr[i] = v; onChange(arr);
    if (v && i < longueur - 1) document.getElementById(`${prefix}-${i+1}`)?.focus();
  };
  return (
    <div className={`pin-row ${longueur > 4 ? "six" : ""}`}>
      {Array.from({ length: longueur }, (_, i) => (
        <input key={i} id={`${prefix}-${i}`} className="pin-dot" type="password" inputMode="numeric" maxLength={1}
          autoComplete="off" value={value[i] || ""} onChange={e => set(i, e.target.value)}
          onKeyDown={e => {
            if (e.key === "Backspace" && !value[i] && i > 0) document.getElementById(`${prefix}-${i-1}`)?.focus();
            if (e.key === "Enter" && onEnter) onEnter();
          }} />
      ))}
    </div>
  );
}

// Lecture d'un seul document (calendrier, annonces) : jamais de la collection entière
const loadData = async (key, def) => {
  try {
    const snap = await getDoc(doc(db, "ecig_data", key));
    return snap.exists() ? JSON.parse(snap.data().value) : def;
  } catch(e) { return def; }
};

// ============================================================
// STYLES GLOBAUX
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Nunito:wght@400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  :root {
    --green: #1B6B3A; --green-dark: #134d2b; --green-light: #e8f5ee;
    --gold: #C9972A; --gold-light: #fdf3e0; --text: #1a1a1a;
    --text-muted: #6b7280; --bg: #f7f9f7; --white: #ffffff;
    --border: #e5e7eb; --radius: 16px; --shadow: 0 2px 16px rgba(27,107,58,0.10);
  }
  body { font-family:'Nunito',sans-serif; background:var(--bg); color:var(--text); min-height:100vh; }
  .app { max-width:480px; margin:0 auto; min-height:100vh; position:relative; background:var(--white); }

  /* LOGIN */
  .login-bg { min-height:100vh; background:linear-gradient(160deg,var(--green-dark) 0%,var(--green) 60%,#2d8a52 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 24px; }
  .login-logo { width:80px; height:80px; border-radius:50%; background:var(--white); display:flex; align-items:center; justify-content:center; font-size:32px; margin-bottom:16px; box-shadow:0 4px 24px rgba(0,0,0,0.2); }
  .login-title { color:var(--white); font-family:'Playfair Display',serif; font-size:26px; text-align:center; margin-bottom:4px; }
  .login-sub { color:rgba(255,255,255,0.75); font-size:14px; text-align:center; margin-bottom:32px; }
  .login-card { background:var(--white); border-radius:24px; padding:28px 24px; width:100%; max-width:380px; box-shadow:0 8px 40px rgba(0,0,0,0.18); }
  .login-card h3 { font-size:17px; font-weight:700; color:var(--text); margin-bottom:20px; text-align:center; }
  .login-select { width:100%; padding:14px 16px; border-radius:12px; border:2px solid var(--border); font-family:'Nunito',sans-serif; font-size:15px; color:var(--text); background:var(--bg); margin-bottom:16px; outline:none; appearance:none; }
  .login-select:focus { border-color:var(--green); }
  .pin-label { font-size:13px; font-weight:600; color:var(--text-muted); margin-bottom:8px; }
  .pin-row { display:flex; gap:10px; justify-content:center; margin-bottom:20px; }
  .pin-dot { width:52px; height:52px; border-radius:12px; border:2px solid var(--border); font-size:22px; text-align:center; font-family:'Nunito',sans-serif; font-weight:700; color:var(--green); outline:none; background:var(--bg); }
  .pin-dot:focus { border-color:var(--green); background:var(--green-light); }
  .pin-row.six { gap:6px; }
  .pin-row.six .pin-dot { width:42px; height:48px; font-size:20px; }
  .btn-email { width:100%; padding:14px; border-radius:14px; border:none; background:var(--green); color:var(--white); font-family:'Nunito',sans-serif; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s; margin-bottom:12px; }
  .btn-email:hover { background:var(--green-dark); }
  .btn-email:disabled { opacity:0.5; cursor:not-allowed; }
  .email-display { font-size:12px; color:var(--text-muted); text-align:center; margin-bottom:16px; padding:8px 12px; background:#f0f4ff; border-radius:8px; border:1px solid #c7d7fb; }
  .pin-change-banner { background:#FFF3CD; border:1px solid #FFD700; border-radius:10px; padding:12px; margin-bottom:14px; font-size:13px; color:#856404; text-align:center; }
  .pin-attempts { font-size:12px; color:#C62828; text-align:center; margin-top:6px; font-weight:600; }
  .blocked-msg { background:#FFEBEE; border:1px solid #C62828; border-radius:10px; padding:14px; text-align:center; color:#C62828; font-size:13px; font-weight:600; margin-bottom:12px; }
  .step-indicator { display:flex; justify-content:center; gap:8px; margin-bottom:20px; }
  .step-dot { width:8px; height:8px; border-radius:50%; background:var(--border); }
  .step-dot.active { background:var(--green); width:24px; border-radius:4px; }
  .btn-login { width:100%; padding:15px; border-radius:14px; border:none; background:var(--green); color:var(--white); font-family:'Nunito',sans-serif; font-size:16px; font-weight:700; cursor:pointer; transition:all 0.2s; }
  .btn-login:hover { background:var(--green-dark); }
  .btn-login:disabled { opacity:0.5; cursor:not-allowed; }
  .error-msg { background:#fee2e2; color:#b91c1c; border-radius:10px; padding:10px 14px; font-size:13px; text-align:center; margin-top:12px; }
  .pin-hint { font-size:12px; color:var(--text-muted); text-align:center; margin-top:8px; }

  /* TOP BAR */
  .topbar { background:var(--green); padding:16px 20px 14px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; }
  .topbar-logo { display:flex; align-items:center; gap:10px; }
  .topbar-icon { width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:16px; }
  .topbar-name { color:var(--white); font-weight:700; font-size:15px; }
  .topbar-role { color:rgba(255,255,255,0.75); font-size:12px; }
  .topbar-logout { background:rgba(255,255,255,0.15); border:none; color:var(--white); padding:8px 14px; border-radius:20px; font-size:13px; cursor:pointer; font-family:'Nunito',sans-serif; }

  /* BOTTOM NAV */
  .bottom-nav { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; background:var(--white); border-top:1px solid var(--border); display:flex; z-index:100; padding-bottom:env(safe-area-inset-bottom); box-shadow:0 -2px 16px rgba(0,0,0,0.08); }
  .nav-item { flex:1; display:flex; flex-direction:column; align-items:center; padding:10px 4px 8px; cursor:pointer; border:none; background:none; gap:3px; }
  .nav-icon { font-size:20px; line-height:1; }
  .nav-label { font-size:9px; font-weight:600; color:var(--text-muted); font-family:'Nunito',sans-serif; }
  .nav-item.active .nav-label { color:var(--green); }

  /* CONTENT */
  .content { padding:20px 16px 100px; }
  .page-title { font-family:'Playfair Display',serif; font-size:22px; color:var(--green-dark); margin-bottom:4px; }
  .page-sub { font-size:13px; color:var(--text-muted); margin-bottom:20px; }

  /* HERO */
  .hero { background:linear-gradient(135deg,var(--green) 0%,#2d8a52 100%); border-radius:20px; padding:24px; color:var(--white); margin-bottom:20px; position:relative; overflow:hidden; }
  .hero::before { content:'✝'; position:absolute; right:20px; top:50%; transform:translateY(-50%); font-size:80px; opacity:0.08; }
  .hero-greeting { font-size:14px; opacity:0.85; margin-bottom:4px; }
  .hero-name { font-family:'Playfair Display',serif; font-size:24px; font-weight:700; margin-bottom:4px; }
  .hero-theme { font-size:12px; opacity:0.8; font-style:italic; }
  .hero-verse { margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.2); font-size:12px; opacity:0.9; line-height:1.5; }

  /* CARDS */
  .card { background:var(--white); border-radius:var(--radius); padding:16px; margin-bottom:14px; border:1px solid var(--border); box-shadow:var(--shadow); }
  .card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .card-title { font-weight:700; font-size:15px; color:var(--text); }
  .section-title { font-weight:700; font-size:16px; color:var(--text); margin-bottom:12px; display:flex; align-items:center; gap:8px; }

  /* STATS */
  .stats-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px; }
  .stat-card { background:var(--white); border-radius:14px; padding:14px 10px; text-align:center; border:1px solid var(--border); }
  .stat-amount { font-weight:800; font-size:16px; color:var(--green); line-height:1.2; }
  .stat-devise { font-size:10px; font-weight:700; color:var(--gold); background:var(--gold-light); padding:2px 6px; border-radius:20px; margin-top:4px; display:inline-block; }

  /* LIST */
  .list-item { padding:14px 0; border-bottom:1px solid var(--border); display:flex; align-items:flex-start; gap:12px; }
  .list-item:last-child { border-bottom:none; }
  .list-bullet { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
  .list-bullet.green { background:var(--green-light); }
  .list-bullet.gold { background:var(--gold-light); }
  .list-body { flex:1; }
  .list-title { font-weight:600; font-size:14px; color:var(--text); margin-bottom:2px; }
  .list-desc { font-size:13px; color:var(--text-muted); line-height:1.4; }
  .list-date { font-size:11px; color:var(--gold); font-weight:600; margin-top:4px; }
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
  .badge-green { background:var(--green-light); color:var(--green); }
  .badge-gold { background:var(--gold-light); color:var(--gold); }
  .badge-blue { background:#dbeafe; color:#1d4ed8; }
  .badge-red { background:#fee2e2; color:#b91c1c; }

  /* PROFILE */
  .profile-avatar { width:72px; height:72px; border-radius:50%; background:var(--green); color:var(--white); font-family:'Playfair Display',serif; font-size:26px; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; }
  .profile-name { text-align:center; font-family:'Playfair Display',serif; font-size:20px; color:var(--green-dark); }
  .profile-role { text-align:center; font-size:13px; color:var(--text-muted); margin-bottom:20px; }
  .form-group { margin-bottom:14px; }
  .form-label { font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
  .form-input { width:100%; padding:12px 14px; border-radius:12px; border:2px solid var(--border); font-family:'Nunito',sans-serif; font-size:14px; color:var(--text); outline:none; background:var(--bg); }
  .form-input:focus { border-color:var(--green); background:var(--white); }
  .btn-save { width:100%; padding:14px; border-radius:14px; border:none; background:var(--green); color:var(--white); font-family:'Nunito',sans-serif; font-size:15px; font-weight:700; cursor:pointer; margin-top:8px; }
  .success-msg { background:#dcfce7; color:#166534; border-radius:10px; padding:10px 14px; font-size:13px; text-align:center; margin-top:12px; }

  /* FAMILLE */
  .famille-header { background:linear-gradient(135deg,#134d2b,var(--green)); border-radius:18px; padding:20px; margin-bottom:16px; color:var(--white); }
  .famille-name { font-family:'Playfair Display',serif; font-size:20px; margin-bottom:4px; }
  .famille-adresse { font-size:13px; opacity:0.85; display:flex; align-items:center; gap:6px; }
  .membre-card { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--border); }
  .membre-card:last-child { border-bottom:none; }
  .membre-avatar { width:42px; height:42px; border-radius:50%; background:var(--green); color:var(--white); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0; }
  .membre-avatar.gold { background:var(--gold); }
  .membre-info { flex:1; }
  .membre-nom { font-weight:700; font-size:14px; color:var(--text); }
  .membre-role { font-size:12px; color:var(--text-muted); }
  .chef-badge { background:var(--gold-light); color:var(--gold); font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; }
  .btn-small { padding:8px 14px; border-radius:10px; border:none; font-family:'Nunito',sans-serif; font-size:13px; font-weight:700; cursor:pointer; }
  .btn-edit { background:var(--green-light); color:var(--green); }
  .btn-danger { background:#fee2e2; color:#b91c1c; }

  /* MODAL */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:200; display:flex; align-items:flex-end; }
  .modal-box { background:var(--white); border-radius:24px 24px 0 0; padding:24px; width:100%; max-width:480px; margin:0 auto; max-height:85vh; overflow-y:auto; }
  .modal-title { font-family:'Playfair Display',serif; font-size:18px; color:var(--green-dark); margin-bottom:20px; }

  /* LOADING */
  .loading { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; gap:16px; }
  .spinner { width:40px; height:40px; border:3px solid var(--green-light); border-top-color:var(--green); border-radius:50%; animation:spin 0.8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .empty { text-align:center; padding:40px 20px; color:var(--text-muted); }
  .empty-icon { font-size:40px; margin-bottom:12px; }

  /* PIN SECTION */
  .pin-section { background:var(--gold-light); border-radius:14px; padding:16px; margin-top:16px; }
  .pin-section-title { font-weight:700; font-size:14px; color:var(--gold); margin-bottom:10px; }

  /* ENSEIGNEMENT STATUT COULEURS */
  .ens-icon-en-cours  { background:#dbeafe; }
  .ens-icon-termine   { background:#dcfce7; }
  .ens-icon-abandonne { background:#fee2e2; }
  .ens-badge-en-cours  { background:#dbeafe; color:#1d4ed8; }
  .ens-badge-termine   { background:#dcfce7; color:#166534; }
  .ens-badge-abandonne { background:#fee2e2; color:#b91c1c; }
`;

// ============================================================
// COMPOSANTS DE BASE
// ============================================================
function Spinner() {
  return <div className="loading"><div className="spinner"/><p style={{fontSize:'14px',color:'var(--text-muted)'}}>Chargement...</p></div>;
}

function TopBar({ membre, onLogout }) {
  return (
    <div className="topbar">
      <div className="topbar-logo">
        <div className="topbar-icon" style={{padding:'2px'}}>
          <img src="/LogoECIGy.jpg" style={{width:'28px',height:'28px',objectFit:'contain',borderRadius:'50%'}} />
        </div>
        <div>
          <div className="topbar-name">MEMBRES - ECIG</div>
          <div className="topbar-role">Espace Membre</div>
        </div>
      </div>
      <button className="topbar-logout" onClick={onLogout}>✕ Quitter</button>
    </div>
  );
}

function BottomNav({ screen, setScreen }) {
  const tabs = [
    { id:"home", icon:"🏠", label:"Accueil" },
    { id:"famille", icon:"👨‍👩‍👧‍👦", label:"Famille" },
    { id:"calendrier", icon:"📅", label:"Agenda" },
    { id:"annonces", icon:"📢", label:"Annonces" },
    { id:"enseignements", icon:"📖", label:"Enseign." },
    { id:"profil", icon:"👤", label:"Profil" },
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <button key={t.id} className={`nav-item ${screen===t.id?"active":""}`} onClick={()=>setScreen(t.id)}>
          <span className="nav-icon" style={{fontSize:'18px'}}>{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ============================================================
// ÉCRAN: ACCUEIL
// ============================================================
function HomeScreen({ membre, cotisations, theme }) {
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  const myCotis = cotisations.filter(c => c.membreId == membre.id);
  const totalCDF = myCotis.filter(c=>!c.devise||c.devise==="CDF").reduce((s,c)=>s+(Number(c.montant)||0),0);
  const totalUSD = myCotis.filter(c=>c.devise==="USD").reduce((s,c)=>s+(Number(c.montant)||0),0);
  const totalEUR = myCotis.filter(c=>c.devise==="EUR").reduce((s,c)=>s+(Number(c.montant)||0),0);
  return (
    <div className="content">
      <div className="hero">
        <div className="hero-greeting">{greeting} 🙏</div>
        <div className="hero-name">{membre.prenom} {membre.nom}</div>
        {theme?.titre && <div className="hero-theme">✝ Thème {theme.annee} : {theme.titre}</div>}
        {theme?.verset && <div className="hero-verse">« {theme.verset} »{theme.reference ? ` — ${theme.reference}` : ""}</div>}
      </div>
      <div className="section-title">💰 Mes cotisations totales</div>
      <div className="stats-row">
        <div className="stat-card"><div className="stat-amount">{totalCDF.toLocaleString()}</div><div className="stat-devise">CDF</div><div style={{fontSize:'11px',color:'var(--text-muted)'}}>Francs</div></div>
        <div className="stat-card"><div className="stat-amount">{totalUSD.toLocaleString()}</div><div className="stat-devise">USD</div><div style={{fontSize:'11px',color:'var(--text-muted)'}}>Dollars</div></div>
        <div className="stat-card"><div className="stat-amount">{totalEUR.toLocaleString()}</div><div className="stat-devise">EUR</div><div style={{fontSize:'11px',color:'var(--text-muted)'}}>Euros</div></div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Mes infos</span><span>👤</span></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
          <div><div className="form-label">Rôle</div><div style={{fontSize:'14px',fontWeight:'600'}}>{membre.role||membre.fonction||"—"}</div></div>
          <div><div className="form-label">Département</div><div style={{fontSize:'14px',fontWeight:'600'}}>{membre.departement||"—"}</div></div>
          <div><div className="form-label">Statut</div><span className="badge badge-green">{membre.statut||"Actif"}</span></div>
          <div><div className="form-label">Famille</div><div style={{fontSize:'14px',fontWeight:'600'}}>{membre.famille||"—"}</div></div>
          <div><div className="form-label">Succursale</div><div style={{fontSize:'14px',fontWeight:'600'}}>{SUCCURSALES[membre.succursale]||"—"}</div></div>
          <div><div className="form-label">N° de membre</div>
            {membre.matricule
              ? <div style={{fontSize:'16px',fontWeight:'800',fontFamily:'monospace',color:'var(--green)',letterSpacing:'1px'}}>{membre.matricule}</div>
              : <div style={{fontSize:'13px',color:'var(--text-muted)',fontStyle:'italic'}}>En attente</div>}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ÉCRAN: FAMILLE
// ============================================================
function FamilleScreen({ membre, membres, familles, setFamilles, setMembres }) {
  const maFamille = familles.find(f => f.id == membre.familleId);
  const isChef = maFamille && (maFamille.chefId == membre.id || String(maFamille.chefId) === String(membre.id));
  const membresFamille = membres.filter(m => m.familleId == (maFamille?.id));
  
  const [editAdresse, setEditAdresse] = useState(false);
  const [adresse, setAdresse] = useState(maFamille?.adresse||"");
  const [savedAdresse, setSavedAdresse] = useState(false);
  const [showAddMembre, setShowAddMembre] = useState(false);
  const [editMembreId, setEditMembreId] = useState(null);
  const [formMembre, setFormMembre] = useState({ prenom:"", nom:"", genre:"Masculin", telephone:"", dateNaissance:"", statut:"actif", departement:"", fonction:"", baptise:false });
  const [savedMembre, setSavedMembre] = useState(false);

  if (!maFamille) return (
    <div className="content">
      <div className="page-title">👨‍👩‍👧‍👦 Ma Famille</div>
      <div className="empty"><div className="empty-icon">🏠</div><p>Vous n'êtes rattaché à aucune famille.<br/>Contactez l'administration.</p></div>
    </div>
  );

  const handleSaveAdresse = async () => {
    try { await updateDoc(doc(db, "familles", String(maFamille.id)), { adresse }); }
    catch (e) { alert("Modification refusée : " + (e.code || e.message)); return; }
    setFamilles(familles.map(f => f.id==maFamille.id ? {...f, adresse} : f));
    setSavedAdresse(true);
    setEditAdresse(false);
    setTimeout(()=>setSavedAdresse(false),3000);
  };

  const handleSaveMembre = async () => {
    if (!formMembre.prenom||!formMembre.nom) { alert("Prénom et nom requis"); return; }
    // Le chef de famille ne modifie que l'état civil et les coordonnées
    const base = { prenom: formMembre.prenom, nom: formMembre.nom, genre: formMembre.genre,
                   telephone: formMembre.telephone || "", dateNaissance: formMembre.dateNaissance || "", adresse: formMembre.adresse || "" };
    try {
      if (editMembreId) {
        await updateDoc(doc(db, "membres", String(editMembreId)), base);
        setMembres(membres.map(m => String(m.id) === String(editMembreId) ? { ...m, ...base } : m));
      } else {
        const id = String(Date.now());
        const newM = { ...base, id, familleId: String(maFamille.id), famille: maFamille.nom, statut: "actif",
                       authActive: false, dateAdhesion: new Date().toISOString().split("T")[0] };
        await setDoc(doc(db, "membres", id), newM);
        setMembres([...membres, newM]);
      }
    } catch (e) { alert("Enregistrement refusé : " + (e.code || e.message)); return; }
    setShowAddMembre(false);
    setEditMembreId(null);
    setSavedMembre(true);
    setTimeout(()=>setSavedMembre(false),3000);
  };

  const openEditMembre = (m) => {
    setFormMembre({ prenom:m.prenom||"", nom:m.nom||"", genre:m.genre||"Masculin", telephone:m.telephone||"", dateNaissance:m.dateNaissance||"", statut:m.statut||"actif", departement:m.departement||"", fonction:m.fonction||"", baptise:m.baptise||false });
    setEditMembreId(m.id);
    setShowAddMembre(true);
  };

  const sf = (k,v) => setFormMembre(f=>({...f,[k]:v}));

  return (
    <div className="content">
      <div className="page-title">👨‍👩‍👧‍👦 Ma Famille</div>

      <div className="famille-header">
        <div className="famille-name">🏠 {maFamille.nom}</div>
        <div className="famille-adresse">📍 {maFamille.adresse||"Adresse non renseignée"}</div>
        {isChef && <span style={{marginTop:'8px',display:'inline-block',background:'rgba(255,255,255,0.2)',padding:'4px 12px',borderRadius:'20px',fontSize:'12px'}}>⭐ Chef de famille</span>}
      </div>

      {savedAdresse && <div className="success-msg">✅ Adresse mise à jour !</div>}
      {savedMembre && <div className="success-msg">✅ Membre sauvegardé !</div>}

      {isChef && (
        <div className="card" style={{background:'var(--green-light)',border:'1px solid rgba(27,107,58,0.2)'}}>
          <div className="card-header">
            <span className="card-title" style={{color:'var(--green)'}}>📍 Adresse de la famille</span>
            {!editAdresse && <button className="btn-small btn-edit" onClick={()=>{setEditAdresse(true);setAdresse(maFamille.adresse||"");}}>✏️ Modifier</button>}
          </div>
          {editAdresse ? (
            <>
              <input className="form-input" value={adresse} onChange={e=>setAdresse(e.target.value)} placeholder="Ex: N°7 Av. Makelele, Ngaliema, Kinshasa" />
              <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
                <button className="btn-small" style={{background:'var(--border)',color:'var(--text)',flex:1}} onClick={()=>setEditAdresse(false)}>Annuler</button>
                <button className="btn-small btn-edit" style={{flex:2,padding:'10px'}} onClick={handleSaveAdresse}>💾 Enregistrer</button>
              </div>
            </>
          ) : (
            <p style={{fontSize:'14px',color:'var(--green-dark)'}}>{maFamille.adresse||"Non renseignée"}</p>
          )}
        </div>
      )}

      <div className="section-title">👥 Membres ({membresFamille.length})</div>
      <div className="card">
        {membresFamille.length === 0 ? (
          <div className="empty"><div className="empty-icon">👥</div><p style={{fontSize:'13px'}}>Aucun membre dans cette famille</p></div>
        ) : membresFamille.map((m,i) => {
          const initials = (m.prenom?.[0]||"")+(m.nom?.[0]||"");
          const estChef = maFamille.chefId == m.id || String(maFamille.chefId) === String(m.id);
          return (
            <div className="membre-card" key={m.id}>
              <div className={`membre-avatar ${estChef?"gold":""}`}>{initials}</div>
              <div className="membre-info">
                <div className="membre-nom">{m.prenom} {m.nom} {estChef && <span className="chef-badge">⭐ Chef</span>}</div>
                <div className="membre-role">{m.fonction||m.role||m.departement||"Membre"}</div>
              </div>
              {isChef && m.id !== membre.id && (
                <button className="btn-small btn-edit" onClick={()=>openEditMembre(m)}>✏️</button>
              )}
            </div>
          );
        })}
      </div>

      {isChef && (
        <button className="btn-save" onClick={()=>{setFormMembre({prenom:"",nom:"",genre:"Masculin",telephone:"",dateNaissance:"",statut:"actif",departement:"",fonction:"",baptise:false});setEditMembreId(null);setShowAddMembre(true);}}>
          ➕ Ajouter un membre de famille
        </button>
      )}

      {showAddMembre && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddMembre(false)}>
          <div className="modal-box">
            <div className="modal-title">{editMembreId ? "✏️ Modifier le membre" : "➕ Nouveau membre"}</div>
            <div style={{background:'var(--gold-light)',border:'1px solid rgba(201,151,42,0.2)',borderRadius:'12px',padding:'10px 12px',marginBottom:'16px',fontSize:'12px',color:'var(--gold)'}}>
              ℹ️ Département, rôle et baptême sont gérés par l'administration.
            </div>
            <div className="form-group">
              <div className="form-label">Prénom *</div>
              <input className="form-input" value={formMembre.prenom} onChange={e=>sf("prenom",e.target.value)} placeholder="Prénom..." />
            </div>
            <div className="form-group">
              <div className="form-label">Nom *</div>
              <input className="form-input" value={formMembre.nom} onChange={e=>sf("nom",e.target.value)} placeholder="Nom..." />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div className="form-group">
                <div className="form-label">Genre</div>
                <select className="form-input" value={formMembre.genre} onChange={e=>sf("genre",e.target.value)}>
                  <option>Masculin</option><option>Féminin</option>
                </select>
              </div>
              <div className="form-group">
                <div className="form-label">Téléphone</div>
                <input className="form-input" value={formMembre.telephone} onChange={e=>sf("telephone",e.target.value)} placeholder="+243..." />
              </div>
            </div>
            <div className="form-group">
              <div className="form-label">Date de naissance</div>
              <input className="form-input" type="date" value={formMembre.dateNaissance} onChange={e=>sf("dateNaissance",e.target.value)} />
            </div>
            <div className="form-group">
              <div className="form-label">Adresse</div>
              <input className="form-input" value={formMembre.adresse||""} onChange={e=>sf("adresse",e.target.value)} placeholder="Ex: Ngaliema, Kinshasa..." />
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button className="btn-small" style={{flex:1,padding:'14px',background:'var(--border)',color:'var(--text)',borderRadius:'14px'}} onClick={()=>setShowAddMembre(false)}>Annuler</button>
              <button className="btn-save" style={{flex:2,margin:0}} onClick={handleSaveMembre}>💾 Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ÉCRAN: CALENDRIER
// ============================================================
function CalendrierScreen({ calendrier }) {
  const today = new Date().toISOString().split("T")[0];
  const upcoming = [...calendrier].sort((a,b)=>new Date(a.date)-new Date(b.date)).filter(e=>e.date>=today);
  const past = [...calendrier].sort((a,b)=>new Date(b.date)-new Date(a.date)).filter(e=>e.date<today).slice(0,5);
  return (
    <div className="content">
      <div className="page-title">📅 Calendrier</div>
      <div className="page-sub">Programme des activités ECIG</div>
      <div className="section-title">🔜 À venir</div>
      <div className="card">
        {upcoming.length===0 ? <div className="empty"><div className="empty-icon">📅</div><p>Aucun événement à venir</p></div>
        : upcoming.map((e,i)=>(
          <div className="list-item" key={i}>
            <div className="list-bullet gold">📅</div>
            <div className="list-body">
              <div className="list-title">{e.titre}</div>
              <div className="list-desc">{e.description||e.lieu||""}</div>
              <div className="list-date">{new Date(e.date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} {e.heure?`• ${e.heure}`:""}</div>
            </div>
          </div>
        ))}
      </div>
      {past.length>0 && <>
        <div className="section-title">✅ Passés</div>
        <div className="card">
          {past.map((e,i)=>(
            <div className="list-item" key={i} style={{opacity:0.6}}>
              <div className="list-bullet green">✅</div>
              <div className="list-body">
                <div className="list-title">{e.titre}</div>
                <div className="list-date">{new Date(e.date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
              </div>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

// ============================================================
// ÉCRAN: ENSEIGNEMENTS
// ============================================================

// Retourne les classes CSS et le label selon le statut
function getStatutStyle(statut) {
  const s = (statut||"").toLowerCase();
  if (s === "en cours")   return { iconClass: "ens-icon-en-cours",  badgeClass: "ens-badge-en-cours",  label: "En cours" };
  if (s === "terminé" || s === "termine")
                          return { iconClass: "ens-icon-termine",   badgeClass: "ens-badge-termine",   label: "Terminé" };
  if (s === "abandonné" || s === "abandonne")
                          return { iconClass: "ens-icon-abandonne", badgeClass: "ens-badge-abandonne", label: "Abandonné" };
  // Valeur par défaut : bleu (en cours)
  return { iconClass: "ens-icon-en-cours", badgeClass: "ens-badge-en-cours", label: statut||"En cours" };
}

function EnseignementsScreen({ membre, enseignements }) {
  const [selected, setSelected] = useState(null);

  // Filtrer uniquement les enseignements du membre connecté
  const mesEnseignements = enseignements.filter(e =>
    String(e.membreId) === String(membre.id)
  );

  if (selected) {
    const { iconClass, badgeClass, label } = getStatutStyle(selected.statut);
    return (
      <div className="content">
        <button
          onClick={()=>setSelected(null)}
          style={{background:'none',border:'none',color:'var(--green)',fontFamily:'Nunito,sans-serif',fontWeight:'700',fontSize:'14px',cursor:'pointer',marginBottom:'16px',display:'flex',alignItems:'center',gap:'6px'}}
        >
          ← Retour
        </button>

        {/* En-tête module */}
        <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px'}}>
          <div className={`list-bullet ${iconClass}`} style={{width:'52px',height:'52px',borderRadius:'14px',fontSize:'22px',flexShrink:0}}>📖</div>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:'18px',color:'var(--green-dark)',fontWeight:'700',lineHeight:'1.3'}}>
              {selected.niveau||selected.module||"Enseignement"}
            </div>
            <span className={`badge ${badgeClass}`} style={{marginTop:'4px',display:'inline-block'}}>
              {label}
            </span>
          </div>
        </div>

        {/* Dates */}
        {(selected.dateDebut||selected.dateFin) && (
          <div className="card" style={{padding:'12px 16px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              {selected.dateDebut && (
                <div>
                  <div className="form-label">Début</div>
                  <div style={{fontSize:'14px',fontWeight:'600'}}>{selected.dateDebut}</div>
                </div>
              )}
              {selected.dateFin && (
                <div>
                  <div className="form-label">Fin prévue</div>
                  <div style={{fontSize:'14px',fontWeight:'600'}}>{selected.dateFin}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {selected.notes && (
          <div className="card">
            <div className="section-title" style={{marginBottom:'8px'}}>📝 Notes</div>
            <div style={{fontSize:'14px',lineHeight:'1.7',color:'var(--text)',whiteSpace:'pre-wrap'}}>{selected.notes}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-title">📖 Enseignements</div>
      <div className="page-sub">Suivi de ma formation biblique</div>

      {/* Légende des couleurs */}
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
        <span className="badge ens-badge-en-cours">● En cours</span>
        <span className="badge ens-badge-termine">● Terminé</span>
        <span className="badge ens-badge-abandonne">● Abandonné</span>
      </div>

      <div className="card">
        {mesEnseignements.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📖</div>
            <p>Aucun enseignement enregistré pour vous.</p>
          </div>
        ) : (
          mesEnseignements.map((e, i) => {
            const { iconClass, badgeClass, label } = getStatutStyle(e.statut);
            return (
              <div
                className="list-item"
                key={i}
                onClick={()=>setSelected(e)}
                style={{cursor:'pointer'}}
              >
                {/* Icône Bible avec couleur selon statut */}
                <div className={`list-bullet ${iconClass}`} style={{width:'44px',height:'44px',borderRadius:'12px',fontSize:'20px',flexShrink:0}}>
                  📖
                </div>

                <div className="list-body">
                  {/* Niveau / Module bien visible */}
                  <div className="list-title" style={{fontSize:'15px'}}>
                    {e.niveau||e.module||"Module non défini"}
                  </div>
                  {/* Badge statut */}
                  <span className={`badge ${badgeClass}`} style={{marginTop:'4px',display:'inline-block'}}>
                    {label}
                  </span>
                  {/* Dates si disponibles */}
                  {e.dateDebut && (
                    <div className="list-date" style={{marginTop:'4px'}}>
                      Début : {e.dateDebut}{e.dateFin ? ` • Fin : ${e.dateFin}` : ""}
                    </div>
                  )}
                </div>

                <div style={{color:'var(--text-muted)',fontSize:'18px',alignSelf:'center'}}>›</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// ÉCRAN: ANNONCES
// ============================================================
function AnnoncesScreen({ annonces }) {
  return (
    <div className="content">
      <div className="page-title">📢 Annonces</div>
      <div className="page-sub">Informations de l'église</div>
      <div className="card">
        {annonces.length===0 ? <div className="empty"><div className="empty-icon">📢</div><p>Aucune annonce pour l'instant</p></div>
        : [...annonces].reverse().map((a,i)=>(
          <div className="list-item" key={i}>
            <div className="list-bullet gold">📢</div>
            <div className="list-body">
              <div className="list-title">{a.titre||a.sujet}</div>
              <div className="list-desc">{a.contenu||a.message||a.description||""}</div>
              {a.date && <div className="list-date">{a.date}</div>}
              {a.urgent && <span className="badge badge-gold" style={{marginTop:'6px'}}>⚡ Urgent</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ÉCRAN: PROFIL
// ============================================================
function ProfilScreen({ membre, membres, setMembres }) {
  const [form, setForm] = useState({...membre});
  const [saved, setSaved] = useState(false);
  const [ancien, setAncien] = useState(PIN_VIDE());
  const [nouveau, setNouveau] = useState(PIN_VIDE());
  const [confirm, setConfirm] = useState(PIN_VIDE());
  const [pinMsg, setPinMsg] = useState("");
  const [enCours, setEnCours] = useState(false);
  const initials = (membre.prenom?.[0] || "") + (membre.nom?.[0] || "");

  const handleSave = async () => {
    const { telephone, adresse } = form;
    try { await updateDoc(doc(db, "membres", String(membre.id)), { telephone: telephone || "", adresse: adresse || "" }); }
    catch (e) { alert("Modification refusée : " + (e.code || e.message)); return; }
    setMembres(membres.map(m => String(m.id) === String(membre.id) ? { ...m, telephone: telephone || "", adresse: adresse || "" } : m));
    setSaved(true);
    setTimeout(()=>setSaved(false),3000);
  };

  const handlePinChange = async () => {
    const a = ancien.join(""), n = nouveau.join(""), c = confirm.join("");
    if (n.length !== PIN_LONGUEUR) { setPinMsg(`❌ Le nouveau PIN doit avoir ${PIN_LONGUEUR} chiffres`); return; }
    if (/^(\d)\1+$/.test(n) || n === "123456") { setPinMsg("❌ PIN trop simple, choisissez-en un autre"); return; }
    if (n !== c) { setPinMsg("❌ Les PINs ne correspondent pas"); return; }
    setEnCours(true); setPinMsg("");
    try {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, a));
      await updatePassword(u, n);
      setPinMsg("✅ PIN modifié avec succès !");
      setAncien(PIN_VIDE()); setNouveau(PIN_VIDE()); setConfirm(PIN_VIDE());
    } catch (e) {
      setPinMsg(e?.code?.includes("credential") || e?.code?.includes("wrong-password") ? "❌ Ancien PIN incorrect" : "❌ " + (e?.code || e?.message));
    }
    setEnCours(false);
    setTimeout(()=>setPinMsg(""),4000);
  };

  return (
    <div className="content">
      <div className="profile-avatar">{initials}</div>
      <div className="profile-name">{membre.prenom} {membre.nom}</div>
      <div className="profile-role">{membre.role||membre.fonction||""} • {membre.departement||""}</div>
      {membre.matricule && (
        <div style={{textAlign:'center',marginTop:'-12px',marginBottom:'20px'}}>
          <span style={{fontFamily:'monospace',fontSize:'15px',fontWeight:800,color:'var(--green)',background:'var(--green-light)',
            borderRadius:'8px',padding:'4px 12px',letterSpacing:'1px'}}>N° {membre.matricule}</span>
        </div>
      )}
      <div className="card">
        <div className="section-title">✏️ Modifier mon profil</div>
        <div className="form-group"><div className="form-label">Téléphone</div><input className="form-input" value={form.telephone||""} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="+243..." /></div>
        <div className="form-group"><div className="form-label">Identifiant de connexion</div>
          <input className="form-input" value={membre.identifiantAffiche||""} disabled style={{background:'#F3F4F6',color:'#6B7280'}} />
          <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'4px'}}>Pour le changer, adressez-vous au secrétariat.</div>
        </div>
        <div className="form-group"><div className="form-label">Adresse</div><input className="form-input" value={form.adresse||""} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="Adresse..." /></div>
        <button className="btn-save" onClick={handleSave}>💾 Enregistrer</button>
        {saved && <div className="success-msg">✅ Profil mis à jour !</div>}
      </div>
      <div className="pin-section">
        <div className="pin-section-title">🔐 Changer mon PIN</div>
        <div className="pin-label">PIN actuel</div>
        <PinInput value={ancien} onChange={setAncien} prefix="pa" />
        <div className="pin-label">Nouveau PIN ({PIN_LONGUEUR} chiffres)</div>
        <PinInput value={nouveau} onChange={setNouveau} prefix="pn" />
        <div className="pin-label">Confirmer</div>
        <PinInput value={confirm} onChange={setConfirm} prefix="pc" />
        <button className="btn-save" style={{background:'var(--gold)'}} onClick={handlePinChange} disabled={enCours}>{enCours ? "…" : "🔐 Changer le PIN"}</button>
        {pinMsg && <div className={pinMsg.startsWith("✅")?"success-msg":"error-msg"}>{pinMsg}</div>}
      </div>
    </div>
  );
}

// ============================================================
// APP PRINCIPALE
// ============================================================
export default function App() {
  const [screen, setScreen] = useState("login");
  // ident | pin | code | nouveau
  const [loginStep, setLoginStep] = useState("ident");
  const [saisieIdent, setSaisieIdent] = useState("");
  const [ident, setIdent] = useState(null);           // identifiant normalisé
  const [loading, setLoading] = useState(false);
  const [membre, setMembre] = useState(null);
  const [pin, setPin] = useState(PIN_VIDE());
  const [code, setCode] = useState(PIN_VIDE());
  const [codeValide, setCodeValide] = useState(null);  // { id, membreId }
  const [newPin, setNewPin] = useState(PIN_VIDE());
  const [newPin2, setNewPin2] = useState(PIN_VIDE());
  const [error, setError] = useState("");
  const [tentatives, setTentatives] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [membres, setMembres] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [cotisations, setCotisations] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [calendrier, setCalendrier] = useState([]);
  const [enseignements, setEnseignements] = useState([]);
  const [demarrage, setDemarrage] = useState(true);
  const [theme, setTheme] = useState(null);

  const screenRef = useRef("login");
  useEffect(() => { screenRef.current = screen; }, [screen]);

  const resetLogin = () => {
    setMembre(null); setScreen("login"); setLoginStep("ident"); setSaisieIdent(""); setIdent(null);
    setPin(PIN_VIDE()); setCode(PIN_VIDE()); setCodeValide(null); setNewPin(PIN_VIDE()); setNewPin2(PIN_VIDE());
    setError(""); setTentatives(0); setBlockedUntil(null);
  };
  const bloque = () => blockedUntil && new Date() < blockedUntil;
  const echec = (msg) => {
    const t = tentatives + 1; setTentatives(t);
    if (t >= 3) { setBlockedUntil(new Date(Date.now() + 5*60*1000)); setError("⛔ 3 tentatives échouées. Réessayez dans 5 minutes."); }
    else setError(`${msg} ${3 - t} tentative(s) restante(s).`);
  };

  /** Ouvre l'espace du membre : sa fiche, sa famille, ses contributions */
  const ouvrirEspace = async (membreId) => {
    setLoading(true);
    try {
      const fiche = await getDoc(doc(db, "membres", String(membreId)));
      if (!fiche.exists()) throw new Error("fiche");
      const moi = { ...fiche.data(), id: fiche.id };
      let fam = [], proches = [moi];
      if (moi.familleId) {
        const [sf, sp] = await Promise.all([
          getDoc(doc(db, "familles", String(moi.familleId))).catch(() => null),
          getDocs(query(collection(db, "membres"), where("familleId", "==", String(moi.familleId)))).catch(() => null),
        ]);
        if (sf?.exists()) fam = [{ ...sf.data(), id: sf.id }];
        if (sp) proches = sp.docs.map(d => ({ ...d.data(), id: d.id }));
        if (!proches.some(p => p.id === moi.id)) proches.push(moi);
      }
      let contribs = [];
      try {
        const sc = await getDocs(query(collection(db, "contributions"), where("membreId", "==", String(membreId))));
        contribs = sc.docs.map(d => ({ id: d.id, ...d.data(), montant: Number(d.data().montant) || 0 }));
      } catch (e) { console.warn("Contributions :", e?.code); }
      const [anno, cal, sens] = await Promise.all([
        loadData("ecig_annonces", []), loadData("ecig_activites", []),
        getDocs(query(collection(db, "enseignements"), where("membreId", "==", String(membreId)))).catch(() => ({ docs: [] })),
      ]);
      const ens = sens.docs.map(d => ({ ...d.data(), id: d.id }));
      try { const st = await getDoc(doc(db, "parametres_publics", "theme")); setTheme(st.exists() ? st.data() : null); } catch (e) {}
      setMembres(proches); setFamilles(fam); setCotisations(contribs);
      setAnnonces(anno); setCalendrier(cal); setEnseignements(ens);
      setMembre(moi);
      try { sessionStorage.setItem("ecig_alive", "1"); } catch(e) {}
      setLoading(false); setScreen("home");
      return true;
    } catch (e) {
      console.error(e);
      setLoading(false);
      await signOut(auth).catch(()=>{});
      resetLogin();
      setError("Fiche membre introuvable. Contactez le secrétariat.");
      return false;
    }
  };

  const membreIdDuCompte = async (uid) => {
    const sn = await getDoc(doc(db, "profils_membres", uid));
    return sn.exists() ? sn.data().membreId : null;
  };

  // Restauration d'une session encore valide (même onglet)
  useEffect(() => {
    let premier = true;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!premier) return;
      premier = false;
      try {
        const alive = sessionStorage.getItem("ecig_alive");
        if (u && alive && u.email?.endsWith("@membres.ecig.local")) {
          const mid = await membreIdDuCompte(u.uid);
          if (mid && await ouvrirEspace(mid)) { setDemarrage(false); return; }
        }
        if (u && !alive) await signOut(auth).catch(()=>{});
      } catch(e) {}
      setDemarrage(false);
    });
    return () => unsub();
  }, []);

  // ── Étape 1 : téléphone ou email ──
  const validerIdent = (suite) => {
    const n = normaliserIdentifiant(saisieIdent);
    if (!n) { setError("Saisissez votre numéro de téléphone (ex. 0812345678) ou votre adresse email."); return; }
    setIdent(n); setError(""); setTentatives(0);
    setPin(PIN_VIDE()); setCode(PIN_VIDE());
    setLoginStep(suite);
  };

  // ── Connexion avec le PIN ──
  const handleLogin = async () => {
    if (bloque()) { setError("Trop de tentatives. Réessayez dans quelques minutes."); return; }
    const p = pin.join(""); if (p.length !== PIN_LONGUEUR) return;
    setLoading(true); setError("");
    try {
      try { sessionStorage.setItem("ecig_alive", "1"); } catch(e) {}
      const v = await versionAcces(ident.slug);
      const cred = await signInWithEmailAndPassword(auth, emailAuthMembre(ident.slug, v), p);
      const mid = await membreIdDuCompte(cred.user.uid);
      if (!mid) { await signOut(auth); setLoading(false); setError("Ce compte n'est plus actif. Demandez un nouveau code au secrétariat."); return; }
      await ouvrirEspace(mid);
    } catch (e) {
      setLoading(false); setPin(PIN_VIDE());
      if ((e?.code || "").includes("too-many-requests")) { setError("Trop de tentatives. Patientez quelques minutes."); return; }
      echec("PIN incorrect, ou compte pas encore activé.");
    }
  };

  // ── Activation : vérification du code reçu ──
  const verifierCode = async () => {
    if (bloque()) { setError("Trop de tentatives. Réessayez dans quelques minutes."); return; }
    const c = code.join(""); if (c.length !== 6) return;
    setLoading(true); setError("");
    const id = `${ident.slug}_${c}`;
    try {
      const sn = await getDoc(doc(db, "codes_activation", id));
      setLoading(false);
      if (!sn.exists()) { setCode(PIN_VIDE()); echec("Code incorrect pour cet identifiant."); return; }
      if (Number(sn.data().expireLe) < Date.now()) { setError("Ce code a expiré. Demandez-en un nouveau au secrétariat."); return; }
      setCodeValide({ id, membreId: sn.data().membreId });
      setTentatives(0); setNewPin(PIN_VIDE()); setNewPin2(PIN_VIDE());
      setLoginStep("nouveau");
    } catch (e) { setLoading(false); setError("Vérification impossible : " + (e?.code || e?.message)); }
  };

  // ── Activation : choix du PIN et création du compte ──
  const terminerActivation = async () => {
    const n = newPin.join(""), n2 = newPin2.join("");
    if (n.length !== PIN_LONGUEUR) { setError(`Le PIN doit contenir ${PIN_LONGUEUR} chiffres.`); return; }
    if (/^(\d)\1+$/.test(n) || n === "123456" || n === "654321") { setError("PIN trop simple, choisissez-en un autre."); return; }
    if (n !== n2) { setError("Les deux PIN ne correspondent pas."); return; }
    setLoading(true); setError("");
    try {
      try { sessionStorage.setItem("ecig_alive", "1"); } catch(e) {}
      const v = await versionAcces(ident.slug);
      const cred = await createUserWithEmailAndPassword(auth, emailAuthMembre(ident.slug, v), n);
      try {
        await setDoc(doc(db, "profils_membres", cred.user.uid), {
          uid: cred.user.uid, membreId: String(codeValide.membreId), identifiant: ident.slug, code: codeValide.id, activeLe: Date.now(),
        });
      } catch (eLien) {
        // Le lien avec la fiche a échoué : on supprime le compte à peine créé,
        // pour que le même code puisse être réutilisé immédiatement.
        console.error("Lien profil :", eLien);
        await cred.user.delete().catch(() => {});
        await signOut(auth).catch(() => {});
        setLoading(false);
        setError("Activation interrompue (" + (eLien?.code || eLien?.message) + "). Réessayez avec le même code ; si l'erreur persiste, transmettez ce message au secrétariat.");
        return;
      }
      await deleteDoc(doc(db, "codes_activation", codeValide.id)).catch(() => {});
      await updateDoc(doc(db, "membres", String(codeValide.membreId)), { authActive: true }).catch(() => {});
      await ouvrirEspace(codeValide.membreId);
    } catch (e) {
      setLoading(false);
      const c = e?.code || "";
      setError(c.includes("email-already-in-use")
        ? "Un compte existe déjà pour cet identifiant. Demandez un nouveau code au secrétariat."
        : "Activation impossible : " + (c || e?.message));
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); localStorage.removeItem("ecig_session"); sessionStorage.removeItem("ecig_alive"); } catch(e) {}
    resetLogin();
  };

  // 🔒 Verrouillage au retour au premier plan
  useEffect(() => {
    const doLock = () => {
      try { localStorage.removeItem("ecig_session"); sessionStorage.removeItem("ecig_alive"); } catch(e) {}
      signOut(auth).catch(() => {});
      resetLogin();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (screenRef.current !== "login") { try { sessionStorage.removeItem("ecig_alive"); } catch(e) {} }
      } else if (document.visibilityState === "visible") {
        if (screenRef.current !== "login") doLock();
      }
    };
    const handlePageShow = () => { if (screenRef.current !== "login") doLock(); };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  // 🔒 Déconnexion après 3 minutes d'inactivité
  useEffect(() => {
    if (screen === "login") return;
    const TIMEOUT = 3 * 60 * 1000;
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { sessionStorage.removeItem("ecig_alive"); } catch(e) {}
        signOut(auth).catch(() => {});
        resetLogin();
      }, TIMEOUT);
    };
    const events = ["touchstart", "touchmove", "click", "keydown", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, resetTimer)); };
  }, [screen]);

  const lien = { width:'100%', marginTop:10, padding:'10px', border:'none', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 };
  const etapeActive = loginStep === "ident" ? 0 : loginStep === "nouveau" ? 2 : 1;

  if (demarrage) return <div className="app"><style>{styles}</style><Spinner/></div>;

  if (screen === "login") return (
    <div className="app">
      <style>{styles}</style>
      <div className="login-bg">
        <div className="login-logo" style={{padding:'8px'}}>
          <img src="/LogoECIG.png" style={{width:'60px',height:'60px',objectFit:'contain'}} />
        </div>
        <div className="login-title">MEMBRES - ECIG</div>
        <div className="login-sub">Église du Christ en Intercession LA GRACE</div>
        <div className="login-card">
          <div className="step-indicator">
            {[0,1,2].map(i => <div key={i} className={`step-dot ${etapeActive === i ? "active" : ""}`} />)}
          </div>

          {loginStep === "ident" && <>
            <h3>📱 Votre téléphone ou email</h3>
            <p style={{fontSize:13,color:'var(--text-muted)',textAlign:'center',marginBottom:16}}>
              Celui que le secrétariat a enregistré pour vous.
            </p>
            <div className="form-group">
              <input className="form-input" type="text" inputMode="email" autoComplete="off" value={saisieIdent}
                onChange={e=>{setSaisieIdent(e.target.value);setError("");}} placeholder="0812345678 ou votre@email.com"
                onKeyDown={e=>e.key==="Enter"&&validerIdent("pin")} style={{marginBottom:'12px'}} />
            </div>
            <button className="btn-login" onClick={()=>validerIdent("pin")} disabled={!saisieIdent}>🔑 J'ai mon PIN</button>
            <button className="btn-login" onClick={()=>validerIdent("code")} disabled={!saisieIdent}
              style={{marginTop:10, background:'#fff', color:'var(--green)', border:'2px solid var(--green)'}}>
              ✨ Première connexion / code reçu
            </button>
            <div className="pin-hint" style={{marginTop:10}}>Le code d'activation vous est remis par le secrétariat de l'église.</div>
            {error && <div className="error-msg">{error}</div>}
          </>}

          {loginStep === "pin" && <>
            <h3>🔑 Votre PIN</h3>
            <div className="email-display">{ident?.affichage}</div>
            {bloque()
              ? <div className="blocked-msg">⛔ Trop de tentatives.<br/>Réessayez dans 5 minutes.</div>
              : <>
                <div className="pin-label">🔐 PIN à {PIN_LONGUEUR} chiffres</div>
                <PinInput value={pin} onChange={setPin} prefix="pin" onEnter={handleLogin} />
                <button className="btn-login" onClick={handleLogin} disabled={loading||pin.join("").length<PIN_LONGUEUR}>
                  {loading ? "Connexion..." : "Se connecter →"}
                </button>
              </>}
            <div className="pin-hint" style={{marginTop:12}}>PIN oublié ? Demandez un nouveau code au secrétariat.</div>
            <button onClick={resetLogin} style={lien}>← Changer d'identifiant</button>
            {error && <div className="error-msg">{error}</div>}
          </>}

          {loginStep === "code" && <>
            <h3>✨ Activation — étape 1 sur 2</h3>
            <div className="email-display">{ident?.affichage}</div>
            <p style={{fontSize:13,color:'var(--text-muted)',textAlign:'center',marginBottom:12}}>Tapez le <strong>code à 6 chiffres</strong> reçu du secrétariat.</p>
            {bloque()
              ? <div className="blocked-msg">⛔ Trop de tentatives.<br/>Réessayez dans 5 minutes.</div>
              : <>
                <PinInput value={code} onChange={setCode} prefix="code" onEnter={verifierCode} />
                <button className="btn-login" onClick={verifierCode} disabled={loading||code.join("").length<6}>
                  {loading ? "Vérification..." : "Continuer →"}
                </button>
              </>}
            <button onClick={resetLogin} style={lien}>← Annuler</button>
            {error && <div className="error-msg">{error}</div>}
          </>}

          {loginStep === "nouveau" && <>
            <h3>🔒 Activation — étape 2 sur 2</h3>
            <div className="pin-change-banner">Choisissez votre PIN à {PIN_LONGUEUR} chiffres. Gardez-le pour vous : il protège vos informations.</div>
            <div className="pin-label">Nouveau PIN</div>
            <PinInput value={newPin} onChange={setNewPin} prefix="np" />
            <div className="pin-label">Confirmer</div>
            <PinInput value={newPin2} onChange={setNewPin2} prefix="np2" onEnter={terminerActivation} />
            <button className="btn-login" onClick={terminerActivation} disabled={loading||newPin.join("").length<PIN_LONGUEUR||newPin2.join("").length<PIN_LONGUEUR}>
              {loading ? "Activation..." : "✅ Activer et accéder"}
            </button>
            {error && <div className="error-msg">{error}</div>}
          </>}
        </div>
      </div>
    </div>
  );

  if (loading || !membre) return <div className="app"><style>{styles}</style><Spinner/></div>;

  const membreFrais = membres.find(m => String(m.id) === String(membre.id)) || membre;

  return (
    <div className="app">
      <style>{styles}</style>
      <TopBar membre={membreFrais} onLogout={handleLogout} />
      {screen==="home"          && <HomeScreen membre={membreFrais} cotisations={cotisations} theme={theme}/>}
      {screen==="famille"       && <FamilleScreen membre={membreFrais} membres={membres} familles={familles} setFamilles={setFamilles} setMembres={setMembres}/>}
      {screen==="calendrier"    && <CalendrierScreen calendrier={calendrier}/>}
      {screen==="annonces"      && <AnnoncesScreen annonces={annonces}/>}
      {screen==="enseignements" && <EnseignementsScreen membre={membreFrais} enseignements={enseignements}/>}
      {screen==="profil"        && <ProfilScreen membre={membreFrais} membres={membres} setMembres={setMembres}/>}
      <BottomNav screen={screen} setScreen={setScreen}/>
    </div>
  );
}
