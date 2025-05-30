// Application state
let currentStep = 1;
const totalSteps = 4;
let applicationData = {};
let deadlinePassed = false;
let currentWeekQuestions = null;
let DEADLINE = null;

// DOM elements
const landingPage = document.getElementById('landing-page');
const applicationPage = document.getElementById('application-page');
const closedPage = document.getElementById('closed-page');
const successPage = document.getElementById('success-page');
const startButton = document.getElementById('start-application');
const applicationForm = document.getElementById('application-form');
const progressFill = document.getElementById('progress-fill');
const currentStepElement = document.getElementById('current-step');
const totalStepsElement = document.getElementById('total-steps');
const photoUploadArea = document.getElementById('photo-upload-area');
const photoInput = document.getElementById('photo');
const photoPreview = document.getElementById('photo-preview');

// Error modal elements
const errorModal = document.getElementById('errorModal');
const errorIcon = document.getElementById('errorIcon');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const errorClose = document.getElementById('errorClose');
const errorRetry = document.getElementById('errorRetry');
const errorDismiss = document.getElementById('errorDismiss');

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
});

// Main initialization function
async function initializeApp() {
    try {
        console.log('Initializing application...');
        console.log('Supabase config:', {
            url: SUPABASE_CONFIG.url,
            hasKey: !!SUPABASE_CONFIG.anonKey
        });
        
        // Load current week's questions and deadline from Supabase
        await loadWeeklyQuestions();
        
        // Set total steps
        totalStepsElement.textContent = totalSteps;
        
        // Initialize all components
        checkDeadline();
        initializeCountdown();
        initializeForm();
        initializePhotoUpload();
        initializeErrorModal();
        initializeTestimonials();
        
        // Update form with current week's questions
        updateFormQuestions();
        
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Fallback to default behavior
        DEADLINE = getCurrentWeekDeadline().getTime();
        checkDeadline();
        initializeCountdown();
        initializeForm();
        initializePhotoUpload();
        initializeErrorModal();
        initializeTestimonials();
        totalStepsElement.textContent = totalSteps;
    }
}

// Load weekly questions from Supabase
async function loadWeeklyQuestions() {
    try {
        currentWeekQuestions = await supabaseClient.getCurrentWeekQuestions();
        DEADLINE = new Date(currentWeekQuestions.deadline).getTime();
    } catch (error) {
        console.error('Error loading weekly questions:', error);
        // Fallback to current week deadline
        DEADLINE = getCurrentWeekDeadline().getTime();
        currentWeekQuestions = supabaseClient.getDefaultQuestions();
    }
}

// Update form with current week's questions
function updateFormQuestions() {
    if (currentWeekQuestions) {
        const question1Label = document.querySelector('label[for="question1"]');
        const question2Label = document.querySelector('label[for="question2"]');
        const question1Textarea = document.getElementById('question1');
        const question2Textarea = document.getElementById('question2');
        
        if (question1Label && currentWeekQuestions.question1) {
            question1Label.textContent = currentWeekQuestions.question1 + ' *';
            question1Textarea.placeholder = 'Your answer here...';
        }
        
        if (question2Label && currentWeekQuestions.question2) {
            question2Label.textContent = currentWeekQuestions.question2 + ' *';
            question2Textarea.placeholder = 'Your answer here...';
        }
        
        // Add third question if exists
        if (currentWeekQuestions.question3) {
            addThirdQuestion(currentWeekQuestions.question3);
        }
    }
}

// Add third question dynamically
function addThirdQuestion(questionText) {
    const questionsStep = document.querySelector('[data-step="3"]');
    const existingQuestion3 = document.getElementById('question3');
    
    if (!existingQuestion3 && questionsStep) {
        const question3Html = `
            <div class="form-group">
                <label for="question3">${questionText} *</label>
                <textarea id="question3" name="question3" rows="4" placeholder="Your answer here..." required></textarea>
            </div>
        `;
        
        const navigationDiv = questionsStep.querySelector('.form-navigation');
        navigationDiv.insertAdjacentHTML('beforebegin', question3Html);
    }
}

