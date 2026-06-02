import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Barcode, Box, Clock, Activity } from 'lucide-react';

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
  lastScanTime: string | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    todaysScans: 0,
    uniqueMaterials: 0,
    lastScanTime: null
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      // We will do a single query to fetch the necessary data for calculations
      const { data, error } = await supabase
        .from('scan_logs')
        .select('material_name, scanned_at')
        .order('scanned_at', { ascending: false });

      if (error) {
        console.error('Error fetching stats:', error);
        setIsConnected(false);
        return;
      }

      setIsConnected(true);

      const logs = (data || []) as ScanLog[];
      const totalScans = logs.length;
      
      // Calculate today's scans
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysScans = logs.filter((scan: ScanLog) => {
        if (!scan.scanned_at) return false;
        return new Date(scan.scanned_at) >= today;
      }).length;
      
      // Calculate unique materials
      const uniqueMaterials = new Set(logs.map((scan: ScanLog) => scan.material_name).filter(Boolean)).size;
      
      // Get last scan time
      const lastScanTime = logs.length > 0 ? logs[0].scanned_at : null;

      setStats({
        totalScans,
        todaysScans,
        uniqueMaterials,
        lastScanTime
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up Realtime subscription
    const subscription = supabase
      .channel('public:scan_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scan_logs' }, (payload: any) => {
        console.log('New scan received!', payload);
        // Refresh stats when a new scan arrives
        fetchStats();
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'No scans yet';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Material Management Web Hook</h1>
        <p>Live Barcode Scan Receiver</p>
        <div className="status-badge">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
          {isConnected ? 'Connected to Supabase' : 'Disconnected'}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card animate-fade-in animate-delay-1">
          <div className="stat-icon blue">
            <Barcode size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Scans</div>
            <div className="stat-value">{isLoading ? '...' : stats.totalScans}</div>
            <div className="stat-sub">All time records</div>
          </div>
        </div>

        <div className="stat-card animate-fade-in animate-delay-2">
          <div className="stat-icon green">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Today's Scans</div>
            <div className="stat-value">{isLoading ? '...' : stats.todaysScans}</div>
            <div className="stat-sub">Since midnight</div>
          </div>
        </div>

        <div className="stat-card animate-fade-in animate-delay-3">
          <div className="stat-icon purple">
            <Box size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Unique Materials</div>
            <div className="stat-value">{isLoading ? '...' : stats.uniqueMaterials}</div>
            <div className="stat-sub">Different items scanned</div>
          </div>
        </div>

        <div className="stat-card animate-fade-in animate-delay-3">
          <div className="stat-icon orange">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Last Scan Time</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '6px' }}>
              {isLoading ? '...' : formatDate(stats.lastScanTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
