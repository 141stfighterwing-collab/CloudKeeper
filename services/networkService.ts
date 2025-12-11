
interface NetworkInfo {
    ipAddress?: string;
    location?: string;
    isp?: string;
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
        console.error("DNS resolution failed:", error);
        return null;
    }
};

// Uses ipwho.is (free, supports CORS) to get location data
export const fetchIpLocation = async (ip: string): Promise<Partial<NetworkInfo>> => {
    try {
        const response = await fetch(`https://ipwho.is/${ip}`);
        const data = await response.json();
        
        if (data.success) {
            return {
                location: `${data.city}, ${data.country}`,
                isp: data.connection?.isp || data.isp || 'Unknown',
            };
        }
        return {};
    } catch (error) {
        console.error("IP Geolocation failed:", error);
        return {};
    }
};

export const fetchNetworkDetails = async (url: string): Promise<NetworkInfo> => {
    try {
        const hostname = new URL(url).hostname;
        const ip = await resolveDomainIp(hostname);
        
        if (!ip) return {};

        const geoInfo = await fetchIpLocation(ip);
        
        return {
            ipAddress: ip,
            ...geoInfo
        };
    } catch (e) {
        console.error("Network details fetch failed", e);
        return {};
    }
};
