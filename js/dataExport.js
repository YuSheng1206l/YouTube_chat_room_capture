import { scoreHistory, userHistory, voteTitle } from './voteManager.js';

export function exportScoreHistoryCSV() {
	// CSV 導出邏輯
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
			const vote = data.votes[i] || " ";
			row.push(vote);
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