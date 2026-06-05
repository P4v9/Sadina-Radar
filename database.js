// 🔊 ГЛОБАЛЕН АУДИО МОДУЛ ЗА СИГНАЛИЗАТОРА
let audioContext = null;

// Функция, която отключва аудиото на телефона при първото пипане на екрана
function unlockAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}
// Закачаме отключването за абсолютно всяко докосване по екрана
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);

function playBiteAlarmSound() {
    try {
        // Проверяваме дали модулът е създаден
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Ако телефонът се опитва да го заспива, го събуждаме насила
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        let time = audioContext.currentTime;
        // Автентичен звук на сигнализатор (7 бързи писъка при рън)
        for (let i = 0; i < 7; i++) {
            let osc = audioContext.createOscillator();
            let gain = audioContext.createGain();
            osc.type = 'square'; 
            osc.frequency.setValueAtTime(1350, time + i * 0.12); 
            gain.gain.setValueAtTime(0.25, time + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.12 + 0.08);
            osc.connect(gain); 
            gain.connect(audioContext.destination);
            osc.start(time + i * 0.12); 
            osc.stop(time + i * 0.12 + 0.08);
        }
    } catch(e) { console.log("Аудиото беше блокирано от операционната система:", e); }
}

function compressAndHandlePhoto(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 450;
            let width = img.width; let height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            globalBase64Photo = canvas.toDataURL('image/jpeg', 0.65);
            document.getElementById('photo-preview').src = globalBase64Photo;
            document.getElementById('photo-preview-box').style.display = 'block';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function listenToFirebaseUpdates() {
    if(!db) return;
    db.collection("sadina_catches").orderBy("timestamp", "desc")
    .onSnapshot((snapshot) => {
        allCatches = [];
        if (!isInitialLoad) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" && change.doc.data().username !== currentUser) {
                    playBiteAlarmSound(); // СВИРИ СИГНАЛИЗАТОРА!
                }
            });
        }
        snapshot.forEach((doc) => {
            const item = doc.data();
            allCatches.push({
                user: item.username, fish: item.fish_type, weight: parseFloat(item.weight) || 0,
                groundbait: item.groundbait || [], baittype: item.bait_type, size: item.bait_size,
                color: item.bait_color, flavor: item.flavor, photo: item.photo || "",
                timestamp: item.timestamp, weather_pressure: item.weather_pressure,
                weather_wind: item.weather_wind, weather_temp: item.weather_temp, weather_cond: item.weather_cond
            });
        });
        isInitialLoad = false;
        renderData();
    });
}

async function submitCatchToFirebase() {
    const fish = getActiveText('form-fish');
    const weight = document.getElementById('input-weight').value;
    const groundbait = getMultiActiveTexts('form-groundbait');
    const baittype = getActiveText('form-baittype');
    const size = getActiveText('form-size');
    const color = getActiveText('form-color');
    const flavor = document.getElementById('input-flavor').value.trim();

    if(!flavor) { alert("Въведи аромат!"); return; }

    const catchData = {
        username: currentUser, fish_type: fish, weight: parseFloat(weight) || 0,
        groundbait: groundbait, bait_type: baittype, bait_size: size, bait_color: color,
        flavor: flavor, photo: globalBase64Photo, weather_temp: currentWeatherData.temp,
        weather_pressure: currentWeatherData.pressure, weather_wind: parseFloat(currentWeatherData.wind),
        weather_cond: currentWeatherData.condition, timestamp: new Date().toISOString()
    };

    if (db) {
        db.collection("sadina_catches").add(catchData)
        .then(() => {
            alert("Уловът е записан успешно!");
            document.getElementById('input-weight').value = "";
            document.getElementById('photo-file').value = "";
            document.getElementById('photo-preview-box').style.display = "none";
            globalBase64Photo = "";
            switchView('dashboard', document.querySelector('nav div:nth-child(1)'));
        });
    }
}

function analyzePatternMatching(w) {
    const myCatches = allCatches.filter(c => c.user === currentUser);
    const matches = myCatches.filter(c => Math.abs(c.weather_pressure - w.pressure) <= 3);
    const matchBox = document.getElementById('history-match-box');
    if(!matchBox) return;
    
    if(matches.length > 0) {
        let lastBest = matches[matches.length - 1];
        matchBox.innerHTML = `💡 <strong>Историческо съвпадение!</strong> При подобно налягане ти преди хвана <strong>${lastBest.fish}</strong> на стръв: <span style="color:var(--accent-color); font-weight:bold;">${lastBest.size} ${lastBest.baittype} (${lastBest.flavor})</span>.`;
    } else {
        matchBox.innerHTML = `ℹ️ Няма записани твои улови в базата при налягане около ${w.pressure} hPa.`;
    }
}

