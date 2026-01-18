// ==========================================
// FICHIER 5 : GESTION DU PORTFOLIO (COLLECTION)
// ==========================================

// --- CALCUL & STATISTIQUES ---
async function calculateStorageUsage() {
    const elSmall = document.getElementById('storage-used');
    const elBig = document.getElementById('info-storage-size');
    
    let totalBytes = 0;

    try {
        // 1. Poids de la configuration et des amis (Texte JSON)
        const config = await db.getAll('config');
        const friendsList = await db.getAll('friends');
        totalBytes += new Blob([JSON.stringify(config)]).size;
        totalBytes += new Blob([JSON.stringify(friendsList)]).size;

        // 2. Poids de la collection (Items + Photos)
        if (collection && collection.length > 0) {
            collection.forEach(item => {
                // Poids des données textuelles de l'item (sans les photos)
                const { photos, ...textData } = item;
                totalBytes += new Blob([JSON.stringify(textData)]).size;

                // Poids des photos
                if (item.photos && Array.isArray(item.photos)) {
                    item.photos.forEach(photo => {
                        if (photo instanceof Blob) {
                            totalBytes += photo.size;
                        } else if (typeof photo === 'string') {
                            totalBytes += photo.length; 
                        }
                    });
                }
            });
        }

        // Formatage
        let sizeStr = "";
        if (totalBytes < 1024) sizeStr = totalBytes + " B";
        else if (totalBytes < 1024 * 1024) sizeStr = (totalBytes / 1024).toFixed(1) + " KB";
        else sizeStr = (totalBytes / (1024 * 1024)).toFixed(2) + " MB";

        if (elSmall) elSmall.innerText = `(${sizeStr})`;
        if (elBig) elBig.innerText = sizeStr;

    } catch (e) {
        console.error("Erreur calcul stockage:", e);
        if (elSmall) elSmall.innerText = "(?)";
    }
}

function updateDashboardStats() {
    const elTotal = document.getElementById('stats-total');
    if(!elTotal) return; // Sécurité si on n'est pas sur la home

    document.getElementById('stats-total').innerText = collection.length;
    document.getElementById('stats-weed').innerText = collection.filter(i => i.category === 'weed').length;
    document.getElementById('stats-hash').innerText = collection.filter(i => i.category === 'hash').length;
    document.getElementById('stats-mass').innerText = collection.reduce((a,c) => a + (parseFloat(c.quantity)||0), 0).toFixed(1) + 'g';
}

