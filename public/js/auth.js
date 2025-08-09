// Authentication JavaScript

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

function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    
    const tabs = document.querySelectorAll('.tab-btn');
    tabs[0].className = 'tab-btn flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 bg-blue-600 text-white';
    tabs[1].className = 'tab-btn flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white';
}

function showRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    
    const tabs = document.querySelectorAll('.tab-btn');
    tabs[0].className = 'tab-btn flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white';
    tabs[1].className = 'tab-btn flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 bg-blue-600 text-white';
}

async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/game';
            }, 1000);
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('An error occurred. Please try again.', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    if (!data.username || !data.password) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }
    
    if (data.password.length < 6) {
        showMessage('Password must be at least 6 characters long.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Account created successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/game';
            }, 1000);
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('An error occurred. Please try again.', 'error');
    }
}

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/user');
        const result = await response.json();
        
        if (result.success) {
            // User is already logged in, redirect to game
            window.location.href = '/game';
        }
    } catch (error) {
        // User not logged in, stay on login page
    }
});