<script>
	import { supabase } from '../../supabase';
	import { onMount } from 'svelte';
	import { user } from '$lib/auth';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';
	import { sidebarVisible, newFolderId } from '$lib/stores/sidebarStore';
	import '../../app.css';
	import { tick } from 'svelte';
	import { darkMode } from '$lib/stores/sidebarStore';
	import { afterUpdate } from 'svelte';
	import { spring } from 'svelte/motion';

	let isLoading = true;
	let folders = [];
	let newFolderName = '';
	let draggedFolder = null;
	let dragOverIndex = -1;

	let touchStartY = 0;
	let touchStartX = 0;
	let touchedElement = null;
	let touchedIndex = -1;
	let touchActive = false;
	let yOffset = 0;
	let folderElements = [];
	let folderHeight = 0;

	$: if ($user) {
		loadFolders();
	}

	function toggleDarkMode() {
		darkMode.update((value) => !value);
	}

	afterUpdate(() => {
		if (browser) {
			if ($sidebarVisible && window.innerWidth <= 768) {
				document.body.classList.add('sidebar-open');
			} else {
				document.body.classList.remove('sidebar-open');
			}
		}
	});

	onMount(() => {
		// Prevent regular scrolling when a drag operation is in progress
		if (browser) {
			const sidebar = document.querySelector('aside');
			if (sidebar) {
				sidebar.addEventListener(
					'touchmove',
					(e) => {
						if (touchActive) {
							e.preventDefault();
						}
					},
					{ passive: false }
				);
			}

			return () => {
				document.body.classList.remove('sidebar-open');
				if (sidebar) {
					sidebar.removeEventListener('touchmove', () => {});
				}
			};
		}
	});

	function handleTouchStart(event, folder, index) {
		// Prevent default only for the drag handle to allow scrolling elsewhere
		if (event.target.classList.contains('drag-handle')) {
			event.preventDefault();
			touchActive = true;
			touchedElement = event.currentTarget;
			touchedIndex = index;
			touchStartY = event.touches[0].clientY;
			touchStartX = event.touches[0].clientX;
			draggedFolder = folder;

			// Get element dimensions
			const rect = touchedElement.getBoundingClientRect();
			folderHeight = rect.height;

			// Apply visual feedback
			touchedElement.classList.add('dragging');

			// Get all folder elements for position comparison
			folderElements = Array.from(document.querySelectorAll('.folder-list li'));
		}
	}

	// Function to handle touch move
	function handleTouchMove(event) {
		if (!touchActive || !touchedElement) return;

		event.preventDefault();

		// Calculate how far we've moved
		const touchY = event.touches[0].clientY;
		yOffset = touchY - touchStartY;

		// Apply transform to the dragged element
		touchedElement.style.transform = `translateY(${yOffset}px)`;

		// Determine potential drop position
		const newIndex = determineDropIndex(touchY);
		if (newIndex !== -1 && newIndex !== touchedIndex) {
			dragOverIndex = newIndex;
		}
	}

	// Function to determine drop index based on Y position
	function determineDropIndex(touchY) {
		for (let i = 0; i < folderElements.length; i++) {
			if (i !== touchedIndex) {
				const rect = folderElements[i].getBoundingClientRect();
				const center = rect.top + rect.height / 2;

				if (touchY < center) {
					return i;
				}
			}
		}
		return folderElements.length - 1;
	}

	// Function to handle touch end
	function handleTouchEnd(event) {
		if (!touchActive) return;

		touchActive = false;
		touchedElement.style.transform = '';
		touchedElement.classList.remove('dragging');

		if (dragOverIndex !== -1 && dragOverIndex !== touchedIndex) {
			// Update local state
			const updatedFolders = [...folders];
			const [removed] = updatedFolders.splice(touchedIndex, 1);
			updatedFolders.splice(dragOverIndex, 0, removed);

			// Update display_order for all folders
			updatedFolders.forEach((folder, idx) => {
				folder.display_order = idx + 1;
			});

			folders = updatedFolders;

			// Update database
			updateFolderOrder(draggedFolder.id, dragOverIndex);
		}

		// Reset variables
		dragOverIndex = -1;
		touchedElement = null;
		touchedIndex = -1;
		draggedFolder = null;
	}

	async function loadFolders() {
		isLoading = true;
		const start = Date.now();

		try {
			const { data, error } = await supabase
				.from('folders')
				.select('*')
				.eq('user_id', $user.id)
				.order('display_order', { ascending: true });

			if (error) {
				console.error('Error loading folders:', error);
				return;
			}

			console.log('Loaded folders with order:', data);
			folders = data;
		} catch (error) {
			console.error('Error loading folder data:', error);
		} finally {
			const elapsed = Date.now() - start;
			if (elapsed < 500) {
				await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
			}
			isLoading = false;
		}
	}

	async function createFolder() {
		if (newFolderName.trim() && $user) {
			const maxOrder =
				folders.length > 0 ? Math.max(...folders.map((f) => f.display_order || 0)) : 0;

			const { data, error } = await supabase
				.from('folders')
				.insert({
					name: newFolderName.trim(),
					user_id: $user.id,
					display_order: maxOrder + 1
				})
				.select();

			if (error) {
				console.error('Error creating folder:', error);
			} else {
				folders = [...folders, data[0]];
				newFolderName = '';

				if (window.tutorial && window.tutorial.currentStep !== undefined) {
					newFolderId.set(data[0].id);
					await tick();
					Promise.resolve().then(() => {
						newFolderId.set(null);
						newFolderId.set(data[0].id);
					});
				}
			}
		}
	}

	$: if ($newFolderId) {
		console.log('New folder ID detected in Sidebar.svelte:', $newFolderId);
		if (
			window.tutorial &&
			window.tutorial.currentStep !== undefined &&
			typeof window.tutorial.folderCreated === 'function'
		) {
			window.tutorial.folderCreated($newFolderId);
		}
		newFolderId.set(null);
	}

	async function renameFolder(folder) {
		const newName = prompt('Enter a new name for the folder:', folder.name);
		if (newName && newName.trim() !== folder.name) {
			const { error } = await supabase
				.from('folders')
				.update({ name: newName.trim() })
				.eq('id', folder.id)
				.eq('user_id', $user.id);

			if (error) {
				console.error('Error renaming folder:', error);
			} else {
				await loadFolders();
			}
		}
	}

	async function deleteFolder(folder) {
		if (confirm(`Are you sure you want to delete the folder "${folder.name}"?`)) {
			const { error } = await supabase
				.from('folders')
				.delete()
				.eq('id', folder.id)
				.eq('user_id', $user.id);

			if (error) {
				console.error('Error deleting folder:', error);
			} else {
				folders = folders.filter((f) => f.id !== folder.id);
				await reorderFolders();
			}
		}
	}

	function handleDragStart(event, folder, index) {
		draggedFolder = folder;
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', folder.id);

		setTimeout(() => {
			event.target.classList.add('dragging');
		}, 0);
	}

	function handleDragEnd(event) {
		event.target.classList.remove('dragging');
		dragOverIndex = -1;
	}

	function handleDragOver(event, index) {
		event.preventDefault();
		dragOverIndex = index;
		return false;
	}

	function handleDragLeave() {}

	async function handleDrop(event, targetFolder, targetIndex) {
		event.preventDefault();

		if (!draggedFolder || draggedFolder.id === targetFolder.id) {
			return;
		}

		const sourceIndex = folders.findIndex((f) => f.id === draggedFolder.id);

		const updatedFolders = [...folders];
		const [removed] = updatedFolders.splice(sourceIndex, 1);
		updatedFolders.splice(targetIndex, 0, removed);

		updatedFolders.forEach((folder, idx) => {
			folder.display_order = idx + 1;
		});

		folders = updatedFolders;
		dragOverIndex = -1;

		await updateFolderOrder(draggedFolder.id, targetIndex);
	}

	async function updateFolderOrder(folderId, newIndex) {
		try {
			await reorderFolders();
		} catch (error) {
			console.error('Error updating folder order:', error);
			await loadFolders();
		}
	}

	async function reorderFolders() {
		for (let i = 0; i < folders.length; i++) {
			const folder = folders[i];
			const { error } = await supabase
				.from('folders')
				.update({ display_order: i + 1 })
				.eq('id', folder.id);

			if (error) {
				console.error(`Error updating folder ${folder.id}:`, error);
				return false;
			}
		}
		return true;
	}
