import React, { useState, useEffect } from 'react';
import { DomainApp } from '../types';
import { ExternalLink, Calendar, User, Clock, RefreshCw, X, Server, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface DomainDetailsProps {
  app: DomainApp | null;
  onClose: () => void;
  onRefresh: (id: string) => void;
  onDelete: (id: string) => void;
}

const DomainDetails: React.FC<DomainDetailsProps> = ({ app, onClose, onRefresh, onDelete }) => {
  const [imgError, setImgError] = useState(false);

  // Reset error state when app changes
  useEffect(() => {
    setImgError(false);
  }, [app?.id]);

  if (!app) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
        <div className="w-screen max-w-md pointer-events-auto">
          <div className="flex h-full flex-col overflow-y-scroll bg-slate-900 border-l border-slate-700 shadow-2xl">
            {/* Header */}
            <div className="px-6 py-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    {!imgError && app.favicon ? (
                         <img 
                         src={app.favicon} 
                         alt={`${app.name} favicon`}
                         className="w-12 h-12 rounded-xl bg-slate-800 p-1 object-contain border border-slate-700" 
                         onError={() => setImgError(true)}
                       />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 font-bold text-xl">
                            {app.name.substring(0, 1).toUpperCase()}
                        </div>
                    )}
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">{app.name}</h2>
                    <a href={app.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1">
                      {new URL(app.url).hostname}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                    onClick={() => onDelete(app.id)}
                    className="p-2 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:outline-none transition-colors"
                    title="Remove Service"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                    onClick={onClose}
                    className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none transition-colors"
                    >
                    <span className="sr-only">Close panel</span>
                    <X className="w-6 h-6" />
                    </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-6 space-y-8">
              
              {/* Status Section */}
              <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Current Status</h3>
                  <button 
                    onClick={() => onRefresh(app.id)}
                    className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                    title="Refresh Status"
                  >
                    <RefreshCw className={`w-4 h-4 ${app.status === 'checking' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                    <StatusBadge status={app.status} className="scale-125 origin-left" />
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last checked: {new Date(app.lastChecked).toLocaleTimeString()}
                    </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">About</h3>
                <p className="text-slate-300 leading-relaxed text-sm bg-slate-800/30 p-4 rounded-xl border border-slate-700/30">
                  {app.description || "No description provided."}
                </p>
              </div>

              {/* Details Grid */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Domain Intelligence</h3>
                <div className="grid grid-cols-1 gap-4">
                    
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 flex items-start gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Owner / Registrar</p>
                            <p className="text-slate-200 font-medium mt-1">{app.owner || "Unknown"}</p>
                        </div>
                    </div>

                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 flex items-start gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Registration Date</p>
                            <p className="text-slate-200 font-medium mt-1">{app.registrationDate || "Unknown"}</p>
                        </div>
                    </div>

                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 flex items-start gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                            <Server className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Service Type</p>
                            <p className="text-slate-200 font-medium mt-1">Web Application / Website</p>
                        </div>
                    </div>

                </div>
              </div>

              <div className="pt-6">
                <a 
                    href={app.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                >
                    Visit Website
                    <ExternalLink className="w-5 h-5" />
                </a>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainDetails;