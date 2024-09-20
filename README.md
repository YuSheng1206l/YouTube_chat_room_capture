# WebSocket 投票系統

這是一個基於 WebSocket 的即時投票系統。

## 檔案結構

- `app/`: 主應用程式目錄
  - `static/`: 靜態文件
    - `css/`: CSS 文件
    - `js/`: JavaScript 模組
  - `templates/`: HTML 模板
  - `app.py`: 主應用程式
  - `server.py`: HTTP 伺服器
- `tests/`: 測試目錄
  - `test_vote_system.py`: 系統測試腳本
- `websocket_client.py`: WebSocket 客戶端模擬腳本
- `README.md`: 專案說明
- `README_EXE.md`: 可執行檔案版本說明

## 使用說明

1. 確保您的系統已安裝 Python 3.x。
2. 克隆或下載此倉庫到本地。
3. 安裝所需的套件：
   ```bash
   pip install websocket-client
   ```
4. 開啟命令列，進入專案根目錄。
5. 執行以下命令啟動伺服器：
   ```bash
   python app/app.py
   ```
6. 在瀏覽器中訪問 http://localhost:8000

## 執行測試

1. 確保 WebSocket 服務器和網頁應用都在運行。
2. 準備測試數據：在 `tests/test_data.csv` 中添加或修改測試數據。
3. 在命令列中執行：
   ```bash
   python -m unittest tests/test_vote_system.py
   ```

這個測試將從 CSV 文件讀取測試數據，並模擬多個用戶進行投票。

## 注意事項

- 確保 WebSocket 伺服器地址在 `app/static/js/websocket.js` 中正確配置。
- 此系統僅用於演示目的，在生產環境中使用時需要進行安全性和效能最佳化。
