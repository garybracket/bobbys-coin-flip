// Game JavaScript

let currentUser = null;
let isFlipping = false;

// Create audio context for coin flip sound
function createCoinFlipSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        function playSound() {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Create a metallic "ting" sound
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        }
        
        return playSound;
    } catch (error) {
        console.log('Audio not supported');
        return () => {}; // Silent fallback
    }
}

const playCoinSound = createCoinFlipSound();

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
    const totalCoins = (currentUser && currentUser.stats && currentUser.stats.totalCoins) || 0;
    if (amount === 'all') {
        betInput.value = totalCoins;
    } else {
        betInput.value = Math.min(amount, totalCoins);
    }
}

function updateUI() {
    console.log('updateUI called, currentUser:', currentUser ? 'exists' : 'null');
    if (currentUser) {
        const balanceEl = document.getElementById('balance');
        const streakEl = document.getElementById('streak');
        const betAmountEl = document.getElementById('betAmount');
        
        const totalCoins = (currentUser.stats && currentUser.stats.totalCoins) || 0;
        const winStreak = (currentUser.stats && currentUser.stats.winStreak) || 0;
        
        if (balanceEl) balanceEl.textContent = totalCoins;
        if (streakEl) streakEl.textContent = winStreak;
        if (betAmountEl) betAmountEl.max = totalCoins;
        
        // Update level and rank display
        if (currentUser.levelInfo && currentUser.rankInfo) {
            const levelEl = document.getElementById('level');
            const rankEl = document.getElementById('rank');
            const xpProgressEl = document.getElementById('xpProgress');
            const xpBarEl = document.getElementById('xpBar');
            
            if (levelEl) levelEl.textContent = currentUser.levelInfo.currentLevel;
            if (rankEl) {
                rankEl.innerHTML = `${currentUser.rankInfo.emoji} ${currentUser.rankInfo.rank}`;
                rankEl.style.color = currentUser.rankInfo.color;
            }
            
            // Update XP progress bar
            if (xpProgressEl && xpBarEl) {
                const xpProgress = Math.floor((currentUser.levelInfo.xpIntoLevel / currentUser.levelInfo.xpForLevel) * 100);
                xpProgressEl.textContent = `${currentUser.levelInfo.xpIntoLevel} / ${currentUser.levelInfo.xpForLevel}`;
                xpBarEl.style.width = `${xpProgress}%`;
            }
        }
    }
}

function showResult(result, won, winAmount, newBalance, xpReward, levelInfo, rankInfo) {
    console.log('showResult called with:', { result, won, winAmount, newBalance });
    
    const resultSection = document.getElementById('resultSection');
    if (!resultSection) {
        console.error('Result section element not found!');
        return;
    }
    
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
    
    const resultHTML = `
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
    
    resultSection.innerHTML = resultHTML;
    console.log('Result HTML set, content length:', resultHTML.length);
    
    // Update user stats and level info
    if (currentUser && currentUser.stats) {
        currentUser.stats.totalCoins = newBalance;
    }
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
    
    const totalCoins = (currentUser && currentUser.stats && currentUser.stats.totalCoins) || 0;
    if (betAmount > totalCoins) {
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
            console.log('Flip successful, animating coin...');
            
            // Animate coin flip
            const coin = document.getElementById('coin');
            if (!coin) {
                console.error('Coin element not found!');
                return;
            }
            
            const flipClass = result.result === 'heads' ? 'flip-heads' : 'flip-tails';
            console.log('Adding flip class:', flipClass);
            
            // Reset coin to neutral state (always start with heads showing)
            coin.classList.remove('flip-heads', 'flip-tails');
            coin.style.transform = 'rotateY(0deg)';
            console.log(`[COIN-RESET] Coin reset to heads position for result: ${result.result}`);
            
            // Force reflow before adding animation class
            void coin.offsetHeight;
            
            setTimeout(() => {
                coin.classList.add(flipClass);
                console.log(`[COIN-ANIMATION] Added ${flipClass} class - should end showing ${result.result}`);
                
                // Play coin flip sound
                playCoinSound();
            }, 50);
            
            // Show result after animation - with fallback
            const showResultsAndReset = () => {
                console.log('Showing results...');
                showResult(result.result, result.won, result.winAmount, result.newBalance, result.xpReward || null, result.levelInfo || null, result.rankInfo || null);
                isFlipping = false;
                
                // Re-enable buttons
                const headsBtn = document.getElementById('headsBtn');
                const tailsBtn = document.getElementById('tailsBtn');
                if (headsBtn) headsBtn.disabled = false;
                if (tailsBtn) tailsBtn.disabled = false;
                
                console.log('Flip complete, buttons re-enabled');
            };
            
            // Primary timer for animation
            const resultTimer = setTimeout(showResultsAndReset, 1500);
            
            // Fallback timer in case something goes wrong
            setTimeout(() => {
                if (isFlipping) {
                    console.warn('Fallback triggered - showing results immediately');
                    clearTimeout(resultTimer);
                    showResultsAndReset();
                }
            }, 3000);
            
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

// Debug function to test coin sides
function debugCoinSides() {
    const coin = document.getElementById('coin');
    if (!coin) return;
    
    console.log('Testing coin sides...');
    
    // Test heads
    setTimeout(() => {
        coin.className = 'coin w-40 h-40 md:w-48 md:h-48';
        coin.style.transform = 'rotateY(0deg)';
        console.log('Showing heads (0deg)');
    }, 1000);
    
    // Test tails
    setTimeout(() => {
        coin.className = 'coin w-40 h-40 md:w-48 md:h-48';
        coin.style.transform = 'rotateY(180deg)';
        console.log('Showing tails (180deg)');
    }, 3000);
    
    // Test intermediate angles
    setTimeout(() => {
        coin.style.transform = 'rotateY(90deg)';
        console.log('Showing 90deg (edge)');
    }, 5000);
}

// Add debug button to page
function addDebugButton() {
    const debugBtn = document.createElement('button');
    debugBtn.textContent = 'Debug Coin';
    debugBtn.onclick = debugCoinSides;
    debugBtn.style.position = 'fixed';
    debugBtn.style.top = '10px';
    debugBtn.style.right = '10px';
    debugBtn.style.zIndex = '9999';
    debugBtn.style.background = 'red';
    debugBtn.style.color = 'white';
    debugBtn.style.padding = '10px';
    document.body.appendChild(debugBtn);
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
            
            // Add debug button in development
            addDebugButton();
        } else {
            // Not authenticated, redirect to login
            window.location.href = '/';
        }
    } catch (error) {
        window.location.href = '/';
    }
});