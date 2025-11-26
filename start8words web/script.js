// ==========================================
// 1. 全域變數設定 (強制掛載到 window)
// ==========================================
window.map = null;
window.marker = null;
window.currentInputMode = 'solar';
window.isTimeHidden = false; 
window.isInputsCollapsed = false; 
window.isToolsCollapsed = true; 
window.isShenShaVisible = true; 
window.originSolar = null;
window.currentBaziData = null;
window.currentDocId = null;

// ==========================================
// 2. 頁面載入初始化
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Ready");
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    
    const elBirthDate = document.getElementById('birthDate');
    if(elBirthDate) elBirthDate.value = localISOTime;

    const elLunarYear = document.getElementById('lunarYear');
    if(elLunarYear) elLunarYear.value = now.getFullYear();

    const lunarMonths = document.getElementById('lunarMonth');
    if(lunarMonths) {
        lunarMonths.innerHTML = '';
        for(let i=1; i<=12; i++) lunarMonths.add(new Option(i+"月", i));
        lunarMonths.value = now.getMonth() + 1;
    }

    const lunarDays = document.getElementById('lunarDay');
    if(lunarDays) {
        lunarDays.innerHTML = '';
        for(let i=1; i<=30; i++) lunarDays.add(new Option("初"+i, i));
        lunarDays.value = now.getDate() > 30 ? 30 : now.getDate();
    }

    const lunarHours = document.getElementById('lunarHour');
    const zhiList = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    if(lunarHours) {
        lunarHours.innerHTML = '';
        zhiList.forEach((z, i) => {
            lunarHours.add(new Option(z+"時 (" + ((i*2-1+24)%24) + "-" + (i*2+1) + ")", i));
        });
    }

    populateGZ('gzYear'); populateGZ('gzMonth'); populateGZ('gzDay'); populateGZ('gzHour');
});

function populateGZ(idPrefix) {
    const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const g = document.getElementById(idPrefix + 'Gan');
    const z = document.getElementById(idPrefix + 'Zhi');
    if(g && z) {
        g.innerHTML = ''; z.innerHTML = '';
        GAN.forEach(v => g.add(new Option(v, v)));
        ZHI.forEach(v => z.add(new Option(v, v)));
    }
}

// ==========================================
// 3. 介面互動函數
// ==========================================

window.switchTab = function(mode) {
    window.currentInputMode = mode;
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    try { if(event && event.target) event.target.classList.add('active'); } catch(e){}
    
    const pSolar = document.getElementById('panelSolar');
    const pLunar = document.getElementById('panelLunar');
    const pGZ = document.getElementById('panelGanZhi');
    
    if(pSolar) pSolar.style.display = mode === 'solar' ? 'flex' : 'none';
    if(pLunar) pLunar.style.display = mode === 'lunar' ? 'flex' : 'none';
    if(pGZ) pGZ.style.display = mode === 'ganzhi' ? 'flex' : 'none';
}

window.toggleInputs = function() {
    const wrapper = document.getElementById('inputWrapper');
    const btn = document.getElementById('toggleInputBtn'); 
    
    if (window.isInputsCollapsed) {
        wrapper.classList.remove('collapsed');
        btn.innerText = '▼ 收起輸入區';
    } else {
        wrapper.classList.add('collapsed');
        btn.innerText = '▲ 展開輸入區';
    }
    window.isInputsCollapsed = !window.isInputsCollapsed;
}

window.toggleTools = function() {
    const bar = document.getElementById('toolsBar');
    const btn = document.getElementById('toggleToolsBtn');
    
    if (window.isToolsCollapsed) {
        bar.style.display = 'flex';
        btn.innerText = '▲ 收起工具列';
        window.isToolsCollapsed = false;
    } else {
        bar.style.display = 'none';
        btn.innerText = '▼ 展開工具列';
        window.isToolsCollapsed = true;
    }
}

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
        setTimeout(() => { if (!window.map) initMap(); }, 200);
    } else {
        container.style.display = 'none';
        btn.innerText = '📍 開啟地圖設定地點';
    }
}

function initMap() {
    if(typeof L === 'undefined') return;
    try {
        window.map = L.map('mapContainer').setView([22.3193, 114.1694], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(window.map);
        window.map.on('click', function(e) { updateLocation(e.latlng.lat, e.latlng.lng); });
    } catch(e) { console.error(e); }
}

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
                if(window.map) window.map.setView([lat, lon], 13);
            } else { alert("找不到該地點"); }
        })
        .catch(err => alert("搜尋錯誤"));
}

