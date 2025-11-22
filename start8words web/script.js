// ==========================================
// 全域變數宣告 (必須放在最頂部)
// ==========================================
let map = null;
let marker = null;
let currentInputMode = 'solar'; // 修正錯誤的核心變數
let isTimeHidden = false; 
let isInputsCollapsed = false; 
let originSolar = null; // 暫存原始輸入時間

// ==========================================
// 初始化頁面設定 (時間、選單)
// ==========================================

// 1. 預設時間為現在 (修正時區)
const now = new Date();
const offset = now.getTimezoneOffset() * 60000;
const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);

const elBirthDate = document.getElementById('birthDate');
if(elBirthDate) elBirthDate.value = localISOTime;

// 農曆預設
const elLunarYear = document.getElementById('lunarYear');
if(elLunarYear) elLunarYear.value = now.getFullYear();

const lunarMonths = document.getElementById('lunarMonth');
if(lunarMonths) {
    for(let i=1; i<=12; i++) lunarMonths.add(new Option(i+"月", i));
    lunarMonths.value = now.getMonth() + 1;
}

const lunarDays = document.getElementById('lunarDay');
if(lunarDays) {
    for(let i=1; i<=30; i++) lunarDays.add(new Option("初"+i, i));
    lunarDays.value = now.getDate() > 30 ? 30 : now.getDate();
}

const lunarHours = document.getElementById('lunarHour');
const zhiList = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
if(lunarHours) {
    zhiList.forEach((z, i) => {
        lunarHours.add(new Option(z+"時 (" + ((i*2-1+24)%24) + "-" + (i*2+1) + ")", i));
    });
}

// 初始化干支下拉
const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function populateGZ(idPrefix) {
    const g = document.getElementById(idPrefix + 'Gan');
    const z = document.getElementById(idPrefix + 'Zhi');
    if(g && z) {
        GAN.forEach(v => g.add(new Option(v, v)));
        ZHI.forEach(v => z.add(new Option(v, v)));
    }
}
populateGZ('gzYear'); populateGZ('gzMonth'); populateGZ('gzDay'); populateGZ('gzHour');

// ==========================================
// 介面互動函數 (掛載到 window 以便 HTML 呼叫)
// ==========================================

window.switchTab = function(mode) {
    currentInputMode = mode; // 更新全域變數
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    
    const pSolar = document.getElementById('panelSolar');
    const pLunar = document.getElementById('panelLunar');
    const pGZ = document.getElementById('panelGanZhi');
    
    if(pSolar) pSolar.style.display = mode === 'solar' ? 'flex' : 'none';
    if(pLunar) pLunar.style.display = mode === 'lunar' ? 'flex' : 'none';
    if(pGZ) pGZ.style.display = mode === 'ganzhi' ? 'flex' : 'none';
}

window.toggleInputs = function() {
    const wrapper = document.getElementById('inputWrapper');
    const bar = document.getElementById('toggleBar');
    if (isInputsCollapsed) {
        wrapper.classList.remove('collapsed');
        bar.innerText = '▼ 收起輸入區';
    } else {
        wrapper.classList.add('collapsed');
        bar.innerText = '▲ 展開輸入區';
    }
    isInputsCollapsed = !isInputsCollapsed;
}

// --- 地圖相關函數 ---

window.toggleMap = function(forceClose) {
    const container = document.getElementById('mapContainer');
    const btn = document.getElementById('btnToggleMap');
    
    if (forceClose === true) {
        if(container) container.style.display = 'none';
        if(btn) btn.innerText = '📍 開啟地圖設定地點';
        return;
    }
    
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        btn.innerText = '📍 摺疊地圖';
        if (!map) initMap();
    } else {
        container.style.display = 'none';
        btn.innerText = '📍 開啟地圖設定地點';
    }
}

