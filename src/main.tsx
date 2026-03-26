import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { APIProvider } from '@vis.gl/react-google-maps';
import './index.css';
import App from './App';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <APIProvider apiKey={apiKey} libraries={['places', 'geometry']}>
      <App />
    </APIProvider>
  </StrictMode>
);
