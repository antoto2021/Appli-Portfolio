// ==========================================
// FICHIER 7 : POINT D'ENTRÉE & INITIALISATION
// ==========================================

// --- GESTION DES MISES À JOUR (GITHUB) ---
async function checkGitHubStatus() {
    if (GITHUB_USERNAME === 'antoto2021') console.log("GitHub Check started...");
    const c = await fetchLatestCommit();
    if (!c) return;
    
    const rh = c.sha;
    const sh = localStorage.getItem(UPDATE_STORAGE_KEY);
    
    if (!sh) {
        // Première installation ou cache vide
        localStorage.setItem(UPDATE_STORAGE_KEY, rh);
        localStorage.setItem(UPDATE_TIME_KEY, Date.now());
    } else if (sh !== rh) {
        // Une nouvelle version est disponible
        triggerUpdateUI();
        const p = parseCommitMessage(c.commit.message);
        if (p.length > 0) activeUpdates = p;
    }
}

async function fetchLatestCommit() {
    try {
        // Ajout d'un timestamp pour éviter le cache du navigateur
        const r = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/commits?per_page=1&t=${Date.now()}`);
        if (!r.ok) return null;
        const d = await r.json();
        return d[0];
    } catch { return null; }
}

async function handlePostUpdate() {
    const c = await fetchLatestCommit();
    if (!c) return;
    
    const rh = c.sha;
    const sh = localStorage.getItem(UPDATE_STORAGE_KEY);
    
    // Si on est déjà à jour, on nettoie l'URL
    if (sh === rh) {
        const u = new URL(window.location.href);
        u.searchParams.delete('v');
        window.history.replaceState({}, document.title, u.toString());
        return;
    }
    
    // Sinon, on affiche le Changelog (What's New)
    const o = document.getElementById('wn-overlay');
    o.style.display = 'flex';
    setTimeout(() => o.classList.add('show-modal'), 10);
    
    localStorage.setItem(UPDATE_STORAGE_KEY, rh);
    localStorage.setItem(UPDATE_TIME_KEY, Date.now());
    
    const p = parseCommitMessage(c.commit.message);
    if (p.length > 0) activeUpdates = p;
    
    renderSlides();
    updateSlideUI();
    document.getElementById('wn-btn').style.display = 'flex';
}

// --- FONCTION AFFICHER LES INFOS ---
async function renderInfoView() {
    // 1. Hash Local
    const lh = localStorage.getItem(UPDATE_STORAGE_KEY) || 'Aucun';
    const elLocalHash = document.getElementById('info-local-hash');
    if(elLocalHash) elLocalHash.innerText = lh.substring(0, 7) + '...';
    
    // 2. Date de mise à jour (Calcul du temps écoulé)
    const lt = localStorage.getItem(UPDATE_TIME_KEY);
    const elLocalDate = document.getElementById('info-local-date');
    
    if (lt && elLocalDate) {
        const diffMs = Date.now() - parseInt(lt);
        const m = Math.floor(diffMs / 60000);
        
        let timeStr;
        if (m < 60) {
            timeStr = `Il y a ${m} min`;
        } else if (m < 1440) { // Moins de 24h
            timeStr = `Il y a ${Math.floor(m / 60)} h`;
        } else if (m < 43200) { // Moins de 30 jours
            timeStr = `Il y a ${Math.floor(m / 1440)} j`;
        } else {
            timeStr = `Il y a ${Math.floor(m / 43200)} mois`;
        }
        elLocalDate.innerText = timeStr;
    } else if(elLocalDate) {
         elLocalDate.innerText = "Date inconnue";
    }

    // 3. GitHub & Statut de connexion
    const sd = document.getElementById('connection-status');
    const re = document.getElementById('info-remote-hash');
    if(re) re.innerText = "...";
    if(sd) sd.className = "w-2 h-2 rounded-full bg-gray-400";
    
    // Appel à la fonction qui est déjà dans main.js
    const rc = await fetchLatestCommit();
    
    if (rc) {
        if(re) re.innerText = rc.sha.substring(0, 7) + '...';
        if(sd) {
            sd.classList.remove('bg-gray-400');
            sd.classList.add('bg-green-500');
        }
    } else {
        if(re) re.innerText = "Offline";
        if(sd) {
            sd.classList.remove('bg-gray-400');
            sd.classList.add('bg-red-500');
        }
    }
    
    // 4. Afficher mon UID
    if (myUid) {
        const elUid = document.getElementById('my-uid-display');
        if(elUid) elUid.innerText = myUid;
    }
}

// --- INITIALISATION PRINCIPALE (Au chargement) ---
async function initApp() {
    try {
        await db.init();

        // 1. MIGRATION DES DONNÉES (Legacy LocalStorage v4 -> IndexedDB)
        // Ce bloc permet de ne pas perdre les données des anciennes versions de l'app
        const legacyCol = localStorage.getItem('green_codex_collection_v4');
        if (legacyCol) { 
            const p = JSON.parse(legacyCol); 
            if (p.length > 0) { 
                for (let i of p) { 
                    delete i.id; // On laisse IndexedDB gérer les nouveaux IDs
                    await db.save('collection', i); 
                } 
            } 
            localStorage.removeItem('green_codex_collection_v4'); 
        }
        
        const legacyCt = localStorage.getItem('green_codex_content_v4');
        if (legacyCt) { 
            await db.save('config', { key: 'contentMap', value: JSON.parse(legacyCt) }); 
            localStorage.removeItem('green_codex_content_v4'); 
        }
        
        const legacySc = localStorage.getItem('green_codex_custom_sections_v4');
        if (legacySc) { 
            await db.save('config', { key: 'customSections', value: JSON.parse(legacySc) }); 
            localStorage.removeItem('green_codex_custom_sections_v4'); 
        }

        // 2. CHARGEMENT DES DONNÉES EN MÉMOIRE
        collection = await db.getAll('collection');
        friends = await db.getAll('friends');
        
        const cc = (await db.getAll('config')).find(c => c.key === 'contentMap'); 
        contentMap = cc ? cc.value : {};
        
        const cs = (await db.getAll('config')).find(c => c.key === 'customSections'); 
        customSections = cs ? cs.value : [];

        // 3. RENDU INITIAL DE L'UI
        renderFriendsList();
        loadSavedContent(); 
        updateDashboardStats(); 
        calculateStorageUsage();
        initCharts();

        // 4. CONNEXION FIREBASE (Si disponible)
        if (window.initFirebase) {
            firebaseInstance = await window.initFirebase();
            if (firebaseInstance) {
                myUid = firebaseInstance.user.uid;
                await db.save('config', { key: 'user_uid', value: myUid });
                // Synchro des éléments en attente (Dirty)
                setTimeout(() => syncDirtyItems(), 3000);
            } else {
                // Mode hors ligne : récupération de l'UID en cache
                const su = (await db.getAll('config')).find(c => c.key === 'user_uid');
                if (su) myUid = su.value;
            }
        }
        
        // 5. VÉRIFICATION DES MISES À JOUR (Après 5 sec)
        setTimeout(() => checkGitHubStatus(), 5000);

    } catch (e) { console.error("Init Error:", e); }
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS GLOBAUX ---

window.addEventListener('load', () => { 
    // Initialisation des listes déroulantes du comparateur
    const sA = document.getElementById('selectA');
    const sB = document.getElementById('selectB');
    const u = new URLSearchParams(window.location.search);

    if (sA && sB && typeof masterData !== 'undefined') {
        Object.keys(masterData).forEach(k => { 
            sA.add(new Option(masterData[k].name, k)); 
            sB.add(new Option(masterData[k].name, k)); 
        });
        sA.value = "weed_sativa"; 
        sB.value = "hash_rosin";
    }
    
    // Lancement de l'application
    initApp().then(() => { 
        if (u.has('v')) handlePostUpdate(); 
    });
});

// PWA : Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker enregistré ✅'))
            .catch(err => console.log('Erreur SW ❌', err));
    });
}

// Détection du retour en ligne pour la synchronisation
window.addEventListener('online', () => {
    console.log("🌐 Connexion rétablie. Lancement de la synchronisation...");
    syncDirtyItems();
});
