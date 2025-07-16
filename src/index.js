import React from 'react';
import { createRoot } from 'react-dom/client';
import SyncProgress from './components/SyncProgress';

const App = () => {
  // In a real application, this ID would come from user selection, URL, etc.
  const companyFileId = "a782b429-a141-48c3-a434-fce50353d671"; // Replace with a valid GUID

  return (
    <div>
      <SyncProgress companyFileId={companyFileId} />
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);