// Multiplayer JavaScript
let socket = null;
let currentUser = null;
let currentMatch = null;
let roomCode = null;

function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    
    let bgColor = 'bg-blue-600';
    if (type === 'success') bgColor = 'bg-green-600';
    else if (type === 'error') bgColor = 'bg-red-600';
    
    messageEl.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg text-white font-medium shadow-xl ${bgColor}`;
    messageEl.classList.add('show');
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

async function logout() {
    try {
        if (socket) {
            socket.disconnect();
        }
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        showMessage('Error logging out', 'error');
    }
}

function updateConnectionStatus(connected, text) {
    const statusEl = document.getElementById('connectionStatus');
    const textEl = document.getElementById('connectionText');
    
    if (connected) {
        statusEl.className = 'w-3 h-3 bg-green-400 rounded-full animate-pulse';
        textEl.textContent = text || 'Connected to multiplayer';
    } else {
        statusEl.className = 'w-3 h-3 bg-red-400 rounded-full';
        textEl.textContent = text || 'Disconnected from multiplayer';
    }
}

function showSection(sectionId) {
    // Hide all sections
    ['lobbySection', 'matchSection', 'roomCreatedSection', 'waitingSection'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    
    // Show requested section
    document.getElementById(sectionId).classList.remove('hidden');
}

function startQuickMatch() {
    const rounds = parseInt(document.getElementById('quickMatchRounds').value);
    const betAmount = parseInt(document.getElementById('quickMatchBet').value);
    
    if (!socket) {
        showMessage('Not connected to multiplayer server', 'error');
        return;
    }
    
    if (betAmount <= 0 || betAmount > currentUser.stats.totalCoins) {
        showMessage('Invalid bet amount', 'error');
        return;
    }
    
    socket.emit('quick_match', { rounds, betAmount });
    showSection('waitingSection');
}

function createPrivateRoom() {
    const rounds = parseInt(document.getElementById('privateRoomRounds').value);
    const betAmount = parseInt(document.getElementById('privateRoomBet').value);
    
    if (!socket) {
        showMessage('Not connected to multiplayer server', 'error');
        return;
    }
    
    if (betAmount <= 0 || betAmount > currentUser.stats.totalCoins) {
        showMessage('Invalid bet amount', 'error');
        return;
    }
    
    socket.emit('create_private_room', { rounds, betAmount });
}

function joinPrivateRoom() {
    const code = document.getElementById('joinRoomCode').value.toUpperCase().trim();
    
    if (!socket) {
        showMessage('Not connected to multiplayer server', 'error');
        return;
    }
    
    if (!code || code.length !== 6) {
        showMessage('Please enter a valid 6-digit room code', 'error');
        return;
    }
    
    socket.emit('join_private_room', { roomCode: code });
}

function copyRoomCode() {
    if (roomCode) {
        navigator.clipboard.writeText(roomCode).then(() => {
            showMessage('Room code copied to clipboard!', 'success');
        }).catch(() => {
            showMessage('Failed to copy room code', 'error');
        });
    }
}

function cancelSearch() {
    if (socket) {
        socket.emit('cancel_search');
    }
    showSection('lobbySection');
}

function makeCall(prediction) {
    if (currentMatch && socket) {
        socket.emit('make_call', {
            matchId: currentMatch.matchId,
            prediction: prediction
        });
        
        // Update UI to show waiting for opponent
        updateMatchUI();
    }
}

function makePrediction(prediction) {
    if (currentMatch && socket) {
        socket.emit('make_prediction', {
            matchId: currentMatch.matchId,
            prediction: prediction
        });
        
        // Update UI to show waiting for result
        updateMatchUI();
    }
}

function updateMatchUI() {
    if (!currentMatch) return;
    
    const matchSection = document.getElementById('matchSection');
    const currentRound = currentMatch.rounds[currentMatch.currentRound - 1];
    const isYourTurn = currentRound && (
        (currentRound.caller === currentUser.username && !currentRound.callerPrediction) ||
        (currentRound.caller !== currentUser.username && !currentRound.opponentPrediction && currentRound.callerPrediction)
    );
    
    let turnText = '';
    let buttonHTML = '';
    
    if (!currentRound) {
        turnText = 'Preparing next round...';
    } else if (currentRound.caller === currentUser.username) {
        if (!currentRound.callerPrediction) {
            turnText = 'Your turn to call the coin!';
            buttonHTML = `
                <div class="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                    <button onclick="makeCall('heads')" 
                            class="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg hover:scale-105 transition-all duration-200 shadow-lg">
                        <div class="flex items-center justify-center space-x-2">
                            <span class="text-2xl">🪙</span>
                            <span>CALL HEADS</span>
                        </div>
                    </button>
                    <button onclick="makeCall('tails')" 
                            class="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-lg hover:scale-105 transition-all duration-200 shadow-lg">
                        <div class="flex items-center justify-center space-x-2">
                            <span class="text-2xl">🪙</span>
                            <span>CALL TAILS</span>
                        </div>
                    </button>
                </div>
            `;
        } else {
            turnText = `You called ${currentRound.callerPrediction.toUpperCase()}. Waiting for opponent's prediction...`;
        }
    } else {
        if (!currentRound.callerPrediction) {
            turnText = `${currentRound.caller} is making their call...`;
        } else if (!currentRound.opponentPrediction) {
            turnText = `${currentRound.caller} called ${currentRound.callerPrediction.toUpperCase()}. Make your prediction!`;
            buttonHTML = `
                <div class="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                    <button onclick="makePrediction('heads')" 
                            class="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg hover:scale-105 transition-all duration-200 shadow-lg">
                        <div class="flex items-center justify-center space-x-2">
                            <span class="text-2xl">🪙</span>
                            <span>HEADS</span>
                        </div>
                    </button>
                    <button onclick="makePrediction('tails')" 
                            class="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-lg hover:scale-105 transition-all duration-200 shadow-lg">
                        <div class="flex items-center justify-center space-x-2">
                            <span class="text-2xl">🪙</span>
                            <span>TAILS</span>
                        </div>
                    </button>
                </div>
            `;
        } else {
            turnText = 'Both predictions made. Flipping coin...';
        }
    }
    
    matchSection.innerHTML = `
        <div class="text-center">
            <div class="mb-6">
                <h2 class="text-2xl font-orbitron font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    🥊 Battle Arena
                </h2>
                <div class="text-lg text-slate-300">
                    ${currentUser.username} vs ${currentMatch.opponent}
                </div>
            </div>

            <!-- Match Info -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                    <div class="text-sm text-slate-400">Round</div>
                    <div class="text-xl font-bold text-yellow-400">${currentMatch.currentRound}/${currentMatch.totalRounds}</div>
                </div>
                <div class="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                    <div class="text-sm text-slate-400">Your Score</div>
                    <div class="text-xl font-bold text-green-400">${currentMatch.yourScore || 0}</div>
                </div>
                <div class="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                    <div class="text-sm text-slate-400">Opponent Score</div>
                    <div class="text-xl font-bold text-red-400">${currentMatch.opponentScore || 0}</div>
                </div>
                <div class="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                    <div class="text-sm text-slate-400">Bet</div>
                    <div class="text-xl font-bold text-purple-400">${currentMatch.betAmount}</div>
                </div>
            </div>

            <!-- Coin Animation Area -->
            <div class="flex justify-center mb-8">
                <div class="coin w-32 h-32 md:w-40 md:h-40" id="multiplayerCoin">
                    <div class="coin-face coin-heads w-full h-full rounded-full flex items-center justify-center text-5xl md:text-6xl font-orbitron font-black">
                        H
                    </div>
                    <div class="coin-face coin-tails w-full h-full rounded-full flex items-center justify-center text-5xl md:text-6xl font-orbitron font-black absolute top-0 left-0">
                        T
                    </div>
                </div>
            </div>

            <!-- Turn Info -->
            <div class="mb-8">
                <div class="text-xl font-bold text-slate-200 mb-4">${turnText}</div>
                ${buttonHTML}
            </div>

            <!-- Round Results -->
            <div class="mt-8" id="roundResults">
                <!-- Round results will be shown here -->
            </div>
        </div>
    `;
}

