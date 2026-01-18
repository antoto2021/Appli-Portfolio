// --- LOGIQUE CALI TEAM (GROUPE UNIQUE) ---

async function openCaliTeam() {
    if (!firebaseInstance) { alert("Connexion requise"); return; }
    showView('cali-hub');
    try {
        const { doc, getDoc, setDoc } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        const groupRef = doc(db, 'groups', CALI_GROUP_ID);
        const groupSnap = await getDoc(groupRef);
        if (!groupSnap.exists()) {
            await setDoc(groupRef, { name: "Cali Team", members: [myUid], createdAt: new Date().toISOString() });
        }
    } catch(e) { console.error("Err Cali Init", e); }
}

async function loadCaliMembers() {
    const container = document.getElementById('cali-members-list');
    container.innerHTML = '<div class="wn-loader"></div>';
    try {
        const { doc, getDoc } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        const snap = await getDoc(doc(db, 'groups', CALI_GROUP_ID));
        if (snap.exists()) {
            const members = snap.data().members || [];
            container.innerHTML = '';
            if(members.length === 0) { container.innerHTML = '<div class="text-center text-slate-400 italic">Aucun membre.</div>'; return; }

            members.forEach(uid => {
                const displayName = getFriendName(uid);
                const isMe = uid === myUid;
                const initial = displayName.charAt(0).toUpperCase();
                const html = `
                <div onclick="viewPortfolioByUid('${uid}', '${escapeHTML(displayName)}')" class="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm flex items-center gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition group relative">
                    <div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black text-xl shadow-inner">${initial}</div>
                    <div class="flex-1 min-w-0"><h4 class="font-bold text-slate-800 truncate">${escapeHTML(displayName)}</h4><p class="text-[10px] text-slate-400 font-mono truncate">ID: ${uid.substring(0,6)}...</p></div>
                    ${!isMe ? `<button onclick="removeMemberFromCali('${uid}', event)" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-500 transition z-10" title="Retirer du groupe">✕</button>` : '<span class="text-xs font-bold text-indigo-200">Moi</span>'}
                    <div class="absolute right-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-xs font-bold text-indigo-500 mr-2">Voir 👁️</div>
                </div>`;
                container.insertAdjacentHTML('beforeend', html);
            });
        }
    } catch(e) { console.error(e); container.innerHTML = '<div class="text-red-400 text-center">Erreur chargement.</div>'; }
}

function viewPortfolioByUid(uid, name) {
    const friendObj = { id: uid, name: name };
    viewFriendPortfolio(friendObj);
}

async function removeMemberFromCali(uidTarget, event) {
    event.stopPropagation();
    if(!confirm("Retirer cet utilisateur du groupe Cali Team ?")) return;
    try {
        const { doc, getDoc, updateDoc } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        const groupRef = doc(db, 'groups', CALI_GROUP_ID);
        const snap = await getDoc(groupRef);
        if(snap.exists()) {
            const currentMembers = snap.data().members || [];
            const newMembers = currentMembers.filter(id => id !== uidTarget);
            await updateDoc(groupRef, { members: newMembers });
            loadCaliMembers();
        }
    } catch(e) { alert("Erreur suppression : " + e.message); }
}

async function addMemberToCali() {
    if (!firebaseInstance) { alert("Erreur : Connexion requise."); return; }
    const inputUid = prompt("Entrez l'ID Unique de l'ami à ajouter :");
    if (!inputUid || inputUid.trim() === "") return;
    const newUid = inputUid.trim();
    const inputName = prompt("Comment voulez-vous nommer cet ami ? (Ex: Pascal)");
    const friendName = inputName && inputName.trim() !== "" ? inputName.trim() : "Ami Inconnu";
    const friendInitial = friendName.charAt(0).toUpperCase();

    try {
        const { doc, updateDoc, arrayUnion } = window.firebaseFuncs;
        const { db: firestoreDB } = firebaseInstance;
        await updateDoc(doc(firestoreDB, 'groups', CALI_GROUP_ID), { members: arrayUnion(newUid) });
        await db.save('friends', { id: newUid, name: friendName, initial: friendInitial });
        alert(`C'est fait ! ${friendName} a été ajouté au groupe.`);
        loadCaliMembers();
    } catch(e) { console.error("Erreur Ajout Membre:", e); alert("Erreur lors de l'ajout : " + e.message); }
}

// --- SPOTS & WISHLIST ---
function openSpotForm(type) {
    currentCaliType = type;
    const modal = document.getElementById('cali-spot-modal');
    const config = { spot: { title: "Nouveau Spot 📍", emoji: "📍" }, wish: { title: "Nouvelle Envie 🧞", emoji: "🧞" } };
    document.getElementById('csm-title').innerText = config[type].title;
    document.getElementById('csm-type').value = type;
    document.getElementById('csm-emoji').value = config[type].emoji;
    document.getElementById('spot-id-input').value = "";
    document.getElementById('csm-name').value = "";
    document.getElementById('csm-link').value = "";
    document.getElementById('csm-lat').value = "";
    document.getElementById('csm-lon').value = "";
    document.getElementById('csm-city').value = "";
    document.getElementById('csm-desc').value = "";
    if(document.getElementById('csm-cat')) document.getElementById('csm-cat').selectedIndex = 0;
    modal.classList.remove('hidden');
}

async function handleCaliSpotSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('csm-type').value;
    const id = document.getElementById('spot-id-input').value;
    const data = {
        type: type, emoji: document.getElementById('csm-emoji').value, name: document.getElementById('csm-name').value,
        mapsLink: document.getElementById('csm-link').value, lat: document.getElementById('csm-lat').value,
        lon: document.getElementById('csm-lon').value, city: document.getElementById('csm-city').value || "Zone inconnue",
        category: document.getElementById('csm-cat').value, desc: document.getElementById('csm-desc').value
    };
    if (!id) { data.addedBy = myUid; data.createdAt = Date.now(); }

    try {
        const { collection, addDoc, doc, updateDoc } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        if (id) { await updateDoc(doc(db, 'groups', CALI_GROUP_ID, 'locations', id), data); }
        else { await addDoc(collection(db, 'groups', CALI_GROUP_ID, 'locations'), data); }
        document.getElementById('cali-spot-modal').classList.add('hidden');
        loadCaliLocations(type);
    } catch(e) { alert("Erreur sauvegarde: " + e.message); }
}

async function loadCaliLocations(targetType) {
    const listId = targetType === 'spot' ? 'cali-spots-list' : 'cali-wishlist-list';
    const container = document.getElementById(listId);
    if(!container) return;
    container.innerHTML = '<div class="wn-loader"></div>';

    try {
        const { collection, getDocs, query, where } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        const q = query(collection(db, 'groups', CALI_GROUP_ID, 'locations'), where("type", "==", targetType));
        const snap = await getDocs(q);
        container.innerHTML = '';
        if (snap.empty) { container.innerHTML = '<div class="text-center text-slate-400 italic">Rien ici pour le moment.</div>'; return; }

        const items = [];
        snap.forEach(d => items.push({id: d.id, ...d.data()}));

        if (targetType === 'spot') {
            items.sort((a,b) => (a.city || "").localeCompare(b.city || ""));
            allCaliSpotsCache = items;
            renderDynamicFilters(items);
            const signalList = document.getElementById('cali-signal-spots-list');
            if(signalList) signalList.innerHTML = '';
            renderLocationList(items, container, 'spot');
            if(signalList) signalList.innerHTML = container.innerHTML;
        } else {
            items.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
            renderLocationList(items, container, 'wish');
        }
    } catch(e) { console.error("Erreur chargement:", e); container.innerHTML = "Erreur..."; }
}

function renderDynamicFilters(items) {
    const filterContainer = document.querySelector('#view-cali-spots .no-scrollbar');
    if (!filterContainer) return;
    const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
    let html = `<button onclick="filterSpots('all')" class="px-4 py-1 bg-slate-800 text-white rounded-full text-xs font-bold whitespace-nowrap transition transform active:scale-95 shadow-sm">Tout</button>`;
    const catColors = { 'Chill': 'emerald', 'Vue': 'blue', 'Eau': 'cyan', 'Abri': 'slate', 'Autre': 'gray' };
    categories.forEach(cat => {
        const color = catColors[cat] || 'gray';
        html += `<button onclick="filterSpots('${cat}')" class="px-4 py-1 bg-${color}-100 text-${color}-800 rounded-full text-xs font-bold whitespace-nowrap transition transform active:scale-95 border border-${color}-200 ml-2">${cat}</button>`;
    });
    filterContainer.innerHTML = html;
}

function filterSpots(category) {
    const container = document.getElementById('cali-spots-list');
    let filteredItems = allCaliSpotsCache;
    if (category !== 'all') { filteredItems = allCaliSpotsCache.filter(i => i.category === category); }
    renderLocationList(filteredItems, container, 'spot');
}

function renderLocationList(items, container, type) {
    container.innerHTML = '';
    items.forEach(item => {
        if (type === 'spot') {
            const html = `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 hover:border-blue-300 transition relative group">
                <div class="flex items-start gap-3">
                    <div class="text-3xl bg-slate-50 w-12 h-12 flex items-center justify-center rounded-full flex-shrink-0">${item.emoji}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start"><h3 class="font-bold text-slate-800 leading-tight">${escapeHTML(item.name)}</h3><span class="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500 h-fit whitespace-nowrap">${escapeHTML(item.city)}</span></div>
                        <p class="text-xs text-slate-500 italic mt-1 line-clamp-2">${escapeHTML(item.desc)}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between border-t border-slate-50 pt-2 mt-1">
                    <div class="flex gap-2">
                        ${item.lat ? `<a href="${item.mapsLink || '#'}" target="_blank" class="text-xs font-bold text-white bg-blue-500 px-3 py-1.5 rounded-lg shadow-sm">🗺️ Y aller</a>` : ''}
                        <button onclick="activateCaliSignal('${item.id}', '${escapeHTML(item.name)}')" class="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">📡 Signal</button>
                    </div>
                    <div class="flex gap-3"><button onclick="editCaliItem('${item.id}', 'spot')" class="text-slate-400 hover:text-blue-500 text-lg">✎</button><button onclick="deleteCaliItem('${item.id}', 'spot')" class="text-slate-400 hover:text-red-500 text-lg">🗑️</button></div>
                </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        } else if (type === 'wish') {
            const isDone = item.done === true;
            const opacity = isDone ? 'opacity-50 grayscale' : '';
            const checkColor = isDone ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300 text-transparent';
            const html = `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 flex items-start gap-4 transition ${opacity}">
                <button onclick="toggleWishStatus('${item.id}', ${!isDone})" class="mt-1 w-6 h-6 rounded-full border-2 ${checkColor} flex items-center justify-center transition-all flex-shrink-0 shadow-sm">✓</button>
                <div class="flex-1"><p class="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">${escapeHTML(item.text)}</p><p class="text-[10px] text-slate-400 mt-2 text-right">Ajouté par un ami</p></div>
                <div class="flex flex-col gap-2 border-l border-slate-100 pl-3 ml-2"><button onclick="editCaliItem('${item.id}', 'wish')" class="text-slate-400 hover:text-purple-500">✎</button><button onclick="deleteCaliItem('${item.id}', 'wish')" class="text-slate-400 hover:text-red-500">🗑️</button></div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        }
    });
}

// --- JEUX & ACTIONS ---
function renderGamesGrid() {
    const container = document.getElementById('cali-games-list');
    if (!container) return;
    container.innerHTML = '';
    gamesList.forEach(game => {
        const html = `
        <div onclick="window.location.href='jeux/${game.id}/index.html'" class="...">
            <div class="text-3xl mb-1">${game.icon}</div>
            <div class="text-[10px] font-bold text-slate-600 uppercase text-center leading-tight">${game.name}</div>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

async function setGameStatus(gameId, gameName) {
    if (!firebaseInstance) return;
    document.getElementById('my-game-status').innerText = gameName + " (En attente...)";
    try {
        const { doc, setDoc } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        await setDoc(doc(db, 'groups', CALI_GROUP_ID, 'game_signals', myUid), {
            gameId: gameId, gameName: gameName, userId: myUid, timestamp: Date.now()
        });
        loadActivePlayers();
    } catch (e) { console.error("Err Game Status", e); }
}

async function loadActivePlayers() {
    const container = document.getElementById('cali-active-players');
    const myStatusTxt = document.getElementById('my-game-status');
    if (!container) return;
    
    try {
        const { collection, getDocs } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        const snap = await getDocs(collection(db, 'groups', CALI_GROUP_ID, 'game_signals'));
        container.innerHTML = '';
        let amIPlaying = false;
        
        if (snap.empty) { container.innerHTML = '<div class="col-span-full text-center text-slate-400 italic text-sm py-4">La salle d\'arcade est vide.</div>'; }

        snap.forEach(d => {
            const data = d.data();
            const diffMins = (Date.now() - data.timestamp) / 60000;
            if (diffMins < 120) {
                const friendName = getFriendName(d.id);
                const isMe = d.id === myUid;
                if (isMe) {
                    amIPlaying = true;
                    myStatusTxt.innerText = `Prêt pour : ${data.gameName}`;
                    myStatusTxt.className = "text-lg font-black text-indigo-600";
                }
                const gameObj = gamesList.find(g => g.id === data.gameId) || { icon: '🎮', color: 'gray' };
                const html = `
                <div class="bg-white border-l-4 border-${gameObj.color}-500 p-3 rounded-lg shadow-sm flex items-center justify-between">
                    <div class="flex items-center gap-3"><div class="text-2xl">${gameObj.icon}</div><div><div class="font-bold text-slate-800 text-sm">${escapeHTML(friendName)}</div><div class="text-xs text-slate-500">veut jouer à <strong>${escapeHTML(data.gameName)}</strong></div></div></div>
                    <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">${Math.floor(diffMins)} min</span>
                </div>`;
                container.insertAdjacentHTML('beforeend', html);
            }
        });
        if (!amIPlaying) { myStatusTxt.innerText = "Inactif"; myStatusTxt.className = "text-lg font-black text-slate-300"; }
    } catch (e) { console.error(e); }
}

async function quitGameLobby() {
    try {
        const { doc, deleteDoc } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        await deleteDoc(doc(db, 'groups', CALI_GROUP_ID, 'game_signals', myUid));
        loadActivePlayers();
    } catch(e) {}
}

function openWishModal(id = null, text = "") {
    const modal = document.getElementById('wish-modal');
    const input = document.getElementById('wish-text');
    const idInput = document.getElementById('wish-id-input');
    input.value = text; 
    idInput.value = id || ""; 
    modal.classList.remove('hidden');
    input.focus();
}

async function handleWishSubmit(e) {
    e.preventDefault();
    const text = document.getElementById('wish-text').value;
    const id = document.getElementById('wish-id-input').value;
    if (!text || !firebaseInstance) return;

    try {
        const { collection, addDoc, doc, updateDoc } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        if (id) { await updateDoc(doc(db, 'groups', CALI_GROUP_ID, 'locations', id), { text: text }); }
        else { await addDoc(collection(db, 'groups', CALI_GROUP_ID, 'locations'), { type: 'wish', text: text, done: false, addedBy: myUid, createdAt: Date.now() }); }
        document.getElementById('wish-modal').classList.add('hidden');
        loadCaliLocations('wish');
    } catch(err) { alert("Erreur: " + err.message); }
}

async function toggleWishStatus(id, newStatus) {
    try {
        const { doc, updateDoc } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        await updateDoc(doc(db, 'groups', CALI_GROUP_ID, 'locations', id), { done: newStatus });
        loadCaliLocations('wish');
    } catch(e) { console.error(e); }
}

async function deleteCaliItem(id, type) {
    if(!confirm("Supprimer définitivement cet élément pour tout le groupe ?")) return;
    try {
        const { doc, deleteDoc } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        await deleteDoc(doc(db, 'groups', CALI_GROUP_ID, 'locations', id));
        loadCaliLocations(type); 
    } catch(e) { alert("Erreur suppression: " + e.message); }
}

function editCaliItem(id, type) {
    if (!firebaseInstance) return;
    const { doc, getDoc } = window.firebaseFuncs;
    const { db } = firebaseInstance;
    getDoc(doc(db, 'groups', CALI_GROUP_ID, 'locations', id)).then(snap => {
        if(snap.exists()) {
            const data = snap.data();
            if (type === 'wish') { openWishModal(id, data.text); }
            else if (type === 'spot') {
                openSpotForm('spot'); 
                document.getElementById('spot-id-input').value = id;
                document.getElementById('csm-name').value = data.name;
                document.getElementById('csm-emoji').value = data.emoji;
                document.getElementById('csm-link').value = data.mapsLink;
                document.getElementById('csm-city').value = data.city;
                document.getElementById('csm-cat').value = data.category;
                document.getElementById('csm-desc').value = data.desc;
                document.getElementById('csm-lat').value = data.lat;
                document.getElementById('csm-lon').value = data.lon;
                document.getElementById('csm-title').innerText = "Modifier le Spot ✏️";
            }
        }
    });
}
