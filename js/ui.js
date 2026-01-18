// ==========================================
// FICHIER 4 : INTERFACE UTILISATEUR (Navigation, Graphiques, UI)
// ==========================================

// --- NAVIGATION PRINCIPALE ---
function showView(viewId) {
    // Masquer toutes les vues
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    
    // Afficher la vue demandée
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove('hidden');
    
    // Gestion des boutons de navigation (Header)
    const navBack = document.getElementById('navBackBtn');
    const editBtn = document.getElementById('editModeBtn');
    
    if (viewId === 'home') {
        if(navBack) navBack.classList.add('hidden');
        if(editBtn) editBtn.classList.remove('hidden');
    } else {
        if(navBack) navBack.classList.remove('hidden');
        if(editBtn) editBtn.classList.add('hidden');
    }
    
    // Bouton Info (visible seulement sur Home ou Info)
    const infoBtn = document.querySelector('button[onclick="showView(\'info\')"]');
    if(infoBtn) infoBtn.style.display = (viewId === 'home' || viewId === 'info') ? 'flex' : 'none';
    
    window.scrollTo(0,0);
    
    // --- TRIGGERS DE CHARGEMENT (Appels aux autres modules) ---
    // Ces fonctions doivent être disponibles globalement (chargées via collection.js / social.js)
    if(viewId === 'collection' && typeof renderCollectionList === 'function') renderCollectionList();
    if(viewId === 'info') renderInfoView();
    
    // Triggers Cali Team
    if(viewId === 'cali-friends' && typeof loadCaliMembers === 'function') loadCaliMembers();
    if(viewId === 'cali-spots' && typeof loadCaliLocations === 'function') loadCaliLocations('spot');
    if(viewId === 'cali-wishlist' && typeof loadCaliLocations === 'function') loadCaliLocations('wish');
    if(viewId === 'cali-games') {
        if(typeof renderGamesGrid === 'function') renderGamesGrid();
        if(typeof loadActivePlayers === 'function') loadActivePlayers();
    }
}