// --- AFFICHAGE LISTE ---
function renderCollectionList() {
    const c = document.getElementById('collection-list');
    if(!c) return;
    
    c.innerHTML = '';
    const emptyState = document.getElementById('empty-state');
    if(emptyState) emptyState.classList.toggle('hidden', collection.length > 0);
    
    [...collection].reverse().forEach(i => {
        const imgSrc = (i.photos && i.photos.length) ? getImageSrc(i.photos[0]) : null;
        const p = imgSrc ? `<img src="${imgSrc}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-3xl opacity-30">${i.category === 'hash' ? '🍫' : '🥦'}</div>`;
        const h = `
        <div onclick="openCollectionDetail(${i.id})" class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 relative group hover:border-emerald-300 transition cursor-pointer">
            <div class="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden relative">${p}</div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-slate-800 truncate pr-2">${escapeHTML(i.strain)}</h3>
                    <span class="text-xl">${getFlag(i.country)}</span>
                </div>
                <p class="text-xs text-slate-500 font-bold uppercase mb-1">${escapeHTML(i.commercialName || 'Inconnu')}</p>
                ${i.type ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded border border-amber-200 block w-fit mb-1">${escapeHTML(i.type)}</span>` : ''}
                <div class="flex items-center gap-2 mt-2">
                    <span class="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded font-bold">${i.quantity}g</span>
                </div>
            </div>
        </div>`;
        c.insertAdjacentHTML('beforeend', h);
    });
}

// --- FORMULAIRE & SAUVEGARDE ---
function openCollectionForm(id = null) {
    const f = document.getElementById('collection-form');
    f.reset();
    document.getElementById('editId').value = id || "";
    currentPhotos = [];
    const d = new Date().toISOString().split('T')[0];
    document.getElementById('inp-date').value = d;
    
    if (id) {
        const i = collection.find(x => x.id == id);
        if (i) {
            document.getElementById('inp-category').value = i.category;
            document.getElementById('inp-quantity').value = i.quantity;
            document.getElementById('inp-strain').value = i.strain;
            document.getElementById('inp-commercialName').value = i.commercialName;
            document.getElementById('inp-country').value = i.country;
            document.getElementById('inp-price').value = i.price;
            if (i.type) document.getElementById('inp-hashType').value = i.type;
            document.getElementById('inp-observation').value = i.observation || "";
            if (i.date) document.getElementById('inp-date').value = i.date.split('T')[0];
            toggleFormFields(i.category);
            if (i.photos) currentPhotos = [...i.photos];
        }
    } else {
        toggleFormFields('weed');
    }
    renderPhotoPreviews();
    document.getElementById('collection-modal').classList.remove('hidden');
}

function closeCollectionForm() {
    document.getElementById('collection-modal').classList.add('hidden');
}

function toggleFormFields(c) {
    const hashFields = document.getElementById('hash-fields');
    if(hashFields) hashFields.classList.toggle('hidden', c !== 'hash');
}

async function handleCollectionSubmit(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const eid = document.getElementById('editId').value;
    const dr = f.get('date');
    const do_ = dr ? new Date(dr + 'T12:00:00') : new Date();
    
    const i = {
        category: f.get('category'),
        quantity: f.get('quantity'),
        strain: f.get('strain'),
        commercialName: f.get('commercialName'),
        farm: f.get('farm'),
        type: f.get('hashType'),
        country: f.get('country'),
        price: f.get('price'),
        observation: f.get('observation'),
        photos: currentPhotos,
        date: do_.toISOString()
    };
    
    if (eid) i.id = parseInt(eid);
    await saveCollectionItem(i);
    closeCollectionForm();
}

// CŒUR DE LA SYNCHRONISATION
async function saveCollectionItem(item) {
    try {
        // 1. Marquer comme "sale" (non synchronisé)
        item._dirty = true;

        // 2. Sauvegarde Locale (Priorité absolue)
        const id = await db.save('collection', item);
        item.id = id; 
        
        // Mise à jour UI immédiate (Optimistic)
        collection = await db.getAll('collection');
        updateDashboardStats();
        renderCollectionList();
        calculateStorageUsage();

        // 3. Tentative Sync Cloud
        if(window.firebaseFuncs && firebaseInstance && myUid) {
            try {
                const { setDoc, doc } = window.firebaseFuncs;
                const { db: firestore, appId } = firebaseInstance;

                // Préparation cloud (Pas de photos, nettoyage)
                const cleanItem = { 
                    ...item, 
                    photos: [], 
                    strain: escapeHTML(item.strain),
                    observation: escapeHTML(item.observation || "")
                };
                delete cleanItem._dirty; 

                await setDoc(doc(firestore, 'artifacts', appId, 'users', myUid, 'portfolio', id.toString()), cleanItem);

                // 4. SUCCÈS : Retirer le flag dirty
                item._dirty = false;
                await db.save('collection', item); 
                console.log("☁️ Synchro Cloud réussie pour l'item " + id);

            } catch (cloudErr) {
                console.warn("⚠️ Mode Hors-ligne : L'item reste marqué '_dirty' pour plus tard.");
            }
        }
    } catch (e) { 
        console.error("Critical Save Error:", e); 
        alert("Erreur critique de sauvegarde locale !"); 
    }
}

async function syncDirtyItems() {
    if (!navigator.onLine || !window.firebaseFuncs || !firebaseInstance || !myUid) return;

    // Récupérer les items marqués 'dirty'
    // On s'assure d'avoir la version la plus fraîche de la collection
    const currentCollection = await db.getAll('collection');
    const dirtyItems = currentCollection.filter(i => i._dirty === true);

    if (dirtyItems.length === 0) return;

    console.log(`🔄 Tentative de synchronisation de ${dirtyItems.length} éléments en attente...`);
    
    const { setDoc, doc } = window.firebaseFuncs;
    const { db: firestore, appId } = firebaseInstance;
    let syncedCount = 0;

    for (const item of dirtyItems) {
        try {
            const cleanItem = { 
                ...item, 
                photos: [],
                strain: escapeHTML(item.strain),
                observation: escapeHTML(item.observation || "")
            };
            delete cleanItem._dirty;

            await setDoc(doc(firestore, 'artifacts', appId, 'users', myUid, 'portfolio', item.id.toString()), cleanItem);
            
            // Succès : on nettoie le flag
            item._dirty = false;
            await db.save('collection', item);
            syncedCount++;
        } catch (e) {
            console.error("Échec sync différée pour item " + item.id, e);
        }
    }
    
    if (syncedCount > 0) {
        console.log(`✅ ${syncedCount} éléments synchronisés avec succès.`);
        collection = await db.getAll('collection'); // Mise à jour mémoire
    }
}

async function deleteCollectionItem(id) {
    if(confirm('Supprimer ?')) {
        await db.delete('collection', id);
        collection = await db.getAll('collection');
        updateDashboardStats();
        renderCollectionList();
        calculateStorageUsage();
        closeCollectionDetail();
        
        // Suppression Cloud
        if(window.firebaseFuncs && firebaseInstance && myUid) {
            try {
                const { deleteDoc, doc } = window.firebaseFuncs;
                const { db: firestore, appId } = firebaseInstance;
                await deleteDoc(doc(firestore, 'artifacts', appId, 'users', myUid, 'portfolio', id.toString()));
            } catch(e) {}
        }
    }
}

// --- DÉTAILS ITEM ---
function openCollectionDetail(id) {
    const i = collection.find(x => x.id == id);
    if (!i) return;
    document.getElementById('cd-strain').innerText = i.strain;
    document.getElementById('cd-commercial').innerText = i.commercialName || 'Sans nom';
    document.getElementById('cd-flag').innerText = getFlag(i.country);
    document.getElementById('cd-quantity').innerText = i.quantity + 'g';
    document.getElementById('cd-price').innerText = i.price + '€';
    document.getElementById('cd-category').innerText = i.category === 'hash' ? 'Hash 🍫' : 'Weed 🥦';
    document.getElementById('cd-date').innerText = new Date(i.date).toLocaleDateString();
    document.getElementById('cd-farm').innerText = i.farm || 'Inconnu';
    
    const hashBadge = document.getElementById('cd-hash-badge');
    if (i.category === 'hash' && i.type) {
        hashBadge.innerText = i.type;
        hashBadge.classList.remove('hidden');
    } else {
        hashBadge.classList.add('hidden');
    }

    if (i.observation) {
        document.getElementById('cd-observation').innerText = i.observation;
        document.getElementById('cd-observation-container').classList.remove('hidden');
    } else {
        document.getElementById('cd-observation-container').classList.add('hidden');
    }
    
    document.getElementById('cd-btn-edit').onclick = () => { closeCollectionDetail(); openCollectionForm(id); };
    document.getElementById('cd-btn-delete').onclick = () => { deleteCollectionItem(id); };
    
    const m = document.getElementById('cd-main-img');
    const t = document.getElementById('cd-thumbs');
    t.innerHTML = '';
    
    if (i.photos && i.photos.length > 0) {
        m.src = getImageSrc(i.photos[0]); 
        m.classList.remove('opacity-30', 'p-10');
        
        if (i.photos.length > 1) {
            i.photos.forEach(s => {
                const el = document.createElement('img');
                el.src = getImageSrc(s);
                el.className = "w-12 h-12 rounded-lg border-2 border-white/50 cursor-pointer object-cover";
                el.onclick = () => m.src = getImageSrc(s);
                t.appendChild(el);
            });
        }
    } else {
        m.src = "";
    }
    document.getElementById('collection-detail-modal').classList.remove('hidden');
}

function closeCollectionDetail() {
    document.getElementById('collection-detail-modal').classList.add('hidden');
}

// --- GESTION PHOTOS FORMULAIRE ---
async function handlePhotos(i) {
    if (i.files) {
        for (const f of i.files) {
            try { currentPhotos.push(await compressImage(f, 1200, 0.8)); } catch {}
        }
        renderPhotoPreviews();
    }
}

function renderPhotoPreviews() {
    document.getElementById('photo-preview-list').innerHTML = currentPhotos.map((s, i) => `
        <div class="w-20 h-20 rounded-xl relative overflow-hidden group flex-shrink-0">
            <img src="${getImageSrc(s)}" class="w-full h-full object-cover">
            <button type="button" onclick="currentPhotos.splice(${i},1);renderPhotoPreviews()" class="absolute top-0 right-0 bg-red-500 text-white text-xs p-1 opacity-0 group-hover:opacity-100">X</button>
        </div>`).join('');
}
