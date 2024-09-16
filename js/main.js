import { connectWebSocket } from './websocket.js';
import { initVoteManager } from './voteManager.js';
import { initUIManager } from './uiManager.js';

document.addEventListener('DOMContentLoaded', () => {
	try {
		console.log('開始初始化...');
		connectWebSocket();
		initVoteManager();
		initUIManager();
		console.log('初始化成功完成');
	} catch (error) {
		console.error('初始化錯誤:', error);
		alert('系統初始化失敗，請查看控制台以獲取更多信息。錯誤: ' + error.message);
	}
});