// === GOOGLE SHEETS CONFIGURATION ===
const SHEET_ID = '1Gpj_0729wCx9mgg0NS7OY9J_hnkzOCuwfNR7J6-pw6c';
const API_KEY = 'AIzaSyD6pyc_Aze3RK_CjSg7kgOZe0ks471ZUgk';

// Google Sheets URLs
const ANNOUNCEMENTS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Announcements!A2:G?key=${API_KEY}`;
const USER_REPORTS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/UserReports!A2:I?key=${API_KEY}`;
const MAP_DATA_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/MapData!A2:F?key=${API_KEY}`;

// === GOOGLE APPS SCRIPT CONFIGURATION ===
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJzmUZL8J8GCICo14JQb7mysnxBbf3_j8mejStLjTrgKg0GddoFeVIxIgTPwlnOFeFlA/exec";

// Global data arrays
let announcements = [];
let userReports = [];
let mapData = [];

// Load data from Google Sheets
async function loadData() {
    try {
        console.log("Loading data from Google Sheets...");
        
        const [announcementsRes, reportsRes, mapDataRes] = await Promise.all([
            fetch(ANNOUNCEMENTS_URL),
            fetch(USER_REPORTS_URL),
            fetch(MAP_DATA_URL)
        ]);

        // Check if responses are OK
        if (!announcementsRes.ok) throw new Error(`Announcements: ${announcementsRes.status}`);
        if (!reportsRes.ok) throw new Error(`UserReports: ${reportsRes.status}`);
        if (!mapDataRes.ok) throw new Error(`MapData: ${mapDataRes.status}`);

        const announcementsData = await announcementsRes.json();
        const reportsData = await reportsRes.json();
        const mapDataResponse = await mapDataRes.json();

        // Convert sheet data to objects
        announcements = (announcementsData.values || []).map(row => ({
            id: parseInt(row[0]),
            title: row[1],
            content: row[2],
            type: row[3],
            date: row[4],
            author: row[5],
            priority: row[6]
        }));

        userReports = (reportsData.values || []).map(row => ({
            id: row[0],
            incidentType: row[1],
            location: row[2],
            description: row[3],
            timestamp: row[4],
            status: row[5],
            anonymous: row[6] === 'true',
            contact: row[7],
            adminNotes: row[8]
        }));

        mapData = (mapDataResponse.values || []).map(row => ({
            reportId: row[0],
            latitude: parseFloat(row[1]),
            longitude: parseFloat(row[2]),
            type: row[3],
            status: row[4],
            timestamp: row[5]
        }));

        console.log("✅ User data loaded successfully from Google Sheets!");
        
        // Render announcements for users
        renderUserAnnouncements();
        
    } catch (error) {
        console.error('❌ Google Sheets Error:', error);
        console.log('🔄 Using fallback data...');
        loadFallbackData();
    }
}

// Fallback demo data
function loadFallbackData() {
    announcements = [
        {
            id: 1,
            title: 'Welcome to NotiZAR!',
            content: 'Community protection system demo',
            type: 'info',
            date: '2025-01-21',
            author: 'Admin',
            priority: 'medium'
        }
    ];
    
    userReports = [];
    mapData = [];
}

// === APPS SCRIPT INTEGRATION FOR USER REPORTS ===
async function addUserReport(incidentType, location, description, anonymous = false, contact = '', coordinates = null) {
    const newReport = {
        id: 'UR-' + Date.now(),
        incidentType,
        location,
        description,
        timestamp: new Date().toLocaleString(),
        status: 'pending',
        anonymous: anonymous ? 'true' : 'false',
        contact,
        adminNotes: '',
        latitude: coordinates ? coordinates.lat : '',
        longitude: coordinates ? coordinates.lng : ''
    };

    try {
        const params = new URLSearchParams({
            action: 'addUserReport',
            id: newReport.id,
            incidentType: newReport.incidentType,
            location: newReport.location,
            description: newReport.description,
            timestamp: newReport.timestamp,
            status: newReport.status,
            anonymous: newReport.anonymous,
            contact: newReport.contact,
            adminNotes: newReport.adminNotes,
            latitude: newReport.latitude,
            longitude: newReport.longitude
        });

        const url = `${APPS_SCRIPT_URL}?${params}`;
        
        console.log('Sending user report to Apps Script:', url);
        
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            userReports.unshift(newReport);
            showNotification('Report submitted successfully! Authorities have been notified.', 'success');
            
            // Update user's report history
            renderUserReportHistory();
            
            return newReport;
        } else {
            throw new Error(result.error || 'Unknown error');
        }

    } catch (error) {
        console.error('Error saving report to Apps Script:', error);
        // Fallback to local storage
        userReports.unshift(newReport);
        showNotification('Report saved locally (connection issue)', 'warning');
        return newReport;
    }
}

// === USER ANNOUNCEMENTS SYSTEM ===
function renderUserAnnouncements() {
    const announcementsContainer = document.getElementById('userAnnouncements');
    const announcementsBadge = document.getElementById('announcementsBadge');
    
    if (!announcementsContainer) return;
    
    // Filter and sort announcements (show newest first)
    const recentAnnouncements = announcements
        .filter(announcement => announcement.priority !== 'low') // Show only medium/high priority
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5); // Show only 5 most recent

    // Update badge count
    if (announcementsBadge && recentAnnouncements.length > 0) {
        announcementsBadge.textContent = recentAnnouncements.length;
        announcementsBadge.style.display = 'flex';
    }

    announcementsContainer.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="p-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                    <i class="fas fa-bullhorn text-blue-600 mr-2"></i>
                    Community Announcements
                    ${recentAnnouncements.length > 0 ? 
                        `<span class="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${recentAnnouncements.length} new</span>` : 
                        ''
                    }
                </h3>
            </div>
            
            <div class="divide-y divide-gray-100">
                ${recentAnnouncements.length > 0 ? 
                    recentAnnouncements.map(announcement => `
                        <div class="p-4 hover:bg-gray-50 transition-colors announcement-item ${announcement.priority === 'high' ? 'border-l-4 border-red-500' : announcement.priority === 'medium' ? 'border-l-4 border-yellow-500' : ''}">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-semibold text-gray-900">${announcement.title}</h4>
                                <span class="text-xs ${announcement.priority === 'high' ? 'bg-red-100 text-red-800' : announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'} px-2 py-1 rounded-full">
                                    ${announcement.priority}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">${announcement.content}</p>
                            <div class="flex justify-between items-center text-xs text-gray-500">
                                <span>By: ${announcement.author}</span>
                                <span>${announcement.date}</span>
                            </div>
                        </div>
                    `).join('') :
                    `
                    <div class="p-8 text-center text-gray-500">
                        <i class="fas fa-bullhorn text-3xl mb-3 text-gray-300"></i>
                        <p>No announcements at the moment</p>
                        <p class="text-sm mt-1">Check back later for community updates</p>
                    </div>
                    `
                }
            </div>
            
            ${recentAnnouncements.length > 0 ? `
                <div class="p-3 bg-gray-50 border-t border-gray-200 text-center">
                    <button onclick="showAllAnnouncements()" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View All Announcements
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// === USER REPORT HISTORY ===
function renderUserReportHistory() {
    const reportHistoryContainer = document.getElementById('userReportHistory');
    
    if (!reportHistoryContainer) return;
    
    // Get user's reports (in a real app, you'd filter by user ID)
    const userReportHistory = userReports.slice(0, 10); // Show last 10 reports

    reportHistoryContainer.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="p-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                    <i class="fas fa-history text-green-600 mr-2"></i>
                    Your Report History
                </h3>
            </div>
            
            <div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                ${userReportHistory.length > 0 ? 
                    userReportHistory.map(report => `
                        <div class="p-4 hover:bg-gray-50 transition-colors">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-medium text-gray-900">${report.incidentType}</h4>
                                <span class="text-xs ${getStatusColor(report.status)} px-2 py-1 rounded-full">
                                    ${report.status}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">${report.location}</p>
                            <p class="text-xs text-gray-500 mb-2">${report.description}</p>
                            <div class="flex justify-between items-center text-xs text-gray-500">
                                <span>${report.timestamp}</span>
                                ${report.adminNotes ? `
                                    <button onclick="showReportNotes('${report.id}')" class="text-blue-600 hover:text-blue-800">
                                        View Notes
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('') :
                    `
                    <div class="p-8 text-center text-gray-500">
                        <i class="fas fa-file-alt text-3xl mb-3 text-gray-300"></i>
                        <p>No reports submitted yet</p>
                        <p class="text-sm mt-1">Your submitted reports will appear here</p>
                    </div>
                    `
                }
            </div>
        </div>
    `;
}

// === UTILITY FUNCTIONS ===

function checkForNewAlerts() {
    // Check if there are any high-priority announcements from the last 24 hours
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const highPriorityAlerts = announcements.filter(announcement => {
        const announcementDate = new Date(announcement.date);
        return announcement.priority === 'high' && announcementDate > last24Hours;
    });

    // Show notification if there are high priority alerts
    if (highPriorityAlerts.length > 0) {
        showAlertNotification(highPriorityAlerts);
    }
}

function showAlertNotification(alerts) {
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showBrowserNotification(alerts);
            }
        });
    } else if (Notification.permission === 'granted') {
        showBrowserNotification(alerts);
    }

    // Always show in-app notification
    showInAppAlertNotification(alerts);
}

