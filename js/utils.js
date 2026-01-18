// ==========================================
// FICHIER 2 : UTILITAIRES (Sécurité, Images, Texte)
// ==========================================

// --- SÉCURITÉ (ANTI-XSS) ---
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- GESTION DES IMAGES (Base64 vs Blob) ---
function getImageSrc(imgData) {
    if (!imgData) return '';
    // Si c'est déjà une chaine de caractères (Base64 ou URL), on la retourne
    if (typeof imgData === 'string') return imgData;
    // Sinon, c'est un Blob/File, on crée une URL virtuelle rapide
    return URL.createObjectURL(imgData);
}

// Compression d'image (Retourne un Blob)
function compressImage(f, w = 1200, q = 0.8) {
    return new Promise(r => {
        const R = new FileReader();
        R.onload = e => {
            const i = new Image();
            i.onload = () => {
                const c = document.createElement('canvas');
                let W = i.width, H = i.height;
                if (W > w) { H *= w / W; W = w; }
                c.width = W; c.height = H;
                c.getContext('2d').drawImage(i, 0, 0, W, H);
                
                // Export en Blob
                c.toBlob(blob => {
                    r(blob);
                }, 'image/jpeg', q);
            };
            i.src = e.target.result;
        };
        R.readAsDataURL(f);
    });
}

// --- FORMATAGE & AFFICHAGE ---

// Récupérer le nom d'un ami via son ID (Dépend des variables globales définies dans db.js)
function getFriendName(uid) {
    // On suppose que 'myUid' et 'friends' sont accessibles globalement
    if (typeof myUid !== 'undefined' && uid === myUid) return "Moi"; 
    
    if (typeof friends !== 'undefined') {
        const friend = friends.find(f => f.id === uid);
        if (friend) return friend.name; 
    }
    
    return `Inconnu (${uid ? uid.substring(0, 4) : '?' }..)`; 
}

// Récupérer le drapeau selon le nom du pays
function getFlag(c) {
    if (!c) return '🏳️';
    const m = { 
        'france': '🇫🇷', 'espagne': '🇪🇸', 'spain': '🇪🇸', 'usa': '🇺🇸', 'cali': '🇺🇸', 
        'maroc': '🇲🇦', 'morocco': '🇲🇦', 'suisse': '🇨🇭', 'italie': '🇮🇹', 
        'canada': '🇨🇦', 'uk': '🇬🇧', 'angleterre': '🇬🇧', 'allemagne': '🇩🇪', 
        'thailande': '🇹🇭', 'pays-bas': '🇳🇱', 'hollande': '🇳🇱', 
        'netherlands': '🇳🇱', 'belgique': '🇧🇪' 
    };
    for (let k in m) if (c.toLowerCase().includes(k)) return m[k];
    return '🏳️';
}

// Parsing des liens Google Maps (Extraction Lat/Lon)
function parseMapsLink(url) {
    const regex = /(-?\d+\.\d+)[,\/!](-?\d+\.\d+)/;
    const match = url.match(regex);
    if (match && match.length >= 3) {
        // Met à jour les champs du DOM s'ils existent
        const elLat = document.getElementById('csm-lat');
        const elLon = document.getElementById('csm-lon');
        if(elLat) elLat.value = match[1];
        if(elLon) elLon.value = match[2];
    }
}

// Parsing des messages de commit GitHub (Pour les News)
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
