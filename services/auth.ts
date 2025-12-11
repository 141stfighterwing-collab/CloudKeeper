import { getSupabase } from './storage';

const AUTH_KEY = 'cloudkeeper_auth_session';

export const authService = {
  login: async (username: string, password: string): Promise<{success: boolean, error?: string}> => {
    const supabase = getSupabase();
    
    // Check if connected to Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('logins')
          .select('*')
          .eq('username', username)
          .eq('password', password)
          .maybeSingle(); // Use maybeSingle to prevent "Success. No rows returned" error

        if (error) {
           // Handle Table Missing specifically to help user setup
           if (error.code === '42P01' || error.message.includes('not found') || error.message.includes('does not exist')) {
               return { success: false, error: 'LOGIN_TABLE_MISSING' };
           }
           
           // Extra safety: Handle explicit "No rows" message if it bubbles up despite maybeSingle
           if (error.code === 'PGRST116' || error.message.includes("Success. No rows returned")) {
               return { success: false, error: 'Invalid username or password.' };
           }
           
           console.error("Login error:", error);
           return { success: false, error: 'Connection error. Please try again.' };
        }

        if (data) {
           localStorage.setItem(AUTH_KEY, 'true');
           return { success: true };
        } else {
            return { success: false, error: 'Invalid username or password.' };
        }
      } catch (e: any) {
         console.error(e);
         return { success: false, error: e.message };
      }
    }

    // Fallback if Supabase not configured (shouldn't happen if getSupabase returns client, but for safety)
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem(AUTH_KEY, 'true');
      return { success: true };
    }
    
    return { success: false, error: 'Invalid credentials.' };
  },

  logout: () => {
    localStorage.removeItem(AUTH_KEY);
  },

  isAuthenticated: (): boolean => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  }
};