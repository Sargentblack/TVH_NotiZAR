// === SUPABASE CONFIGURATION ===
const SUPABASE_URL = 'https://cnptukavcjqbczlzihjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNucHR1a2F2Y2pxYmN6bHppaGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0OTMzODIsImV4cCI6MjA3NDA2OTM4Mn0.1l_E9OI8pKZpIA4f7arbWIl0h0WnZXGFq71Fn_vyQ04';

// === GOOGLE SHEETS CONFIGURATION (BACKUP) ===
const SHEET_ID = '1Gpj_0729wCx9mgg0NS7OY9J_hnkzOCuwfNR7J6-pw6c';
const API_KEY = 'AIzaSyD6pyc_Aze3RK_CjSg7kgOZe0ks471ZUgk';

const ANNOUNCEMENTS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Announcements!A2:G?key=${API_KEY}`;
const USER_REPORTS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/UserReports!A2:I?key=${API_KEY}`;
const MAP_DATA_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/MapData!A2:F?key=${API_KEY}`;

// === LOCAL STORAGE KEYS ===
const LOCAL_ANNOUNCEMENTS_KEY = 'notizar_announcements';
const LOCAL_USER_REPORTS_KEY = 'notizar_user_reports';
const LOCAL_MAP_DATA_KEY = 'notizar_map_data';
const PENDING_SYNC_KEY = 'notizar_pending_sync';