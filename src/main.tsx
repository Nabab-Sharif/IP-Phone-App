import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✓ Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch((error) => {
        console.error('✗ Service Worker registration failed:', error);
      });
  });
}

// Listen for beforeinstallprompt event
let deferredPrompt: any;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('✓ Install prompt is ready');
});

window.addEventListener('appinstalled', () => {
  console.log('✓ PWA was installed');
  deferredPrompt = null;
});

createRoot(document.getElementById("root")!).render(<App />);
