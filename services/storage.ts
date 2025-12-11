import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DomainApp, StorageConfig } from '../types';

const STORAGE_KEY = 'cloudkeeper_apps';
const CONFIG_KEY = 'cloudkeeper_config_v2'; 

let supabase: SupabaseClient | null = null;

// --- Helper: Configuration Management ---

export const getStorageConfig = (): StorageConfig => {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  // Default to the provided Supabase configuration
  return { 
    type: 'supabase',
    supabaseUrl: 'https://dnpiwruceodvplatjxyo.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRucGl3cnVjZW9kdnBsYXRqeHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MzExMTAsImV4cCI6MjA4MTAwNzExMH0.bCEIlS9E0UILoWXnoWdMJqnQd34NwKVIZTV7NcP3Vjs'
  };
};

export const saveStorageConfig = (config: StorageConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  // Reset client on config change
  supabase = null; 
};

// --- Helper: Supabase Client Initialization ---

export const getSupabase = () => {
  if (supabase) return supabase;
  
  const config = getStorageConfig();
  if (config.type === 'supabase' && config.supabaseUrl && config.supabaseKey) {
    // Disable auth session persistence for this public/anon data app
    supabase = createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        },
        // Increase global fetch timeout/retries if supported or rely on custom logic
    });
    return supabase;
  }
  return null;
};

// --- Helper: Retry Logic ---

async function withRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>, 
  retries = 3, 
  context = "Operation"
): Promise<T | null> {
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
        try {
            const { data, error } = await operation();
            
            if (!error) return data;

            // Check for specific Supabase/Postgres errors that shouldn't be retried
            // 42P01: Undefined Table
            // 23505: Unique Violation (Conflict)
            if (error.code === '42P01') {
                supabase = null; // Force client reset
                throw new Error("TABLE_MISSING");
            }
            if (error.code === '23505') {
                 // Don't retry unique violations, just throw
                 throw error;
            }

            // If it's a known non-network error, throw immediately
            // But if it IS a network error (often lacks code, or message is "Failed to fetch"), retry.
            const isNetworkError = !error.code || error.message?.includes('fetch') || error.message?.includes('network');
            
            if (!isNetworkError) {
                throw error;
            }

            lastError = error;
            // Exponential backoff
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
            
        } catch (err: any) {
            // If the error is TABLE_MISSING, propagate immediately
            if (err.message === "TABLE_MISSING") throw err;

            // If unexpected JS error (like TypeError: Failed to fetch)
            lastError = err;
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
        }
    }

    // Logging the final failure
    const errorMsg = lastError?.message || (typeof lastError === 'object' ? JSON.stringify(lastError) : String(lastError));
    console.error(`Supabase ${context} failed after ${retries} attempts:`, errorMsg);
    throw lastError;
}

// --- Storage Operations ---

export const storageService = {
  
  async getApps(): Promise<DomainApp[]> {
    const config = getStorageConfig();

    if (config.type === 'supabase') {
      const client = getSupabase();
      if (!client) throw new Error("Supabase not configured");

      return await withRetry<any[]>(
          () => client.from('domains').select('data'),
          3,
          "fetch apps"
      ).then(data => data ? data.map((row: any) => row.data) : []) || [];
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    }
  },

  async addApp(app: DomainApp): Promise<void> {
    const config = getStorageConfig();

    if (config.type === 'supabase') {
      const client = getSupabase();
      if (!client) return;

      await withRetry(
        () => client.from('domains').insert({ id: app.id, data: app }),
        3, 
        "insert app"
      );
    } else {
      const apps = await this.getApps();
      apps.unshift(app);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
    }
  },

  async updateApp(id: string, updates: Partial<DomainApp>): Promise<void> {
    const config = getStorageConfig();
    
    if (config.type === 'supabase') {
      const client = getSupabase();
      if (!client) return;

      // 1. Fetch current
      const currentDataWrapper = await withRetry<any>(
          () => client.from('domains').select('data').eq('id', id).maybeSingle(),
          3,
          "fetch app for update"
      );
      
      if (!currentDataWrapper) return; // App not found

      // 2. Merge
      const updatedApp = { ...currentDataWrapper.data, ...updates };

      // 3. Update
      await withRetry(
          () => client.from('domains').update({ data: updatedApp }).eq('id', id),
          3,
          "update app"
      );

    } else {
      const apps = await this.getApps();
      const newApps = apps.map(app => app.id === id ? { ...app, ...updates } : app);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newApps));
    }
  },

  async deleteApp(id: string): Promise<void> {
    const config = getStorageConfig();

    if (config.type === 'supabase') {
      const client = getSupabase();
      if (!client) return;

      await withRetry(
          () => client.from('domains').delete().eq('id', id),
          3,
          "delete app"
      );
    } else {
      const apps = await this.getApps();
      const newApps = apps.filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newApps));
    }
  },

  async batchUpdateStatus(updates: {id: string, status: DomainApp['status'], lastChecked: number}[]): Promise<void> {
    const config = getStorageConfig();

    if (config.type === 'supabase') {
        const client = getSupabase();
        if (!client) return;
        
        // Parallel updates with individual retries
        await Promise.all(updates.map(u => this.updateApp(u.id, { status: u.status, lastChecked: u.lastChecked })));

    } else {
        const apps = await this.getApps();
        const newApps = apps.map(app => {
            const update = updates.find(u => u.id === app.id);
            return update ? { ...app, ...update } : app;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newApps));
    }
  },

  async importData(newApps: DomainApp[]): Promise<void> {
    if (!newApps || !Array.isArray(newApps) || newApps.length === 0) return;

    const config = getStorageConfig();

    if (config.type === 'supabase') {
        const client = getSupabase();
        if (!client) throw new Error("Supabase not configured");

        const rows = newApps.map(app => ({
            id: app.id,
            data: app
        }));

        await withRetry(
            () => client.from('domains').upsert(rows, { onConflict: 'id' }),
            3,
            "import data"
        );

    } else {
        const existing = await this.getApps();
        const existingMap = new Map(existing.map(app => [app.id, app]));
        newApps.forEach(app => {
            existingMap.set(app.id, app);
        });
        const merged = Array.from(existingMap.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  }
};