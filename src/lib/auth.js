import { supabase } from '../supabase';
import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { MICROSOFT_CLIENT_ID } from '$lib/env';
import { PublicClientApplication, BrowserAuthError } from "@azure/msal-browser";

export const user = writable(null);

// Supabase Authentication Functions
export async function signUp(email, password, firstName) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) throw authError;

    if (authData.user) {
        const { error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    id: authData.user.id,
                    email: authData.user.email,
                    first_name: firstName,
                    password: null
                }
            ]);

        if (insertError) throw insertError;
        await supabase.auth.signOut();
    }

    return authData;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;

    user.set(data.user);
    console.log('User signed in, dispatching UserLoggedIn event');
    document.dispatchEvent(new Event('UserLoggedIn'));
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    user.set(null);
    goto('/login');
}

export async function getCurrentUser() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    user.set(currentUser);
    return currentUser;
}

export async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) throw error;
    return data;
}

// Microsoft Authentication with MSAL

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: MICROSOFT_CLIENT_ID,
    authority: "https://login.microsoftonline.com/common",
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
    navigateToLoginRequestUrl: true
  },
  cache: {
    cacheLocation: "localStorage", // Change from sessionStorage to localStorage
    storeAuthStateInCookie: true,  // Enable cookies as fallback
  },
    system: {
      allowRedirectInIframe: true,
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) {
            return;
          }
          switch (level) {
            case 0: // Error
              console.error(message);
              return;
            case 1: // Warning
              console.warn(message);
              return;
            case 2: // Info
              console.info(message);
              return;
            case 3: // Verbose
              console.debug(message);
              return;
          }
        },
        logLevel: 3
      }
    }
  };
  

// Create MSAL instance
let msalInstance = null;
let isInitializing = false;
let initializePromise = null;

// Initialize MSAL in browser environment only
export function getMsalInstance() {
  if (typeof window !== 'undefined') {
    if (!msalInstance) {
      msalInstance = new PublicClientApplication(msalConfig);
      
      // Initialize the instance if not already initializing
      if (!isInitializing) {
        isInitializing = true;
        initializePromise = msalInstance.initialize()
          .catch(error => {
            console.error("Failed to initialize MSAL:", error);
            isInitializing = false;
            throw error;
          })
          .then(() => {
            isInitializing = false;
            return msalInstance;
          });
      }
    }
    return msalInstance;
  }
  return null;
}

// Add this function to auth.js
export function isMicrosoftLoggedIn() {
  const instance = getMsalInstance();
  if (!instance) return false;
  
  const accounts = instance.getAllAccounts();
  return accounts.length > 0;
}


// Ensure MSAL is initialized
export async function ensureInitialized() {
  const instance = getMsalInstance();
  if (!instance) return null;
  
  if (initializePromise) {
    await initializePromise;
  } else if (!isInitializing) {
    isInitializing = true;
    initializePromise = instance.initialize()
      .catch(error => {
        console.error("Failed to initialize MSAL:", error);
        isInitializing = false;
        throw error;
      })
      .then(() => {
        isInitializing = false;
        return instance;
      });
    await initializePromise;
  }
  
  return instance;
}

// Login with Microsoft
export async function loginWithMicrosoft() {
  const instance = getMsalInstance();
  if (!instance) return null;
  
  try {
    // Ensure MSAL is initialized
    await ensureInitialized();
    
    // Use redirect instead of popup for better compatibility
    const loginRequest = {
      scopes: ["openid", "profile", "email", "User.Read", "Calendars.Read"],
      // Explicitly use the Authorization Code flow with PKCE
      prompt: "select_account",
      redirectStartPage: window.location.href
    };
    
    // Try to login silently first
    try {
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        // User is already logged in, try to get token silently
        const silentRequest = {
          scopes: ["User.Read", "Calendars.Read"],
          account: accounts[0],
          forceRefresh: false
        };
        
        const response = await instance.acquireTokenSilent(silentRequest);
        return response;
      }
    } catch (silentError) {
      console.log("Silent login failed, proceeding with interactive login", silentError);
    }
    
    // If silent login fails or no accounts, use interactive login
    const response = await instance.loginRedirect(loginRequest);
    return response;
  } catch (error) {
    // Handle specific MSAL errors
    if (error instanceof BrowserAuthError) {
      console.error("MSAL Browser Auth Error:", error.errorCode, error.errorMessage);
      
      // If it's an interaction in progress error, try to handle it
      if (error.errorCode === "interaction_in_progress") {
        try {
          // Try to complete the interaction
          const result = await instance.handleRedirectPromise();
          return result;
        } catch (redirectError) {
          console.error("Error handling redirect:", redirectError);
        }
      }
    }
    
    console.error("Login failed:", error);
    return null;
  }
}

// Get access token for Microsoft Graph API
export async function getAccessToken() {
  try {
    // Ensure MSAL is initialized
    const instance = await ensureInitialized();
    if (!instance) return null;
    
    // Try to handle any pending redirects first
    try {
      const result = await instance.handleRedirectPromise();
      if (result) {
        return result.accessToken;
      }
    } catch (redirectError) {
      console.error("Error handling redirect:", redirectError);
    }
    
    const accounts = instance.getAllAccounts();
    if (accounts.length === 0) return null;
    
    const silentRequest = {
      scopes: ["User.Read", "Calendars.Read"],
      account: accounts[0]
    };
    
    try {
      const response = await instance.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      console.error("Token acquisition failed silently:", error);
      
      // If silent acquisition fails, fall back to redirect method
      try {
        await instance.acquireTokenRedirect({
          ...silentRequest,
          redirectStartPage: window.location.href
        });
        return null; // Will redirect, so won't return immediately
      } catch (interactiveError) {
        console.error("Interactive token acquisition failed:", interactiveError);
        return null;
      }
    }
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

// Logout from Microsoft
export async function logoutFromMicrosoft() {
  const instance = getMsalInstance();
  if (!instance) return;
  
  try {
    // Ensure MSAL is initialized
    await ensureInitialized();
    
    const accounts = instance.getAllAccounts();
    if (accounts.length === 0) return;
    
    const logoutRequest = {
      account: accounts[0],
      postLogoutRedirectUri: window.location.origin
    };
    
    await instance.logoutRedirect(logoutRequest);
  } catch (error) {
    console.error("Logout failed:", error);
  }
}