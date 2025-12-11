import { getSupabase, getStorageConfig } from './storage';
import { AuditLogEntry } from '../types';

const LOG_STORAGE_KEY = 'cloudkeeper_audit_logs';

export const auditService = {
  /**
   * Logs an event or error to the configured storage (Supabase or LocalStorage).
   */
  async log(level: AuditLogEntry['level'], action: string, details?: any) {
    // Generate Entry
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      action,
      details: details instanceof Error ? { message: details.message, stack: details.stack } : details
    };

    // 1. Console log for immediate debugging
    const logFn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    logFn(`[Audit/${level}] ${action}`, details || '');

    // 2. Persist
    const config = getStorageConfig();

    if (config.type === 'supabase') {
      const supabase = getSupabase();
      if (supabase) {
        // Fire and forget - don't await strictly to avoid blocking UI
        // We use 'audit_logs' table. If it doesn't exist, this will fail silently in the background (logged to console).
        supabase.from('audit_logs').insert({
          level: entry.level,
          action: entry.action,
          details: entry.details, 
          timestamp: entry.timestamp
        }).then(({ error }) => {
          if (error) {
              // If table missing, fallback to local so we don't lose the log about the missing table
              if (error.code === '42P01') {
                  this.saveToLocal(entry);
              } else {
                  console.error("Failed to push audit log to Supabase:", error);
              }
          }
        });
      }
    } else {
      this.saveToLocal(entry);
    }
  },

  saveToLocal(entry: AuditLogEntry) {
      try {
        const existing = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
        // Keep last 1000 logs locally to prevent quota issues
        const updated = [entry, ...existing].slice(0, 1000);
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save local audit log", e);
      }
  },

  async getLogs(): Promise<AuditLogEntry[]> {
    const config = getStorageConfig();
    if (config.type === 'supabase') {
      const supabase = getSupabase();
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);
        
      if (error) {
        // Fallback to local if remote fails (e.g. table not created yet)
        console.warn("Could not fetch remote logs, falling back to local cache.");
        return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
      }
      return data || [];
    } else {
      return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    }
  },

  async downloadLogs() {
    try {
        const logs = await this.getLogs();
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cloudkeeper-audit-log-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Failed to download logs", e);
        alert("Failed to generate log file.");
    }
  },
  
  clearLocalLogs() {
      localStorage.removeItem(LOG_STORAGE_KEY);
  }
};