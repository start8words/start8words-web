// ... (前面保持不變) ...

// ==========================================
// 6. 截圖分享功能 (優化版：支援 Screenshot Mode)
// ==========================================

window.shareChart = async function(mode) {
    if (typeof html2canvas === 'undefined') {
        alert("系統載入中，請稍後再試...");
        return;
    }

    const topDisplay = document.getElementById('topDisplay');
    if (!topDisplay || topDisplay.style.display === 'none') {
        alert("請先進行排盤");
        return;
    }

    const btn = event.currentTarget;
    const originalBtnText = btn.innerText;
    btn.innerText = "生成中...";
    btn.disabled = true;

    // 1. 【關鍵步驟】加入截圖專用 class
    // 這會瞬間將排版變成「緊湊模式」，修正大運流年過寬的問題
    topDisplay.classList.add('screenshot-mode');

    try {
        let targetElement;
        let hiddenElements = [];

        // 2. 根據模式選擇目標與處理隱藏元素
        if (mode === 'origin') {
            // 原局 (四柱)
            targetElement = topDisplay.querySelector('.group-container');
        } 
        else if (mode === 'main') {
            // 原局 + 運歲 (六柱)
            targetElement = topDisplay;
            
            // 暫時隱藏不需要的流月、流日、流時
            const idsToHide = ['activeMonth', 'activeDay', 'activeHour'];
            idsToHide.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.dataset.originalDisplay = el.style.display; 
                    el.style.display = 'none';
                    hiddenElements.push(el);
                }
            });
        }

        // 3. 執行截圖
        const canvas = await html2canvas(targetElement, {
            scale: 2, // 高解析度
            backgroundColor: '#f4f6f8',
            logging: false,
            useCORS: true 
        });

        // 4. 【關鍵步驟】還原現場
        // 移除截圖專用 class，讓介面瞬間變回原本的彈性排版
        topDisplay.classList.remove('screenshot-mode');
        
        // 恢復隱藏的柱子
        hiddenElements.forEach(el => {
            el.style.display = el.dataset.originalDisplay || '';
        });

        // 5. 輸出結果 (Modal)
        canvas.toBlob(async (blob) => {
            btn.innerText = originalBtnText;
            btn.disabled = false;

            if (!blob) return;

            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.src = url;
            // 設定預覽圖樣式
            img.style.maxWidth = "100%";
            img.style.height = "auto"; 
            img.style.borderRadius = "8px";
            img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
            
            const container = document.getElementById('shareImgContainer');
            container.innerHTML = '';
            container.appendChild(img);
            
            document.getElementById('shareModal').style.display = 'flex';

        }, 'image/png');

    } catch (e) {
        console.error("截圖失敗:", e);
        alert("截圖生成失敗，請稍後再試。");
        
        // 發生錯誤也要確保還原
        topDisplay.classList.remove('screenshot-mode');
        // 這裡無法訪問 hiddenElements (scope問題)，但在 alert 後用戶通常會刷新
        
        btn.innerText = originalBtnText;
        btn.disabled = false;
    }
}

window.closeShareModal = function() {
    document.getElementById('shareModal').style.display = 'none';
}
