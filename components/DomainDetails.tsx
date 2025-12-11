import React, { useState, useEffect } from 'react';
import { DomainApp } from '../types';
import { ExternalLink, Calendar, User, Clock, RefreshCw, X, Server, Trash2, Shield, Globe, MapPin, Activity, AlertTriangle, Loader2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { fetchNetworkDetails } from '../services/networkService';

interface DomainDetailsProps {
  app: DomainApp | null;
  onClose: () => void;
  onRefresh: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<DomainApp>) => void;
}

const DomainDetails: React.FC<DomainDetailsProps> = ({ app, onClose, onRefresh, onDelete, onUpdate }) => {
  const [imgError, setImgError] = useState(false);
  const [analyzingNetwork, setAnalyzingNetwork] = useState(false);

  useEffect(() => {
    setImgError(false);
    setAnalyzingNetwork(false);
  }, [app?.id]);

  if (!app) return null;

  const handleNetworkAnalysis = async () => {
    setAnalyzingNetwork(true);
    try {
        const details = await fetchNetworkDetails(app.url);
        onUpdate(app.id, details);
    } catch (e) {
        console.error("Analysis failed", e);
    } finally {
        setAnalyzingNetwork(false);
    }
  };

  // Expiration Logic
  let daysToExpiration = null;
  let isExpiringSoon = false;
  if (app.expiresAt && app.expiresAt !== 'Unknown') {
    const today = new Date();
    const expiry = new Date(app.expiresAt);
    const diffTime = expiry.getTime() - today.getTime();
    daysToExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isExpiringSoon = daysToExpiration < 60; // Warn if less than 60 days
  }

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 pointer-events-none">
        <div className="w-screen max-w-md pointer-events-auto">
          <div className="flex h-full flex-col bg-slate-900 border-l border-slate-700 shadow-2xl">
            {/* Header */}
            <div className="px-6 py-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 flex-shrink-0">
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
                  <div className="overflow-hidden">
                    <h2 className="text-xl font-bold text-white leading-tight truncate">{app.name}</h2>
                    <a href={app.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1 truncate">
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
              
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

              {/* Expiration Warning */}
              {daysToExpiration !== null && (
                 <div className={`rounded-xl p-4 border flex items-start gap-3 ${isExpiringSoon ? 'bg-orange-500/10 border-orange-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                    <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {isExpiringSoon ? <AlertTriangle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className={`font-semibold ${isExpiringSoon ? 'text-orange-200' : 'text-emerald-200'}`}>
                            {isExpiringSoon ? 'Expires Soon' : 'Domain Active'}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            Expires in <span className={`font-mono font-medium ${isExpiringSoon ? 'text-orange-400' : 'text-emerald-400'}`}>{daysToExpiration} days</span> ({app.expiresAt})
                        </p>
                    </div>
                 </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">About</h3>
                <p className="text-slate-300 leading-relaxed text-sm bg-slate-800/30 p-4 rounded-xl border border-slate-700/30">
                  {app.description || "No description provided."}
                </p>
              </div>

              {/* Ownership & Registration Grid */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Ownership & Registration</h3>
                <div className="space-y-3">
                    
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <User className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium uppercase">Owner</p>
                                <p className="text-slate-200 text-sm font-medium">{app.owner || "Unknown"}</p>
                            </div>
                         </div>
                    </div>

                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                <Globe className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium uppercase">Registrar</p>
                                <p className="text-slate-200 text-sm font-medium">{app.registrar || "Unknown"}</p>
                            </div>
                         </div>
                    </div>

                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium uppercase">Registered On</p>
                                <p className="text-slate-200 text-sm font-medium">{app.registrationDate || "Unknown"}</p>
                            </div>
                         </div>
                    </div>
                </div>
              </div>

              {/* Technical / Network Details */}
              <div>
                 <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Network & Hosting</h3>
                    {(!app.ipAddress) && (
                        <button 
                            onClick={handleNetworkAnalysis}
                            disabled={analyzingNetwork}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {analyzingNetwork ? <Loader2 className="w-3 h-3 animate-spin"/> : <Activity className="w-3 h-3" />}
                            Run Analysis
                        </button>
                    )}
                 </div>

                 {app.ipAddress ? (
                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 flex items-start gap-3">
                            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                                <Server className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-400 font-medium uppercase">IP Address</p>
                                <p className="text-slate-200 font-mono mt-1 text-sm">{app.ipAddress}</p>
                                {app.isp && <p className="text-xs text-slate-500 mt-1">{app.isp}</p>}
                            </div>
                        </div>

                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 flex items-start gap-3">
                            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-400 font-medium uppercase">Server Location</p>
                                <p className="text-slate-200 mt-1 text-sm">{app.location || "Unknown"}</p>
                            </div>
                        </div>
                    </div>
                 ) : (
                    <div className="text-center py-6 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
                        <p className="text-slate-500 text-sm">Run analysis to view IP and location data.</p>
                    </div>
                 )}
              </div>

            </div>

            {/* Footer Action */}
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex-shrink-0">
                <a 
                    href={app.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                >
                    Visit Website
                    <ExternalLink className="w-5 h-5" />
                </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainDetails;