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
        case 1: return 'text-yellow-400';
        case 2: return 'text-gray-300';
        case 3: return 'text-amber-600';
        default: return 'text-slate-400';
    }
}

function getPodiumClass(rank) {
    switch(rank) {
        case 1: return 'bg-gradient-gold';
        case 2: return 'bg-gradient-silver';
        case 3: return 'bg-gradient-bronze';
        default: return 'bg-slate-600';
    }
}

function displayPodium(leaderboard) {
    const podium = document.getElementById('podium');
    
    if (!leaderboard || leaderboard.length === 0) {
        podium.innerHTML = `
            <div class="col-span-3 text-center text-slate-400 py-8">
                <div class="text-4xl mb-2">🏆</div>
                <p>No champions yet. Be the first!</p>
            </div>
        `;
        return;
    }

    const top3 = leaderboard.slice(0, 3);
    let podiumHTML = '';

    // Arrange podium with 2nd, 1st, 3rd order for visual appeal
    const podiumOrder = [
        top3[1], // 2nd place (left)
        top3[0], // 1st place (center)
        top3[2]  // 3rd place (right)
    ];

    podiumOrder.forEach((player, index) => {
        if (!player) {
            podiumHTML += `
                <div class="text-center text-slate-500 py-8">
                    <div class="text-3xl mb-2">👤</div>
                    <p>Awaiting champion...</p>
                </div>
            `;
            return;
        }

        const actualRank = index === 0 ? 2 : (index === 1 ? 1 : 3);
        const heightClass = actualRank === 1 ? 'h-24' : (actualRank === 2 ? 'h-20' : 'h-16');
        const sizeClass = actualRank === 1 ? 'text-2xl' : 'text-xl';
        
        podiumHTML += `
            <div class="text-center">
                <div class="mb-4">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full ${getPodiumClass(actualRank)} text-white font-bold text-xl shadow-lg">
                        ${getRankEmoji(actualRank)}
                    </div>
                </div>
                <div class="bg-gradient-card backdrop-blur-lg rounded-lg p-4 border border-slate-700/30 ${actualRank === 1 ? 'ring-2 ring-yellow-400/30' : ''}">
                    <div class="font-orbitron font-bold ${sizeClass} text-white mb-1">${player.username || 'Unknown'}</div>
                    <div class="text-yellow-400 font-bold mb-2">${player.totalCoins || 0} coins</div>
                    <div class="mb-2">
                        <span class="inline-block px-2 py-1 rounded text-xs font-bold" style="color: ${player.rankColor || '#10b981'}; background: ${player.rankColor || '#10b981'}20; border: 1px solid ${player.rankColor || '#10b981'}50;">
                            ${player.rankEmoji || '🌱'} ${player.rank || 'Novice'} (Lv.${player.level || 1})
                        </span>
                    </div>
                    <div class="text-xs text-slate-400">
                        ${player.winRate || 0}% win rate • ${player.bestWinStreak || 0} streak
                    </div>
                </div>
                <div class="${getPodiumClass(actualRank)} ${heightClass} mt-2 rounded-t-lg shadow-lg flex items-end justify-center pb-2">
                    <span class="text-white font-bold text-sm">${actualRank}</span>
                </div>
            </div>
        `;
    });

    podium.innerHTML = podiumHTML;
}

function displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboardBody');
    
    if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = `
            <div class="text-center text-slate-400 py-8">
                <div class="text-4xl mb-2">🏆</div>
                <p>No players yet. Be the first to join!</p>
            </div>
        `;
        return;
    }

    const leaderboardHTML = leaderboard.map((player, index) => {
        const rank = index + 1;
        const rankClass = getRankClass(rank);
        const rankDisplay = getRankEmoji(rank);
        
        return `
            <div class="p-4 hover:bg-slate-800/30 transition-colors duration-200">
                <!-- Mobile Layout -->
                <div class="md:hidden">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-3">
                            <div class="font-bold text-lg ${rankClass}">${rankDisplay}</div>
                            <div>
                                <div class="font-semibold text-white">${player.username || 'Unknown'}</div>
                                <div class="text-xs" style="color: ${player.rankColor || '#10b981'};">${player.rankEmoji || '🌱'} ${player.rank || 'Novice'} (Lv.${player.level || 1})</div>
                            </div>
                        </div>
                        <div class="font-bold text-yellow-400">${player.totalCoins || 0}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-xs text-slate-400">
                        <div>${player.gamesPlayed || 0} games</div>
                        <div>${player.winRate || 0}% wins</div>
                        <div>${player.bestWinStreak || 0} streak</div>
                    </div>
                </div>

                <!-- Desktop Layout -->
                <div class="hidden md:grid grid-cols-7 gap-4 items-center">
                    <div class="font-bold text-lg ${rankClass}">${rankDisplay}</div>
                    <div>
                        <div class="font-semibold text-white">${player.username || 'Unknown'}</div>
                        <div class="text-xs" style="color: ${player.rankColor || '#10b981'};">${player.rankEmoji || '🌱'} ${player.rank || 'Novice'} (Lv.${player.level || 1})</div>
                    </div>
                    <div class="text-center font-bold text-yellow-400">${player.totalCoins || 0}</div>
                    <div class="text-center text-slate-300">${player.gamesPlayed || 0}</div>
                    <div class="text-center text-slate-300">${player.winRate || 0}%</div>
                    <div class="text-center text-slate-300">${player.bestWinStreak || 0}</div>
                    <div class="text-center text-blue-400 text-sm">${player.totalXP || 0} XP</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = leaderboardHTML;
}

function updateLeaderboardStats(leaderboard) {
    const totalPlayers = leaderboard.length;
    const topCoins = leaderboard.length > 0 ? leaderboard[0].totalCoins : 0;
    const bestWinRate = leaderboard.reduce((max, player) => 
        Math.max(max, parseFloat(player.winRate)), 0
    );

    document.getElementById('totalPlayers').textContent = totalPlayers;
    document.getElementById('topCoins').textContent = topCoins;
    document.getElementById('bestWinRate').textContent = bestWinRate + '%';
}

// Load leaderboard data
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/leaderboard');
        const result = await response.json();
        
        if (result.success) {
            displayPodium(result.leaderboard);
            displayLeaderboard(result.leaderboard);
            updateLeaderboardStats(result.leaderboard);
        } else {
            document.getElementById('leaderboardBody').innerHTML = `
                <div class="text-center text-slate-400 py-8">
                    <div class="text-4xl mb-2">⚠️</div>
                    <p>Unable to load leaderboard.</p>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('leaderboardBody').innerHTML = `
            <div class="text-center text-slate-400 py-8">
                <div class="text-4xl mb-2">❌</div>
                <p>Error loading leaderboard.</p>
            </div>
        `;
    }
});

// Refresh leaderboard every 30 seconds
setInterval(async () => {
    try {
        const response = await fetch('/api/leaderboard');
        const result = await response.json();
        
        if (result.success) {
            displayPodium(result.leaderboard);
            displayLeaderboard(result.leaderboard);
            updateLeaderboardStats(result.leaderboard);
        }
    } catch (error) {
        // Silent fail for auto-refresh
    }
}, 30000);