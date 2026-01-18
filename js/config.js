// --- CONSTANTES & CONFIGURATION ---//
const DB_NAME = 'GreenCodexDB';
const DB_VERSION = 1;
const GITHUB_USERNAME = 'antoto2021';
const GITHUB_REPO = 'Appli-Portfolio';
const UPDATE_STORAGE_KEY = 'green_codex_last_hash';
const UPDATE_TIME_KEY = 'green_codex_update_timestamp';
const CALI_GROUP_ID = "cali_team_v1";

// --- DONNÉES MAÎTRESSE ---
const masterData = {
    hash_dry: { name: "Dry Sift", color: "amber", hex: "#D97706", badge: "Tradition", icon: "🏜️", desc: "Tamisage mécanique ancestral.", process: [{t:"Séchage",d:"Plante affinée"},{t:"Tamisage",d:"Frottement"},{t:"Collection",d:"Poudre"},{t:"Presse",d:"Chaleur"}], radar: [30,90,70,50,60], metrics: [20,50,40,30], metricsLabels: ['Rendement','Puissance','Prix','Tech'], matrix: {x:45,y:9} },
    hash_water: { name: "Ice-O-Lator", color: "blue", hex: "#2563EB", badge: "Pureté", icon: "❄️", desc: "Extraction eau glacée + Fresh Frozen.", process: [{t:"Congélation",d:"-40°C"},{t:"Lavage",d:"Eau+Glace"},{t:"Filtre",d:"Sacs"},{t:"Séchage",d:"Lyophilisation"}], radar: [90,30,60,95,85], metrics: [10,75,90,80], metricsLabels: ['Rendement','Puissance','Prix','Tech'], matrix: {x:70,y:6} },
    hash_rosin: { name: "Rosin", color: "purple", hex: "#9333EA", badge: "Excellence", icon: "🔥", desc: "Pression et chaleur uniquement.", process: [{t:"Matériel",d:"Hash 6*"},{t:"Sac",d:"25u Nylon"},{t:"Presse",d:"Hydraulique"},{t:"Cure",d:"Cold Cure"}], radar: [85,50,80,90,95], metrics: [15,85,100,60], metricsLabels: ['Rendement','Puissance','Prix','Tech'], matrix: {x:85,y:3} },
    weed_indica: { name: "Indica (Kush)", color: "indigo", hex: "#4F46E5", badge: "Relax", icon: "🏔️", desc: "Montagnes, effet lourd.", process: [{t:"Origine",d:"Hindu Kush"},{t:"Structure",d:"Buisson"},{t:"Flo",d:"8 sem"},{t:"Effet",d:"Physique"}], radar: [20,80,90,60,40], metrics: [80,22,50,90], metricsLabels: ['Rendement','THC','Taille','Facilité'], matrix: {x:20,y:10} },
    weed_sativa: { name: "Sativa (Haze)", color: "yellow", hex: "#D97706", badge: "Energie", icon: "☀️", desc: "Tropiques, effet high.", process: [{t:"Origine",d:"Equateur"},{t:"Structure",d:"Géante"},{t:"Flo",d:"12+ sem"},{t:"Effet",d:"Cérébral"}], radar: [60,40,20,70,40], metrics: [90,18,100,60], metricsLabels: ['Rendement','THC','Taille','Facilité'], matrix: {x:18,y:10} },
    weed_exotic: { name: "Exotics", color: "pink", hex: "#DB2777", badge: "Hybride", icon: "🧬", desc: "Breeding US moderne.", process: [{t:"Origine",d:"Indoor"},{t:"Structure",d:"Optimisée"},{t:"Flo",d:"9 sem"},{t:"Effet",d:"Mixte"}], radar: [80,50,60,80,50], metrics: [75,28,60,70], metricsLabels: ['Rendement','THC','Taille','Facilité'], matrix: {x:28,y:10} }
};

const gamesList = [
    { id: 'minigolf', name: 'Mini-Golf', icon: '⛳', color: 'emerald' },
    { id: 'bowling', name: 'Bowling', icon: '🎳', color: 'blue' },
    { id: 'bounce', name: 'Bounce', icon: '🏀', color: 'orange' },
    { id: 'archery', name: 'Tir à l\'arc', icon: '🏹', color: 'stone' },
    { id: 'fight', name: 'Combat', icon: '🥊', color: 'red' },
    { id: 'racing', name: 'Course', icon: '🏎️', color: 'zinc' },
    { id: 'pool', name: 'Billard', icon: '🎱', color: 'indigo' },
    { id: 'darts', name: 'Fléchettes', icon: '🎯', color: 'rose' },
    { id: 'pingpong', name: 'Tennis de Table', icon: '🏓', color: 'cyan' },
    { id: 'poker', name: 'Poker', icon: '🃏', color: 'slate' },
    { id: 'chess', name: 'Échecs', icon: '♟️', color: 'neutral' },
    { id: 'battleship', name: 'Bataille Navale', icon: '🚢', color: 'sky' },
    { id: 'snake', name: 'Snake', icon: '🐍', color: 'lime' },
    { id: 'quiz', name: 'Quiz Culture', icon: '❓', color: 'yellow' },
    { id: 'dice', name: 'Dés / Yam', icon: '🎲', color: 'purple' }
];

const tutorialSlides = [
    { icon: "👋", title: "Bienvenue !", desc: "Découvrez Green Codex, votre encyclopédie cannabique interactive et personnelle." },
    { icon: "📖", title: "Encyclopédie", desc: "Explorez les fiches techniques : Indica, Sativa, Dry Sift, Rosin... Tout le savoir à portée de main." },
    { icon: "📊", title: "Radars", desc: "Visualisez instantanément le profil aromatique et les effets grâce aux graphiques radars dynamiques." },
    { icon: "⚖️", title: "Comparateur", desc: "Hésitation entre deux variétés ? Superposez leurs graphiques pour voir leurs différences." },
    { icon: "📂", title: "Collection", desc: "Créez votre 'Pokedex' personnel ! Ajoutez chaque variété que vous goûtez." },
    { icon: "📝", title: "Détails", desc: "Indiquer la farm, la strain, la quantité et le pays d'origine pour chaque entrée." },
    { icon: "📸", title: "Photos", desc: "Immortalisez vos plus belles fleurs. Ajoutez jusqu'à 3 photos par fiche." },
    { icon: "✏️", title: "Mode Édition", desc: "C'est VOTRE appli. Activez le mode édition (en haut) pour réécrire les textes et titres." },
    { icon: "🤝", title: "Mode collaboratif", desc: "Ce mode vous permet de voir le portfolio de vos amis ! Ajouter leur ID dans l'onglet 'Info' et partager vos découvertes." },
    { icon: "🔒", title: "Sécurité", desc: "Seulement les textes sont visible dans l'onglet collaboratif (stocké dans le cloud), personne n'a accès a vos photos (stocké uniquement sur VOTRE téléphone)." },
    { icon: "🔄", title: "Mises à jour", desc: "Connectée à GitHub, l'appli évolue automatiquement. Vos données restent sécurisées sur votre téléphone." },
    { icon: "🚀", title: "C'est parti !", desc: "Vous êtes prêt. Commencez à explorer et à construire votre collection dès maintenant." }
];
