import { StrictMode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PlayZoneProvider } from './hooks/usePlayZone';
import ErrorBoundary from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PlayZoneProvider>
        <App />
      </PlayZoneProvider>
    </ErrorBoundary>
  </StrictMode>,
);
