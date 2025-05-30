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
                if (typeof supabase === 'undefined') {
                    throw new Error('Supabase CDN not loaded');
                }
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
            
            // Test connection
            console.log('Testing Supabase connection...');
            await this.testConnection();
            
            this.initialized = true;
            console.log('Supabase initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            throw error;
        }
    }

    // Test connection method
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('applications')
                .select('count')
                .limit(1);
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            console.log('Supabase connection test successful');
            return true;
        } catch (error) {
            console.error('Supabase connection test failed:', error);
            throw new Error('Database connection failed. Please check if the schema has been run.');
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
            console.log('Starting application submission process...');
            const currentWeek = getCurrentWeek();
            const currentYear = new Date().getFullYear();
            
            console.log(`Current week: ${currentWeek}, Current year: ${currentYear}`);
            
            // Upload photo to Supabase Storage
            let photoUrl = null;
            if (applicationData.photo) {
                console.log('Uploading photo...');
                try {
                    photoUrl = await this.uploadPhoto(applicationData.photo);
                    console.log('Photo uploaded successfully:', photoUrl);
                } catch (photoError) {
                    console.error('Photo upload failed:', photoError);
                    // Continue without photo for now
                    photoUrl = null;
                }
            } else {
                console.log('No photo to upload');
            }

            // Prepare application data
            const submission = {
                full_name: applicationData.fullName,
                email: applicationData.email,
                photo_url: photoUrl,
                favorite_color: applicationData.favoriteColor,
                location: applicationData.location,
                are_you_happy: applicationData.areYouHappy,
                greatest_fear: applicationData.greatestFear,
                fun_to_be_around: applicationData.funToBearound,
                life_without_partner: applicationData.lifeWithoutPartner,
                looking_for_here: applicationData.lookingForHere,
                week_number: currentWeek,
                year: currentYear,
                submitted_at: new Date().toISOString(),
                ip_address: await this.getClientIP()
            };

            console.log('Prepared submission data:', {
                ...submission,
                photo_url: submission.photo_url ? 'Photo URL set' : 'No photo'
            });

            console.log('Inserting into applications table...');
            const { data, error } = await this.supabase
                .from('applications')
                .insert(submission)
                .select();

            if (error) {
                console.error('Database insert error:', error);
                throw error;
            }

            console.log('Application submitted successfully to database:', data);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error submitting application:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            return { success: false, error: error.message };
        }
    }

    // Upload photo to Supabase Storage
    async uploadPhoto(photoFile) {
        await this.init();
        
        try {
            console.log('Preparing photo upload...', {
                name: photoFile.name,
                size: photoFile.size,
                type: photoFile.type
            });
            
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const currentWeek = getCurrentWeek();
            const currentYear = new Date().getFullYear();
            const filePath = `${currentYear}/week-${currentWeek}/${fileName}`;

            console.log('Uploading to path:', filePath);

            const { data, error } = await this.supabase.storage
                .from('application-photos')
                .upload(filePath, photoFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Storage upload error:', error);
                throw error;
            }

            console.log('Photo uploaded to storage:', data);

            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from('application-photos')
                .getPublicUrl(filePath);

            console.log('Generated public URL:', publicUrl);
            return publicUrl;
        } catch (error) {
            console.error('Error uploading photo:', error);
            console.error('Photo upload error details:', {
                message: error.message,
                statusCode: error.statusCode,
                error: error.error
            });
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