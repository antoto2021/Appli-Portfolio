// --- FONCTION PRINCIPALE (MAIN) ---

function showView(viewId) {
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove('hidden');
    
    const navBack = document.getElementById('navBackBtn');
    const editBtn = document.getElementById('editModeBtn');
    
    if (viewId === 'home') {
        navBack.classList.add('hidden');
        editBtn.classList.remove('hidden');
    } else {
        navBack.classList.remove('hidden');
        editBtn.classList.add('hidden');
    }
    
    const infoBtn = document.querySelector('button[onclick="showView(\'info\')"]');
    if(infoBtn) infoBtn.style.display = (viewId === 'home' || viewId === 'info') ? 'flex' : 'none';
    
    window.scrollTo(0,0);
    
    if(viewId === 'collection') renderCollectionList();
    if(viewId === 'info') renderInfoView();
    if(viewId === 'cali-friends') loadCaliMembers();
    if(viewId === 'cali-spots') loadCaliLocations('spot');
    if(viewId === 'cali-wishlist') loadCaliLocations('wish');
    if(viewId === 'cali-games') { renderGamesGrid(); loadActivePlayers(); }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode-active', isEditMode);
    document.getElementById('edit-banner').classList.toggle('hidden', !isEditMode);
    document.getElementById('editModeBtn').classList.toggle('bg-amber-500', isEditMode);
    document.getElementById('add-section-area').classList.toggle('hidden', !isEditMode);
    
    document.querySelectorAll('[data-editable]').forEach(e => {
        if(isEditMode) {
            e.classList.add('editable-highlight');
            e.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); editContent(ev.target.closest('[data-editable]')); };
        } else {
            e.classList.remove('editable-highlight');
            e.onclick = null;
        }
    });
    renderCustomSections();
}

async function editContent(e) {
    if(!isEditMode || !e) return;
    const k = e.getAttribute('data-editable');
    const t = prompt("Modifier:", e.innerText);
    if(t !== null && t !== e.innerText) {
        e.innerText = t;
        contentMap[k] = t;
        await db.save('config', {key: 'contentMap', value: contentMap});
    }
}

function loadSavedContent() {
    document.querySelectorAll('[data-editable]').forEach(e => {
        const k = e.getAttribute('data-editable');
        if(contentMap[k]) e.innerText = contentMap[k];
    });
    renderCustomSections();
}

async function calculateStorageUsage() {
    const elSmall = document.getElementById('storage-used');
    const elBig = document.getElementById('info-storage-size');
    let totalBytes = 0;
    try {
        const config = await db.getAll('config');
        const friends = await db.getAll('friends');
        totalBytes += new Blob([JSON.stringify(config)]).size;
        totalBytes += new Blob([JSON.stringify(friends)]).size;
        if (collection && collection.length > 0) {
            collection.forEach(item => {
                const { photos, ...textData } = item;
                totalBytes += new Blob([JSON.stringify(textData)]).size;
                if (item.photos && Array.isArray(item.photos)) {
                    item.photos.forEach(photo => {
                        if (photo instanceof Blob) { totalBytes += photo.size; } else if (typeof photo === 'string') { totalBytes += photo.length; }
                    });
                }
            });
        }
        let sizeStr = "";
        if (totalBytes < 1024) sizeStr = totalBytes + " B";
        else if (totalBytes < 1024 * 1024) sizeStr = (totalBytes / 1024).toFixed(1) + " KB";
        else sizeStr = (totalBytes / (1024 * 1024)).toFixed(2) + " MB";
        if (elSmall) elSmall.innerText = `(${sizeStr})`;
        if (elBig) elBig.innerText = sizeStr;
    } catch (e) { console.error("Erreur calcul stockage:", e); if (elSmall) elSmall.innerText = "(?)"; }
}

function updateDashboardStats() {
    document.getElementById('stats-total').innerText = collection.length;
    document.getElementById('stats-weed').innerText = collection.filter(i => i.category === 'weed').length;
    document.getElementById('stats-hash').innerText = collection.filter(i => i.category === 'hash').length;
    document.getElementById('stats-mass').innerText = collection.reduce((a,c) => a + (parseFloat(c.quantity)||0), 0).toFixed(1) + 'g';
}

