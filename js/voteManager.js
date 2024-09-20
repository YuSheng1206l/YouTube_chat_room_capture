import { updateVoteResults, displayMessage, showScoreModal, updateScoreHistory, updateUserHistory } from './uiManager.js';

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

export function initVoteManager() {
	// 初始化投票管理器
	try {
		const startVoteBtn = document.getElementById('startVoteBtn');
		const endVoteBtn = document.getElementById('endVoteBtn');
		const restartVoteBtn = document.getElementById('restartVoteBtn');
		const toggleVoteChangeBtn = document.getElementById('toggleVoteChangeBtn');

		if (!startVoteBtn || !endVoteBtn || !restartVoteBtn || !toggleVoteChangeBtn) {
			throw new Error('無法找到必要的按鈕元素');
		}

		startVoteBtn.addEventListener('click', startVote);
		endVoteBtn.addEventListener('click', endVote);
		restartVoteBtn.addEventListener('click', restartCurrentVote);
		toggleVoteChangeBtn.addEventListener('click', toggleVoteChange);

		console.log('投票管理器初始化成功');
	} catch (error) {
		console.error('初始化投票管理器時出錯:', error);
		throw error; // 重新拋出錯誤，以便 main.js 可以捕獲它
	}
}

export function processMessage(info) {
	console.log("Processing message in voteManager:", info);
	if (!isVoting) {
		console.log("Voting is not active");
		return;
	}

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

	voteTitle = document.getElementById("voteTitle").value.trim(); // 添加這行
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

export function toggleAnonymousMode() {
	isAnonymous = !isAnonymous;
	return isAnonymous;
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

export {
	voteOptions,
	participants,
	isVoting,
	isAnonymous,
	voteCount,
	scoreHistory,
	userHistory,
	voteTitle,
	calculateScores,
	updateScoreHistory, // 導出這個函數
	updateUserHistory   // 導出這個函數
};