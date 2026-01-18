// --- GESTION BASE DE DONNÉES (IndexedDB) ---
const db = {
    instance: null,
    init: function() { 
        return new Promise((resolve, reject) => { 
            const request = indexedDB.open(DB_NAME, DB_VERSION); 
            request.onupgradeneeded = (e) => { 
                const d = e.target.result; 
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
    getAll: function(storeName) { 
        return new Promise((resolve) => { 
            const tx = this.instance.transaction(storeName, 'readonly'); 
            const store = tx.objectStore(storeName); 
            const req = store.getAll(); 
            req.onsuccess = () => resolve(req.result); 
            req.onerror = () => resolve([]); 
        }); 
    },
    save: function(storeName, item) { 
        return new Promise((resolve, reject) => { 
            const tx = this.instance.transaction(storeName, 'readwrite'); 
            const store = tx.objectStore(storeName); 
            const req = store.put(item); 
            req.onsuccess = () => resolve(req.result); 
            req.onerror = () => reject(req.error); 
        }); 
    },
    delete: function(storeName, key) { 
        return new Promise((resolve) => { 
            const tx = this.instance.transaction(storeName, 'readwrite'); 
            const store = tx.objectStore(storeName); 
            store.delete(key); 
            tx.oncomplete = () => resolve(); 
        }); 
    }
};