function initMap() {
    if(typeof L === 'undefined') return; // 確保 Leaflet 已載入
    map = L.map('mapContainer').setView([22.3193, 114.1694], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    map.on('click', function(e) { updateLocation(e.latlng.lat, e.latlng.lng); });
}

// 修正搜尋功能 ReferenceError
window.searchLocation = function() {
    const query = document.getElementById('locationName').value;
    if (!query) return;
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                updateLocation(lat, lon);
                if(map) map.setView([lat, lon], 13);
            } else { 
                alert("找不到該地點"); 
            }
        })
        .catch(err => alert("搜尋錯誤: " + err));
}

function updateLocation(lat, lon) {
    document.getElementById('longitude').value = lon.toFixed(4);
    if (map) {
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lon]).addTo(map);
    }
}

// ==========================================
// 八字核心邏輯
// ==========================================

// 天文算法：均時差 (Equation of Time)
function getEquationOfTime(date) {
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const b = 2 * Math.PI * (dayOfYear - 81) / 365;
    const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    return eot; 
}

// 顏色與文字配置
const WUXING_COLOR = {
    '甲': 'var(--color-wood)', '乙': 'var(--color-wood)', '寅': 'var(--color-wood)', '卯': 'var(--color-wood)',
    '丙': 'var(--color-fire)', '丁': 'var(--color-fire)', '巳': 'var(--color-fire)', '午': 'var(--color-fire)',
    '戊': 'var(--color-earth)', '己': 'var(--color-earth)', '辰': 'var(--color-earth)', '戌': 'var(--color-earth)', '丑': 'var(--color-earth)', '未': 'var(--color-earth)',
    '庚': 'var(--color-metal)', '辛': 'var(--color-metal)', '申': 'var(--color-metal)', '酉': 'var(--color-metal)',
    '壬': 'var(--color-water)', '癸': 'var(--color-water)', '亥': 'var(--color-water)', '子': 'var(--color-water)'
};
const GAN_LIST = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const SHISHEN_SHORT = {
    '比肩': '比', '劫財': '劫', '食神': '食', '傷官': '傷',
    '偏財': '才', '正財': '財', '七殺': '殺', '正官': '官',
    '偏印': '梟', '正印': '印', '日主': '主'
};
const ZHI_TIME = {
    '子': '23-01', '丑': '01-03', '寅': '03-05', '卯': '05-07', '辰': '07-09', '巳': '09-11',
    '午': '11-13', '未': '13-15', '申': '15-17', '酉': '17-19', '戌': '19-21', '亥': '21-23'
};
const LOOKUP_HIDDEN = {
    '子': ['癸'], '丑': ['己','癸','辛'], '寅': ['甲','丙','戊'], 
    '卯': ['乙'], '辰': ['戊','乙','癸'], '巳': ['丙','庚','戊'],
    '午': ['丁','己'], '未': ['己','丁','乙'], '申': ['庚','壬','戊'],
    '酉': ['辛'], '戌': ['戊','辛','丁'], '亥': ['壬','甲']
};

let state = {
    birthSolar: null,
    baseDayGan: null, 
    daYuns: [],
    selDaYunIdx: 0,
    selYear: null,
    selMonth: null,
    selDay: null,
    selHour: null,
};

// --- 開始新排盤 (入口函數) ---
window.startNewChart = function() {
    window.currentDocId = null; // 清空 ID，代表新紀錄
    
    // 呼叫排盤主程式
    initChart(); 
    
    // 自動儲存檢查
    const saveCheck = document.getElementById('saveChartCheck');
    if (saveCheck && saveCheck.checked) {
        setTimeout(() => {
            if (typeof window.handleAutoSave === 'function') {
                window.handleAutoSave(); 
            } else {
                console.error("AutoSave function not found");
            }
        }, 100);
    }
}

