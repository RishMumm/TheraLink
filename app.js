// ============ SUPABASE CONFIGURATION ============
const SUPABASE_URL = 'https://igdkkjdtfadagmtfqzmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZGtramR0ZmFkYWdtdGZxem1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2NzI4NjYsImV4cCI6MjA0ODI0ODg2Nn0.6rAT2FaAMQ2MG4QsOGvd2D-2EXLfnZnBpZBJtgfU-bY';

// Initialize Supabase client
let supabaseClient = null;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized successfully');
} catch (e) {
    console.error('Failed to initialize Supabase:', e);
}

// ============ AUTH FUNCTIONS ============

// Handle Sign Up
async function handleSignUp(email, password) {
    if (!supabaseClient) {
        return { error: { message: 'Supabase not initialized' } };
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Sign up error:', error);
            return { error };
        }
        
        console.log('Sign up successful:', data);
        return { data };
    } catch (e) {
        console.error('Sign up exception:', e);
        return { error: { message: e.message } };
    }
}

// Handle Sign In
async function handleSignIn(email, password) {
    if (!supabaseClient) {
        return { error: { message: 'Supabase not initialized' } };
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Sign in error:', error);
            return { error };
        }
        
        console.log('Sign in successful:', data);
        return { data };
    } catch (e) {
        console.error('Sign in exception:', e);
        return { error: { message: e.message } };
    }
}

// Handle Sign Out
async function handleSignOut() {
    if (!supabaseClient) return;
    
    try {
        await supabaseClient.auth.signOut();
        console.log('Signed out successfully');
    } catch (e) {
        console.error('Sign out error:', e);
    }
}

// ============ UI FUNCTIONS ============

let isSignUpMode = false;

function showSignInPage() {
    document.getElementById('signInPage').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideSignInPage() {
    document.getElementById('signInPage').classList.add('hidden');
    document.body.style.overflow = '';
}

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('authPageTitle');
    const toggle = document.getElementById('toggleAuthPage');
    
    if (isSignUpMode) {
        title.textContent = 'Sign Up';
        toggle.textContent = 'Sign in';
    } else {
        title.textContent = 'Sign In';
        toggle.textContent = 'Sign up';
    }
}

// ============ EVENT LISTENERS ============

document.addEventListener('DOMContentLoaded', function() {
    // Auth button click
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.addEventListener('click', showSignInPage);
    }
    
    // Toggle auth mode
    const toggleBtn = document.getElementById('toggleAuthPage');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleAuthMode();
        });
    }
    
    // Form submission
    const authForm = document.getElementById('authPageForm');
    if (authForm) {
        authForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('authPageEmail').value;
            const password = document.getElementById('authPagePassword').value;
            
            if (!email || !password) {
                alert('Please enter email and password');
                return;
            }
            
            let result;
            if (isSignUpMode) {
                result = await handleSignUp(email, password);
                if (!result.error) {
                    alert('Sign up successful! Check your email to confirm.');
                    hideSignInPage();
                }
            } else {
                result = await handleSignIn(email, password);
                if (!result.error) {
                    alert('Welcome back!');
                    hideSignInPage();
                }
            }
            
            if (result.error) {
                alert('Error: ' + result.error.message);
            }
        });
    }
});


// ============ AI THERAPIST MATCHING SYSTEM ============

// Fetch patient assessment from database
async function getPatientAssessment(userId) {
  const { data, error } = await supabaseClient
    .from('patient_assessments')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) console.error(error);
  return data;
}

// Fetch all available therapists
async function getAllTherapists() {
  const { data, error } = await supabaseClient
    .from('therapists')
    .select('*')
    .eq('accepts_new_clients', true);
  
  if (error) console.error(error);
  return data || [];
}