// Countdown timer functionality
function initializeCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const now = new Date().getTime();
    const timeLeft = DEADLINE - now;
    
    if (timeLeft <= 0) {
        deadlinePassed = true;
        showPage('closed');
        return;
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

function checkDeadline() {
    const now = new Date().getTime();
    if (now >= DEADLINE) {
        deadlinePassed = true;
        showPage('closed');
    }
}

// Page navigation
function showPage(pageName) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    switch(pageName) {
        case 'landing':
            landingPage.classList.add('active');
            break;
        case 'application':
            applicationPage.classList.add('active');
            break;
        case 'closed':
            closedPage.classList.add('active');
            break;
        case 'success':
            successPage.classList.add('active');
            break;
    }
}

// Form functionality
function initializeForm() {
    // Start application button
    startButton.addEventListener('click', function() {
        if (deadlinePassed) {
            showPage('closed');
            return;
        }
        showPage('application');
    });
    
    // Navigation buttons
    document.querySelectorAll('.next-button').forEach(button => {
        button.addEventListener('click', function() {
            const nextStep = parseInt(this.dataset.next);
            if (validateCurrentStep()) {
                goToStep(nextStep);
            }
        });
    });
    
    document.querySelectorAll('.prev-button').forEach(button => {
        button.addEventListener('click', function() {
            const prevStep = parseInt(this.dataset.prev);
            goToStep(prevStep);
        });
    });
    
    // Form submission
    applicationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (deadlinePassed) {
            showPage('closed');
            return;
        }
        
        if (validateCurrentStep()) {
            collectFormData();
            submitApplication();
        }
    });
}

function goToStep(step) {
    // Hide current step
    document.querySelectorAll('.form-step').forEach(stepElement => {
        stepElement.classList.remove('active');
    });
    
    // Show target step
    const targetStep = document.querySelector(`[data-step="${step}"]`);
    if (targetStep) {
        targetStep.classList.add('active');
        currentStep = step;
        updateProgress();
        
        // Update review section if on final step
        if (step === 4) {
            updateReviewSection();
        }
    }
}

function updateProgress() {
    const progressPercentage = (currentStep / totalSteps) * 100;
    progressFill.style.width = `${progressPercentage}%`;
    currentStepElement.textContent = currentStep;
}

function validateCurrentStep() {
    const currentStepElement = document.querySelector(`[data-step="${currentStep}"]`);
    const requiredFields = currentStepElement.querySelectorAll('[required]');
    
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.style.borderColor = '#ff6b6b';
            
            // Reset border color after 3 seconds
            setTimeout(() => {
                field.style.borderColor = '';
            }, 3000);
        } else {
            field.style.borderColor = '';
        }
        
        // Special validation for email
        if (field.type === 'email' && field.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                isValid = false;
                field.style.borderColor = '#ff6b6b';
                
                setTimeout(() => {
                    field.style.borderColor = '';
                }, 3000);
            }
        }
    });
    
    // Special validation for photo upload
    if (currentStep === 2) {
        if (!photoInput.files || photoInput.files.length === 0) {
            isValid = false;
            photoUploadArea.style.borderColor = '#ff6b6b';
            
            setTimeout(() => {
                photoUploadArea.style.borderColor = '';
            }, 3000);
        }
    }
    
    return isValid;
}

function updateReviewSection() {
    document.getElementById('review-name').textContent = document.getElementById('fullName').value;
    document.getElementById('review-email').textContent = document.getElementById('email').value;
    
    if (photoInput.files && photoInput.files.length > 0) {
        document.getElementById('review-photo').textContent = `${photoInput.files[0].name} (${(photoInput.files[0].size / 1024 / 1024).toFixed(2)}MB)`;
    }
}

