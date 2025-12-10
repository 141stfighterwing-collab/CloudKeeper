import React from 'react';
import { DomainApp } from '../types';

interface StatusBadgeProps {
  status: DomainApp['status'];
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getColors = () => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'offline':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'checking':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColors()} ${className}`}>
      <span className="relative flex h-2 w-2 mr-2">
        {status === 'online' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        {status === 'checking' && (
           <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          status === 'online' ? 'bg-emerald-500' : 
          status === 'offline' ? 'bg-red-500' :
          status === 'checking' ? 'bg-yellow-500' : 'bg-slate-500'
        }`}></span>
      </span>
      {getLabel()}
    </div>
  );
};

export default StatusBadge;