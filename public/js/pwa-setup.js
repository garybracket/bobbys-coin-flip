// PWA Setup Script - Add manifest and service worker to all pages
// Automatically adds PWA meta tags and registers service worker

document.addEventListener('DOMContentLoaded', function() {
    // Add PWA meta tags if not already present
    if (!document.querySelector('link[rel="manifest"]')) {
        const head = document.head;
        
        // Manifest
        const manifest = document.createElement('link');
        manifest.rel = 'manifest';
        manifest.href = '/manifest.json';
        head.appendChild(manifest);
        
        // Theme color
        const themeColor = document.createElement('meta');
        themeColor.name = 'theme-color';
        themeColor.content = '#3b82f6';
        head.appendChild(themeColor);
        
        // Apple PWA tags
        const appleCapable = document.createElement('meta');
        appleCapable.name = 'apple-mobile-web-app-capable';
        appleCapable.content = 'yes';
        head.appendChild(appleCapable);
        
        const appleStatus = document.createElement('meta');
        appleStatus.name = 'apple-mobile-web-app-status-bar-style';
        appleStatus.content = 'default';
        head.appendChild(appleStatus);
        
        const appleTitle = document.createElement('meta');
        appleTitle.name = 'apple-mobile-web-app-title';
        appleTitle.content = "Bobby's Coin Flip";
        head.appendChild(appleTitle);
        
        const appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.href = '/icons/icon-192.png';
        head.appendChild(appleIcon);
    }
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                
                console.log('PWA: Service Worker registered successfully');
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Show update available notification
                            if (confirm('New version available! Reload to update?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
                
            } catch (error) {
                console.error('PWA: Service Worker registration failed:', error);
            }
        });
    }
});

// Add install prompt handling
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA: Install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install button if you have one
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('PWA: Install outcome:', outcome);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }
});

// Detect if app was installed
window.addEventListener('appinstalled', () => {
    console.log('PWA: App was installed successfully');
    deferredPrompt = null;
    
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
});