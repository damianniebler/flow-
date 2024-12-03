import { writable } from 'svelte/store';

export const sidebarVisible = writable(true);
export const newFolderId = writable(null);
export const darkMode = writable(false);