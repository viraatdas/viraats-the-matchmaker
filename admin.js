// Admin Panel JavaScript
let currentApplications = [];
let filteredApplications = [];

// DOM elements
const navButtons = document.querySelectorAll('.nav-button');
const adminSections = document.querySelectorAll('.admin-section');
const questionsForm = document.getElementById('questionsForm');
const applicationsTable = document.getElementById('applicationsTable');
const recentApplicationsTable = document.getElementById('recentApplicationsTable');
const applicationModal = document.getElementById('applicationModal');

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async function() {
    await initializeAdmin();
});

// Main initialization function
async function initializeAdmin() {
    try {
        // Initialize Supabase client
        await supabaseClient.init();
        
        // Load initial data
        await loadDashboardData();
        await loadCurrentQuestions();
        await loadApplications();
        
        // Initialize event listeners
        initializeEventListeners();
        
        console.log('Admin panel initialized successfully');
    } catch (error) {
        console.error('Failed to initialize admin panel:', error);
        showError('Failed to connect to database. Please check your configuration.');
    }
}

// Event listeners
function initializeEventListeners() {
    // Navigation
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const section = button.dataset.section;
            showSection(section);
            
            // Update active nav button
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
    
    // Questions form
    questionsForm.addEventListener('submit', handleQuestionsSubmit);
    
    // Filter controls
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('exportApplications').addEventListener('click', exportApplications);
    
    // Settings
    document.getElementById('testConnection').addEventListener('click', testConnection);
    document.getElementById('clearAllData').addEventListener('click', clearAllData);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === applicationModal) {
            closeModal();
        }
    });
    
    // Set current week and year in questions form
    const now = new Date();
    document.getElementById('weekNumber').value = getCurrentWeek();
    document.getElementById('year').value = now.getFullYear();
    
    // Set next Sunday as default deadline
    const nextSunday = getCurrentWeekDeadline();
    const deadlineInput = document.getElementById('deadline');
    deadlineInput.value = nextSunday.toISOString().slice(0, 16);
}

// Navigation
function showSection(sectionId) {
    adminSections.forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    // Load section-specific data
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'questions':
            loadCurrentQuestions();
            break;
        case 'applications':
            loadApplications();
            break;
    }
}

