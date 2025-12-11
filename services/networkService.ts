import { DomainApp } from '../types';

interface NetworkInfo extends Partial<DomainApp> {
    dnsRecords?: Record<string, string[]>;
}

// Uses Google DNS-over-HTTPS to resolve the domain to an IP
export const resolveDomainIp = async (hostname: string): Promise<string | null> => {
    try {
        const response = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
        const data = await response.json();
        
        if (data.Answer && data.Answer.length > 0) {
            // Return the first A record data
            return data.Answer[0].data;
        }
        return null;
    } catch (error) {
        // Silently return null on failure
        return null;
    }
};

export const fetchDnsRecords = async (hostname: string): Promise<Record<string, string[]>> => {
    const types = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME'];
    const records: Record<string, string[]> = {};

    await Promise.all(types.map(async (type) => {
        try {
            const response = await fetch(`https://dns.google/resolve?name=${hostname}&type=${type}`);
            const data = await response.json();
            if (data.Answer) {
                records[type] = data.Answer.map((rec: any) => rec.data);
            }
        } catch (error) {
           // Silently fail for specific records, just don't add them
        }
    }));
    return records;
}

// Uses ipwho.is (free, supports CORS) to get location data
export const fetchIpLocation = async (ip: string): Promise<Partial<DomainApp>> => {
    try {
        const response = await fetch(`https://ipwho.is/${ip}`);
        if (!response.ok) {
            return {};
        }
        const data = await response.json();
        
        if (data.success) {
            return {
                location: `${data.city}, ${data.country}`,
                isp: data.connection?.isp || data.isp || 'Unknown',
            };
        }
        return {};
    } catch (error) {
        // Silently fail to avoid console clutter on network errors (e.g. ad blockers)
        return {};
    }
};

export const fetchRdap = async (hostname: string): Promise<Partial<DomainApp>> => {
    try {
        // RDAP provides machine-readable WHOIS data.
        // We use rdap.org as a bootstrap/redirect service.
        // Note: Client-side CORS failures are possible if the authoritative registrar blocks them.
        const response = await fetch(`https://rdap.org/domain/${hostname}`);
        
        if (!response.ok) return {};
        
        const data = await response.json();
        const result: Partial<DomainApp> = {};

        // 1. Nameservers
        if (data.nameservers && Array.isArray(data.nameservers)) {
            result.nameservers = data.nameservers
                .map((ns: any) => ns.ldhName)
                .filter((n: any) => typeof n === 'string');
        }

        // 2. Dates (Registration, Expiration)
        if (data.events && Array.isArray(data.events)) {
            const findDate = (action: string) => data.events.find((e: any) => e.eventAction === action)?.eventDate;
            
            const exp = findDate('expiration');
            const reg = findDate('registration');
            
            if (exp) result.expiresAt = exp.split('T')[0];
            if (reg) result.registrationDate = reg.split('T')[0];
        }

        // 3. Registrar Information
        // RDAP entities are nested. We look for the 'registrar' role.
        if (data.entities && Array.isArray(data.entities)) {
            const registrar = data.entities.find((e: any) => e.roles?.includes('registrar'));
            
            if (registrar && registrar.vcardArray && Array.isArray(registrar.vcardArray) && registrar.vcardArray.length > 1) {
                // vCard format: ["vcard", [["fn", {}, "text", "Name"], ...]]
                const vcardProps = registrar.vcardArray[1];
                
                // Full Name
                const fn = vcardProps.find((item: any) => item[0] === 'fn');
                if (fn) result.registrar = fn[3];
                
                // URL / Link (often stored in 'adr' or specific 'url' fields depending on implementation, 
                // but usually simpler to just get the name here for display)
            }
        }

        return result;
    } catch (e) {
        console.warn("RDAP/WHOIS fetch failed (likely CORS or rate limit):", e);
        return {};
    }
};

export const fetchNetworkDetails = async (url: string): Promise<Partial<DomainApp>> => {
    try {
        const hostname = new URL(url).hostname;
        
        // Fetch IP/Geo, DNS records, and WHOIS/RDAP in parallel
        const [ip, dnsRecords, rdapData] = await Promise.all([
            resolveDomainIp(hostname),
            fetchDnsRecords(hostname),
            fetchRdap(hostname)
        ]);
        
        let geoInfo = {};
        if (ip) {
            geoInfo = await fetchIpLocation(ip);
        }
        
        return {
            ipAddress: ip || undefined,
            dnsRecords,
            ...geoInfo,
            ...rdapData // Merge RDAP info (registrar, dates, nameservers)
        };
    } catch (e) {
        // Silently fail
        return {};
    }
};