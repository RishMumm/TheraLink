/**
 * TheraLink UX Enhancement Libraries & APIs
 * Healthcare-focused integrations for improved client experience
 * 
 * Based on recommendations from ChatGPT and Claude AI
 * Prioritized for HIPAA compliance and accessibility
 * 
 * LIBRARIES (via CDN):
 * - DOMPurify: XSS prevention (CRITICAL for HIPAA)
 * - Flatpickr: Accessible date/time picker
 * - Notyf: Toast notifications
 * - Feather Icons: Professional vector icons
 * 
 * APIs INTEGRATED:
 * - ZenQuotes API: Inspirational quotes
 * - Advice Slip API: Wellness tips
 * - OpenStreetMap/Nominatim: Geocoding
 * - SendGrid: Newsletter emails (via Edge Function)
 */

// ============================================
// CDN SCRIPT TAGS (Add to HTML <head>)
// ============================================
/*
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.css">

<!-- JS (before </body>) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js"></script>
*/

// ============================================
// 1. DOMPurify - XSS Prevention (CRITICAL)
// ============================================

function sanitizeHTML(dirty) {
    if (typeof DOMPurify === 'undefined') {
        console.warn('DOMPurify not loaded');
        return document.createTextNode(dirty).textContent;
    }
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: []
    });
}

function safeSetHTML(element, content) {
    element.innerHTML = sanitizeHTML(content);
}

// ============================================
// 2. Notyf - Toast Notifications
// ============================================

let notyfInstance = null;

function initNotifications() {
    if (typeof Notyf === 'undefined') return;
    notyfInstance = new Notyf({
        duration: 5000,
        position: { x: 'right', y: 'top' },
        dismissible: true,
        ripple: false
    });
}

function showSuccess(message) {
    notyfInstance?.success(message) || console.log('Success:', message);
}

function showError(message) {
    notyfInstance?.error(message) || console.error('Error:', message);
}

// ============================================
// 3. Flatpickr - Date/Time Picker
// ============================================

function initAppointmentPicker(selector, options = {}) {
    if (typeof flatpickr === 'undefined') return null;
    return flatpickr(selector, {
        enableTime: true,
        dateFormat: 'Y-m-d H:i',
        minDate: 'today',
        maxDate: new Date().fp_incr(90),
        disable: [date => date.getDay() === 0 || date.getDay() === 6],
        minTime: '09:00',
        maxTime: '18:00',
        minuteIncrement: 30,
        ariaDateFormat: 'F j, Y',
        ...options
    });
}

// ============================================
// 4. Quote & Wellness APIs
// ============================================

async function getInspirationalQuote() {
    try {
        const resp = await fetch('https://zenquotes.io/api/random');
        if (!resp.ok) throw new Error('Quote API failed');
        const data = await resp.json();
        return { quote: data[0].q, author: data[0].a };
    } catch (e) {
        return { quote: 'Take care of your mind, it takes care of you.', author: 'TheraLink' };
    }
}

async function getWellnessTip() {
    try {
        const resp = await fetch('https://api.adviceslip.com/advice');
        if (!resp.ok) throw new Error('Advice API failed');
        const data = await resp.json();
        return data.slip.advice;
    } catch (e) {
        return 'Remember to take breaks and practice self-care today.';
    }
}

// ============================================
// 5. Geocoding - Find Nearby Therapists
// ============================================

async function geocodeAddress(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    try {
        const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const results = await resp.json();
        if (!results.length) return null;
        return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
    } catch (e) {
        console.error('Geocoding failed:', e);
        return null;
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ============================================
// 6. Newsletter Subscription
// ============================================

async function subscribeToNewsletter(email, firstName = '') {
    const SUPABASE_URL = 'https://igdkkjdtfadagmtfqzmf.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZGtramR0ZmFkYWdtdGZxem1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzOTg0NDAsImV4cCI6MjA2NDk3NDQ0MH0.TLhpHc9hSfiu5gWZrxYdctK78Y8x6O_EWdLZWzlHb58';
    
    try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                email: email,
                first_name: firstName,
                subscribed_at: new Date().toISOString()
            })
        });
        
        if (resp.ok) {
            showSuccess('Thanks for subscribing! Check your email for confirmation.');
            return true;
        } else {
            throw new Error('Subscription failed');
        }
    } catch (e) {
        showError('Could not subscribe. Please try again.');
        return false;
    }
}

// ============================================
// 7. Crisis Resources (Static - No API needed)
// ============================================

const CRISIS_RESOURCES = {
    us: {
        suicide_lifeline: { number: '988', name: '988 Suicide & Crisis Lifeline' },
        crisis_text: { number: '741741', name: 'Crisis Text Line (text HOME)' },
        samhsa: { number: '1-800-662-4357', name: 'SAMHSA National Helpline' }
    },
    international: {
        befrienders: 'https://www.befrienders.org/need-to-talk'
    }
};

function showCrisisResources() {
    return `
        <div class="crisis-resources" role="alert">
            <h3>Need immediate help?</h3>
            <p><strong>988</strong> - Suicide & Crisis Lifeline (call or text)</p>
            <p><strong>Text HOME to 741741</strong> - Crisis Text Line</p>
            <p>These services are free, confidential, and available 24/7.</p>
        </div>
    `;
}

// ============================================
// 8. Accessibility Helpers
// ============================================

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getUserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formatLocalDateTime(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit'
    });
}

// ============================================
// Initialize on page load
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initNotifications();
    if (typeof feather !== 'undefined') feather.replace();
    if (prefersReducedMotion()) document.body.classList.add('reduced-motion');
    console.log('TheraLink libraries initialized');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sanitizeHTML, safeSetHTML, showSuccess, showError,
        initAppointmentPicker, getInspirationalQuote, getWellnessTip,
        geocodeAddress, calculateDistance, subscribeToNewsletter,
        CRISIS_RESOURCES, showCrisisResources,
        prefersReducedMotion, getUserTimezone, formatLocalDateTime
    };
}
