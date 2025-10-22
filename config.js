// Supabase Configuration
const SUPABASE_CONFIG = {
    // Your Supabase project URL
    url: 'https://xmgjazefeumxszeozuzv.supabase.co',
    
    // Your Supabase anon/public API key
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZ2phemVmZXVteHN6ZW96dXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDk1ODQsImV4cCI6MjA3NjcyNTU4NH0.c1GW-O8pOask3c77Zyr5zMG1cqHi2ZdyT0n0uxevrIg'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}
