import React, { useState, useEffect } from 'react';
import { LayoutGrid, Plus, Search, Trash2, Command, Settings, AlertTriangle, RefreshCw, Database, Terminal, Copy, Check, LogOut } from 'lucide-react';
import { DomainApp } from './types';
import AddDomainModal from './components/AddDomainModal';
import DomainDetails from './components/DomainDetails';
import StatusBadge from './components/StatusBadge';
import SettingsModal from './components/SettingsModal';
import Login from './components/Login';
import { fetchDomainMetadata } from './services/geminiService';
import { checkStatus } from './services/statusService';
import { storageService } from './services/storage';
import { authService } from './services/auth';
import { auditService } from './services/auditService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apps, setApps] = useState<DomainApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Auth Check
  useEffect(() => {
    const isAuth = authService.isAuthenticated();
    setIsAuthenticated(isAuth);
    if (isAuth) {
        loadApps();
    } else {
        setIsLoading(false);
    }
  }, []);

  const loadApps = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
        const data = await storageService.getApps();
        setApps(data);
    } catch (e: any) {
        if (e.message === "TABLE_MISSING") {
             setLoadError("TABLE_MISSING");
             auditService.log('WARN', 'Apps Load Failed - Table Missing', {});
        } else {
             console.error("Failed to load apps", e);
             setLoadError(e.message || "Could not connect to database.");
             auditService.log('ERROR', 'Apps Load Failed', e);
        }
    } finally {
        setIsLoading(false);
    }
  };

  // Periodic Status Check (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated || apps.length === 0) return;

    const interval = setInterval(async () => {
      // 1. Mark in UI
      setApps(prev => prev.map(a => ({ ...a, status: 'checking' })));
      
      // 2. Check all
      const updates: {id: string, status: DomainApp['status'], lastChecked: number}[] = [];
      
      await Promise.all(apps.map(async (app) => {
        const status = await checkStatus(app.url);
        updates.push({ id: app.id, status, lastChecked: Date.now() });
      }));

      // 3. Save to DB/Local
      await storageService.batchUpdateStatus(updates);

      // 4. Update UI
      setApps(prev => prev.map(a => {
        const u = updates.find(update => update.id === a.id);
        return u ? { ...a, ...u } : a;
      }));

    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [apps.length, isAuthenticated]); 

  const handleLogin = () => {
      setIsAuthenticated(true);
      loadApps();
      auditService.log('INFO', 'User Logged In');
  };

  const handleLogout = () => {
      authService.logout();
      setIsAuthenticated(false);
      setApps([]);
      auditService.log('INFO', 'User Logged Out');
  };

  const handleAddDomain = async (url: string) => {
    auditService.log('INFO', 'Adding Domain', { url });
    const id = crypto.randomUUID();
    const hostname = new URL(url).hostname;
    const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${url}`;
    
    const newApp: DomainApp = {
      id,
      url,
      name: hostname,
      status: 'checking',
      lastChecked: Date.now(),
      favicon: faviconUrl,
      owner: 'Fetching...',
      registrationDate: 'Fetching...',
      description: 'Analyzing with Gemini...',
    };

    // 1. Optimistic UI update
    setApps(prev => [newApp, ...prev]);

    // 2. Persist initial state
    try {
        await storageService.addApp(newApp);
    } catch (e: any) {
        if (e.message === "TABLE_MISSING") {
             setLoadError("TABLE_MISSING");
             return;
        }
        console.error(e);
        auditService.log('ERROR', 'Add Domain Persistence Failed', e);
    }

    // 3. Async fetch metadata & status
    try {
      const metadata = await fetchDomainMetadata(url);
      const status = await checkStatus(url);
      
      const fullApp = {
        ...newApp,
        ...metadata,
        status,
        lastChecked: Date.now()
      };

      // 4. Update DB
      await storageService.updateApp(id, fullApp);

      // 5. Update UI
      setApps(prev => prev.map(app => app.id === id ? fullApp : app));
      auditService.log('INFO', 'Domain Added Successfully', { id, name: fullApp.name });
      
    } catch (error) {
      console.error("Failed to setup new domain fully", error);
      auditService.log('ERROR', 'Domain Analysis Failed', { url, error });
    }
  };

  const refreshStatus = async (id: string) => {
    setApps(prev => prev.map(app => 
        app.id === id ? { ...app, status: 'checking' } : app
    ));

    const app = apps.find(a => a.id === id);
    if (!app) return;

    const status = await checkStatus(app.url);
    const updates = { status, lastChecked: Date.now() };

    await storageService.updateApp(id, updates);
    
    setApps(prev => prev.map(a => 
        a.id === id ? { ...a, ...updates } : a
    ));
    auditService.log('INFO', 'Manual Status Refresh', { id, status });
  };

  const updateApp = async (id: string, data: Partial<DomainApp>) => {
    // Optimistic
    setApps(prev => prev.map(app => 
        app.id === id ? { ...app, ...data } : app
    ));
    // Persist
    await storageService.updateApp(id, data);
    auditService.log('INFO', 'App Updated', { id, fields: Object.keys(data) });
  };

  const deleteApp = async (id: string) => {
    if(window.confirm('Are you sure you want to remove this domain from your dashboard?')) {
        // Optimistic
        setApps(prev => prev.filter(a => a.id !== id));
        if (selectedAppId === id) setSelectedAppId(null);
        // Persist
        await storageService.deleteApp(id);
        auditService.log('INFO', 'Domain Deleted', { id });
    }
  };

  const handleCardDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteApp(id);
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    app.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedApp = apps.find(a => a.id === selectedAppId) || null;

  // --- LOGIN GATE ---
  if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
  }

  // --- DATABASE SETUP SCREEN (DOMAINS TABLE) ---
  if (loadError === "TABLE_MISSING") {
      const sqlScript = `create table if not exists domains (
  id text primary key,
  data jsonb
);

-- Enable public access for this simple app
alter table domains enable row level security;
create policy "Public Access" on domains for all using (true) with check (true);`;

      return (
          <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-4">
              <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-indigo-600/20 rounded-xl">
                          <Database className="w-8 h-8 text-indigo-400" />
                      </div>
                      <div>
                          <h1 className="text-2xl font-bold text-white">Initialize Database</h1>
                          <p className="text-slate-400">One final step to setup your cloud storage.</p>
                      </div>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                              <Terminal className="w-4 h-4 text-slate-400" />
                              Run this SQL Script
                          </h3>
                          <p className="text-sm text-slate-400 mb-4">
                              Go to your Supabase <strong>SQL Editor</strong> and run the following command to create the required table:
                          </p>
                          
                          <div className="relative group">
                              <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-indigo-300 overflow-x-auto border border-slate-800">
                                  {sqlScript}
                              </pre>
                              <button 
                                  onClick={() => copyToClipboard(sqlScript)}
                                  className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                                  title="Copy to clipboard"
                              >
                                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                           <button 
                                onClick={() => setIsSettingsOpen(true)}
                                className="text-slate-400 hover:text-white text-sm"
                           >
                               Check Settings
                           </button>
                           <button 
                                onClick={loadApps}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                           >
                               <RefreshCw className="w-4 h-4" />
                               I've Run the Script, Retry
                           </button>
                      </div>
                  </div>
              </div>
              
              <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onConfigSaved={loadApps}
              />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                CloudKeeper
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Settings & Storage"
                >
                    <Settings className="w-5 h-5" />
                </button>
                <button
                    onClick={handleLogout}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-slate-800 mx-1"></div>
                <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 hover:scale-105"
                >
                <Plus className="w-4 h-4" />
                Add Service
                </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search & Filter */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-colors"
              placeholder="Search your domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500">
            Monitoring <span className="text-indigo-400 font-semibold">{apps.length}</span> services
          </div>
        </div>

        {/* Error State */}
        {loadError ? (
            <div className="flex flex-col items-center justify-center py-20 bg-red-900/10 border border-red-500/20 rounded-2xl">
                <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                <h3 className="text-lg font-bold text-red-300 mb-2">Connection Failed</h3>
                <p className="text-red-200/60 mb-6 text-center max-w-md break-words px-4">{loadError}</p>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setLoadError(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                    >
                        Ignore & Continue
                    </button>
                    <button 
                        onClick={loadApps}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        ) : isLoading ? (
             <div className="flex items-center justify-center py-20">
                 <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-slate-500 animate-pulse">Loading dashboard...</p>
                 </div>
             </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
              {apps.length === 0 ? <Command className="w-8 h-8 text-slate-500" /> : <Search className="w-8 h-8 text-slate-500" />}
            </div>
            <h3 className="text-lg font-medium text-white mb-1">
                {apps.length === 0 ? "No services monitored" : "No results found"}
            </h3>
            <p className="text-slate-400 max-w-sm mx-auto mb-6">
                {apps.length === 0 ? "Add your first domain or application to start monitoring its status and details." : "Try adjusting your search query."}
            </p>
            {apps.length === 0 && (
                <button 
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium"
                >
                <Plus className="w-4 h-4" />
                Add your first service
                </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => (
              <div 
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                className="group relative bg-slate-900 rounded-2xl border border-slate-800 hover:border-indigo-500/50 shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button 
                        type="button"
                        onClick={(e) => handleCardDelete(app.id, e)}
                        className="p-1.5 bg-slate-800/80 rounded-md text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors shadow-sm"
                        title="Remove"
                    >
                        <Trash2 className="w-4 h-4 pointer-events-none" />
                    </button>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 p-1 flex items-center justify-center overflow-hidden border border-slate-700">
                        {app.favicon ? (
                             <img 
                             src={app.favicon} 
                             alt="" 
                             className="w-full h-full object-contain"
                             onError={(e) => {
                                 (e.target as HTMLImageElement).style.display = 'none';
                             }}
                            />
                        ) : (
                            <span className="text-lg font-bold text-slate-400">{app.name[0]}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors truncate max-w-[150px]">
                            {app.name}
                        </h3>
                        <p className="text-xs text-slate-500 truncate max-w-[150px]">
                            {new URL(app.url).hostname}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 line-clamp-2 mb-6 min-h-[40px]">
                    {app.description}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <StatusBadge status={app.status} />
                    <button 
                        type="button"
                        className="text-xs font-medium text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-wide"
                    >
                        View Details &rarr;
                    </button>
                  </div>
                </div>
                
                {/* Decorative gradient glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddDomainModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddDomain} 
      />
      
      <DomainDetails 
        app={selectedApp} 
        onClose={() => setSelectedAppId(null)} 
        onRefresh={refreshStatus}
        onDelete={deleteApp}
        onUpdate={updateApp}
      />
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={loadApps}
      />

    </div>
  );
}

export default App;