import React, { useState } from 'react';
import { LayoutGrid, Lock, ArrowRight, AlertCircle, User, Loader2, Copy, Check, Database, Terminal, RefreshCw } from 'lucide-react';
import { authService } from '../services/auth';
import { auditService } from '../services/auditService';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const { success, error: authError } = await authService.login(username, password);
    
    setIsLoading(false);

    if (success) {
      onLogin();
    } else {
      const errorMsg = authError || 'Authentication failed';
      setError(errorMsg);
      auditService.log('WARN', 'Login Failed', { username, error: errorMsg });

      if (authError !== 'LOGIN_TABLE_MISSING') {
          setIsShake(true);
          setTimeout(() => setIsShake(false), 500);
      }
    }
  };

  const sqlScript = `create table if not exists logins (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text not null
);

-- Default user
insert into logins (username, password) values ('admin', 'admin')
on conflict (username) do nothing;

-- Enable public access
alter table logins enable row level security;
create policy "Public Access" on logins for all using (true);`;

  const copySql = () => {
      navigator.clipboard.writeText(sqlScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  // --- SETUP VIEW IF TABLE MISSING ---
  if (error === 'LOGIN_TABLE_MISSING') {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
             <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-red-500/10 rounded-xl">
                          <Database className="w-8 h-8 text-red-400" />
                      </div>
                      <div>
                          <h1 className="text-2xl font-bold text-white">Database Setup Required</h1>
                          <p className="text-slate-400">The <code>logins</code> table is missing in Supabase.</p>
                      </div>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                              <Terminal className="w-4 h-4 text-slate-400" />
                              Run this SQL Script
                          </h3>
                          <p className="text-sm text-slate-400 mb-4">
                              Go to your Supabase <strong>SQL Editor</strong> and run this to create the login table and default user:
                          </p>
                          
                          <div className="relative group">
                              <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-indigo-300 overflow-x-auto border border-slate-800">
                                  {sqlScript}
                              </pre>
                              <button 
                                  onClick={copySql}
                                  className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                                  title="Copy to clipboard"
                              >
                                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                           <button 
                                onClick={() => setError(null)}
                                className="text-slate-400 hover:text-white text-sm"
                           >
                               &larr; Back to Login
                           </button>
                           <button 
                                onClick={handleSubmit}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                           >
                               <RefreshCw className="w-4 h-4" />
                               I've Run the Script, Retry
                           </button>
                      </div>
                  </div>
              </div>
        </div>
      );
  }

  // --- STANDARD LOGIN VIEW ---
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 mb-4">
            <LayoutGrid className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CloudKeeper</h1>
          <p className="text-slate-400 mt-2">Secure Dashboard Access</p>
        </div>

        {/* Login Card */}
        <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl transition-transform ${isShake ? 'animate-shake' : ''}`}>
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Enter username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {error && error !== 'LOGIN_TABLE_MISSING' && (
              <div className="flex flex-col gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
            >
              {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
              ) : (
                  <>
                    Access Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-slate-600 text-xs mt-8">
          Protected System &bull; Authorized Personnel Only
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default Login;