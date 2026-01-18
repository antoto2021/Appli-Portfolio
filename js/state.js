// --- ÉTAT GLOBAL (VARIABLES) ---//
let firebaseInstance = null, myUid = null;
let collection = [], contentMap = {}, customSections = [], friends = [], currentFriendItems = [];
let isEditMode = false, currentPhotos = [], currentSectionImage = null;
let activeUpdates = [{ icon: "🚀", title: "Mise à jour", desc: "Nouvelle version disponible." }];
let currentSlide = 0;
let comparatorChart = null; 
let currentViewingFriendId = null;
let currentCaliType = 'spot'; 
let allCaliSpotsCache = [];
