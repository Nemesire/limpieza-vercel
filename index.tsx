
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Encapsulamos la inicialización para asegurar que el DOM está listo.
 * Esto previene el error: Uncaught TypeError: Failed to execute 'observe' on 'MutationObserver': 
 * parameter 1 is not of type 'Node'.
 */
const initApp = () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error("Error crítico: No se encontró el elemento raíz 'root'.");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Error durante el renderizado de la aplicación:", error);
  }
};

// Ejecutar cuando el DOM esté completamente construido
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
