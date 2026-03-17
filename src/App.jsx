// @ts-nocheck
import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";

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
          <img src="/LogoECIG.png" style={{width:'28px',height:'28px',objectFit:'contain',borderRadius:'50%'}} />
        </div>
        <div>
          <div className="topbar-name">ECIG — LA GRACE</div>
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

      {/* En-tête famille */}
      <div className="famille-header">
        <div className="famille-name">🏠 {maFamille.nom}</div>
        <div className="famille-adresse">📍 {maFamille.adresse||"Adresse non renseignée"}</div>
        {isChef && <span style={{marginTop:'8px',display:'inline-block',background:'rgba(255,255,255,0.2)',padding:'4px 12px',borderRadius:'20px',fontSize:'12px'}}>⭐ Chef de famille</span>}
      </div>

      {savedAdresse && <div className="success-msg">✅ Adresse mise à jour !</div>}
      {savedMembre && <div className="success-msg">✅ Membre sauvegardé !</div>}

      {/* Modifier adresse — chef seulement */}
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

      {/* Liste des membres */}
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

      {/* Ajouter membre — chef seulement */}
      {isChef && (
        <button className="btn-save" onClick={()=>{setFormMembre({prenom:"",nom:"",genre:"Masculin",telephone:"",dateNaissance:"",statut:"actif",departement:"",fonction:"",baptise:false});setEditMembreId(null);setShowAddMembre(true);}}>
          ➕ Ajouter un membre de famille
        </button>
      )}

      {/* Modal ajout/modification membre */}
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
function EnseignementsScreen({ enseignements }) {
  const [selected, setSelected] = useState(null);
  if (selected) return (
    <div className="content">
      <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'var(--green)',fontFamily:'Nunito,sans-serif',fontWeight:'700',fontSize:'14px',cursor:'pointer',marginBottom:'16px',display:'flex',alignItems:'center',gap:'6px'}}>
        ← Retour
      </button>
      <div className="page-title">{selected.titre||selected.sujet}</div>
      <div style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'16px'}}>{selected.date} {selected.orateur||selected.pasteur ? `• ${selected.orateur||selected.pasteur}` : ""}</div>
      <div className="card">
        <div style={{fontSize:'14px',lineHeight:'1.7',color:'var(--text)',whiteSpace:'pre-wrap'}}>{selected.contenu||selected.notes||selected.description||"(Pas de notes disponibles)"}</div>
      </div>
      {selected.reference && <div className="card" style={{background:'var(--green-light)'}}>
        <div className="section-title" style={{color:'var(--green)'}}>📖 Référence biblique</div>
        <div style={{fontSize:'14px',color:'var(--green-dark)',fontWeight:'600'}}>{selected.reference}</div>
      </div>}
    </div>
  );
  return (
    <div className="content">
      <div className="page-title">📖 Enseignements</div>
      <div className="page-sub">Messages et études bibliques</div>
      <div className="card">
        {enseignements.length===0 ? <div className="empty"><div className="empty-icon">📖</div><p>Aucun enseignement disponible</p></div>
        : [...enseignements].reverse().map((e,i)=>(
          <div className="list-item" key={i} onClick={()=>setSelected(e)} style={{cursor:'pointer'}}>
            <div className="list-bullet green">📖</div>
            <div className="list-body">
              <div className="list-title">{e.titre||e.sujet}</div>
              <div className="list-desc">{e.orateur||e.pasteur||""}</div>
              {e.date && <div className="list-date">{e.date}</div>}
              {e.reference && <span className="badge badge-green" style={{marginTop:'4px'}}>{e.reference}</span>}
            </div>
            <div style={{color:'var(--text-muted)',fontSize:'18px',alignSelf:'center'}}>›</div>
          </div>
        ))}
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
  const [loading, setLoading] = useState(false);
  const [membre, setMembre] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState(["","","",""]);
  const [error, setError] = useState("");
  const [membres, setMembres] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [loadingMembres, setLoadingMembres] = useState(true);
  const [cotisations, setCotisations] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [calendrier, setCalendrier] = useState([]);

  useEffect(() => {
    const fetchMembres = async () => {
      const data = await loadData("ecig_membres", []);
      setMembres(data);
      setLoadingMembres(false);
    };
    fetchMembres();
  }, []);

  const handlePinChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < 3) document.getElementById(`pin-${index+1}`)?.focus();
  };

  const handleLogin = async () => {
    const pinStr = pin.join("");
    const found = membres.find(m => m.id == selectedId);
    if (!found) { setError("Veuillez sélectionner un membre."); return; }
    if (pinStr !== (found.pin||"1234")) { setError("PIN incorrect. Essayez encore."); setPin(["","","",""]); return; }
    setLoading(true);
    const [cotis, anno, cal, fams] = await Promise.all([
      loadData("ecig_cotisations", []),
      loadData("ecig_annonces", []),
      loadData("ecig_activites", []),
      loadData("ecig_familles", []),
    ]);
    setCotisations(cotis);
    setAnnonces(anno);
    setCalendrier(cal);
    setFamilles(fams);
    setMembre(found);
    setLoading(false);
    setScreen("home");
  };

  const handleLogout = () => {
    setMembre(null); setScreen("login"); setPin(["","","",""]); setError("");
  };

  if (screen === "login") return (
    <div className="app">
      <style>{styles}</style>
      <div className="login-bg">
        <div className="login-logo" style={{padding:'8px'}}>
          <img src="/LogoECIG.png" style={{width:'60px',height:'60px',objectFit:'contain'}} />
        </div>
        <div className="login-title">ECIG — LA GRACE</div>
        <div className="login-sub">Église du Christ en Intercession LA GRACE</div>
        <div className="login-card">
          <h3>👋 Connexion membre</h3>
          {loadingMembres ? <div style={{textAlign:'center',padding:'20px',color:'var(--text-muted)'}}>Chargement...</div> : <>
            <select className="login-select" value={selectedId} onChange={e=>{setSelectedId(e.target.value);setError("");}}>
              <option value="">— Choisissez votre nom —</option>
              {membres.map(m=><option key={m.id} value={m.id}>{m.prenom} {m.nom} {m.role||m.fonction ? `(${m.role||m.fonction})` : ""}</option>)}
            </select>
            <div className="pin-label">🔐 Entrez votre PIN (4 chiffres)</div>
            <div className="pin-row">
              {[0,1,2,3].map(i=>(
                <input key={i} id={`pin-${i}`} className="pin-dot" type="password" inputMode="numeric" maxLength={1}
                  value={pin[i]} onChange={e=>handlePinChange(i,e.target.value)}
                  onKeyDown={e=>{if(e.key==="Backspace"&&!pin[i]&&i>0)document.getElementById(`pin-${i-1}`)?.focus();}}
                />
              ))}
            </div>
            <div className="pin-hint">💡 PIN par défaut : 1234</div>
            <button className="btn-login" onClick={handleLogin} disabled={loading||!selectedId||pin.join("").length<4}>
              {loading?"Connexion...":"Se connecter →"}
            </button>
            {error && <div className="error-msg">{error}</div>}
          </>}
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="app"><style>{styles}</style><Spinner/></div>;

  // Mettre à jour le membre depuis la liste pour avoir les données fraîches
  const membreFrais = membres.find(m => m.id === membre.id) || membre;

  return (
    <div className="app">
      <style>{styles}</style>
      <TopBar membre={membreFrais} onLogout={handleLogout} />
      {screen==="home" && <HomeScreen membre={membreFrais} cotisations={cotisations}/>}
      {screen==="famille" && <FamilleScreen membre={membreFrais} membres={membres} familles={familles} setFamilles={setFamilles} setMembres={setMembres}/>}
      {screen==="calendrier" && <CalendrierScreen calendrier={calendrier}/>}
      {screen==="annonces" && <AnnoncesScreen annonces={annonces}/>}
      {screen==="enseignements" && <EnseignementsScreen enseignements={enseignements}/>}
      {screen==="profil" && <ProfilScreen membre={membreFrais} membres={membres} setMembres={setMembres}/>}
      <BottomNav screen={screen} setScreen={setScreen}/>
    </div>
  );
}