// --- FONCTIONS MODE ÉDITION (Textes & Sections) ---
function toggleEditMode() {
    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode-active', isEditMode);
    
    const banner = document.getElementById('edit-banner');
    if(banner) banner.classList.toggle('hidden', !isEditMode);
    
    const btn = document.getElementById('editModeBtn');
    if(btn) btn.classList.toggle('bg-amber-500', isEditMode);
    
    const addSecArea = document.getElementById('add-section-area');
    if(addSecArea) addSecArea.classList.toggle('hidden', !isEditMode);
    
    document.querySelectorAll('[data-editable]').forEach(e => {
        if(isEditMode) {
            e.classList.add('editable-highlight');
            e.onclick = ev => {
                ev.preventDefault();
                ev.stopPropagation();
                editContent(ev.target.closest('[data-editable]'));
            };
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

// --- GESTION SECTIONS PERSONNALISÉES (À PROPOS) ---
function renderCustomSections() {
    const container = document.getElementById('custom-sections-container');
    if(!container) return;

    container.innerHTML = customSections.map((s, i) => `
        <section class="bg-white rounded-2xl shadow-md p-8 border-l-8 border-emerald-600 relative group animate-fade-in text-justify">
            ${isEditMode ? `<div class="absolute top-4 right-4 flex gap-2"><button onclick="openSectionModal(${s.id})" class="text-blue-500 font-bold border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 text-xs">Modifier</button><button onclick="deleteCustomSection(${s.id})" class="text-red-500 font-bold border border-red-200 px-3 py-1 rounded hover:bg-red-50 text-xs">Supprimer</button></div>` : ''}
            <h2 class="section-title">${i + 8}. ${escapeHTML(s.title)}</h2>
            <div class="text-lg leading-relaxed text-slate-600 whitespace-pre-wrap">${escapeHTML(s.text)}</div>
            ${s.image ? `<div class="mt-4 rounded-xl overflow-hidden shadow-sm"><img src="${getImageSrc(s.image)}" class="w-full object-cover"></div>` : ''}
        </section>`).join('');
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
            document.querySelector('#sec-current-image img').src = getImageSrc(s.image);
            document.getElementById('sec-current-image').classList.remove('hidden');
        }
    }
    document.getElementById('section-modal').classList.remove('hidden');
}

function closeSectionModal() {
    document.getElementById('section-modal').classList.add('hidden');
}

async function handleSectionSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const id = f.secId.value ? parseInt(f.secId.value) : Date.now();
    const fi = document.getElementById('sec-photo-input').files[0];
    if (fi) currentSectionImage = await compressImage(fi, 800, 0.7);
    
    const s = { id, title: f.secTitle.value, text: f.secText.value, image: currentSectionImage };
    const i = customSections.findIndex(x => x.id === id);
    if (i > -1) customSections[i] = s;
    else customSections.push(s);
    
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

// --- FONCTIONS GRAPHIQUES (Chart.js & Plotly) ---
const initCharts = () => {
    // Chart Puissance
    const ctxPotency = document.getElementById('potencyChart');
    if (ctxPotency) {
        new Chart(ctxPotency, {
            type: 'bar',
            data: {
                labels: ['Sativa','Indica','Exotic','Dry Sift','Ice-O-Lator','Rosin','BHO'],
                datasets: [{
                    label: '% THC',
                    data: [15,20,28,40,65,75,90],
                    backgroundColor: ['#10B981','#10B981','#10B981','#D97706','#2563EB','#9333EA','#64748B'],
                    borderRadius: 4
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: false } }
        });
    }

    // Radar Comparateur
    updateComparator();

    // Plotly Matrix
    if(window.Plotly) {
        Plotly.newPlot('globalMatrixPlot', [{
            x: Object.values(masterData).map(d => d.matrix.x),
            y: Object.values(masterData).map(d => d.matrix.y),
            text: Object.values(masterData).map(d => d.name),
            mode: 'markers+text',
            type: 'scatter',
            textposition: 'top center',
            marker: { size: 30, color: Object.values(masterData).map(d => d.hex) }
        }], {
            xaxis: { title: 'Pureté', range: [0, 100] },
            yaxis: { title: 'Solidité', range: [0, 12] },
            margin: { t: 20, l: 40 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        }, { displayModeBar: false });
    }
};

function updateComparator() {
    const selectA = document.getElementById('selectA');
    const selectB = document.getElementById('selectB');
    if(!selectA || !selectB) return;

    const dA = masterData[selectA.value || "weed_sativa"];
    const dB = masterData[selectB.value || "hash_rosin"];
    
    const ctx = document.getElementById('comparatorRadar');
    
    if (comparatorChart) {
        comparatorChart.destroy();
    }
    
    comparatorChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Fruité','Terreux','Physique','Odeur','Intensité'],
            datasets: [
                { label: dA.name, data: dA.radar, borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.2)' },
                { label: dB.name, data: dB.radar, borderColor: '#EC4899', backgroundColor: 'rgba(236,72,153,0.2)' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { suggestedMin: 0, suggestedMax: 100 } }
        }
    });
}

function showDetail(k) {
    const d = masterData[k];
    showView('detail');
    
    document.getElementById('detail-header').className = `bg-white p-8 rounded-2xl shadow-lg border-t-8 border-${d.color}-500`;
    const badge = document.getElementById('detail-badge');
    badge.innerText = d.badge;
    badge.className = `px-3 py-1 rounded-full text-sm font-bold uppercase mb-2 inline-block bg-${d.color}-100 text-${d.color}-800`;
    
    const title = document.getElementById('detail-title');
    title.innerText = d.name;
    title.className = `text-4xl md:text-5xl font-black text-${d.color}-900`;
    
    document.getElementById('detail-icon').innerText = d.icon;
    document.getElementById('detail-desc').innerText = d.desc;
    document.getElementById('detail-desc').className = `text-lg text-slate-600 border-l-4 border-${d.color}-200 pl-4 text-justify`;
    
    document.getElementById('detail-flow').innerHTML = d.process.map(s => `
        <div class="bg-slate-700 p-4 rounded-lg border border-slate-600">
            <div class="text-xs text-${d.color}-400 font-mono uppercase">${s.t}</div>
            <div class="font-bold">${s.d}</div>
        </div>`).join('');

    const c1 = document.getElementById('detailRadarChart');
    const c2 = document.getElementById('detailBarChart');
    
    if (c1.chartInstance) c1.chartInstance.destroy();
    if (c2.chartInstance) c2.chartInstance.destroy();

    c1.chartInstance = new Chart(c1, {
        type: 'radar',
        data: {
            labels: ['Fruité','Terreux','Physique','Odeur','Intensité'],
            datasets: [{ label: d.name, data: d.radar, backgroundColor: `${d.hex}33`, borderColor: d.hex, fill: true }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: false } }
    });

    c2.chartInstance = new Chart(c2, {
        type: 'bar',
        data: {
            labels: ['Rendement','Puissance','Prix','Tech'],
            datasets: [{ data: d.metrics, backgroundColor: d.hex, borderRadius: 6 }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: false }, scales: { y: { max: 100 } } }
    });
}

// --- GESTION DES MODALS (Tutoriel & News) ---
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

function nextSlide() {
    if (currentSlide < activeUpdates.length - 1) { currentSlide++; updateSlideUI(); } else { closePopup(); }
}

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

// --- GESTION UI DIVERS ---
function toggleSection(id) {
    const e = document.getElementById(id);
    if(e) e.classList.toggle('expanded');
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
    setTimeout(() => {
        const u = window.location.href.split('?')[0];
        window.location.href = u + '?v=' + Date.now();
    }, 500);
}

// Vérification manuelle de mise à jour (Bouton info)
async function verifyUpdate(btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Vérification...";
    btn.disabled = true;
    try {
        await renderInfoView(); // Met à jour les infos GitHub
        
        const local = localStorage.getItem(UPDATE_STORAGE_KEY);
        const remoteEl = document.getElementById('info-remote-hash');
        const remote = remoteEl ? remoteEl.innerText.replace('...', '') : '';
        
        if (local && local.substring(0, 7) === remote) {
            btn.innerHTML = "✅ À jour";
        } else {
            btn.innerHTML = "🚀 M.à.j dispo !";
            triggerUpdateUI();
        }
    } catch(e) {
        btn.innerHTML = "❌ Erreur";
    }
    setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
}
