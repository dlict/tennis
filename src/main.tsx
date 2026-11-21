import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register service worker in both production and development for PWA installability on Android / S24 Ultra / iOS
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('New content available, reload to update.');
      },
      onOfflineReady() {
        console.log('App ready to work offline.');
      },
    });
  } else {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('Dev SW registration skipped:', err);
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
