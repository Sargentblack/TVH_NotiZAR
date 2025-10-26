// === GOOGLE SHEETS CONFIGURATION ===
const SHEET_ID = '1Gpj_0729wCx9mgg0NS7OY9J_hnkzOCuwfNR7J6-pw6c';
const API_KEY = 'AIzaSyD6pyc_Aze3RK_CjSg7kgOZe0ks471ZUgk';

// Google Sheets URLs
const ANNOUNCEMENTS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Announcements!A2:G?key=${API_KEY}`;
const USER_REPORTS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/UserReports!A2:I?key=${API_KEY}`;
const MAP_DATA_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/MapData!A2:F?key=${API_KEY}`;

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

        console.log("Data loaded successfully:", { announcements, userReports, mapData });
        
    } catch (error) {
        console.error('Error loading data from Google Sheets:', error);
        // Fallback to demo data
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

// Add user report with location to Google Sheets
async function addUserReport(reportData, coordinates = null) {
    const newReport = {
        id: `UR-${Date.now()}`,
        ...reportData,
        timestamp: new Date().toLocaleString(),
        status: 'pending',
        adminNotes: '',
        coordinates: coordinates
    };

    try {
        // Add to UserReports
        const reportsAppendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/UserReports!A2:I:append?valueInputOption=RAW&key=${API_KEY}`;
        
        await fetch(reportsAppendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                values: [[
                    newReport.id,
                    newReport.incidentType,
                    newReport.location,
                    newReport.description,
                    newReport.timestamp,
                    newReport.status,
                    newReport.anonymous.toString(),
                    newReport.contact || '',
                    newReport.adminNotes
                ]]
            })
        });

        // Add to MapData if coordinates available
        if (coordinates) {
            const mapAppendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/MapData!A2:F:append?valueInputOption=RAW&key=${API_KEY}`;
            
            await fetch(mapAppendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    values: [[
                        newReport.id,
                        coordinates.lat.toString(),
                        coordinates.lng.toString(),
                        newReport.incidentType,
                        newReport.status,
                        newReport.timestamp
                    ]]
                })
            });

            mapData.unshift({
                reportId: newReport.id,
                latitude: coordinates.lat,
                longitude: coordinates.lng,
                type: newReport.incidentType,
                status: newReport.status,
                timestamp: newReport.timestamp
            });
        }

        userReports.unshift(newReport);
        showNotification('Report submitted with location data!', 'success');

    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        userReports.unshift(newReport);
        showNotification('Report saved locally', 'warning');
    }

    return newReport;
}

// Submit a new report
export const submitReport = async (reportData) => {
    try {
        const { data, error } = await supabase
            .from('Database')
            .insert([{
                name: reportData.name || null,
                age: reportData.age || null,
                email: reportData.email || null,
                iDNum: reportData.iDNum || null,
                report: reportData.report,
                reportType: reportData.reportType,
                location: reportData.location,
                anon: reportData.anon,
                status: 'submitted',
                user_id: reportData.userId || null
            }])
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error submitting report:', error);
        return { success: false, error: error.message };
    }
};

// Get user's previous reports
export const getUserReports = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('Database')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching user reports:', error);
        return { success: false, error: error.message };
    }
};

// Get admin updates for a specific report
export const getReportUpdates = async (reportId) => {
    try {
        const { data, error } = await supabase
            .from('AdminUpdates')
            .select('*')
            .eq('report_id', reportId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching report updates:', error);
        return { success: false, error: error.message };
    }
};

// Listen for real-time admin updates
export const listenForAdminUpdates = (userId, callback) => {
    return subscribeToAdminUpdates((update) => {
        if (update.user_id === userId) {
            callback(update);
            
            // Show browser notification for high priority updates
            if (update.priority === 'emergency' || update.priority === 'high') {
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`NotiZAR Update - ${update.priority.toUpperCase()}`, {
                        body: update.message,
                        icon: '/logo.png',
                        tag: `update-${update.id}`
                    });
                }
            }
        }
    });
};

// Mark update as read
export const markUpdateAsRead = async (updateId) => {
    try {
        const { error } = await supabase
            .from('AdminUpdates')
            .update({ is_read: true })
            .eq('id', updateId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error marking update as read:', error);
        return { success: false, error: error.message };
    }
};

// Get user location for reports
export const getUserLocation = () => {
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
};

// Initialize form submission (for standalone use)
export const initializeUserForm = () => {
    const form = document.getElementById("reportForm");
    const locationBtn = document.getElementById("getLocationBtn");
    
    if (locationBtn) {
        locationBtn.addEventListener("click", async () => {
            try {
                const location = await getUserLocation();
                document.getElementById("location").value = `${location.lat}, ${location.lng}`;
                document.getElementById("output").textContent = "Location acquired successfully!";
            } catch (error) {
                document.getElementById("output").textContent = "Error getting location: " + error.message;
            }
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            try {
                // Get form values
                const name = document.getElementById("name").value.trim() || null;
                const age = document.getElementById("age").value ? parseInt(document.getElementById("age").value) : null;
                const email = document.getElementById("email").value.trim() || null;
                const iDNum = document.getElementById("iDNum").value.trim() || null;
                const report = document.getElementById("report").value.trim();
                const reportType = document.getElementById("reportType").value.trim();
                const location = document.getElementById("location").value.trim();
                const anon = document.querySelector('input[name="anon"]:checked')?.value || "no";

                // Validation
                if (!report || !reportType || !location) {
                    alert("Please fill in all required fields");
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

                // Use the new Google Sheets function instead of submitReport
                const result = await addUserReport({
                    name, age, email, iDNum, report, reportType, location, anon
                }, coordinates);

                if (result) {
                    document.getElementById("output").textContent = "Report submitted successfully!\n" + JSON.stringify(result, null, 2);
                    alert("Report submitted successfully!");
                    
                    // Clear form
                    form.reset();
                } else {
                    document.getElementById("output").textContent = "Error submitting report";
                    alert("Error submitting report");
                }
            } catch (error) {
                console.error("Unexpected error:", error);
                document.getElementById("output").textContent = "Unexpected error: " + error.message;
            }
        });
    }
};

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
    window.EndUser = { 
        submitReport, 
        getUserReports, 
        getReportUpdates, 
        listenForAdminUpdates, 
        markUpdateAsRead, 
        initializeUserForm,
        getUserLocation,
        addUserReport,
        loadData
    };
    
    // Auto-initialize if user page - FIXED VERSION
    document.addEventListener('DOMContentLoaded', async () => {
        console.log("DOM loaded, initializing EndUser...");
        
        // Load data from Google Sheets first
        await loadData();

        // Enhanced loadData with better error handling
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
        
    } catch (error) {
        console.error('❌ Google Sheets Error:', error);
        console.log('🔄 Using fallback data...');
        loadFallbackData();
    }
}
        
        // Wait a bit for DOM to be fully ready, then initialize form
        setTimeout(() => {
            if (document.getElementById("reportForm")) {
                initializeUserForm();
                console.log("User form initialized successfully");
            } else {
                console.log("Report form not found on this page");
            }
        }, 100);
    });
}


function renderMap() {
    const main = document.createElement('main');
    main.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8';
    main.innerHTML = `
        <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900">Live Monitoring Map</h2>
            <p class="text-gray-600">Real-time view of sensors, incidents, and community watch activities</p>
        </div>

        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 class="text-xl font-semibold text-gray-900">Tshwane Infrastructure Map</h3>
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
                </div>
            </div>

            <div id="map" class="rounded-lg mb-4"></div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-center mb-2">
                        <div class="bg-blue-600 p-2 rounded-lg mr-3">
                            <i data-lucide="radio" class="h-5 w-5 text-white"></i>
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-900">143 Sensors Active</h4>
                            <p class="text-sm text-gray-600">4 offline</p>
                        </div>
                    </div>
                </div>

                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center mb-2">
                        <div class="bg-red-600 p-2 rounded-lg mr-3">
                            <i data-lucide="alert-triangle" class="h-5 w-5 text-white"></i>
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-900">2 Active Incidents</h4>
                            <p class="text-sm text-gray-600">Response in progress</p>
                        </div>
                    </div>
                </div>

                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-center mb-2">
                        <div class="bg-green-600 p-2 rounded-lg mr-3">
                            <i data-lucide="users" class="h-5 w-5 text-white"></i>
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-900">8 Active Patrols</h4>
                            <p class="text-sm text-gray-600">In your area</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- ... rest of the content ... -->
        </div>
    `;

    // Now, we'll initialize the map after the element is added to the DOM
    setTimeout(() => {
        const map = L.map('map').setView([-25.7459, 28.2372], 13); // Centered around Tshwane

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Add markers for incidents
        incidents.forEach(incident => {
            const marker = L.marker([incident.lat, incident.lng]).addTo(map);
            marker.bindPopup(`
                <strong>${incident.description}</strong><br>
                Location: ${incident.location}<br>
                Type: ${incident.type}
            `);
        });

        // You can also add circle markers for sensors, etc.
    }, 0);

    return main;
}