</script>

<aside class:hidden={!$sidebarVisible}>
	{#if isLoading && (!browser || !window.tutorial || !window.tutorial.currentStep)}
		<div class="skeleton">
			<div class="skeleton-header"></div>
			<div class="skeleton-section">
				<div class="skeleton-entity"></div>
				<div class="skeleton-entity"></div>
				<div class="skeleton-entity"></div>
			</div>
			<div class="skeleton-section">
				<div class="skeleton-entity"></div>
				<div class="skeleton-entity"></div>
			</div>
		</div>
	{:else}
		<h2 id="test">Folders</h2>
		{#if $user}
			<ul class="folder-list">
				{#each folders as folder, index (folder.id)}
					<li
						class:drag-over={dragOverIndex === index}
						draggable="true"
						on:dragstart={(e) => handleDragStart(e, folder, index)}
						on:dragend={handleDragEnd}
						on:dragover={(e) => handleDragOver(e, index)}
						on:dragleave={handleDragLeave}
						on:drop={(e) => handleDrop(e, folder, index)}
						on:touchstart={(e) => handleTouchStart(e, folder, index)}
						on:touchmove|preventDefault={handleTouchMove}
						on:touchend={handleTouchEnd}
						on:touchcancel={handleTouchEnd}
					>
						<div class="folder-item">
							<span class="drag-handle">⋮⋮</span>
							<a
								href="/folder/{folder.id}"
								on:click={() => {
									if (window.innerWidth <= 768) {
										sidebarVisible.set(false);
									}
								}}
							>
								{folder.name}
							</a>
							<div class="folder-actions">
								<button class="btn-icon" on:click={() => renameFolder(folder)}>✏️</button>
								<button class="btn-icon" on:click={() => deleteFolder(folder)}>🗑️</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>

			<form class="side-form" on:submit|preventDefault={createFolder}>
				<input
					id="new-folder-input"
					type="text"
					bind:value={newFolderName}
					placeholder="New folder name"
				/>
				<button id="create-folder-button" class="button" type="submit">Create Folder</button>
			</form>

			<div class="dark-mode-toggle">
				<button class="toggle-switch" on:click={toggleDarkMode} aria-label="Toggle dark mode">
					<div class="toggle-slider" class:active={$darkMode}>
						<span class="toggle-icon">{$darkMode ? '🌙' : '☀️'}</span>
					</div>
				</button>
			</div>
		{:else}
			<p>Please log in to view your folders.</p>
		{/if}
	{/if}
</aside>
