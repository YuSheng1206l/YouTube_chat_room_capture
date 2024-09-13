let ws;
let voteOptions = [];
let participants = [];
let isVoting = false;
let isAnonymous = false;
let voteCount = 0;
let scoreHistory = [];
let userHistory = {};

function connectWebSocket() {
	ws = new WebSocket("ws://127.0.0.1:11180/sub");

	ws.onopen = function (event) {
		console.log("WebSocket connection established");
		updateStatus("已连接");
	};

	ws.onmessage = function (event) {
		console.log("Received message:", event.data);
		const info = extractInfo(event.data);
		if (info) {
			console.log("Extracted info:", info);
			processMessage(info);
		} else {
			console.log("Failed to extract info from message");
		}
	};

	ws.onerror = function (error) {
		updateStatus("错误：" + error.message);
	};

	ws.onclose = function (event) {
		updateStatus("连接已关闭");
	};
}

function updateStatus(status) {
	document.getElementById("status").textContent = "连接状态：" + status;
}

function displayMessage(message) {
	const messageContainer = document.getElementById("messageContainer");
	const messageElement = document.createElement("p");
	messageElement.textContent = message;
	messageContainer.appendChild(messageElement);
}

function extractInfo(data) {
	try {
		const jsonData = JSON.parse(data);
		if (jsonData.type === "comments") {
			for (const comment of jsonData.data.comments) {
				const userData = comment.data;
				const userId = userData.userId || "未知";
				const speechText = userData.speechText || "未知";
				return { userId, speechText };
			}
		}
	} catch (error) {
		console.error("无法解析JSON数据:", error);
	}
	return null;
}

function processMessage(info) {
	if (isVoting) {
		const votedOption = voteOptions.find(option => option.keyword === info.speechText);
		if (votedOption) {
			// 檢查是否已經投票
			const existingParticipant = participants.find(p => p.userId === info.userId);
			if (existingParticipant) {
				// 如果已經投票，更新他的選擇
				existingParticipant.vote = votedOption.keyword;
			} else {
				// 如果是新參與者，添加到列表中
				addParticipant(info.userId, votedOption.keyword);
			}
			displayMessage(`${info.userId} 參與了投票，選擇了 ${votedOption.name}`);
			updateVoteResults();
		} else {
			displayMessage(`${info.userId} 嘗試投票，但輸入了無效的關鍵字: ${info.speechText}`);
		}
	}
}

function addOption() {
	const optionInputs = document.getElementById("optionInputs");
	const optionDiv = document.createElement("div");
	optionDiv.className = "option-input";
	optionDiv.innerHTML = `
        <input type="text" class="optionName" placeholder="選項名稱">
        <input type="text" class="optionKeyword" placeholder="選項關鍵字">
    `;
	optionInputs.appendChild(optionDiv);
}

function removeOption() {
	const optionInputs = document.getElementById("optionInputs");
	if (optionInputs.children.length > 0) {
		optionInputs.removeChild(optionInputs.lastChild);
	}
}

function startVote() {
	const startVoteKeyword = document.getElementById("startVoteKeyword").value;
	const optionInputs = document.querySelectorAll(".option-input");
	voteOptions = Array.from(optionInputs).map((div, index) => ({
		name: div.querySelector(".optionName").value || `選項${index + 1}`,
		keyword: div.querySelector(".optionKeyword").value
	}));
	isVoting = true;
	participants = [];
	displayMessage(`投票已開始，關鍵字：${startVoteKeyword}`);
	updateVoteResults();
}

function endVote() {
	isVoting = false;
	displayMessage("投票已結束");
	updateVoteResults();
	showScoreModal();
}

function addParticipant(userId, vote) {
	participants.push({ userId, vote });
	console.log(`Added participant: ${userId}, vote: ${vote}`); // 添加日誌
}

