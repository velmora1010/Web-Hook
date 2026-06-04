import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Barcode, Box, Clock, Activity, History, Package, AlertCircle } from 'lucide-react';

export interface ScanLog {
  id: string;
  barcode_no: string | null;
  material_name: string | null;
  batch_no: number | null;
  vendor_name: string | null;
  quantity_kg: number | null;
  status: string | null;
  scanned_at: string | null;
  created_at: string | null;
  payload?: any;
}

interface DashboardStats {
  totalScans: number;
  todaysScans: number;
  uniqueMaterials: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    todaysScans: 0,
    uniqueMaterials: 0,
  });
  const [recentLogs, setRecentLogs] = useState<ScanLog[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("scan_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching data:", error);
        setIsConnected(false);
        return;
      }

      setIsConnected(true);

      const logs = (data || []) as ScanLog[];
      setRecentLogs(logs);

      const totalScans = logs.length;
      
      // Calculate today's scans
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysScans = logs.filter((scan: ScanLog) => {
        const scanDateStr = scan.created_at || scan.scanned_at;
        if (!scanDateStr) return false;
        return new Date(scanDateStr) >= today;
      }).length;
      
      // Calculate unique materials
      const uniqueMaterials = new Set(logs.map((scan: ScanLog) => scan.material_name).filter(Boolean)).size;
      
      setStats({
        totalScans,
        todaysScans,
        uniqueMaterials,
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up Realtime subscription for Dashboard
    const subscription = supabase
      .channel("scan_logs_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scan_logs"
        },
        (payload) => {
          console.log("New scan received:", payload.new);
          // Auto refresh stats and lists
          fetchData();
        }
      )
      .subscribe((status: string) => {
        console.log("Realtime status:", status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          // Try to reconnect? Supabase client automatically tries to reconnect, but we can flag UI
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusTag = (status: string | null) => {
    if (!status) return 'tag tag-default';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('in')) return 'tag tag-success';
    if (lowerStatus.includes('out') || lowerStatus.includes('pending')) return 'tag tag-warning';
    return 'tag tag-default';
  };

  const latestScan = recentLogs.length > 0 ? recentLogs[0] : null;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ textAlign: 'left' }}>
          <h1>Dashboard Overview</h1>
          <p>Live Barcode Scan Receiver</p>
        </div>
        <div className="status-badge" style={{ marginTop: 0 }}>
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
          {isConnected ? 'Connected to Realtime' : 'Realtime Connection Lost'}
        </div>
      </div>

      {!isConnected && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#fca5a5' }}>
          <AlertCircle size={20} />
          <span>Realtime Connection Lost. Attempting to reconnect...</span>
        </div>
      )}

      {/* Latest Scan Card */}
      {latestScan && (
        <div className="stat-card animate-fade-in" style={{ marginBottom: '24px', flexDirection: 'column', gap: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', width: '100%' }}>
            <div className="stat-icon green" style={{ width: '40px', height: '40px' }}><Package size={20} /></div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#34d399' }}>Latest Scan</h3>
            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatDate(latestScan.scanned_at)}</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', width: '100%' }}>
            <div>
              <div className="stat-sub">Material Name</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{latestScan.material_name || '-'}</div>
            </div>
            <div>
              <div className="stat-sub">Barcode No</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{latestScan.barcode_no || '-'}</div>
            </div>
            <div>
              <div className="stat-sub">Quantity</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{latestScan.quantity_kg ? `${latestScan.quantity_kg} kg` : '-'}</div>
            </div>
            <div>
              <div className="stat-sub">Batch No</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{latestScan.batch_no || '-'}</div>
            </div>
            <div>
              <div className="stat-sub">Vendor Name</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{latestScan.vendor_name || '-'}</div>
            </div>
            <div>
              <div className="stat-sub">Status</div>
              <div style={{ marginTop: '4px' }}><span className={getStatusTag(latestScan.status)}>{latestScan.status}</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card animate-fade-in animate-delay-1">
          <div className="stat-icon blue">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Scans Today</div>
            <div className="stat-value">{isLoading ? '...' : stats.todaysScans}</div>
          </div>
        </div>

        <div className="stat-card animate-fade-in animate-delay-2">
          <div className="stat-icon purple">
            <Barcode size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Scans Overall</div>
            <div className="stat-value">{isLoading ? '...' : stats.totalScans}</div>
          </div>
        </div>

        <div className="stat-card animate-fade-in animate-delay-3">
          <div className="stat-icon orange">
            <Box size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Unique Materials</div>
            <div className="stat-value">{isLoading ? '...' : stats.uniqueMaterials}</div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="stat-card animate-fade-in animate-delay-3" style={{ flexDirection: 'column', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <History size={20} color="var(--text-secondary)" />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recent Activity Feed</h3>
        </div>
        
        {isLoading && recentLogs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading activity...</p>
        ) : recentLogs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No scan activity yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {recentLogs.slice(0, 5).map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{log.material_name || 'Unknown Material'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.barcode_no} • {log.quantity_kg ? `${log.quantity_kg} kg` : 'No qty'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={getStatusTag(log.status)} style={{ marginBottom: '4px' }}>{log.status}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(log.scanned_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
