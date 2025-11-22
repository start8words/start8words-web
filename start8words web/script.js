// ... (前面的初始化代碼不變，直到 initChart) ...

// --- 這裡我省略了前面的 initMap 等函式，請保留原有的 ---
// 為了方便，你可以保留上面的輔助函數，只替換 window.startNewChart 和 window.initChart 兩個關鍵函數
// 但為了不出錯，我把關鍵修改部分列出來：

// ... (initMap, searchLocation, updateLocation 等保持不變) ...

// --- 修改：開始新排盤 (含自動儲存) ---
window.startNewChart = function() {
    // 1. 清空當前紀錄 ID
    window.currentDocId = null; 
    
    // 2. 執行排盤
    initChart(); 
    
    // 3. 檢查是否需要自動儲存
    const saveCheck = document.getElementById('saveChartCheck');
    if (saveCheck && saveCheck.checked) {
        // 延遲一點點確保 currentBaziData 已生成
        setTimeout(() => {
            if (typeof window.handleAutoSave === 'function') {
                window.handleAutoSave(); 
            } else {
                console.error("AutoSave function not found");
            }
        }, 100);
    }
}

// --- 修改：initChart (確保資料生成) ---
window.initChart = function() {
    if (typeof Solar === 'undefined') return alert("Library error");

    try {
        const name = document.getElementById('nameInput').value || "未命名";
        const genderVal = document.getElementById('gender').value;
        const genderText = genderVal == "1" ? "男 (乾造)" : "女 (坤造)";
        const location = document.getElementById('locationName').value || "未設定";
        const useTST = document.getElementById('useTST').checked;
        const longitude = parseFloat(document.getElementById('longitude').value);

        const elName = document.getElementById('dispName'); if(elName) elName.innerText = name;
        const elGender = document.getElementById('dispGender'); if(elGender) elGender.innerText = genderText;
        const elLoc = document.getElementById('dispLoc'); if(elLoc) elLoc.innerText = location;

        let solarObj = null;

        // ... (中間的日期獲取邏輯保持不變) ...
        if (currentInputMode === 'solar') {
            const dateStr = document.getElementById('birthDate').value;
            if(!dateStr) return alert("請輸入日期");
            solarObj = Solar.fromDate(new Date(dateStr));
        } else {
            // ... (農曆邏輯保持不變) ...
            const y = parseInt(document.getElementById('lunarYear').value);
            const m = parseInt(document.getElementById('lunarMonth').value);
            const d = parseInt(document.getElementById('lunarDay').value);
            const hIndex = parseInt(document.getElementById('lunarHour').value);
            let h = hIndex * 2; if(h===0) h=0;
            const lunar = Lunar.fromYmdHms(y, m, d, h, 0, 0);
            solarObj = lunar.getSolar();
        }
        
        // 這裡保存一份「原始輸入時間」(originSolar) 用於儲存
        // 這是修正的關鍵：儲存時存這個，排盤時用這個去算 TST
        const originSolar = solarObj; 

        // 真太陽時計算 (僅用於排盤顯示)
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
            
            calculatingSolar = Solar.fromDate(nativeDate); // 用這個去排盤
            
            const m = nativeDate.getMinutes();
            const mStr = m < 10 ? "0"+m : m;
            tstDisplay = `是 (${nativeDate.getHours()}:${mStr})`;
        }

        // 填充儀表板 (用原始時間顯示)
        const sY = originSolar.getYear();
        const sM = originSolar.getMonth();
        const sD = originSolar.getDay();
        const sH = originSolar.getHour();
        const min = originSolar.getMinute();
        const minStr = min < 10 ? "0"+min : min;
        document.getElementById('dispSolar').innerText = `${sY}年${sM}月${sD}日 ${sH}:${minStr}`;
        
        // ... (中間排盤渲染邏輯保持不變) ...
        state.birthSolar = calculatingSolar; // 排盤用校正後的時間
        const bazi = state.birthSolar.getLunar().getEightChar();
        state.baseDayGan = bazi.getDayGan();

        renderMainPillar('baseHour', bazi.getTimeGan(), bazi.getTimeZhi(), '時柱', false, '', true);
        renderMainPillar('baseDay', bazi.getDayGan(), bazi.getDayZhi(), '日柱', true, '');
        renderMainPillar('baseMonth', bazi.getMonthGan(), bazi.getMonthZhi(), '月柱', false, '');
        renderMainPillar('baseYear', bazi.getYearGan(), bazi.getYearZhi(), '年柱', false, '');
        
        const yun = bazi.getYun(parseInt(genderVal));
        state.daYuns = yun.getDaYun();
        // ... (渲染軌道等邏輯保持不變) ...
        renderRails();
        updateActiveDisplay();
        
        window.scrollTo(0, 0);

        // 【關鍵修正】：儲存資料時，使用 originSolar (原始輸入值)
        window.currentBaziData = {
            name: document.getElementById('nameInput').value || "未命名",
            gender: parseInt(document.getElementById('gender').value),
            
            // 這裡存的是原始輸入的鐘錶時間
            birthDate: originSolar.toYmdHms(), 
            
            lunarDate: state.birthSolar.getLunar().toString(),
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

// ... (後面的 helper 函數保持不變) ...
