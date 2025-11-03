// Daily Journal App JavaScript

class DailyJournal {
    constructor() {
        // Initialize Supabase client
        this.supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        this.user = null;
        this.entries = [];
        this.currentFilter = {
            text: '',
            type: 'all',
            date: '',
            time: ''
        };
        
        this.initializeApp();
    }

    async initializeApp() {
        // Check for password reset token in URL
        const urlHash = window.location.hash;
        if (urlHash.includes('type=recovery') || urlHash.includes('access_token')) {
            // User is coming from password reset link
            // Redirect to login page which will handle the password reset
            window.location.href = 'login.html' + urlHash;
            return;
        }
        
        // Check for existing session
        await this.checkAuth();
        
        // If not logged in, redirect to login page
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }
        
        // Initialize logged-in app
        await this.initializeLoggedInApp();
    }

    async initializeLoggedInApp() {
        // Set today's date and current time as default
        const now = new Date();
        document.getElementById('entryDate').value = now.toISOString().split('T')[0];
        document.getElementById('entryTime').value = now.toTimeString().slice(0, 5);
        
        // Event listeners
        document.getElementById('entryForm').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('entryType').addEventListener('change', (e) => this.toggleFeelingsDropdown(e.target.value));
        document.getElementById('searchBtn').addEventListener('click', () => this.searchEntries());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearSearch());
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.currentFilter.text = e.target.value;
            this.searchEntries();
        });
        document.getElementById('searchType').addEventListener('change', (e) => {
            this.currentFilter.type = e.target.value;
            this.searchEntries();
        });
        document.getElementById('searchDate').addEventListener('change', (e) => {
            this.currentFilter.date = e.target.value;
            this.searchEntries();
        });
        document.getElementById('searchTime').addEventListener('change', (e) => {
            this.currentFilter.time = e.target.value;
            this.searchEntries();
        });

        // Navigation event listeners
        document.getElementById('journalTab').addEventListener('click', () => this.showJournal());
        document.getElementById('dashboardTab').addEventListener('click', () => this.showDashboard());
        document.getElementById('helpTab').addEventListener('click', () => this.showHelp());
        
        // Dashboard event listeners
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('clearData').addEventListener('click', () => this.clearAllData());

        // Logout event listener
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Load and display entries
        await this.loadEntries();
        this.displayEntries();
    }

    // Authentication Methods
    async checkAuth() {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            this.user = session.user;
            this.updateAuthUI(true);
        } else {
            this.updateAuthUI(false);
        }
    }

    updateAuthUI(isLoggedIn) {
        // No longer needed since we redirect to login page
    }

    async logout() {
        await this.supabase.auth.signOut();
        this.user = null;
        this.entries = [];
        this.displayEntries();
        this.showNotification('Logged out successfully!', 'success');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }

    showError(message, errorDivId = 'authError') {
        const errorDiv = document.getElementById(errorDivId);
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    toggleFeelingsDropdown(entryType) {
        const wellnessGroup = document.getElementById('wellnessGroup');
        const exerciseGroup = document.getElementById('exerciseGroup');
        const exerciseDetailsGroup = document.getElementById('exerciseDetailsGroup');
        const socialGroup = document.getElementById('socialGroup');
        const learningGroup = document.getElementById('learningGroup');
        const creativeGroup = document.getElementById('creativeGroup');
        const careerGroup = document.getElementById('careerGroup');
        
        // Hide all groups first
        [wellnessGroup, exerciseGroup, exerciseDetailsGroup, socialGroup, learningGroup, creativeGroup, careerGroup].forEach(group => {
            group.style.display = 'none';
        });
        
        // Reset all required fields
        document.getElementById('exerciseSelect').required = false;
        
        // Show relevant group based on entry type
        switch(entryType) {
            case 'wellness':
                wellnessGroup.style.display = 'block';
                break;
            case 'exercise':
                exerciseGroup.style.display = 'block';
                exerciseDetailsGroup.style.display = 'block';
                document.getElementById('exerciseSelect').required = true;
                break;
            case 'social':
                socialGroup.style.display = 'block';
                break;
            case 'learning':
                learningGroup.style.display = 'block';
                break;
            case 'creative':
                creativeGroup.style.display = 'block';
                break;
            case 'career':
                careerGroup.style.display = 'block';
                break;
        }
        
        // Clear values when switching types
        if (entryType !== 'wellness') {
            document.getElementById('wellnessMood').value = '';
            document.getElementById('wellnessEnergy').value = '';
            document.getElementById('sleepHours').value = '';
            document.getElementById('sleepQuality').value = '';
        }
        if (entryType !== 'exercise') {
            document.getElementById('exerciseSelect').value = '';
            document.getElementById('exerciseDuration').value = '';
            document.getElementById('exerciseIntensity').value = '';
        }
        if (entryType !== 'social') {
            document.getElementById('socialType').value = '';
            document.getElementById('socialEnergy').value = '';
        }
        if (entryType !== 'learning') {
            document.getElementById('skillName').value = '';
            document.getElementById('learningTime').value = '';
            document.getElementById('skillStatus').value = '';
            document.getElementById('learningMethod').value = '';
        }
        if (entryType !== 'creative') {
            document.getElementById('creativeType').value = '';
            document.getElementById('creativeEnergy').value = '';
        }
        if (entryType !== 'career') {
            document.getElementById('careerActivity').value = '';
            document.getElementById('careerFeeling').value = '';
            document.getElementById('careerHours').value = '';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.user) {
            this.showNotification('Please login to add entries', 'error');
            return;
        }
        
        const formData = {
            user_id: this.user.id,
            type: document.getElementById('entryType').value,
            title: document.getElementById('entryTitle').value,
            content: document.getElementById('entryContent').value,
            date: document.getElementById('entryDate').value,
            time: document.getElementById('entryTime').value
        };

        // Add wellness data if it's a wellness entry
        if (formData.type === 'wellness') {
            formData.mood = document.getElementById('wellnessMood').value;
            formData.energy = document.getElementById('wellnessEnergy').value;
            formData.sleep_hours = document.getElementById('sleepHours').value;
            formData.sleep_quality = document.getElementById('sleepQuality').value;
        }

        // Add exercise data if it's an exercise entry
        if (formData.type === 'exercise') {
            formData.exercise_type = document.getElementById('exerciseSelect').value;
            formData.duration = document.getElementById('exerciseDuration').value;
            formData.intensity = document.getElementById('exerciseIntensity').value;
        }

        // Add social data if it's a social entry
        if (formData.type === 'social') {
            formData.social_type = document.getElementById('socialType').value;
            formData.social_energy = document.getElementById('socialEnergy').value;
        }

        // Add learning data if it's a learning entry
        if (formData.type === 'learning') {
            formData.skill_name = document.getElementById('skillName').value;
            formData.learning_time = document.getElementById('learningTime').value;
            formData.skill_status = document.getElementById('skillStatus').value;
            formData.learning_method = document.getElementById('learningMethod').value;
        }

        // Add creative data if it's a creative entry
        if (formData.type === 'creative') {
            formData.creative_type = document.getElementById('creativeType').value;
            formData.creative_energy = document.getElementById('creativeEnergy').value;
        }

        // Add career data if it's a career entry
        if (formData.type === 'career') {
            formData.career_activity = document.getElementById('careerActivity').value;
            formData.career_feeling = document.getElementById('careerFeeling').value;
            formData.career_hours = document.getElementById('careerHours').value;
        }

        // Add tags if provided
        const tagsInput = document.getElementById('entryTags').value.trim();
        if (tagsInput) {
            formData.tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }

        await this.addEntry(formData);
        this.clearForm();
    }

    async addEntry(entry) {
        try {
            const { data, error } = await this.supabase
                .from('entries')
                .insert([entry])
                .select();

            if (error) throw error;

            // Ensure entries array is initialized
            if (!this.entries) {
                this.entries = [];
            }

            // Add the new entry to our local array
            this.entries.unshift(data[0]);
            this.displayEntries();
            this.showNotification('Entry added successfully!', 'success');
        } catch (error) {
            console.error('Error adding entry:', error);
            this.showNotification('Error adding entry', 'error');
        }
    }

    clearForm() {
        document.getElementById('entryForm').reset();
        const now = new Date();
        document.getElementById('entryDate').value = now.toISOString().split('T')[0];
        document.getElementById('entryTime').value = now.toTimeString().slice(0, 5);
        
        // Clear tags input
        document.getElementById('entryTags').value = '';
        
        // Hide all tracker groups
        const groups = ['wellnessGroup', 'exerciseGroup', 'exerciseDetailsGroup', 'socialGroup', 'learningGroup', 'creativeGroup', 'careerGroup'];
        groups.forEach(groupId => {
            document.getElementById(groupId).style.display = 'none';
        });
        
        // Reset required fields
        document.getElementById('exerciseSelect').required = false;
    }

    searchEntries() {
        const searchText = this.currentFilter.text.toLowerCase();
        const searchType = this.currentFilter.type;
        const searchDate = this.currentFilter.date;
        const searchTime = this.currentFilter.time;

        const filteredEntries = this.entries.filter(entry => {
            const matchesText = !searchText || 
                entry.title.toLowerCase().includes(searchText) ||
                entry.content.toLowerCase().includes(searchText) ||
                (entry.tags && Array.isArray(entry.tags) && entry.tags.some(tag => tag.toLowerCase().includes(searchText))) ||
                (entry.mood && entry.mood.toLowerCase().includes(searchText)) ||
                (entry.energy && entry.energy.toLowerCase().includes(searchText)) ||
                (entry.sleep_quality && entry.sleep_quality.toLowerCase().includes(searchText)) ||
                (entry.exercise_type && entry.exercise_type.toLowerCase().includes(searchText)) ||
                (entry.intensity && entry.intensity.toLowerCase().includes(searchText)) ||
                (entry.social_type && entry.social_type.toLowerCase().includes(searchText)) ||
                (entry.social_energy && entry.social_energy.toLowerCase().includes(searchText)) ||
                (entry.skill_name && entry.skill_name.toLowerCase().includes(searchText)) ||
                (entry.skill_status && entry.skill_status.toLowerCase().includes(searchText)) ||
                (entry.learning_method && entry.learning_method.toLowerCase().includes(searchText)) ||
                (entry.creative_type && entry.creative_type.toLowerCase().includes(searchText)) ||
                (entry.creative_energy && entry.creative_energy.toLowerCase().includes(searchText)) ||
                (entry.career_activity && entry.career_activity.toLowerCase().includes(searchText)) ||
                (entry.career_feeling && entry.career_feeling.toLowerCase().includes(searchText));
            
            const matchesType = searchType === 'all' || entry.type === searchType;
            
            const matchesDate = !searchDate || entry.date === searchDate;
            
            const matchesTime = !searchTime || entry.time === searchTime;
            
            return matchesText && matchesType && matchesDate && matchesTime;
        });

        this.displayEntries(filteredEntries);
    }

    clearSearch() {
        this.currentFilter = { text: '', type: 'all', date: '', time: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('searchType').value = 'all';
        document.getElementById('searchDate').value = '';
        document.getElementById('searchTime').value = '';
        this.displayEntries();
    }

    displayEntries(entriesToShow = null) {
        const entries = entriesToShow || this.entries || [];
        const container = document.getElementById('entriesContainer');
        
        if (!container) {
            console.error('Entries container not found');
            return;
        }
        
        if (entries.length === 0) {
            container.innerHTML = '<p class="no-entries">No entries found. Try adjusting your search or add a new entry!</p>';
            return;
        }

        container.innerHTML = entries.map(entry => this.createEntryHTML(entry)).join('');
    }

    createEntryHTML(entry) {
        const typeLabels = {
            journal: '📝 Journal',
            wellness: '😊 Wellness',
            food: '🍽️ Food',
            exercise: '💪 Exercise',
            social: '👥 Social',
            learning: '📚 Learning',
            creative: '🎨 Creative',
            career: '💼 Career',
            events: '📅 Events'
        };

        const tagsHTML = (entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0) 
            ? `<div class="entry-tags">${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
            : '';

        const wellnessHTML = entry.mood || entry.energy || entry.sleep_hours || entry.sleep_quality
            ? `<div class="entry-wellness">
                <strong>Wellness:</strong>
                ${entry.mood ? `<span class="tracker-detail"> ${entry.mood}</span>` : ''}
                ${entry.energy ? `<span class="tracker-detail"> • ${entry.energy}</span>` : ''}
                ${entry.sleep_hours ? `<span class="tracker-detail"> • ${entry.sleep_hours}h sleep</span>` : ''}
                ${entry.sleep_quality ? `<span class="tracker-detail"> • ${entry.sleep_quality}</span>` : ''}
               </div>`
            : '';

        const exerciseHTML = entry.exercise_type 
            ? `<div class="entry-exercise">
                <strong>Exercise:</strong> ${entry.exercise_type}
                ${entry.duration ? `<span class="tracker-detail"> • ${entry.duration} min</span>` : ''}
                ${entry.intensity ? `<span class="tracker-detail"> • ${entry.intensity}</span>` : ''}
               </div>`
            : '';

        const socialHTML = entry.social_type || entry.social_energy
            ? `<div class="entry-social">
                <strong>Social:</strong>
                ${entry.social_type ? `<span class="tracker-detail"> ${entry.social_type}</span>` : ''}
                ${entry.social_energy ? `<span class="tracker-detail"> • ${entry.social_energy}</span>` : ''}
               </div>`
            : '';

        const learningHTML = entry.skill_name || entry.skill_status || entry.learning_method
            ? `<div class="entry-learning">
                <strong>Learning:</strong>
                ${entry.skill_name ? `<span class="tracker-detail"> ${entry.skill_name}</span>` : ''}
                ${entry.skill_status ? `<span class="tracker-detail"> • ${entry.skill_status}</span>` : ''}
                ${entry.learning_time ? `<span class="tracker-detail"> • ${entry.learning_time} min</span>` : ''}
                ${entry.learning_method ? `<span class="tracker-detail"> • ${entry.learning_method}</span>` : ''}
               </div>`
            : '';

        const creativeHTML = entry.creative_type || entry.creative_energy
            ? `<div class="entry-creative">
                <strong>Creative:</strong>
                ${entry.creative_type ? `<span class="tracker-detail"> ${entry.creative_type}</span>` : ''}
                ${entry.creative_energy ? `<span class="tracker-detail"> • ${entry.creative_energy}</span>` : ''}
               </div>`
            : '';

        const careerHTML = entry.career_activity || entry.career_feeling || entry.career_hours
            ? `<div class="entry-career">
                <strong>Career:</strong>
                ${entry.career_activity ? `<span class="tracker-detail"> ${entry.career_activity}</span>` : ''}
                ${entry.career_feeling ? `<span class="tracker-detail"> • ${entry.career_feeling}</span>` : ''}
                ${entry.career_hours ? `<span class="tracker-detail"> • ${entry.career_hours}h worked</span>` : ''}
               </div>`
            : '';

        const timeHTML = entry.time 
            ? `<span class="entry-time">${this.formatTime(entry.time)}</span>`
            : '';

        return `
            <div class="entry-card">
                <div class="entry-header">
                    <span class="entry-type ${entry.type}">${typeLabels[entry.type]}</span>
                    <div class="entry-datetime">
                        <span class="entry-date">${this.formatDate(entry.date)}</span>
                        ${timeHTML}
                    </div>
                </div>
                <div class="entry-title">${this.escapeHtml(entry.title)}</div>
                ${wellnessHTML}
                ${exerciseHTML}
                ${socialHTML}
                ${learningHTML}
                ${creativeHTML}
                ${careerHTML}
                <div class="entry-content">${this.escapeHtml(entry.content)}</div>
                ${tagsHTML}
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(timeString) {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : '#4299e1'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Supabase Database Methods
    async saveEntries() {
        // This method is no longer needed as we save individual entries
        // when they are created via handleSubmit
    }

    async loadEntries() {
        if (!this.user) {
            this.entries = [];
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('entries')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.entries = data || [];
        } catch (error) {
            console.error('Error loading entries:', error);
            this.entries = [];
            this.showNotification('Error loading entries', 'error');
        }
    }

    // Utility method to export entries (bonus feature)
    exportEntries() {
        const dataStr = JSON.stringify(this.entries, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `daily-journal-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Utility method to import entries (bonus feature)
    importEntries(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedEntries = JSON.parse(e.target.result);
                if (Array.isArray(importedEntries)) {
                    this.entries = [...importedEntries, ...this.entries];
                    this.saveEntries();
                    this.displayEntries();
                    this.showNotification('Entries imported successfully!', 'success');
                } else {
                    this.showNotification('Invalid file format', 'error');
                }
            } catch (error) {
                this.showNotification('Error importing entries', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Navigation Methods
    showJournal() {
        document.getElementById('journalTab').classList.add('active');
        document.getElementById('dashboardTab').classList.remove('active');
        document.getElementById('helpTab').classList.remove('active');
        document.querySelector('.main-content').style.display = 'grid';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('helpSection').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('dashboardTab').classList.add('active');
        document.getElementById('journalTab').classList.remove('active');
        document.getElementById('helpTab').classList.remove('active');
        document.querySelector('.main-content').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        document.getElementById('helpSection').style.display = 'none';
        this.updateDashboard();
    }

    showHelp() {
        document.getElementById('helpTab').classList.add('active');
        document.getElementById('journalTab').classList.remove('active');
        document.getElementById('dashboardTab').classList.remove('active');
        document.querySelector('.main-content').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('helpSection').style.display = 'block';
    }

    // Dashboard Methods
    updateDashboard() {
        this.updateSummaryCards();
        this.updateCharts();
        this.updateInsights();
    }

    updateSummaryCards() {
        const entries = this.entries;
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // This week's entries
        const weekEntries = entries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= weekAgo;
        });
        
        document.getElementById('weekEntries').textContent = weekEntries.length;
        
        // Average mood (from wellness entries)
        const wellnessEntries = entries.filter(entry => entry.type === 'wellness' && entry.mood);
        const moodValues = wellnessEntries.map(entry => {
            const mood = entry.mood;
            if (mood.includes('😊 Happy') || mood.includes('😍 Excited')) return 5;
            if (mood.includes('😌 Calm')) return 4;
            if (mood.includes('😴 Tired')) return 2;
            if (mood.includes('😢 Sad') || mood.includes('😠 Angry') || mood.includes('😰 Anxious')) return 1;
            return 3;
        });
        
        const avgMood = moodValues.length > 0 ? 
            (moodValues.reduce((a, b) => a + b, 0) / moodValues.length).toFixed(1) : '-';
        document.getElementById('avgMood').textContent = avgMood;
        
        // Average energy (from wellness entries)
        const energyValues = wellnessEntries.map(entry => {
            const energy = entry.energy;
            if (energy.includes('High (7-10)')) return 8.5;
            if (energy.includes('Medium (4-6)')) return 5;
            if (energy.includes('Low (1-3)')) return 2;
            return 0;
        }).filter(val => val > 0);
        
        const avgEnergy = energyValues.length > 0 ? 
            (energyValues.reduce((a, b) => a + b, 0) / energyValues.length).toFixed(1) : '-';
        document.getElementById('avgEnergy').textContent = avgEnergy;
        
        // Average sleep hours
        const sleepValues = wellnessEntries.map(entry => parseFloat(entry.sleep_hours)).filter(val => !isNaN(val));
        const avgSleep = sleepValues.length > 0 ? 
            (sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1) : '-';
        document.getElementById('avgSleep').textContent = avgSleep;
    }

    updateCharts() {
        this.createMoodEnergyChart();
        this.createActivityChart();
    }

    createMoodEnergyChart() {
        const ctx = document.getElementById('moodEnergyChart').getContext('2d');
        
        // Get last 7 days of wellness entries
        const now = new Date();
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            last7Days.push(date.toISOString().split('T')[0]);
        }
        
        const moodData = [];
        const energyData = [];
        
        last7Days.forEach(date => {
            const dayEntries = this.entries.filter(entry => 
                entry.date === date && entry.type === 'wellness'
            );
            
            if (dayEntries.length > 0) {
                const entry = dayEntries[0]; // Take first entry of the day
                const moodValue = entry.mood ? this.getMoodValue(entry.mood) : null;
                const energyValue = entry.energy ? this.getEnergyValue(entry.energy) : null;
                moodData.push(moodValue);
                energyData.push(energyValue);
            } else {
                moodData.push(null);
                energyData.push(null);
            }
        });
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })),
                datasets: [{
                    label: 'Mood',
                    data: moodData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: false
                }, {
                    label: 'Energy',
                    data: energyData,
                    borderColor: '#1e40af',
                    backgroundColor: 'rgba(30, 64, 175, 0.1)',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 2
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    createActivityChart() {
        const ctx = document.getElementById('activityChart').getContext('2d');
        
        // Count entries by type
        const activityCounts = {};
        this.entries.forEach(entry => {
            activityCounts[entry.type] = (activityCounts[entry.type] || 0) + 1;
        });
        
        const labels = Object.keys(activityCounts);
        const data = Object.values(activityCounts);
        const colors = {
            'wellness': '#3b82f6',
            'exercise': '#1e40af',
            'social': '#60a5fa',
            'learning': '#2563eb',
            'creative': '#1d4ed8',
            'career': '#f59e0b',
            'food': '#9f7aea',
            'event': '#38b2ac'
        };
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.map(type => type.charAt(0).toUpperCase() + type.slice(1)),
                datasets: [{
                    data: data,
                    backgroundColor: labels.map(type => colors[type] || '#718096'),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    getMoodValue(mood) {
        if (mood.includes('😊 Happy') || mood.includes('😍 Excited')) return 8;
        if (mood.includes('😌 Calm')) return 6;
        if (mood.includes('😴 Tired')) return 4;
        if (mood.includes('😢 Sad') || mood.includes('😠 Angry') || mood.includes('😰 Anxious')) return 2;
        return 5;
    }

    getEnergyValue(energy) {
        if (energy.includes('High (7-10)')) return 8.5;
        if (energy.includes('Medium (4-6)')) return 5;
        if (energy.includes('Low (1-3)')) return 2.5;
        return 0;
    }

    updateInsights() {
        const insightsList = document.getElementById('insightsList');
        const insights = this.generateInsights();
        
        insightsList.innerHTML = insights.map(insight => 
            `<div class="insight-item">${insight}</div>`
        ).join('');
    }

    generateInsights() {
        const insights = [];
        const entries = this.entries;
        
        if (entries.length === 0) {
            return ['Start logging entries to see insights!'];
        }
        
        // Most common activity
        const activityCounts = {};
        entries.forEach(entry => {
            activityCounts[entry.type] = (activityCounts[entry.type] || 0) + 1;
        });
        
        const mostCommonActivity = Object.keys(activityCounts).reduce((a, b) => 
            activityCounts[a] > activityCounts[b] ? a : b
        );
        insights.push(`Your most logged activity is <strong>${mostCommonActivity}</strong> (${activityCounts[mostCommonActivity]} entries)`);
        
        // Exercise streak
        const exerciseEntries = entries.filter(entry => entry.type === 'exercise');
        if (exerciseEntries.length > 0) {
            insights.push(`You've logged <strong>${exerciseEntries.length}</strong> exercise sessions`);
        }
        
        // Learning progress
        const learningEntries = entries.filter(entry => entry.type === 'learning');
        if (learningEntries.length > 0) {
            const totalLearningTime = learningEntries.reduce((sum, entry) => 
                sum + (parseInt(entry.learning_time) || 0), 0
            );
            insights.push(`Total learning time: <strong>${totalLearningTime} minutes</strong>`);
        }
        
        // Recent mood trend
        const recentWellness = entries.filter(entry => 
            entry.type === 'wellness' && entry.mood
        ).slice(-3);
        
        if (recentWellness.length >= 2) {
            const recentMoods = recentWellness.map(entry => this.getMoodValue(entry.mood));
            const trend = recentMoods[recentMoods.length - 1] > recentMoods[0] ? 'improving' : 'declining';
            insights.push(`Your mood trend is <strong>${trend}</strong> over the last few entries`);
        }
        
        return insights.slice(0, 4); // Limit to 4 insights
    }

    exportData() {
        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-journal-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    generateCSV() {
        const headers = ['Date', 'Time', 'Type', 'Title', 'Content', 'Mood', 'Energy', 'Sleep Hours', 'Sleep Quality', 'Exercise Type', 'Duration', 'Intensity', 'Social Type', 'Social Energy', 'Skill', 'Learning Time', 'Status', 'Learning Method', 'Creative Type', 'Creative Energy', 'Career Activity', 'Career Feeling', 'Career Hours'];
        const rows = [headers.join(',')];
        
        this.entries.forEach(entry => {
            const row = [
                entry.date || '',
                entry.time || '',
                entry.type || '',
                `"${(entry.title || '').replace(/"/g, '""')}"`,
                `"${(entry.content || '').replace(/"/g, '""')}"`,
                entry.mood || '',
                entry.energy || '',
                entry.sleep_hours || '',
                entry.sleep_quality || '',
                entry.exercise_type || '',
                entry.duration || '',
                entry.intensity || '',
                entry.social_type || '',
                entry.social_energy || '',
                entry.skill_name || '',
                entry.learning_time || '',
                entry.skill_status || '',
                entry.learning_method || '',
                entry.creative_type || '',
                entry.creative_energy || '',
                entry.career_activity || '',
                entry.career_feeling || '',
                entry.career_hours || ''
            ];
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }

    async clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            try {
                const { error } = await this.supabase
                    .from('entries')
                    .delete()
                    .eq('user_id', this.user.id);

                if (error) throw error;

                this.entries = [];
                this.displayEntries();
                this.updateDashboard();
                this.showNotification('All data cleared', 'success');
            } catch (error) {
                console.error('Error clearing data:', error);
                this.showNotification('Error clearing data', 'error');
            }
        }
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dailyJournal = new DailyJournal();
    
    // Add quick-add button functionality
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            const mood = e.target.dataset.mood;
            const energy = e.target.dataset.energy;
            const exercise = e.target.dataset.exercise;
            const duration = e.target.dataset.duration;
            const intensity = e.target.dataset.intensity;
            const social = e.target.dataset.social;
            const skill = e.target.dataset.skill;
            const time = e.target.dataset.time;
            const status = e.target.dataset.status;
            const creative = e.target.dataset.creative;
            
            // Set entry type
            document.getElementById('entryType').value = type;
            window.dailyJournal.toggleFeelingsDropdown(type);
            
            // Set title based on button text
            document.getElementById('entryTitle').value = e.target.textContent;
            
            // Set tracker-specific values
            if (type === 'wellness') {
                if (mood) document.getElementById('wellnessMood').value = mood;
                if (energy) document.getElementById('wellnessEnergy').value = energy;
            } else if (type === 'exercise') {
                if (exercise) document.getElementById('exerciseSelect').value = exercise;
                if (duration) document.getElementById('exerciseDuration').value = duration;
                if (intensity) document.getElementById('exerciseIntensity').value = intensity;
            } else if (type === 'social') {
                if (social) document.getElementById('socialType').value = social;
                if (energy) document.getElementById('socialEnergy').value = energy;
            } else if (type === 'learning') {
                if (skill) document.getElementById('skillName').value = skill;
                if (time) document.getElementById('learningTime').value = time;
                if (status) document.getElementById('skillStatus').value = status;
            } else if (type === 'creative') {
                if (creative) document.getElementById('creativeType').value = creative;
                if (energy) document.getElementById('creativeEnergy').value = energy;
            } else if (type === 'career') {
                const activity = e.target.dataset.activity;
                const feeling = e.target.dataset.feeling;
                const hours = e.target.dataset.hours;
                if (activity) document.getElementById('careerActivity').value = activity;
                if (feeling) document.getElementById('careerFeeling').value = feeling;
                if (hours) document.getElementById('careerHours').value = hours;
            }
            
            // Focus on content field for user to add details
            document.getElementById('entryContent').focus();
        });
    });
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const form = document.getElementById('entryForm');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.click();
        }
    }
});
