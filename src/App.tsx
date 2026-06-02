import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, List, Webhook, AlertTriangle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ScanLogs from './pages/ScanLogs';
import { isSupabaseConfigured } from './lib/supabase';

function App() {
  if (!isSupabaseConfigured) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0b0d12', color: '#f0f2f5' }}>
        <AlertTriangle size={64} color="#f59e0b" style={{ marginBottom: '16px' }} />
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Supabase is not configured</h1>
        <p style={{ color: '#94a3b8', maxWidth: '400px', textAlign: 'center' }}>
          Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Webhook size={28} color="#60a5fa" />
          <h2>Webhook Receiver</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink 
            to="/logs" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <List size={20} />
            <span>Scan Logs</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/logs" element={<ScanLogs />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
