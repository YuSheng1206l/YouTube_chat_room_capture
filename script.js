let ws;
let voteOptions = [];
let participants = [];
let isVoting = false;
let isAnonymous = false;
let voteCount = 0;
let scoreHistory = [];
let userHistory = {};
let voteTitle = "";
let optionCount = 2;
let isVoteInProgress = false;
let allowVoteChange = false;

function connectWebSocket() {
	ws = new WebSocket("ws://127.0.0.1:11180/sub");
	ws.onopen = () => updateStatus("已连接");
	ws.onmessage = (event) => {
		const info = extractInfo(event.data);
		if (info) processMessage(info);
	};
	ws.onerror = (error) => updateStatus("错误：" + error.message);
	ws.onclose = () => updateStatus("连接已关闭");
}

function updateStatus(status) {
	document.getElementById("status").textContent = "连接状态：" + status;
}

function displayMessage(message) {
	const messageElement = document.createElement("p");
	messageElement.textContent = message;
	document.getElementById("messageContainer").appendChild(messageElement);
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
		console.error("无法解析JSON数据:", error);
	}
	return null;
}

function processMessage(info) {
	if (!isVoting) return;

	const startVoteKeyword = document.getElementById("startVoteKeyword").value;
	const [userStartKeyword, userOptionKeyword] = info.speechText.split(' ');

	if (userStartKeyword !== startVoteKeyword) {
		displayMessage(`${info.userId} 尝试投票，但输入了无效的开始投票关键字: ${userStartKeyword}`);
		return;
	}

	const votedOption = voteOptions.find(option => option.keyword === userOptionKeyword);
	if (!votedOption) {
		displayMessage(`${info.userId} 尝试投票，但输入了无效的选项关键字: ${userOptionKeyword}`);
		return;
	}

	updateParticipantVote(info.userId, votedOption);
	displayMessage(`${info.userId} 参与了投票，选择了 ${votedOption.name}`);
	updateVoteResults();
}

function updateParticipantVote(userId, votedOption) {
	const existingParticipant = participants.find(p => p.userId === userId);
	if (existingParticipant) {
		if (allowVoteChange) {
			existingParticipant.vote = votedOption.keyword;
		}
	} else {
		participants.push({ userId, vote: votedOption.keyword });
	}
}

function addOption() {
	const optionContainer = document.getElementById('optionContainer');
	const optionDiv = document.createElement('div');
	optionDiv.className = 'option-input';
	optionDiv.innerHTML = `
		<input type="text" class="option-name" placeholder="选项名称">
		<input type="text" class="option-keyword" placeholder="选项关键字">
	`;
	optionContainer.appendChild(optionDiv);
	optionCount++;
}

function removeOption() {
	if (optionCount <= 2) {
		alert('至少需要保留两个选项！');
		return;
	}
	const optionContainer = document.getElementById('optionContainer');
	optionContainer.removeChild(optionContainer.lastChild);
	optionCount--;
}

function startVote() {
	if (isVoteInProgress) {
		alert('投票已经开始，无法再次启动！');
		return;
	}

	const optionInputs = document.querySelectorAll('.option-input');
	const options = Array.from(optionInputs).map(div => ({
		name: div.querySelector('.option-name').value.trim(),
		keyword: div.querySelector('.option-keyword').value.trim()
	}));

	if (options.length < 2 || options.some(option => option.name === '' || option.keyword === '')) {
		alert('请至少添加两个有效选项，并确保每个选项都有名称和关键字！');
		return;
	}

	// 检查关键字是否唯一
	const keywords = options.map(option => option.keyword);
	if (new Set(keywords).size !== keywords.length) {
		alert('每个选项的关键字必须是唯一的！');
		return;
	}

	isVoteInProgress = true;
	isVoting = true;
	voteOptions = options;
	participants = [];
	document.querySelector('button[onclick="startVote()"]').disabled = true;
	document.querySelector('button[onclick="endVote()"]').disabled = false;
	displayMessage("投票已开始");
	updateVoteResults();
}

