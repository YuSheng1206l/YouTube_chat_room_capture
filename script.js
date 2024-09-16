// 全局變量
let voteOptions = [];
let participants = [];
let isVoting = false;
let isAnonymous = false;
let voteCount = 0;
let scoreHistory = [];
let userHistory = {};
let voteTitle = "";
let isVoteInProgress = false;
let allowVoteChange = false;
let ws;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// WebSocket 相關函數
function connectWebSocket() {
	ws = new WebSocket("ws://127.0.0.1:11180/sub");
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
		if (jsonData.type === "comments") {
			const comment = jsonData.data.comments[0];
			return {
				userId: comment.data.userId || "未知",
				speechText: comment.data.speechText || "未知"
			};
		}
	} catch (error) {
		console.error("無法解析JSON數據:", error);
	}
	return null;
}

// UI 相關函數
function initUIManager() {
	const toggleAnonymousBtn = document.getElementById('toggleAnonymousBtn');
	const addOptionBtn = document.getElementById('addOptionBtn');
	const removeOptionBtn = document.getElementById('removeOptionBtn');
	const exportCSVBtn = document.getElementById('exportCSVBtn');

	toggleAnonymousBtn.addEventListener('click', toggleAnonymous);
	addOptionBtn.addEventListener('click', addOption);
	removeOptionBtn.addEventListener('click', removeOption);
	exportCSVBtn.addEventListener('click', exportScoreHistoryCSV);
}

function updateStatus(status) {
	document.getElementById("status").textContent = "連接狀態：" + status;
}

function displayMessage(message) {
	const messageContainer = document.getElementById('messageContainer');
	const messageElement = document.createElement('li');
	messageElement.textContent = message;
	messageContainer.appendChild(messageElement);

	messageContainer.scrollTop = messageContainer.scrollHeight;

	setTimeout(() => {
		messageElement.classList.add('show');
	}, 50);

	const maxMessages = 50;
	while (messageContainer.children.length > maxMessages) {
		messageContainer.removeChild(messageContainer.firstChild);
	}
}

function updateVoteResults() {
	const totalVotes = document.getElementById("totalVotes");
	const optionResults = document.getElementById("optionResults");
	const cardContainer = document.getElementById("cardContainer");

	totalVotes.textContent = participants.length;
	optionResults.innerHTML = "";
	cardContainer.innerHTML = "";

	voteOptions.forEach(option => {
		const optionVotes = participants.filter(p => p.vote === option.keyword).length;
		const resultElement = document.createElement("p");
		resultElement.textContent = `${option.name}: ${optionVotes} 票`;
		optionResults.appendChild(resultElement);

		if (!isAnonymous) {
			const cardElement = document.createElement("li");
			cardElement.className = "option-card";
			cardElement.innerHTML = `<h3>${option.name}</h3>`;
			const participantList = participants
				.filter(p => p.vote === option.keyword)
				.map(p => p.userId)
				.sort(() => Math.random() - 0.5);
			participantList.forEach(userId => {
				const userElement = document.createElement("span");
				userElement.className = "participant-card";
				userElement.textContent = userId;
				cardElement.appendChild(userElement);
			});
			cardContainer.appendChild(cardElement);
		}
	});
}

function toggleAnonymous() {
	isAnonymous = !isAnonymous;
	updateVoteResults();
	displayMessage(isAnonymous ? "已切換到匿名模式" : "已切換到非匿名模式");
}

function showScoreModal() {
	const modal = document.createElement('div');
	modal.className = 'modal';
	modal.style.display = 'block';
	modal.innerHTML = `
		<div class="modal-content">
			<h2>設置選項分數 - ${voteTitle}</h2>
			<div id="scoreInputs"></div>
			<button id="calculateScoresBtn">計算分數</button>
		</div>
	`;
	document.body.appendChild(modal);

	const scoreInputs = document.getElementById('scoreInputs');
	voteOptions.forEach(option => {
		const input = document.createElement('input');
		input.type = 'number';
		input.id = `score-${option.keyword}`;
		input.value = 0;
		input.min = 0;
		const label = document.createElement('label');
		label.textContent = `${option.name} 分數：`;
		label.appendChild(input);
		scoreInputs.appendChild(label);
	});

	document.getElementById('calculateScoresBtn').addEventListener('click', () => {
		calculateScores();
		updateScoreHistory(scoreHistory);
		updateUserHistory(userHistory);
	});
}

