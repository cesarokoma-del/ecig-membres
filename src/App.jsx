// @ts-nocheck
import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithRedirect, signInWithPopup, getRedirectResult, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCMXHMlnOSH0GcW3zXtSSZWjBmcVuCCUas",
  authDomain: "ecig-gestion.firebaseapp.com",
  projectId: "ecig-gestion",
  storageBucket: "ecig-gestion.firebasestorage.app",
  messagingSenderId: "1014513113938",
  appId: "1:1014513113938:web:85ab9f0b95e167a6a9388b"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const saveData = async (key, data) => {
  try { await setDoc(doc(db, "ecig_data", key), { value: JSON.stringify(data) }); } catch(e) {}
};
const loadData = async (key, def) => {
  try {
    const snap = await getDocs(collection(db, "ecig_data"));
    const found = snap.docs.find(d => d.id === key);
    return found ? JSON.parse(found.data().value) : def;
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
  .btn-google { width:100%; padding:14px; border-radius:14px; border:2px solid var(--border); background:var(--white); color:var(--text); font-family:'Nunito',sans-serif; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s; margin-bottom:12px; }
  .btn-google:hover { border-color:#4285F4; background:#f0f4ff; }
  .google-icon { width:20px; height:20px; }
  .google-email { font-size:12px; color:var(--text-muted); text-align:center; margin-bottom:16px; padding:8px 12px; background:#f0f4ff; border-radius:8px; border:1px solid #c7d7fb; }
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
          <div className="topbar-name">MEMBRES — ECIG</div>
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
function HomeScreen({ membre, cotisations }) {
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
        <div className="hero-theme">✝ L'ÉLARGISSEMENT (REHOBOTH)</div>
        <div className="hero-verse">"Car l'Éternel notre Dieu nous a élargi le lieu..." — Gen 26:22</div>
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
    const updated = familles.map(f => f.id==maFamille.id ? {...f, adresse} : f);
    await saveData("ecig_familles", updated);
    setFamilles(updated);
    setSavedAdresse(true);
    setEditAdresse(false);
    setTimeout(()=>setSavedAdresse(false),3000);
  };

  const handleSaveMembre = async () => {
    if (!formMembre.prenom||!formMembre.nom) { alert("Prénom et nom requis"); return; }
    let updatedMembres;
    if (editMembreId) {
      updatedMembres = membres.map(m => m.id==editMembreId ? {...m,...formMembre, familleId:maFamille.id, famille:maFamille.nom} : m);
    } else {
      const newM = {...formMembre, id:Date.now(), familleId:maFamille.id, famille:maFamille.nom, dateAdhesion:new Date().toISOString().split("T")[0]};
      updatedMembres = [...membres, newM];
    }
    await saveData("ecig_membres", updatedMembres);
    setMembres(updatedMembres);
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
  const [pinForm, setPinForm] = useState({old:"",nouveau:"",confirm:""});
  const [pinMsg, setPinMsg] = useState("");
  const initials = membre.prenom[0]+membre.nom[0];

  const handleSave = async () => {
    const updated = membres.map(m => m.id===membre.id ? {...m,...form} : m);
    await saveData("ecig_membres", updated);
    setMembres(updated);
    setSaved(true);
    setTimeout(()=>setSaved(false),3000);
  };

  const handlePinChange = async () => {
    const currentPin = membre.pin||"1234";
    if (pinForm.old!==currentPin) { setPinMsg("❌ Ancien PIN incorrect"); return; }
    if (pinForm.nouveau.length!==4) { setPinMsg("❌ Le PIN doit avoir 4 chiffres"); return; }
    if (pinForm.nouveau!==pinForm.confirm) { setPinMsg("❌ Les PINs ne correspondent pas"); return; }
    const updated = membres.map(m => m.id===membre.id ? {...m,pin:pinForm.nouveau} : m);
    await saveData("ecig_membres", updated);
    setMembres(updated);
    setPinMsg("✅ PIN modifié avec succès !");
    setPinForm({old:"",nouveau:"",confirm:""});
    setTimeout(()=>setPinMsg(""),3000);
  };

  return (
    <div className="content">
      <div className="profile-avatar">{initials}</div>
      <div className="profile-name">{membre.prenom} {membre.nom}</div>
      <div className="profile-role">{membre.role||membre.fonction||""} • {membre.departement||""}</div>
      <div className="card">
        <div className="section-title">✏️ Modifier mon profil</div>
        <div className="form-group"><div className="form-label">Téléphone</div><input className="form-input" value={form.telephone||""} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="+243..." /></div>
        <div className="form-group"><div className="form-label">Email</div><input className="form-input" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@..." /></div>
        <div className="form-group"><div className="form-label">Adresse</div><input className="form-input" value={form.adresse||""} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="Adresse..." /></div>
        <button className="btn-save" onClick={handleSave}>💾 Enregistrer</button>
        {saved && <div className="success-msg">✅ Profil mis à jour !</div>}
      </div>
      <div className="pin-section">
        <div className="pin-section-title">🔐 Changer mon PIN</div>
        <div className="form-group"><div className="form-label">Ancien PIN</div><input className="form-input" type="password" maxLength={4} value={pinForm.old} onChange={e=>setPinForm({...pinForm,old:e.target.value})} placeholder="••••" /></div>
        <div className="form-group"><div className="form-label">Nouveau PIN (4 chiffres)</div><input className="form-input" type="password" maxLength={4} value={pinForm.nouveau} onChange={e=>setPinForm({...pinForm,nouveau:e.target.value})} placeholder="••••" /></div>
        <div className="form-group"><div className="form-label">Confirmer</div><input className="form-input" type="password" maxLength={4} value={pinForm.confirm} onChange={e=>setPinForm({...pinForm,confirm:e.target.value})} placeholder="••••" /></div>
        <button className="btn-save" style={{background:'var(--gold)'}} onClick={handlePinChange}>🔐 Changer le PIN</button>
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
  const [loginStep, setLoginStep] = useState("google"); // google | select | pin | change-pin
  const [googleUser, setGoogleUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [membre, setMembre] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState(["","","",""]);
  const [newPin, setNewPin] = useState(["","","",""]);
  const [newPin2, setNewPin2] = useState(["","","",""]);
  const [error, setError] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [membres, setMembres] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [loadingMembres, setLoadingMembres] = useState(true);
  const [cotisations, setCotisations] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [calendrier, setCalendrier] = useState([]);
  const [enseignements, setEnseignements] = useState([]);

  useEffect(() => {
    const init = async () => {
      // Vérifier le résultat du redirect Google (après retour sur la page)
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const user = result.user;
          setGoogleUser({ email: user.email, displayName: user.displayName, photoURL: user.photoURL });
          setLoginStep("select");
        }
      } catch(e) { console.log("Redirect result:", e); }

      const fetchMembres = async () => {
      const data = await loadData("ecig_membres", []);
      setMembres(data);

      // Restaurer la session sauvegardée
      try {
        const saved = localStorage.getItem("ecig_session");
        if (saved) {
          const { membreId, googleEmail } = JSON.parse(saved);
          const found = data.find(m => String(m.id) === String(membreId));
          if (found) {
            setLoading(true);
            setLoadingMembres(false);
            if (googleEmail) setGoogleUser({ email: googleEmail, displayName: "", photoURL: "" });
            const [cotis, anno, cal, fams, ens] = await Promise.all([
              loadData("ecig_cotisations", []),
              loadData("ecig_annonces", []),
              loadData("ecig_activites", []),
              loadData("ecig_familles", []),
              loadData("ecig_enseignements", []),
            ]);
            setCotisations(cotis);
            setAnnonces(anno);
            setCalendrier(cal);
            setFamilles(fams);
            setEnseignements(ens);
            setMembre(found);
            setLoading(false);
            setScreen("home");
            return;
          }
        }
      } catch(e) {}

      setLoadingMembres(false);
    };
    fetchMembres();
    };
    init();
  }, []);

  const handlePinChange = (index, value, setter) => {
    if (!/^\d?$/.test(value)) return;
    const arr = setter === setPin ? [...pin] : setter === setNewPin ? [...newPin] : [...newPin2];
    arr[index] = value;
    setter(arr);
    if (value && index < 3) document.getElementById(`${setter === setPin ? "pin" : setter === setNewPin ? "np" : "np2"}-${index+1}`)?.focus();
  };

  // Étape 1 — Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true); setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setGoogleUser({ email: user.email, displayName: user.displayName, photoURL: user.photoURL });
      setLoginStep("select");
    } catch(e) {
      console.error("Google Sign-In error:", e.code, e.message);
      if (e.code === "auth/popup-blocked") {
        setError("Popup bloquée. Autorisez les popups pour ce site dans votre navigateur.");
      } else if (e.code === "auth/unauthorized-domain") {
        setError("Domaine non autorisé. Contactez l'administrateur.");
      } else if (e.code === "auth/popup-closed-by-user") {
        setError("Connexion annulée. Réessayez.");
      } else {
        setError(`Erreur: ${e.code || "inconnue"}. Réessayez.`);
      }
    }
    setLoading(false);
  };

  // Étape 2 — Sélection du membre → Étape 3 PIN
  const handleSelectMembre = () => {
    if (!selectedId) { setError("Veuillez choisir votre nom."); return; }
    setError(""); setPin(["","","",""]); setPinAttempts(0); setBlockedUntil(null);
    setLoginStep("pin");
  };

  // Étape 3 — Vérification PIN
  const handleLogin = async () => {
    // Vérifier si bloqué
    if (blockedUntil && new Date() < blockedUntil) {
      const secs = Math.ceil((blockedUntil - new Date()) / 1000);
      setError(`Compte bloqué. Réessayez dans ${secs} secondes.`); return;
    }
    const pinStr = pin.join("");
    const found = membres.find(m => m.id == selectedId);
    if (!found) { setError("Membre introuvable."); return; }
    const pinCorrect = found.pin || "1234";
    if (pinStr !== pinCorrect) {
      const attempts = pinAttempts + 1;
      setPinAttempts(attempts);
      setPin(["","","",""]);
      if (attempts >= 3) {
        const until = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        setBlockedUntil(until);
        setError("⛔ 3 tentatives échouées. Compte bloqué 5 minutes.");
      } else {
        setError(`PIN incorrect. ${3 - attempts} tentative(s) restante(s).`);
      }
      return;
    }
    // PIN correct — vérifier si PIN par défaut
    if (pinCorrect === "1234") {
      setLoginStep("change-pin");
      setError("");
      return;
    }
    // Connexion complète
    await completeLogin(found);
  };

  // Étape 4 (optionnelle) — Forcer changement PIN
  const handleChangePin = async () => {
    const np = newPin.join("");
    const np2 = newPin2.join("");
    if (np.length < 4) { setError("Le nouveau PIN doit contenir 4 chiffres."); return; }
    if (np === "1234") { setError("Le PIN 1234 n'est pas autorisé."); return; }
    if (np !== np2) { setError("Les deux PIN ne correspondent pas."); return; }
    // Sauvegarder le nouveau PIN
    const found = membres.find(m => m.id == selectedId);
    const updated = membres.map(m => m.id == selectedId ? {...m, pin: np, googleEmail: googleUser?.email} : m);
    setMembres(updated);
    await setDoc(doc(db, "ecig_data", "ecig_membres"), { value: JSON.stringify(updated) });
    await completeLogin({...found, pin: np, googleEmail: googleUser?.email});
  };

  const completeLogin = async (found) => {
    setLoading(true);
    // Sauvegarder l'email Google sur le membre si pas encore fait
    if (googleUser?.email && found.googleEmail !== googleUser.email) {
      const updated = membres.map(m => m.id === found.id ? {...m, googleEmail: googleUser.email} : m);
      setMembres(updated);
      await setDoc(doc(db, "ecig_data", "ecig_membres"), { value: JSON.stringify(updated) });
      found = {...found, googleEmail: googleUser.email};
    }
    const [cotis, anno, cal, fams, ens] = await Promise.all([
      loadData("ecig_cotisations", []),
      loadData("ecig_annonces", []),
      loadData("ecig_activites", []),
      loadData("ecig_familles", []),
      loadData("ecig_enseignements", []),
    ]);
    setCotisations(cotis); setAnnonces(anno); setCalendrier(cal); setFamilles(fams); setEnseignements(ens);
    setMembre(found);
    try { localStorage.setItem("ecig_session", JSON.stringify({ membreId: found.id, googleEmail: googleUser?.email })); } catch(e) {}
    setLoading(false);
    setScreen("home");
  };

  const handleLogout = async () => {
    try { await signOut(auth); localStorage.removeItem("ecig_session"); } catch(e) {}
    setMembre(null); setScreen("login"); setLoginStep("google"); setGoogleUser(null);
    setPin(["","","",""]); setNewPin(["","","",""]); setNewPin2(["","","",""]); setError(""); setPinAttempts(0); setBlockedUntil(null);
  };

  // Écran de login — 3 étapes
  if (screen === "login") return (
    <div className="app">
      <style>{styles}</style>
      <div className="login-bg">
        <div className="login-logo" style={{padding:'8px'}}>
          <img src="/LogoECIG.png" style={{width:'60px',height:'60px',objectFit:'contain'}} />
        </div>
        <div className="login-title">MEMBRES — ECIG</div>
        <div className="login-sub">Église du Christ en Intercession LA GRACE</div>
        <div className="login-card">
          {/* Indicateur d'étapes */}
          <div className="step-indicator">
            {["google","select","pin"].map((s,i) => (
              <div key={s} className={`step-dot ${loginStep === s || (loginStep === "change-pin" && i === 2) ? "active" : ""}`} />
            ))}
          </div>

          {/* ÉTAPE 1 — Google Sign-In */}
          {loginStep === "google" && <>
            <h3>🔐 Connexion sécurisée</h3>
            <p style={{fontSize:13,color:'var(--text-muted)',textAlign:'center',marginBottom:20}}>
              Connectez-vous avec le compte Google de votre téléphone pour accéder à votre espace membre.
            </p>
            <button className="btn-google" onClick={handleGoogleSignIn} disabled={loading}>
              <svg className="google-icon" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {loading ? "Connexion..." : "Se connecter avec Google"}
            </button>
            {error && <div className="error-msg">{error}</div>}
          </>}

          {/* ÉTAPE 2 — Choisir son nom */}
          {loginStep === "select" && <>
            <h3>👤 Qui êtes-vous ?</h3>
            {googleUser && <div className="google-email">✅ Connecté : {googleUser.email}</div>}
            {loadingMembres ? <div style={{textAlign:'center',padding:'20px',color:'var(--text-muted)'}}>Chargement...</div> : <>
              <select className="login-select" value={selectedId} onChange={e=>{setSelectedId(e.target.value);setError("");}}>
                <option value="">— Choisissez votre nom —</option>
                {membres.map(m=><option key={m.id} value={m.id}>{m.prenom} {m.nom}{m.fonction?` (${m.fonction})`:""}</option>)}
              </select>
              <button className="btn-login" onClick={handleSelectMembre} disabled={!selectedId}>
                Continuer →
              </button>
              {error && <div className="error-msg">{error}</div>}
            </>}
          </>}

          {/* ÉTAPE 3 — PIN */}
          {loginStep === "pin" && <>
            <h3>🔑 Entrez votre PIN</h3>
            {googleUser && <div className="google-email">✅ {googleUser.email}</div>}
            {blockedUntil && new Date() < blockedUntil
              ? <div className="blocked-msg">⛔ Compte bloqué temporairement.<br/>Trop de tentatives échouées.<br/>Réessayez dans 5 minutes.</div>
              : <>
                <div className="pin-label">🔐 PIN à 4 chiffres</div>
                <div className="pin-row">
                  {[0,1,2,3].map(i=>(
                    <input key={i} id={`pin-${i}`} className="pin-dot" type="password" inputMode="numeric" maxLength={1}
                      value={pin[i]} onChange={e=>handlePinChange(i,e.target.value,setPin)}
                      onKeyDown={e=>{if(e.key==="Backspace"&&!pin[i]&&i>0)document.getElementById(`pin-${i-1}`)?.focus();}}
                    />
                  ))}
                </div>
                {pinAttempts > 0 && <div className="pin-attempts">⚠️ {3 - pinAttempts} tentative(s) restante(s)</div>}
                <div className="pin-hint">💡 PIN par défaut : 1234</div>
                <button className="btn-login" onClick={handleLogin} disabled={loading||pin.join("").length<4}>
                  {loading?"Connexion...":"Se connecter →"}
                </button>
              </>
            }
            <button onClick={()=>{setLoginStep("select");setPin(["","","",""]);setError("");setPinAttempts(0);setBlockedUntil(null);}} style={{width:'100%',marginTop:10,padding:'10px',border:'none',background:'transparent',color:'var(--text-muted)',cursor:'pointer',fontSize:13}}>
              ← Changer de nom
            </button>
            {error && <div className="error-msg">{error}</div>}
          </>}

          {/* ÉTAPE 4 — Changer PIN par défaut (forcé) */}
          {loginStep === "change-pin" && <>
            <div className="pin-change-banner">⚠️ Pour votre sécurité, vous devez choisir un nouveau PIN personnalisé avant de continuer.</div>
            <h3>🔒 Nouveau PIN</h3>
            <div className="pin-label">Nouveau PIN (4 chiffres)</div>
            <div className="pin-row">
              {[0,1,2,3].map(i=>(
                <input key={i} id={`np-${i}`} className="pin-dot" type="password" inputMode="numeric" maxLength={1}
                  value={newPin[i]} onChange={e=>handlePinChange(i,e.target.value,setNewPin)}
                  onKeyDown={e=>{if(e.key==="Backspace"&&!newPin[i]&&i>0)document.getElementById(`np-${i-1}`)?.focus();}}
                />
              ))}
            </div>
            <div className="pin-label">Confirmer le nouveau PIN</div>
            <div className="pin-row">
              {[0,1,2,3].map(i=>(
                <input key={i} id={`np2-${i}`} className="pin-dot" type="password" inputMode="numeric" maxLength={1}
                  value={newPin2[i]} onChange={e=>handlePinChange(i,e.target.value,setNewPin2)}
                  onKeyDown={e=>{if(e.key==="Backspace"&&!newPin2[i]&&i>0)document.getElementById(`np2-${i-1}`)?.focus();}}
                />
              ))}
            </div>
            <button className="btn-login" onClick={handleChangePin} disabled={loading||newPin.join("").length<4||newPin2.join("").length<4}>
              {loading?"Enregistrement...":"✅ Enregistrer et accéder"}
            </button>
            {error && <div className="error-msg">{error}</div>}
          </>}
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="app"><style>{styles}</style><Spinner/></div>;

  const membreFrais = membres.find(m => m.id === membre.id) || membre;

  return (
    <div className="app">
      <style>{styles}</style>
      <TopBar membre={membreFrais} onLogout={handleLogout} />
      {screen==="home"          && <HomeScreen membre={membreFrais} cotisations={cotisations}/>}
      {screen==="famille"       && <FamilleScreen membre={membreFrais} membres={membres} familles={familles} setFamilles={setFamilles} setMembres={setMembres}/>}
      {screen==="calendrier"    && <CalendrierScreen calendrier={calendrier}/>}
      {screen==="annonces"      && <AnnoncesScreen annonces={annonces}/>}
      {screen==="enseignements" && <EnseignementsScreen membre={membreFrais} enseignements={enseignements}/>}
      {screen==="profil"        && <ProfilScreen membre={membreFrais} membres={membres} setMembres={setMembres}/>}
      <BottomNav screen={screen} setScreen={setScreen}/>
    </div>
  );
}
