export interface DomainApp {
  id: string;
  url: string;
  name: string;
  description?: string;
  owner?: string;
  registrationDate?: string;
  status: 'online' | 'offline' | 'checking' | 'unknown';
  lastChecked: number;
  favicon?: string;
  
  // New fields
  expiresAt?: string; // ISO Date YYYY-MM-DD
  registrar?: string;
  registrarUrl?: string;
  
  // Network Info
  ipAddress?: string;
  location?: string;
  isp?: string;
  nameservers?: string[];
  dnsRecords?: Record<string, string[]>;
}

export interface DomainMetadata {
  name: string;
  description: string;
  owner: string;
  registrationDate: string;
  expiresAt: string;
  registrar: string;
}

export interface StorageConfig {
  type: 'local' | 'supabase';
  supabaseUrl?: string;
  supabaseKey?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  action: string;
  details?: any;
}