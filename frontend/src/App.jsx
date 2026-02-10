import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ViewContent from './pages/ViewContent';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col items-center pt-20 px-4">
        <h1 className="text-4xl font-bold mb-8 text-blue-500 tracking-tighter">
          LinkVault 🔒
        </h1>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:id" element={<ViewContent />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;