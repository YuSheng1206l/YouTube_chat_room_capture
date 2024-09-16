import {
	voteOptions, participants, isAnonymous, toggleAnonymousMode, scoreHistory, userHistory, voteTitle, calculateScores,
	updateScoreHistory as updateScoreHistoryManager,
	updateUserHistory as updateUserHistoryManager
} from './voteManager.js';

export function initUIManager() {
	try {
		const toggleAnonymousBtn = document.getElementById('toggleAnonymousBtn');
		const addOptionBtn = document.getElementById('addOptionBtn');
		const removeOptionBtn = document.getElementById('removeOptionBtn');
		const exportCSVBtn = document.getElementById('exportCSVBtn');

		if (toggleAnonymousBtn) {
			toggleAnonymousBtn.addEventListener('click', toggleAnonymous);
		} else {
			console.warn('無法找到切換匿名模式按鈕');
		}

		if (addOptionBtn) {
			addOptionBtn.addEventListener('click', addOption);
		} else {
			console.warn('無法找到添加選項按鈕');
		}

		if (removeOptionBtn) {
			removeOptionBtn.addEventListener('click', removeOption);
		} else {
			console.warn('無法找到移除選項按鈕');
		}

		if (exportCSVBtn) {
			exportCSVBtn.addEventListener('click', exportScoreHistoryCSV);
		} else {
			console.warn('無法找到導出 CSV 按鈕');
		}

		console.log('UI管理器初始化成功');
	} catch (error) {
		console.error('初始化UI管理器時出錯:', error);
		// 不再拋出錯誤，而是記錄錯誤並繼續
	}
}

export function updateStatus(status) {
	document.getElementById("status").textContent = "連接狀態：" + status;
}

export function displayMessage(message) {
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

export function updateVoteResults() {
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
	const newAnonymousState = toggleAnonymousMode();
	updateVoteResults();
	displayMessage(newAnonymousState ? "已切換到匿名模式" : "已切換到非匿名模式");
}

export function showScoreModal() {
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

export function updateScoreHistory(history) {
	const scoreHistoryContainer = document.getElementById("scoreHistory");
	scoreHistoryContainer.innerHTML = "<h3>比分歷史記錄表</h3>";
	history.forEach((result, index) => {
		const resultElement = document.createElement("p");
		resultElement.textContent = `第${index + 1}次投票：${result.map(r => `${r.name}, ${r.score}`).join('；')}`;
		scoreHistoryContainer.appendChild(resultElement);
	});
}

export function updateUserHistory(history) {
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