function updateScoreHistory(history) {
	const scoreHistoryContainer = document.getElementById("scoreHistory");
	scoreHistoryContainer.innerHTML = "<h3>比分歷史記錄表</h3>";
	history.forEach((result, index) => {
		const resultElement = document.createElement("p");
		resultElement.textContent = `第${index + 1}次投票：${result.map(r => `${r.name}, ${r.score}`).join('；')}`;
		scoreHistoryContainer.appendChild(resultElement);
	});
}

function updateUserHistory(history) {
	const userHistoryContainer = document.getElementById("userHistoryContainer");
	userHistoryContainer.innerHTML = "";
	Object.entries(history).forEach(([userId, data]) => {
		const userElement = document.createElement("li");
		userElement.textContent = `${userId}：總分：${data.totalScore}`;
		userHistoryContainer.appendChild(userElement);
	});
}

function exportScoreHistoryCSV() {
	if (scoreHistory.length === 0) {
		alert('尚未完成任何投票，無法導出CSV！');
		return;
	}
	let csvContent = "data:text/csv;charset=utf-8,";

	csvContent += "選項信息:\n";
	scoreHistory.forEach((round, index) => {
		csvContent += `第${index + 1}次投票 (${voteTitle}),`;
		round.forEach(option => {
			csvContent += `${option.name} (${option.keyword}),`;
		});
		csvContent += "\n";
	});
	csvContent += "\n";

	csvContent += "用戶ID,總分," + scoreHistory.map((_, index) => `第${index + 1}次投票`).join(",") + "\n";

	Object.entries(userHistory).forEach(([userId, data]) => {
		let row = [userId, data.totalScore];
		for (let i = 0; i < scoreHistory.length; i++) {
			const vote = data.votes[i];
			if (vote) {
				const option = scoreHistory[i].find(s => s.keyword === vote);
				row.push(option ? option.keyword : vote);
			} else {
				row.push(" ");
			}
		}
		csvContent += row.join(",") + "\n";
	});

	const encodedUri = encodeURI(csvContent);
	const link = document.createElement("a");
	link.setAttribute("href", encodedUri);
	link.setAttribute("download", "vote_history.csv");
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function addOption() {
	const optionContainer = document.getElementById('optionContainer');
	const optionDiv = document.createElement('div');
	optionDiv.className = 'option-input';
	optionDiv.innerHTML = `
		<input type="text" class="option-name" placeholder="選項名稱">
		<input type="text" class="option-keyword" placeholder="選項關鍵字">
	`;
	optionContainer.appendChild(optionDiv);
}

function removeOption() {
	const optionContainer = document.getElementById('optionContainer');
	if (optionContainer.children.length <= 2) {
		alert('至少需要保留兩個選項！');
		return;
	}
	optionContainer.removeChild(optionContainer.lastChild);
}

// 投票管理相關函數
function initVoteManager() {
	const startVoteBtn = document.getElementById('startVoteBtn');
	const endVoteBtn = document.getElementById('endVoteBtn');
	const restartVoteBtn = document.getElementById('restartVoteBtn');
	const toggleVoteChangeBtn = document.getElementById('toggleVoteChangeBtn');

	startVoteBtn.addEventListener('click', startVote);
	endVoteBtn.addEventListener('click', endVote);
	restartVoteBtn.addEventListener('click', restartCurrentVote);
	toggleVoteChangeBtn.addEventListener('click', toggleVoteChange);
}

function processMessage(info) {
	if (!isVoting) return;

	const startVoteKeyword = document.getElementById("startVoteKeyword").value;
	const [userStartKeyword, userOptionKeyword] = info.speechText.split(' ');

	if (userStartKeyword !== startVoteKeyword) {
		displayMessage(`${info.userId} 嘗試投票，但輸入了無效的開始投票關鍵字: ${userStartKeyword}`);
		return;
	}

	const votedOption = voteOptions.find(option => option.keyword === userOptionKeyword);
	if (!votedOption) {
		displayMessage(`${info.userId} 嘗試投票，但輸入了無效的選項關鍵字: ${userOptionKeyword}`);
		return;
	}

	updateParticipantVote(info.userId, votedOption);
	displayMessage(`${info.userId} 參與了投票，選擇了 ${votedOption.name}`);
	updateVoteResults();
}

function updateParticipantVote(userId, votedOption) {
	const existingParticipant = participants.find(p => p.userId === userId);
	if (existingParticipant && allowVoteChange) {
		existingParticipant.vote = votedOption.keyword;
	} else if (!existingParticipant) {
		participants.push({ userId, vote: votedOption.keyword });
	}
}

function startVote() {
	if (isVoteInProgress) {
		alert('投票已經開始，無法再次啟動！');
		return;
	}

	voteTitle = document.getElementById("voteTitle").value.trim();
	if (!voteTitle) {
		alert('請輸入投票主題！');
		return;
	}

	const optionInputs = document.querySelectorAll('.option-input');
	voteOptions = Array.from(optionInputs).map(div => ({
		name: div.querySelector('.option-name').value.trim(),
		keyword: div.querySelector('.option-keyword').value.trim()
	}));

	if (voteOptions.length < 2 || voteOptions.some(option => option.name === '' || option.keyword === '')) {
		alert('請至少添加兩個有效選項，並確保每個選項都有名稱和關鍵字！');
		return;
	}

	const keywords = voteOptions.map(option => option.keyword);
	if (new Set(keywords).size !== keywords.length) {
		alert('每個選項的關鍵字必須是唯一的！');
		return;
	}

	isVoteInProgress = true;
	isVoting = true;
	participants = [];
	document.getElementById('startVoteBtn').disabled = true;
	document.getElementById('endVoteBtn').disabled = false;
	displayMessage("投票已開始");
	updateVoteResults();
}

function endVote() {
	if (!isVoteInProgress) {
		alert('當前沒有進行中的投票！');
		return;
	}

	if (confirm('確定要結束當前投票嗎？')) {
		isVoteInProgress = false;
		isVoting = false;
		document.getElementById('startVoteBtn').disabled = false;
		document.getElementById('endVoteBtn').disabled = true;
		showScoreModal();
	}
}

function restartCurrentVote() {
	if (!isVoteInProgress) {
		alert('當前沒有進行中的投票！');
		return;
	}

	if (confirm('確定要重新開始當前投票嗎？這將清空所有已收到的投票數據。')) {
		participants = [];
		updateVoteResults();
		displayMessage("當前投票已重新開始，所有投票數據已清空");
	}
}

function toggleVoteChange() {
	allowVoteChange = !allowVoteChange;
	const button = document.getElementById('toggleVoteChangeBtn');
	button.textContent = allowVoteChange ? '禁止更改投票' : '允許更改投票';
	displayMessage(allowVoteChange ? "現在允許更改投票" : "現在禁止更改投票");
}

function calculateScores() {
	voteCount++;
	const scores = voteOptions.map(option => ({
		name: option.name,
		keyword: option.keyword,
		score: parseInt(document.getElementById(`score-${option.keyword}`).value) || 0
	}));

	scoreHistory.push(scores);
	updateScoreHistory(scoreHistory);

	participants.forEach(participant => {
		if (!userHistory[participant.userId]) {
			userHistory[participant.userId] = { votes: Array(voteCount).fill(" "), totalScore: 0 };
		}
		const votedOption = scores.find(s => s.keyword === participant.vote);
		if (votedOption) {
			userHistory[participant.userId].votes[voteCount - 1] = participant.vote;
			userHistory[participant.userId].totalScore += votedOption.score;
		}
	});
	updateUserHistory(userHistory);

	document.querySelector('.modal').remove();
	displayMessage("分數已計算完成");
}

// 初始化函數
function init() {
	console.log('開始初始化...');
	connectWebSocket();
	initVoteManager();
	initUIManager();
	// 全局變量
	let voteOptions = [];
	let participants = [];
	let isVoting = false;
	let isAnonymous = false;
	let voteCount = 0;
	let scoreHistory = [];
	let userHistory = {};
	let voteTitle = "";
	let isVoteInProgress = false;
	let allowVoteChange = false;
	let ws;
	let reconnectAttempts = 0;
	const MAX_RECONNECT_ATTEMPTS = 5;

	// WebSocket 相關函數
	function connectWebSocket() {
		ws = new WebSocket("ws://127.0.0.1:11180/sub");
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
			if (jsonData.type === "comments") {
				const comment = jsonData.data.comments[0];
				return {
					userId: comment.data.userId || "未知",
					speechText: comment.data.speechText || "未知"
				};
			}
		} catch (error) {
			console.error("無法解析JSON數據:", error);
		}
		return null;
	}

	// UI 相關函數
	function initUIManager() {
		const toggleAnonymousBtn = document.getElementById('toggleAnonymousBtn');
		const addOptionBtn = document.getElementById('addOptionBtn');
		const removeOptionBtn = document.getElementById('removeOptionBtn');
		const exportCSVBtn = document.getElementById('exportCSVBtn');

		toggleAnonymousBtn.addEventListener('click', toggleAnonymous);
		addOptionBtn.addEventListener('click', addOption);
		removeOptionBtn.addEventListener('click', removeOption);
		exportCSVBtn.addEventListener('click', exportScoreHistoryCSV);
	}

	function updateStatus(status) {
		document.getElementById("status").textContent = "連接狀態：" + status;
	}

	function displayMessage(message) {
		const messageContainer = document.getElementById('messageContainer');
		const messageElement = document.createElement('li');
		messageElement.textContent = message;
		messageContainer.appendChild(messageElement);

		messageContainer.scrollTop = messageContainer.scrollHeight;

		setTimeout(() => {
			messageElement.classList.add('show');
		}, 50);

		const maxMessages = 50;
		while (messageContainer.children.length > maxMessages) {
			messageContainer.removeChild(messageContainer.firstChild);
		}
	}

	function updateVoteResults() {
		const totalVotes = document.getElementById("totalVotes");
		const optionResults = document.getElementById("optionResults");
		const cardContainer = document.getElementById("cardContainer");

		totalVotes.textContent = participants.length;
		optionResults.innerHTML = "";
		cardContainer.innerHTML = "";

		voteOptions.forEach(option => {
			const optionVotes = participants.filter(p => p.vote === option.keyword).length;
			const resultElement = document.createElement("p");
			resultElement.textContent = `${option.name}: ${optionVotes} 票`;
			optionResults.appendChild(resultElement);

			if (!isAnonymous) {
				const cardElement = document.createElement("li");
				cardElement.className = "option-card";
				cardElement.innerHTML = `<h3>${option.name}</h3>`;
				const participantList = participants
					.filter(p => p.vote === option.keyword)
					.map(p => p.userId)
					.sort(() => Math.random() - 0.5);
				participantList.forEach(userId => {
					const userElement = document.createElement("span");
					userElement.className = "participant-card";
					userElement.textContent = userId;
					cardElement.appendChild(userElement);
				});
				cardContainer.appendChild(cardElement);
			}
		});
	}

	function toggleAnonymous() {
		isAnonymous = !isAnonymous;
		updateVoteResults();
		displayMessage(isAnonymous ? "已切換到匿名模式" : "已切換到非匿名模式");
	}

	function showScoreModal() {
		const modal = document.createElement('div');
		modal.className = 'modal';
		modal.style.display = 'block';
		modal.innerHTML = `
		<div class="modal-content">
			<h2>設置選項分數 - ${voteTitle}</h2>
			<div id="scoreInputs"></div>
			<button id="calculateScoresBtn">計算分數</button>
		</div>
	`;
		document.body.appendChild(modal);

		const scoreInputs = document.getElementById('scoreInputs');
		voteOptions.forEach(option => {
			const input = document.createElement('input');
			input.type = 'number';
			input.id = `score-${option.keyword}`;
			input.value = 0;
			input.min = 0;
			const label = document.createElement('label');
			label.textContent = `${option.name} 分數：`;
			label.appendChild(input);
			scoreInputs.appendChild(label);
		});

		document.getElementById('calculateScoresBtn').addEventListener('click', () => {
			calculateScores();
			updateScoreHistory(scoreHistory);
			updateUserHistory(userHistory);
		});
	}

	function updateScoreHistory(history) {
		const scoreHistoryContainer = document.getElementById("scoreHistory");
		scoreHistoryContainer.innerHTML = "<h3>比分歷史記錄表</h3>";
		history.forEach((result, index) => {
			const resultElement = document.createElement("p");
			resultElement.textContent = `第${index + 1}次投票：${result.map(r => `${r.name}, ${r.score}`).join('；')}`;
			scoreHistoryContainer.appendChild(resultElement);
		});
	}

	function updateUserHistory(history) {
		const userHistoryContainer = document.getElementById("userHistoryContainer");
		userHistoryContainer.innerHTML = "";
		Object.entries(history).forEach(([userId, data]) => {
			const userElement = document.createElement("li");
			userElement.textContent = `${userId}：總分：${data.totalScore}`;
			userHistoryContainer.appendChild(userElement);
		});
	}

	function exportScoreHistoryCSV() {
		if (scoreHistory.length === 0) {
			alert('尚未完成任何投票，無法導出CSV！');
			return;
		}
		let csvContent = "data:text/csv;charset=utf-8,";

		csvContent += "選項信息:\n";
		scoreHistory.forEach((round, index) => {
			csvContent += `第${index + 1}次投票 (${voteTitle}),`;
			round.forEach(option => {
				csvContent += `${option.name} (${option.keyword}),`;
			});
			csvContent += "\n";
		});
		csvContent += "\n";

		csvContent += "用戶ID,總分," + scoreHistory.map((_, index) => `第${index + 1}次投票`).join(",") + "\n";

		Object.entries(userHistory).forEach(([userId, data]) => {
			let row = [userId, data.totalScore];
			for (let i = 0; i < scoreHistory.length; i++) {
				const vote = data.votes[i];
				if (vote) {
					const option = scoreHistory[i].find(s => s.keyword === vote);
					row.push(option ? option.keyword : vote);
				} else {
					row.push(" ");
				}
			}
			csvContent += row.join(",") + "\n";
		});

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", "vote_history.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function addOption() {
		const optionContainer = document.getElementById('optionContainer');
		const optionDiv = document.createElement('div');
		optionDiv.className = 'option-input';
		optionDiv.innerHTML = `
		<input type="text" class="option-name" placeholder="選項名稱">
		<input type="text" class="option-keyword" placeholder="選項關鍵字">
	`;
		optionContainer.appendChild(optionDiv);
	}

	function removeOption() {
		const optionContainer = document.getElementById('optionContainer');
		if (optionContainer.children.length <= 2) {
			alert('至少需要保留兩個選項！');
			return;
		}
		optionContainer.removeChild(optionContainer.lastChild);
	}

	// 投票管理相關函數
	function initVoteManager() {
		const startVoteBtn = document.getElementById('startVoteBtn');
		const endVoteBtn = document.getElementById('endVoteBtn');
		const restartVoteBtn = document.getElementById('restartVoteBtn');
		const toggleVoteChangeBtn = document.getElementById('toggleVoteChangeBtn');

		startVoteBtn.addEventListener('click', startVote);
		endVoteBtn.addEventListener('click', endVote);
		restartVoteBtn.addEventListener('click', restartCurrentVote);
		toggleVoteChangeBtn.addEventListener('click', toggleVoteChange);
	}

	function processMessage(info) {
		if (!isVoting) return;

		const startVoteKeyword = document.getElementById("startVoteKeyword").value;
		const [userStartKeyword, userOptionKeyword] = info.speechText.split(' ');

		if (userStartKeyword !== startVoteKeyword) {
			displayMessage(`${info.userId} 嘗試投票，但輸入了無效的開始投票關鍵字: ${userStartKeyword}`);
			return;
		}

		const votedOption = voteOptions.find(option => option.keyword === userOptionKeyword);
		if (!votedOption) {
			displayMessage(`${info.userId} 嘗試投票，但輸入了無效的選項關鍵字: ${userOptionKeyword}`);
			return;
		}

		updateParticipantVote(info.userId, votedOption);
		displayMessage(`${info.userId} 參與了投票，選擇了 ${votedOption.name}`);
		updateVoteResults();
	}

	function updateParticipantVote(userId, votedOption) {
		const existingParticipant = participants.find(p => p.userId === userId);
		if (existingParticipant && allowVoteChange) {
			existingParticipant.vote = votedOption.keyword;
		} else if (!existingParticipant) {
			participants.push({ userId, vote: votedOption.keyword });
		}
	}

	function startVote() {
		if (isVoteInProgress) {
			alert('投票已經開始，無法再次啟動！');
			return;
		}

		voteTitle = document.getElementById("voteTitle").value.trim();
		if (!voteTitle) {
			alert('請輸入投票主題！');
			return;
		}

		const optionInputs = document.querySelectorAll('.option-input');
		voteOptions = Array.from(optionInputs).map(div => ({
			name: div.querySelector('.option-name').value.trim(),
			keyword: div.querySelector('.option-keyword').value.trim()
		}));

		if (voteOptions.length < 2 || voteOptions.some(option => option.name === '' || option.keyword === '')) {
			alert('請至少添加兩個有效選項，並確保每個選項都有名稱和關鍵字！');
			return;
		}

		const keywords = voteOptions.map(option => option.keyword);
		if (new Set(keywords).size !== keywords.length) {
			alert('每個選項的關鍵字必須是唯一的！');
			return;
		}

		isVoteInProgress = true;
		isVoting = true;
		participants = [];
		document.getElementById('startVoteBtn').disabled = true;
		document.getElementById('endVoteBtn').disabled = false;
		displayMessage("投票已開始");
		updateVoteResults();
	}

	function endVote() {
		if (!isVoteInProgress) {
			alert('當前沒有進行中的投票！');
			return;
		}

		if (confirm('確定要結束當前投票嗎？')) {
			isVoteInProgress = false;
			isVoting = false;
			document.getElementById('startVoteBtn').disabled = false;
			document.getElementById('endVoteBtn').disabled = true;
			showScoreModal();
		}
	}

	function restartCurrentVote() {
		if (!isVoteInProgress) {
			alert('當前沒有進行中的投票！');
			return;
		}

		if (confirm('確定要重新開始當前投票嗎？這將清空所有已收到的投票數據。')) {
			participants = [];
			updateVoteResults();
			displayMessage("當前投票已重新開始，所有投票數據已清空");
		}
	}

	function toggleVoteChange() {
		allowVoteChange = !allowVoteChange;
		const button = document.getElementById('toggleVoteChangeBtn');
		button.textContent = allowVoteChange ? '禁止更改投票' : '允許更改投票';
		displayMessage(allowVoteChange ? "現在允許更改投票" : "現在禁止更改投票");
	}

	function calculateScores() {
		voteCount++;
		const scores = voteOptions.map(option => ({
			name: option.name,
			keyword: option.keyword,
			score: parseInt(document.getElementById(`score-${option.keyword}`).value) || 0
		}));

		scoreHistory.push(scores);
		updateScoreHistory(scoreHistory);

		participants.forEach(participant => {
			if (!userHistory[participant.userId]) {
				userHistory[participant.userId] = { votes: Array(voteCount).fill(" "), totalScore: 0 };
			}
			const votedOption = scores.find(s => s.keyword === participant.vote);
			if (votedOption) {
				userHistory[participant.userId].votes[voteCount - 1] = participant.vote;
				userHistory[participant.userId].totalScore += votedOption.score;
			}
		});
		updateUserHistory(userHistory);

		document.querySelector('.modal').remove();
		displayMessage("分數已計算完成");
	}

	// 初始化函數
	function init() {
		initUIManager();
		initVoteManager();
		connectWebSocket();
	}

	init();