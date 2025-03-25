import { supabase } from '../supabase';
import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { MICROSOFT_CLIENT_ID } from '$lib/env';
import { PublicClientApplication, BrowserAuthError } from "@azure/msal-browser";

export const user = writable(null);

// Supabase Authentication Functions (unchanged)
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
    cacheLocation: "localStorage", // Use localStorage
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

// Check if the user is logged in with Microsoft
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
    if (!instance) return;

    try {
        // Ensure MSAL is initialized
        await ensureInitialized();

        const loginRequest = {
            scopes: ["openid", "profile", "email", "User.Read", "Calendars.Read"],
            prompt: "select_account",
            redirectUri: typeof window !== 'undefined' ? window.location.origin : ''
        };

        // Redirect to Microsoft login
        await instance.loginRedirect(loginRequest);

    } catch (error) {
        console.error("Login failed:", error);
    }
}

// Get access token for Microsoft Graph API
export async function getAccessToken() {
    const instance = getMsalInstance();
    if (!instance) return null;

    try {
        // Ensure MSAL is initialized
        await ensureInitialized();

        // Try to handle any pending redirects first
        const redirectResult = await instance.handleRedirectPromise();
        if (redirectResult) {
          console.log("handleRedirectPromise result:", redirectResult);
          return redirectResult.accessToken; // Return the token if redirect was successful
        }

        const accounts = instance.getAllAccounts();
        console.log("Current accounts:", accounts);

        if (accounts.length === 0) {
            console.log("No accounts found.");
            return null; // No accounts, return null
        }

        const silentRequest = {
            scopes: ["User.Read", "Calendars.Read"],
            account: accounts[0]
        };

        try {
            const response = await instance.acquireTokenSilent(silentRequest);
            console.log("Silent token acquisition response:", response);
            return response.accessToken;
        } catch (error) {
            console.error("Token acquisition failed silently:", error);

            // If silent acquisition fails AND user is not logged in, redirect
            if (error instanceof BrowserAuthError && error.errorCode === "interaction_required") {
                console.log("Interaction required, redirecting to login.");
                await instance.loginRedirect({
                    ...silentRequest,
                    redirectStartPage: window.location.href,
                });
                return null; // Important: Return null after redirecting
            }
            return null; // Return null for other errors
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