// Compute compatibility score between patient and therapist
function computeScore(patient, therapist) {
  const concerns = patient.concerns || [];
  const prefs = patient.preferences || [];
  const styles = patient.therapy_styles || [];
  
  const tSpecs = therapist.specializations || [];
  const tApproaches = therapist.approaches || [];
  
  // Calculate matches
  const concernMatches = concerns.filter(c => tSpecs.includes(c)).length;
  const styleMatches = styles.filter(s => tApproaches.includes(s)).length;
  const preferenceMatches = prefs.filter(p => JSON.stringify(therapist).toLowerCase().includes(p.toLowerCase())).length;
  
  // Availability bonus
  const availabilityBonus = therapist.availability ? 10 : 0;
  
  // Weighted score calculation
  const score = 
    (concernMatches * 5) + 
    (styleMatches * 3) + 
    (preferenceMatches * 2) + 
    availabilityBonus;
  
  return score;
}

// Get ranked therapist matches for a user
async function getRankedTherapistMatches(userId) {
  const patient = await getPatientAssessment(userId);
  const therapists = await getAllTherapists();
  
  if (!patient || therapists.length === 0) return [];
  
  const scored = therapists.map(t => ({
    ...t,
    score: computeScore(patient, t)
  }));
  
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// Display matches in the UI
async function showMatches() {
  const user = supabaseClient.auth.user();
  if (!user) {
    alert('Please sign in to see therapist matches');
    return;
  }
  
  const results = await getRankedTherapistMatches(user.id);
  const container = document.getElementById('therapist-results');
  
  if (!container) return;
  
  if (results.length === 0) {
    container.innerHTML = '<p>No matches found. Please complete your assessment first.</p>';
    return;
  }
  
  container.innerHTML = results.slice(0, 5).map(t => `
    <div class="therapist-card">
      <h3>${t.name || 'Therapist'}</h3>
      <p class="match-score">Match Score: ${t.score}</p>
      <p><strong>Specializations:</strong> ${(t.specializations || []).join(', ') || 'N/A'}</p>
      <p><strong>Approaches:</strong> ${(t.approaches || []).join(', ') || 'N/A'}</p>
      <button onclick="bookAppointment('${t.id}')">Book Consultation</button>
    </div>
  `).join('');
}

// Save patient assessment
async function saveAssessment(assessmentData) {
  const user = supabaseClient.auth.user();
  if (!user) {
    alert('Please sign in first');
    return { error: { message: 'Not authenticated' } };
  }
  
  const { data, error } = await supabaseClient
    .from('patient_assessments')
    .upsert({
      user_id: user.id,
      concerns: assessmentData.concerns,
      preferences: assessmentData.preferences,
      therapy_styles: assessmentData.therapy_styles,
      updated_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Error saving assessment:', error);
    return { error };
  }
  
  return { data };
}

// Handle assessment form submission
function handleAssessmentSubmit(event) {
  event.preventDefault();
  
  // Get selected concerns
  const concerns = Array.from(document.querySelectorAll('input[name="concerns"]:checked'))
    .map(el => el.value);
  
  // Get selected preferences
  const preferences = Array.from(document.querySelectorAll('input[name="preferences"]:checked'))
    .map(el => el.value);
  
  // Get selected therapy styles
  const therapy_styles = Array.from(document.querySelectorAll('input[name="therapy_styles"]:checked'))
    .map(el => el.value);
  
  saveAssessment({ concerns, preferences, therapy_styles })
    .then(result => {
      if (!result.error) {
        alert('Assessment saved! Finding your matches...');
        showMatches();
        document.getElementById('assessment-section').style.display = 'none';
        document.getElementById('matches-section').style.display = 'block';
      }
    });
}

// Book appointment placeholder
function bookAppointment(therapistId) {
  alert('Booking feature coming soon! Therapist ID: ' + therapistId);
}

// Show assessment section
function showAssessment() {
  document.getElementById('assessment-section').style.display = 'block';
  document.getElementById('matches-section').style.display = 'none';
}

console.log('TheraLink AI Matching System loaded');
console.log('TheraLink app.js loaded');
