// --- UTILITAIRES ---
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getImageSrc(imgData) {
    if (!imgData) return '';
    if (typeof imgData === 'string') return imgData;
    return URL.createObjectURL(imgData);
}

function getFriendName(uid) {
    if (uid === myUid) return "Moi"; 
    const friend = friends.find(f => f.id === uid);
    if (friend) return friend.name; 
    return `Inconnu (${uid.substring(0, 4)}..)`; 
}

function getFlag(c) {
    if (!c) return '🏳️';
    const m = { 'france': '🇫🇷', 'espagne': '🇪🇸', 'spain': '🇪🇸', 'usa': '🇺🇸', 'cali': '🇺🇸', 'maroc': '🇲🇦', 'morocco': '🇲🇦', 'suisse': '🇨🇭', 'italie': '🇮🇹', 'canada': '🇨🇦', 'uk': '🇬🇧', 'angleterre': '🇬🇧', 'allemagne': '🇩🇪', 'thailande': '🇹🇭', 'pays-bas': '🇳🇱', 'hollande': '🇳🇱', 'netherlands': '🇳🇱', 'belgique': '🇧🇪' };
    for (let k in m) if (c.toLowerCase().includes(k)) return m[k];
    return '🏳️';
}

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
                c.toBlob(blob => { r(blob); }, 'image/jpeg', q);
            };
            i.src = e.target.result;
        };
        R.readAsDataURL(f);
    });
}

function parseMapsLink(url) {
    const regex = /(-?\d+\.\d+)[,\/!](-?\d+\.\d+)/;
    const match = url.match(regex);
    if (match && match.length >= 3) {
        document.getElementById('csm-lat').value = match[1];
        document.getElementById('csm-lon').value = match[2];
    }
}
