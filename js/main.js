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
