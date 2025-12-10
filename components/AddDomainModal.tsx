import React, { useState } from 'react';
import { X, Plus, Globe, Loader2 } from 'lucide-react';

interface AddDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string) => Promise<void>;
}

const AddDomainModal: React.FC<AddDomainModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Basic validation
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
    }

    try {
        setIsLoading(true);
        setError(null);
        await onAdd(formattedUrl);
        setUrl('');
        onClose();
    } catch (err) {
        setError("Failed to add domain. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl transition-all">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            Add New Service
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-1">
              Domain or App URL
            </label>
            <input
              type="text"
              id="url"
              placeholder="example.com or localhost:3000"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-500">
              We'll use Gemini to automatically fetch details about this domain.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !url}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add to Dashboard
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDomainModal;