import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AdminPortal } from './pages/Admin/AdminPortal.tsx';
import { CartProvider } from './context/CartContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Auto-update and reload on service worker controllerchange
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.update().catch(() => {});
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

function RootApp() {
  const [isAdminRoute, setIsAdminRoute] = useState(() => {
    return window.location.pathname.startsWith('/admin');
  });

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (isAdminRoute) {
    return (
      <ErrorBoundary>
        <AdminPortal />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <CartProvider>
        <App />
      </CartProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);