function renderCollectionList() {
    const c = document.getElementById('collection-list');
    c.innerHTML = '';
    document.getElementById('empty-state').classList.toggle('hidden', collection.length > 0);
    [...collection].reverse().forEach(i => {
        const imgSrc = (i.photos && i.photos.length) ? getImageSrc(i.photos[0]) : null;
        const p = imgSrc ? `<img src="${imgSrc}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-3xl opacity-30">${i.category === 'hash' ? '🍫' : '🥦'}</div>`;
        const h = `
        <div onclick="openCollectionDetail(${i.id})" class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 relative group hover:border-emerald-300 transition cursor-pointer">
            <div class="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden relative">${p}</div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start"><h3 class="font-bold text-slate-800 truncate pr-2">${escapeHTML(i.strain)}</h3><span class="text-xl">${getFlag(i.country)}</span></div>
                <p class="text-xs text-slate-500 font-bold uppercase mb-1">${escapeHTML(i.commercialName || 'Inconnu')}</p>
                ${i.type ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded border border-amber-200 block w-fit mb-1">${escapeHTML(i.type)}</span>` : ''}
                <div class="flex items-center gap-2 mt-2"><span class="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded font-bold">${i.quantity}g</span></div>
            </div>
        </div>`;
        c.insertAdjacentHTML('beforeend', h);
    });
}

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

async function handleCollectionSubmit(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const eid = document.getElementById('editId').value;
    const dr = f.get('date');
    const do_ = dr ? new Date(dr + 'T12:00:00') : new Date();
    
    const i = {
        category: f.get('category'), quantity: f.get('quantity'), strain: f.get('strain'),
        commercialName: f.get('commercialName'), farm: f.get('farm'), type: f.get('hashType'),
        country: f.get('country'), price: f.get('price'), observation: f.get('observation'),
        photos: currentPhotos, date: do_.toISOString()
    };
    
    if (eid) i.id = parseInt(eid);
    await saveCollectionItem(i);
    closeCollectionForm();
}

function closeCollectionForm() { document.getElementById('collection-modal').classList.add('hidden'); }

async function saveCollectionItem(item) {
try {
        item._dirty = true;
        const id = await db.save('collection', item);
        item.id = id; 
        
        collection = await db.getAll('collection');
        updateDashboardStats();
        renderCollectionList();
        calculateStorageUsage();

        if(window.firebaseFuncs && firebaseInstance) {
            try {
                const { setDoc, doc } = window.firebaseFuncs;
                const { db: firestore, appId } = firebaseInstance;
                const cleanItem = { ...item, photos: [], strain: escapeHTML(item.strain), observation: escapeHTML(item.observation || "") };
                delete cleanItem._dirty; 
                await setDoc(doc(firestore, 'artifacts', appId, 'users', myUid, 'portfolio', id.toString()), cleanItem);
                item._dirty = false;
                await db.save('collection', item); 
                console.log("☁️ Synchro Cloud réussie pour l'item " + id);
            } catch (cloudErr) { console.warn("⚠️ Mode Hors-ligne : L'item reste marqué '_dirty' pour plus tard."); }
        }
    } catch (e) { console.error("Critical Save Error:", e); alert("Erreur critique de sauvegarde locale !"); }
}

async function syncDirtyItems() {
    if (!navigator.onLine || !window.firebaseFuncs || !firebaseInstance || !myUid) return;
    const dirtyItems = collection.filter(i => i._dirty === true);
    if (dirtyItems.length === 0) return;
    console.log(`🔄 Tentative de synchronisation de ${dirtyItems.length} éléments en attente...`);
    
    const { setDoc, doc } = window.firebaseFuncs;
    const { db: firestore, appId } = firebaseInstance;
    let syncedCount = 0;

    for (const item of dirtyItems) {
        try {
            const cleanItem = { ...item, photos: [], strain: escapeHTML(item.strain), observation: escapeHTML(item.observation || "") };
            delete cleanItem._dirty;
            await setDoc(doc(firestore, 'artifacts', appId, 'users', myUid, 'portfolio', item.id.toString()), cleanItem);
            item._dirty = false;
            await db.save('collection', item);
            syncedCount++;
        } catch (e) { console.error("Échec sync différée pour item " + item.id, e); }
    }
    
    if (syncedCount > 0) {
        console.log(`✅ ${syncedCount} éléments synchronisés avec succès.`);
        collection = await db.getAll('collection');
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
        if(window.firebaseFuncs && firebaseInstance) {
            try {
                const { deleteDoc, doc } = window.firebaseFuncs;
                const { db: firestore, appId } = firebaseInstance;
                await deleteDoc(doc(firestore, 'artifacts', appId, 'users', myUid, 'portfolio', id.toString()));
            } catch(e) {}
        }
    }
}

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
    if (i.category === 'hash' && i.type) { hashBadge.innerText = i.type; hashBadge.classList.remove('hidden'); } else { hashBadge.classList.add('hidden'); }
    if (i.observation) { document.getElementById('cd-observation').innerText = i.observation; document.getElementById('cd-observation-container').classList.remove('hidden'); } else { document.getElementById('cd-observation-container').classList.add('hidden'); }
    
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
    } else { m.src = ""; }
    document.getElementById('collection-detail-modal').classList.remove('hidden');
}

function closeCollectionDetail() { document.getElementById('collection-detail-modal').classList.add('hidden'); }

async function handlePhotos(i) {
    if (i.files) {
        for (const f of i.files) { try { currentPhotos.push(await compressImage(f, 1200, 0.8)); } catch {} }
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

function openSectionModal(id = null) {
    document.getElementById('section-form').reset();
    document.getElementById('sec-current-image').classList.add('hidden');
    currentSectionImage = null;
    if (id) {
        const s = customSections.find(x => x.id === id);
        document.getElementById('sec-id').value = s.id;
        document.getElementById('sec-title').value = s.title;
        document.getElementById('sec-text').value = s.text;
        if (s.image) {
            currentSectionImage = s.image;
            document.querySelector('#sec-current-image img').src = s.image;
            document.getElementById('sec-current-image').classList.remove('hidden');
        }
    }
    document.getElementById('section-modal').classList.remove('hidden');
}

function closeSectionModal() { document.getElementById('section-modal').classList.add('hidden'); }

async function handleSectionSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const id = f.secId.value ? parseInt(f.secId.value) : Date.now();
    const fi = document.getElementById('sec-photo-input').files[0];
    if (fi) currentSectionImage = await compressImage(fi, 800, 0.7);
    
    const s = { id, title: f.secTitle.value, text: f.secText.value, image: currentSectionImage };
    const i = customSections.findIndex(x => x.id === id);
    if (i > -1) customSections[i] = s; else customSections.push(s);
    
    await db.save('config', { key: 'customSections', value: customSections });
    renderCustomSections();
    closeSectionModal();
}

async function deleteCustomSection(id) {
    if (confirm('Supprimer ?')) {
        customSections = customSections.filter(x => x.id !== id);
        await db.save('config', { key: 'customSections', value: customSections });
        renderCustomSections();
    }
}

function renderCustomSections() {
    document.getElementById('custom-sections-container').innerHTML = customSections.map((s, i) => `
        <section class="bg-white rounded-2xl shadow-md p-8 border-l-8 border-emerald-600 relative group animate-fade-in text-justify">
            ${isEditMode ? `<div class="absolute top-4 right-4 flex gap-2"><button onclick="openSectionModal(${s.id})" class="text-blue-500 font-bold border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 text-xs">Modifier</button><button onclick="deleteCustomSection(${s.id})" class="text-red-500 font-bold border border-red-200 px-3 py-1 rounded hover:bg-red-50 text-xs">Supprimer</button></div>` : ''}
            <h2 class="section-title">${i + 8}. ${escapeHTML(s.title)}</h2>
            <div class="text-lg leading-relaxed text-slate-600 whitespace-pre-wrap">${escapeHTML(s.text)}</div>
        </section>`).join('');
}

async function promptAddFriend() {
    const fid = prompt("Entrez l'ID Unique de votre ami :");
    if (fid && fid.length > 5) {
        const name = prompt("Nom de l'ami :") || "Ami";
        const initial = name.charAt(0).toUpperCase();
        await db.save('friends', { id: fid, name: name, initial: initial });
        friends = await db.getAll('friends');
        renderFriendsList();
    }
}

function renderFriendsList() {
    const container = document.getElementById('friends-list');
    if (!container) return; 
    const addBtn = container.querySelector('.add-btn');
    container.innerHTML = '';
    friends.forEach(f => {
        const el = document.createElement('div');
        el.className = 'friend-avatar bg-blue-500 hover:bg-blue-600 border-2 border-white text-white shadow-sm';
        el.innerText = f.initial; el.title = f.name; el.onclick = () => viewFriendPortfolio(f);
        container.appendChild(el);
    });
    if(addBtn) container.appendChild(addBtn);
}

async function viewFriendPortfolio(friend) {
    if (!firebaseInstance || !window.firebaseFuncs) { alert("Connexion Cloud nécessaire."); return; }
    currentViewingFriendId = friend.id;
    showView('friend');
    document.getElementById('friend-view-name').innerText = friend.name;
    document.getElementById('friend-collection-list').innerHTML = '<div class="col-span-full text-center py-10"><div class="wn-loader"></div></div>';
    document.getElementById('friend-empty-state').classList.add('hidden');
    try {
        const { getDocs, collection: fsCol } = window.firebaseFuncs;
        const { db: firestore, appId } = firebaseInstance;
        const snapshot = await getDocs(fsCol(firestore, 'artifacts', appId, 'users', friend.id, 'portfolio'));
        const items = []; snapshot.forEach(d => items.push(d.data()));
        currentFriendItems = items; 
        renderFriendCollection(items);
    } catch (e) { alert("Impossible de charger."); showView('home'); }
}

async function deleteCurrentFriend() {
    if (!currentViewingFriendId) return;
    if (confirm("Voulez-vous vraiment retirer cet ami de votre liste locale ?")) {
        try {
            await db.delete('friends', currentViewingFriendId);
            friends = await db.getAll('friends');
            renderFriendsList();
            alert("Ami supprimé.");
            showView('collection');
        } catch (e) { console.error(e); alert("Erreur lors de la suppression."); }
    }
}

function renderFriendCollection(items) {
    const c = document.getElementById('friend-collection-list'); c.innerHTML = '';
    if (items.length === 0) { document.getElementById('friend-empty-state').classList.remove('hidden'); return; }
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    items.forEach((i, index) => {
        const h = `
        <div onclick="openFriendDetail(${index})" class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 opacity-90 cursor-pointer hover:shadow-md transition">
        <div class="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-3xl opacity-50">${i.category === 'hash' ? '🍫' : '🥦'}</div>
        <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start"><h3 class="font-bold text-slate-800 truncate pr-2">${escapeHTML(i.strain)}</h3><span class="text-xl">${getFlag(i.country)}</span></div>
            <p class="text-xs text-slate-500 font-bold uppercase mb-1">${escapeHTML(i.commercialName || 'Inconnu')}</p>
            ${i.type ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded border border-amber-200 block w-fit mb-1">${escapeHTML(i.type)}</span>` : ''}
            <div class="flex items-center gap-2 mt-2"><span class="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded font-bold">${escapeHTML(i.quantity)}g</span><span class="text-[10px] text-slate-400 ml-auto">${new Date(i.date).toLocaleDateString()}</span></div>
            ${i.observation ? `<p class="mt-2 text-xs text-slate-600 italic border-t pt-1 truncate">"${escapeHTML(i.observation)}"</p>` : ''}
        </div>
        </div>`;
        c.insertAdjacentHTML('beforeend', h);
    });
}

function openFriendDetail(index) {
    const item = currentFriendItems[index];
    if(!item) return;
    document.getElementById('fd-strain').innerText = item.strain;
    document.getElementById('fd-commercial').innerText = item.commercialName || item.farm || 'Sans nom';
    if(item.category === 'hash' && item.type) { const badge = document.getElementById('fd-hash-badge'); badge.innerText = item.type; badge.classList.remove('hidden'); } else { document.getElementById('fd-hash-badge').classList.add('hidden'); }
    document.getElementById('fd-flag').innerText = getFlag(item.country);
    document.getElementById('fd-quantity').innerText = item.quantity + 'g';
    document.getElementById('fd-price').innerText = item.price + '€';
    document.getElementById('fd-category').innerText = item.category === 'hash' ? 'Hash 🍫' : 'Weed 🥦';
    document.getElementById('fd-date').innerText = new Date(item.date).toLocaleDateString();
    if(item.observation){ document.getElementById('fd-observation').innerText = item.observation; document.getElementById('fd-observation-container').classList.remove('hidden'); } else { document.getElementById('fd-observation-container').classList.add('hidden'); }
    document.getElementById('fd-farm').innerText = item.farm || 'Inconnu';
    document.getElementById('friend-detail-modal').classList.remove('hidden');
}

function closeFriendDetail() { document.getElementById('friend-detail-modal').classList.add('hidden'); }

function copyToClipboard() {
    if (!myUid) return alert("ID non chargé.");
    navigator.clipboard.writeText(myUid).then(() => {
        const btn = document.getElementById('btn-copy-id');
        const originalText = btn.innerText;
        btn.innerText = "✅ Copié !";
        btn.classList.add('bg-green-100', 'text-green-700', 'border-green-300');
        setTimeout(() => { btn.innerText = originalText; btn.classList.remove('bg-green-100', 'text-green-700', 'border-green-300'); }, 2000);
    }).catch(err => { console.error('Erreur copie:', err); alert("Impossible de copier automatiquement."); });
}

async function shareId() {
    if (!myUid) return alert("ID non chargé.");
    const shareData = { title: 'Mon ID Green Codex', text: `Salut ! Ajoute-moi sur Green Codex pour voir ma collection. Mon ID est : ${myUid}`, };
    if (navigator.share) { try { await navigator.share(shareData); } catch (err) {} } 
    else { copyToClipboard(); alert("Le menu de partage n'est pas dispo sur ce navigateur. L'ID a été copié !"); }
}

function toggleFormFields(c) { document.getElementById('hash-fields').classList.toggle('hidden', c !== 'hash'); }

function toggleSection(id) { const e = document.getElementById(id); if(e) { e.classList.toggle('expanded'); } }

async function checkGitHubStatus() {
    if (GITHUB_USERNAME === 'antoto2021') console.log("GitHub Check");
    const c = await fetchLatestCommit();
    if (!c) return;
    const rh = c.sha, sh = localStorage.getItem(UPDATE_STORAGE_KEY);
    if (!sh) { localStorage.setItem(UPDATE_STORAGE_KEY, rh); localStorage.setItem(UPDATE_TIME_KEY, Date.now()); } 
    else if (sh !== rh) { triggerUpdateUI(); const p = parseCommitMessage(c.commit.message); if (p.length > 0) activeUpdates = p; }
}

async function fetchLatestCommit() {
    try { const r = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/commits?per_page=1&t=${Date.now()}`); if (!r.ok) return null; const d = await r.json(); return d[0]; } catch { return null; }
}

