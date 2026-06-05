function calculateMoonPhase(date) {
    let lp = 2551443; 
    let newMoon = new Date(1970, 0, 7, 20, 35, 0);
    let phase = ((date.getTime() - newMoon.getTime()) / 1000) % lp;
    let res = phase / lp; 
    
    if (res < 0.03 || res > 0.97) return { text: "🌑 Нова Луна", val: res, factor: 1.15 }; 
    if (res >= 0.03 && res < 0.22) return { text: "🌒 Нарастващ полумесец", val: res, factor: 0.95 };
    if (res >= 0.22 && res < 0.28) return { text: "🌓 Първа Четвърт", val: res, factor: 1.00 };
    if (res >= 0.28 && res < 0.47) return { text: "🌔 Нарастваща луна", val: res, factor: 1.05 };
    if (res >= 0.47 && res < 0.53) return { text: "🌕 Пълнолуние", val: res, factor: 1.20 }; 
    if (res >= 0.53 && res < 0.72) return { text: "🌖 Намаляваща луна", val: res, factor: 1.00 };
    if (res >= 0.72 && res < 0.78) return { text: "🌗 Последна Четвърт", val: res, factor: 0.90 };
    return { text: "🌘 Намаляващ полумесец", val: res, factor: 0.95 };
}

function fetchWeather() {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=43.4122&longitude=24.8411&current=temperature_2m,surface_pressure,weather_code,wind_speed_10m&wind_speed_unit=ms&timezone=auto";
    
    const moonInfo = calculateMoonPhase(new Date());
    if(document.getElementById('w-moon')) document.getElementById('w-moon').innerText = moonInfo.text;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if(data && data.current) {
                const temp = Math.round(data.current.temperature_2m);
                const pressure = Math.round(data.current.surface_pressure);
                const wind = data.current.wind_speed_10m.toFixed(1);
                const code = data.current.weather_code;
                
                let condition = "Ясно/Слънчево";
                if (code > 0 && code <= 3) condition = "Променлива облачност";
                if (code > 3 && code <= 48) condition = "Облачно/Мъгла";
                if (code > 48) condition = "Дъждовно 🌧️";

                currentWeatherData = { temp, pressure, wind, condition, code };
                
                if(document.getElementById('w-temp')) document.getElementById('w-temp').innerText = temp + " °C";
                if(document.getElementById('w-pressure')) document.getElementById('w-pressure').innerText = pressure + " hPa";
                if(document.getElementById('w-wind')) document.getElementById('w-wind').innerText = wind + " м/с";
                if(document.getElementById('w-condition')) document.getElementById('w-condition').innerText = condition;
            }
            generateSmartRecommendation(currentWeatherData, moonInfo);
            calculateFishActivityAndLayers(currentWeatherData, moonInfo);
        }).catch((err) => {
            console.log("Weather API error, using automatic safe profiling:", err);
            generateSmartRecommendation(currentWeatherData, moonInfo);
            calculateFishActivityAndLayers(currentWeatherData, moonInfo);
        });
}

function calculateFishActivityAndLayers(w, moon) {
    let sharanPct = Math.round(55 * moon.factor), sharanLayer = "Дъно";
    if (w.pressure < 1010) { sharanPct = Math.round(85 * moon.factor); sharanLayer = "Дъно (Активно хранене! 📉)"; }
    else if (w.temp > 22 && w.condition === "Ясно/Слънчево") { sharanLayer = "Средни слоеве / Дъно"; }
    
    let amurPct = 40, amurLayer = "Дъно";
    if (w.temp > 22) { amurPct = 90; amurLayer = (w.condition === "Ясно/Слънчево") ? "Зиг-Риг (☀️)" : "Средни слоеве"; }

    let bialaPct = Math.round(50 * moon.factor), bialaLayer = "Дъно";
    if (w.condition === "Дъждовно 🌧️" || w.pressure < 1010) { bialaPct = Math.round(85 * moon.factor); bialaLayer = "Средни слоеве / Прагове"; }

    let karakudaPct = 60, karakudaLayer = "Дъно";
    if (w.temp > 15) { karakudaPct = 75; karakudaLayer = "Дъно (Шавари)"; }

    if(sharanPct > 100) sharanPct = 100; if(bialaPct > 100) bialaPct = 100;

    if(document.getElementById('act-pct-sharan')) document.getElementById('act-pct-sharan').innerText = sharanPct + "%";
    if(document.getElementById('act-bar-sharan')) document.getElementById('act-bar-sharan').style.width = sharanPct + "%";
    if(document.getElementById('act-layer-sharan')) document.getElementById('act-layer-sharan').innerText = sharanLayer;
    if(document.getElementById('act-pct-amur')) document.getElementById('act-pct-amur').innerText = amurPct + "%";
    if(document.getElementById('act-bar-amur')) document.getElementById('act-bar-amur').style.width = amurPct + "%";
    if(document.getElementById('act-layer-amur')) document.getElementById('act-layer-amur').innerText = amurLayer;
    if(document.getElementById('act-pct-biala')) document.getElementById('act-pct-biala').innerText = bialaPct + "%";
    if(document.getElementById('act-bar-biala')) document.getElementById('act-bar-biala').style.width = bialaPct + "%";
    if(document.getElementById('act-layer-biala')) document.getElementById('act-layer-biala').innerText = bialaLayer;
    if(document.getElementById('act-pct-karakuda')) document.getElementById('act-pct-karakuda').innerText = karakudaPct + "%";
    if(document.getElementById('act-bar-karakuda')) document.getElementById('act-bar-karakuda').style.width = karakudaPct + "%";
    if(document.getElementById('act-layer-karakuda')) document.getElementById('act-layer-karakuda').innerText = karakudaLayer;
}

function generateSmartRecommendation(w, moon) {
    let rec = "";
    if(moon && moon.val >= 0.47 && moon.val < 0.53) {
        rec = "🌕 Луната е в Пълнолуние! Очаквай силни рън-ове на едър шаран през цялата нощ. Подсигури петното с едри бойли.";
    } else if (w.pressure < 1010) {
        rec = "Налягането пада! Шаранът и хищникът слизат плътно долу. Използвайте ярки флуоро цветове с тежък месен аромат.";
    } else if (w.temp > 22) {
        rec = "Топло време. Жегата активизира Амура. Хранете масирано с царевица и търсете рибите в горния слой на Зиг-Риг с аромат Ананас.";
    } else {
        rec = "Балансирано време. Подходящо за тактика с Метод фидер, малки 8-10мм стръвчета и аромат Чесън или Скопекс.";
    }
    if(document.getElementById('smart-recommendation')) document.getElementById('smart-recommendation').innerText = rec;
    if(typeof analyzePatternMatching === "function") analyzePatternMatching(w);
}