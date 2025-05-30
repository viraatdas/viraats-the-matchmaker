// Supabase client initialization and database functions
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            // Import Supabase from CDN
            if (typeof window !== 'undefined') {
                // Browser environment
                const { createClient } = supabase;
                this.supabase = createClient(
                    SUPABASE_CONFIG.url,
                    SUPABASE_CONFIG.anonKey
                );
            } else {
                // Node.js environment
                const { createClient } = require('@supabase/supabase-js');
                this.supabase = createClient(
                    SUPABASE_CONFIG.url,
                    SUPABASE_CONFIG.anonKey
                );
            }
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            throw error;
        }
    }

    // Get current week's questions
    async getCurrentWeekQuestions() {
        await this.init();
        
        const currentWeek = getCurrentWeek();
        const currentYear = new Date().getFullYear();
        
        try {
            const { data, error } = await this.supabase
                .from('weekly_questions')
                .select('*')
                .eq('week_number', currentWeek)
                .eq('year', currentYear)
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data || this.getDefaultQuestions();
        } catch (error) {
            console.error('Error fetching weekly questions:', error);
            return this.getDefaultQuestions();
        }
    }

    // Get default questions if no weekly questions are set
    getDefaultQuestions() {
        return {
            question1: "Why are you interested in this program?",
            question2: "What unique skills or experiences do you bring?",
            question3: "How do you plan to contribute to our community?",
            deadline: getCurrentWeekDeadline().toISOString()
        };
    }

    // Submit application
    async submitApplication(applicationData) {
        await this.init();
        
        try {
            const currentWeek = getCurrentWeek();
            const currentYear = new Date().getFullYear();
            
            // Upload photo to Supabase Storage
            let photoUrl = null;
            if (applicationData.photo) {
                photoUrl = await this.uploadPhoto(applicationData.photo);
            }

            // Prepare application data
            const submission = {
                full_name: applicationData.fullName,
                email: applicationData.email,
                photo_url: photoUrl,
                question1_answer: applicationData.question1,
                question2_answer: applicationData.question2,
                question3_answer: applicationData.question3 || '',
                week_number: currentWeek,
                year: currentYear,
                submitted_at: new Date().toISOString(),
                ip_address: await this.getClientIP()
            };

            const { data, error } = await this.supabase
                .from('applications')
                .insert(submission)
                .select();

            if (error) {
                throw error;
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error submitting application:', error);
            return { success: false, error: error.message };
        }
    }

    // Upload photo to Supabase Storage
    async uploadPhoto(photoFile) {
        await this.init();
        
        try {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `photos/${getCurrentWeek()}/${fileName}`;

            const { data, error } = await this.supabase.storage
                .from('application-photos')
                .upload(filePath, photoFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw error;
            }

            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from('application-photos')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading photo:', error);
            throw error;
        }
    }

    // Check if user has already applied this week
    async checkExistingApplication(email) {
        await this.init();
        
        const currentWeek = getCurrentWeek();
        const currentYear = new Date().getFullYear();
        
        try {
            const { data, error } = await this.supabase
                .from('applications')
                .select('id, submitted_at')
                .eq('email', email)
                .eq('week_number', currentWeek)
                .eq('year', currentYear)
                .single();

            return data ? { exists: true, submission: data } : { exists: false };
        } catch (error) {
            if (error.code === 'PGRST116') {
                return { exists: false };
            }
            throw error;
        }
    }

    // Get client IP address
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    // Admin function: Create weekly questions
    async createWeeklyQuestions(questionsData) {
        await this.init();
        
        try {
            const { data, error } = await this.supabase
                .from('weekly_questions')
                .insert({
                    week_number: questionsData.weekNumber,
                    year: questionsData.year,
                    question1: questionsData.question1,
                    question2: questionsData.question2,
                    question3: questionsData.question3,
                    deadline: questionsData.deadline,
                    is_active: true,
                    created_at: new Date().toISOString()
                })
                .select();

            if (error) {
                throw error;
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating weekly questions:', error);
            return { success: false, error: error.message };
        }
    }

    // Admin function: Get all applications for a specific week
    async getWeeklyApplications(weekNumber, year) {
        await this.init();
        
        try {
            const { data, error } = await this.supabase
                .from('applications')
                .select('*')
                .eq('week_number', weekNumber)
                .eq('year', year)
                .order('submitted_at', { ascending: false });

            if (error) {
                throw error;
            }

            return { success: true, applications: data };
        } catch (error) {
            console.error('Error fetching weekly applications:', error);
            return { success: false, error: error.message };
        }
    }

    // Admin function: Get application statistics
    async getApplicationStats() {
        await this.init();
        
        try {
            const currentWeek = getCurrentWeek();
            const currentYear = new Date().getFullYear();

            const { data, error } = await this.supabase
                .from('applications')
                .select('week_number, year')
                .eq('year', currentYear);

            if (error) {
                throw error;
            }

            const stats = {
                totalThisYear: data.length,
                thisWeek: data.filter(app => app.week_number === currentWeek).length,
                weeklyBreakdown: {}
            };

            data.forEach(app => {
                const key = `${app.year}-W${app.week_number}`;
                stats.weeklyBreakdown[key] = (stats.weeklyBreakdown[key] || 0) + 1;
            });

            return { success: true, stats };
        } catch (error) {
            console.error('Error fetching application stats:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const supabaseClient = new SupabaseClient();

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = supabaseClient;
} else {
    window.supabaseClient = supabaseClient;
}