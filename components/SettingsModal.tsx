import React, { useState, useEffect } from 'react';
import { X, Save, Database, AlertCircle, CheckCircle2, Cloud, FileJson, Download, Trash2, Terminal } from 'lucide-react';
import { StorageConfig } from '../types';
import { getStorageConfig, saveStorageConfig, storageService } from '../services/storage';
import { auditService } from '../services/auditService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onConfigSaved }) => {
  const [config, setConfig] = useState<StorageConfig>({ type: 'local' });
  const [activeTab, setActiveTab] = useState<'storage' | 'audit'>('storage');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getStorageConfig());
      setStatus('idle');
      setMsg('');
      setActiveTab('storage');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setStatus('testing');
    saveStorageConfig(config);

    if (config.type === 'supabase') {
      try {
        // Test connection by fetching
        await storageService.getApps();
        setStatus('success');
        setMsg('Connected to Supabase successfully!');
        
        // Log the config change
        auditService.log('INFO', 'Storage Configuration Updated', { type: 'supabase', url: config.supabaseUrl });
        
        setTimeout(() => {
            onConfigSaved();
            onClose();
        }, 1500);
      } catch (e: any) {
        setStatus('error');
        setMsg(e.message || 'Connection failed. Check permissions.');
        auditService.log('ERROR', 'Storage Configuration Failed', e);
      }
    } else {
      setStatus('success');
      setMsg('Switched to Local Storage.');
      auditService.log('INFO', 'Storage Configuration Updated', { type: 'local' });
      setTimeout(() => {
          onConfigSaved();
          onClose();
      }, 1000);
    }
  };

  const auditSql = `create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  timestamp timestamptz default now(),
  level text,
  action text,
  details jsonb
);

-- Enable RLS
alter table audit_logs enable row level security;

-- Allow public read/write access (using + check for insert)
create policy "Public Access" on audit_logs for all 
using (true) 
with check (true);`;

  const copySql = () => {
      navigator.clipboard.writeText(auditSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 sticky top-0 z-10">
          <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                System Settings
              </h3>
              <div className="flex bg-slate-800 rounded-lg p-1">
                  <button 
                    onClick={() => setActiveTab('storage')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'storage' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                      Storage
                  </button>
                  <button 
                    onClick={() => setActiveTab('audit')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'audit' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                      Audit Logs
                  </button>
              </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {activeTab === 'storage' && (
              <>
                {/* Storage Type Selector */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                    type="button"
                    onClick={() => setConfig({ ...config, type: 'local' })}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                        config.type === 'local' 
                        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                    >
                    <Database className="w-8 h-8" />
                    <div className="text-center">
                        <div className="font-semibold">Browser Storage</div>
                        <div className="text-xs opacity-70">Data stays on this device only.</div>
                    </div>
                    </button>

                    <button
                    type="button"
                    onClick={() => setConfig({ ...config, type: 'supabase' })}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                        config.type === 'supabase' 
                        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                    >
                    <Cloud className="w-8 h-8" />
                    <div className="text-center">
                        <div className="font-semibold">Supabase Cloud</div>
                        <div className="text-xs opacity-70">Sync across devices via Database.</div>
                    </div>
                    </button>
                </div>

                {/* Supabase Config Form */}
                {config.type === 'supabase' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300">
                        <p className="font-semibold text-white mb-2">Setup Instructions:</p>
                        <ol className="list-decimal pl-4 space-y-2 text-slate-400">
                        <li>Create a project at <a href="https://supabase.com" target="_blank" className="text-indigo-400 hover:underline">supabase.com</a></li>
                        <li>
                            Go to <strong>SQL Editor</strong> and run this exact script to create the table and allow access:
                            <pre className="mt-2 bg-slate-950 p-3 rounded-lg text-xs font-mono text-indigo-300 select-all border border-slate-800 overflow-x-auto">
        {`create table if not exists domains (
        id text primary key,
        data jsonb
        );

        -- Enable public access for this simple app
        alter table domains enable row level security;
        create policy "Public Access" on domains for all using (true) with check (true);`}
                            </pre>
                        </li>
                        <li>Copy <strong>Project URL</strong> and <strong>anon public key</strong> from Project Settings &gt; API.</li>
                        </ol>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Project URL</label>
                        <input
                        type="text"
                        value={config.supabaseUrl || ''}
                        onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })}
                        placeholder="https://xyz.supabase.co"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Anon Public Key</label>
                        <input
                        type="password"
                        value={config.supabaseKey || ''}
                        onChange={(e) => setConfig({ ...config, supabaseKey: e.target.value })}
                        placeholder="eyJxh..."
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    </div>
                )}

                {/* Status Messages */}
                {status !== 'idle' && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                        status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                        status === 'error' ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                    }`}>
                        {status === 'success' && <CheckCircle2 className="w-4 h-4" />}
                        {status === 'error' && <AlertCircle className="w-4 h-4" />}
                        {status === 'testing' && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        {msg || (status === 'testing' ? 'Connecting...' : '')}
                    </div>
                )}
            </>
          )}

          {activeTab === 'audit' && (
              <div className="space-y-6">
                  <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
                      <div className="flex items-start gap-4">
                          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                              <FileJson className="w-8 h-8" />
                          </div>
                          <div className="flex-1">
                              <h3 className="text-white font-medium mb-1">Download Error & Audit Logs</h3>
                              <p className="text-sm text-slate-400 mb-4">
                                  Export a JSON file containing the history of errors, logins, and configuration changes for auditing purposes.
                              </p>
                              <div className="flex flex-wrap gap-3">
                                  <button 
                                    onClick={() => auditService.downloadLogs()}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                                  >
                                      <Download className="w-4 h-4" />
                                      Download JSON Log
                                  </button>
                                  {config.type === 'local' && (
                                      <button 
                                        onClick={() => {
                                            if(window.confirm('Clear all local audit logs?')) {
                                                auditService.clearLocalLogs();
                                                setMsg('Local logs cleared.');
                                                setTimeout(() => setMsg(''), 2000);
                                            }
                                        }}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors border border-slate-700"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                          Clear Local Logs
                                      </button>
                                  )}
                              </div>
                              {msg && <p className="text-xs text-emerald-400 mt-2">{msg}</p>}
                          </div>
                      </div>
                  </div>

                  {config.type === 'supabase' && (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-slate-400" />
                            Enable Cloud Auditing
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            To save audit logs to your Supabase cloud database, run this script in your SQL Editor:
                        </p>
                        
                        <div className="relative group">
                            <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-indigo-300 overflow-x-auto border border-slate-800">
                                {auditSql}
                            </pre>
                            <button 
                                onClick={copySql}
                                className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                                title="Copy to clipboard"
                            >
                                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 rotate-0" style={{ transform: 'none' }} />}
                            </button>
                        </div>
                    </div>
                  )}
              </div>
          )}

          {activeTab === 'storage' && (
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-700">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Save & Connect
                </button>
            </div>
          )}
          {activeTab === 'audit' && (
               <div className="pt-4 flex justify-end gap-3 border-t border-slate-700">
               <button
                   onClick={onClose}
                   className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
               >
                   Close
               </button>
           </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;