// --- 排盤主程式 ---
window.initChart = function() {
    if (typeof Solar === 'undefined') return alert("Library error");

    try {
        const name = document.getElementById('nameInput').value || "未命名";
        const genderVal = document.getElementById('gender').value;
        const genderText = genderVal == "1" ? "男 (乾造)" : "女 (坤造)";
        const location = document.getElementById('locationName').value || "未設定";
        const useTST = document.getElementById('useTST').checked;
        const longitude = parseFloat(document.getElementById('longitude').value);

        // 更新儀表板文字
        const elName = document.getElementById('dispName'); if(elName) elName.innerText = name;
        const elGender = document.getElementById('dispGender'); if(elGender) elGender.innerText = genderText;
        const elLoc = document.getElementById('dispLoc'); if(elLoc) elLoc.innerText = location;

        // 1. 獲取「原始輸入時間」(originSolar)
        // 確保使用全域變數 currentInputMode
        if (currentInputMode === 'solar') {
            const dateStr = document.getElementById('birthDate').value;
            if(!dateStr) return alert("請輸入日期");
            originSolar = Solar.fromDate(new Date(dateStr));
        } 
        else if (currentInputMode === 'lunar') {
            const y = parseInt(document.getElementById('lunarYear').value);
            const m = parseInt(document.getElementById('lunarMonth').value);
            const d = parseInt(document.getElementById('lunarDay').value);
            const hIndex = parseInt(document.getElementById('lunarHour').value);
            let h = hIndex * 2; if(h===0) h=0;
            const lunar = Lunar.fromYmdHms(y, m, d, h, 0, 0);
            originSolar = lunar.getSolar();
        }
        else if (currentInputMode === 'ganzhi') {
            // 干支反推邏輯
            const yg = document.getElementById('gzYearGan').value;
            const yz = document.getElementById('gzYearZhi').value;
            const mg = document.getElementById('gzMonthGan').value;
            const mz = document.getElementById('gzMonthZhi').value;
            const dg = document.getElementById('gzDayGan').value;
            const dz = document.getElementById('gzDayZhi').value;
            const hg = document.getElementById('gzHourGan').value;
            const hz = document.getElementById('gzHourZhi').value;

            const ygz = yg + yz; const mgz = mg + mz; const dgz = dg + dz; const hgz = hg + hz;
            let foundDate = null;
            for (let y = 1924; y < 2044; y++) {
                const testL = Lunar.fromYmd(y, 6, 1);
                if (testL.getYearInGanZhiExact() !== ygz) continue;
                for (let m = 1; m <= 12; m++) {
                    const tm = Lunar.fromYmd(y, m, 15); 
                    if (tm.getMonthInGanZhiExact() !== mgz) continue;
                    const days = SolarUtil.getDaysOfMonth(y, m);
                    for (let d = 1; d <= days; d++) {
                        const td = Lunar.fromYmd(y, m, d);
                        if (td.getDayInGanZhiExact() !== dgz) continue;
                        for (let hIdx = 0; hIdx < 12; hIdx++) {
                            let h = hIdx * 2; if(h===0) h=0;
                            const th = Lunar.fromYmdHms(y, m, d, h, 0, 0);
                            if (th.getTimeInGanZhi() === hgz) {
                                foundDate = th.getSolar();
                                break;
                            }
                        }
                        if (foundDate) break;
                    }
                    if (foundDate) break;
                }
                if (foundDate) break;
            }
            if (foundDate) {
                originSolar = foundDate;
                alert("已搜尋到對應日期：" + originSolar.toYmdHms());
            } else {
                return alert("在 1924-2044 範圍內找不到符合該四柱的日期。");
            }
        }

        // 2. 計算真太陽時 (用於排盤)
        let calculatingSolar = originSolar; 
        let tstDisplay = "否 (平太陽時)";

        if (useTST) {
            const stdMeridian = 120; 
            const diffDeg = longitude - stdMeridian;
            const meanOffsetMin = diffDeg * 4; 
            
            let tempDate = new Date(
                originSolar.getYear(), originSolar.getMonth()-1, originSolar.getDay(), 
                originSolar.getHour(), originSolar.getMinute()
            );
            const eotMin = getEquationOfTime(tempDate);
            const totalOffset = meanOffsetMin + eotMin;

            let nativeDate = new Date(tempDate.getTime());
            nativeDate.setMinutes(nativeDate.getMinutes() + totalOffset);
            
            calculatingSolar = Solar.fromDate(nativeDate); // 排盤用這個
            
            const m = nativeDate.getMinutes();
            const mStr = m < 10 ? "0"+m : m;
            tstDisplay = `是 (${nativeDate.getHours()}:${mStr})`;
        }

        // 3. 填充儀表板 (顯示原始時間)
        const sY = originSolar.getYear();
        const sM = originSolar.getMonth();
        const sD = originSolar.getDay();
        const sH = originSolar.getHour();
        const min = originSolar.getMinute();
        const minStr = min < 10 ? "0"+min : min;
        document.getElementById('dispSolar').innerText = `${sY}年${sM}月${sD}日 ${sH}:${minStr}`;
        
        const lObj = originSolar.getLunar();
        document.getElementById('dispLunar').innerText = `${lObj.getYearInChinese()}年 ${lObj.getMonthInChinese()}月${lObj.getDayInChinese()} ${lObj.getTimeZhi()}時`;
        document.getElementById('dispTST').innerText = tstDisplay;

        document.getElementById('infoDashboard').style.display = 'grid';

        toggleMap(true);
        if (!isInputsCollapsed) toggleInputs();

        // 4. 執行八字計算
        state.birthSolar = calculatingSolar; 
        const bazi = state.birthSolar.getLunar().getEightChar();
        state.baseDayGan = bazi.getDayGan();

        renderMainPillar('baseHour', bazi.getTimeGan(), bazi.getTimeZhi(), '時柱', false, '', true); 
        renderMainPillar('baseDay', bazi.getDayGan(), bazi.getDayZhi(), '日柱', true, '');
        renderMainPillar('baseMonth', bazi.getMonthGan(), bazi.getMonthZhi(), '月柱', false, '');
        renderMainPillar('baseYear', bazi.getYearGan(), bazi.getYearZhi(), '年柱', false, '');

        const yun = bazi.getYun(parseInt(genderVal));
        state.daYuns = yun.getDaYun();

        const now = new Date();
        state.selYear = now.getFullYear();
        state.selMonth = now.getMonth() + 1;
        state.selDay = now.getDate();
        state.selHour = now.getHours();

        let birthYear = state.birthSolar.getYear();
        let foundIndex = 0;
        for(let i=0; i<state.daYuns.length; i++) {
            const dy = state.daYuns[i];
            let startY = dy.getStartYear();
            if(startY < 1000) startY += birthYear;
            if(state.selYear >= startY) foundIndex = i;
            else break;
        }
        state.selDaYunIdx = Math.min(foundIndex, 11);

        document.getElementById('topDisplay').style.display = 'flex';
        document.getElementById('rails').style.display = 'flex';

        renderRails();
        updateActiveDisplay();
        
        window.scrollTo(0, 0);

        // 5. 準備儲存資料 (使用原始輸入時間)
        window.currentBaziData = {
            name: document.getElementById('nameInput').value || "未命名",
            gender: parseInt(document.getElementById('gender').value),
            
            birthDate: originSolar.toYmdHms(), // 存原始時間
            
            lunarDate: lObj.toString(),
            inputMode: currentInputMode,
            location: document.getElementById('locationName').value,
            useTST: document.getElementById('useTST').checked,
            tags: document.getElementById('tagsInput') ? document.getElementById('tagsInput').value : '客戸', 
            bazi: {
                year: bazi.getYearGan() + bazi.getYearZhi(),
                month: bazi.getMonthGan() + bazi.getMonthZhi(),
                day: bazi.getDayGan() + bazi.getDayZhi(),
                hour: bazi.getTimeGan() + bazi.getTimeZhi()
            }
        };

    } catch (e) {
        console.error(e);
        alert("錯誤: " + e.message);
    }
}

