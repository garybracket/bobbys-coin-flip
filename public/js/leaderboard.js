// Leaderboard JavaScript

function getRankEmoji(rank) {
    switch(rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return `#${rank}`;
    }
}

function getRankClass(rank) {
    switch(rank) {
        case 1: return 'gold';
        case 2: return 'silver';
        case 3: return 'bronze';
        default: return '';
    }
}

function displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboardBody');
    
    if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = '<div class="loading">No players yet. Be the first to join!</div>';
        return;
    }
    
    const leaderboardHTML = leaderboard.map((player, index) => {
        const rank = index + 1;
        const rankClass = getRankClass(rank);
        const rankDisplay = getRankEmoji(rank);
        
        return `
            <div class="table-row">
                <div class="rank ${rankClass}">${rankDisplay}</div>
                <div class="username">${player.username}</div>
                <div class="coins">${player.totalCoins}</div>
                <div class="games">${player.gamesPlayed}</div>
                <div class="winrate">${player.winRate}%</div>
                <div class="streak">${player.bestWinStreak}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = leaderboardHTML;
}

// Load leaderboard data
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/leaderboard');
        const result = await response.json();
        
        if (result.success) {
            displayLeaderboard(result.leaderboard);
        } else {
            document.getElementById('leaderboardBody').innerHTML = '<div class="loading">Unable to load leaderboard.</div>';
        }
    } catch (error) {
        document.getElementById('leaderboardBody').innerHTML = '<div class="loading">Error loading leaderboard.</div>';
    }
});

// Refresh leaderboard every 30 seconds
setInterval(async () => {
    try {
        const response = await fetch('/api/leaderboard');
        const result = await response.json();
        
        if (result.success) {
            displayLeaderboard(result.leaderboard);
        }
    } catch (error) {
        // Silent fail for auto-refresh
    }
}, 30000);