function updateVoteResults() {
	const totalVotes = document.getElementById("totalVotes");
	const optionResults = document.getElementById("optionResults");
	const cardContainer = document.getElementById("cardContainer");

	console.log(`Updating vote results. Total participants: ${participants.length}`); // 添加日誌

	totalVotes.textContent = participants.length;
	optionResults.innerHTML = "";
	cardContainer.innerHTML = "";

	voteOptions.forEach(option => {
		const optionVotes = participants.filter(p => p.vote === option.keyword).length;
		console.log(`Option ${option.name}: ${optionVotes} votes`); // 添加日誌
		const resultElement = document.createElement("p");
		resultElement.textContent = `${option.name}: ${optionVotes} 票`;
		optionResults.appendChild(resultElement);

		if (!isAnonymous) {
			const cardElement = document.createElement("div");
			cardElement.className = "optionCard";
			cardElement.innerHTML = `<h3>${option.name}</h3>`;
			const participantList = participants
				.filter(p => p.vote === option.keyword)
				.map(p => p.userId)
				.sort(() => Math.random() - 0.5);
			participantList.forEach(userId => {
				const userElement = document.createElement("span");
				userElement.className = "participantCard";
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
	modal.innerHTML = `
        <div class="modal-content">
            <h2>設置選項分數</h2>
            <div id="scoreInputs"></div>
            <button onclick="calculateScores()">計算分數</button>
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
}

function calculateScores() {
	voteCount++;
	const scores = voteOptions.map(option => ({
		name: option.name,
		keyword: option.keyword,
		score: parseInt(document.getElementById(`score-${option.keyword}`).value) || 0
	}));

	scoreHistory.push(scores);
	updateScoreHistory();

	participants.forEach(participant => {
		if (!userHistory[participant.userId]) {
			userHistory[participant.userId] = {
				votes: [],
				totalScore: 0
			};
		}
		const votedOption = scores.find(s => s.keyword === participant.vote);
		if (votedOption) {
			userHistory[participant.userId].votes.push(participant.vote);
			userHistory[participant.userId].totalScore += votedOption.score;
		}
	});
	updateUserHistory();

	// 關閉模態窗口
	document.querySelector('.modal').remove();
	displayMessage("分數已計算完成");
}

function updateScoreHistory() {
	const scoreHistoryContainer = document.getElementById("scoreHistory");
	scoreHistoryContainer.innerHTML = "<h3>比分歷史紀錄表</h3>";
	scoreHistory.forEach((result, index) => {
		const resultElement = document.createElement("p");
		resultElement.textContent = `第${index + 1}次投票：${result.map(r => `${r.name}, ${r.score}`).join('；')}`;
		scoreHistoryContainer.appendChild(resultElement);
	});
}

function updateUserHistory() {
	const userHistoryContainer = document.getElementById("userHistory");
	userHistoryContainer.innerHTML = "<h3>用戶總分</h3>";
	Object.entries(userHistory).forEach(([userId, data]) => {
		const userElement = document.createElement("p");
		userElement.textContent = `${userId}：總分：${data.totalScore}`;
		userHistoryContainer.appendChild(userElement);
	});
}

function exportScoreHistoryCSV() {
	let csvContent = "data:text/csv;charset=utf-8,";

	// 添加選項信息
	csvContent += "選項信息:\n";
	scoreHistory.forEach((round, index) => {
		csvContent += `第${index + 1}次投票,`;
		round.forEach(option => {
			csvContent += `${option.name} (${option.keyword}),`;
		});
		csvContent += "\n";
	});
	csvContent += "\n";  // 添加一個空行

	// 添加標題行
	csvContent += "用戶ID,總分," + scoreHistory.map((_, index) => `第${index + 1}次投票`).join(",") + "\n";

	// 添加用戶數據
	Object.entries(userHistory).forEach(([userId, data]) => {
		let row = [userId, data.totalScore];
		// 填充每次投票的選擇，如果沒有參與某次投票則留空格
		for (let i = 0; i < voteCount; i++) {
			const vote = data.votes[i];
			if (vote) {
				const option = scoreHistory[i].find(s => s.keyword === vote);
				row.push(option ? option.keyword : vote);
			} else {
				row.push(" ");  // 使用空格代替空值
			}
		}
		csvContent += row.join(",") + "\n";
	});

	// 創建下載鏈接並觸發下載
	const encodedUri = encodeURI(csvContent);
	const link = document.createElement("a");
	link.setAttribute("href", encodedUri);
	link.setAttribute("download", "vote_history.csv");
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

window.addEventListener("load", connectWebSocket);