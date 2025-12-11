
interface NetworkInfo {
    ipAddress?: string;
    location?: string;
    isp?: string;
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
export const fetchIpLocation = async (ip: string): Promise<Partial<NetworkInfo>> => {
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

export const fetchNetworkDetails = async (url: string): Promise<NetworkInfo> => {
    try {
        const hostname = new URL(url).hostname;
        
        // Fetch IP/Geo and DNS records in parallel
        const ipPromise = resolveDomainIp(hostname);
        const dnsPromise = fetchDnsRecords(hostname);
        
        const [ip, dnsRecords] = await Promise.all([ipPromise, dnsPromise]);
        
        let geoInfo = {};
        if (ip) {
            geoInfo = await fetchIpLocation(ip);
        }
        
        return {
            ipAddress: ip || undefined,
            ...geoInfo,
            dnsRecords
        };
    } catch (e) {
        // Silently fail
        return {};
    }
};
