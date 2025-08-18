// Profile JavaScript

function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.add('show');
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        showMessage('Error logging out', 'error');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function displayUserStats(user) {
    document.getElementById('username').textContent = user.username || 'Unknown';
    document.getElementById('totalCoins').textContent = (user.stats && user.stats.totalCoins) || 0;
    document.getElementById('gamesPlayed').textContent = (user.stats && user.stats.gamesPlayed) || 0;
    document.getElementById('gamesWon').textContent = (user.stats && user.stats.gamesWon) || 0;
    
    const gamesPlayed = (user.stats && user.stats.gamesPlayed) || 0;
    const gamesWon = (user.stats && user.stats.gamesWon) || 0;
    const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0;
    document.getElementById('winRate').textContent = winRate + '%';
    
    document.getElementById('currentStreak').textContent = (user.stats && user.stats.winStreak) || 0;
    document.getElementById('bestStreak').textContent = (user.stats && user.stats.bestWinStreak) || 0;
}

function displayGameHistory(history) {
    const container = document.getElementById('historyContainer');
    
    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="text-center text-slate-400 py-8">
                <div class="text-4xl mb-2">🎮</div>
                <p>No games played yet.</p>
                <a href="/game" class="inline-flex items-center mt-2 text-blue-400 hover:text-blue-300">
                    Start playing! →
                </a>
            </div>
        `;
        return;
    }
    
    const historyHTML = history.map(game => {
        const bgClass = game.won ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';
        const resultEmoji = game.won ? '🎉' : '💸';
        const resultText = game.won ? 'WON' : 'LOST';
        const resultClass = game.won ? 'text-green-400' : 'text-red-400';
        const amountText = game.won ? `+${game.winAmount}` : `${game.winAmount}`;
        const amountColor = game.won ? 'text-green-400' : 'text-red-400';
        
        return `
            <div class="p-4 rounded-lg border ${bgClass} hover:bg-opacity-20 transition-all duration-200 mb-3">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="text-lg">${resultEmoji}</span>
                        <span class="font-bold ${resultClass}">${resultText}</span>
                    </div>
                    <div class="font-bold ${amountColor}">${amountText} coins</div>
                </div>
                <div class="text-sm text-slate-300 mb-1">
                    Predicted: <span class="font-medium text-yellow-400">${(game.prediction || 'unknown').toUpperCase()}</span> • 
                    Result: <span class="font-medium text-yellow-400">${(game.result || 'unknown').toUpperCase()}</span>
                </div>
                <div class="text-xs text-slate-400">
                    Bet: ${game.bet || 0} coins • ${formatDate(game.timestamp)}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = historyHTML;
}

// Load user data and game history
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load user data
        const userResponse = await fetch('/api/user');
        const userResult = await userResponse.json();
        
        if (userResult.success) {
            displayUserStats(userResult.user);
        } else {
            // Not authenticated, redirect to login
            window.location.href = '/';
            return;
        }
        
        // Load game history
        const historyResponse = await fetch('/api/history');
        const historyResult = await historyResponse.json();
        
        if (historyResult.success) {
            displayGameHistory(historyResult.history);
        } else {
            document.getElementById('historyContainer').innerHTML = '<p>Unable to load game history.</p>';
        }
        
    } catch (error) {
        showMessage('Error loading profile data', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
});