function showRoundResult(result) {
    const coin = document.getElementById('multiplayerCoin');
    const resultsDiv = document.getElementById('roundResults');
    
    // Animate coin
    const flipClass = result.coinResult === 'heads' ? 'flip-heads' : 'flip-tails';
    coin.classList.remove('flip-heads', 'flip-tails');
    setTimeout(() => {
        coin.classList.add(flipClass);
    }, 100);
    
    // Show result after coin animation
    setTimeout(() => {
        const isWinner = result.winner === currentUser.username;
        const bgClass = isWinner ? 'bg-green-500/10 border-green-500/30' : 
                       result.winner ? 'bg-red-500/10 border-red-500/30' : 
                       'bg-yellow-500/10 border-yellow-500/30';
        const textClass = isWinner ? 'text-green-400' : 
                         result.winner ? 'text-red-400' : 'text-yellow-400';
        const emoji = isWinner ? '🎉' : result.winner ? '😞' : '🤝';
        const resultText = isWinner ? 'You Won This Round!' : 
                          result.winner ? 'You Lost This Round' : 'Round Tied!';
        
        resultsDiv.innerHTML = `
            <div class="bg-gradient-card backdrop-blur-lg rounded-xl p-6 border ${bgClass} mx-auto max-w-md">
                <div class="text-center">
                    <div class="text-4xl mb-2">${emoji}</div>
                    <div class="text-xl font-bold ${textClass} mb-3">${resultText}</div>
                    <div class="space-y-2 text-sm">
                        <div class="text-slate-300">
                            Coin landed on: <span class="font-bold text-yellow-400">${result.coinResult.toUpperCase()}</span>
                        </div>
                        <div class="text-slate-300">
                            Call: <span class="font-bold">${result.callerPrediction?.toUpperCase() || 'N/A'}</span> | 
                            Prediction: <span class="font-bold">${result.opponentPrediction?.toUpperCase() || 'N/A'}</span>
                        </div>
                        <div class="text-slate-300">
                            Score: <span class="text-green-400">${result.player1Score}</span> - <span class="text-red-400">${result.player2Score}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Update match data
        currentMatch.yourScore = result.winner === currentUser.username ? 
            (currentMatch.yourScore || 0) + 1 : (currentMatch.yourScore || 0);
        currentMatch.opponentScore = result.winner && result.winner !== currentUser.username ? 
            (currentMatch.opponentScore || 0) + 1 : (currentMatch.opponentScore || 0);
        
    }, 1200);
}

function showMatchResult(result) {
    const matchSection = document.getElementById('matchSection');
    const isWinner = result.winner === currentUser.username;
    const isDraw = !result.winner;
    
    let bgClass, textClass, emoji, resultText;
    
    if (isDraw) {
        bgClass = 'bg-yellow-500/10 border-yellow-500/30';
        textClass = 'text-yellow-400';
        emoji = '🤝';
        resultText = 'Match Ended in a Draw!';
    } else if (isWinner) {
        bgClass = 'bg-green-500/10 border-green-500/30';
        textClass = 'text-green-400';
        emoji = '🏆';
        resultText = 'Victory! You Won the Match!';
    } else {
        bgClass = 'bg-red-500/10 border-red-500/30';
        textClass = 'text-red-400';
        emoji = '💔';
        resultText = 'Defeat! Better Luck Next Time';
    }
    
    let levelUpHTML = '';
    if (result.xpReward && result.xpReward.levelUp) {
        levelUpHTML = `
            <div class="mt-4 p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg">
                <div class="text-purple-400 font-bold text-lg mb-2">🎊 LEVEL UP!</div>
                <div class="text-sm text-purple-300">
                    Level ${result.xpReward.oldLevel} → ${result.xpReward.newLevel}
                </div>
            </div>
        `;
    }
    
    const xpHTML = result.xpReward ? `
        <div class="text-lg text-blue-400">
            ⭐ XP Gained: <span class="font-bold">+${result.xpReward.xpGained}</span>
            <div class="text-xs text-slate-400">(${result.xpReward.reason})</div>
        </div>
    ` : '';
    
    const rankHTML = result.rankInfo ? `
        <div class="text-sm text-slate-300">
            Rank: <span class="font-bold" style="color: ${result.rankInfo.color};">
                ${result.rankInfo.emoji} ${result.rankInfo.rank} (Level ${result.levelInfo.currentLevel})
            </span>
        </div>
    ` : '';
    
    matchSection.innerHTML = `
        <div class="text-center">
            <div class="bg-gradient-card backdrop-blur-lg rounded-2xl p-8 border ${bgClass} mx-auto max-w-lg">
                <div class="text-8xl mb-4 animate-bounce">${emoji}</div>
                <h2 class="text-3xl font-orbitron font-bold ${textClass} mb-4">${resultText}</h2>
                
                <div class="space-y-4 mb-6">
                    <div class="text-lg text-slate-300">
                        Final Score: <span class="font-bold">${result.finalScore[currentUser.username]} - ${result.finalScore[currentMatch.opponent]}</span>
                    </div>
                    
                    ${result.coinsWon > 0 ? `
                        <div class="text-lg text-green-400">
                            💰 Coins Won: <span class="font-bold">+${result.coinsWon}</span>
                        </div>
                    ` : result.coinsWon < 0 ? `
                        <div class="text-lg text-red-400">
                            💸 Coins Lost: <span class="font-bold">${result.coinsWon}</span>
                        </div>
                    ` : ''}
                    
                    <div class="text-lg text-slate-300">
                        New Balance: <span class="font-bold text-yellow-400">${result.newBalance}</span>
                    </div>
                    
                    ${xpHTML}
                    ${rankHTML}
                </div>
                
                ${levelUpHTML}
                
                <div class="space-y-3">
                    <button onclick="showSection('lobbySection')" 
                            class="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:scale-105 transition-all duration-200">
                        🎮 Play Again
                    </button>
                    <button onclick="window.location.href='/leaderboard'" 
                            class="w-full py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-medium transition-all duration-200">
                        🏆 View Leaderboard
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Reset current match
    currentMatch = null;
}

// Initialize multiplayer connection
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get user data first
        const response = await fetch('/api/user');
        const result = await response.json();
        
        if (!result.success) {
            window.location.href = '/';
            return;
        }
        
        currentUser = result.user;
        document.getElementById('playerName').textContent = currentUser.username;
        
        // Connect to Socket.IO
        socket = io();
        
        socket.on('connect', () => {
            updateConnectionStatus(true);
            showMessage('Connected to multiplayer!', 'success');
        });
        
        socket.on('disconnect', () => {
            updateConnectionStatus(false);
            showMessage('Disconnected from multiplayer', 'error');
        });
        
        socket.on('error', (message) => {
            showMessage(message, 'error');
        });
        
        socket.on('connected', (data) => {
            currentUser = data;
            console.log('Multiplayer connected:', data);
        });
        
        socket.on('lobby_joined', (data) => {
            console.log('Joined lobby with players:', data.players);
            updateOnlinePlayers(data.players);
        });
        
        socket.on('player_joined_lobby', (data) => {
            showMessage(`${data.username} joined the lobby`, 'info');
        });
        
        socket.on('looking_for_match', () => {
            showMessage('Searching for opponent...', 'info');
        });
        
        socket.on('room_created', (data) => {
            roomCode = data.roomCode;
            document.getElementById('roomCodeDisplay').textContent = roomCode;
            showSection('roomCreatedSection');
            showMessage('Private room created!', 'success');
        });
        
        socket.on('player_joined_room', (data) => {
            showMessage(`${data.guest} joined your room!`, 'success');
        });
        
        socket.on('room_joined', (data) => {
            showMessage(`Joined room hosted by ${data.host}`, 'success');
        });
        
        socket.on('match_started', (data) => {
            currentMatch = data;
            currentMatch.yourScore = 0;
            currentMatch.opponentScore = 0;
            currentMatch.rounds = new Array(data.totalRounds).fill().map((_, i) => ({ round: i + 1 }));
            
            showSection('matchSection');
            updateMatchUI();
            showMessage('Match started! Good luck!', 'success');
        });
        
        socket.on('opponent_called', (data) => {
            showMessage(`Opponent called ${data.prediction.toUpperCase()}!`, 'info');
            updateMatchUI();
        });
        
        socket.on('round_result', (result) => {
            showRoundResult(result);
        });
        
        socket.on('next_round', (data) => {
            if (currentMatch) {
                currentMatch.currentRound = data.round;
                setTimeout(() => {
                    updateMatchUI();
                    showMessage(`Round ${data.round} starting!`, 'info');
                }, 3000);
            }
        });
        
        socket.on('match_ended', (result) => {
            setTimeout(() => {
                showMatchResult(result);
                // Update user coins
                if (currentUser && result.newBalance !== undefined) {
                    currentUser.stats.totalCoins = result.newBalance;
                }
            }, 2000);
        });
        
        socket.on('opponent_disconnected', () => {
            showMessage('Your opponent disconnected. You win by forfeit!', 'success');
            showSection('lobbySection');
            currentMatch = null;
        });
        
        // Join lobby automatically
        setTimeout(() => {
            if (socket) {
                socket.emit('join_lobby');
            }
        }, 500);
        
    } catch (error) {
        console.error('Error initializing multiplayer:', error);
        showMessage('Failed to connect to multiplayer', 'error');
    }
});

function updateOnlinePlayers(players) {
    const container = document.getElementById('onlinePlayers');
    
    if (!players || players.length === 0) {
        container.innerHTML = '<div class="text-slate-400">No other players online</div>';
        return;
    }
    
    const playerHTML = players
        .filter(p => p.username !== currentUser.username)
        .map(player => `
            <div class="px-3 py-1 bg-slate-800/50 rounded-full border border-slate-600/30 text-sm">
                <span class="text-green-400">●</span> ${player.username}
            </div>
        `).join('');
    
    container.innerHTML = playerHTML || '<div class="text-slate-400">No other players online</div>';
}