// ==========================================
// 輔助函數 (十神、顯示、眼仔)
// ==========================================

function getShiShen(targetGan, isDayPillarStem) {
    if (!state.baseDayGan || !targetGan) return '';
    if (isDayPillarStem) return '日主';
    const dayIdx = GAN_LIST.indexOf(state.baseDayGan);
    const targetIdx = GAN_LIST.indexOf(targetGan);
    if (dayIdx === -1 || targetIdx === -1) return '';
    const dayEl = Math.floor(dayIdx / 2);
    const targetEl = Math.floor(targetIdx / 2);
    const dayYinYang = dayIdx % 2;
    const targetYinYang = targetIdx % 2;
    const samePol = (dayYinYang === targetYinYang);
    if (dayEl === targetEl) return samePol ? '比肩' : '劫財';
    if ((dayEl + 1) % 5 === targetEl) return samePol ? '食神' : '傷官';
    if ((targetEl + 1) % 5 === dayEl) return samePol ? '偏印' : '正印';
    if ((dayEl + 2) % 5 === targetEl) return samePol ? '偏財' : '正財';
    if ((targetEl + 2) % 5 === dayEl) return samePol ? '七殺' : '正官';
    return '';
}
function getShortShiShen(fullShiShen) { return SHISHEN_SHORT[fullShiShen] || ''; }

