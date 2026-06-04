import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, List, Webhook, AlertTriangle, X, Bell } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ScanLogs from './pages/ScanLogs';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import type { ScanLog } from './pages/ScanLogs';

// Base64 generic short notification 'ding' sound
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; 

function App() {
  const [latestScan, setLatestScan] = useState<ScanLog | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastTimer, setToastTimer] = useState<number | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const audio = new Audio(NOTIFICATION_SOUND);
    
    const subscription = supabase
      .channel('global_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scan_logs' }, (payload: any) => {
        const newLog = payload.new as ScanLog;
        
        setLatestScan(newLog);
        setShowToast(true);
        
        // Attempt to play sound (may be blocked by browser policy until user interacts)
        audio.play().catch(e => console.log('Audio play blocked:', e));

        // Auto-hide toast after 5 seconds
        if (toastTimer) clearTimeout(toastTimer);
        const timer = window.setTimeout(() => setShowToast(false), 5000);
        setToastTimer(timer);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, [toastTimer]);

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
            <span>Overview</span>
          </NavLink>
          <NavLink 
            to="/scan-logs" 
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
          <Route path="/scan-logs" element={<ScanLogs />} />
          <Route path="/logs" element={<Navigate to="/scan-logs" replace />} />
        </Routes>
      </main>

      {/* Global Toast Notification */}
      {showToast && latestScan && (
        <div className="toast-notification animate-fade-in" style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          background: 'rgba(22, 26, 36, 0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(59, 130, 246, 0.5)', borderRadius: '12px',
          padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: '50%', color: '#60a5fa' }}>
            <Bell size={24} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h4 style={{ margin: '0 0 4px', color: '#60a5fa', fontSize: '1rem' }}>New Scan Received</h4>
            <p style={{ margin: '0 0 2px', fontSize: '0.95rem', fontWeight: 600 }}>{latestScan.material_name || 'Unknown Material'}</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              {latestScan.quantity_kg ? `${latestScan.quantity_kg} KG` : 'No Quantity'} • {latestScan.barcode_no}
            </p>
          </div>
          <button onClick={() => setShowToast(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
