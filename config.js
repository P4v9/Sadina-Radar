const firebaseConfig = {
    apiKey: "AIzaSyA2Ik2KCs3YN7e4lsb-rKxNjiILX_0tyng",
    authDomain: "fishing-radar.firebaseapp.com",
    projectId: "fishing-radar",
    storageBucket: "fishing-radar.firebasestorage.app",
    messagingSenderId: "465169105493",
    appId: "1:465169105493:web:e9c190e88d5d7944eacadc",
    measurementId: "G-X1GXW8MRD1"
};

let db = null;
let currentUser = localStorage.getItem('sadina_user') || "";
let currentWeatherData = { temp: 24, pressure: 1012, wind: 2.5, condition: "Слънчево", code: 0 };
let allCatches = [];
let globalBase64Photo = "";
let isInitialLoad = true;

function checkUserSession() {
    if (currentUser && currentUser.trim() !== "") {
        document.getElementById('login-overlay').style.display = 'none';
        initApp();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
    }
}

function executeAppLogin() {
    const nameInput = document.getElementById('login-name-input').value.trim();
    if(!nameInput) {
        alert("Моля, въведете име, за да влезете!");
        return;
    }
    currentUser = nameInput;
    localStorage.setItem('sadina_user', currentUser);
    document.getElementById('login-overlay').style.display = 'none';
    initApp();
}

function clearUserSession() {
    if(confirm("Искате ли да излезете от този профил и да смените името?")) {
        localStorage.removeItem('sadina_user');
        currentUser = "";
        location.reload();
    }
}

function initApp() {
    if (firebaseConfig.apiKey !== "") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        listenToFirebaseUpdates();
    }
    updateUserUI();
    fetchWeather();
}

function updateUserUI() {
    const isAdmin = (currentUser.toLowerCase() === "павел" || currentUser.toLowerCase() === "влади");
    document.getElementById('current-user-display').innerText = currentUser + (isAdmin ? " (VIP)" : "");
    
    if (isAdmin) {
        document.body.classList.add('is-admin');
        document.getElementById('app-header-title').innerText = "Садина Смарт Риболов (VIP)";
    } else {
        document.body.classList.remove('is-admin');
        document.getElementById('app-header-title').innerText = "Садина Риболовен Дневник";
    }
}

function switchView(viewId, element) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active');
    element.classList.add('active');
}

// Задействаме проверката веднага щом HTML-ът е готов
window.addEventListener('DOMContentLoaded', checkUserSession);