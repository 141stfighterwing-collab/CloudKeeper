import React, { useState, useEffect } from 'react';
import { LayoutGrid, Plus, Search, Trash2, Command } from 'lucide-react';
import { DomainApp } from './types';
import AddDomainModal from './components/AddDomainModal';
import DomainDetails from './components/DomainDetails';
import StatusBadge from './components/StatusBadge';
import { fetchDomainMetadata } from './services/geminiService';
import { checkStatus } from './services/statusService';

function App() {
  const [apps, setApps] = useState<DomainApp[]>(() => {
    const saved = localStorage.getItem('cloudkeeper_apps');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('cloudkeeper_apps', JSON.stringify(apps));
  }, [apps]);

  // Periodic Status Check (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      apps.forEach(app => refreshStatus(app.id));
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apps]);

  const handleAddDomain = async (url: string) => {
    const id = crypto.randomUUID();
    const hostname = new URL(url).hostname;
    const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${url}`;
    
    // Initial optimistic add
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

    setApps(prev => [newApp, ...prev]);

    // Async fetch metadata
    try {
      const metadata = await fetchDomainMetadata(url);
      const status = await checkStatus(url);
      
      setApps(prev => prev.map(app => {
        if (app.id === id) {
          return {
            ...app,
            ...metadata,
            status,
            lastChecked: Date.now()
          };
        }
        return app;
      }));
    } catch (error) {
      console.error("Failed to setup new domain fully", error);
    }
  };

  const refreshStatus = async (id: string) => {
    setApps(prev => prev.map(app => 
        app.id === id ? { ...app, status: 'checking' } : app
    ));

    const app = apps.find(a => a.id === id);
    if (!app) return;

    const status = await checkStatus(app.url);
    
    setApps(prev => prev.map(a => 
        a.id === id ? { ...a, status, lastChecked: Date.now() } : a
    ));
  };

  const updateApp = (id: string, data: Partial<DomainApp>) => {
    setApps(prev => prev.map(app => 
        app.id === id ? { ...app, ...data } : app
    ));
  };

  const deleteApp = (id: string) => {
    if(window.confirm('Are you sure you want to remove this domain from your dashboard?')) {
        setApps(prev => prev.filter(a => a.id !== id));
        if (selectedAppId === id) setSelectedAppId(null);
    }
  };

  const handleCardDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteApp(id);
  }

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    app.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedApp = apps.find(a => a.id === selectedAppId) || null;

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
            
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
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

        {/* Grid */}
        {filteredApps.length === 0 ? (
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
      
    </div>
  );
}

export default App;