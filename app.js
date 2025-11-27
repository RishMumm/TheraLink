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

console.log('TheraLink app.js loaded');
