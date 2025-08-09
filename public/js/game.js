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
    }
}

function showResult(result, won, winAmount, newBalance) {
    const resultSection = document.getElementById('resultSection');
    
    const resultClass = won ? 'result-win' : 'result-lose';
    const resultEmoji = won ? '🎉' : '😢';
    const resultText = won ? 'You Won!' : 'You Lost!';
    const amountText = won ? `+${winAmount}` : `${winAmount}`;
    
    resultSection.innerHTML = `
        <div class="${resultClass}">
            <h3>${resultEmoji} ${resultText}</h3>
            <p>The coin landed on: <strong>${result.toUpperCase()}</strong></p>
            <p>Coins ${amountText} | New Balance: ${newBalance}</p>
        </div>
    `;
    
    // Update user stats
    currentUser.stats.totalCoins = newBalance;
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
        
        if (result.success) {
            // Animate coin flip
            const coin = document.getElementById('coin');
            const flipClass = result.result === 'heads' ? 'flip-heads' : 'flip-tails';
            
            coin.classList.remove('flip-heads', 'flip-tails');
            setTimeout(() => {
                coin.classList.add(flipClass);
            }, 10);
            
            // Show result after animation
            setTimeout(() => {
                showResult(result.result, result.won, result.winAmount, result.newBalance);
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
            updateUI();
        } else {
            // Not authenticated, redirect to login
            window.location.href = '/';
        }
    } catch (error) {
        window.location.href = '/';
    }
});