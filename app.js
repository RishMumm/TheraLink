// ============ SUPABASE CONFIGURATION ============
// SECURITY NOTE: The SUPABASE_ANON_KEY below is intentionally public.
// This "anon" key is designed by Supabase to be used in client-side code.
// Security is enforced through Row Level Security (RLS) policies on all tables.
// Sensitive operations (like OpenAI calls) use Edge Functions with service_role key.
// The service_role key is stored in Supabase secrets, NEVER in client code.
// For more info: https://supabase.com/docs/guides/api/api-keys
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

// ============ SMART MATCHING (K2 REASONING) ============

const SMART_MATCH_URL = `${SUPABASE_URL}/functions/v1/smart-match`;

// Check if case is complex enough to suggest smart matching
function isComplexCase(assessment) {
  const concerns = assessment.concerns || [];
  const preferences = assessment.preferences || [];
  const therapyStyles = assessment.therapy_styles || [];
  
  // Complex if: 3+ concerns, or high-specificity preferences
  const highSpecificityTerms = ['lgbtqia', 'bipolar', 'trauma', 'ptsd', 'addiction', 'eating'];
  const hasHighSpecificity = concerns.some(c => 
    highSpecificityTerms.some(term => c.toLowerCase().includes(term))
  );
  
  return concerns.length >= 3 || hasHighSpecificity || preferences.length >= 4;
}

// Get AI-powered smart matches
async function getSmartMatches(assessment, therapists) {
  try {
    const response = await fetch(SMART_MATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientAssessment: assessment,
        therapists: therapists,
        mode: 'rank'
      })
    });
    
    const data = await response.json();
    if (data.success && data.rankings) {
      return data.rankings;
    }
    return null;
  } catch (error) {
    console.error('Smart match error:', error);
    return null;
  }
}

// Explain why a specific therapist was matched
async function explainMatch(assessment, therapist) {
  try {
    const response = await fetch(SMART_MATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientAssessment: assessment,
        therapists: [therapist],
        mode: 'explain'
      })
    });
    
    const data = await response.json();
    if (data.success) {
      return {
        explanation: data.explanation,
        strengths: data.strengths || [],
        considerations: data.considerations || [],
        confidence: data.confidence || 0
      };
    }
    return null;
  } catch (error) {
    console.error('Explain match error:', error);
    return null;
  }
}

// Show explanation modal for a therapist match
async function showMatchExplanation(therapistId) {
  const user = supabaseClient.auth.user();
  if (!user) return;
  
  // Show loading state
  alert('Analyzing your match... This takes about 10 seconds.');
  
  const assessment = await getPatientAssessment(user.id);
  const therapists = await getAllTherapists();
  const therapist = therapists.find(t => t.id === therapistId);
  
  if (!assessment || !therapist) return;
  
  const explanation = await explainMatch(assessment, therapist);
  
  if (explanation) {
    // Create explanation modal
    const modal = document.createElement('div');
    modal.className = 'explanation-modal';
    modal.innerHTML = `
      <div class="explanation-content">
        <h3>Why ${therapist.name || 'This Therapist'} is a Good Match</h3>
        <div class="confidence-badge">Match Confidence: ${explanation.confidence}%</div>
        <p>${explanation.explanation}</p>
        <h4>Strengths</h4>
        <ul>${explanation.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
        <h4>Considerations</h4>
        <ul>${explanation.considerations.map(c => `<li>${c}</li>`).join('')}</ul>
        <button onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    alert('Could not generate explanation. Please try again.');
  }
}

// Offer smart matching if case is complex
function offerSmartMatching(assessment, fastResults) {
  if (isComplexCase(assessment) || fastResults.length < 3 || fastResults[0]?.score < 15) {
    const container = document.getElementById('therapist-results');
    if (container) {
      const offerDiv = document.createElement('div');
      offerDiv.className = 'smart-match-offer';
      offerDiv.innerHTML = `
        <p>🧠 <strong>Want deeper analysis?</strong></p>
        <p>Our AI can provide more personalized matching with detailed explanations.</p>
        <button onclick="runSmartMatching()" class="btn-secondary">Run AI Analysis (~10 sec)</button>
      `;
      container.insertBefore(offerDiv, container.firstChild);
    }
  }
}

// Run smart matching on demand
async function runSmartMatching() {
  const user = supabaseClient.auth.user();
  if (!user) return;
  
  const container = document.getElementById('therapist-results');
  if (container) {
    container.innerHTML = '<p class="loading">🧠 Running AI analysis... This takes about 10 seconds.</p>';
  }
  
  const assessment = await getPatientAssessment(user.id);
  const therapists = await getAllTherapists();
  
  if (!assessment || therapists.length === 0) {
    container.innerHTML = '<p>Unable to run analysis. Please complete your assessment first.</p>';
    return;
  }
  
  const smartResults = await getSmartMatches(assessment, therapists);
  
  if (smartResults && smartResults.length > 0) {
    // Merge smart results with therapist data
    const mergedResults = smartResults.map(sr => {
      const therapist = therapists.find(t => t.id === sr.therapist_id);
      return { ...therapist, ...sr };
    });
    
    container.innerHTML = `
      <div class="smart-results-header">
        <span class="ai-badge">🧠 AI-Powered Results</span>
      </div>
      ${mergedResults.slice(0, 5).map(t => `
        <div class="therapist-card smart-matched">
          <h3>${t.name || 'Therapist'}</h3>
          <p class="match-score">AI Confidence: ${t.confidence}%</p>
          <p class="personalized-reason">${t.personalized_reason}</p>
          <p><strong>Specializations:</strong> ${(t.specializations || []).join(', ') || 'N/A'}</p>
          <button onclick="showMatchExplanation('${t.id}')">Why This Match?</button>
          <button onclick="bookAppointment('${t.id}')">Book Consultation</button>
        </div>
      `).join('')}
    `;
  } else {
    container.innerHTML = '<p>AI analysis could not be completed. Showing standard results.</p>';
    showMatches(); // Fallback to regular matching
  }
}

console.log('TheraLink Smart Matching loaded');
console.log('TheraLink app.js loaded');
