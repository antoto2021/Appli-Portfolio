// ==========================================
// FICHIER 3 : BASE DE DONNÉES & ÉTAT GLOBAL
// ==========================================

// --- VARIABLES GLOBALES (ÉTAT DE L'APPLICATION) ---
// Ces variables sont partagées entre tous les fichiers.

let firebaseInstance = null;
let myUid = null; // ID unique de l'utilisateur

// Données locales chargées en mémoire
let collection = [];        // Le portfolio (Hash/Weed)
let contentMap = {};        // Textes modifiés par l'utilisateur
let customSections = [];    // Sections "À propos" personnalisées
let friends = [];           // Liste d'amis (Local)

// Variables temporaires de navigation/UI
let currentFriendItems = [];    // Cache du portfolio de l'ami qu'on regarde
let currentViewingFriendId = null; 
let isEditMode = false;         // Mode édition activé ou non
let currentPhotos = [];         // Photos en cours d'upload dans le formulaire
let currentSectionImage = null; // Image en cours d'upload pour une section
let currentSlide = 0;           // Slide actif (Tuto ou Update)
let activeUpdates = [{ icon: "🚀", title: "Mise à jour", desc: "Nouvelle version disponible." }];
let comparatorChart = null;     // Instance du graphique radar (pour pouvoir le détruire)

// Variables Cali Team (Cache)
let currentCaliType = 'spot';
let allCaliSpotsCache = [];

// --- GESTION BASE DE DONNÉES (IndexedDB) ---
const db = {
    instance: null,
    
    // Initialisation de la DB
    init: function() { 
        return new Promise((resolve, reject) => { 
            const request = indexedDB.open(DB_NAME, DB_VERSION); 
            
            request.onupgradeneeded = (e) => { 
                const d = e.target.result; 
                // Création des tables (ObjectStores) si elles n'existent pas
                if(!d.objectStoreNames.contains('collection')) d.createObjectStore('collection', { keyPath: 'id', autoIncrement: true }); 
                if(!d.objectStoreNames.contains('config')) d.createObjectStore('config', { keyPath: 'key' }); 
                if(!d.objectStoreNames.contains('friends')) d.createObjectStore('friends', { keyPath: 'id' }); 
            }; 
            
            request.onsuccess = (e) => { 
                this.instance = e.target.result; 
                resolve(this.instance); 
            }; 
            
            request.onerror = (e) => reject("DB Error"); 
        }); 
    },

    // Récupérer toutes les données d'une table
    getAll: function(storeName) { 
        return new Promise((resolve) => { 
            const tx = this.instance.transaction(storeName, 'readonly'); 
            const store = tx.objectStore(storeName); 
            const req = store.getAll(); 
            req.onsuccess = () => resolve(req.result); 
            req.onerror = () => resolve([]); 
        }); 
    },

    // Sauvegarder (Ajout ou Modification)
    save: function(storeName, item) { 
        return new Promise((resolve, reject) => { 
            const tx = this.instance.transaction(storeName, 'readwrite'); 
            const store = tx.objectStore(storeName); 
            const req = store.put(item); 
            req.onsuccess = () => resolve(req.result); 
            req.onerror = () => reject(req.error); 
        }); 
    },

    // Supprimer un élément par sa clé
    delete: function(storeName, key) { 
        return new Promise((resolve) => { 
            const tx = this.instance.transaction(storeName, 'readwrite'); 
            const store = tx.objectStore(storeName); 
            store.delete(key); 
            tx.oncomplete = () => resolve(); 
        }); 
    }
};

// --- FONCTIONS DE SAUVEGARDE ET RESTAURATION (BACKUP) ---

async function exportBackup() {
    const data = {
        collection: await db.getAll('collection'),
        customSections: customSections,
        timestamp: Date.now()
    };
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
                    // On fusionne la collection
                    for(const item of data.collection) {
                        // On garde l'ID s'il existe pour écraser l'ancien, sinon nouvel ID auto
                        await db.save('collection', item);
                    }
                    // On restaure les sections personnalisées
                    if(data.customSections && Array.isArray(data.customSections)) {
                        customSections = data.customSections;
                        await db.save('config', {key: 'customSections', value: customSections});
                    }
                    alert('Restauration terminée avec succès !');
                    location.reload();
                }
            } else {
                alert('Format de fichier invalide.');
            }
        } catch(err) {
            alert('Erreur lors de la lecture du fichier de sauvegarde.');
            console.error(err);
        }
    };
    reader.readAsText(file);
}
