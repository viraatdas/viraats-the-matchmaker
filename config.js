// Supabase configuration
const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL || 'https://sduqpihjmpvdhdcubwsa.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdXFwaWhqbXB2ZGhkY3Vid3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1Njg3NDEsImV4cCI6MjA2NDE0NDc0MX0.QR9xOAghbG517sVUaX2fGkUXfwfYgKHu4_JGIVh7BZ8'
};

// Week calculation helper
function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
}

// Get current week's Sunday date (start of application week)
function getCurrentWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const sunday = new Date(now.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
}

// Get current week's deadline (Sunday 11:59:59 PM)
function getCurrentWeekDeadline() {
    const sunday = getCurrentWeekStart();
    const deadline = new Date(sunday);
    deadline.setDate(deadline.getDate() + 7);
    deadline.setHours(23, 59, 59, 999);
    return deadline;
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        getCurrentWeek,
        getCurrentWeekStart,
        getCurrentWeekDeadline
    };
} else {
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.getCurrentWeek = getCurrentWeek;
    window.getCurrentWeekStart = getCurrentWeekStart;
    window.getCurrentWeekDeadline = getCurrentWeekDeadline;
}