function renderData() {
    const personalList = document.getElementById('personal-diary-list');
    const adminRadarList = document.getElementById('admin-radar-list');
    const leaderboardList = document.getElementById('leaderboard-list');
    
    if(personalList) personalList.innerHTML = ""; 
    if(adminRadarList) adminRadarList.innerHTML = ""; 
    if(leaderboardList) leaderboardList.innerHTML = "";

    let sortedByWeight = [...allCatches].sort((a, b) => b.weight - a.weight);
    let topCatches = sortedByWeight.slice(0, 5);

    if(leaderboardList) {
        if(topCatches.length > 0) {
            topCatches.forEach((c, index) => {
                let defaultImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
                let imgHtml = c.photo ? `<img class="leaderboard-img" src="${c.photo}">` : `<img class="leaderboard-img" src='${defaultImg}' style="padding:10px;">`;
                leaderboardList.innerHTML += `
                    <div class="leaderboard-item" style="${index === 0 ? 'border-left-color: #f1c40f; background: #2c3e50;' : ''}">
                        <div class="leaderboard-rank">#${index + 1}</div>
                        ${imgHtml}
                        <div class="leaderboard-info"><div style="font-weight:bold;">${c.fish}</div><div style="font-size:12px; color:var(--text-muted);">Рибар: ${c.user}</div></div>
                        <div class="leaderboard-weight">${c.weight > 0 ? c.weight.toFixed(2) + ' кг' : '-- кг'}</div>
                    </div>
                `;
            });
        } else {
            leaderboardList.innerHTML = "<p style='color:var(--text-muted); text-align:center; padding:10px; font-size:12px;'>Няма записани трофеи.</p>";
        }
    }

    let hasOthers = false;
    allCatches.forEach(c => {
        const dateObj = new Date(c.timestamp);
        const timeStr = dateObj.toLocaleTimeString('bg-BG', {hour: '2-digit', minute:'2-digit'});
        const dateStr = dateObj.toLocaleDateString('bg-BG', {day: 'numeric', month: 'short'});
        let loadedPhotoHtml = c.photo ? `<img src="${c.photo}" class="catch-img-render">` : '';
        let weightHtml = c.weight > 0 ? `⚖️ <strong>Тегло:</strong> ${c.weight.toFixed(2)} кг<br>` : '';

        const html = `
            <div class="catch-item ${c.user !== currentUser ? 'others-catch' : ''}">
                <div class="catch-meta"><span>📅 ${dateStr} в ${timeStr} ч. | 📉 ${c.weather_pressure} hPa</span><span class="badge-user-tag" style="background:${c.user !== currentUser ? 'var(--admin-color)' : 'var(--accent-color)'}; color:${c.user !== currentUser ? '#fff' : '#121824'}">${c.user}</span></div>
                <div class="catch-title">🐟 ${c.fish} на Садина</div>
                <div class="catch-details">${weightHtml}• <strong>Стръв:</strong> ${c.size} ${c.baittype} (${c.color}, Аромат: <span style="color:#f1c40f;">${c.flavor}</span>)<br>• <strong>Захранка:</strong> ${c.groundbait && c.groundbait.length > 0 ? c.groundbait.join(', ') : 'Чисто петно'}</div>
                ${loadedPhotoHtml}
            </div>
        `;

        if (c.user === currentUser && personalList) personalList.innerHTML += html;
        if (c.user !== currentUser && adminRadarList) { adminRadarList.innerHTML += html; hasOthers = true; }
    });

    if (personalList && personalList.innerHTML === "") personalList.innerHTML = "<p style='color:var(--text-muted); text-align:center; padding:20px;'>Твоят дневник е празен.</p>";
    if (adminRadarList && !hasOthers) adminRadarList.innerHTML = "<p style='color:var(--text-muted); text-align:center; padding:10px; font-size:12px;'>Радарът е тих.</p>";
}

function setSelect(groupId, btn) { document.querySelectorAll(`#${groupId} .tag-btn`).forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
function toggleMultiSelect(btn) { btn.classList.toggle('active'); }
function getActiveText(groupId) { const activeBtn = document.querySelector(`#${groupId} .tag-btn.active`); return activeBtn ? activeBtn.innerText : ""; }
function getMultiActiveTexts(groupId) { const actives = []; document.querySelectorAll(`#${groupId} .tag-btn.active`).forEach(b => actives.push(b.innerText)); return actives; }