function triggerUpdateUI() {
    document.getElementById('updateDot').style.display = 'block';
    document.getElementById('updateAlert').style.display = 'flex';
    const a = document.querySelector('.arrow-pointer');
    a.classList.remove('bouncing');
    void a.offsetWidth;
    a.classList.add('bouncing');
}

function forceUpdate() {
    document.getElementById('refreshBtn').classList.add('rotating');
    setTimeout(() => { const u = window.location.href.split('?')[0]; window.location.href = u + '?v=' + Date.now(); }, 500);
}

async function verifyUpdate(btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Vérification...";
    btn.disabled = true;
    try {
        await renderInfoView(); 
        const local = localStorage.getItem(UPDATE_STORAGE_KEY);
        const remote = document.getElementById('info-remote-hash').innerText.replace('...', '');
        if (local && local.substring(0, 7) === remote) { btn.innerHTML = "✅ À jour"; } 
        else { btn.innerHTML = "🚀 M.à.j dispo !"; triggerUpdateUI(); }
    } catch(e) { btn.innerHTML = "❌ Erreur"; }
    setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
}

async function exportBackup() {
    const data = { collection: await db.getAll('collection'), customSections: customSections, timestamp: Date.now() };
    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GreenCodex_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

async function importBackup(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if(data.collection && Array.isArray(data.collection)) {
                if(confirm(`Restaurer ${data.collection.length} éléments ? Cela fusionnera avec votre collection actuelle.`)) {
                    for(const item of data.collection) { await db.save('collection', item); }
                    if(data.customSections && Array.isArray(data.customSections)) { customSections = data.customSections; await db.save('config', {key: 'customSections', value: customSections}); }
                    alert('Restauration terminée avec succès !');
                    location.reload();
                }
            } else { alert('Format de fichier invalide.'); }
        } catch(err) { alert('Erreur lors de la lecture du fichier de sauvegarde.'); console.error(err); }
    };
    reader.readAsText(file);
}

