import { writable } from 'svelte/store';

// This store will hold the popup's visibility and message
export const popupStore = writable({ visible: false, title: '' });
