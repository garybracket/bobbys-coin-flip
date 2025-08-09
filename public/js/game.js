// Game JavaScript

let currentUser = null;
let isFlipping = false;

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

function setBet(amount) {
    const betInput = document.getElementById('betAmount');
    if (amount === 'all') {
        betInput.value = currentUser.stats.totalCoins;
    } else {
        betInput.value = Math.min(amount, currentUser.stats.totalCoins);
    }
}

function updateUI() {
    if (currentUser) {
        document.getElementById('balance').textContent = currentUser.stats.totalCoins;
        document.getElementById('streak').textContent = currentUser.stats.winStreak;
        document.getElementById('betAmount').max = currentUser.stats.totalCoins;
        
        // Update level and rank display
        if (currentUser.levelInfo && currentUser.rankInfo) {
            document.getElementById('level').textContent = currentUser.levelInfo.currentLevel;
            document.getElementById('rank').innerHTML = `${currentUser.rankInfo.emoji} ${currentUser.rankInfo.rank}`;
            document.getElementById('rank').style.color = currentUser.rankInfo.color;
            
            // Update XP progress bar
            const xpProgress = Math.floor((currentUser.levelInfo.xpIntoLevel / currentUser.levelInfo.xpForLevel) * 100);
            document.getElementById('xpProgress').textContent = `${currentUser.levelInfo.xpIntoLevel} / ${currentUser.levelInfo.xpForLevel}`;
            document.getElementById('xpBar').style.width = `${xpProgress}%`;
        }
    }
}

function showResult(result, won, winAmount, newBalance, xpReward, levelInfo, rankInfo) {
    const resultSection = document.getElementById('resultSection');
    
    const bgClass = won ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30' : 'bg-gradient-to-r from-red-600/20 to-orange-600/20 border-red-500/30';
    const textClass = won ? 'text-green-400' : 'text-red-400';
    const resultEmoji = won ? '🎉' : '💸';
    const resultText = won ? 'VICTORY!' : 'DEFEAT!';
    const amountText = won ? `+${winAmount}` : `${winAmount}`;
    const amountColor = won ? 'text-green-400' : 'text-red-400';
    
    let levelUpHTML = '';
    if (xpReward && xpReward.levelUp) {
        levelUpHTML = `
            <div class="mt-4 p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg">
                <div class="text-purple-400 font-bold text-lg mb-2">🎊 LEVEL UP!</div>
                <div class="text-sm text-purple-300">
                    Level ${xpReward.oldLevel} → ${xpReward.newLevel}
                </div>
            </div>
        `;
    }
    
    const xpHTML = xpReward ? `
        <p class="text-slate-200">
            XP Gained: <span class="font-bold text-blue-400">+${xpReward.xpGained}</span>
            <span class="text-xs text-slate-400">(${xpReward.reason})</span>
        </p>
    ` : '';
    
    resultSection.innerHTML = `
        <div class="bg-gradient-card backdrop-blur-xl rounded-xl p-8 border ${bgClass} shadow-xl animate-pulse-glow">
            <div class="text-center">
                <div class="text-6xl mb-4 animate-bounce">${resultEmoji}</div>
                <h3 class="text-3xl font-orbitron font-bold ${textClass} mb-4">${resultText}</h3>
                <div class="space-y-3 text-lg">
                    <p class="text-slate-200">
                        The coin landed on: <span class="font-bold text-yellow-400">${result.toUpperCase()}</span>
                    </p>
                    <p class="text-slate-200">
                        Coins <span class="font-bold ${amountColor}">${amountText}</span>
                    </p>
                    <p class="text-slate-200">
                        New Balance: <span class="font-bold text-yellow-400">${newBalance}</span>
                    </p>
                    ${xpHTML}
                </div>
                ${levelUpHTML}
                ${won ? '<div class="mt-4 text-sm text-green-300">🔥 Keep the streak going!</div>' : '<div class="mt-4 text-sm text-slate-400">💪 Better luck next time!</div>'}
            </div>
        </div>
    `;
    
    // Update user stats and level info
    currentUser.stats.totalCoins = newBalance;
    if (levelInfo) currentUser.levelInfo = levelInfo;
    if (rankInfo) currentUser.rankInfo = rankInfo;
    updateUI();
    
    if (newBalance <= 0) {
        showMessage('Game Over! You\'re out of coins. Create a new account to play again.', 'error');
        setTimeout(() => {
            logout();
        }, 3000);
    }
}

async function flipCoin(prediction) {
    if (isFlipping) return;
    
    console.log('flipCoin called with prediction:', prediction);
    
    const betAmount = parseInt(document.getElementById('betAmount').value);
    
    if (!betAmount || betAmount <= 0) {
        showMessage('Please enter a valid bet amount', 'error');
        return;
    }
    
    if (betAmount > currentUser.stats.totalCoins) {
        showMessage('You don\'t have enough coins for this bet', 'error');
        return;
    }
    
    isFlipping = true;
    console.log('Starting flip with bet:', betAmount, 'prediction:', prediction);
    
    // Disable buttons during flip
    document.getElementById('headsBtn').disabled = true;
    document.getElementById('tailsBtn').disabled = true;
    
    // Clear previous result
    document.getElementById('resultSection').innerHTML = '';
    
    try {
        const response = await fetch('/api/flip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bet: betAmount,
                prediction: prediction
            })
        });
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
            // Animate coin flip
            const coin = document.getElementById('coin');
            const flipClass = result.result === 'heads' ? 'flip-heads' : 'flip-tails';
            
            // Reset coin to neutral state
            coin.classList.remove('flip-heads', 'flip-tails');
            coin.style.transform = 'rotateY(0deg)';
            
            setTimeout(() => {
                coin.classList.add(flipClass);
            }, 10);
            
            // Show result after animation
            setTimeout(() => {
                showResult(result.result, result.won, result.winAmount, result.newBalance, result.xpReward || null, result.levelInfo || null, result.rankInfo || null);
                isFlipping = false;
                document.getElementById('headsBtn').disabled = false;
                document.getElementById('tailsBtn').disabled = false;
            }, 1000);
            
        } else {
            showMessage(result.message, 'error');
            isFlipping = false;
            document.getElementById('headsBtn').disabled = false;
            document.getElementById('tailsBtn').disabled = false;
        }
    } catch (error) {
        console.error('Error in flipCoin:', error);
        showMessage('An error occurred. Please try again.', 'error');
        isFlipping = false;
        document.getElementById('headsBtn').disabled = false;
        document.getElementById('tailsBtn').disabled = false;
    }
}

// Load user data
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/user');
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.user;
            
            // Show daily login bonus if applicable
            if (result.dailyBonus) {
                showMessage(`Daily Login Bonus: +${result.dailyBonus.xpGained} XP!`, 'success');
                if (result.dailyBonus.levelUp) {
                    setTimeout(() => {
                        showMessage(`🎊 Level Up! Level ${result.dailyBonus.oldLevel} → ${result.dailyBonus.newLevel}`, 'success');
                    }, 2000);
                }
            }
            
            updateUI();
        } else {
            // Not authenticated, redirect to login
            window.location.href = '/';
        }
    } catch (error) {
        window.location.href = '/';
    }
});