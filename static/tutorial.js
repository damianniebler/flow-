class Tutorial {
  constructor() {
    console.log('Tutorial initialized');
    this.sectionsCreated = 0;

    const tutorialCompleted = localStorage.getItem('tutorialCompleted');
    const tutorialDismissed = sessionStorage.getItem('tutorialDismissed');
    
    if (!tutorialCompleted && !tutorialDismissed) {
        document.addEventListener('UserLoggedIn', () => {
            this.start();
        });
    }
    console.log('Tutorial initialized, sectionsCreated:', this.sectionsCreated);

    this.initialStep = {
      message: "Welcome! How do you plan to use this app?",
      options: [
        "Work/Professional",
        "School/Education",
        "Personal/Family Life",
        "Hobbies/Creative Projects"
      ],
      elementId: "usage-selection"
    };

    this.workSteps = [
      {
        message: "Great! Now click the 'Create Folder' button to create your first folder.",
        elementIds: ["new-folder-input", "create-folder-button"]
      },
      {
        message: "Excellent, now let's click into the folder and start creating sections and entities.",
      },
      {
        message: "Let's create a section called Work In-Progress, and another section called Completed.",
      },
      {
        message: "Now let's create an entity called Joe's Bakery in the Work In-Progress section. Click the '+ Add new entity' button.",
        elementId: "add-entity-btn",
        action: () => {
          const addEntityBtn = document.getElementById('add-entity-btn');
          if (addEntityBtn) {
            addEntityBtn.addEventListener('click', () => this.nextStep(), { once: true });
          }
        }
      },
      {
        message: "Awsome! Just so you know, you can always rename, delete, reorder, and move entities between different folders. You can even drag and drop entities between sections, and reorder sections. Now let's click into Joe's Bakery now, so we can learn about creating items in an entty.",
      },
      {
        message: "Here you can create items and keep track of their completion status. Let's create an item called, Content Plan for Instagram.",
        elementIds: ["new-item-input", "add-item-button"],
        action: () => {
          const newItemInput = document.getElementById('new-item-input');
          if (newItemInput) {
            newItemInput.value = 'Content Plan for Instagram';
            newItemInput.dispatchEvent(new Event('input'));
            this.highlightElements();
          }
        }
      },
      {
        message: "You'll now be able to mark items as complete, rename them, delete them, update when you last worked on them, or even add a note. Try adding a note now.",
        elementIds: ["item-note"],
      },
      {
        message: "When you're done press Save Note or press CTRL/Command + S on the keyboard.",
        elementIds: ["save-note","note-area"],
      },
      {
        message: "Great job - you should now understand the basics around how to use the app!",
        showThanksButton: true
      }
    ];

    this.schoolSteps = [
      {
        message: "Great! Now click the 'Create Folder' button to create your first folder.",
        elementIds: ["new-folder-input", "create-folder-button"]
      },
      {
        message: "Excellent! Now click into the folder to start organizing your class notes, assignments, and materials.",
      },
      {
        message: "Let's create two sections to help you stay organized. One section will be called 'Ongoing Assignments' and the other 'Completed Assignments'.",
      },
      {
        message: "Next, let's create an entity for a specific subject. For example, 'Math Homework' in the Ongoing Assignments section. Click the '+ Add new entity' button.",
        elementId: "add-entity-btn",
        action: () => {
          const addEntityBtn = document.getElementById('add-entity-btn');
          if (addEntityBtn) {
            addEntityBtn.addEventListener('click', () => this.nextStep(), { once: true });
          }
        }
      },
      {
        message: "Awesome! You can always rename, delete, reorder, and move entities between sections. Let's click into 'Math Homework' to organize tasks related to this assignment.",
      },
      {
        message: "Now, create an item to track specific tasks. For example, 'Chapter 3 Exercises'.",
        elementIds: ["new-item-input", "add-item-button"],
        action: () => {
          const newItemInput = document.getElementById('new-item-input');
          if (newItemInput) {
            newItemInput.value = 'Chapter 3 Exercises';
            newItemInput.dispatchEvent(new Event('input'));
            this.highlightElements();
          }
        }
      },
      {
        message: "Add a note to track important information or instructions for your homework.",
        elementIds: ["item-note"],
      },
      {
        message: "When you're done, click 'Save Note' or press CTRL/Command + S on the keyboard.",
        elementIds: ["save-note", "note-area"],
      },
      {
        message: "Great job! Now you know how to manage your schoolwork. You can continue organizing subjects and tasks however you like!",
        showThanksButton: true
      }
    ];

    this.holidaySteps = [
      {
        message: "Let’s create a folder for your holiday plans. Click the 'Create Folder' button to get started.",
        elementIds: ["new-folder-input", "create-folder-button"],
      },
      {
        message: "Now click into the folder to start organizing your upcoming and past holiday activities.",
      },
      {
        message: "Let’s create two sections to keep everything organized. One section will be called 'Upcoming Holidays' and the other 'Past Holidays'.",
      },
      {
        message: "Let’s create an entity for an upcoming holiday. For example, 'Halloween' in the Upcoming Holidays section. Click the '+ Add new entity' button.",
        elementId: "add-entity-btn",
        action: () => {
          const addEntityBtn = document.getElementById('add-entity-btn');
          if (addEntityBtn) {
            addEntityBtn.addEventListener('click', () => this.nextStep(), { once: true });
          }
        }
      },
      {
        message: "Awesome! You can rename, delete, or move entities between sections. Let’s click into 'Halloween' to start planning the holiday.",
      },
      {
        message: "Now, let’s create a task. For example, 'Find a Halloween recipe to make'.",
        elementIds: ["new-item-input", "add-item-button"],
        action: () => {
          const newItemInput = document.getElementById('new-item-input');
          if (newItemInput) {
            newItemInput.value = 'Find a Halloween recipe to make';
            newItemInput.dispatchEvent(new Event('input'));
            this.highlightElements();
          }
        }
      },
      {
        message: "Add a note with the recipe or any details about what you want to prepare.",
        elementIds: ["item-note"],
      },
      {
        message: "When you're done, click 'Save Note' or press CTRL/Command + S.",
        elementIds: ["save-note", "note-area"],
      },
      {
        message: "Great job! You’re all set to plan your holidays. Keep adding tasks and ideas to make your Halloween (or any holiday) perfect!",
        showThanksButton: true
      }
    ];

    this.artSteps = [
      {
        message: "Let’s create a folder for your art projects. Click the 'Create Folder' button to get started.",
        elementIds: ["new-folder-input", "create-folder-button"],
      },
      {
        message: "Now click into the folder to start organizing your creative projects.",
      },
      {
        message: "Let’s create two sections to help organize your art. One section will be called 'Ongoing Projects' and the other 'Finished Artworks'.",
      },
      {
        message: "Let’s create an entity for a specific art project you’re working on. For example, 'Landscape Painting' in the Ongoing Projects section.",
        elementId: "add-entity-btn",
        action: () => {
          const addEntityBtn = document.getElementById('add-entity-btn');
          if (addEntityBtn) {
            addEntityBtn.addEventListener('click', () => this.nextStep(), { once: true });
          }
        }
      },
      {
        message: "Fantastic! You can rename, delete, or move entities between sections. Let’s click into 'Landscape Painting' to manage the project.",
      },
      {
        message: "Now, let’s create an item to track your progress. For example, 'Sketch Basic Outline'.",
        elementIds: ["new-item-input", "add-item-button"],
        action: () => {
          const newItemInput = document.getElementById('new-item-input');
          if (newItemInput) {
            newItemInput.value = 'Sketch Basic Outline';
            newItemInput.dispatchEvent(new Event('input'));
            this.highlightElements();
          }
        }
      },
      {
        message: "Add a note with details about the materials you need or ideas for the composition.",
        elementIds: ["item-note"],
      },
      {
        message: "When you're done, click 'Save Note' or press CTRL/Command + S.",
        elementIds: ["save-note", "note-area"],
      },
      {
        message: "Great job! Now you know how to manage your art projects. Keep adding tasks and notes to track your progress!",
        showThanksButton: true
      }
    ];
    
    
    this.currentStep = 0;
    this.tutorialContent = null;
    this.currentStepSet = [this.initialStep];

    document.addEventListener('click', (e) => {
      const overlay = document.getElementById('overlay');
      // Check if tutorial is active by verifying overlay is visible
      if (overlay && !overlay.classList.contains('hidden')) {
        const isOverlay = e.target.closest('.tutorial-content') || 
                         e.target.closest('.tutorial-close-button') ||
                         e.target.closest('.tutorial-dont-show');
        
        const isHighlighted = e.target.classList.contains('highlight') || 
                             e.target.closest('.highlight');
  
        if (!isOverlay && !isHighlighted) {
          e.preventDefault();
          e.stopPropagation();
          
          let message = document.getElementById('tutorial-warning');
          if (!message) {
            message = document.createElement('div');
            message.id = 'tutorial-warning';
            message.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: #ff6b6b;
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              z-index: 10000;
              animation: fadeIn 0.3s ease-in-out;
            `;
            document.body.appendChild(message);
          }
          
          message.textContent = "Please follow the tutorial or end the tutorial!";
          
          setTimeout(() => {
            message.remove();
          }, 2000);
          
          return false;
        }
      }
    }, true);
  }

  handleOptionSelection(option) {
    switch(option) {
      case "Work/Professional":
        this.currentStepSet = this.workSteps;
        break;
      case "School/Education":
        this.currentStepSet = this.schoolSteps;
        break;
      case "Personal/Family Life":
        this.currentStepSet = this.holidaySteps;
        break;
      case "Hobbies/Creative Projects":
        this.currentStepSet = this.artSteps;
        break;
    }
  
    document.dispatchEvent(new CustomEvent('SidebarShowRequest'));
    
    setTimeout(() => {
      this.currentStep = 0;
      this.prefillInput();
      this.showStep();
    }, 2000);
  }

start(forceStart = false) {
    const tutorialCompleted = localStorage.getItem('tutorialCompleted') === 'true';
    const tutorialDismissed = sessionStorage.getItem('tutorialDismissed') === 'true';

    if (forceStart || (!tutorialCompleted && !tutorialDismissed)) {
        console.log('Starting tutorial');
        this.currentStep = 0;
        this.currentStepSet = [this.initialStep];
        this.showOverlay();
        this.showStep();
    } else {
        this.currentStep = undefined;
    }
}

  showOverlay() {
    document.getElementById('overlay').classList.remove('hidden');
  }

  hideOverlay() {
    document.getElementById('overlay').classList.add('hidden');
  }

  showStep() {  
    const overlay = document.getElementById('overlay');
  
    if (!this.tutorialContent) {
      this.tutorialContent = document.createElement('div');
      this.tutorialContent.className = 'tutorial-content';
      overlay.appendChild(this.tutorialContent);
    }
  
    this.updateStepContent();
    this.highlightElements();
    
  }

  entityCreated(entityId) {
    if (this.currentStep === 3) {
      this.nextStep();
  
      let attempts = 0;
      const maxAttempts = 20; // Stop after 20 attempts (10 seconds)
  
      const waitForEntity = setInterval(() => {
        const entityElement = document.querySelector(`a[href^="/entity/${entityId}"]`);
        if (entityElement) {
          clearInterval(waitForEntity);
          entityElement.classList.add('highlight');
          entityElement.addEventListener('click', () => {
            this.nextStep();
            entityElement.classList.remove('highlight');
          }, { once: true });
        } else {
          attempts++;
          if (attempts >= maxAttempts) {
            clearInterval(waitForEntity);
          }
        }
      }, 50);
    }
  }
  
  
  
  
  

  
  
  highlightNewEntity(entityId) {
    const entityElement = document.querySelector(`a[href="/entity/${entityId}"]`);
    if (entityElement) {
      entityElement.classList.add('highlight');
      entityElement.addEventListener('click', () => {
        this.nextStep();
        entityElement.classList.remove('highlight');
      });
    }
  }
  
prefillInput() {
  const input = document.getElementById('new-folder-input');
  
  if (input) {
    let folderName = 'Work';
    if (this.currentStepSet === this.schoolSteps) {
      folderName = 'School';
    } else if (this.currentStepSet === this.holidaySteps) {
      folderName = 'Holidays';
    } else if (this.currentStepSet === this.artSteps) {
      folderName = 'Art Projects';
    }
    
    input.value = folderName;
    input.dispatchEvent(new Event('input'));
  } else {
    console.log('Input element not found');
  }
}


folderCreated(folderId) {
  if (this.currentStep === undefined) return;

  const folderInput = document.getElementById('new-folder-input');

  if (folderInput) {
    if (folderInput.value === 'Work') {
      this.currentStepSet = this.workSteps;
    } else if (folderInput.value === 'School') {
      this.currentStepSet = this.schoolSteps;
    } else if (folderInput.value === 'Holidays') {
      this.currentStepSet = this.holidaySteps;
    } else if (folderInput.value === 'Art Projects') {
      this.currentStepSet = this.artSteps;
    }
  }

  this.currentStep = 0;
  this.nextStep();
  this.highlightNewFolder(folderId);
}

sectionCreated(sectionId) {
  this.sectionsCreated++;
  console.log(`Section created: ${sectionId}, Total sections created: ${this.sectionsCreated}`);

  const sections = document.querySelectorAll('.section-title');
  let firstSectionExists = false;
  let secondSectionExists = false;

  if (this.currentStepSet === this.workSteps) {
    sections.forEach(section => {
      if (section.textContent === 'Work In-Progress') firstSectionExists = true;
      if (section.textContent === 'Completed') secondSectionExists = true;
    });
  } 
  else if (this.currentStepSet === this.schoolSteps) {
    sections.forEach(section => {
      if (section.textContent === 'Ongoing Assignments') firstSectionExists = true;
      if (section.textContent === 'Completed Assignments') secondSectionExists = true;
    });
  }
  else if (this.currentStepSet === this.holidaySteps) {
    sections.forEach(section => {
      if (section.textContent === 'Upcoming Holidays') firstSectionExists = true;
      if (section.textContent === 'Past Holidays') secondSectionExists = true;
    });
  }
  else if (this.currentStepSet === this.artSteps) {
    sections.forEach(section => {
      if (section.textContent === 'Ongoing Projects') firstSectionExists = true;
      if (section.textContent === 'Finished Artworks') secondSectionExists = true;
    });
  }

  if (firstSectionExists && secondSectionExists) {
    console.log('Both required sections exist. Moving to the next step.');
    this.sectionsCreated = 0;
  }
}


highlightNewFolder(folderId) {
  if (this.currentStep === undefined) return;
  
  const folderElement = document.querySelector(`a[href="/folder/${folderId}"]`);
  if (folderElement) {
    folderElement.classList.add('highlight');
    folderElement.addEventListener('click', () => {
      this.nextStep();
      folderElement.classList.remove('highlight');
    });
  }
}


  highlightElements() {
    console.log('Highlighting elements for step:', this.currentStep, 'Sections created:', this.sectionsCreated);
  
    const currentStep = this.currentStepSet[this.currentStep];
  
    if (this.currentStep === 2) {
      const setupSectionCreation = () => {
        const input = document.getElementById('new-section-input');
        const createSectionButton = document.querySelector('#btn-create-section');
      
        if (input && createSectionButton) {
          console.log('Setting up section creation, initial sectionsCreated:', this.sectionsCreated);
          this.sectionsCreated = this.sectionsCreated || 0;
          
          let sectionNames = [];
          if (this.currentStepSet === this.workSteps) {
            sectionNames = ['Work In-Progress', 'Completed'];
          } else if (this.currentStepSet === this.schoolSteps) {
            sectionNames = ['Ongoing Assignments', 'Completed Assignments'];
          } else if (this.currentStepSet === this.holidaySteps) {
            sectionNames = ['Upcoming Holidays', 'Past Holidays'];
          } else if (this.currentStepSet === this.artSteps) {
            sectionNames = ['Ongoing Projects', 'Finished Artworks'];
          }
      
          const updateInputAndHighlight = () => {
            input.value = sectionNames[this.sectionsCreated];
            input.dispatchEvent(new Event('input'));
            input.classList.add('highlight');
            createSectionButton.classList.add('highlight');
          };
      
          updateInputAndHighlight();
      
          const handleSectionCreation = () => {
            window.createSection(new Event('click'));
            if (this.sectionsCreated < 1) {
              this.sectionsCreated++;
              updateInputAndHighlight();
            } else {
              input.value = '';
              input.classList.remove('highlight');
              createSectionButton.classList.remove('highlight');
              this.sectionsCreated = 0;
              this.nextStep();
            }
          };
      
          createSectionButton.removeEventListener('click', handleSectionCreation);
          createSectionButton.addEventListener('click', handleSectionCreation);
        } else {
          console.log('Input or create section button not found, setting up observer');
          const observer = new MutationObserver((mutations, obs) => {
            const input = document.getElementById('new-section-input');
            const createSectionButton = document.querySelector('#btn-create-section');
            if (input && createSectionButton) {
              console.log('Input and create section button found by observer');
              obs.disconnect();
              setupSectionCreation();
            }
          });
  
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      };
  
      setupSectionCreation();
    } else if (this.currentStep === 3) {
      const addEntityBtn = document.getElementById('add-entity-btn');
      if (addEntityBtn) {
        addEntityBtn.classList.add('highlight');
        addEntityBtn.addEventListener('click', () => {
          addEntityBtn.classList.remove('highlight');
        }, { once: true });
      }
    } else if (this.currentStep === 5) {
      const newItemInput = document.getElementById('new-item-input');
      const addItemButton = document.getElementById('add-item-button');
      
      if (newItemInput && addItemButton) {
        newItemInput.classList.add('highlight');
        addItemButton.classList.add('highlight');
      }
    } else if (this.currentStep === 6) {
      const highlightItemNote = () => {
        const itemNote = document.querySelector('.item-note');
        if (itemNote) {
          itemNote.classList.add('highlight');
          console.log('Highlighted item note');
        } else {
          console.log('Item note element not found, setting up observer');
          const observer = new MutationObserver((mutations, obs) => {
            const itemNote = document.querySelector('.item-note');
            if (itemNote) {
              itemNote.classList.add('highlight');
              console.log('Highlighted item note after DOM update');
              obs.disconnect();
            }
          });
  
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      };
  
      highlightItemNote();
    } else if (this.currentStep === 7) {
      const saveNote = document.getElementById('save-note');
      const noteArea = document.getElementById('note-area');
      if (saveNote && noteArea) {
        saveNote.classList.add('highlight');
        noteArea.classList.add('highlight');
        console.log('Highlighted save note button and note area');
      } else {
        console.log('Save note button or note area not found');
      }
    }    
       else if (currentStep.elementId) {
      const element = document.getElementById(currentStep.elementId);
      if (element) {
        element.classList.add('highlight');
        console.log('Highlighted element:', currentStep.elementId);
      } else {
        console.log('Element not found:', currentStep.elementId);
      }
    } else if (currentStep.elementIds) {
      currentStep.elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.classList.add('highlight');
          console.log('Highlighted element:', id);
        } else {
          console.log('Element not found:', id);
        }
      });
    }
  }
  
  
  
  removeHighlights() {
    document.querySelectorAll('.highlight').forEach(el => {
      el.classList.remove('highlight');
      el.style.pointerEvents = '';
    });
  }

  nextStep() {
    this.removeHighlights();
    this.currentStep++;

    if (this.currentStep < this.currentStepSet.length) {
      // Use setTimeout to ensure DOM updates before highlighting
      setTimeout(() => {
        this.showStep(); // Show the next step
      }, 0);
    } else {
      this.endTutorial();
    }
  }
  
  createConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti';
    document.body.appendChild(confettiContainer);
  
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffbe0b'];
    
    for (let i = 0; i < 100; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 2 + 's';
      confettiContainer.appendChild(piece);
    }
  
    setTimeout(() => {
      confettiContainer.remove();
    }, 5000);
  }
  

  updateStepContent() {
    console.log('Updating step content for step:', this.currentStep);
    let step = this.currentStepSet[this.currentStep];
    console.log('Step content:', step);
  
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '';

    const closeButton = document.createElement('button');
    closeButton.className = 'tutorial-close-button';
    closeButton.innerHTML = '✕';
    closeButton.addEventListener('click', () => this.endTutorial());
    overlay.appendChild(closeButton);
  
    const tutorialContent = document.createElement('div');
    tutorialContent.className = 'tutorial-content';

    const dontShowButton = document.createElement('button');
    dontShowButton.textContent = "End tutorial and don't show again.";
    dontShowButton.className = 'tutorial-dont-show';
    dontShowButton.addEventListener('click', () => {
        localStorage.setItem('tutorialCompleted', 'true');
        this.endTutorial();
    });

    if (this.currentStep === 6) {
      tutorialContent.classList.add('last-step');
    }
  
    const message = document.createElement('div');
    message.className = 'tutorial-message';
    message.textContent = step.message;
    console.log('Set message content:', message.textContent);
    tutorialContent.appendChild(message);
  
    if (step.options) {
      console.log('Creating options for step');
      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'options-container';
      step.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.addEventListener('click', () => this.handleOptionSelection(option));
        optionsContainer.appendChild(button);
      });
      tutorialContent.appendChild(optionsContainer);
    }

    if (step.showThanksButton) {
      const thanksButton = document.createElement('button');
      thanksButton.textContent = 'Thanks!';
      thanksButton.className = 'button thanks-button';
      thanksButton.addEventListener('click', () => this.endTutorial());
      tutorialContent.appendChild(thanksButton);
    }

    if (this.currentStep === this.currentStepSet.length - 1 && 
      (this.currentStepSet === this.workSteps || 
       this.currentStepSet === this.schoolSteps || 
       this.currentStepSet === this.holidaySteps || 
       this.currentStepSet === this.artSteps)) {
    this.createConfetti();
  }
  

    
    tutorialContent.appendChild(dontShowButton);
    overlay.appendChild(tutorialContent);
  
    console.log('Updated overlay content:', overlay.innerHTML);
  
    requestAnimationFrame(() => {
      console.log('DOM updated, current overlay content:', overlay.innerHTML);
    });
  }
  
  endTutorial() {
    console.log('Ending tutorial');
    this.removeHighlights();
    this.hideOverlay();
    this.currentStep = undefined; // Crucial: Reset currentStep

    if (this.currentStepSet && this.currentStepSet.length > 0 && this.currentStep === this.currentStepSet.length - 1) {
        localStorage.setItem('tutorialCompleted', 'true');
    } else {
        sessionStorage.setItem('tutorialDismissed', 'true');
    }
}

}

window.tutorial = new Tutorial();

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, waiting for UserLoggedIn event');
  
  document.addEventListener('UserLoggedIn', () => {
      console.log('UserLoggedIn event received');
      const tutorialCompleted = localStorage.getItem('tutorialCompleted') === 'true';
      const tutorialDismissed = sessionStorage.getItem('tutorialDismissed') === 'true';
      
      if (!tutorialCompleted && !tutorialDismissed) {
          console.log('Starting tutorial - conditions met');
          window.tutorial.start();
      }
  });
});