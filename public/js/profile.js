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
    document.getElementById('username').textContent = user.username;
    document.getElementById('totalCoins').textContent = user.stats.totalCoins;
    document.getElementById('gamesPlayed').textContent = user.stats.gamesPlayed;
    document.getElementById('gamesWon').textContent = user.stats.gamesWon;
    
    const winRate = user.stats.gamesPlayed > 0 
        ? ((user.stats.gamesWon / user.stats.gamesPlayed) * 100).toFixed(1) 
        : 0;
    document.getElementById('winRate').textContent = winRate + '%';
    
    document.getElementById('currentStreak').textContent = user.stats.winStreak;
    document.getElementById('bestStreak').textContent = user.stats.bestWinStreak;
}

function displayGameHistory(history) {
    const container = document.getElementById('historyContainer');
    
    if (!history || history.length === 0) {
        container.innerHTML = '<p>No games played yet. <a href="/game">Start playing!</a></p>';
        return;
    }
    
    const historyHTML = history.map(game => {
        const resultClass = game.won ? 'win' : 'lose';
        const resultEmoji = game.won ? '✅' : '❌';
        const amountText = game.won ? `+${game.winAmount}` : `${game.winAmount}`;
        const amountColor = game.won ? '#22543d' : '#742a2a';
        
        return `
            <div class="history-item ${resultClass}">
                <div class="history-details">
                    <div class="history-result ${resultClass}">
                        ${resultEmoji} Predicted: ${game.prediction.toUpperCase()}, Result: ${game.result.toUpperCase()}
                    </div>
                    <div class="history-meta">
                        Bet: ${game.bet} coins • ${formatDate(game.timestamp)}
                    </div>
                </div>
                <div class="history-amount" style="color: ${amountColor}; font-weight: bold;">
                    ${amountText} coins
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