async function handlePostUpdate() {
    const c = await fetchLatestCommit();
    if (!c) return;
    const rh = c.sha, sh = localStorage.getItem(UPDATE_STORAGE_KEY);
    if (sh === rh) { const u = new URL(window.location.href); u.searchParams.delete('v'); window.history.replaceState({}, document.title, u.toString()); return; }
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

function parseCommitMessage(m) {
    const l = m.split('\n'), u = [], r = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
    l.forEach(x => {
        const c = x.trim();
        if (c.match(/^[*+-]\s/)) {
            let t = c.substring(2).trim(), p = t.split(':');
            if (p.length >= 2) {
                const tp = p[0].trim(), dp = p.slice(1).join(':').trim();
                let i = "✨", tt = tp;
                const ma = tp.match(r);
                if (ma && tp.indexOf(ma[0]) === 0) { i = ma[0]; tt = tp.replace(ma[0], '').trim(); }
                u.push({ icon: i, title: tt, desc: dp });
            }
        }
    });
    return u;
}

function renderSlides() {
    const c = document.getElementById('wn-content'), d = document.getElementById('wn-dots');
    if (activeUpdates.length === 0) { c.innerHTML = `<div class="wn-slide" style="display:block">...</div>`; return; }
    c.innerHTML = activeUpdates.map((s, i) => `<div class="wn-slide" id="slide-${i}"><span class="wn-icon">${s.icon}</span><span class="wn-slide-title">${s.title}</span><p class="wn-desc">${s.desc}</p></div>`).join('');
    d.innerHTML = activeUpdates.map((_, i) => `<div class="wn-dot" id="dot-${i}"></div>`).join('');
}

function updateSlideUI() {
    document.querySelectorAll('.wn-slide').forEach((e, i) => { e.style.display = i === currentSlide ? 'block' : 'none'; });
    document.querySelectorAll('.wn-dot').forEach((e, i) => { if (i === currentSlide) e.classList.add('active'); else e.classList.remove('active'); });
    const b = document.getElementById('wn-btn');
    if (currentSlide === activeUpdates.length - 1) { b.innerHTML = "Compris ✅"; b.style.backgroundColor = "#166534"; } else { b.innerHTML = "Suivant ➜"; b.style.backgroundColor = "#15803d"; }
}

function nextSlide() { if (currentSlide < activeUpdates.length - 1) { currentSlide++; updateSlideUI(); } else { closePopup(); } }

function closePopup() {
    const o = document.getElementById('wn-overlay');
    o.classList.remove('show-modal');
    setTimeout(() => {
        o.style.display = 'none';
        const u = new URL(window.location.href);
        if (u.searchParams.has('v')) { u.searchParams.delete('v'); window.history.replaceState({}, document.title, u.toString()); }
    }, 300);
}

function openTutorial() {
    activeUpdates = tutorialSlides;
    currentSlide = 0;
    const b = document.getElementById('wn-badge-text');
    b.innerText = "Tutoriel";
    b.style.backgroundColor = "#F59E0B";
    b.style.color = "#fff";
    document.getElementById('wn-main-title').innerText = "Guide";
    const o = document.getElementById('wn-overlay');
    o.style.display = 'flex';
    setTimeout(() => o.classList.add('show-modal'), 10);
    renderSlides();
    updateSlideUI();
    document.getElementById('wn-btn').style.display = 'flex';
}

async function renderInfoView() {
    const lh = localStorage.getItem(UPDATE_STORAGE_KEY) || 'Aucun';
    document.getElementById('info-local-hash').innerText = lh.substring(0, 7) + '...';
    
    const lt = localStorage.getItem(UPDATE_TIME_KEY);
    if (lt) {
        const diffMs = Date.now() - parseInt(lt);
        const m = Math.floor(diffMs / 60000);
        let timeStr;
        if (m < 60) { timeStr = `Il y a ${m} min`; } 
        else if (m < 1440) { timeStr = `Il y a ${Math.floor(m / 60)} h`; } 
        else if (m < 43200) { timeStr = `Il y a ${Math.floor(m / 1440)} j`; } 
        else { timeStr = `Il y a ${Math.floor(m / 43200)} mois`; }
        document.getElementById('info-local-date').innerText = timeStr;
    } else { document.getElementById('info-local-date').innerText = "Date inconnue"; }

    const sd = document.getElementById('connection-status'), re = document.getElementById('info-remote-hash');
    re.innerText = "...";
    sd.className = "w-2 h-2 rounded-full bg-gray-400";
    const rc = await fetchLatestCommit();
    if (rc) { re.innerText = rc.sha.substring(0, 7) + '...'; sd.classList.remove('bg-gray-400'); sd.classList.add('bg-green-500'); } 
    else { re.innerText = "Offline"; sd.classList.remove('bg-gray-400'); sd.classList.add('bg-red-500'); }
    if (myUid) document.getElementById('my-uid-display').innerText = myUid;
}

// --- INITIALISATION PRINCIPALE ---
async function initApp() {
    try {
        await db.init();
        const legacyCol = localStorage.getItem('green_codex_collection_v4');
        if (legacyCol) { const p = JSON.parse(legacyCol); if (p.length > 0) { for (let i of p) { delete i.id; await db.save('collection', i); } } localStorage.removeItem('green_codex_collection_v4'); }
        const legacyCt = localStorage.getItem('green_codex_content_v4');
        if (legacyCt) { await db.save('config', { key: 'contentMap', value: JSON.parse(legacyCt) }); localStorage.removeItem('green_codex_content_v4'); }
        const legacySc = localStorage.getItem('green_codex_custom_sections_v4');
        if (legacySc) { await db.save('config', { key: 'customSections', value: JSON.parse(legacySc) }); localStorage.removeItem('green_codex_custom_sections_v4'); }

        collection = await db.getAll('collection');
        friends = await db.getAll('friends');
        renderFriendsList();
        const cc = (await db.getAll('config')).find(c => c.key === 'contentMap'); contentMap = cc ? cc.value : {};
        const cs = (await db.getAll('config')).find(c => c.key === 'customSections'); customSections = cs ? cs.value : [];
        loadSavedContent(); 
        updateDashboardStats(); 
        calculateStorageUsage(); 
        initCharts();

        if (window.initFirebase) {
            firebaseInstance = await window.initFirebase();
            if (firebaseInstance) {
                myUid = firebaseInstance.user.uid;
                await db.save('config', { key: 'user_uid', value: myUid });
                setTimeout(() => syncDirtyItems(), 3000);
            } else {
                const su = (await db.getAll('config')).find(c => c.key === 'user_uid');
                if (su) myUid = su.value;
            }
        }
        setTimeout(() => checkGitHubStatus(), 5000);
    } catch (e) { console.error("Init Error:", e); }
}

window.addEventListener('load', () => { 
    const u = new URLSearchParams(window.location.search);
    const sA = document.getElementById('selectA'), sB = document.getElementById('selectB');
    if(sA && sB) {
        Object.keys(masterData).forEach(k => { sA.add(new Option(masterData[k].name, k)); sB.add(new Option(masterData[k].name, k)); });
        sA.value = "weed_sativa"; sB.value = "hash_rosin";
    }
    
    initApp().then(() => { if (u.has('v')) handlePostUpdate(); });
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker enregistré ✅'))
            .catch(err => console.log('Erreur SW ❌', err));
    });
}

window.addEventListener('online', () => {
    console.log("🌐 Connexion rétablie. Lancement de la synchronisation...");
    syncDirtyItems();
});
