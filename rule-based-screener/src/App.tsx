import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import JobsPage from './pages/JobsPage';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';
import ResumeDetailPage from './pages/ResumeDetailPage';
import { useAppStore } from './store';
import './index.css';

export default function App() {
  const { loadData } = useAppStore();

  useEffect(() => {
    loadData();
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/jobs" replace />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/results/:jdId" element={<ResultsPage />} />
            <Route path="/resume/:id" element={<ResumeDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