window.toggleTimeVisibility = function() {
    isTimeHidden = !isTimeHidden;
    const contentDiv = document.getElementById('pillarContent_baseHour');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (isTimeHidden) {
        contentDiv.style.display = 'none';
        eyeIcon.innerText = '🔒';
        if (!document.getElementById('maskText')) {
            const mask = document.createElement('div');
            mask.id = 'maskText';
            mask.className = 'lucky-mask';
            mask.innerText = '吉時';
            contentDiv.parentElement.appendChild(mask);
        } else {
            document.getElementById('maskText').style.display = 'flex';
        }
    } else {
        contentDiv.style.display = 'flex';
        eyeIcon.innerText = '👁';
        const mask = document.getElementById('maskText');
        if(mask) mask.style.display = 'none';
    }
}

function centerActiveItem(container) {
    const active = container.querySelector('.active');
    if (!active) return;
    const scrollLeft = active.offsetLeft - (container.clientWidth / 2) + (active.clientWidth / 2);
    container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
    });
}

function renderMainPillar(id, gan, zhi, title, isDayPillar, infoText, hasEye = false) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const shishen = getShiShen(gan, isDayPillar);
    const shishenClass = (shishen === '日主') ? 'shishen-top dm' : 'shishen-top';
    const hiddenGans = LOOKUP_HIDDEN[zhi] || [];
    let cangganHtml = '';
    hiddenGans.forEach(hGan => {
        const hShishen = getShiShen(hGan, false);
        const color = WUXING_COLOR[hGan] || '#333';
        cangganHtml += `<div class="canggan-row"><span class="canggan-char" style="color:${color}">${hGan}</span><span class="canggan-shishen">${hShishen}</span></div>`;
    });

    const infoHtml = infoText ? `<div class="top-info">${infoText}</div>` : `<div class="top-info" style="border:none;"></div>`;
    
    const eyeHtml = hasEye ? `<div id="eyeIcon" class="eye-btn" onclick="toggleTimeVisibility()">👁</div>` : '';
    
    const contentHtml = `
        <div id="pillarContent_${id}" style="display:flex; flex-direction:column; align-items:center; width:100%;">
            <div class="${shishenClass}">${shishen}</div>
            <div class="gan" style="color:${WUXING_COLOR[gan]}">${gan}</div>
            <div class="zhi" style="color:${WUXING_COLOR[zhi]}">${zhi}</div>
            <div class="canggan-box">${cangganHtml}</div>
        </div>
    `;

    el.innerHTML = `${eyeHtml}${infoHtml}<div class="title-text">${title}</div>${contentHtml}`;
}

function renderRailPillar(gan, zhi, title, infoText) {
    const ganSS = getShortShiShen(getShiShen(gan, false));
    const zhiMainGan = (LOOKUP_HIDDEN[zhi] || [])[0];
    const zhiSS = zhiMainGan ? getShortShiShen(getShiShen(zhiMainGan, false)) : '';
    return `<div class="rail-info">${infoText}</div><div class="title-text">${title}</div><div class="rail-row-inner"><span class="rail-char" style="color:${WUXING_COLOR[gan]}">${gan}</span><span class="rail-ss">${ganSS}</span></div><div class="rail-row-inner"><span class="rail-char" style="color:${WUXING_COLOR[zhi]}">${zhi}</span><span class="rail-ss">${zhiSS}</span></div>`;
}