function updateLocation(lat, lon) {
    document.getElementById('longitude').value = lon.toFixed(4);
    if (window.map) {
        if (window.marker) window.map.removeLayer(window.marker);
        window.marker = L.marker([lat, lon]).addTo(window.map);
    }
}

// ==========================================
// 4. 排盤核心邏輯
// ==========================================

function getEquationOfTime(date) {
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const b = 2 * Math.PI * (dayOfYear - 81) / 365;
    const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    return eot; 
}

const WUXING_COLOR = {'甲':'var(--color-wood)','乙':'var(--color-wood)','寅':'var(--color-wood)','卯':'var(--color-wood)','丙':'var(--color-fire)','丁':'var(--color-fire)','巳':'var(--color-fire)','午':'var(--color-fire)','戊':'var(--color-earth)','己':'var(--color-earth)','辰':'var(--color-earth)','戌':'var(--color-earth)','丑':'var(--color-earth)','未':'var(--color-earth)','庚':'var(--color-metal)','辛':'var(--color-metal)','申':'var(--color-metal)','酉':'var(--color-metal)','壬':'var(--color-water)','癸':'var(--color-water)','亥':'var(--color-water)','子':'var(--color-water)'};
const GAN_LIST = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI_LIST = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const SHISHEN_SHORT = {'比肩':'比','劫財':'劫','食神':'食','傷官':'傷','偏財':'才','正財':'財','七殺':'殺','正官':'官','偏印':'梟','正印':'印','日主':'主'};
const ZHI_TIME = {'子':'23-01','丑':'01-03','寅':'03-05','卯':'05-07','辰':'07-09','巳':'09-11','午':'11-13','未':'13-15','申':'15-17','酉':'17-19','戌':'19-21','亥':'21-23'};
const LOOKUP_HIDDEN = {'子':['癸'],'丑':['己','癸','辛'],'寅':['甲','丙','戊'],'卯':['乙'],'辰':['戊','乙','癸'],'巳':['丙','庚','戊'],'午':['丁','己'],'未':['己','丁','乙'],'申':['庚','壬','戊'],'酉':['辛'],'戌':['戊','辛','丁'],'亥':['壬','甲']};

let state = { birthSolar: null, baseDayGan: null, daYuns: [], selDaYunIdx: 0, selYear: null, selMonth: null, selDay: null, selHour: null };

// --- 開始新排盤 (入口函數) ---
window.startNewChart = function() {
    window.currentDocId = null; 
    
    // [干支反推模式]
    if (window.currentInputMode === 'ganzhi') {
        const yg = document.getElementById('gzYearGan').value;
        const yz = document.getElementById('gzYearZhi').value;
        const mg = document.getElementById('gzMonthGan').value;
        const mz = document.getElementById('gzMonthZhi').value;
        const dg = document.getElementById('gzDayGan').value;
        const dz = document.getElementById('gzDayZhi').value;
        const hg = document.getElementById('gzHourGan').value;
        const hz = document.getElementById('gzHourZhi').value;

        if(!yg || !yz || !mg || !mz || !dg || !dz || !hg || !hz) {
            alert("請完整選擇四柱干支");
            return;
        }

        searchDates(yg, yz, mg, mz, dg, dz, hg, hz);
        return;
    }

    window.initChart(); 
    
    const saveCheck = document.getElementById('saveChartCheck');
    if (saveCheck && saveCheck.checked) {
        setTimeout(() => {
            if (typeof window.handleAutoSave === 'function') {
                window.handleAutoSave(); 
            }
        }, 200);
    }
}

function validateGanZhi(yg, yz, mg, mz, dg, dz, hg, hz) {
    const ygIdx = GAN_LIST.indexOf(yg);
    const mgIdx = GAN_LIST.indexOf(mg);
    const mzIdx = ZHI_LIST.indexOf(mz);
    
    const startMonthGan = (ygIdx % 5 * 2 + 2) % 10; 
    let monthDiff = mzIdx - 2;
    if (monthDiff < 0) monthDiff += 12;
    
    const expectedMgIdx = (startMonthGan + monthDiff) % 10;
    if (expectedMgIdx !== mgIdx) return "年柱與月柱不符 (五虎遁)";

    const dgIdx = GAN_LIST.indexOf(dg);
    const hgIdx = GAN_LIST.indexOf(hg);
    const hzIdx = ZHI_LIST.indexOf(hz); 
    
    const startHourGan = (dgIdx % 5 * 2) % 10;
    const expectedHgIdx = (startHourGan + hzIdx) % 10;
    
    if (expectedHgIdx !== hgIdx) return "日柱與時柱不符 (五鼠遁)";

    return null;
}