function endVote() {
	if (!isVoteInProgress) {
		alert('当前没有进行中的投票！');
		return;
	}

	if (confirm('确定要结束当前投票吗？')) {
		isVoteInProgress = false;
		isVoting = false;
		document.querySelector('button[onclick="startVote()"]').disabled = false;
		document.querySelector('button[onclick="endVote()"]').disabled = true;
		showScoreModal();
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
	displayMessage(isAnonymous ? "已切换到匿名模式" : "已切换到非匿名模式");
}

function showScoreModal() {
	const modal = document.createElement('div');
	modal.className = 'modal';
	modal.innerHTML = `
        <div class="modal-content">
            <h2>设置选项分数 - ${voteTitle}</h2>
            <div id="scoreInputs"></div>
            <button onclick="calculateScores()">计算分数</button>
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
		label.textContent = `${option.name} 分数：`;
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
			userHistory[participant.userId] = { votes: [], totalScore: 0 };
		}
		const votedOption = scores.find(s => s.keyword === participant.vote);
		if (votedOption) {
			userHistory[participant.userId].votes.push(participant.vote);
			userHistory[participant.userId].totalScore += votedOption.score;
		}
	});
	updateUserHistory();

	document.querySelector('.modal').remove();
	displayMessage("分数已计算完成");
}

function updateScoreHistory() {
	const scoreHistoryContainer = document.getElementById("scoreHistory");
	scoreHistoryContainer.innerHTML = "<h3>比分历史记录表</h3>";
	scoreHistory.forEach((result, index) => {
		const resultElement = document.createElement("p");
		resultElement.textContent = `第${index + 1}次投票：${result.map(r => `${r.name}, ${r.score}`).join('；')}`;
		scoreHistoryContainer.appendChild(resultElement);
	});
}

function updateUserHistory() {
	const userHistoryContainer = document.getElementById("userHistoryContainer");
	userHistoryContainer.innerHTML = "";
	Object.entries(userHistory).forEach(([userId, data]) => {
		const userElement = document.createElement("p");
		userElement.textContent = `${userId}：总分：${data.totalScore}`;
		userHistoryContainer.appendChild(userElement);
	});
}

function exportScoreHistoryCSV() {
	if (scoreHistory.length === 0) {
		alert('尚未完成任何投票，无法导出CSV！');
		return;
	}
	let csvContent = "data:text/csv;charset=utf-8,";

	csvContent += "选项信息:\n";
	scoreHistory.forEach((round, index) => {
		csvContent += `第${index + 1}次投票 (${voteTitle}),`;
		round.forEach(option => {
			csvContent += `${option.name} (${option.keyword}),`;
		});
		csvContent += "\n";
	});
	csvContent += "\n";

	csvContent += "用户ID,总分," + scoreHistory.map((_, index) => `第${index + 1}次投票`).join(",") + "\n";

	Object.entries(userHistory).forEach(([userId, data]) => {
		let row = [userId, data.totalScore];
		for (let i = 0; i < voteCount; i++) {
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

function restartCurrentVote() {
	if (!isVoteInProgress) {
		alert('当前没有进行中的投票！');
		return;
	}

	if (confirm('确定要重新开始当前投票吗？这将清空所有已收到的投票数据。')) {
		participants = [];
		updateVoteResults();
		displayMessage("当前投票已重新开始，所有投票数据已清空");
	}
}

function toggleVoteChange() {
	allowVoteChange = !allowVoteChange;
	const button = document.querySelector('button[onclick="toggleVoteChange()"]');
	button.textContent = allowVoteChange ? '禁止更改投票' : '允许更改投票';
	displayMessage(allowVoteChange ? "现在允许更改投票" : "现在禁止更改投票");
}

function init() {
	const optionContainer = document.getElementById('optionContainer');
	for (let i = 0; i < 2; i++) {
		addOption();
	}
}

window.addEventListener("load", connectWebSocket);
window.onload = init;