function showBrowserNotification(alerts) {
    if (alerts.length === 1) {
        new Notification('NotiZAR - High Priority Alert', {
            body: `${alerts[0].title}: ${alerts[0].content}`,
            icon: '/logo.png',
            tag: 'notizar-alert'
        });
    } else {
        new Notification('NotiZAR - Multiple Alerts', {
            body: `You have ${alerts.length} high priority alerts`,
            icon: '/logo.png',
            tag: 'notizar-alert'
        });
    }
}

function showInAppAlertNotification(alerts) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 border-red-500 bg-red-50 text-red-800 max-w-md';
    notification.innerHTML = `
        <div class="flex items-start">
            <i class="fas fa-exclamation-triangle mr-2 mt-1"></i>
            <div>
                <h4 class="font-semibold">High Priority Alert${alerts.length > 1 ? 's' : ''}</h4>
                <p class="text-sm mt-1">${alerts.length} new high priority announcement${alerts.length > 1 ? 's' : ''}</p>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-red-600 hover:text-red-800 text-sm font-medium mt-2">
                    Dismiss
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}


function getStatusColor(status) {
    switch(status.toLowerCase()) {
        case 'resolved': return 'bg-green-100 text-green-800';
        case 'investigating': return 'bg-yellow-100 text-yellow-800';
        case 'pending': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 ${
        type === 'success' ? 'bg-green-50 border-green-400 text-green-800' : 
        type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' : 
        'bg-red-50 border-red-400 text-red-800'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' : 
                type === 'warning' ? 'fa-exclamation-triangle' : 
                'fa-exclamation-circle'
            } mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function showAllAnnouncements() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div class="p-6 border-b border-gray-200">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-semibold text-gray-900">All Community Announcements</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="divide-y divide-gray-100">
                ${announcements.map(announcement => `
                    <div class="p-6 ${announcement.priority === 'high' ? 'bg-red-50' : announcement.priority === 'medium' ? 'bg-yellow-50' : ''}">
                        <div class="flex justify-between items-start mb-3">
                            <h4 class="font-semibold text-gray-900 text-lg">${announcement.title}</h4>
                            <span class="text-xs ${announcement.priority === 'high' ? 'bg-red-100 text-red-800' : announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'} px-2 py-1 rounded-full">
                                ${announcement.priority}
                            </span>
                        </div>
                        <p class="text-gray-600 mb-3">${announcement.content}</p>
                        <div class="flex justify-between items-center text-sm text-gray-500">
                            <span><strong>By:</strong> ${announcement.author}</span>
                            <span><strong>Date:</strong> ${announcement.date}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showReportNotes(reportId) {
    const report = userReports.find(r => r.id === reportId);
    if (!report || !report.adminNotes) return;
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div class="p-6 border-b border-gray-200">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-semibold text-gray-900">Admin Notes</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="p-6">
                <div class="mb-4">
                    <h4 class="font-medium text-gray-900 mb-2">${report.incidentType}</h4>
                    <p class="text-sm text-gray-600">${report.location}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h5 class="font-medium text-gray-900 mb-2">Admin Response:</h5>
                    <p class="text-gray-700">${report.adminNotes}</p>
                </div>
                <div class="mt-4 flex justify-between items-center text-sm text-gray-500">
                    <span>Status: <span class="${getStatusColor(report.status)} px-2 py-1 rounded-full">${report.status}</span></span>
                    <span>${report.timestamp}</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}