function searchDates(yg, yz, mg, mz, dg, dz, hg, hz) {
    const err = validateGanZhi(yg, yz, mg, mz, dg, dz, hg, hz);
    if (err) {
        alert("干支組合錯誤：" + err);
        return;
    }

    const results = [];
    const START_YEAR = 1800;
    const END_YEAR = 2100;

    let startY = -1;
    for(let y = START_YEAR; y <= START_YEAR + 65; y++) {
        const bazi = Solar.fromYmd(y, 5, 15).getLunar().getEightChar();
        if (bazi.getYearGan() === yg && bazi.getYearZhi() === yz) {
            startY = y;
            break;
        }
    }

    if (startY === -1) {
        alert("在搜尋範圍內找不到符合的年柱");
        return;
    }

    for (let y = startY; y <= END_YEAR; y += 60) {
        const l = Lunar.fromYmd(y, 6, 1);
        const jieQiTable = l.getJieQiTable();
        const jieQiNames = l.getJieQiList(); 
        
        for (let jqKey in jieQiTable) {
            const solar = jieQiTable[jqKey];
            const checkDate = Solar.fromYmdHms(solar.getYear(), solar.getMonth(), solar.getDay(), 12, 0, 0);
            const checkBazi = checkDate.getLunar().getEightChar();
            
            if (checkBazi.getMonthGan() === mg && checkBazi.getMonthZhi() === mz) {
                let current = solar; 
                let daysChecked = 0;
                
                while (daysChecked < 35) {
                    const curBazi = current.getLunar().getEightChar();
                    if (curBazi.getMonthGan() !== mg || curBazi.getMonthZhi() !== mz) {
                        if (daysChecked > 0) break; 
                    }
                    
                    if (curBazi.getDayGan() === dg && curBazi.getDayZhi() === dz) {
                        const hIdx = ZHI_LIST.indexOf(hz);
                        let hour = hIdx * 2;
                        if (hz === '子') hour = 0; 
                        
                        results.push({
                            date: current.toYmd(),
                            time: (hour < 10 ? '0'+hour : hour) + ":00",
                            ganzhi: `${yg}${yz}年 ${mg}${mz}月 ${dg}${dz}日 ${hg}${hz}時`
                        });
                    }
                    
                    current = current.next(1);
                    daysChecked++;
                }
                break; 
            }
        }
    }

    showReverseResults(results);
}

function showReverseResults(results) {
    const modal = document.getElementById('reverseResultModal');
    const list = document.getElementById('reverseList');
    list.innerHTML = '';

    if (results.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px;">找不到符合的日期</p>';
    } else {
        results.forEach(r => {
            const div = document.createElement('div');
            div.className = 'chart-item';
            div.innerHTML = `
                <div class="chart-info" onclick="selectReverseDate('${r.date}', '${r.time}')">
                    <div class="chart-name">${r.date} ${r.time}</div>
                    <div class="chart-detail">${r.ganzhi}</div>
                </div>
            `;
            list.appendChild(div);
        });
    }
    modal.style.display = 'flex';
}

window.closeReverseModal = function() {
    document.getElementById('reverseResultModal').style.display = 'none';
}

window.selectReverseDate = function(dateStr, timeStr) {
    window.switchTab('solar');
    document.getElementById('birthDate').value = dateStr + 'T' + timeStr;
    window.closeReverseModal();
    window.startNewChart();
}