// Photo upload functionality
function initializePhotoUpload() {
    photoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert('Please upload a valid image file (JPG, PNG, or GIF)');
                photoInput.value = '';
                return;
            }
            
            // Validate file size (5MB max)
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > maxSize) {
                alert('File size must be less than 5MB');
                photoInput.value = '';
                return;
            }
            
            // Show preview
            showPhotoPreview(file);
        }
    });
    
    // Drag and drop functionality
    photoUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        photoUploadArea.style.borderColor = '#667eea';
        photoUploadArea.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
    });
    
    photoUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        photoUploadArea.style.borderColor = '';
        photoUploadArea.style.backgroundColor = '';
    });
    
    photoUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        photoUploadArea.style.borderColor = '';
        photoUploadArea.style.backgroundColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            photoInput.files = files;
            photoInput.dispatchEvent(new Event('change'));
        }
    });
}

function showPhotoPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        photoPreview.innerHTML = `
            <img src="${e.target.result}" alt="Photo preview">
            <p style="margin-top: 0.5rem; color: #b3b3b3; font-size: 0.9rem;">
                ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)
            </p>
        `;
        photoPreview.style.display = 'block';
        
        // Hide the upload placeholder
        document.querySelector('.upload-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Error Modal functionality
function initializeErrorModal() {
    // Close modal events
    errorClose.addEventListener('click', hideErrorModal);
    errorDismiss.addEventListener('click', hideErrorModal);
    
    // Close on backdrop click
    errorModal.addEventListener('click', (e) => {
        if (e.target === errorModal) {
            hideErrorModal();
        }
    });
    
    // Retry button will re-submit the form
    errorRetry.addEventListener('click', () => {
        hideErrorModal();
        if (validateCurrentStep()) {
            collectFormData();
            submitApplication();
        }
    });
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && errorModal.classList.contains('show')) {
            hideErrorModal();
        }
    });
}

function showErrorModal(type, title, message) {
    // Set icon based on type
    const icons = {
        'connection': '🔌',
        'network': '🌐', 
        'auth': '🔑',
        'permission': '🔒',
        'duplicate': '⚠️',
        'photo': '📷',
        'generic': '❌'
    };
    
    errorIcon.textContent = icons[type] || icons.generic;
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    
    errorModal.classList.add('show');
    
    // Focus trap
    setTimeout(() => {
        errorRetry.focus();
    }, 100);
}

function hideErrorModal() {
    errorModal.classList.remove('show');
}

// Testimonials functionality
function initializeTestimonials() {
    const testimonials = document.querySelectorAll('.testimonial');
    const dots = document.querySelectorAll('.dot');
    let currentTestimonial = 0;
    let testimonialInterval;

    function showTestimonial(index) {
        // Hide all testimonials
        testimonials.forEach((testimonial, i) => {
            testimonial.classList.remove('active');
            if (i === currentTestimonial && i !== index) {
                testimonial.classList.add('slide-out-left');
            }
        });

        // Remove all dot active states
        dots.forEach(dot => dot.classList.remove('active'));

        // Show the selected testimonial
        setTimeout(() => {
            testimonials[index].classList.remove('slide-out-left', 'slide-in-right');
            testimonials[index].classList.add('active');
            dots[index].classList.add('active');
            currentTestimonial = index;
        }, 150);
    }

    function nextTestimonial() {
        const next = (currentTestimonial + 1) % testimonials.length;
        showTestimonial(next);
    }

    function startAutoplay() {
        testimonialInterval = setInterval(nextTestimonial, 4000); // Change every 4 seconds
    }

    function stopAutoplay() {
        if (testimonialInterval) {
            clearInterval(testimonialInterval);
        }
    }

    // Dot click handlers
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            stopAutoplay();
            showTestimonial(index);
            startAutoplay();
        });
    });

    // Pause on hover
    const testimonialContainer = document.querySelector('.testimonials-container');
    if (testimonialContainer) {
        testimonialContainer.addEventListener('mouseenter', stopAutoplay);
        testimonialContainer.addEventListener('mouseleave', startAutoplay);
    }

    // Start autoplay
    startAutoplay();

    // Clean up on page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    });
}

