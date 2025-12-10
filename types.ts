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
}

export interface DomainMetadata {
  name: string;
  description: string;
  owner: string;
  registrationDate: string;
}