// --- 排盤主程式 ---
window.initChart = function() {
    if (typeof Solar === 'undefined') return alert("Library error: Lunar.js not loaded");

    window.currentBaziData = null;

    try {
        const name = document.getElementById('nameInput').value || "未命名";
        const genderVal = document.getElementById('gender').value;
        const genderText = genderVal == "1" ? "男 (乾造)" : "女 (坤造)";
        const location = document.getElementById('locationName').value || "未設定";
        const useTST = document.getElementById('useTST').checked;
        const longitude = parseFloat(document.getElementById('longitude').value);
        
        const zishiEl = document.querySelector('input[name="zishiMode"]:checked');
        const zishiMode = zishiEl ? zishiEl.value : '23';

        const elName = document.getElementById('dispName'); if(elName) elName.innerText = name;
        const elGender = document.getElementById('dispGender'); if(elGender) elGender.innerText = genderText;
        const elLoc = document.getElementById('dispLoc'); if(elLoc) elLoc.innerText = location;

        window.originSolar = null;

        if (window.currentInputMode === 'solar') {
            const dateStr = document.getElementById('birthDate').value;
            if(!dateStr) return alert("請輸入日期");
            window.originSolar = Solar.fromDate(new Date(dateStr));
        } 
        else if (window.currentInputMode === 'lunar') {
            const y = parseInt(document.getElementById('lunarYear').value);
            const m = parseInt(document.getElementById('lunarMonth').value);
            const d = parseInt(document.getElementById('lunarDay').value);
            const hIndex = parseInt(document.getElementById('lunarHour').value);
            let h = hIndex * 2; if(h===0) h=0;
            const lunar = Lunar.fromYmdHms(y, m, d, h, 0, 0);
            window.originSolar = lunar.getSolar();
        }

        // 2. 真太陽時計算
        let calculatingSolar = window.originSolar; 
        let tstDisplay = "否 (平太陽時)";

        if (useTST) {
            const stdMeridian = 120; 
            const diffDeg = longitude - stdMeridian;
            const meanOffsetMin = diffDeg * 4; 
            
            let tempDate = new Date(
                window.originSolar.getYear(), 
                window.originSolar.getMonth() - 1, 
                window.originSolar.getDay(), 
                window.originSolar.getHour(), 
                window.originSolar.getMinute()
            );
            const eotMin = getEquationOfTime(tempDate);
            const totalOffset = meanOffsetMin + eotMin;

            let nativeDate = new Date(tempDate.getTime());
            nativeDate.setMinutes(nativeDate.getMinutes() + totalOffset);
            
            calculatingSolar = Solar.fromDate(nativeDate);
            
            const m = nativeDate.getMinutes();
            const mStr = m < 10 ? "0"+m : m;
            tstDisplay = `是 (${nativeDate.getHours()}:${mStr})`;
        }

        // 3. 儀表板顯示
        const sY = window.originSolar.getYear();
        const sM = window.originSolar.getMonth();
        const sD = window.originSolar.getDay();
        const sH = window.originSolar.getHour();
        const min = window.originSolar.getMinute();
        const minStr = min < 10 ? "0"+min : min;
        document.getElementById('dispSolar').innerText = `${sY}年${sM}月${sD}日 ${sH}:${minStr}`;
        
        const lObj = window.originSolar.getLunar();
        document.getElementById('dispLunar').innerText = `${lObj.getYearInChinese()}年 ${lObj.getMonthInChinese()}月${lObj.getDayInChinese()} ${lObj.getTimeZhi()}時`;
        document.getElementById('dispTST').innerText = tstDisplay;

        document.getElementById('infoDashboard').style.display = 'grid';
        window.toggleMap(true);
        if (!window.isInputsCollapsed) window.toggleInputs();

        // 4. 八字計算 (子時邏輯)
        let finalSolarForBazi = calculatingSolar;
        let isNightRat = false;

        if (calculatingSolar.getHour() === 23) {
            if (zishiMode === '23') {
                let d = new Date(calculatingSolar.getYear(), calculatingSolar.getMonth()-1, calculatingSolar.getDay(), calculatingSolar.getHour(), calculatingSolar.getMinute());
                d.setHours(d.getHours() + 1);
                finalSolarForBazi = Solar.fromDate(d);
                tstDisplay += " [23:00換日]";
            } else {
                isNightRat = true;
                tstDisplay += " [夜子不換日]";
            }
        }
        
        state.birthSolar = finalSolarForBazi; 
        const bazi = state.birthSolar.getLunar().getEightChar();
        state.baseDayGan = bazi.getDayGan();

        let timeTitle = '時柱';
        if (isNightRat) timeTitle = '時柱 (夜子)';

        renderMainPillar('baseHour', bazi.getTimeGan(), bazi.getTimeZhi(), timeTitle, false, '', true); 
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
        if (state.daYuns && state.daYuns.length > 0) {
            for(let i=0; i<state.daYuns.length; i++) {
                const dy = state.daYuns[i];
                let startY = dy.getStartYear();
                if(startY < 1000) startY += birthYear;
                if(state.selYear >= startY) foundIndex = i;
                else break;
            }
        }
        state.selDaYunIdx = Math.min(foundIndex, 11);

        document.getElementById('topDisplay').style.display = 'flex';
        document.getElementById('rails').style.display = 'flex';

        renderRails();
        updateActiveDisplay();
        window.scrollTo(0, 0);

        // 5. 準備儲存資料
        window.currentBaziData = {
            name: document.getElementById('nameInput').value || "未命名",
            gender: parseInt(document.getElementById('gender').value),
            birthDate: window.originSolar.toYmdHms(), 
            lunarDate: lObj.toString(),
            inputMode: window.currentInputMode,
            location: document.getElementById('locationName').value,
            useTST: document.getElementById('useTST').checked,
            tags: document.getElementById('tagsInput') ? document.getElementById('tagsInput').value : '自己', 
            zishiMode: zishiMode,
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
// 5. 輔助函數
// ==========================================
function getShiShen(targetGan, isDayPillarStem) {
    if (!state.baseDayGan || !targetGan || targetGan === '&nbsp;' || targetGan === '吉') return '';
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

function getZhangSheng(gan, zhi) {
    if (!gan || !zhi || gan === '&nbsp;' || zhi === '&nbsp;' || gan === '吉') return '';
    const ZS_ORDER = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'];
    const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const GAN_RULES = {
        '甲': { start: '亥', forward: true }, '乙': { start: '午', forward: false },
        '丙': { start: '寅', forward: true }, '戊': { start: '寅', forward: true }, 
        '丁': { start: '酉', forward: false }, '己': { start: '酉', forward: false },
        '庚': { start: '巳', forward: true }, '辛': { start: '子', forward: false },
        '壬': { start: '申', forward: true }, '癸': { start: '卯', forward: false }
    };
    const rule = GAN_RULES[gan]; if (!rule) return '';
    const startIdx = ZHI_ORDER.indexOf(rule.start);
    const targetIdx = ZHI_ORDER.indexOf(zhi);
    if (startIdx === -1 || targetIdx === -1) return '';
    let offset;
    if (rule.forward) offset = targetIdx - startIdx;
    else offset = startIdx - targetIdx;
    if (offset < 0) offset += 12;
    offset = offset % 12;
    return ZS_ORDER[offset];
}

function getShortShiShen(fullShiShen) { return SHISHEN_SHORT[fullShiShen] || ''; }

function getShenSha(pillarZhi, dayGan, dayZhi, yearZhi) {
    if (!pillarZhi || !dayGan || pillarZhi === '&nbsp;' || pillarZhi === '時') return [];
    const list = [];
    const nobleMap = {
        '甲': ['丑','未'], '戊': ['丑','未'], '庚': ['丑','未'],
        '乙': ['子','申'], '己': ['子','申'],
        '丙': ['亥','酉'], '丁': ['亥','酉'],
        '壬': ['巳','卯'], '癸': ['巳','卯'],
        '辛': ['午','寅']
    };
    if (nobleMap[dayGan] && nobleMap[dayGan].includes(pillarZhi)) list.push('天乙');

    const checkYiMa = (baseZhi) => {
        if (['申','子','辰'].includes(baseZhi) && pillarZhi === '寅') return true;
        if (['寅','午','戌'].includes(baseZhi) && pillarZhi === '申') return true;
        if (['亥','卯','未'].includes(baseZhi) && pillarZhi === '巳') return true;
        if (['巳','酉','丑'].includes(baseZhi) && pillarZhi === '亥') return true;
        return false;
    };
    if (checkYiMa(dayZhi) || checkYiMa(yearZhi)) list.push('驛馬');

    const checkTaoHua = (baseZhi) => {
        if (['申','子','辰'].includes(baseZhi) && pillarZhi === '酉') return true;
        if (['寅','午','戌'].includes(baseZhi) && pillarZhi === '卯') return true;
        if (['亥','卯','未'].includes(baseZhi) && pillarZhi === '子') return true;
        if (['巳','酉','丑'].includes(baseZhi) && pillarZhi === '午') return true;
        return false;
    };
    if (checkTaoHua(dayZhi) || checkTaoHua(yearZhi)) list.push('桃花');

    const wenChangMap = {'甲':'巳', '乙':'午', '丙':'申', '戊':'申', '丁':'酉', '己':'酉', '庚':'亥', '辛':'子', '壬':'寅', '癸':'卯'};
    if (wenChangMap[dayGan] === pillarZhi) list.push('文昌');

    const yangRenMap = {'甲':'卯', '乙':'寅', '丙':'午', '戊':'午', '丁':'巳', '己':'巳', '庚':'酉', '辛':'申', '壬':'子', '癸':'亥'};
    if (yangRenMap[dayGan] === pillarZhi) list.push('羊刃');

    const luMap = {'甲':'寅', '乙':'卯', '丙':'巳', '戊':'巳', '丁':'午', '己':'午', '庚':'申', '辛':'酉', '壬':'亥', '癸':'子'};
    if (luMap[dayGan] === pillarZhi) list.push('祿神');

    const GAN_IDX = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const ZHI_IDX = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    if (dayGan && dayZhi) {
        const gIdx = GAN_IDX.indexOf(dayGan);
        const zIdx = ZHI_IDX.indexOf(dayZhi);
        const k1 = (zIdx - gIdx + 10 + 12) % 12;
        const k2 = (zIdx - gIdx + 11 + 12) % 12;
        const pZhiIdx = ZHI_IDX.indexOf(pillarZhi);
        if (pZhiIdx === k1 || pZhiIdx === k2) list.push('空亡');
    }
    return list;
}

window.toggleTimeVisibility = function() {
    window.isTimeHidden = !window.isTimeHidden;
    const eyeIcon = document.getElementById('eyeIcon');
    
    // 重新渲染時柱
    if (state.birthSolar && state.baseDayGan) {
        const bazi = state.birthSolar.getLunar().getEightChar();
        const tGan = bazi.getTimeGan();
        const tZhi = bazi.getTimeZhi();
        const timeTitle = document.querySelector('#baseHour .title-text').innerText;
        
        renderMainPillar('baseHour', tGan, tZhi, timeTitle, false, '', true);
    }
    
    if(eyeIcon) eyeIcon.innerText = window.isTimeHidden ? '🔒' : '👁';
}

window.toggleShenShaAll = function() {
    window.isShenShaVisible = !window.isShenShaVisible;
    
    const lists = document.querySelectorAll('.shensha-list');
    lists.forEach(el => {
        if (window.isShenShaVisible) {
            el.classList.remove('hidden');
            el.style.display = 'flex';
        } else {
            el.classList.add('hidden');
            el.style.display = 'none';
        }
    });

    const btn = document.getElementById('btnToggleShenSha');
    if(btn) {
        btn.innerText = window.isShenShaVisible ? '▲' : '▼'; 
    }
}

function centerActiveItem(container) {
    const active = container.querySelector('.active');
    if (!active) return;
    const scrollLeft = active.offsetLeft - (container.clientWidth / 2) + (active.clientWidth / 2);
    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
}

function renderMainPillar(id, gan, zhi, title, isDayPillar, infoText, hasEye = false) {
    const el = document.getElementById(id);
    if (!el) return;

    let displayGan = gan;
    let displayZhi = zhi;
    let displayShiShen = '';
    let showCangGan = true;
    let showZhangSheng = true;
    let isHiddenMode = false;

    // 吉時模式：強制紅色、吉時字樣
    if (hasEye && window.isTimeHidden) {
        isHiddenMode = true;
        displayGan = '吉';
        displayZhi = '時';
        showCangGan = false;
        showZhangSheng = false;
        displayShiShen = '&nbsp;'; 
    } else {
        displayShiShen = getShiShen(gan, isDayPillar);
    }

    // 1. 十神
    const shishenClass = (displayShiShen === '日主') ? 'shishen-top dm' : 'shishen-top';
    const shishenHtml = `<div class="${shishenClass}">${displayShiShen || '&nbsp;'}</div>`;
    
    // 2. 藏干
    let cangganHtml = '';
    if (isHiddenMode) {
         cangganHtml = `<div class="canggan-row" style="visibility:hidden;">&nbsp;</div><div class="canggan-row" style="visibility:hidden;">&nbsp;</div><div class="canggan-row" style="visibility:hidden;">&nbsp;</div>`;
    } else if (zhi !== '&nbsp;') {
        const hiddenGans = LOOKUP_HIDDEN[zhi] || [];
        hiddenGans.forEach(hGan => {
            const hShishen = getShiShen(hGan, false);
            const color = WUXING_COLOR[hGan] || '#333';
            cangganHtml += `<div class="canggan-row"><span class="canggan-char" style="color:${color}">${hGan}</span><span class="canggan-shishen">${hShishen}</span></div>`;
        });
    }

    // 3. 十二長生
    let zhangshengText = '&nbsp;';
    if (!isHiddenMode && state.baseDayGan && zhi && zhi !== '&nbsp;') {
        zhangshengText = getZhangSheng(state.baseDayGan, zhi) || '&nbsp;';
    } 
    const zsHtml = `<div class="zhangsheng-text">${zhangshengText}</div>`;

    // 4. 神煞
    let shenshaHtml = '';
    if (!isHiddenMode && state.baseDayGan && state.birthSolar && zhi !== '&nbsp;') {
        const baziObj = state.birthSolar.getLunar().getEightChar();
        const dGan = baziObj.getDayGan();
        const dZhi = baziObj.getDayZhi();
        const yZhi = baziObj.getYearZhi();
        const shenshaList = getShenSha(zhi, dGan, dZhi, yZhi);
        shenshaHtml = shenshaList.map(s => `<span class="shensha-tag">${s}</span>`).join('');
    }

    // 5. 組裝
    const eyeHtml = hasEye ? `<div id="eyeIcon" class="eye-btn" onclick="toggleTimeVisibility()">${window.isTimeHidden ? '🔒' : '👁'}</div>` : '';
    const infoHtml = infoText ? `<div class="top-info">${infoText}</div>` : `<div class="top-info" style="border:none;"></div>`;
    
    const visibilityStyle = window.isShenShaVisible ? 'display:flex;' : 'display:none;';
    const shenshaContainerHtml = `<div class="shensha-list" style="${visibilityStyle}">${shenshaHtml}</div>`;

    let ganColor = isHiddenMode ? '#d32f2f' : (WUXING_COLOR[gan] || '#333');
    let zhiColor = isHiddenMode ? '#d32f2f' : (WUXING_COLOR[zhi] || '#333');
    
    if (gan === '&nbsp;') ganColor = 'transparent'; 
    if (zhi === '&nbsp;') zhiColor = 'transparent';

    const footerHtml = `
        <div class="pillar-bottom-section">
            ${zsHtml}
            ${shenshaContainerHtml}
        </div>
    `;

    const contentHtml = `
        <div id="pillarContent_${id}" class="pillar-content-wrapper">
            ${shishenHtml}
            <div class="gan" style="color:${ganColor}">${displayGan}</div>
            <div class="zhi" style="color:${zhiColor}">${displayZhi}</div>
            <div class="canggan-box">${cangganHtml}</div>
            ${footerHtml}
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
    renderDaYunRail(); renderYearRail(); renderMonthRail(); renderDayRail(); renderHourRail();
}
function renderDaYunRail() {
    const container = document.getElementById('dayunRail');
    container.innerHTML = '';
    let birthYear = state.birthSolar.getYear();
    if (!state.daYuns || state.daYuns.length === 0) return;
    for(let i=0; i<state.daYuns.length && i<12; i++) {
        const dy = state.daYuns[i];
        const gz = dy.getGanZhi(); 
        let startY = dy.getStartYear();
        if(startY < 1000) startY += birthYear;
        const info = `${dy.getStartAge()}歲起\n${startY}年`;
        const el = createRailEl(gz.charAt(0), gz.charAt(1), '', info);
        el.onclick = () => {
            state.selDaYunIdx = i; state.selYear = startY;
            renderRailsCascadeFromYear(); highlightSelection('dayunRail', i);
        };
        if(i === state.selDaYunIdx) el.classList.add('active');
        container.appendChild(el);
    }
    setTimeout(() => centerActiveItem(container), 0);
}
function renderYearRail() {
    const box = document.getElementById('yearRail'); box.innerHTML = '';
    const dy = state.daYuns[state.selDaYunIdx];
    if(!dy) return;
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
        el.onclick = () => { state.selYear = y; renderRailsCascadeFromMonth(); highlightSelection('yearRail', i); };
        if(y === state.selYear) el.classList.add('active');
        box.appendChild(el);
    }
    setTimeout(() => centerActiveItem(box), 0);
}
function renderMonthRail() {
    const box = document.getElementById('monthRail'); box.innerHTML = '';
    const startYear = state.selYear;
    for (let i = 0; i < 12; i++) {
        let y = startYear; let m = i + 2; if (m > 12) { m -= 12; y++; }
        const sample = Solar.fromYmd(y, m, 15); 
        const lunar = sample.getLunar();
        const gz = lunar.getMonthInGanZhi();
        const prevJie = lunar.getPrevJie(true);
        const info = `${prevJie.getName()}\n${prevJie.getSolar().getDay()}/${prevJie.getSolar().getMonth()}`;
        const el = createRailEl(gz.charAt(0), gz.charAt(1), '', info);
        el.onclick = () => { state.selYear = y; state.selMonth = m; renderRailsCascadeFromDay(); highlightSelection('monthRail', i); };
        if(m === state.selMonth) el.classList.add('active');
        box.appendChild(el);
    }
    setTimeout(() => centerActiveItem(box), 0);
}
function renderDayRail() {
    const box = document.getElementById('dayRail'); box.innerHTML = '';
    const days = SolarUtil.getDaysOfMonth(state.selYear, state.selMonth);
    if(state.selDay > days) state.selDay = 1;
    for(let d=1; d<=days; d++) {
        const sample = Solar.fromYmd(state.selYear, state.selMonth, d).getLunar();
        const gz = sample.getDayInGanZhi();
        const info = `${sample.getDayInChinese()}\n${d}/${state.selMonth}`;
        const el = createRailEl(gz.charAt(0), gz.charAt(1), '', info);
        el.onclick = () => { state.selDay = d; renderRailsCascadeFromHour(); highlightSelection('dayRail', d-1); };
        if(d === state.selDay) el.classList.add('active');
        box.appendChild(el);
    }
    setTimeout(() => centerActiveItem(box), 0);
}
function renderHourRail() {
    const box = document.getElementById('hourRail'); box.innerHTML = '';
    const zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    for(let i=0; i<12; i++) {
        let h = i*2; if(i===0) h=0;
        const sample = Solar.fromYmdHms(state.selYear, state.selMonth, state.selDay, h, 0, 0).getLunar();
        const gz = sample.getTimeInGanZhi();
        const info = ZHI_TIME[zhi[i]] + "時";
        const el = createRailEl(gz.charAt(0), zhi[i], '', info);
        el.onclick = () => { state.selHour = h; updateActiveDisplay(); highlightSelection('hourRail', i); };
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
    
    if (dy) {
        const dyGZ = dy.getGanZhi();
        let dyStartAge = dy.getStartAge();
        let dyStartYear = dy.getStartYear();
        if(dyStartYear < 1000) dyStartYear += birthYear;
        const dyInfo = `${dyStartAge}歲起\n${dyStartYear}年`;
        renderMainPillar('activeDaYun', dyGZ.charAt(0), dyGZ.charAt(1), '大運', false, dyInfo);
    } else {
        renderMainPillar('activeDaYun', '&nbsp;', '&nbsp;', '大運', false, '未起運');
    }
    
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

// ==========================================
// 6. 截圖分享功能 (強制使用 Modal)
// ==========================================

window.shareChart = async function(mode) {
    if (typeof html2canvas === 'undefined') {
        alert("系統載入中，請稍後再試...");
        return;
    }

    const topDisplay = document.getElementById('topDisplay');
    // 檢查是否有內容 (簡單判斷：如果是 'none' 代表還沒排盤)
    if (!topDisplay || topDisplay.style.display === 'none') {
        alert("請先進行排盤");
        return;
    }

    const btn = event.currentTarget; // 獲取點擊的按鈕
    const originalBtnText = btn.innerText;
    btn.innerText = "生成中...";
    btn.disabled = true;

    try {
        let targetElement;
        let hiddenElements = [];

        // 1. 根據模式選擇目標與處理 DOM
        if (mode === 'origin') {
            // 模式一：只取原局 (四柱)。原局位於第一個 .group-container
            targetElement = topDisplay.querySelector('.group-container');
        } 
        else if (mode === 'main') {
            // 模式二：原局 + 運歲 (六柱) -> 截取整個 topDisplay
            targetElement = topDisplay;
            
            // 暫時隱藏不需要的流月、流日、流時
            // 這裡對應 updateActiveDisplay 裡的 ID
            const idsToHide = ['activeMonth', 'activeDay', 'activeHour'];
            
            idsToHide.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    // 記錄原本的 display 屬性
                    el.dataset.originalDisplay = el.style.display; 
                    el.style.display = 'none';
                    hiddenElements.push(el);
                }
            });
        }

        // 2. 執行截圖
        // scale: 2 確保 Retina 螢幕清晰度
        // useCORS: true 避免若有跨域圖片(如地圖tile)導致tainted canvas
        const canvas = await html2canvas(targetElement, {
            scale: 2,
            backgroundColor: '#f4f6f8', // 使用 App 背景色
            logging: false,
            useCORS: true 
        });

        // 3. 恢復剛剛隱藏的元素
        hiddenElements.forEach(el => {
            el.style.display = el.dataset.originalDisplay || '';
        });

        // 4. 輸出結果 (只使用 Modal，不呼叫原生分享)
        canvas.toBlob(async (blob) => {
            btn.innerText = originalBtnText;
            btn.disabled = false;

            if (!blob) return;

            // 直接生成 URL 並顯示在 Modal
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.src = url;
            img.style.maxWidth = "100%";
            img.style.maxHeight = "60vh";
            img.style.borderRadius = "8px";
            img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
            
            const container = document.getElementById('shareImgContainer');
            container.innerHTML = ''; // 清空舊圖
            container.appendChild(img);
            
            document.getElementById('shareModal').style.display = 'flex';

        }, 'image/png');

    } catch (e) {
        console.error("截圖失敗:", e);
        alert("截圖生成失敗，請稍後再試。");
        btn.innerText = originalBtnText;
        btn.disabled = false;
        
        // 確保發生錯誤時也要恢復元素
        hiddenElements.forEach(el => {
            el.style.display = el.dataset.originalDisplay || '';
        });
    }
}

window.closeShareModal = function() {
    document.getElementById('shareModal').style.display = 'none';
}