// Form data collection and submission
function collectFormData() {
    const question3Element = document.getElementById('question3');
    
    applicationData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        photo: photoInput.files[0],
        question1: document.getElementById('question1').value,
        question2: document.getElementById('question2').value,
        question3: question3Element ? question3Element.value : '',
        submittedAt: new Date().toISOString()
    };
}

async function submitApplication() {
    const submitButton = document.getElementById('submit-button');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    
    try {
        console.log('Starting application submission...');
        console.log('Application data:', {
            ...applicationData,
            photo: applicationData.photo ? `${applicationData.photo.name} (${applicationData.photo.size} bytes)` : 'No photo'
        });
        
        // Initialize Supabase if not already done
        if (!supabaseClient.initialized) {
            console.log('Initializing Supabase client...');
            try {
                await supabaseClient.init();
                console.log('Supabase client initialized successfully');
            } catch (initError) {
                console.error('Failed to initialize Supabase:', initError);
                throw new Error('Database connection failed: ' + initError.message);
            }
        }
        
        // Check if user has already applied this week
        console.log('Checking for existing application...');
        const existingApplication = await supabaseClient.checkExistingApplication(applicationData.email);
        
        if (existingApplication.exists) {
            showErrorModal('duplicate', 'Duplicate Application', 'You have already submitted an application for this week. Only one application per week is allowed.');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Application';
            return;
        }
        
        // Submit application to Supabase
        console.log('Submitting application to Supabase...');
        const result = await supabaseClient.submitApplication(applicationData);
        
        if (result.success) {
            console.log('Application submitted successfully:', result.data);
            showPage('success');
            resetForm();
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error submitting application:', error);
        
        let type, title, message;
        
        if (error.message.includes('Database connection failed')) {
            type = 'connection';
            title = 'Database Connection Error';
            message = 'The application database is not properly configured. This is a technical issue on our end. Please contact the administrator to fix the database setup.';
        } else if (error.message.includes('Failed to fetch')) {
            type = 'network';
            title = 'Network Error';
            message = 'Cannot connect to the server. Please check your internet connection and try again.';
        } else if (error.message.includes('JWT')) {
            type = 'auth';
            title = 'Authentication Error';
            message = 'There was an authentication issue with the database. Please try refreshing the page and submitting again.';
        } else if (error.message.includes('permission denied') || error.message.includes('RLS')) {
            type = 'permission';
            title = 'Permission Error';
            message = 'The database security settings are preventing your submission. Please contact the administrator to fix the database permissions.';
        } else if (error.message.includes('violates') || error.message.includes('constraint')) {
            type = 'duplicate';
            title = 'Duplicate Application';
            message = 'It looks like you may have already submitted an application this week. Only one application per week is allowed.';
        } else if (error.message.includes('storage') || error.message.includes('photo')) {
            type = 'photo';
            title = 'Photo Upload Error';
            message = 'There was an issue uploading your photo. Try with a smaller image (under 5MB) or submit without a photo for now.';
        } else {
            type = 'generic';
            title = 'Submission Error';
            message = `Something went wrong while submitting your application. Error details: ${error.message}. Please try again or contact support if this continues.`;
        }
        
        showErrorModal(type, title, message);
        console.error('Full error details:', error);
        
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Application';
    }
}

function resetForm() {
    applicationForm.reset();
    currentStep = 1;
    updateProgress();
    photoPreview.style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    
    // Show first step
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    document.querySelector('[data-step="1"]').classList.add('active');
    
    // Reset submit button
    const submitButton = document.getElementById('submit-button');
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Application';
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}