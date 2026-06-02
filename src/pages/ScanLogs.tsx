import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Search, Inbox } from 'lucide-react';

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

const safeText = (value: unknown): string => String(value ?? '').toLowerCase();

export default function ScanLogs() {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ScanLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Unique materials for filter dropdown
  const [materials, setMaterials] = useState<string[]>([]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('scan_logs')
        .select('*')
        .order('scanned_at', { ascending: false });

      if (error) {
        console.error('Error fetching logs:', error);
        return;
      }

      const logsData = (data || []) as ScanLog[];
      setLogs(logsData);
      
      // Extract unique materials
      const uniqueMaterials: string[] = Array.from(
        new Set(logsData.map((log: ScanLog) => log.material_name).filter(Boolean))
      ) as string[];
      setMaterials(uniqueMaterials);
      
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const subscription = supabase
      .channel('public:scan_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scan_logs' }, (payload: any) => {
        // Prepend new row to the logs list
        const newLog = payload.new as ScanLog;
        setLogs(prev => [newLog, ...prev]);
        
        // Update unique materials if it's a new one
        setMaterials(prev => {
          const matName = newLog.material_name;
          if (matName && !prev.includes(matName)) {
            return [...prev, matName];
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Apply filters
  useEffect(() => {
    let result = logs;

    if (searchTerm) {
      const lowerSearch = safeText(searchTerm);
      result = result.filter(log => 
        safeText(log.barcode_no).includes(lowerSearch) ||
        safeText(log.vendor_name).includes(lowerSearch)
      );
    }

    if (materialFilter) {
      result = result.filter(log => log.material_name === materialFilter);
    }

    if (dateFilter) {
      result = result.filter(log => (log.scanned_at || '').startsWith(dateFilter));
    }

    setFilteredLogs(result);
  }, [logs, searchTerm, materialFilter, dateFilter]);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, { 
      year: 'numeric',
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

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ alignItems: 'flex-start', textAlign: 'left', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem' }}>Scan Logs</h1>
        <p>View and filter barcode scan history</p>
      </div>

      <div className="table-container animate-fade-in animate-delay-1">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search barcode or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="table-actions">
            <select 
              className="search-input" 
              style={{ paddingLeft: '16px', width: 'auto', minWidth: '150px' }}
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
            >
              <option value="">All Materials</option>
              {materials.map(mat => (
                <option key={mat} value={mat}>{mat}</option>
              ))}
            </select>

            <input 
              type="date" 
              className="search-input"
              style={{ paddingLeft: '16px', width: 'auto' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />

            <button className="btn btn-secondary" onClick={fetchLogs} disabled={isLoading}>
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Barcode</th>
                <th>Material</th>
                <th>Batch</th>
                <th>Vendor</th>
                <th>Quantity (kg)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.scanned_at)}</td>
                  <td style={{ fontWeight: 600 }}>{log.barcode_no}</td>
                  <td>{log.material_name}</td>
                  <td>{log.batch_no || '-'}</td>
                  <td>{log.vendor_name || '-'}</td>
                  <td>{log.quantity_kg ? `${log.quantity_kg} kg` : '-'}</td>
                  <td>
                    <span className={getStatusTag(log.status)}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && !isLoading && (
            <div className="empty-state">
              <Inbox className="empty-state-icon" />
              <h3>No scan records found</h3>
              <p>Try adjusting your filters or wait for new scans to arrive.</p>
            </div>
          )}

          {isLoading && logs.length === 0 && (
            <div className="empty-state">
              <RefreshCw className="empty-state-icon animate-spin" />
              <h3>Loading data...</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