function createRailEl(gan, zhi, title, infoText) {
    const div = document.createElement('div');
    div.className = 'pillar rail selectable';
    div.innerHTML = renderRailPillar(gan, zhi, title, infoText);
    return div;
}

function renderRails() {
    renderDaYunRail();
    renderYearRail();
    renderMonthRail();
    renderDayRail();
    renderHourRail();
}

function renderDaYunRail() {
    const container = document.getElementById('dayunRail');
    container.innerHTML = '';
    let birthYear = state.birthSolar.getYear();
    for(let i=0; i<state.daYuns.length && i<12; i++) {
        const dy = state.daYuns[i];
        const gz = dy.getGanZhi(); 
        let startY = dy.getStartYear();
        if(startY < 1000) startY += birthYear;
        const info = `${dy.getStartAge()}歲起\n${startY}年`;
        const el = createRailEl(gz.charAt(0), gz.charAt(1), '', info);
        el.onclick = () => {
            state.selDaYunIdx = i;
            state.selYear = startY;
            renderRailsCascadeFromYear();
            highlightSelection('dayunRail', i);
        };
        if(i === state.selDaYunIdx) el.classList.add('active');
        container.appendChild(el);
    }
    setTimeout(() => centerActiveItem(container), 0);
}

function renderYearRail() {
    const box = document.getElementById('yearRail');
    box.innerHTML = '';
    const dy = state.daYuns[state.selDaYunIdx];
    let startY = dy.getStartYear();
    let birthYear = state.birthSolar.getYear();
    if(startY < 1000) startY += birthYear;
    for(let i=0; i<10; i++) {
        const y = startY + i;
        const sample = Solar.fromYmd(y, 6, 1).getLunar();
        const gz = sample.getYearInGanZhi();
        const age = y - birthYear + 1;
        const info = `${age}歲\n${y}年`;
        const el = createRailEl(gz.charAt(0), gz.charAt(1), '', info);
        el.onclick = () => {
            state.selYear = y;
            renderRailsCascadeFromMonth();
            highlightSelection('yearRail', i);
        };
        if(y === state.selYear) el.classList.add('active');
        box.appendChild(el);
    }
    setTimeout(() => centerActiveItem(box), 0);
}

function renderMonthRail() {
    const box = document.getElementById('monthRail');
    box.innerHTML = '';
    const startYear = state.selYear;
    for (let i = 0; i < 12; i++) {
        let y = startYear;
        let m = i + 2; 
        if (m > 12) { m -= 12; y++; }
        
        const sample = Solar.fromYmd(y, m, 15); 
        const lunar = sample.getLunar();
        const gz = lunar.getMonthInGanZhi();
        const prevJie = lunar.getPrevJie(true);
        const info = `${prevJie.getName()}\n${prevJie.getSolar().getDay()}/${prevJie.getSolar().getMonth()}`;

        const el = createRailEl(gz.charAt(0), gz.charAt(1), '', info);
        
        el.onclick = () => {
            state.selYear = y; 
            state.selMonth = m;
            renderRailsCascadeFromDay();
            highlightSelection('monthRail', i);
        };
        
        if(m === state.selMonth && y === state.selYear) el.classList.add('active');
        box.appendChild(el);
    }
    setTimeout(() => centerActiveItem(box), 0);
}

