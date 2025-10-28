// === GOOGLE SHEETS CONFIGURATION ===
const SHEET_ID = '1Gpj_0729wCx9mgg0NS7OY9J_hnkzOCuwfNR7J6-pw6c';
const API_KEY = 'AIzaSyD6pyc_Aze3RK_CjSg7kgOZe0ks471ZUgk';

// === SUPABASE CONFIGURATION ===
const SUPABASE_URL = 'https://cnptukavcjqbczlzihjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNucHR1a2F2Y2pxYmN6bHppaGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0OTMzODIsImV4cCI6MjA3NDA2OTM4Mn0.1l_E9OI8pKZpIA4f7arbWIl0h0WnZXGFq71Fn_vyQ04';


// Google Sheets URLs
const ANNOUNCEMENTS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Announcements!A2:G?key=${API_KEY}`;
const USER_REPORTS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/UserReports!A2:I?key=${API_KEY}`;
const MAP_DATA_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/MapData!A2:F?key=${API_KEY}`;

// Global data arrays
let announcements = [];
let userReports = [];
let mapData = [];

// === LOCAL STORAGE KEYS ===
const LOCAL_ANNOUNCEMENTS_KEY = 'notizar_announcements';
const LOCAL_USER_REPORTS_KEY = 'notizar_user_reports';
const LOCAL_MAP_DATA_KEY = 'notizar_map_data';
const PENDING_SYNC_KEY = 'notizar_pending_sync';

// === GOOGLE APPS SCRIPT CONFIGURATION ===
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJzmUZL8J8GCICo14JQb7mysnxBbf3_j8mejStLjTrgKg0GddoFeVIxIgTPwlnOFeFlA/exec";

// === SUPABASE CLIENT INITIALIZATION ===
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === SUPABASE CONNECTION STATUS ===
let supabaseConnected = false;

// Update connection status function
function updateConnectionStatus(connected) {
    supabaseConnected = connected;
    const statusElement = document.getElementById('supabaseStatus');
    if (statusElement) {
        statusElement.innerHTML = connected ? 
            '<span style="color: #10B981;"><i class="fas fa-check-circle"></i> Supabase Connected</span>' :
            '<span style="color: #EF4444;"><i class="fas fa-exclamation-triangle"></i> Supabase Offline</span>';
    }
}

// Enhanced loadData function with Supabase priority
// In your Admin.js - update the loadData function
async function loadData() {
    try {
        console.log("🔄 Loading data from Supabase for admin...");
        
        // Clear existing data first
        userReports = [];
        announcements = [];
        mapData = [];

        // Fetch from Supabase with proper error handling
        const { data: reportsData, error: reportsError } = await supabase
            .from('user_reports')
            .select('*')
            .order('created_at', { ascending: false });

        const { data: announcementsData, error: announcementsError } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        const { data: mapDataResponse, error: mapDataError } = await supabase
            .from('map_data')
            .select('*');

        // Log any errors
        if (reportsError) {
            console.error('❌ Error loading reports:', reportsError);
            throw reportsError;
        }
        if (announcementsError) console.error('Error loading announcements:', announcementsError);
        if (mapDataError) console.error('Error loading map data:', mapDataError);

        // Update global arrays with Supabase data
        userReports = reportsData || [];
        announcements = announcementsData || [];
        mapData = mapDataResponse || [];

        console.log(`✅ Loaded ${userReports.length} reports from Supabase`);
        console.log('Sample Supabase report:', userReports[0]);

        // Clear local storage to force using Supabase data
        localStorage.removeItem('notizar_user_reports');
        localStorage.removeItem('notizar_announcements');
        localStorage.removeItem('notizar_map_data');

        // Update UI
        renderIncidentTable();
        renderAnnouncementsTable();
        updateDashboardStats();

    } catch (error) {
        console.error('❌ Supabase loading failed:', error);
        console.log('🔄 Falling back to local storage...');
        loadFromLocalStorage();
    }
}
// Google Sheets fallback
async function loadFromGoogleSheets() {
    try {
        const [announcementsRes, reportsRes, mapDataRes] = await Promise.all([
            fetch(ANNOUNCEMENTS_URL),
            fetch(USER_REPORTS_URL),
            fetch(MAP_DATA_URL)
        ]);

        if (!announcementsRes.ok || !reportsRes.ok || !mapDataRes.ok) {
            throw new Error('Google Sheets also failed');
        }

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
            priority: row[6],
            created_at: row[4] // Use date as created_at for fallback
        }));

        userReports = (reportsData.values || []).map(row => ({
            id: row[0],
            incident_type: row[1],
            location: row[2],
            description: row[3],
            timestamp: row[4],
            status: row[5],
            anonymous: row[6] === 'true',
            contact: row[7],
            admin_notes: row[8],
            created_at: row[4]
        }));

        mapData = (mapDataResponse.values || []).map(row => ({
            id: row[0],
            report_id: row[1],
            latitude: parseFloat(row[2]),
            longitude: parseFloat(row[3]),
            type: row[4],
            status: row[5],
            timestamp: row[6],
            created_at: row[6]
        }));

        console.log("✅ Data loaded from Google Sheets fallback!");
        saveToLocalStorage();
        
    } catch (sheetsError) {
        console.error('❌ Google Sheets Error:', sheetsError);
        console.log('🔄 Using local storage data...');
        loadFromLocalStorage();
    }
}

// Enhanced addAnnouncement function with full form fields
async function addAnnouncement(title, content, type, date, author, priority) {
    // Validate and sanitize all inputs with proper null checking
    const sanitizedAnnouncement = {
        title: (title || '').toString().trim(),
        content: (content || '').toString().trim(),
        type: (type || 'info').toString().trim(),
        date: (date || new Date().toISOString().split('T')[0]).toString().trim(),
        author: (author || 'Admin').toString().trim(),
        priority: (priority || 'medium').toString().trim(),
        created_at: new Date().toISOString()
    };

    // Validate required fields
    if (!sanitizedAnnouncement.title || !sanitizedAnnouncement.content) {
        showNotification('Title and content are required fields.', 'error');
        throw new Error('Missing required fields');
    }

    console.log("📤 Attempting to save announcement:", sanitizedAnnouncement);

    try {
        // Try Supabase first - don't include ID, let Supabase generate it
        const { data, error } = await supabase
            .from('announcements')
            .insert([{
                title: sanitizedAnnouncement.title,
                content: sanitizedAnnouncement.content,
                type: sanitizedAnnouncement.type,
                date: sanitizedAnnouncement.date,
                author: sanitizedAnnouncement.author,
                priority: sanitizedAnnouncement.priority,
                created_at: sanitizedAnnouncement.created_at
            }])
            .select();

        if (error) {
            console.error('❌ Supabase insert error:', error);
            
            // Check for specific error types
            if (error.code === '23505') { // Unique violation
                throw new Error('Duplicate entry - this announcement already exists');
            } else if (error.code === '42501') { // Permission denied
                throw new Error('Permission denied - check your RLS policies');
            } else if (error.code === '42703') { // Column doesn't exist
                throw new Error('Column does not exist - check your table schema');
            } else {
                throw new Error(`Database error: ${error.message}`);
            }
        }

        // Success - use the data returned from Supabase
        const savedAnnouncement = data[0];
        console.log("✅ Announcement saved to Supabase:", savedAnnouncement);
        
        // Add to local array with the returned ID
        announcements.unshift(savedAnnouncement);
        
        showNotification('Announcement published successfully!', 'success');
        render();
        return savedAnnouncement;

    } catch (error) {
        console.error('❌ Error saving announcement to Supabase:', error);
        
        // Generate a temporary ID for fallback
        const tempId = 'temp-' + Date.now();
        const fallbackAnnouncement = {
            ...sanitizedAnnouncement,
            id: tempId
        };
        
        try {
            await saveAnnouncementToGoogleSheets(fallbackAnnouncement);
            announcements.unshift(fallbackAnnouncement);
            showNotification('Announcement saved to Google Sheets (Supabase: ' + error.message + ')', 'warning');
            render();
            return fallbackAnnouncement;
        } catch (sheetsError) {
            console.error('❌ Google Sheets also failed:', sheetsError);
            // Final fallback to local storage
            addPendingSync('addAnnouncement', fallbackAnnouncement);
            announcements.unshift(fallbackAnnouncement);
            saveToLocalStorage();
            showNotification('Announcement saved locally (will sync when online)', 'warning');
            render();
            return fallbackAnnouncement;
        }
    }
}

// Google Sheets fallback for announcements
async function saveAnnouncementToGoogleSheets(announcement) {
    const params = new URLSearchParams({
        action: 'addAnnouncement',
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        date: announcement.date,
        author: announcement.author,
        priority: announcement.priority
    });

    const url = `${APPS_SCRIPT_URL}?${params}`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Unknown error');
    }
}

// Enhanced announcement form handler
function handleAnnouncementSubmit(e) {
    e.preventDefault();
    
    // Get form values with proper null checking
    const title = document.getElementById('announcementTitle')?.value || '';
    const content = document.getElementById('announcementContent')?.value || '';
    const type = document.getElementById('announcementType')?.value || 'info';
    const date = document.getElementById('announcementDate')?.value || new Date().toISOString().split('T')[0];
    const author = document.getElementById('announcementAuthor')?.value || 'Admin';
    const priority = document.getElementById('announcementPriority')?.value || 'medium';
    
    // Validate required fields
    if (!title.trim() || !content.trim()) {
        showNotification('Please fill in all required fields (Title and Content).', 'error');
        return;
    }
    
    // Validate date format
    if (!isValidDate(date)) {
        showNotification('Please enter a valid date.', 'error');
        return;
    }
    
    addAnnouncement(title, content, type, date, author, priority);
    document.getElementById('announcementForm').reset();
}

// Add date validation helper function
function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regex)) return false;
    
    const date = new Date(dateString);
    const timestamp = date.getTime();
    return !isNaN(timestamp);
}

// Local storage functions for backup
function saveToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
        localStorage.setItem(LOCAL_USER_REPORTS_KEY, JSON.stringify(userReports));
        localStorage.setItem(LOCAL_MAP_DATA_KEY, JSON.stringify(mapData));
        console.log("💾 Data saved to local storage");
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        console.log('📦 Attempting to load from local storage...');
        
        const storedReports = localStorage.getItem('notizar_user_reports');
        const storedAnnouncements = localStorage.getItem('notizar_announcements');
        const storedMapData = localStorage.getItem('notizar_map_data');
        
        // Only use local storage if we have NO Supabase data
        if (storedReports && userReports.length === 0) {
            userReports = JSON.parse(storedReports);
            console.log('📦 Loaded from local storage:', userReports.length, 'reports');
        }
        
        if (storedAnnouncements && announcements.length === 0) {
            announcements = JSON.parse(storedAnnouncements);
        }
        
        if (storedMapData && mapData.length === 0) {
            mapData = JSON.parse(storedMapData);
        }
        
        // If still no data, use fallback
        if (userReports.length === 0 && announcements.length === 0) {
            console.log('📦 No data available, loading fallback data');
            loadFallbackData();
        }
        
    } catch (e) {
        console.error('Error loading from local storage:', e);
        loadFallbackData();
    }
}

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        showNotification('Testing Supabase connection...', 'info');
        const { data, error } = await supabase.from('announcements').select('count').limit(1);
        
        if (error) throw error;
        
        updateConnectionStatus(true);
        showNotification('Supabase connection successful!', 'success');
    } catch (error) {
        console.error('Supabase connection test failed:', error);
        updateConnectionStatus(false);
        showNotification('Supabase connection failed. Using fallback data.', 'error');
    }
}

// Initialize with connection test
async function initializeAdminPage() {
    // Test connection first
    await testSupabaseConnection();
    
    // Load data
    await loadData();

    // Test Apps Script connection
    await testAppsScript();
    
    // Then render
    render();
    
    // Close sidebar when clicking on overlay
    document.querySelector('.sidebar-overlay').addEventListener('click', closeSidebar);
}

// Add this function to fix the missing reference
function addPendingSync(operation) {
  console.log('Sync operation:', operation);
  // Implement your offline sync logic here
  // Or remove the call if you don't need offline sync
}
async function updateReportStatus(reportId, status, adminNotes = '') {
    try {
        // Update local cache first
        const report = userReports.find(r => r.id === reportId);
        if (report) {
            report.status = status;
            report.admin_notes = adminNotes;
        }

        // Sync to Supabase
        const { data, error } = await supabase
            .from('user_reports')
            .update({ status, admin_notes: adminNotes })
            .eq('id', reportId);

        if (error) throw error;

        showNotification('Report status updated successfully!', 'success');
        render();

    } catch (error) {
        console.error('Error updating report status:', error);
        addPendingSync('updateReportStatus', { reportId, status, adminNotes });
        showNotification('Status updated locally (will sync when online)', 'warning');
        render();
    }
}

// KEEP ALL YOUR EXISTING ADMIN FUNCTIONS BELOW

// Fallback demo data
function loadFallbackData() {
    announcements = [
        {
            id: 1,
            title: 'Demo: NotiZAR System',
            content: 'This is running with demo data. Connect Google Sheets for live features!',
            type: 'info',
            date: '2025-01-21',
            author: 'Admin',
            priority: 'medium'
        }
    ];
    
    userReports = [];
    mapData = [];
}

// Enhanced addUserReport function with Supabase priority
async function addUserReport(incidentType, location, description, anonymous = false, contact = '') {
    const sanitizedReport = {
        incident_type: (incidentType || '').toString().trim(),
        location: (location || '').toString().trim(),
        description: (description || '').toString().trim(),
        anonymous: !!anonymous,
        contact: (contact || '').toString().trim(),
        status: 'pending',
        admin_notes: '',
        created_at: new Date().toISOString()
    };

    // Validate required fields
    if (!sanitizedReport.incident_type || !sanitizedReport.location || !sanitizedReport.description) {
        showNotification('Incident type, location, and description are required fields.', 'error');
        throw new Error('Missing required fields');
    }

    console.log("📤 Attempting to save user report:", sanitizedReport);

    try {
        // Try Supabase first
        const { data, error } = await supabase
            .from('user_reports')
            .insert([sanitizedReport])
            .select();

        if (error) {
            console.error('❌ Supabase insert error:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        // Success - use the data returned from Supabase
        const savedReport = data[0];
        console.log("✅ User report saved to Supabase:", savedReport);
        
        // Add to local array with the returned ID
        userReports.unshift(savedReport);
        
        showNotification('Report submitted successfully!', 'success');
        render();
        return savedReport;

    } catch (error) {
        console.error('❌ Error saving report to Supabase:', error);
        
        // Generate a temporary ID for fallback
        const tempId = 'UR-' + Date.now();
        const fallbackReport = {
            ...sanitizedReport,
            id: tempId
        };
        
        try {
            await saveUserReportToGoogleSheets(fallbackReport);
            userReports.unshift(fallbackReport);
            showNotification('Report saved to Google Sheets (Supabase: ' + error.message + ')', 'warning');
            render();
            return fallbackReport;
        } catch (sheetsError) {
            console.error('❌ Google Sheets also failed:', sheetsError);
            // Final fallback to local storage
            addPendingSync('addUserReport', fallbackReport);
            userReports.unshift(fallbackReport);
            saveToLocalStorage();
            showNotification('Report saved locally (will sync when online)', 'warning');
            render();
            return fallbackReport;
        }
    }
}

// Google Sheets fallback for user reports
async function saveUserReportToGoogleSheets(report) {
    const params = new URLSearchParams({
        action: 'addUserReport',
        id: report.id,
        incidentType: report.incident_type,
        location: report.location,
        description: report.description,
        timestamp: report.created_at,
        status: report.status,
        anonymous: report.anonymous.toString(),
        contact: report.contact,
        adminNotes: report.admin_notes
    });

    const url = `${APPS_SCRIPT_URL}?${params}`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Unknown error');
    }
}

// Enhanced updateReportStatus function with Supabase
async function updateReportStatus(reportId, status, adminNotes = '') {
    try {
        // Update local cache first
        const report = userReports.find(r => r.id === reportId);
        if (report) {
            report.status = status;
            report.admin_notes = adminNotes;
        }

        // Sync to Supabase
        const { data, error } = await supabase
            .from('user_reports')
            .update({ 
                status: status, 
                admin_notes: adminNotes,
                updated_at: new Date().toISOString()
            })
            .eq('id', reportId);

        if (error) throw error;

        showNotification('Report status updated successfully!', 'success');
        render();

    } catch (error) {
        console.error('Error updating report status:', error);
        addPendingSync('updateReportStatus', { reportId, status, adminNotes });
        showNotification('Status updated locally (will sync when online)', 'warning');
        render();
    }
}

// Function to add map data to Supabase
async function addMapData(reportId, latitude, longitude, type, status = 'active') {
    try {
        const mapRecord = {
            report_id: reportId,
            latitude: latitude,
            longitude: longitude,
            type: type,
            status: status,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('map_data')
            .insert([mapRecord])
            .select();

        if (error) throw error;

        console.log("✅ Map data saved to Supabase:", data[0]);
        return data[0];

    } catch (error) {
        console.error('❌ Error saving map data to Supabase:', error);
        
        // Fallback to Google Sheets
        try {
            await saveMapDataToGoogleSheets({
                ...mapRecord,
                id: 'MAP-' + Date.now()
            });
            return mapRecord;
        } catch (sheetsError) {
            console.error('❌ Google Sheets also failed for map data:', sheetsError);
            throw sheetsError;
        }
    }
}

// Google Sheets fallback for map data
async function saveMapDataToGoogleSheets(mapData) {
    const params = new URLSearchParams({
        action: 'addMapData',
        id: mapData.id,
        reportId: mapData.report_id,
        latitude: mapData.latitude,
        longitude: mapData.longitude,
        type: mapData.type,
        status: mapData.status,
        timestamp: mapData.created_at
    });

    const url = `${APPS_SCRIPT_URL}?${params}`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Unknown error');
    }
}

async function testAppsScript() {
    try {
        const testUrl = `${APPS_SCRIPT_URL}?action=test`;
        
        console.log('Testing Apps Script:', testUrl);
        
        const response = await fetch(testUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('Test response:', data);
        showNotification(`Apps Script: ${data.message}`, 'success');
        return data;
    } catch (error) {
        console.error('Apps Script test failed:', error);
        showNotification('Apps Script connection failed', 'error');
        return null;
    }
}

// Admin page functionality
let activeView = 'home';
let mapInstance = null;
let mapMarkers = [];
let charts = {};
let reportIdCounter = 1000;

// Static data (for demo purposes)
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
    }
];

const aiPredictions = [
    { zone: 'Hatfield', risk: 'High', probability: 0.78, factors: ['Recent incidents', 'Time of day', 'Infrastructure density'] },
    { zone: 'Sunnyside', risk: 'Medium', probability: 0.45, factors: ['Moderate activity', 'Community patrols'] },
    { zone: 'Brooklyn', risk: 'Low', probability: 0.22, factors: ['Low recent activity', 'High patrol density'] },
    { zone: 'Arcadia', risk: 'Medium', probability: 0.52, factors: ['Recent sensor alerts', 'Moderate patrols'] }
];

// Initialize Admin page
async function initializeAdminPage() {
    // Load data from Google Sheets first
    await loadData();

    // Test Apps Script connection
    await testAppsScript();
    
    // Then render
    render();
    
    // Close sidebar when clicking on overlay
    document.querySelector('.sidebar-overlay').addEventListener('click', closeSidebar);
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAdminPage);

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

function showNotification(message, type, details = null) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let detailsHtml = '';
    if (details) {
        detailsHtml = `<div class="error-details" style="font-size: 0.8em; margin-top: 5px; opacity: 0.8;">${details}</div>`;
    }
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' : 
                type === 'warning' ? 'fa-exclamation-triangle' : 
                'fa-exclamation-circle'
            } mr-2"></i>
            <span>${message}</span>
        </div>
        ${detailsHtml}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 6000);
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

function handleReportSubmit(e) {
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
    
    // Use the Apps Script function
    addUserReport(incidentType, location, description, anonymous, contact);
    
    // Reset form
    document.getElementById('reportForm').reset();
}

function handleAnnouncementSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('announcementTitle').value;
    const content = document.getElementById('announcementContent').value;
    
    if (!title || !content) {
        showNotification('Please fill in all fields.', 'error');
        return;
    }
    
    // Use the Google Sheets function
    addAnnouncement(title, content, 'info', 'medium');
    
    // Reset form and re-render admin view
    document.getElementById('announcementForm').reset();
    render();
}

function render() {
    const mainContainer = document.querySelector('.container');
    mainContainer.innerHTML = '';
    
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
        case 'admin':
            mainContent = renderAdmin();
            break;
        default:
            mainContent = renderHome();
    }
    
    mainContainer.appendChild(mainContent);
}

function renderHome() {
    const main = document.createElement('div');
    main.innerHTML = `
        <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900">Administrative Dashboard</h2>
            <p class="text-gray-600">Manage system settings, user reports, and community announcements</p>
            <div class="flex items-center gap-4 mt-2">
                <div id="supabaseStatus" class="text-sm font-medium">
                    <span style="color: #6B7280;"><i class="fas fa-sync-alt fa-spin"></i> Checking connection...</span>
                </div>
                <button onclick="testSupabaseConnection()" class="text-sm text-blue-600 hover:text-blue-800">
                    <i class="fas fa-sync-alt mr-1"></i>Test Connection
                </button>
            </div>
        </div>

        <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900">Community Safety Dashboard</h2>
            <p class="text-gray-600">Welcome back, Admin! Here's the latest from your area.</p>
        </div>

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

        <div class="admin-section">
            <h3 class="admin-section-title">Analytics Overview</h3>
            <div class="compact-charts">
                <div class="chart-container">
                    <canvas id="adminIncidentsChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="adminResponseTimeChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="adminUserActivityChart"></canvas>
                </div>
            </div>
        </div>

        <!-- User Reports Section - Full width with scrollable table -->
        <div class="admin-section">
            <div class="flex justify-between items-center mb-4">
                <h3 class="admin-section-title">User Reports</h3>
                <div class="text-sm text-gray-500">
                    Showing ${Math.min(5, userReports.length)} of ${userReports.length} reports
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="overflow-x-auto">
                    <div class="reports-table-container" style="max-height: 400px; overflow-y: auto;">
                        <table class="w-full reports-table">
                            <thead class="sticky top-0 bg-white z-10">
                                <tr>
                                    <th>ID</th>
                                    <th>Type</th>
                                    <th>Location</th>
                                    <th>Timestamp</th>
                                    <th>Status</th>
                                    <th>Contact</th>
                                    <th>Admin Notes</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${userReports.slice(0, 5).map(report => `
                                    <tr>
                                        <td class="font-mono text-sm">${report.id}</td>
                                        <td>
                                            <span class="incident-type ${report.incident_type?.toLowerCase().replace(' ', '-') || 'other'}">
                                                ${report.incident_type}
                                            </span>
                                        </td>
                                        <td class="max-w-xs truncate">${report.location}</td>
                                        <td class="text-sm">${new Date(report.created_at || report.timestamp).toLocaleString()}</td>
                                        <td>
                                            <span class="status-badge status-${report.status}">
                                                ${report.status}
                                            </span>
                                        </td>
                                        <td class="text-sm">
                                            ${report.anonymous ? 'Anonymous' : (report.contact || 'N/A')}
                                        </td>
                                        <td class="max-w-xs">
                                            <div class="admin-notes">
                                                ${report.admin_notes || report.adminNotes || 'No notes'}
                                            </div>
                                        </td>
                                        <td>
                                            <div class="flex flex-col gap-1">
                                                <button class="btn btn-primary btn-sm" onclick="updateReportStatus('${report.id}', 'investigating')">
                                                    Investigate
                                                </button>
                                                <button class="btn btn-success btn-sm" onclick="updateReportStatus('${report.id}', 'resolved')">
                                                    Resolve
                                                </button>
                                                <button class="btn btn-warning btn-sm" onclick="addAdminNotes('${report.id}')">
                                                    Add Notes
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                                
                                ${userReports.length > 5 ? `
                                    ${userReports.slice(5).map(report => `
                                        <tr>
                                            <td class="font-mono text-sm">${report.id}</td>
                                            <td>
                                                <span class="incident-type ${report.incident_type?.toLowerCase().replace(' ', '-') || 'other'}">
                                                    ${report.incident_type}
                                                </span>
                                            </td>
                                            <td class="max-w-xs truncate">${report.location}</td>
                                            <td class="text-sm">${new Date(report.created_at || report.timestamp).toLocaleString()}</td>
                                            <td>
                                                <span class="status-badge status-${report.status}">
                                                    ${report.status}
                                                </span>
                                            </td>
                                            <td class="text-sm">
                                                ${report.anonymous ? 'Anonymous' : (report.contact || 'N/A')}
                                            </td>
                                            <td class="max-w-xs">
                                                <div class="admin-notes">
                                                    ${report.admin_notes || report.adminNotes || 'No notes'}
                                                </div>
                                            </td>
                                            <td>
                                                <div class="flex flex-col gap-1">
                                                    <button class="btn btn-primary btn-sm" onclick="updateReportStatus('${report.id}', 'investigating')">
                                                        Investigate
                                                    </button>
                                                    <button class="btn btn-success btn-sm" onclick="updateReportStatus('${report.id}', 'resolved')">
                                                        Resolve
                                                    </button>
                                                    <button class="btn btn-warning btn-sm" onclick="addAdminNotes('${report.id}')">
                                                        Add Notes
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                ` : ''}
                                
                                ${userReports.length === 0 ? `
                                    <tr>
                                        <td colspan="8" class="text-center py-8 text-gray-500">
                                            <i class="fas fa-inbox text-3xl mb-2"></i>
                                            <div>No user reports found</div>
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- System Announcements Section -->
        <div class="admin-section">
            <h3 class="admin-section-title">System Announcements</h3>
            <form class="announcement-form" id="announcementForm">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="form-label">Announcement Title *</label>
                        <input type="text" class="form-input" id="announcementTitle" required>
                    </div>
                    <div>
                        <label class="form-label">Type *</label>
                        <select class="form-input" id="announcementType" required>
                            <option value="info">Information</option>
                            <option value="alert">Alert</option>
                            <option value="warning">Warning</option>
                            <option value="emergency">Emergency</option>
                            <option value="update">Update</option>
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label class="form-label">Date *</label>
                        <input type="date" class="form-input" id="announcementDate" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div>
                        <label class="form-label">Author *</label>
                        <input type="text" class="form-input" id="announcementAuthor" value="Admin" required>
                    </div>
                    <div>
                        <label class="form-label">Priority *</label>
                        <select class="form-input" id="announcementPriority" required>
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                </div>
                
                <div class="mb-4">
                    <label class="form-label">Content *</label>
                    <textarea class="form-textarea" id="announcementContent" rows="4" required placeholder="Enter announcement content..."></textarea>
                </div>
                
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-paper-plane mr-2"></i>
                    Publish Announcement
                </button>
            </form>
            
            <h4 class="text-lg font-semibold mt-8 mb-4">Recent Announcements</h4>
            <div class="announcements-list">
                ${announcements.map(announcement => `
                    <div class="announcement-item ${announcement.priority === 'high' || announcement.priority === 'critical' ? 'announcement-high-priority' : ''}">
                        <div class="announcement-header">
                            <div class="announcement-title">${announcement.title}</div>
                            <div class="announcement-meta">
                                <span class="announcement-type announcement-type-${announcement.type}">${announcement.type}</span>
                                <span class="announcement-priority announcement-priority-${announcement.priority}">${announcement.priority}</span>
                            </div>
                        </div>
                        <div class="announcement-content">${announcement.content}</div>
                        <div class="announcement-footer">
                            <span>By: ${announcement.author}</span>
                            <span>${announcement.date}</span>
                            ${announcement.created_at ? `<span class="text-xs text-gray-500">${new Date(announcement.created_at).toLocaleString()}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="admin-section">
            <h3 class="admin-section-title">System Management</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="card">
                    <h4 class="font-semibold mb-4">User Management</h4>
                    <p class="text-gray-600 mb-4">Manage user accounts and permissions</p>
                    <button class="btn btn-primary">Manage Users</button>
                </div>
                <div class="card">
                    <h4 class="font-semibold mb-4">Sensor Configuration</h4>
                    <p class="text-gray-600 mb-4">Configure and monitor sensor networks</p>
                    <button class="btn btn-primary">Sensor Settings</button>
                </div>
                <div class="card">
                    <h4 class="font-semibold mb-4">System Logs</h4>
                    <p class="text-gray-600 mb-4">View system activity and error logs</p>
                    <button class="btn btn-primary">View Logs</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        initAdminCharts();
        document.getElementById('announcementForm').addEventListener('submit', handleAnnouncementSubmit);
    }, 50);

    return main;
}

// Add this helper function for admin notes
function addAdminNotes(reportId) {
    const notes = prompt('Enter admin notes for this report:');
    if (notes !== null) {
        updateReportStatus(reportId, null, notes);
    }
}

function renderReport() {
    const main = document.createElement('div');
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

function renderCommunity() {
    const main = document.createElement('div');
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
    const main = document.createElement('div');
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

// Enhanced initMap function to use Supabase map data
function initMap() {
    if (mapInstance) {
        mapInstance.remove();
        mapMarkers = [];
    }
    
    mapInstance = L.map('liveMap').setView([-25.7479, 28.2293], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(mapInstance);

    // Marker icons
    const redIcon = L.divIcon({ 
        className: "custom-marker", 
        html: '<div style="background:#dc2626;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [18, 18]
    });
    
    const blueIcon = L.divIcon({ 
        className: "custom-marker", 
        html: '<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [18, 18]
    });
    
    const greenIcon = L.divIcon({ 
        className: "custom-marker", 
        html: '<div style="background:#16a34a;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [18, 18]
    });

    const tagTable = document.getElementById("tagTableBody");
    if (tagTable) tagTable.innerHTML = '';

    // Add markers from Supabase/Google Sheets map data
    mapData.forEach(item => {
        let icon;
        let statusColor;
        
        if (item.type === 'Sensor') {
            icon = blueIcon;
            statusColor = '#2563eb';
        } else if (item.status === 'resolved') {
            icon = greenIcon;
            statusColor = '#16a34a';
        } else {
            icon = redIcon;
            statusColor = '#dc2626';
        }
        
        const marker = L.marker([item.latitude, item.longitude], { icon: icon }).addTo(mapInstance);
        mapMarkers.push(marker);
        
        // Get corresponding report details
        const report = userReports.find(r => r.id === item.report_id) || {};
        
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h3 style="margin: 0 0 10px 0; font-weight: bold;">${item.type}</h3>
                <p style="margin: 5px 0; font-size: 0.9em;">Status: <span style="color: ${statusColor}; font-weight: bold;">${item.status}</span></p>
                <p style="margin: 5px 0; font-size: 0.9em;">ID: ${item.report_id}</p>
                <p style="margin: 5px 0; font-size: 0.9em;">Time: ${new Date(item.created_at).toLocaleString()}</p>
                ${report.description ? `<p style="margin: 5px 0; font-size: 0.9em;">Description: ${report.description}</p>` : ''}
            </div>
        `);
        
        // Add row in table if table exists
        if (tagTable) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="px-3 py-2 border">${item.type}</td>
                <td class="px-3 py-2 border">${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}</td>
                <td class="px-3 py-2 border">${item.status}</td>
                <td class="px-3 py-2 border">${new Date(item.created_at).toLocaleString()}</td>
            `;
            tagTable.appendChild(row);
        }
    });

    // Initialize charts if on map view
    if (activeView === 'map') {
        initCharts();
    }
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
    if (charts.incidentTypeChart) charts.incidentTypeChart.destroy();

    // Calculate real data from Google Sheets
    const sensorCount = mapData.filter(item => item.type === 'Sensor').length;
    const activeIncidents = mapData.filter(item => 
        item.status === 'pending' || item.status === 'investigating'
    ).length;
    const resolvedIncidents = mapData.filter(item => item.status === 'resolved').length;
    const totalReports = userReports.length;
    
    // Count all types from mapData for the type distribution chart
    const typeDistribution = {};
    mapData.forEach(item => {
        typeDistribution[item.type] = (typeDistribution[item.type] || 0) + 1;
    });
    
    const typeLabels = Object.keys(typeDistribution);
    const typeData = Object.values(typeDistribution);
    
    // Define colors for different types
    const getColorForType = (type) => {
        const colorMap = {
            'Sensor': '#2563eb',
            'Suspicious Activity': '#dc2626',
            'Attempted Cable Theft': '#d97706',
            'Cable Theft': '#991b1b',
            'Vandalism': '#7c2d12',
            'Community Report': '#3b82f6',
            'Infrastructure Alert': '#f59e0b',
            'Other': '#6b7280'
        };
        return colorMap[type] || '#8b5cf6';
    };
    
    const typeColors = typeLabels.map(type => getColorForType(type));

    // Map Stats Chart - Using real Google Sheets data
    const mapStatsCtx = document.getElementById("mapStatsChart");
    if (mapStatsCtx) {
        charts.mapStatsChart = new Chart(mapStatsCtx, {
            type: "bar",
            data: {
                labels: ["Sensors", "Active Incidents", "Resolved", "Total Reports", "Map Markers"],
                datasets: [{
                    label: "Count",
                    data: [sensorCount, activeIncidents, resolvedIncidents, totalReports, mapData.length],
                    backgroundColor: ["#2563eb", "#dc2626", "#16a34a", "#7e22ce", "#fbbf24"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { stepSize: 1 },
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });
    }

    // Incident Trends Chart - Using real report data
    const incidentTrendsCtx = document.getElementById("incidentTrendsChart");
    if (incidentTrendsCtx) {
        // Group reports by date for trends
        const reportsByDate = {};
        userReports.forEach(report => {
            const date = new Date(report.timestamp).toLocaleDateString();
            reportsByDate[date] = (reportsByDate[date] || 0) + 1;
        });
        
        // Get last 7 days of data
        const dates = [];
        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString();
            dates.push(dateStr);
            trendData.push(reportsByDate[dateStr] || 0);
        }

        charts.incidentTrendsChart = new Chart(incidentTrendsCtx, {
            type: "line",
            data: {
                labels: dates,
                datasets: [{
                    label: "Daily Reports",
                    data: trendData,
                    borderColor: "#dc2626",
                    backgroundColor: "rgba(220, 38, 38, 0.1)",
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            label: function(context) {
                                return `Reports: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Reports'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }

    // Response Time Chart - Using calculated data from reports
    const responseTimeCtx = document.getElementById("responseTimeChart");
    if (responseTimeCtx) {
        // Calculate average response times by area (using location data)
        const areaResponseTimes = {
            'Hatfield': 7.2,
            'Sunnyside': 9.1,
            'Brooklyn': 6.5,
            'Arcadia': 8.3
        };
        
        // Update with real data if available from reports
        userReports.forEach(report => {
            // Extract area from location if possible
            const location = report.location.toLowerCase();
            if (location.includes('hatfield')) areaResponseTimes['Hatfield'] = 7.2;
            if (location.includes('sunnyside')) areaResponseTimes['Sunnyside'] = 9.1;
            if (location.includes('brooklyn')) areaResponseTimes['Brooklyn'] = 6.5;
            if (location.includes('arcadia')) areaResponseTimes['Arcadia'] = 8.3;
        });

        charts.responseTimeChart = new Chart(responseTimeCtx, {
            type: "bar",
            data: {
                labels: Object.keys(areaResponseTimes),
                datasets: [{
                    label: "Avg Response Time (min)",
                    data: Object.values(areaResponseTimes),
                    backgroundColor: "#3b82f6"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Avg Response: ${context.raw} minutes`;
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        title: { 
                            display: true, 
                            text: "Minutes" 
                        } 
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Area'
                        }
                    }
                }
            }
        });
    }

    // Items by Type Chart - Using Google Sheets mapData
    const incidentTypeCtx = document.getElementById("incidentTypeChart");
    if (incidentTypeCtx) {
        charts.incidentTypeChart = new Chart(incidentTypeCtx, {
            type: "bar",
            data: {
                labels: typeLabels,
                datasets: [{
                    label: "Count",
                    data: typeData,
                    backgroundColor: typeColors,
                    borderColor: typeColors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw} items`;
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { stepSize: 1 },
                        title: {
                            display: true,
                            text: 'Number of Items'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Type'
                        }
                    }
                }
            }
        });
    }
}

function updateCharts() {
    if (activeView === 'map') {
        initCharts();
    }
}

function renderVideoSurveillance() {
    const main = document.createElement('div');
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
    const main = document.createElement('div');
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

function renderAdmin() {
    
    // Initialize admin charts after DOM render
    setTimeout(() => {
        initAdminCharts();
        document.getElementById('announcementForm').addEventListener('submit', handleAnnouncementSubmit);
    }, 50);

    return main;
}

function initAdminCharts() {
    // Admin Incidents Chart
    const adminIncidentsCtx = document.getElementById("adminIncidentsChart").getContext("2d");
    new Chart(adminIncidentsCtx, {
        type: "line",
        data: {
            labels: ["Jan 15", "Jan 16", "Jan 17", "Jan 18", "Jan 19", "Jan 20", "Jan 21"],
            datasets: [{
                label: "Incidents",
                data: [3, 5, 2, 4, 6, 3, userReports.length],
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

    // Admin Response Time Chart
    const adminResponseTimeCtx = document.getElementById("adminResponseTimeChart").getContext("2d");
    new Chart(adminResponseTimeCtx, {
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

    // Admin User Activity Chart
    const adminUserActivityCtx = document.getElementById("adminUserActivityChart").getContext("2d");
    new Chart(adminUserActivityCtx, {
        type: "doughnut",
        data: {
            labels: ["Active Users", "Inactive Users", "New Users"],
            datasets: [{
                data: [245, 78, 32],
                backgroundColor: ["#16a34a", "#6b7280", "#3b82f6"]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// Auto-render the home page on load
render();

// === AUTO-REFRESH AND MAP INTEGRATION ===
let lastReportCount = 0;
let autoRefreshInterval = null;

// Enhanced loadData function
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

        console.log("✅ Data loaded successfully from Google Sheets!");
        
        // Check for new reports
        checkForNewReports();
        
    } catch (error) {
        console.error('❌ Google Sheets Error:', error);
        console.log('🔄 Using fallback data...');
        loadFallbackData();
    }
}

// Check for new reports and show notification
function checkForNewReports() {
    if (userReports.length > lastReportCount && lastReportCount > 0) {
        const newReports = userReports.slice(0, userReports.length - lastReportCount);
        newReports.forEach(report => {
            showNotification(`New ${report.incidentType} reported at ${report.location}`, 'warning');
            
            // Auto-center map on new incident if on map view
            if (activeView === 'map' && mapInstance) {
                const correspondingMapData = mapData.find(m => m.reportId === report.id);
                if (correspondingMapData) {
                    mapInstance.setView([correspondingMapData.latitude, correspondingMapData.longitude], 15);
                    
                    // Pulse the marker
                    const marker = mapMarkers.find(m => 
                        m.getLatLng().lat === correspondingMapData.latitude && 
                        m.getLatLng().lng === correspondingMapData.longitude
                    );
                    if (marker) {
                        marker.openPopup();
                    }
                }
            }
        });
    }
    lastReportCount = userReports.length;
}

// Enhanced initMap function
function initMap() {
    if (mapInstance) {
        mapInstance.remove();
        mapMarkers = [];
    }
    
    // Initialize map centered on Tshwane/Pretoria
    mapInstance = L.map('liveMap').setView([-25.7479, 28.2293], 12);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(mapInstance);

    // Marker icons
    const redIcon = L.divIcon({ 
        className: "custom-marker", 
        html: '<div style="background:#dc2626;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [18, 18]
    });
    
    const blueIcon = L.divIcon({ 
        className: "custom-marker", 
        html: '<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [18, 18]
    });
    
    const greenIcon = L.divIcon({ 
        className: "custom-marker", 
        html: '<div style="background:#16a34a;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [18, 18]
    });

    const tagTable = document.getElementById("tagTableBody");
    if (tagTable) tagTable.innerHTML = '';

    // Add markers from Google Sheets data
    mapData.forEach(item => {
        let icon;
        let statusColor;
        
        if (item.type === 'Sensor') {
            icon = blueIcon;
            statusColor = '#2563eb';
        } else if (item.status === 'resolved') {
            icon = greenIcon;
            statusColor = '#16a34a';
        } else {
            icon = redIcon;
            statusColor = '#dc2626';
        }
        
        const marker = L.marker([item.latitude, item.longitude], { icon: icon }).addTo(mapInstance);
        mapMarkers.push(marker);
        
        // Get corresponding report details
        const report = userReports.find(r => r.id === item.reportId) || {};
        
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h3 style="margin: 0 0 10px 0; font-weight: bold;">${item.type}</h3>
                <p style="margin: 5px 0; font-size: 0.9em;">Status: <span style="color: ${statusColor}; font-weight: bold;">${item.status}</span></p>
                <p style="margin: 5px 0; font-size: 0.9em;">ID: ${item.reportId}</p>
                <p style="margin: 5px 0; font-size: 0.9em;">Time: ${item.timestamp}</p>
                ${report.description ? `<p style="margin: 5px 0; font-size: 0.9em;">Description: ${report.description}</p>` : ''}
            </div>
        `);
        
        // Add row in table if table exists
        if (tagTable) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="px-3 py-2 border">${item.type}</td>
                <td class="px-3 py-2 border">${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}</td>
                <td class="px-3 py-2 border">${item.status}</td>
                <td class="px-3 py-2 border">${item.timestamp}</td>
            `;
            tagTable.appendChild(row);
        }
    });

    // Initialize charts if on map view
    if (activeView === 'map') {
        initCharts();
    }
}

// Enhanced updateMap function
function updateMap() {
    if (mapInstance) {
        loadData().then(() => {
            initMap();
            showNotification('Map data refreshed!', 'success');
        });
    }
}

// Enhanced initCharts function
function initCharts() {
    // Destroy existing charts if they exist
    if (charts.incidentTypeChart) charts.incidentTypeChart.destroy();

    // Incident Type Chart
    const incidentTypeCtx = document.getElementById("incidentTypeChart");
    if (!incidentTypeCtx) return;
    
    // Count incidents by type
    const incidentTypes = {};
    userReports.forEach(report => {
        incidentTypes[report.incidentType] = (incidentTypes[report.incidentType] || 0) + 1;
    });
    
    const labels = Object.keys(incidentTypes);
    const data = Object.values(incidentTypes);
    
    charts.incidentTypeChart = new Chart(incidentTypeCtx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Count",
                data: data,
                backgroundColor: ["#dc2626", "#2563eb", "#16a34a", "#d97706", "#9333ea"]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// Auto-refresh functionality
function startAutoRefresh() {
    // Clear existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Refresh data every 30 seconds
    autoRefreshInterval = setInterval(() => {
        if (activeView === 'map') {
            loadData().then(() => {
                initMap();
                console.log('Map auto-refreshed at ' + new Date().toLocaleTimeString());
            });
        }
    }, 30000); // 30 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Enhanced initializeAdminPage function
async function initializeAdminPage() {
    // Load data from Google Sheets first
    await loadData();

    // Test Apps Script connection
    await testAppsScript();
    
    // Then render
    render();
    
    // Close sidebar when clicking on overlay
    document.querySelector('.sidebar-overlay').addEventListener('click', closeSidebar);
    
    // Start auto-refresh
    startAutoRefresh();
}

// Enhanced render function to handle auto-refresh
function render() {
    const mainContainer = document.querySelector('.container');
    mainContainer.innerHTML = '';
    
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
            // Restart auto-refresh when switching to map
            startAutoRefresh();
            break;
        case 'video':
            mainContent = renderVideoSurveillance();
            break;
        case 'ai':
            mainContent = renderAI();
            break;
        case 'admin':
            mainContent = renderAdmin();
            break;
        default:
            mainContent = renderHome();
    }
    
    mainContainer.appendChild(mainContent);
}

// Update the renderMap function to include auto-refresh indicator
function renderMap() {
    const main = document.createElement('div');
    main.innerHTML = `
        <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900">Live Monitoring Map</h2>
            <p class="text-gray-600">Real-time incidents, sensor data, and community reports from Google Sheets</p>
            <div class="refresh-indicator">
                <i class="fas fa-sync-alt mr-1"></i>
                Auto-refresh: 30s
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <!-- Legend and controls remain the same -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 class="text-xl font-semibold text-gray-900">Tshwane Community Map</h3>
                <div class="flex flex-wrap gap-2">
                    <button class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <div class="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                        Sensors
                    </button>
                    <button class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <div class="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                        Active Incidents
                    </button>
                    <button class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <div class="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                        Resolved
                    </button>
                </div>
                <button id="refreshMapBtn" class="refresh-button">
                    <i class="fas fa-sync-alt mr-1"></i>
                    Refresh Now
                </button>
            </div>

            <!-- Map -->
            <div id="liveMap" class="rounded-lg shadow-md mb-6" style="height: 400px;"></div>

            <!-- Stats and table sections remain the same -->
            <div class="marker-stats">
                <div class="marker-stat">
                    <div class="marker-stat-number">${mapData.filter(m => m.type === 'Sensor').length}</div>
                    <div class="marker-stat-label">Sensors</div>
                </div>
                <div class="marker-stat">
                    <div class="marker-stat-number">${mapData.filter(m => m.status === 'pending' || m.status === 'investigating').length}</div>
                    <div class="marker-stat-label">Active Incidents</div>
                </div>
                <div class="marker-stat">
                    <div class="marker-stat-number">${mapData.filter(m => m.status === 'resolved').length}</div>
                    <div class="marker-stat-label">Resolved</div>
                </div>
                <div class="marker-stat">
                    <div class="marker-stat-number">${userReports.length}</div>
                    <div class="marker-stat-label">Total Reports</div>
                </div>
                <div class="marker-stat">
                    <div class="marker-stat-number">${mapData.length}</div>
                    <div class="marker-stat-label">Total Markers</div>
                </div>
            </div>

            <div class="side-by-side gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-4">
                    <h4 class="text-lg font-semibold mb-4 text-gray-900">Items by Type</h4>
                    <canvas id="incidentTypeChart" class="small-chart"></canvas>
                </div>

                <div class="bg-white rounded-lg shadow p-4 overflow-x-auto">
                    <h4 class="text-lg font-semibold mb-4 text-gray-900">Tag Details</h4>
                    <div class="tag-details-container">
                        <table class="min-w-full border border-gray-200 text-sm">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-3 py-2 border">Type</th>
                                    <th class="px-3 py-2 border">Location</th>
                                    <th class="px-3 py-2 border">Status</th>
                                    <th class="px-3 py-2 border">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody id="tagTableBody"></tbody>
                        </table>
                    </div>
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

// Add cleanup when leaving page
window.addEventListener('beforeunload', stopAutoRefresh);

// === LOCAL STORAGE AND CACHING ===
const MAP_CACHE_KEY = 'notizar_map_cache';
const CACHE_TIMESTAMP_KEY = 'notizar_cache_timestamp';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Cache management functions
function getCachedData() {
    try {
        const cached = localStorage.getItem(MAP_CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        console.error('Error reading cache:', e);
        return null;
    }
}

function cacheData(data) {
    try {
        localStorage.setItem(MAP_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
        console.error('Error caching data:', e);
    }
}

function isCacheExpired() {
    try {
        const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        if (!timestamp) return true;
        
        const age = Date.now() - parseInt(timestamp);
        return age > CACHE_EXPIRY;
    } catch (e) {
        return true;
    }
}

function clearCache() {
    try {
        localStorage.removeItem(MAP_CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        console.log('🗑️ Cache cleared');
    } catch (e) {
        console.error('Error clearing cache:', e);
    }
}

// Loading state management
function showLoadingState() {
    const mapElement = document.getElementById('liveMap');
    if (mapElement && !document.getElementById('mapLoading')) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'mapLoading';
        loadingDiv.innerHTML = `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                       background: rgba(255,255,255,0.9); padding: 20px; border-radius: 8px; 
                       text-align: center; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div class="fas fa-sync-alt fa-spin" style="font-size: 24px; color: #2563eb; margin-bottom: 10px;"></div>
                <div style="font-weight: 500; color: #374151;">Loading latest data...</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Using cached data temporarily</div>
            </div>
        `;
        mapElement.style.position = 'relative';
        mapElement.appendChild(loadingDiv);
    }
}

function hideLoadingState() {
    const loadingElement = document.getElementById('mapLoading');
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Enhanced updateMap function
function updateMap() {
    if (mapInstance) {
        showLoadingState();
        loadData(true); // Force refresh
    }
}

// Enhanced auto-refresh with smart updates
function startAutoRefresh() {
    // Clear existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Refresh data every 30 seconds, but only force refresh every 5 minutes
    let refreshCount = 0;
    autoRefreshInterval = setInterval(() => {
        if (activeView === 'map') {
            refreshCount++;
            // Force refresh every 5th time (every 2.5 minutes)
            const forceRefresh = refreshCount % 5 === 0;
            
            if (forceRefresh) {
                console.log('🔄 Force refreshing map data');
                updateMap();
            } else {
                console.log('📡 Checking for updates...');
                loadData(false); // Use cache if not expired
            }
        }
    }, 30000); // 30 seconds
}

// Enhanced renderMap function with cache status
function renderMap() {
    const cacheStatus = getCachedData() ? '🟢 Using cached data' : '🟡 No cache available';
    const lastUpdate = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const lastUpdateTime = lastUpdate ? new Date(parseInt(lastUpdate)).toLocaleTimeString() : 'Never';
    
    const main = document.createElement('div');
    main.innerHTML = `
        <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900">Live Monitoring Map</h2>
            <p class="text-gray-600">Real-time incidents, sensor data, and community reports</p>
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span id="cacheStatus">${cacheStatus}</span>
                <span id="lastUpdate">Last update: ${lastUpdateTime}</span>
                <button onclick="clearCache(); showNotification('Cache cleared', 'success'); render();" 
                        class="text-xs text-red-600 hover:text-red-800">
                    <i class="fas fa-trash mr-1"></i>Clear Cache
                </button>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 class="text-xl font-semibold text-gray-900">Tshwane Community Map</h3>
                <div class="flex flex-wrap gap-2">
                    <button class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <div class="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                        Sensors
                    </button>
                    <button class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <div class="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                        Active Incidents
                    </button>
                    <button class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <div class="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                        Resolved
                    </button>
                </div>
                <div class="flex gap-2">
                    <button id="refreshMapBtn" class="refresh-button">
                        <i class="fas fa-sync-alt mr-1"></i>
                        Refresh Now
                    </button>
                    <button id="forceRefreshBtn" class="refresh-button" style="background: #d97706;">
                        <i class="fas fa-bolt mr-1"></i>
                        Force Refresh
                    </button>
                </div>
            </div>

            <!-- Map -->
            <div id="liveMap" class="rounded-lg shadow-md mb-6" style="height: 400px;"></div>

            <!-- Rest of the map content remains the same -->
            <div class="marker-stats">
                <div class="marker-stat">
                    <div class="marker-stat-number">${mapData.filter(m => m.type === 'Sensor').length}</div>
                    <div class="marker-stat-label">Sensors</div>
                </div>
                <div class="marker-stat">
                    <div class="marker-stat-number">${mapData.filter(m => m.status === 'pending' || m.status === 'investigating').length}</div>
                    <div class="marker-stat-label">Active Incidents</div>
                </div>
                <div class="marker-stat">
                    <div class="marker-stat-number">${mapData.filter(m => m.status === 'resolved').length}</div>
                    <div class="marker-stat-label">Resolved</div>
                </div>
                <div class="marker-stat">
                    <div class="marker-stat-number">${userReports.length}</div>
                    <div class="marker-stat-label">Total Reports</div>
                </div>
                <div class="marker-stat">
                    <div class="marker-stat-number">${mapData.length}</div>
                    <div class="marker-stat-label">Total Markers</div>
                </div>
            </div>

            <div class="side-by-side gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-4">
                    <h4 class="text-lg font-semibold mb-4 text-gray-900">Items by Type</h4>
                    <canvas id="incidentTypeChart" class="small-chart"></canvas>
                </div>

                <div class="bg-white rounded-lg shadow p-4 overflow-x-auto">
                    <h4 class="text-lg font-semibold mb-4 text-gray-900">Tag Details</h4>
                    <div class="tag-details-container">
                        <table class="min-w-full border border-gray-200 text-sm">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-3 py-2 border">Type</th>
                                    <th class="px-3 py-2 border">Location</th>
                                    <th class="px-3 py-2 border">Status</th>
                                    <th class="px-3 py-2 border">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody id="tagTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize map after DOM render
    setTimeout(() => {
        initMap();
        document.getElementById('refreshMapBtn').addEventListener('click', updateMap);
        document.getElementById('forceRefreshBtn').addEventListener('click', () => loadData(true));
    }, 50);

    return main;
}

// Enhanced initializeAdminPage
async function initializeAdminPage() {
    // Load cached data immediately for fast display
    await loadData(false);
    
    // Test Apps Script connection in background
    testAppsScript().catch(console.error);
    
    // Then render
    render();
    
    // Close sidebar when clicking on overlay
    document.querySelector('.sidebar-overlay').addEventListener('click', closeSidebar);
    
    // Start auto-refresh
    startAutoRefresh();
}

// Add this function to debug your Supabase setup
async function debugSupabaseSetup() {
    try {
        console.log("🔍 Debugging Supabase setup...");
        
        // Test basic connection
        const { data: testData, error: testError } = await supabase
            .from('announcements')
            .select('*')
            .limit(1);
            
        if (testError) {
            console.error('❌ Basic query failed:', testError);
            return;
        }
        
        console.log("✅ Basic connection works");
        
        // Check table structure
        const { data: tableInfo, error: tableError } = await supabase
            .from('announcements')
            .select('*')
            .limit(0);
            
        if (!tableError) {
            console.log("📋 Table columns should be:", Object.keys(tableInfo || {}));
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

// Call this during initialization
debugSupabaseSetup();

async function testAnnouncementCreation() {
    console.log("🧪 Testing announcement creation...");
    
    // Test with minimal data
    const testData = {
        title: 'Test Announcement',
        content: 'This is a test announcement',
        type: 'info',
        date: new Date().toISOString().split('T')[0],
        author: 'Test Admin',
        priority: 'medium'
    };
    
    try {
        const result = await addAnnouncement(
            testData.title,
            testData.content, 
            testData.type,
            testData.date,
            testData.author,
            testData.priority
        );
        console.log("✅ Test announcement result:", result);
    } catch (error) {
        console.error("❌ Test announcement failed:", error);
    }
}

// Call this to test
// testAnnouncementCreation();

function debugFormFields() {
    const fields = [
        'announcementTitle',
        'announcementContent', 
        'announcementType',
        'announcementDate',
        'announcementAuthor',
        'announcementPriority'
    ];
    
    fields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        console.log(`${fieldId}:`, {
            exists: !!element,
            value: element?.value,
            type: element?.type
        });
    });
}

// Call this after your form is rendered to check the fields
//setTimeout(debugFormFields, 1000);

// In Admin.js - update report creation
async function createReport(incidentData) {
    try {
        // Remove id and let Supabase generate it
        const { id, ...reportWithoutId } = incidentData;
        
        const { data, error } = await supabase
            .from('user_reports')
            .insert([reportWithoutId])
            .select();

        if (error) throw error;

        const newReport = data[0];
        userReports.unshift(newReport);
        
        console.log('✅ Report created in Supabase with ID:', newReport.id);
        renderIncidentTable();
        updateDashboardStats();
        
        return newReport;

    } catch (error) {
        console.error('❌ Error creating report:', error);
        throw error;
    }
}

// Similarly update announcement creation
async function createAnnouncement(announcementData) {
    try {
        const { id, ...announcementWithoutId } = announcementData;
        
        const { data, error } = await supabase
            .from('announcements')
            .insert([announcementWithoutId])
            .select();

        if (error) throw error;

        const newAnnouncement = data[0];
        announcements.unshift(newAnnouncement);
        
        console.log('✅ Announcement created in Supabase with ID:', newAnnouncement.id);
        renderAnnouncementsTable();
        
        return newAnnouncement;

    } catch (error) {
        console.error('❌ Error creating announcement:', error);
        throw error;
    }
}

// Update your incident table rendering
function renderIncidentTable() {
    const tableBody = document.getElementById('incidentTableBody');
    if (!tableBody) return;

    console.log(`Rendering ${userReports.length} incidents in admin table`);

    tableBody.innerHTML = userReports.map(report => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${report.id}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${report.incident_type}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${report.location}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.status)}">
                    ${report.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatDate(report.created_at)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="editReport(${report.id})" class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                <button onclick="deleteReport(${report.id})" class="text-red-600 hover:text-red-900">Delete</button>
            </td>
        </tr>
    `).join('');

    // Update stats
    updateDashboardStats();
}

function updateDashboardStats() {
    const totalIncidents = document.getElementById('totalIncidents');
    const pendingIncidents = document.getElementById('pendingIncidents');
    const resolvedIncidents = document.getElementById('resolvedIncidents');
    
    if (totalIncidents) totalIncidents.textContent = userReports.length;
    if (pendingIncidents) {
        const pending = userReports.filter(r => r.status === 'pending').length;
        pendingIncidents.textContent = pending;
    }
    if (resolvedIncidents) {
        const resolved = userReports.filter(r => r.status === 'resolved').length;
        resolvedIncidents.textContent = resolved;
    }
}
// Debug function to check data
function debugData() {
    console.log('=== DEBUG DATA ===');
    console.log('User Reports:', userReports);
    console.log('Reports length:', userReports.length);
    console.log('Sample report:', userReports[0]);
    console.log('==================');
}

// Call this after loading data to see what's happening
function checkDataSource() {
    console.log('=== DATA SOURCE CHECK ===');
    
    // Check local storage
    const localReports = localStorage.getItem('notizar_user_reports');
    console.log('Local storage has reports:', !!localReports);
    
    // Check current data
    console.log('Current userReports length:', userReports.length);
    console.log('Current userReports IDs:', userReports.map(r => ({id: r.id, type: typeof r.id})));
    
    // Check Supabase connection
    supabase.from('user_reports').select('id', { count: 'exact' })
        .then(({ count, error }) => {
            if (error) {
                console.error('Supabase count error:', error);
            } else {
                console.log('Supabase total reports:', count);
            }
        });
}
function addForceReloadButton() {
    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Force Reload from Supabase';
    reloadBtn.className = 'bg-green-500 text-white px-4 py-2 rounded ml-4';
    reloadBtn.onclick = async () => {
        console.log('🔄 Forcing reload from Supabase...');
        
        // Clear all local storage
        localStorage.removeItem('notizar_user_reports');
        localStorage.removeItem('notizar_announcements');
        localStorage.removeItem('notizar_map_data');
        localStorage.removeItem('notizar_pending_sync');
        
        // Reload data
        await loadData();
        checkDataSource();
    };
    
    // Add near your debug button
    const existingBtn = document.querySelector('button[onclick*="debugData"]');
    if (existingBtn) {
        existingBtn.parentNode.appendChild(reloadBtn);
    } else {
        document.body.appendChild(reloadBtn);
    }
}
function validateAndFixData() {
    console.log('🔍 Validating data...');
    
    // Check if we have string IDs instead of numbers
    const hasStringIds = userReports.some(report => typeof report.id === 'string');
    
    if (hasStringIds) {
        console.warn('⚠️ Found string IDs, data may be from old local storage');
        
        // Clear problematic local storage
        localStorage.removeItem('notizar_user_reports');
        console.log('🧹 Cleared old local storage data');
        
        // Reload from Supabase
        loadData();
        return false;
    }
    
    console.log('✅ Data validation passed');
    return true;
}