import { processMessage } from './voteManager.js';
import { updateStatus, displayMessage } from './uiManager.js';

let ws;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export function connectWebSocket() {
	ws = new WebSocket("ws://localhost:11180/sub");
	ws.onopen = handleOpen;
	ws.onmessage = handleMessage;
	ws.onerror = handleError;
	ws.onclose = handleClose;
}

function handleOpen() {
	updateStatus("已連接");
	reconnectAttempts = 0;
}

function handleMessage(event) {
	const info = extractInfo(event.data);
	if (info) processMessage(info);
}

function handleError(error) {
	console.error("WebSocket錯誤:", error);
	updateStatus("錯誤：連接出現問題");
}

function handleClose() {
	updateStatus("連接已關閉");
	attemptReconnect();
}

function attemptReconnect() {
	if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
		reconnectAttempts++;
		displayMessage(`嘗試重新連接... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
		setTimeout(connectWebSocket, 5000);
	} else {
		displayMessage("無法重新連接，請刷新頁面重試。");
	}
}

function extractInfo(data) {
	try {
		const jsonData = JSON.parse(data);
		console.log("Received WebSocket data:", jsonData); // 添加這行來記錄接收到的數據
		if (jsonData.type === "comments") {
			const comment = jsonData.data.comments[0];
			return {
				userId: comment.data.userId || "未知",
				speechText: comment.data.speechText || "未知"
			};
		} else {
			console.log("Received non-comment data:", jsonData);
		}
	} catch (error) {
		console.error("無法解析JSON數據:", error);
		console.log("Raw data:", data);
	}
	return null;
}