function renderDayRail() {
    const box = document.getElementById('dayRail');
    box.innerHTML = '';
    const days = SolarUtil.getDaysOfMonth(state.selYear, state.selMonth);
    if(state.selDay > days) state.selDay = 1;
    for(let d=1; d<=days; d++) {
        const sample = Solar.fromYmd(state.selYear, state.selMonth, d).getLunar();
        const gz = sample.getDayInGanZhi();
        const info = `${sample.getDayInChinese()}\n${d}/${state.selMonth}`;
        const el = createRailEl(gz.charAt(0), gz.charAt(1), '', info);
        el.onclick = () => {
            state.selDay = d;
            renderRailsCascadeFromHour();
            highlightSelection('dayRail', d-1);
        };
        if(d === state.selDay) el.classList.add('active');
        box.appendChild(el);
    }
    setTimeout(() => centerActiveItem(box), 0);
}

function renderHourRail() {
    const box = document.getElementById('hourRail');
    box.innerHTML = '';
    const zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    for(let i=0; i<12; i++) {
        let h = i*2; if(i===0) h=0;
        const sample = Solar.fromYmdHms(state.selYear, state.selMonth, state.selDay, h, 0, 0).getLunar();
        const gz = sample.getTimeInGanZhi();
        const info = ZHI_TIME[zhi[i]] + "時";
        const el = createRailEl(gz.charAt(0), zhi[i], '', info);
        el.onclick = () => {
            state.selHour = h;
            updateActiveDisplay();
            highlightSelection('hourRail', i);
        };
        let currentIdx = Math.floor((state.selHour + 1) / 2) % 12;
        if(i === currentIdx) el.classList.add('active');
        box.appendChild(el);
    }
    setTimeout(() => centerActiveItem(box), 0);
}

function renderRailsCascadeFromYear() { renderYearRail(); renderMonthRail(); renderDayRail(); renderHourRail(); updateActiveDisplay(); }
function renderRailsCascadeFromMonth() { renderMonthRail(); renderDayRail(); renderHourRail(); updateActiveDisplay(); }
function renderRailsCascadeFromDay() { renderDayRail(); renderHourRail(); updateActiveDisplay(); }
function renderRailsCascadeFromHour() { renderHourRail(); updateActiveDisplay(); }

function updateActiveDisplay() {
    let birthYear = state.birthSolar.getYear();
    const dy = state.daYuns[state.selDaYunIdx];
    const dyGZ = dy.getGanZhi();
    let dyStartAge = dy.getStartAge();
    let dyStartYear = dy.getStartYear();
    if(dyStartYear < 1000) dyStartYear += birthYear;
    const dyInfo = `${dyStartAge}歲起\n${dyStartYear}年`;
    renderMainPillar('activeDaYun', dyGZ.charAt(0), dyGZ.charAt(1), '大運', false, dyInfo);
    
    const activeSolar = Solar.fromYmdHms(state.selYear, state.selMonth, state.selDay, state.selHour, 0, 0);
    const activeLunar = activeSolar.getLunar();
    const bazi = activeLunar.getEightChar();
    
    const currentAge = state.selYear - birthYear + 1;
    const yearInfo = `${currentAge}歲\n${state.selYear}年`;
    renderMainPillar('activeYear', bazi.getYearGan(), bazi.getYearZhi(), '流年', false, yearInfo);

    const prevJie = activeLunar.getPrevJie(true);
    const jieName = prevJie.getName();
    const jieDate = prevJie.getSolar();
    const monthInfo = `${jieName}\n${jieDate.getDay()}/${jieDate.getMonth()}`;
    renderMainPillar('activeMonth', bazi.getMonthGan(), bazi.getMonthZhi(), '流月', false, monthInfo);

    const lunarDayStr = activeLunar.getDayInChinese();
    const dayInfo = `${lunarDayStr}\n${state.selDay}/${state.selMonth}`;
    renderMainPillar('activeDay', bazi.getDayGan(), bazi.getDayZhi(), '流日', false, dayInfo);

    const timeZhi = bazi.getTimeZhi();
    const timeRange = ZHI_TIME[timeZhi] + "時";
    renderMainPillar('activeHour', bazi.getTimeGan(), timeZhi, '流時', false, timeRange);
}

function highlightSelection(id, idx) {
    const c = document.getElementById(id).children;
    for(let el of c) el.classList.remove('active');
    if(c[idx]) c[idx].classList.add('active');
}