// Dashboard functions
async function loadDashboardData() {
    try {
        const stats = await supabaseClient.getApplicationStats();
        
        if (stats.success) {
            document.getElementById('thisWeekCount').textContent = stats.stats.thisWeek;
            document.getElementById('thisYearCount').textContent = stats.stats.totalThisYear;
            document.getElementById('currentWeekNumber').textContent = getCurrentWeek();
            
            // Update time left
            updateTimeLeft();
            setInterval(updateTimeLeft, 1000);
        }
        
        // Load recent applications
        await loadRecentApplications();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

function updateTimeLeft() {
    const deadline = getCurrentWeekDeadline();
    const now = new Date();
    const timeLeft = deadline - now;
    
    if (timeLeft <= 0) {
        document.getElementById('timeLeft').textContent = 'Expired';
        return;
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        document.getElementById('timeLeft').textContent = `${days}d ${hours}h ${minutes}m`;
    } else {
        document.getElementById('timeLeft').textContent = `${hours}h ${minutes}m`;
    }
}

async function loadRecentApplications() {
    try {
        const currentWeek = getCurrentWeek();
        const currentYear = new Date().getFullYear();
        
        const result = await supabaseClient.getWeeklyApplications(currentWeek, currentYear);
        
        if (result.success) {
            const tbody = recentApplicationsTable.querySelector('tbody');
            tbody.innerHTML = '';
            
            result.applications.slice(0, 10).forEach(app => {
                const row = createApplicationRow(app, true);
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading recent applications:', error);
    }
}

// Questions management
async function loadCurrentQuestions() {
    try {
        const questions = await supabaseClient.getCurrentWeekQuestions();
        const display = document.getElementById('currentQuestionsDisplay');
        
        if (questions) {
            display.innerHTML = `
                <div class="question-item">
                    <div class="question-label">Question 1:</div>
                    <div class="question-text">${questions.question1}</div>
                </div>
                <div class="question-item">
                    <div class="question-label">Question 2:</div>
                    <div class="question-text">${questions.question2}</div>
                </div>
                ${questions.question3 ? `
                <div class="question-item">
                    <div class="question-label">Question 3:</div>
                    <div class="question-text">${questions.question3}</div>
                </div>
                ` : ''}
                <div class="question-item">
                    <div class="question-label">Deadline:</div>
                    <div class="question-text">${new Date(questions.deadline).toLocaleString()}</div>
                </div>
            `;
        } else {
            display.innerHTML = '<p>No questions set for current week. Using default questions.</p>';
        }
    } catch (error) {
        console.error('Error loading current questions:', error);
        showError('Failed to load current questions');
    }
}

async function handleQuestionsSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    
    try {
        const formData = new FormData(e.target);
        const questionsData = {
            weekNumber: parseInt(document.getElementById('weekNumber').value),
            year: parseInt(document.getElementById('year').value),
            question1: document.getElementById('adminQuestion1').value,
            question2: document.getElementById('adminQuestion2').value,
            question3: document.getElementById('adminQuestion3').value || null,
            deadline: new Date(document.getElementById('deadline').value).toISOString()
        };
        
        const result = await supabaseClient.createWeeklyQuestions(questionsData);
        
        if (result.success) {
            showSuccess('Questions saved successfully!');
            await loadCurrentQuestions();
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error saving questions:', error);
        showError('Failed to save questions: ' + error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Questions';
    }
}

// Applications management
async function loadApplications() {
    try {
        // Get all applications for current year
        const currentYear = new Date().getFullYear();
        const result = await supabaseClient.getWeeklyApplications(null, currentYear);
        
        if (result.success) {
            currentApplications = result.applications;
            filteredApplications = [...currentApplications];
            
            populateFilterOptions();
            displayApplications();
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        showError('Failed to load applications');
    }
}

function populateFilterOptions() {
    const weeks = [...new Set(currentApplications.map(app => app.week_number))].sort((a, b) => b - a);
    const years = [...new Set(currentApplications.map(app => app.year))].sort((a, b) => b - a);
    
    const weekSelect = document.getElementById('filterWeek');
    const yearSelect = document.getElementById('filterYear');
    
    weekSelect.innerHTML = '<option value="">All Weeks</option>';
    weeks.forEach(week => {
        weekSelect.innerHTML += `<option value="${week}">Week ${week}</option>`;
    });
    
    yearSelect.innerHTML = '<option value="">All Years</option>';
    years.forEach(year => {
        yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
    });
}

function displayApplications() {
    const tbody = applicationsTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    filteredApplications.forEach(app => {
        const row = createApplicationRow(app, false);
        tbody.appendChild(row);
    });
}

function createApplicationRow(app, isRecent = false) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${app.full_name}</td>
        <td>${app.email}</td>
        <td>Week ${app.week_number}</td>
        ${!isRecent ? `<td>${app.year}</td>` : ''}
        <td>${new Date(app.submitted_at).toLocaleString()}</td>
        ${!isRecent ? `<td>${app.photo_url ? '✓' : '✗'}</td>` : ''}
        <td>
            <button class="action-button" onclick="viewApplication('${app.id}')">View</button>
        </td>
    `;
    return row;
}

async function viewApplication(applicationId) {
    try {
        const application = currentApplications.find(app => app.id === applicationId) || 
                          filteredApplications.find(app => app.id === applicationId);
        
        if (!application) {
            showError('Application not found');
            return;
        }
        
        // Parse form responses from JSON
        let formResponses = {};
        try {
            formResponses = application.form_responses ? JSON.parse(application.form_responses) : {};
        } catch (e) {
            console.error('Error parsing form responses:', e);
        }
        
        const modalBody = document.getElementById('applicationDetails');
        let html = `
            <div class="detail-item">
                <span class="detail-label">Full Name:</span>
                <span class="detail-value">${application.full_name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${application.email}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Week:</span>
                <span class="detail-value">Week ${application.week_number}, ${application.year}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Submitted:</span>
                <span class="detail-value">${new Date(application.submitted_at).toLocaleString()}</span>
            </div>
            ${application.photo_url ? `
            <div class="detail-item">
                <span class="detail-label">Photo:</span>
                <div class="detail-value">
                    <img src="${application.photo_url}" alt="Application photo" class="photo-preview">
                </div>
            </div>
            ` : ''}
        `;
        
        // Dynamically add all form responses
        Object.entries(formResponses).forEach(([key, value]) => {
            let displayValue = value;
            
            // Format arrays (like sexual orientation)
            if (Array.isArray(value)) {
                displayValue = value.join(', ');
            }
            
            // Format dates
            if (key.toLowerCase().includes('date') || key === 'dateOfBirth') {
                try {
                    displayValue = new Date(value).toLocaleDateString();
                } catch (e) {
                    // Keep original value if date parsing fails
                }
            }
            
            // Convert camelCase to readable format
            const readableKey = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .replace(/([a-z])([A-Z])/g, '$1 $2');
            
            html += `
                <div class="detail-item">
                    <span class="detail-label">${readableKey}:</span>
                    <div class="detail-value">${displayValue}</div>
                </div>
            `;
        });
        
        html += `
            <div class="detail-item">
                <span class="detail-label">IP Address:</span>
                <span class="detail-value">${application.ip_address || 'Unknown'}</span>
            </div>
        `;
        
        modalBody.innerHTML = html;
        
        applicationModal.style.display = 'block';
    } catch (error) {
        console.error('Error viewing application:', error);
        showError('Failed to load application details');
    }
}

function closeModal() {
    applicationModal.style.display = 'none';
}

function applyFilters() {
    const weekFilter = document.getElementById('filterWeek').value;
    const yearFilter = document.getElementById('filterYear').value;
    
    filteredApplications = currentApplications.filter(app => {
        const weekMatch = !weekFilter || app.week_number.toString() === weekFilter;
        const yearMatch = !yearFilter || app.year.toString() === yearFilter;
        return weekMatch && yearMatch;
    });
    
    displayApplications();
}

function exportApplications() {
    try {
        const csvContent = generateCSV(filteredApplications);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `applications_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('Applications exported successfully!');
    } catch (error) {
        console.error('Error exporting applications:', error);
        showError('Failed to export applications');
    }
}

function generateCSV(applications) {
    const headers = [
        'Name', 'Email', 'Week', 'Year', 'Submitted', 
        'Photo URL', 'Answer 1', 'Answer 2', 'Answer 3', 'IP Address'
    ];
    
    const rows = applications.map(app => [
        app.full_name,
        app.email,
        app.week_number,
        app.year,
        app.submitted_at,
        app.photo_url || '',
        app.question1_answer,
        app.question2_answer,
        app.question3_answer || '',
        app.ip_address || ''
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    
    return csvContent;
}

// Settings functions
async function testConnection() {
    const button = document.getElementById('testConnection');
    button.disabled = true;
    button.textContent = 'Testing...';
    
    try {
        await supabaseClient.init();
        const result = await supabaseClient.getApplicationStats();
        
        if (result.success) {
            showSuccess('Connection successful!');
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        showError('Connection failed: ' + error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Test Connection';
    }
}

async function clearAllData() {
    if (!confirm('Are you sure you want to clear ALL application data? This action cannot be undone.')) {
        return;
    }
    
    if (!confirm('This will permanently delete all applications. Type "DELETE" to confirm.')) {
        return;
    }
    
    const confirmation = prompt('Type "DELETE" to confirm:');
    if (confirmation !== 'DELETE') {
        showError('Confirmation failed. No data was deleted.');
        return;
    }
    
    try {
        // This would require admin privileges in Supabase
        showError('This feature requires direct database access. Please use Supabase dashboard.');
    } catch (error) {
        console.error('Error clearing data:', error);
        showError('Failed to clear data');
    }
}

// Utility functions
function showSuccess(message) {
    // Create and show success notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 1001;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showError(message) {
    // Create and show error notification
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 1001;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Make viewApplication globally accessible
window.viewApplication = viewApplication;