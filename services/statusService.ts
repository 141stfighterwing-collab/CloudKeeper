export const checkStatus = async (url: string): Promise<'online' | 'offline'> => {
  try {
    // Attempt to fetch with no-cors. 
    // This allows us to detect network errors (offline) vs opaque responses (online).
    // Note: We cannot read the status code in no-cors, but if it doesn't throw, 
    // it means the server received the request.
    const validUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Set a timeout to avoid hanging for too long
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch(validUrl, { 
      mode: 'no-cors', 
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return 'online';
  } catch (error) {
    // Silently return offline. 
    // "Failed to fetch" is expected when the target is unreachable or blocks the request.
    return 'offline';
  }
};