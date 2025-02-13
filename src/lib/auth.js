import { supabase } from '../supabase';
import { writable } from 'svelte/store';
import { goto } from '$app/navigation';

export const user = writable(null);

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