// === USER FORM HANDLING ===
function initializeUserForm() {
    const form = document.getElementById("reportForm");
    const locationBtn = document.getElementById("getLocationBtn");
    
    if (locationBtn) {
        locationBtn.addEventListener("click", async () => {
            try {
                const location = await getUserLocation();
                document.getElementById("locationInput").value = `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
                showNotification('Location acquired successfully!', 'success');
            } catch (error) {
                showNotification('Unable to get your location. Please enter it manually.', 'error');
            }
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            try {
                // Get form values - UPDATED to match your form structure
                const incidentType = document.getElementById("incidentType")?.value || "Suspicious Activity";
                const location = document.getElementById("locationInput")?.value || document.getElementById("location")?.value;
                const description = document.getElementById("descriptionInput")?.value || document.getElementById("report")?.value;
                const anonymous = document.getElementById("anonymous")?.checked || false;
                const contact = document.querySelector('input[type="email"]')?.value || document.querySelector('input[type="text"]')?.value || '';

                // Validation
                if (!location || !description) {
                    showNotification('Please fill in all required fields.', 'error');
                    return;
                }

                // Get coordinates if available
                let coordinates = null;
                if (location.includes(',')) {
                    const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
                    if (!isNaN(lat) && !isNaN(lng)) {
                        coordinates = { lat, lng };
                    }
                }

                // Use the new Apps Script function
                const result = await addUserReport(
                    incidentType, 
                    location, 
                    description, 
                    anonymous, 
                    contact, 
                    coordinates
                );

                if (result) {
                    showNotification('Report submitted successfully! Authorities have been notified.', 'success');
                    
                    // Clear form
                    form.reset();
                }

            } catch (error) {
                console.error("Unexpected error:", error);
                showNotification('Unexpected error occurred. Please try again.', 'error');
            }
        });
    }
}

// Get user location for reports
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser.'));
        } else {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    reject(error);
                }
            );
        }
    });
}

// === REAL-TIME UPDATES (POLLING) ===
let updateInterval;

function startRealTimeUpdates() {
    // Check for updates every 30 seconds
    updateInterval = setInterval(async () => {
        try {
            const previousAnnouncementsCount = announcements.length;
            await loadData(); // This will refresh announcements and reports
            
            // Check if new announcements were added
            if (announcements.length > previousAnnouncementsCount) {
                const newCount = announcements.length - previousAnnouncementsCount;
                showNotification(`${newCount} new announcement${newCount > 1 ? 's' : ''} available!`, 'success');
                
                // Check for high priority alerts
                checkForNewAlerts();
                
                // Request browser notification permission
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }, 30000); // 30 seconds
}

function stopRealTimeUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}

// === AUTO-INITIALIZE ===
if (typeof window !== 'undefined') {
    window.EndUser = { 
        addUserReport,
        loadData,
        initializeUserForm,
        getUserLocation,
        showAllAnnouncements,
        showReportNotes,
        startRealTimeUpdates,
        stopRealTimeUpdates
    };
    
    // Auto-initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', async () => {
        console.log("DOM loaded, initializing EndUser...");
        
        // Load data from Google Sheets first
        await loadData();
        
        // Initialize form if present
        setTimeout(() => {
            if (document.getElementById("reportForm")) {
                initializeUserForm();
                console.log("User form initialized successfully");
            }
            
            // Initialize report history if present
            if (document.getElementById("userReportHistory")) {
                renderUserReportHistory();
            }
            
            // Start real-time updates
            startRealTimeUpdates();
        }, 100);
    });
}

// Clean up on page unload
window.addEventListener('beforeunload', stopRealTimeUpdates);
 
        // State management
        let activeView = 'home';
        let mapInstance = null;
        let mapMarkers = [];
        let charts = {};
        let reportIdCounter = 1000;
        
        // Data
        const recentActivity = [
            {
                id: 1,
                type: 'sensor_alert',
                location: 'Hatfield Area',
                time: '15 minutes ago',
                status: 'resolved',
                message: 'Sensor tampering detected - Police dispatched and situation resolved'
            },
            {
                id: 2,
                type: 'community_report',
                location: 'Sunnyside',
                time: '1 hour ago',
                status: 'investigating',
                message: 'Suspicious vehicle spotted near electrical infrastructure'
            },
            {
                id: 3,
                type: 'prevention',
                location: 'Brooklyn',
                time: '3 hours ago',
                status: 'prevented',
                message: 'Community alert scared off potential cable thieves'
            }
        ];

        const watchGroups = [
            { name: 'Hatfield Neighbourhood Watch', members: 234, active: true },
            { name: 'Sunnyside Community Guard', members: 187, active: true },
            { name: 'Brooklyn Safety Network', members: 156, active: false },
            { name: 'Arcadia Protection Team', members: 203, active: true }
        ];

        let recentIncidents = [
            {
                id: 'CG-2025-0147',
                type: 'Cable Theft',
                location: 'Hatfield, University Road',
                status: 'resolved',
                priority: 'high',
                timestamp: '2025-01-21 14:30',
                responseTime: '8 minutes',
                coordinates: [-25.7479, 28.2293]
            },
            {
                id: 'CG-2025-0146',
                type: 'Suspicious Activity',
                location: 'Sunnyside, Esselen Street',
                status: 'investigating',
                priority: 'medium',
                timestamp: '2025-01-21 13:15',
                responseTime: '12 minutes',
                coordinates: [-25.7521, 28.2315]
            },
            {
                id: 'CG-2025-0145',
                type: 'Sensor Alert',
                location: 'Brooklyn, Bronkhorst Street',
                status: 'resolved',
                priority: 'high',
                timestamp: '2025-01-21 11:45',
                responseTime: '6 minutes',
                coordinates: [-25.7583, 28.2357]
            }
        ];

        const sensorStatus = [
            { zone: 'Hatfield', total: 45, active: 44, offline: 1, alerts: 2 },
            { zone: 'Sunnyside', total: 38, active: 36, offline: 2, alerts: 1 },
            { zone: 'Brooklyn', total: 42, active: 42, offline: 0, alerts: 0 },
            { zone: 'Arcadia', total: 22, active: 21, offline: 1, alerts: 1 }
        ];

        // Video surveillance data
        const videoCameras = [
            {
                id: 1,
                name: 'Hatfield Main Street Camera',
                location: 'Hatfield, Main Street & Burnett St',
                coordinates: [-25.7479, 28.2293],
                status: 'live',
                type: 'public',
                lastActivity: '5 minutes ago',
                recording: true
            },
            {
                id: 2,
                name: 'Sunnyside Substation Camera',
                location: 'Sunnyside, Electrical Substation',
                coordinates: [-25.7521, 28.2315],
                status: 'recording',
                type: 'infrastructure',
                lastActivity: '12 minutes ago',
                recording: true
            },
            {
                id: 3,
                name: 'Brooklyn Park Camera',
                location: 'Brooklyn, Public Park',
                coordinates: [-25.7583, 28.2357],
                status: 'offline',
                type: 'public',
                lastActivity: '2 hours ago',
                recording: false
            },
            {
                id: 4,
                name: 'Arcadia Residential Camera',
                location: 'Arcadia, Residential Area',
                coordinates: [-25.7425, 28.2271],
                status: 'live',
                type: 'community',
                lastActivity: 'Just now',
                recording: true
            },
            {
                id: 5,
                name: 'University Road Camera',
                location: 'Hatfield, University Road',
                coordinates: [-25.7502, 28.2328],
                status: 'live',
                type: 'traffic',
                lastActivity: '3 minutes ago',
                recording: true
            },
            {
                id: 6,
                name: 'Sunnyside Market Camera',
                location: 'Sunnyside, Market Square',
                coordinates: [-25.7547, 28.2291],
                status: 'recording',
                type: 'commercial',
                lastActivity: '8 minutes ago',
                recording: true
            }
        ];

        // AI Prediction Data
        const aiPredictions = [
            { zone: 'Hatfield', risk: 'High', probability: 0.78, factors: ['Recent incidents', 'Time of day', 'Infrastructure density'] },
            { zone: 'Sunnyside', risk: 'Medium', probability: 0.45, factors: ['Moderate activity', 'Community patrols'] },
            { zone: 'Brooklyn', risk: 'Low', probability: 0.22, factors: ['Low recent activity', 'High patrol density'] },
            { zone: 'Arcadia', risk: 'Medium', probability: 0.52, factors: ['Recent sensor alerts', 'Moderate patrols'] }
        ];

        // Utility functions
        function navigateTo(view) {
            activeView = view;
            render();
        }

        function toggleSidebar() {
            document.querySelector('.sidebar').classList.toggle('active');
            document.querySelector('.sidebar-overlay').classList.toggle('active');
        }

        function closeSidebar() {
            document.querySelector('.sidebar').classList.remove('active');
            document.querySelector('.sidebar-overlay').classList.remove('active');
        }

        function renderHeader() {
            const header = document.createElement('header');
            header.className = 'header';
            header.innerHTML = `
                <div class="header-content">
                    <div class="flex items-center space-x-3">
                        <button class="sidebar-toggle" onclick="toggleSidebar()">
                            <i class="fas fa-bars"></i>
                        </button>
                        <div class="logo">
                            <div class="logo-icon">
                                <!-- Logo image would go here -->
                                <img src="Picture1.png">
                                
                            </div>
                            <div>
                                <h1 class="text-xl font-bold text-gray-900">NotiZAR</h1>
                                <p class="text-sm text-gray-600">Community Protection</p>
                            </div>
                        </div>
                    </div>

                    <nav class="nav">
                        <button onclick="navigateTo('home')" class="px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'home' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}">
                            <i class="fas fa-home mr-2"></i>
                            Home
                        </button>
                        <button onclick="navigateTo('report')" class="px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'report' ? 'bg-red-100 text-red-700' : 'text-gray-700 hover:text-red-600 hover:bg-gray-100'}">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Report Emergency
                        </button>
                        <button onclick="navigateTo('community')" class="px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'community' ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:text-green-600 hover:bg-gray-100'}">
                            <i class="fas fa-users mr-2"></i>
                            Community
                        </button>
                        
                        <button onclick="navigateTo('ai')" class="px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'ai' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:text-purple-600 hover:bg-gray-100'}">
                            <i class="fas fa-brain mr-2"></i>
                            AI Predictions
                        </button>
                    </nav>

                    <div class="flex items-center space-x-4">
                        <button class="text-gray-700 hover:text-blue-600">
                            <i class="fas fa-bell"></i>
                        </button>
                        <div class="flex items-center space-x-2">
                            <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                U
                            </div>
                            <span class="text-sm font-medium">User</span>
                        </div>
                    </div>
                </div>
            `;
            return header;
        }

        function renderFooter() {
            const footer = document.createElement('footer');
            footer.className = 'footer';
            footer.innerHTML = `
                <div class="container">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div class="col-span-1 md:col-span-2">
                            <div class="flex items-center space-x-3 mb-4">
                                <div class="bg-blue-600 p-2 rounded-lg">
                                    <i class="fas fa-shield-alt text-white"></i>
                                </div>
                                <div>
                                    <h3 class="text-lg font-bold text-white" >NotiZAR</h3>
                                    <p class="text-sm text-gray-400">Community Protection</p>
                                </div>
                            </div>
                            <p class="text-gray-400 mb-4">
                                Protecting Tshwane's infrastructure through community engagement, smart technology, 
                                and real-time monitoring. Together, we're building safer neighborhoods.
                            </p>
                            <div class="flex space-x-4">
                                <button class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                                    Emergency: 10177
                                </button>
                                <button class="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors">
                                    Report Non-Emergency
                                </button>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-lg font-semibold mb-4 text-white">Quick Links</h4>
                            <ul class="space-y-2 text-gray-400">
                                <li><a href="#" class="hover:text-white transition-colors">Report Emergency</a></li>
                                <li><a href="#" class="hover:text-white transition-colors">Join Community</a></li>
                                <li><a href="#" class="hover:text-white transition-colors">Live Map</a></li>
                                <li><a href="#" class="hover:text-white transition-colors">Safety Tips</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 class="text-lg font-semibold mb-4 text-white">Contact</h4>
                            <div class="space-y-3 text-gray-400">
                                <div class="flex items-center">
                                    <i class="fas fa-phone mr-2"></i>
                                    <span>012 358 0000</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-envelope mr-2"></i>
                                    <span>info@NotiZAR.co.za</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-map-marker-alt mr-2"></i>
                                    <span>City of Tshwane<br>Pretoria, South Africa</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
                        <div class="text-gray-400 text-sm mb-4 md:mb-0">
                            © 2025 NotiZAR. All rights reserved. | Privacy Policy | Terms of Service
                        </div>
                        <div class="flex space-x-6 text-sm text-gray-400">
                            <span><i class="fas fa-lock mr-1"></i> Encrypted & Secure</span>
                            <span><i class="fas fa-mobile-alt mr-1"></i> Data-Free Access</span>
                        </div>
                    </div>
                </div>
            `;
            return footer;
        }

  
        function renderHome() {
    const main = document.createElement('main');
    main.className = 'container';
    main.innerHTML = `
        <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900">Community Safety Dashboard</h2>
            <p class="text-gray-600">Welcome back! Here's the latest from your area.</p>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-600">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-700">Active Incidents</h3>
                        <p class="text-3xl font-bold text-gray-900">2</p>
                    </div>
                    <div class="bg-red-100 p-3 rounded-lg">
                        <i class="fas fa-exclamation-triangle text-red-600"></i>
                    </div>
                </div>
                <p class="text-sm text-gray-500 mt-2">In Hatfield & Sunnyside</p>
            </div>

            <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-700">Sensors Active</h3>
                        <p class="text-3xl font-bold text-gray-900">143</p>
                    </div>
                    <div class="bg-green-100 p-3 rounded-lg">
                        <i class="fas fa-wifi text-green-600"></i>
                    </div>
                </div>
                <p class="text-sm text-gray-500 mt-2">4 zones covered</p>
            </div>

            <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-700">Response Time</h3>
                        <p class="text-3xl font-bold text-gray-900">8.4 min</p>
                    </div>
                    <div class="bg-blue-100 p-3 rounded-lg">
                        <i class="fas fa-clock text-blue-600"></i>
                    </div>
                </div>
                <p class="text-sm text-gray-500 mt-2">Average this month</p>
            </div>

            <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-600">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-700">Prevented</h3>
                        <p class="text-3xl font-bold text-gray-900">14</p>
                    </div>
                    <div class="bg-purple-100 p-3 rounded-lg">
                        <i class="fas fa-shield-check text-purple-600"></i>
                    </div>
                </div>
                <p class="text-sm text-gray-500 mt-2">Incidents this month</p>
            </div>
        </div>

        <!-- Admin Announcements Section -->
        <div class="side-by-side gap-8 mb-8">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-900 flex items-center">
                        <i class="fas fa-bullhorn text-blue-600 mr-2"></i>
                        Admin Announcements
                        ${announcements.length > 0 ? 
                            `<span class="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${announcements.length} new</span>` : 
                            ''
                        }
                    </h3>
                    <button onclick="showAllAnnouncements()" class="text-blue-600 hover:text-blue-800 text-sm font-medium">View All</button>
                </div>
                <div class="space-y-4" id="announcementsContainer">
                    <!-- Announcements will be loaded here dynamically -->
                </div>
            </div>

            <!-- Recent Activity Section -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-900">Recent Activity</h3>
                    <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">View All</button>
                </div>
                <div class="space-y-4">
                    ${recentActivity.map(item => `
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex justify-between items-start">
                                <div class="flex items-start space-x-3">
                                    <div class="mt-1">
                                        ${item.type === 'sensor_alert' ? 
                                            '<div class="bg-red-100 p-2 rounded-full"><i class="fas fa-wifi text-red-600"></i></div>' : 
                                            item.type === 'community_report' ? 
                                            '<div class="bg-blue-100 p-2 rounded-full"><i class="fas fa-users text-blue-600"></i></div>' : 
                                            '<div class="bg-green-100 p-2 rounded-full"><i class="fas fa-shield-check text-green-600"></i></div>'
                                        }
                                    </div>
                                    <div>
                                        <h4 class="font-medium text-gray-900">${item.location}</h4>
                                        <p class="text-sm text-gray-600">${item.message}</p>
                                        <div class="flex items-center mt-2">
                                            <span class="text-xs ${item.status === 'resolved' ? 'bg-green-100 text-green-800' : item.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'} px-2 py-1 rounded-full">${item.status}</span>
                                            <span class="text-xs text-gray-500 ml-2">${item.time}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Community Watch Section -->
        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-semibold text-gray-900">Community Watch</h3>
                <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">Join Group</button>
            </div>
            <div class="space-y-4">
                ${watchGroups.map(group => `
                    <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="font-medium text-gray-900">${group.name}</h4>
                                <div class="flex items-center mt-2">
                                    <span class="text-xs ${group.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} px-2 py-1 rounded-full">${group.active ? 'Active' : 'Inactive'}</span>
                                    <span class="text-xs text-gray-500 ml-2">${group.members} members</span>
                                </div>
                            </div>
                            <button class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Emergency Reporting CTA -->
        <div class="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 rounded-xl shadow-lg p-8 text-white">
            <div class="max-w-3xl">
                <h3 class="text-2xl font-bold mb-4">Report Suspicious Activity</h3>
                <p class="mb-6">See something that doesn't look right? Report it immediately and help prevent cable theft in your community.</p>
                <div class="flex flex-col sm:flex-row gap-4">
                    <button onclick="navigateTo('report')" class="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Emergency Report
                    </button>
                    <button class="bg-white hover:bg-gray-100 text-blue-900 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center">
                        <i class="fas fa-clipboard-list mr-2"></i>
                        Non-Emergency Report
                    </button>
                </div>
            </div>
        </div>
    `;

    // Load announcements after DOM is rendered
    setTimeout(() => {
        renderAnnouncements();
        checkForNewAlerts();
    }, 50);

    return main;
}

        function renderReport() {
            const main = document.createElement('main');
            main.className = 'container';
            main.innerHTML = `
                <div class="mb-8 text-center">
                    <h2 class="text-3xl font-bold text-gray-900">Report an Incident</h2>
                    <p class="text-gray-600">Help keep your community safe by reporting suspicious activity or emergencies</p>
                </div>

                <div class="side-by-side gap-8">
                    <div class="bg-white rounded-xl shadow-md overflow-hidden">
                        <div class="bg-red-600 p-6 text-white">
                            <div class="flex items-center">
                                <i class="fas fa-exclamation-triangle text-2xl mr-3"></i>
                                <h3 class="text-xl font-semibold">Emergency Reporting</h3>
                            </div>
                            <p class="mt-2">For crimes in progress or immediate danger, call emergency services first</p>
                        </div>

                        <div class="p-6">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                    <i class="fas fa-phone text-3xl text-red-600 mx-auto mb-2"></i>
                                    <h4 class="font-semibold text-red-800">Emergency Services</h4>
                                    <p class="text-red-600 font-mono text-xl mt-2">10177</p>
                                </div>

                                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                    <i class="fas fa-shield-alt text-3xl text-blue-600 mx-auto mb-2"></i>
                                    <h4 class="font-semibold text-blue-800">NotiZAR Hotline</h4>
                                    <p class="text-blue-600 font-mono text-xl mt-2">012 358 9999</p>
                                </div>
                            </div>

                            <div class="border-t border-gray-200 pt-6">
                                <h4 class="text-lg font-semibold text-gray-900 mb-4">Report Non-Emergency Incident</h4>
                                <form id="reportForm" class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
                                        <select id="incidentType" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                                            <option>Suspicious Activity</option>
                                            <option>Attempted Cable Theft</option>
                                            <option>Vandalism</option>
                                            <option>Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                        <input id="locationInput" type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Enter location or address">
                                        <button type="button" id="getLocationBtn" class="location-button">
                                            <i class="fas fa-map-marker-alt mr-1"></i>
                                            Use My Location
                                        </button>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea id="descriptionInput" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Describe what you saw"></textarea>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Your Name (Optional)</label>
                                            <input type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                        </div>

                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Contact (Optional)</label>
                                            <input type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                        </div>
                                    </div>

                                    <div class="flex items-center">
                                        <input type="checkbox" id="anonymous" class="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded">
                                        <label for="anonymous" class="ml-2 block text-sm text-gray-700">Report anonymously</label>
                                    </div>

                                    <div class="pt-4">
                                        <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                                            Submit Report
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6">
                        <h3 class="text-xl font-semibold text-gray-900 mb-4">Recent Incidents in Your Area</h3>
                        <div class="space-y-4">
                            ${recentIncidents.map(incident => `
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <h4 class="font-medium text-gray-900">${incident.type}</h4>
                                            <p class="text-sm text-gray-600">${incident.location}</p>
                                            <div class="flex items-center mt-2">
                                                <span class="text-xs ${incident.status === 'resolved' ? 'bg-green-100 text-green-800' : incident.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'} px-2 py-1 rounded-full">${incident.status}</span>
                                                <span class="text-xs text-gray-500 ml-2">${incident.timestamp}</span>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-sm font-mono text-gray-900">${incident.id}</p>
                                            <p class="text-xs text-gray-500">Response: ${incident.responseTime}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            // Add event listeners after DOM is rendered
            setTimeout(() => {
                document.getElementById('getLocationBtn').addEventListener('click', getCurrentLocation);
                document.getElementById('reportForm').addEventListener('submit', handleReportSubmit);
            }, 50);

            return main;
        }

        function getCurrentLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        document.getElementById('locationInput').value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
                        showNotification('Location obtained successfully!', 'success');
                    },
                    (error) => {
                        console.error('Error getting location:', error);
                        showNotification('Unable to get your location. Please enter it manually.', 'error');
                    }
                );
            } else {
                showNotification('Geolocation is not supported by this browser.', 'error');
            }
        }

        async function handleReportSubmit(e) {
    e.preventDefault();
    
    const incidentType = document.getElementById('incidentType').value;
    const location = document.getElementById('locationInput').value;
    const description = document.getElementById('descriptionInput').value;
    const anonymous = document.getElementById('anonymous').checked;
    const contact = document.querySelector('input[type="text"]').value || '';
    
    if (!location || !description) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }
    
    try {
        // Get coordinates if available from location input
        let coordinates = null;
        if (location.includes('Lat:') && location.includes('Lng:')) {
            const latMatch = location.match(/Lat:\s*([-\d.]+)/);
            const lngMatch = location.match(/Lng:\s*([-\d.]+)/);
            if (latMatch && lngMatch) {
                coordinates = {
                    lat: parseFloat(latMatch[1]),
                    lng: parseFloat(lngMatch[1])
                };
            }
        }

        // Use the Google Sheets function from EndUser.js
        const result = await window.EndUser.addUserReport(
            incidentType, 
            location, 
            description, 
            anonymous, 
            contact, 
            coordinates
        );

        if (result) {
            // Reset form
            document.getElementById('reportForm').reset();
            
            // Show success message (handled by addUserReport)
        }

    } catch (error) {
        console.error('Error submitting report:', error);
        showNotification('Error submitting report. Please try again.', 'error');
    }
}

        function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(notification);
            
            // Remove notification after 5 seconds
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }

        function renderCommunity() {
            const main = document.createElement('main');
            main.className = 'container';
            main.innerHTML = `
                <div class="mb-8 text-center">
                    <h2 class="text-3xl font-bold text-gray-900">Community Watch</h2>
                    <p class="text-gray-600">Join forces with your neighbors to protect your community</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
                        <h3 class="text-2xl font-bold mb-4">Join Your Local Watch</h3>
                        <p class="mb-6">Connect with neighbors, share information, and coordinate patrols to keep your area safe.</p>
                        <button class="bg-white hover:bg-gray-100 text-indigo-700 font-semibold py-3 px-6 rounded-lg transition-colors">
                            Find My Neighborhood Group
                        </button>
                    </div>

                    <div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-8 text-white">
                        <h3 class="text-2xl font-bold mb-4">Become a Volunteer</h3>
                        <p class="mb-6">Help monitor sensors, coordinate responses, and educate your community about cable theft prevention.</p>
                        <button class="bg-white hover:bg-gray-100 text-purple-700 font-semibold py-3 px-6 rounded-lg transition-colors">
                            Sign Up to Volunteer
                        </button>
                    </div>
                </div>

                <div class="side-by-side gap-8">
                    <div class="bg-white rounded-xl shadow-md p-6">
                        <h3 class="text-xl font-semibold text-gray-900 mb-6">Safety Resources</h3>
                        <div class="space-y-4">
                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex items-start space-x-3">
                                    <div class="bg-blue-100 p-2 rounded-lg">
                                        <i class="fas fa-file-alt text-blue-600"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-medium text-gray-900">Neighborhood Watch Guidelines</h4>
                                        <p class="text-sm text-gray-600">Best practices for organizing and running an effective watch program</p>
                                    </div>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex items-start space-x-3">
                                    <div class="bg-green-100 p-2 rounded-lg">
                                        <i class="fas fa-shield-alt text-green-600"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-medium text-gray-900">Safety Training Materials</h4>
                                        <p class="text-sm text-gray-600">Resources for staying safe while monitoring your community</p>
                                    </div>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex items-start space-x-3">
                                    <div class="bg-purple-100 p-2 rounded-lg">
                                        <i class="fas fa-bullhorn text-purple-600"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-medium text-gray-900">Community Alert Templates</h4>
                                        <p class="text-sm text-gray-600">Pre-written alerts for common situations in your neighborhood</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6">
                        <h3 class="text-xl font-semibold text-gray-900 mb-6">Upcoming Events</h3>
                        <div class="space-y-4">
                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h4 class="font-medium text-gray-900">Community Safety Workshop</h4>
                                        <p class="text-sm text-gray-600">January 25, 2025 • 6:30 PM - 8:00 PM</p>
                                        <p class="text-sm text-gray-600">Hatfield Community Center</p>
                                    </div>
                                    <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">RSVP</button>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h4 class="font-medium text-gray-900">Neighborhood Patrol Training</h4>
                                        <p class="text-sm text-gray-600">February 3, 2025 • 10:00 AM - 12:00 PM</p>
                                        <p class="text-sm text-gray-600">Sunnyside Police Station</p>
                                    </div>
                                    <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">RSVP</button>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h4 class="font-medium text-gray-900">NotiZAR Town Hall</h4>
                                        <p class="text-sm text-gray-600">February 15, 2025 • 7:00 PM - 9:00 PM</p>
                                        <p class="text-sm text-gray-600">Tshwane Municipal Building</p>
                                    </div>
                                    <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">RSVP</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return main;
        }

        function renderMap() {
            const main = document.createElement('main');
            main.className = 'container';
            main.innerHTML = `
                <div class="mb-8">
                    <h2 class="text-2xl font-bold text-gray-900">Live Monitoring Map</h2>
                    <p class="text-gray-600">View of sensors, incidents, community watch activities, and video surveillance cameras in your area</p>
                </div>

                <div class="bg-white rounded-xl shadow-md p-6 mb-8">
                    <!-- Legend -->
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h3 class="text-xl font-semibold text-gray-900">Tshwane Community Map</h3>
                        <div class="flex flex-wrap gap-2">
                            <button class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                <div class="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                                Active Sensors
                            </button>
                            <button class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                <div class="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                                Active Incidents
                            </button>
                            <button class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                <div class="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                                Patrols
                            </button>
                            <button class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                <div class="w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
                                Watch Groups
                            </button>
                            <button class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                                Video Cameras
                            </button>
                        </div>
                        <button id="refreshMapBtn" class="refresh-button">
                            <i class="fas fa-sync-alt mr-1"></i>
                            Refresh Map
                        </button>
                    </div>

                    <!-- Map -->
                    <div id="liveMap" class="rounded-lg shadow-md mb-6" style="height: 400px;"></div>

                    <!-- Marker Stats Side by Side -->
                    <div class="marker-stats">
                        <div class="marker-stat">
                            <div class="marker-stat-number">25</div>
                            <div class="marker-stat-label">Active Sensors</div>
                        </div>
                        <div class="marker-stat">
                            <div class="marker-stat-number">${recentIncidents.filter(i => i.status === 'investigating').length}</div>
                            <div class="marker-stat-label">Active Incidents</div>
                        </div>
                        <div class="marker-stat">
                            <div class="marker-stat-number">10</div>
                            <div class="marker-stat-label">Patrol Units</div>
                        </div>
                        <div class="marker-stat">
                            <div class="marker-stat-number">12</div>
                            <div class="marker-stat-label">Watch Groups</div>
                        </div>
                        <div class="marker-stat">
                            <div class="marker-stat-number">6</div>
                            <div class="marker-stat-label">Video Cameras</div>
                        </div>
                    </div>

                    <!-- Chart + Table Side by Side -->
                    <div class="side-by-side gap-6 mb-8">
                        <!-- Bar Chart -->
                        <div class="bg-white rounded-lg shadow p-4">
                            <h4 class="text-lg font-semibold mb-4 text-gray-900">Analytics Overview</h4>
                            <canvas id="mapStatsChart" class="small-chart"></canvas>
                        </div>

                        <!-- Table with shorter tag details -->
                        <div class="bg-white rounded-lg shadow p-4 overflow-x-auto">
                            <h4 class="text-lg font-semibold mb-4 text-gray-900">Tag Details</h4>
                            <div class="tag-details-container">
                                <table class="min-w-full border border-gray-200 text-sm">
                                    <thead class="bg-gray-100">
                                        <tr>
                                            <th class="px-3 py-2 border">Type</th>
                                            <th class="px-3 py-2 border">Latitude</th>
                                            <th class="px-3 py-2 border">Longitude</th>
                                            <th class="px-3 py-2 border">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tagTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Additional Analytics Charts Side by Side -->
                    <div class="side-by-side gap-6 mb-8">
                        <div class="bg-white rounded-lg shadow p-4">
                            <h4 class="text-lg font-semibold mb-4 text-gray-900">Incident Trends</h4>
                            <canvas id="incidentTrendsChart" class="small-chart"></canvas>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <h4 class="text-lg font-semibold mb-4 text-gray-900">Response Times</h4>
                            <canvas id="responseTimeChart" class="small-chart"></canvas>
                        </div>
                    </div>
                </div>
            `;

            // Initialize map after DOM render
            setTimeout(() => {
                initMap();
                document.getElementById('refreshMapBtn').addEventListener('click', updateMap);
            }, 50);

            return main;
        }

        function initMap() {
            if (mapInstance) {
                mapInstance.remove();
                mapMarkers = [];
            }
            
            mapInstance = L.map('liveMap').setView([-25.7479, 28.2293], 12); // Pretoria

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors"
            }).addTo(mapInstance);

            // Marker icons
            const redIcon = L.divIcon({ className: "custom-marker", html: '<div style="background:#dc2626;width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>' });
            const blueIcon = L.divIcon({ className: "custom-marker", html: '<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>' });
            const greenIcon = L.divIcon({ className: "custom-marker", html: '<div style="background:#16a34a;width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>' });
            const purpleIcon = L.divIcon({ className: "custom-marker", html: '<div style="background:#7e22ce;width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>' });
            const cameraIcon = L.divIcon({ 
                className: "camera-marker", 
                html: '<div class="camera-marker"></div>',
                iconSize: [20, 20]
            });

            const tagTable = document.getElementById("tagTableBody");
            tagTable.innerHTML = '';

            // Add recent incidents to map
            recentIncidents.forEach(incident => {
                const marker = L.marker(incident.coordinates, { icon: redIcon }).addTo(mapInstance);
                mapMarkers.push(marker);
                
                marker.bindPopup(`
                    <div style="min-width: 200px;">
                        <h3 style="margin: 0 0 10px 0; font-weight: bold;">${incident.type}</h3>
                        <p style="margin: 5px 0; font-size: 0.9em;">${incident.location}</p>
                        <p style="margin: 5px 0; font-size: 0.9em;">ID: ${incident.id}</p>
                        <p style="margin: 5px 0; font-size: 0.9em;">
                            Status: <span style="color: ${incident.status === 'resolved' ? 'green' : 'red'}; font-weight: bold;">${incident.status}</span>
                        </p>
                        <p style="margin: 5px 0; font-size: 0.9em;">Response: ${incident.responseTime}</p>
                    </div>
                `);
                
                // Add row in table
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="px-3 py-2 border">Incident</td>
                    <td class="px-3 py-2 border">${incident.coordinates[0].toFixed(5)}</td>
                    <td class="px-3 py-2 border">${incident.coordinates[1].toFixed(5)}</td>
                    <td class="px-3 py-2 border">${incident.status}</td>
                `;
                tagTable.appendChild(row);
            });

            // Add video surveillance cameras to the map
            function addCameraMarkers() {
                videoCameras.forEach(camera => {
                    const marker = L.marker(camera.coordinates, { icon: cameraIcon }).addTo(mapInstance);
                    mapMarkers.push(marker);
                    
                    let statusColor;
                    if (camera.status === 'live') statusColor = '#dc2626';
                    else if (camera.status === 'recording') statusColor = '#059669';
                    else statusColor = '#6b7280';
                    
                    marker.bindPopup(`
                        <div style="min-width: 200px;">
                            <h3 style="margin: 0 0 10px 0; font-weight: bold;">${camera.name}</h3>
                            <p style="margin: 5px 0; font-size: 0.9em;">${camera.location}</p>
                            <p style="margin: 5px 0; font-size: 0.9em;">
                                Status: <span style="color: ${statusColor}; font-weight: bold;">${camera.status.toUpperCase()}</span>
                            </p>
                            <p style="margin: 5px 0; font-size: 0.9em;">Last activity: ${camera.lastActivity}</p>
                            <button onclick="navigateTo('video')" style="background: #fbbf24; color: #1f2937; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px; width: 100%;">
                                View Camera
                            </button>
                        </div>
                    `);
                    
                    // Add row in table
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="px-3 py-2 border">Video Camera</td>
                        <td class="px-3 py-2 border">${camera.coordinates[0].toFixed(5)}</td>
                        <td class="px-3 py-2 border">${camera.coordinates[1].toFixed(5)}</td>
                        <td class="px-3 py-2 border">${camera.status}</td>
                    `;
                    tagTable.appendChild(row);
                });
            }

            // Demo random markers for other elements
            function addRandomMarkers(icon, count, label, status) {
                for (let i = 0; i < count; i++) {
                    const lat = -25.74 + Math.random() * 0.05;
                    const lng = 28.21 + Math.random() * 0.05;
                    const marker = L.marker([lat, lng], { icon }).addTo(mapInstance);
                    mapMarkers.push(marker);
                    marker.bindPopup(`${label} #${i + 1}`);

                    // Add row in table (limit to 15 rows so it doesn't get too long)
                    if (i < 15) {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td class="px-3 py-2 border">${label}</td>
                            <td class="px-3 py-2 border">${lat.toFixed(5)}</td>
                            <td class="px-3 py-2 border">${lng.toFixed(5)}</td>
                            <td class="px-3 py-2 border">${status}</td>
                        `;
                        tagTable.appendChild(row);
                    }
                }
            }

            addRandomMarkers(blueIcon, 25, "Sensor", "Online");
            addRandomMarkers(greenIcon, 10, "Patrol", "On Duty");
            addRandomMarkers(purpleIcon, 12, "Watch Group", "Active");
            addCameraMarkers();

            // Initialize charts
            initCharts();
        }

        function updateMap() {
            if (mapInstance) {
                initMap();
                showNotification('Map data refreshed!', 'success');
            }
        }

        function initCharts() {
            // Destroy existing charts if they exist
            if (charts.mapStatsChart) charts.mapStatsChart.destroy();
            if (charts.incidentTrendsChart) charts.incidentTrendsChart.destroy();
            if (charts.responseTimeChart) charts.responseTimeChart.destroy();

            // Map Stats Chart
            const mapStatsCtx = document.getElementById("mapStatsChart").getContext("2d");
            charts.mapStatsChart = new Chart(mapStatsCtx, {
                type: "bar",
                data: {
                    labels: ["Sensors", "Incidents", "Patrols", "Watch Groups", "Cameras"],
                    datasets: [{
                        label: "Count",
                        data: [25, recentIncidents.length, 10, 12, 6],
                        backgroundColor: ["#2563eb", "#dc2626", "#16a34a", "#7e22ce", "#fbbf24"]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 5 } } }
                }
            });

            // Incident Trends Chart
            const incidentTrendsCtx = document.getElementById("incidentTrendsChart").getContext("2d");
            charts.incidentTrendsChart = new Chart(incidentTrendsCtx, {
                type: "line",
                data: {
                    labels: ["Jan 15", "Jan 16", "Jan 17", "Jan 18", "Jan 19", "Jan 20", "Jan 21"],
                    datasets: [{
                        label: "Incidents",
                        data: [3, 5, 2, 4, 6, 3, recentIncidents.length],
                        borderColor: "#dc2626",
                        backgroundColor: "rgba(220, 38, 38, 0.1)",
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });

            // Response Time Chart
            const responseTimeCtx = document.getElementById("responseTimeChart").getContext("2d");
            charts.responseTimeChart = new Chart(responseTimeCtx, {
                type: "bar",
                data: {
                    labels: ["Hatfield", "Sunnyside", "Brooklyn", "Arcadia"],
                    datasets: [{
                        label: "Avg Response Time (min)",
                        data: [7.2, 9.1, 6.5, 8.3],
                        backgroundColor: "#3b82f6"
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, title: { display: true, text: "Minutes" } } }
                }
            });
        }

        function updateCharts() {
            if (activeView === 'map') {
                initCharts();
            }
        }
        
        function renderVideoSurveillance() {
            const main = document.createElement('main');
            main.className = 'container';
            main.innerHTML = `
                <div class="mb-8">
                    <h2 class="text-2xl font-bold text-gray-900">Video Surveillance</h2>
                    <p class="text-gray-600">Monitor live and recorded footage from community surveillance cameras</p>
                </div>

                <div class="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-semibold text-gray-900">Camera Overview</h3>
                        <div class="flex items-center space-x-4">
                            <div class="flex items-center">
                                <div class="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                                <span class="text-sm">Live (3)</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                                <span class="text-sm">Recording (2)</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-3 h-3 bg-gray-600 rounded-full mr-2"></div>
                                <span class="text-sm">Offline (1)</span>
                            </div>
                        </div>
                    </div>

                    <div class="video-surveillance-container">
                        ${videoCameras.map(camera => `
                            <div class="video-card">
                                <div class="video-placeholder">
                                    <div style="text-align: center;">
                                        <i class="fas fa-video text-3xl text-gray-400 mb-2"></i>
                                        <p>${camera.name}</p>
                                        <div class="video-status ${camera.status === 'live' ? 'status-live' : camera.status === 'recording' ? 'status-recording' : 'status-offline'}">
                                            ${camera.status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <div class="video-info">
                                    <h4 class="font-semibold text-gray-900">${camera.name}</h4>
                                    <p class="text-sm text-gray-600 mt-1">${camera.location}</p>
                                    <p class="text-xs text-gray-500 mt-2">Last activity: ${camera.lastActivity}</p>
                                    <div class="video-controls">
                                        <button class="btn-play">
                                            <i class="fas fa-play mr-1"></i>
                                            View Live
                                        </button>
                                        <button class="btn-fullscreen">
                                            <i class="fas fa-expand mr-1"></i>
                                            Fullscreen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="side-by-side gap-8">
                    <div class="bg-white rounded-xl shadow-md p-6">
                        <h3 class="text-xl font-semibold text-gray-900 mb-4">Recent Recordings</h3>
                        <div class="space-y-4">
                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h4 class="font-medium text-gray-900">Suspicious Vehicle - Hatfield</h4>
                                        <p class="text-sm text-gray-600">Recorded: Today, 14:23</p>
                                        <p class="text-sm text-gray-600">Duration: 12 minutes</p>
                                    </div>
                                    <button class="text-blue-600 hover:text-blue-800">
                                        <i class="fas fa-play"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h4 class="font-medium text-gray-900">Community Patrol - Sunnyside</h4>
                                        <p class="text-sm text-gray-600">Recorded: Yesterday, 19:45</p>
                                        <p class="text-sm text-gray-600">Duration: 45 minutes</p>
                                    </div>
                                    <button class="text-blue-600 hover:text-blue-800">
                                        <i class="fas fa-play"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h4 class="font-medium text-gray-900">Infrastructure Check - Brooklyn</h4>
                                        <p class="text-sm text-gray-600">Recorded: Jan 20, 2025, 10:15</p>
                                        <p class="text-sm text-gray-600">Duration: 8 minutes</p>
                                    </div>
                                    <button class="text-blue-600 hover:text-blue-800">
                                        <i class="fas fa-play"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6">
                        <h3 class="text-xl font-semibold text-gray-900 mb-4">Camera Statistics</h3>
                        <div class="space-y-6">
                            <div>
                                <h4 class="font-medium text-gray-900 mb-2">Uptime This Month</h4>
                                <div class="w-full bg-gray-200 rounded-full h-2.5">
                                    <div class="bg-green-600 h-2.5 rounded-full" style="width: 92%"></div>
                                </div>
                                <p class="text-sm text-gray-600 mt-1">92% average across all cameras</p>
                            </div>

                            <div>
                                <h4 class="font-medium text-gray-900 mb-2">Storage Usage</h4>
                                <div class="w-full bg-gray-200 rounded-full h-2.5">
                                    <div class="bg-blue-600 h-2.5 rounded-full" style="width: 65%"></div>
                                </div>
                                <p class="text-sm text-gray-600 mt-1">1.2TB of 2TB used</p>
                            </div>

                            <div>
                                <h4 class="font-medium text-gray-900 mb-2">Motion Detection Activity</h4>
                                <div class="flex justify-between text-sm text-gray-600">
                                    <span>Today: 47 events</span>
                                    <span>This week: 284 events</span>
                                </div>
                            </div>

                            <div class="pt-4 border-t border-gray-200">
                                <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                                    <i class="fas fa-cog mr-2"></i>
                                    Camera Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return main;
        }

        function renderAI() {
            const main = document.createElement('main');
            main.className = 'container';
            main.innerHTML = `
                <div class="mb-8">
                    <h2 class="text-2xl font-bold text-gray-900">AI Risk Prediction</h2>
                    <p class="text-gray-600">AI-powered analysis to predict high-risk areas for cable theft</p>
                </div>

                <div class="ai-prediction-card">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-semibold">Risk Assessment Dashboard</h3>
                        <div class="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                            Updated: Just now
                        </div>
                    </div>
                    <p class="mb-6">Our AI analyzes historical data, sensor readings, and environmental factors to predict areas at highest risk.</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        ${aiPredictions.map(prediction => `
                            <div class="bg-white bg-opacity-20 rounded-lg p-4">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="font-semibold">${prediction.zone}</h4>
                                    <div class="risk-indicator">
                                        <span class="risk-level ${prediction.risk.toLowerCase() === 'high' ? 'risk-high' : prediction.risk.toLowerCase() === 'medium' ? 'risk-medium' : 'risk-low'}">
                                            ${prediction.risk}
                                        </span>
                                    </div>
                                </div>
                                <div class="w-full bg-white bg-opacity-30 rounded-full h-2 mb-2">
                                    <div class="h-2 rounded-full ${prediction.risk.toLowerCase() === 'high' ? 'bg-red-500' : prediction.risk.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}" 
                                         style="width: ${prediction.probability * 100}%"></div>
                                </div>
                                <p class="text-sm opacity-90">Probability: ${(prediction.probability * 100).toFixed(0)}%</p>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="ai-dashboard gap-8 mb-8">
                    <div class="prediction-chart-container">
                        <h3 class="text-xl font-semibold text-gray-900 mb-4">Risk Probability by Zone</h3>
                        <canvas id="riskProbabilityChart" class="small-chart"></canvas>
                    </div>

                    <div class="prediction-chart-container">
                        <h3 class="text-xl font-semibold text-gray-900 mb-4">Risk Factors Analysis</h3>
                        <canvas id="riskFactorsChart" class="small-chart"></canvas>
                    </div>
                </div>

                <div class="side-by-side gap-8">
                    <div class="ai-minimal-card">
                        <h3 class="text-xl font-semibold text-gray-900 mb-4">AI Model Performance</h3>
                        <div class="performance-bars">
                            <div class="performance-bar">
                                <div class="performance-label">Accuracy</div>
                                <div class="performance-bar-container">
                                    <div class="performance-bar-fill accuracy" style="width: 94%"></div>
                                </div>
                                <div class="performance-value">94%</div>
                            </div>
                            <div class="performance-bar">
                                <div class="performance-label">Precision</div>
                                <div class="performance-bar-container">
                                    <div class="performance-bar-fill precision" style="width: 87%"></div>
                                </div>
                                <div class="performance-value">87%</div>
                            </div>
                            <div class="performance-bar">
                                <div class="performance-label">Recall</div>
                                <div class="performance-bar-container">
                                    <div class="performance-bar-fill recall" style="width: 91%"></div>
                                </div>
                                <div class="performance-value">91%</div>
                            </div>
                        </div>
                        <div class="mt-4 text-sm text-gray-600">
                            <p>Model last trained: January 18, 2025</p>
                            <p>Training data: 12,458 incidents from 2023-2024</p>
                        </div>
                    </div>

                    <div class="ai-minimal-card">
                        <h3 class="text-xl font-semibold text-gray-900 mb-4">Recommended Actions</h3>
                        <div class="space-y-4">
                            ${aiPredictions.filter(p => p.risk === 'High').map(prediction => `
                                <div class="border border-red-200 bg-red-50 rounded-lg p-4">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <h4 class="font-medium text-red-800">High Priority: ${prediction.zone}</h4>
                                            <p class="text-sm text-red-600 mt-1">Key factors: ${prediction.factors.join(', ')}</p>
                                        </div>
                                        <button class="text-red-600 hover:text-red-800">
                                            <i class="fas fa-exclamation-triangle"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                            
                            ${aiPredictions.filter(p => p.risk === 'Medium').slice(0, 1).map(prediction => `
                                <div class="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <h4 class="font-medium text-yellow-800">Medium Priority: ${prediction.zone}</h4>
                                            <p class="text-sm text-yellow-600 mt-1">Key factors: ${prediction.factors.join(', ')}</p>
                                        </div>
                                        <button class="text-yellow-600 hover:text-yellow-800">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            // Initialize AI charts after DOM render
            setTimeout(() => {
                initAICharts();
            }, 50);

            return main;
        }

        function initAICharts() {
            // Risk Probability Chart
            const riskProbabilityCtx = document.getElementById("riskProbabilityChart").getContext("2d");
            new Chart(riskProbabilityCtx, {
                type: "doughnut",
                data: {
                    labels: aiPredictions.map(p => p.zone),
                    datasets: [{
                        data: aiPredictions.map(p => p.probability * 100),
                        backgroundColor: [
                            '#dc2626', // High risk - red
                            '#d97706', // Medium risk - amber
                            '#16a34a', // Low risk - green
                            '#d97706'  // Medium risk - amber
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: ${context.raw.toFixed(1)}% probability`;
                                }
                            }
                        }
                    }
                }
            });

            // Risk Factors Chart
            const riskFactorsCtx = document.getElementById("riskFactorsChart").getContext("2d");
            new Chart(riskFactorsCtx, {
                type: "bar",
                data: {
                    labels: ['Recent Incidents', 'Time of Day', 'Infrastructure', 'Patrol Density', 'Community Reports'],
                    datasets: [{
                        label: 'Impact Score',
                        data: [85, 72, 68, 45, 63],
                        backgroundColor: '#8b5cf6'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Impact Score'
                            }
                        }
                    }
                }
            });
        }

        function render() {
            const app = document.getElementById('app');
            app.innerHTML = '';
            
            app.appendChild(renderHeader());
            
            let mainContent;
            switch(activeView) {
                case 'home':
                    mainContent = renderHome();
                    break;
                case 'report':
                    mainContent = renderReport();
                    break;
                case 'community':
                    mainContent = renderCommunity();
                    break;
                case 'map':
                    mainContent = renderMap();
                    break;
                case 'video':
                    mainContent = renderVideoSurveillance();
                    break;
                case 'ai':
                    mainContent = renderAI();
                    break;
                default:
                    mainContent = renderHome();
            }
            
            app.appendChild(mainContent);
            app.appendChild(renderFooter());
        }

        // Initialize the app
        document.addEventListener('DOMContentLoaded', () => {
            render();
            
            // Close sidebar when clicking on overlay
            document.querySelector('.sidebar-overlay').addEventListener('click', closeSidebar);
        });

        function renderAnnouncements() {
    const announcementsContainer = document.getElementById('announcementsContainer');
    if (!announcementsContainer) return;

    // Get recent announcements (show 5 most recent)
    const recentAnnouncements = announcements
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recentAnnouncements.length === 0) {
        announcementsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-bullhorn text-3xl mb-3 text-gray-300"></i>
                <p>No announcements at the moment</p>
                <p class="text-sm mt-1">Check back later for updates</p>
            </div>
        `;
        return;
    }

    announcementsContainer.innerHTML = recentAnnouncements.map(announcement => `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow announcement-item ${
            announcement.priority === 'high' ? 'border-l-4 border-red-500 bg-red-50' : 
            announcement.priority === 'medium' ? 'border-l-4 border-yellow-500 bg-yellow-50' : 
            'border-l-4 border-blue-500'
        }">
            <div class="flex justify-between items-start">
                <div class="flex items-start space-x-3">
                    <div class="mt-1">
                        ${announcement.priority === 'high' ? 
                            '<div class="bg-red-100 p-2 rounded-full"><i class="fas fa-exclamation-triangle text-red-600"></i></div>' : 
                            announcement.priority === 'medium' ? 
                            '<div class="bg-yellow-100 p-2 rounded-full"><i class="fas fa-exclamation-circle text-yellow-600"></i></div>' : 
                            '<div class="bg-blue-100 p-2 rounded-full"><i class="fas fa-info-circle text-blue-600"></i></div>'
                        }
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900">${announcement.title}</h4>
                        <p class="text-sm text-gray-600">${announcement.content}</p>
                        <div class="flex items-center mt-2">
                            <span class="text-xs ${
                                announcement.priority === 'high' ? 'bg-red-100 text-red-800' : 
                                announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-blue-100 text-blue-800'
                            } px-2 py-1 rounded-full">${announcement.priority} priority</span>
                            <span class="text-xs text-gray-500 ml-2">${announcement.date}</span>
                            <span class="text-xs text-gray-500 ml-2">By: ${announcement.author}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function checkForNewAlerts() {
    // Check if there are any high-priority announcements from the last 24 hours
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const highPriorityAlerts = announcements.filter(announcement => {
        const announcementDate = new Date(announcement.date);
        return announcement.priority === 'high' && announcementDate > last24Hours;
    });

    // Show notification if there are high priority alerts
    if (highPriorityAlerts.length > 0) {
        showAlertNotification(highPriorityAlerts);
    }
}

function showAlertNotification(alerts) {
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showBrowserNotification(alerts);
            }
        });
    } else if (Notification.permission === 'granted') {
        showBrowserNotification(alerts);
    }

    // Always show in-app notification
    showInAppAlertNotification(alerts);
}

function showBrowserNotification(alerts) {
    if (alerts.length === 1) {
        new Notification('NotiZAR - High Priority Alert', {
            body: `${alerts[0].title}: ${alerts[0].content}`,
            icon: '/logo.png',
            tag: 'notizar-alert'
        });
    } else {
        new Notification('NotiZAR - Multiple Alerts', {
            body: `You have ${alerts.length} high priority alerts`,
            icon: '/logo.png',
            tag: 'notizar-alert'
        });
    }
}

function showInAppAlertNotification(alerts) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 border-red-500 bg-red-50 text-red-800 max-w-md';
    notification.innerHTML = `
        <div class="flex items-start">
            <i class="fas fa-exclamation-triangle mr-2 mt-1"></i>
            <div>
                <h4 class="font-semibold">High Priority Alert${alerts.length > 1 ? 's' : ''}</h4>
                <p class="text-sm mt-1">${alerts.length} new high priority announcement${alerts.length > 1 ? 's' : ''}</p>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-red-600 hover:text-red-800 text-sm font-medium mt-2">
                    Dismiss
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}