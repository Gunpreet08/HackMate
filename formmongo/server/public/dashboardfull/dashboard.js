// Team management functions
window.createTeam = async function(userId, userName) {
    // Step 1: Confirm user wants to invite
    showPopup({
        title: 'Invite to Team',
        message: `Do you want to invite <b>${userName}</b> to a team?`,
        confirmText: 'Yes',
        cancelText: 'No',
        onConfirm: () => {
            // Step 2: Ask for team name
            showPopup({
                title: 'Team Name',
                message: 'What should be the name of your team?',
                input: true,
                inputPlaceholder: 'Enter team name',
                confirmText: 'Create',
                cancelText: 'Cancel',
                onConfirm: async (teamName) => {
                    if (!teamName || !teamName.trim()) {
                        showToast('Please enter a valid team name.', 'error');
                        return;
                    }
                    // Show loading state
                    const inviteBtn = document.querySelector('.invite-team-btn');
                    if (inviteBtn) {
                        inviteBtn.disabled = true;
                        inviteBtn.textContent = 'Sending invitation...';
                    }
                    try {
                        const response = await fetch('http://localhost:5000/api/connection-request', {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                receiverId: userId,
                                requestType: 'team',
                                teamName: teamName.trim()
                            })
                        });
                        // Parse response
                        let data;
                        try {
                            const contentType = response.headers.get('content-type');
                            if (!contentType || !contentType.includes('application/json')) {
                                throw new Error('Server response was not JSON');
                            }
                            data = await response.json();
                        } catch (e) {
                            console.error('Response parsing error:', e);
                            throw new Error('Invalid server response format');
                        }
                        if (!response.ok) {
                            throw new Error(data?.message || `Server error: ${response.status}`);
                        }
                        if (!data.success) {
                            throw new Error(data.message || 'Failed to send team invitation');
                        }
                        showToast(`Team invitation sent successfully to ${userName}!`, 'success');
                        await checkNotifications();
                    } catch (error) {
                        console.error('Error sending team invitation:', error);
                        showToast(error.message || 'Failed to send team invitation. Please try again.', 'error');
                    } finally {
                        // Reset button state
                        const inviteBtn = document.querySelector('.invite-team-btn');
                        if (inviteBtn) {
                            inviteBtn.disabled = false;
                            inviteBtn.textContent = 'Invite to Team';
                        }
                    }
                }
            });
        }
    });
}


// Handle team invitation response
// Accepts invitationId as first param, not teamId
async function handleTeamInvitation(invitationId, action, teamName) {
    if (!invitationId) {
        alert('Invitation ID missing or invalid. Please refresh and try again.');
        console.error('handleTeamInvitation: invitationId is missing or undefined!', { invitationId, action, teamName });
        return;
    }
    // Defensive: ensure teamName is a string
    if (typeof teamName !== 'string') teamName = '';
    console.log('handleTeamInvitation called', invitationId, action, teamName);
    let notificationElement;
    try {
        // Prevent multiple submissions
        notificationElement = document.querySelector(`[data-team-invitation="${invitationId}"]`);
        if (!notificationElement || notificationElement.dataset.processing === 'true') {
            return;
        }
        
        // Set processing flag
        notificationElement.dataset.processing = 'true';

        // Show loading state
        const buttons = notificationElement.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });
        // Show a distinct background for processed notifications
if (action === 'accept') {
    notificationElement.style.backgroundColor = 'rgba(76, 175, 80, 0.15)'; // greenish for accepted
} else if (action === 'decline') {
    notificationElement.style.backgroundColor = 'rgba(244, 67, 54, 0.15)'; // reddish for declined
} else {
    notificationElement.style.backgroundColor = '#f5f5f5';
}

        const response = await fetch(`http://localhost:5000/api/team-invitation/${invitationId}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
        });

        // Parse response
        let data;
        try {
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server response was not JSON');
            }
            data = await response.json();
        } catch (e) {
            console.error('Response parsing error:', e);
            throw new Error('Invalid server response format');
        }

        if (!response.ok) {
            throw new Error(data?.message || `Server error: ${response.status}`);
        }

        if (!data.success) {
            throw new Error(data.message || 'Failed to process team invitation');
        }

        // Update UI to show success and keep notification visible with a distinct status
notificationElement.innerHTML = `
    <div class="notification-content">
        <p><b>${action === 'accept' ? 'Accepted' : 'Declined'} team invitation${teamName ? ` for team <span style='color:#26d0d3;'>${teamName}</span>` : ''}.</b></p>
        <small style="color:#26d0d3;">This invitation has been ${action === 'accept' ? 'accepted' : 'declined'}.</small>
    </div>
`;
// Remove action buttons, but keep notification for clarity
// Optionally, you could add a fade-out after a longer delay if desired, but keep it for at least 10s
setTimeout(() => {
    notificationElement.style.opacity = '0.7';
    // Optionally, remove after 30s:
    // notificationElement.remove();
    // checkNotifications();
}, 10000);

    } catch (error) {
        console.error('Error processing team invitation:', error);
        
        // Reset UI and show error
        if (notificationElement) {
            notificationElement.dataset.processing = 'false';
            notificationElement.innerHTML = `
                <div class="notification-content">
                    <p class="error-message">Error: ${error.message}</p>
                    <div class="request-actions">
                        <button onclick="handleTeamInvitation('${invitationId}', 'accept', '${typeof teamName === 'string' ? teamName.replace(/'/g, "&#39;") : ''}')" class="accept-btn">Accept</button>
                        <button onclick="handleTeamInvitation('${invitationId}', 'decline', '${typeof teamName === 'string' ? teamName.replace(/'/g, "&#39;") : ''}')" class="decline-btn">Decline</button>
                    </div>
                </div>
            `;
        }
    }
}

// --- Teams Modal Logic ---
// Leave a team
window.leaveTeam = function(teamId, teamName) {
    if (!teamId) return;
    showPopup({
        title: 'Leave Team',
        message: `Are you sure you want to leave the team <b>${teamName}</b>?`,
        confirmText: 'Leave',
        cancelText: 'Cancel',
        onConfirm: async () => {
            try {
                const response = await fetch('http://localhost:5000/api/leave-team', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ teamId })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to leave team');
                }
                showToast('You have left the team successfully.', 'success');
                refreshTeamsList();
            } catch (error) {
                showToast('Failed to leave team: ' + error.message, 'error');
            }
        },
        onCancel: () => {
            // Handle cancel action if needed
        }
    });
};

// Fetch and refresh the user's teams list and update the UI
async function refreshTeamsList() {
    const teamsListContainer = document.getElementById('teamsListContainer');
    if (!teamsListContainer) return;

    teamsListContainer.innerHTML = '<div class="loading">Loading teams...</div>';
    try {
        const response = await fetch('http://localhost:5000/api/my-teams', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server response was not JSON');
        }
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to fetch teams');
        }
        if (!data.teams || data.teams.length === 0) {
            teamsListContainer.innerHTML = '<div class="no-teams">You are not part of any teams yet.</div>';
            return;
        }
        teamsListContainer.innerHTML = data.teams.map(team => `
            <div class="team-item">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <h4>${team.name}</h4>
                    <div style="display: flex; gap: 8px;">
                        <button class="add-member-btn" title="Add member to team" onclick="addMemberToTeam('${team._id || team.id}', '${team.name.replace(/'/g, '\'')}')">➕</button>
                        <button class="leave-team-btn" title="Leave this team" onclick="leaveTeam('${team._id || team.id}', '${team.name.replace(/'/g, '\'')}')">🚪</button>
                    </div>
                </div>
                <div class="team-members">
                    Members: ${team.members.map(m => `<span>${m.fullName || m.username || m.email}</span>`).join(', ')}
                </div>
            </div>
        `).join('');
        // Animate team items after insertion
        setTimeout(() => {
            document.querySelectorAll('.team-item').forEach((el, i) => {
                el.style.animationDelay = (i * 0.07) + 's';
                el.classList.add('animated');
            });
        }, 10);
        // Animate team items after insertion
        setTimeout(() => {
            document.querySelectorAll('.team-item').forEach((el, i) => {
                el.style.animationDelay = (i * 0.07) + 's';
                el.classList.add('animated');
            });
        }, 10);
    } catch (error) {
        teamsListContainer.innerHTML = `<div class="error-message">Error loading teams.<br><small>${error.message}</small></div>`;
    }
}

// Add member to team by ID (invites by username/email)
async function addMemberToTeam(teamId, teamName) {
    if (!teamId) return;
    // Simple prompt for now (can be replaced with a modal for better UX)
    showPopup({
        title: 'Add Member',
        message: `Enter username or email to add to <b>${teamName}</b>:`,
        input: true,
        inputPlaceholder: 'Username or Email',
        confirmText: 'Invite',
        cancelText: 'Cancel',
        onConfirm: async (userIdentifier) => {
            if (!userIdentifier) return;
            try {
                const response = await fetch('http://localhost:5000/api/team-invite/add-member', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        teamId,
                        userIdentifier
                    })
                });
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server response was not JSON');
                }
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to add member');
                }
                showToast('Member invited/added successfully!', 'success');
                refreshTeamsList();
            } catch (error) {
                showToast('Failed to add member: ' + error.message, 'error');
            }
        }
    });
}

// Show the teams modal and refresh the teams list
function showTeamsModal() {
    const teamsModal = document.getElementById('teamsModal');
    if (!teamsModal) return;
    teamsModal.style.display = 'block';
    refreshTeamsList();
}

// Hide the teams modal
function hideTeamsModal() {
    const teamsModal = document.getElementById('teamsModal');
    if (!teamsModal) return;
    teamsModal.style.display = 'none';
}

// Add event listeners for Teams modal
const teamsBtn = document.getElementById('teamsBtn');
if (teamsBtn) {
    teamsBtn.addEventListener('click', showTeamsModal);
}
const closeTeamsModal = document.getElementById('closeTeamsModal');
if (closeTeamsModal) {
    closeTeamsModal.addEventListener('click', hideTeamsModal);
}

// Update handleTeamInvitation to refresh teams list after accepting
const _originalHandleTeamInvitation = window.handleTeamInvitation || handleTeamInvitation;
window.handleTeamInvitation = async function(invitationId, action, teamName) {
    await _originalHandleTeamInvitation(invitationId, action, teamName);
    if (action === 'accept') {
        // After accepting, refresh teams list if modal is open
        const teamsModal = document.getElementById('teamsModal');
        if (teamsModal && teamsModal.style.display === 'block') {
            refreshTeamsList();
        }
    }
};

// Variable to store user data
let userData = null;

// Single event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎨 Dashboard initializing...');
    
    try {
        // Initialize notifications
        initializeNotifications();
        
        // Fetch user data
        const response = await fetch('http://localhost:5000/dashboard', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Dashboard data:', data);

        if (!data.success) {
            throw new Error(data.message || 'Failed to load user data');
        }

        // Store user data
        userData = data;

        // Update profile information in the main dashboard view

        document.getElementById('userFullName').textContent = userData.fullName;

        document.getElementById('profileUsername').textContent = userData.username;
        document.getElementById('profileEmail').textContent = userData.email;

        // Update tech stack in main dashboard view
        const techStackContainer = document.getElementById('profileTechStack');
        if (techStackContainer && userData.techStack) {
            techStackContainer.innerHTML = userData.techStack.length > 0 
                ? userData.techStack.map(tech => `<span>${tech}</span>`).join('')
                : '<span>No tech stack specified</span>';
        }

        // Update project interests in main dashboard view
        const interestsContainer = document.getElementById('profileInterests');
        if (interestsContainer && userData.projectInterests) {
            interestsContainer.innerHTML = userData.projectInterests.length > 0
                ? userData.projectInterests.map(interest => `<span>${interest}</span>`).join('')
                : '<span>No project interests specified</span>';
        }

        // Initialize sidebar navigation with section highlighting
        const navItems = document.querySelectorAll(".nav-item");
        const sections = {
            'Hackathons': document.querySelector('.hackathon-ticker'),
            'Calendar': document.querySelector('.calendar'),
            'To-Do List': document.querySelector('.widget'),
            'Profile': document.querySelector('.user-profile-section')
        };

        // Function to remove highlight from all sections
        function removeAllHighlights() {
            Object.values(sections).forEach(section => {
                if (section) {
                    section.classList.remove('highlight-section');
                }
            });
        }

        // Function to highlight a specific section
        function highlightSection(sectionName) {
            removeAllHighlights();
            const section = sections[sectionName];
            if (section) {
                section.classList.add('highlight-section');
                // Scroll the section into view smoothly
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a temporary background enhancement for better visibility
                section.style.background = 'rgba(38, 208, 211, 0.1)';
                setTimeout(() => {
                    section.style.background = '';
                }, 1500); // Remove the background after the highlight animation
            }
        }

        const profileEditModal = document.getElementById('profileEditModal');
        const profileEditForm = document.getElementById('profileEditForm');
        const closeModalBtn = profileEditModal ? profileEditModal.querySelector('.close-modal') : null;

        // Add event listeners to nav items
        navItems.forEach(item => {
            item.addEventListener("click", () => {
                // Remove active class from all items
                navItems.forEach(el => el.classList.remove("active"));
                // Add active class to clicked item
                item.classList.add("active");
                
                // Get the text content without the icon
                const itemText = item.textContent.trim();
                
                // Handle Profile nav item click
                if (itemText === 'Profile') {
                    if (profileEditModal && profileEditForm && userData) {
                        // Populate the form with user data
                        profileEditForm.querySelector('#editFullName').value = userData.fullName || '';
                        profileEditForm.querySelector('#editUsername').value = userData.username || '';
                        profileEditForm.querySelector('#editEmail').value = userData.email || '';
                        // Password field is typically not pre-filled for security
                        // profileEditForm.querySelector('input[name="password"]').value = userData.password || ''; // Commented out for security
                        profileEditForm.querySelector('input[name="location"]').value = userData.location || '';
                        profileEditForm.querySelector('select[name="primaryRole"]').value = userData.primaryRole || '';
                        profileEditForm.querySelector('#editTechStack').value = Array.isArray(userData.techStack) ? userData.techStack.join(', ') : userData.techStack || '';
                        profileEditForm.querySelector('select[name="experienceLevel"]').value = userData.experienceLevel || '';
                        profileEditForm.querySelector('select[name="pastHackathonExperience"]').value = userData.pastHackathonExperience || '';
                        profileEditForm.querySelector('#editInterests').value = Array.isArray(userData.projectInterests) ? userData.projectInterests.join(', ') : userData.projectInterests || '';
                        profileEditForm.querySelector('select[name="preferredTeamSize"]').value = userData.preferredTeamSize || '';
                        profileEditForm.querySelector('input[name="workStyle"]').value = userData.workStyle || '';
                        profileEditForm.querySelector('select[name="availability"]').value = userData.availability || '';
                        profileEditForm.querySelector('select[name="preferredHackathonType"]').value = userData.preferredHackathonType || '';
                        profileEditForm.querySelector('input[name="github"]').value = userData.github || '';
                        profileEditForm.querySelector('input[name="linkedin"]').value = userData.linkedin || '';
                        profileEditForm.querySelector('input[name="portfolio"]').value = userData.portfolio || '';

                        // Display the modal
                        profileEditModal.style.display = 'flex'; // Use flex to center
                    } else if (!userData) {
                        console.error('User data not available to populate profile edit form.');
                        // Optionally show an error message to the user
                    }
                } else {
                    // Hide modal if another nav item is clicked
                    if (profileEditModal) {
                        profileEditModal.style.display = 'none';
                    }
                    // Highlight corresponding section if it exists for other nav items
                    if (sections[itemText]) {
                        highlightSection(itemText);
                    }
                }
            });
        });

        // Add event listener to close modal button
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                if (profileEditModal) {
                    profileEditModal.style.display = 'none';
                }
            });
        }
        // Close modal if clicked outside the modal content
        if (profileEditModal) {
            profileEditModal.addEventListener('click', (event) => {
                if (event.target === profileEditModal) {
                    profileEditModal.style.display = 'none';
                }
            });
        }

        // Initialize calendar
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        generateCalendar(currentYear, currentMonth);

        // Add event listener for the Add Event button
        const addEventBtn = document.getElementById('add-event-btn');
        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => {
                showPopup({
                    title: 'Add New Event',
                    message: 'Enter date for the event (YYYY-MM-DD):',
                    input: true,
                    inputPlaceholder: 'YYYY-MM-DD',
                    confirmText: 'Next',
                    cancelText: 'Cancel',
                    onConfirm: (dateInput) => {
                        if (!dateInput || !dateInput.trim()) {
                            showToast('Date cannot be empty.', 'error');
                            return;
                        }

                        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                        if (!dateRegex.test(dateInput)) {
                            showToast('Please enter a valid date in YYYY-MM-DD format.', 'error');
                            return;
                        }

                        const dateObj = new Date(dateInput);
                         // Check for invalid date (e.g., Feb 30)
                        if (isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !== dateInput) {
                             showToast('Invalid date entered. Please check the day and month.', 'error');
                             return;
                        }
                        
                        // Get today's date at the start of the day for comparison
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const selectedDate = new Date(dateInput);
                        selectedDate.setHours(0, 0, 0, 0);

                        if (selectedDate < today) {
                            showToast('You cannot add events to past dates.', 'info');
                            // Optionally allow them to pick another date, or just close the popup
                            // showPopup(...) // Re-open the date selection popup if desired
                            return; // Stop the process if the date is in the past
                        }

                        // Proceed to get event title after successful date validation and date is not in the past
                        showPopup({
                            title: `Event on ${dateInput}`,
                            message: `Enter event name for <b>${dateInput}</b>:`, // Use HTML in message
                            input: true,
                            inputPlaceholder: 'Event Name',
                            confirmText: 'Add Event',
                            cancelText: 'Back',
                            onConfirm: (eventTitle) => {
                                if (eventTitle && eventTitle.trim()) {
                                    addEventToCalendar(dateInput, eventTitle.trim());
                                     // Regenerate calendar for the current month after adding event
                                    const [year, month, day] = dateInput.split('-').map(Number);
                                     generateCalendar(year, month - 1); // Month is 0-indexed
                                    showToast('Event added successfully!', 'success');
                                } else {
                                    showToast('Event name cannot be empty.', 'error');
                                }
                            },
                             onCancel: () => { // Optional: go back to date selection
                                 addEventBtn.click(); // Simulate click to restart date selection
                             }
                        });
                    }
                });
            });
        }

        // Initialize To-Do List
        const taskInput = document.getElementById("taskInput");
        const addTaskBtn = document.getElementById("add-task-btn");
        const taskList = document.getElementById("taskList");

        if (taskInput && addTaskBtn && taskList) {
            addTaskBtn.addEventListener("click", () => {
                const taskText = taskInput.value.trim();
                if (taskText !== "") {
                    const taskItem = document.createElement("li");
                    taskItem.innerHTML = `${taskText} <button class="delete-task">❌</button>`;
                    taskList.appendChild(taskItem);
                    taskInput.value = "";

                    taskItem.querySelector(".delete-task").addEventListener("click", () => {
                        taskItem.classList.add("fade-out");
                        setTimeout(() => taskItem.remove(), 300);
                    });
                }
            });
        }

        // Initialize Chatbot
        const chatbotButton = document.getElementById("openChatbot");
        if (chatbotButton) {
            chatbotButton.addEventListener("click", () => {
                console.log("🖱 Button Clicked! Opening chatbot...");
                window.open("aibot.html", "_blank");
            });
        }

        // Initialize logout button
        const logoutBtn = document.querySelector('.logout-btn button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const response = await fetch('http://localhost:5000/logout', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        window.location.href = 'http://localhost:5000/login.html';
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                    alert('Failed to logout. Please try again.');
                }
            });
        }

        // Initialize match feature
        initializeMatchFeature();

        console.log('✨ Dashboard initialized successfully');
    } catch (error) {
        window.location.href = 'http://localhost:5000/login.html';
    }
});

// Calendar functions
function generateCalendar(year, month) {
    const calendarBody = document.getElementById("calendar-body");
    const monthYear = document.getElementById("monthYear");
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // eventMap now loaded inside openEventPopup and add/remove functions

    if (!calendarBody || !monthYear) return;

    // Get today's date at the start of the day for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update month/year display
    monthYear.innerHTML = `
        <button id="prevMonth" class="calendar-nav-btn">←</button>
        ${new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" })}
        <button id="nextMonth" class="calendar-nav-btn">→</button>
    `;

    // Add event listeners for navigation buttons
    document.getElementById("prevMonth").addEventListener("click", () => {
        if (month === 0) {
            // Check if year is greater than minimum allowed year (e.g., 1900 for historical data)
            // For this example, let's just assume a reasonable range, e.g., not going back before 2000
            if (year > 2000) { // Adjusted year check
                generateCalendar(year - 1, 11);
            } else {
                 showToast('Cannot navigate before year 2000.', 'info'); // Optional: inform user
            }
        } else {
            generateCalendar(year, month - 1);
        }
    });

    document.getElementById("nextMonth").addEventListener("click", () => {
        if (month === 11) {
             // Check if year is less than maximum allowed year (e.g., 2050 for future planning)
            if (year < 2050) { // Adjusted year check
                generateCalendar(year + 1, 0);
            } else {
                showToast('Cannot navigate beyond year 2050.', 'info'); // Optional: inform user
            }
        } else {
            generateCalendar(year, month + 1);
        }
    });

    calendarBody.innerHTML = "";
    let date = 1;

    for (let i = 0; i < 6; i++) {
        let row = document.createElement("tr");

        for (let j = 0; j < 7; j++) {
            let cell = document.createElement("td");

            if (i === 0 && j < firstDay) {
                cell.innerText = "";
            } else if (date <= daysInMonth) {
                let formattedMonth = (month + 1).toString().padStart(2, "0");
                let formattedDate = date.toString().padStart(2, "0");
                let fullDate = `${year}-${formattedMonth}-${formattedDate}`;
                
                const cellDate = new Date(year, month, date);
                cellDate.setHours(0, 0, 0, 0); // Set to start of day for comparison

                cell.innerText = date;
                cell.classList.add("calendar-day");
                cell.setAttribute("data-date", fullDate);

                // Add past-day class if the date is before today
                if (cellDate < today) {
                    cell.classList.add('past-day');
                }

                const eventMap = JSON.parse(localStorage.getItem("eventMap")) || {}; // Load eventMap here
                if (eventMap[fullDate]) {
                    cell.classList.add("event-day");
                    cell.setAttribute("title", eventMap[fullDate]);
                    cell.setAttribute("data-tooltip", eventMap[fullDate]);
                    const eventDot = document.createElement("div");
                    eventDot.className = "event-dot";
                    cell.appendChild(eventDot);
                }

                // Modify click listener to call openEventPopup with the date
                cell.addEventListener("click", () => openEventPopup(fullDate));
                date++;
            } else {
                cell.innerText = ""; // Fill remaining cells with empty strings
            }

            row.appendChild(cell);
        }

        calendarBody.appendChild(row);
    }
}

function openEventPopup(dateString) { // Renamed parameter for clarity
    const eventMap = JSON.parse(localStorage.getItem("eventMap")) || {};
    const existingEvent = eventMap[dateString];

    // Get today's date at the start of the day for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(dateString);
    clickedDate.setHours(0, 0, 0, 0);

    if (existingEvent) {
        // If there's an existing event, show confirmation to remove it using showPopup
        showPopup({
            title: 'Remove Event',
            message: `Are you sure you want to remove the event:<br><b>"${existingEvent}"</b><br>from <b>${dateString}</b>?`,
            confirmText: 'Remove',
            cancelText: 'Cancel',
            onConfirm: () => {
                removeEventFromCalendar(dateString);
                showToast('Event removed successfully!', 'success');
            }
        });
    } else if (clickedDate < today) {
         // If no event exists and the date is in the past, inform the user
         showToast('You cannot add events to past dates.', 'info');
    } else {
        // If no event exists and the date is today or in the future, prompt to add new event
        showPopup({
            title: 'Add Event',
            message: `Enter event name for <b>${dateString}</b>:`, // Use HTML in message for styling
            input: true,
            inputPlaceholder: 'Event Name',
            confirmText: 'Add',
            cancelText: 'Cancel',
            onConfirm: (eventTitle) => {
                if (eventTitle && eventTitle.trim()) {
                    addEventToCalendar(dateString, eventTitle.trim());
                    showToast('Event added successfully!', 'success');
                } else {
                    showToast('Event name cannot be empty.', 'error');
                }
            }
        });
    }
}

function addEventToCalendar(date, eventTitle) {
    const eventMap = JSON.parse(localStorage.getItem("eventMap")) || {};
    let cells = document.querySelectorAll(".calendar-day");
    
    cells.forEach(cell => {
        if (cell.getAttribute("data-date") === date) {
            cell.classList.add("event-day");
            cell.setAttribute("title", eventTitle); // For browser default tooltip
            cell.setAttribute("data-tooltip", eventTitle); // For custom CSS tooltip if implemented
            // Prevent adding multiple dots if clicking multiple times before refresh
            if (!cell.querySelector(".event-dot")) {
                 const eventDot = document.createElement("div");
                 eventDot.className = "event-dot";
                 cell.appendChild(eventDot);
            }
           
            // Update eventMap and localStorage
            eventMap[date] = eventTitle;
            localStorage.setItem("eventMap", JSON.stringify(eventMap));
        }
    });
     // Re-generate calendar to ensure consistent state and update tooltips visually
     const [year, month, day] = date.split('-').map(Number);
     generateCalendar(year, month - 1); // Month is 0-indexed in generateCalendar
}

function removeEventFromCalendar(date) {
    const eventMap = JSON.parse(localStorage.getItem("eventMap")) || {};
    
    // Update eventMap and localStorage FIRST to ensure data is removed
    if (eventMap[date]) {
        delete eventMap[date];
        localStorage.setItem("eventMap", JSON.stringify(eventMap));
    }

    let cells = document.querySelectorAll(".calendar-day");
    
    cells.forEach(cell => {
        if (cell.getAttribute("data-date") === date) {
            cell.classList.remove("event-day");
            cell.removeAttribute("title");
            cell.removeAttribute("data-tooltip");
            const eventDot = cell.querySelector(".event-dot");
            if (eventDot) {
                eventDot.remove();
            }
        }
    });
     // Re-generate calendar to ensure consistent state and update tooltips visually
     const [year, month, day] = date.split('-').map(Number);
     generateCalendar(year, month - 1); // Month is 0-indexed in generateCalendar
}

// Match Feature Functions
function initializeMatchFeature() {
    const findMatchBtn = document.getElementById('findMatchBtn');
    const matchModal = document.getElementById('matchModal');
    const closeModal = document.querySelector('.close-modal');
    const matchResults = document.getElementById('matchResults');
    const loadingAnimation = document.querySelector('.loading-animation');

    if (!findMatchBtn || !matchModal || !matchResults) {
        console.error('Required match feature elements not found');
        return;
    }

    findMatchBtn.addEventListener('click', async () => {
        try {
            // Show modal and loading state
            matchModal.style.display = 'block';
            matchResults.innerHTML = '';
            loadingAnimation.style.display = 'block';
            matchResults.style.display = 'none';

            // First verify if user is authenticated
            const authCheck = await fetch('http://localhost:5000/dashboard', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!authCheck.ok) {
                throw new Error('Please log in to find matches');
            }

            // Fetch potential matches
            const response = await fetch('http://localhost:5000/api/find-matches', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch matches');
            }

            const data = await response.json();
            
            // Hide loading animation
            loadingAnimation.style.display = 'none';
            matchResults.style.display = 'grid';

            if (!data.matches || data.matches.length === 0) {
                matchResults.innerHTML = `
                    <div class="no-matches-message">
                        No matches found at the moment. Check back later!
                    </div>
                `;
                return;
            }

            // Display matches
            // Sort matches by match percentage in descending order
            const sortedMatches = data.matches.map(match => ({
                ...match,
                matchPercentage: calculateMatchPercentage(match)
            })).sort((a, b) => b.matchPercentage - a.matchPercentage);

            sortedMatches.forEach(match => {
                const matchCard = createMatchCard(match);
                matchResults.appendChild(matchCard);
            });

        } catch (error) {
            console.error('Error in match feature:', error);
            loadingAnimation.style.display = 'none';
            matchResults.style.display = 'block';
            matchResults.innerHTML = `
                <div class="error-message">
                    ${error.message || 'Failed to find matches. Please try again later.'}
                </div>
            `;
        }
    });

    // Close modal handlers
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            matchModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === matchModal) {
            matchModal.style.display = 'none';
        }
    });
}

function createMatchCard(match) {
    if (!match || !match.fullName || !match.userId) {
        console.error('Invalid match data:', match);
        return document.createElement('div');
    }

    const card = document.createElement('div');
    card.className = 'match-card';
    
    try {
        // Get current user's tech stack and interests
        const currentUserTechStack = new Set(Array.from(document.getElementById('profileTechStack').children)
            .map(span => span.textContent));
        const currentUserInterests = new Set(Array.from(document.getElementById('profileInterests').children)
            .map(span => span.textContent));
        
        const matchPercentage = calculateMatchPercentage(match);
        
        card.innerHTML = `
            <div class="match-header">
                <div class="match-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="match-info">
                    <h3>${match.fullName}</h3>
                    <div class="match-percentage">${matchPercentage}% Match</div>
                </div>
            </div>
            <div class="match-details">
                <div class="match-section">
                    <h4>Tech Stack</h4>
                    <div class="match-tags">
                        ${(match.techStack || []).map(tech => `
                            <span class="match-tag ${currentUserTechStack.has(tech) ? 'matching' : ''}" 
                                  title="${currentUserTechStack.has(tech) ? 'Matching tech!' : ''}">
                                ${tech}
                                ${currentUserTechStack.has(tech) ? '<i class="fas fa-check"></i>' : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="match-section">
                    <h4>Project Interests</h4>
                    <div class="match-tags">
                        ${(match.projectInterests || []).map(interest => `
                            <span class="match-tag ${currentUserInterests.has(interest) ? 'matching' : ''}"
                                  title="${currentUserInterests.has(interest) ? 'Matching interest!' : ''}">
                                ${interest}
                                ${currentUserInterests.has(interest) ? '<i class="fas fa-check"></i>' : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="match-actions">
                ${match.isConnected ? 
                    `<button class="chat-btn" data-user-id="${match.userId}" data-chat-room="${match.chatRoomId}">
                        <i class="fas fa-comments"></i> Chat
                    </button>` : 
                    `<button class="connect-btn" data-user-id="${match.userId}">
                        <i class="fas fa-user-plus"></i> Connect
                    </button>`
                }
            </div>
        `;

        // Add event listeners based on connection status
        if (match.isConnected) {
            const chatBtn = card.querySelector('.chat-btn');
            chatBtn.addEventListener('click', () => {
                openChatWindow(match.userId, match.fullName, match.chatRoomId);
            });
        } else {
            const connectBtn = card.querySelector('.connect-btn');
            connectBtn.addEventListener('click', async () => {
                try {
                    // First verify authentication
                    const authCheck = await fetch('http://localhost:5000/dashboard', {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!authCheck.ok) {
                        throw new Error('Please log in to connect with other users');
                    }

                    connectBtn.disabled = true;
                    connectBtn.textContent = 'Sending Request...';

                    const response = await fetch('http://localhost:5000/api/send-connection-request', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            targetUserId: match.userId
                        })
                    });

                    // Check content type
                    const contentType = response.headers.get("content-type");

                    if (!response.ok) {
                         // Try to parse JSON if possible
                        if (contentType && contentType.includes("application/json")) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || 'Failed to send connection request');
                        } else {
                             const errorText = await response.text();
                            console.error('Received non-JSON error:', errorText);
                            throw new Error('Server returned an unexpected response. Please try again.');
                        }
                    }

                    const data = await response.json();
                    
                    // if (!response.ok) {
                    //     throw new Error(data.message || 'Failed to send connection request');
                    // }
                    
                    if (data.success) {
                        connectBtn.innerHTML = '<i class="fas fa-clock"></i> Request Pending';
                        connectBtn.classList.add('sent');
                        connectBtn.disabled = true;
                    }
                } catch (error) {
                    console.error('Error sending connection request:', error);
                    connectBtn.disabled = false;
                    connectBtn.innerHTML = '<i class="fas fa-redo"></i> Try Again';
                    alert(error.message || 'Failed to send connection request. Please try again.');
                }
            });
        }
    } catch (error) {
        console.error('Error creating match card:', error);
        card.innerHTML = '<div class="error-message">Error displaying match</div>';
    }

    return card;
}

function calculateMatchPercentage(match) {
    // Get current user's data from the page
    const currentUserTechStack = Array.from(document.getElementById('profileTechStack').children)
        .map(span => span.textContent);
    const currentUserInterests = Array.from(document.getElementById('profileInterests').children)
        .map(span => span.textContent);

    // Calculate tech stack match
    const techStackMatch = calculateSetSimilarity(
        new Set(currentUserTechStack),
        new Set(match.techStack)
    );

    // Calculate interests match
    const interestsMatch = calculateSetSimilarity(
        new Set(currentUserInterests),
        new Set(match.projectInterests)
    );

    // Weight the matches (60% tech stack, 40% interests)
    return Math.round((techStackMatch * 0.6 + interestsMatch * 0.4) * 100);
}

function calculateSetSimilarity(set1, set2) {
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
}

// Update openChatWindow function to use new chat system
function openChatWindow(userId, userName, chatRoomId, teamName = null) {
    // Create chat window if it doesn't exist
    let chatWindow = document.querySelector(`.chat-window[data-chat-room="${chatRoomId}"]`);
    // Track if users are in a team
    
    if (!chatWindow) {
        chatWindow = document.createElement('div');
        chatWindow.className = 'chat-window';
        chatWindow.setAttribute('data-user-id', userId);
        chatWindow.setAttribute('data-chat-room', chatRoomId);
        
        chatWindow.innerHTML = `
            <div class="chat-header">
                <h3 class="chat-title">${teamName || userName}</h3>
                <div class="chat-header-actions">
                    ${!teamName ? `<button class="invite-team-btn" style="margin-right: 10px; padding: 5px 10px;" onclick="createTeam('${userId}', '${userName}')">Invite to Team</button>` : ''}
                    <button class="close-chat">&times;</button>
                </div>
            </div>
            <div class="chat-messages"></div>
            <div class="chat-input">
                <input type="text" placeholder="Type a message...">
                <button class="send-message">Send</button>
            </div>
        `;
        
        document.body.appendChild(chatWindow);
        
        // Add event listeners
        const closeBtn = chatWindow.querySelector('.close-chat');
        const input = chatWindow.querySelector('input');
        const sendBtn = chatWindow.querySelector('.send-message');
        const messagesContainer = chatWindow.querySelector('.chat-messages');
        const inviteTeamBtn = chatWindow.querySelector('.invite-team-btn');
        
        closeBtn.addEventListener('click', () => {
            chatWindow.remove();
        });

        // Set up team invitation
        inviteTeamBtn.addEventListener('click', () => {
            // Create team creation modal
            const modal = document.createElement('div');
            modal.className = 'modal team-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Create Team</h3>
                    <input type="text" id="teamNameInput" placeholder="Enter team name" class="team-name-input">
                    <div class="modal-actions">
                        <button class="create-team-btn">Create & Invite</button>
                        <button class="cancel-team-btn">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Handle team creation
            const createTeamBtn = modal.querySelector('.create-team-btn');
            const cancelTeamBtn = modal.querySelector('.cancel-team-btn');
            const teamNameInput = modal.querySelector('#teamNameInput');

            createTeamBtn.addEventListener('click', async () => {
                const newTeamName = teamNameInput.value.trim();
                if (!newTeamName) {
                    showToast('Please enter a team name', 'error');
                    return;
                }

                try {
                    const response = await fetch('http://localhost:5000/api/create-team', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            teamName: newTeamName,
                            invitedUserId: userId,
                            chatRoomId
                        })
                    });

                    const data = await response.json();
                    if (data.success) {
                        // Update chat header with team name
                        const chatTitle = chatWindow.querySelector('.chat-title');
                        chatTitle.textContent = `Team: ${newTeamName}`;
                        teamName = newTeamName;
                        inviteTeamBtn.style.display = 'none';
                        modal.remove();
                    } else {
                        throw new Error(data.message || 'Failed to create team');
                    }
                } catch (error) {
                    console.error('Error creating team:', error);
                    showToast('Failed to create team. Please try again.', 'error');
                }
            });

            cancelTeamBtn.addEventListener('click', () => modal.remove());
        });
        
        const sendMessage = async () => {
            const content = input.value.trim();
            if (!content) return;
            
            try {
                const response = await fetch('http://localhost:5000/api/send-message', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chatRoomId,
                        content,
                        type: 'text'
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    // Add message to chat window
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message sent';
                    messageDiv.innerHTML = `
                        <div class="message-content">${content}</div>
                        <div class="message-time">${new Date().toLocaleTimeString()}</div>
                    `;
                    messagesContainer.appendChild(messageDiv);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    input.value = '';
                }
            } catch (error) {
                console.error('Error sending message:', error);
                showToast('Failed to send message. Please try again.', 'error');
            }
        };
        
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Load existing messages
        const loadMessages = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/chat-messages/${chatRoomId}`, {
                    credentials: 'include'
                });
                
                const data = await response.json();
                if (data.success && data.messages) {
                    messagesContainer.innerHTML = '';
                    data.messages.forEach(msg => {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = `message ${msg.sender._id === userId ? 'received' : 'sent'}`;
                        messageDiv.innerHTML = `
                            <div class="message-content">${msg.content}</div>
                            <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
                        `;
                        messagesContainer.appendChild(messageDiv);
                    });
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        };
        
        loadMessages();
        
        // Set up periodic message checking
        const checkNewMessages = () => {
            loadMessages();
        };
        
        const messageCheckInterval = setInterval(checkNewMessages, 3000);
        
        // Clean up interval when chat window is closed
        closeBtn.addEventListener('click', () => {
            clearInterval(messageCheckInterval);
            chatWindow.remove();
        });
    }
}

// Helper function to format time
function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Delete notification by ID
async function deleteNotification(notificationId) {
    if (!notificationId) return;
    try {
        const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server response was not JSON');
        }
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to delete notification');
        }
        // Remove notification from DOM
        const notifElem = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (notifElem) {
            notifElem.remove();
        }
        // Optionally, refresh badge/count
        checkNotifications();
    } catch (error) {
        showToast('Failed to delete notification: ' + error.message, 'error');
    }
}

// Add these new functions after your existing functions
function initializeNotifications() {
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsPanel = document.getElementById('notificationsPanel');
    const closeNotifications = document.querySelector('.close-notifications');
    const notificationBadge = document.querySelector('.notification-badge');

    // Toggle notifications panel
    notificationsBtn.addEventListener('click', () => {
        notificationsPanel.style.display = notificationsPanel.style.display === 'none' ? 'block' : 'none';
        if (notificationsPanel.style.display === 'block') {
            loadConnectionRequests();
        }
    });

    // Close notifications panel
    closeNotifications.addEventListener('click', () => {
        notificationsPanel.style.display = 'none';
    });

    // Click outside to close
    document.addEventListener('click', (event) => {
        if (!notificationsPanel.contains(event.target) && 
            !notificationsBtn.contains(event.target) && 
            notificationsPanel.style.display === 'block') {
            notificationsPanel.style.display = 'none';
        }
    });

    // Check for new notifications periodically
    checkNotifications();
    setInterval(checkNotifications, 30000); // Check every 30 seconds
}

async function checkNotifications() {
    try {
        const response = await fetch('http://localhost:5000/api/notifications', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server response was not JSON');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.message || `Server error: ${response.status}`);
        }

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch notifications');
        }

        const badge = document.querySelector('.notification-badge');
        const notificationPanel = document.getElementById('notificationsPanel');

        const notifications = data.notifications || [];
        const unreadCount = notifications.filter(n => !n.read).length;

        // Update badge
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline' : 'none';
        }

        // Update notification panel
        if (notificationPanel && notifications.length > 0) {
            let notificationsToRender = notifications;
            if (Array.isArray(notifications)) {
                // Deduplicate by teamName (or parsed from message if not present)
                const teamInviteMap = new Map();
                function extractTeamName(notification) {
                    if (notification.teamName) return notification.teamName.trim().toLowerCase();
                    // Try to extract from message
                    const msg = notification.message || '';
                    // Match: 'join team <name>' or 'join team <name>.'
                    const match = msg.match(/join team ([^\.\!\?]+)[\.\!\?]?/i);
                    if (match && match[1]) return match[1].trim().toLowerCase();
                    return null;
                }
                for (const n of notifications) {
                    if (n.type === 'team_invitation') {
                        const key = extractTeamName(n);
                        if (!key) continue; // skip if can't identify team
                        // Prefer actionable (unread, has invitationId)
                        if (!teamInviteMap.has(key)) {
                            teamInviteMap.set(key, n);
                        } else {
                            const existing = teamInviteMap.get(key);
                            const isActionable = n.invitationId && !n.read;
                            const existingActionable = existing.invitationId && !existing.read;
                            if (isActionable && !existingActionable) {
                                teamInviteMap.set(key, n);
                            } else if (isActionable === existingActionable) {
                                // Prefer latest
                                const nTime = new Date(n.createdAt || 0).getTime();
                                const exTime = new Date(existing.createdAt || 0).getTime();
                                if (nTime > exTime) teamInviteMap.set(key, n);
                            }
                        }
                    }
                }
                // Keep only one notification per team
                const filteredNotifications = notifications.filter(n => n.type !== 'team_invitation');
                filteredNotifications.push(...Array.from(teamInviteMap.values()));
                notificationsToRender = filteredNotifications;
            }
            notificationPanel.innerHTML = notificationsToRender
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map(notification => {
                    let actionButtons = '';
                    let notificationAttrs = `class="notification-item ${notification.read ? 'read' : 'unread'}" data-notification-id="${notification.id}" data-type="${notification.type}"`;
                    // For team invitations, add data-team-invitation attribute for querySelector
                    if (notification.type === 'team_invitation') {
                        // Only show Accept/Decline if invitationId is present and valid
                        const invitationId = notification.invitationId;
                        notificationAttrs += ` data-team-invitation="${invitationId || ''}"`;
                        if (invitationId && invitationId !== 'undefined') {
                            actionButtons = `
                                <div class="notification-actions request-actions">
                                    <button onclick="handleTeamInvitation('${invitationId}', 'accept', '${notification.teamName ? notification.teamName.replace(/'/g, "&#39;") : ''}')" class="accept-btn">Accept</button>
                                    <button onclick="handleTeamInvitation('${invitationId}', 'reject', '${notification.teamName ? notification.teamName.replace(/'/g, "&#39;") : ''}')" class="decline-btn">Decline</button>
                                </div>
                            `;
                        } else {
                            // Don't show action buttons for legacy/invalid notifications
                            console.warn('Team invitation notification missing valid invitationId:', notification);
                        }
                    } else if (notification.type === 'connection_request') {
                        notificationAttrs += ` data-request-id="${notification.id || ''}"`;
                        if (notification.id && notification.id !== 'undefined') {
                            actionButtons = `
                                <div class="notification-actions request-actions">
                                    <button onclick="handleRequest('${notification.id}', 'accept')" class="accept-request">Accept</button>
                                    <button onclick="handleRequest('${notification.id}', 'decline')" class="decline-request">Decline</button>
                                </div>
                            `;
                        } else {
                            console.warn('Connection request notification with missing or undefined id:', notification);
                        }
                    }
                    return `
                        <div ${notificationAttrs}>
                            <p>${notification.message}</p>
                            <small>${new Date(notification.createdAt).toLocaleString()}</small>
                            ${actionButtons}
                            <button class="delete-notification-btn enhanced-delete-btn" title="Delete Notification" onclick="deleteNotification('${notification.id}')">
    🗑️ <span class="delete-label">Delete</span>
</button>
                        </div>
                    `;
                })
                .join('');
        } else if (notificationPanel) {
            notificationPanel.innerHTML = '<div class="no-notifications">No new notifications</div>';
        }

        // Handle any accepted chat requests
        if (data.acceptedChats) {
            data.acceptedChats.forEach(chat => {
                openChatWindow(chat.userId, chat.userName, chat.chatRoomId);
            });
        }

    } catch (error) {
        console.error('Error checking notifications:', error);
        const notificationPanel = document.getElementById('notificationsPanel');
        if (notificationPanel) {
            notificationPanel.innerHTML = `
                <div class="error-message">
                    Error loading notifications. Please try again later.
                    <br><small>${error.message}</small>
                </div>
            `;
        }
    }
}
// // Update profile route
// app.post('/update-profile', async (req, res) => {
//     try {
//         if (!req.session.userId) {
//             return res.status(401).json({ success: false, message: "No session found" });
//         }

//         const { fullName, username, email, techStack, projectInterests } = req.body;

//         // Check if username is already taken by another user
//         const existingUser = await User.findOne({ 
//             username: username,
//             _id: { $ne: req.session.userId }
//         });

//         if (existingUser) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: "Username is already taken" 
//             });
//         }

//         // Update user profile
//         const updatedUser = await User.findByIdAndUpdate(
//             req.session.userId,
//             {
//                 fullName,
//                 username,
//                 email,
//                 techStack,
//                 projectInterests
//             },
//             { new: true }
//         );

//         if (!updatedUser) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: "User not found" 
//             });
//         }

//         res.json({
//             success: true,
//             message: "Profile updated successfully",
//             user: {
//                 fullName: updatedUser.fullName,
//                 username: updatedUser.username,
//                 email: updatedUser.email,
//                 techStack: updatedUser.techStack,
//                 projectInterests: updatedUser.projectInterests
//             }
//         });
//     } catch (error) {
//         console.error('Profile update error:', error);
//         res.status(500).json({ 
//             success: false, 
//             message: "Server error while updating profile" 
//         });
//     }
// });

async function loadConnectionRequests() {
    const connectionRequests = document.getElementById('connectionRequests');
    if (!connectionRequests) return;

    connectionRequests.innerHTML = '<div class="loading">Loading requests...</div>';
    
    try {
        const response = await fetch('http://localhost:5000/api/notifications', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server response was not JSON');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.message || `Server error: ${response.status}`);
        }

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch notifications');
        }

        // Filter only connection requests
        const requests = data.notifications.filter(n => n.type === 'connection_request');
        
        if (requests.length === 0) {
            connectionRequests.innerHTML = '<div class="no-requests">No pending requests</div>';
            return;
        }
        
        connectionRequests.innerHTML = requests.map(request => {
            // Safely handle potentially missing data
            const senderName = request.sender?.fullName || 'Unknown User';
            const techStack = request.sender?.techStack || [];
            const interests = request.sender?.projectInterests || [];
            
            return `
                <div class="connection-request" data-request-id="${request.id}">
                    <div class="request-user">${senderName}</div>
                    <div class="request-info">
                        <div>Tech Stack: ${techStack.join(', ') || 'None specified'}</div>
                        <div>Interests: ${interests.join(', ') || 'None specified'}</div>
                    </div>
                    <div class="request-actions">
                        <button class="accept-request" onclick="handleRequest('${request.id}', 'accept')">Accept</button>
                        <button class="decline-request" onclick="handleRequest('${request.id}', 'decline')">Decline</button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading connection requests:', error);
        if (connectionRequests) {
            connectionRequests.innerHTML = `
                <div class="error-message">
                    Error loading requests. Please try again later.
                    <br><small>${error.message}</small>
                </div>
            `;
        }
    }
}



// Update handleRequest function
async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server response was not JSON');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.message || `Server error: ${response.status}`);
        }

        if (!data.success) {
            throw new Error(data.message || 'Failed to mark notification as read');
        }

        // Update UI to show notification as read
        const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (notificationElement) {
            notificationElement.classList.remove('unread');
            notificationElement.classList.add('read');
        }

        // Update notification count
        const notificationCount = document.querySelector('.notification-count');
        if (notificationCount) {
            const currentCount = parseInt(notificationCount.textContent) || 0;
            if (currentCount > 0) {
                const newCount = currentCount - 1;
                notificationCount.textContent = newCount;
                notificationCount.style.display = newCount > 0 ? 'block' : 'none';
            }
        }

    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

window.handleRequest = async function(requestId, action) {
    const requestElement = document.querySelector(`[data-request-id="${requestId}"]`);
    if (!requestElement) {
        console.error('Request element not found');
        return;
    }
    
    const actionsDiv = requestElement.querySelector('.request-actions');
    if (!actionsDiv) {
        console.error('Actions div not found');
        return;
    }
    
    try {
        actionsDiv.innerHTML = '<div class="request-status">Processing...</div>';
        
        // Log the request details
        console.log('Processing request:', { requestId, action });
        
        const response = await fetch(`http://localhost:5000/api/accept-connection-request/${requestId}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
        });

        // Log the response
        console.log('Server response status:', response.status);
        
        const data = await response.json();
        console.log('Server response data:', data);

        if (data.success) {
            requestElement.innerHTML = `<div class="request-status success">Request ${action}ed successfully!</div>`;
            
            // If request was accepted, open chat window
            if (action === 'accept' && data.chatRoomId) {
                openChatWindow(data.userId, data.userName, data.chatRoomId);
            }
            
            // Refresh notifications after successful action
            await checkNotifications();
            checkNotifications();
        } else {
            throw new Error(data.message || 'Failed to process request');
        }
    } catch (error) {
        console.error('Error handling request:', error);
        actionsDiv.innerHTML = `
            <div class="error-message">Error: ${error.message}</div>
            <div class="request-actions">
                <button class="accept-request" onclick="handleRequest('${requestId}', 'accept')">Retry Accept</button>
                <button class="decline-request" onclick="handleRequest('${requestId}', 'decline')">Retry Decline</button>
            </div>
        `;
    }
};

// Profile Edit Modal Functionality
document.addEventListener('DOMContentLoaded', () => {
    const profileNavItem = document.querySelector('.nav-item:nth-child(6)'); // Profile nav item
    const profileEditModal = document.getElementById('profileEditModal');
    const closeModalBtn = profileEditModal.querySelector('.close-modal');
    const profileEditForm = document.getElementById('profileEditForm');

    // Open modal when clicking Profile in navbar
    profileNavItem.addEventListener('click', () => {
        // Populate form with current user data
        const fullName = '';
        const username = document.getElementById('profileUsername').textContent;
        const email = document.getElementById('profileEmail').textContent;
        const techStack = Array.from(document.getElementById('profileTechStack').children)
            .map(span => span.textContent)
            .join(', ');
        const interests = Array.from(document.getElementById('profileInterests').children)
            .map(span => span.textContent)
            .join(', ');

        document.getElementById('editFullName').value = fullName;
        document.getElementById('editUsername').value = username;
        document.getElementById('editEmail').value = email;
        document.getElementById('editTechStack').value = techStack;
        document.getElementById('editInterests').value = interests;

        profileEditModal.style.display = 'flex';
    });

    // Close modal when clicking the close button
    closeModalBtn.addEventListener('click', () => {
        profileEditModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === profileEditModal) {
            profileEditModal.style.display = 'none';
        }
    });

    // Handle form submission
    profileEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            fullName: document.getElementById('editFullName').value,
            username: document.getElementById('editUsername').value,
            email: document.getElementById('editEmail').value,
            techStack: document.getElementById('editTechStack').value.split(',').map(item => item.trim()),
            projectInterests: document.getElementById('editInterests').value.split(',').map(item => item.trim())
        };

        try {
            const response = await fetch('http://localhost:5000/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                // Update the profile display

                document.getElementById('profileUsername').textContent = formData.username;
                document.getElementById('profileEmail').textContent = formData.email;
                
                // Update tech stack
                const techStackContainer = document.getElementById('profileTechStack');
                techStackContainer.innerHTML = formData.techStack.length > 0 
                    ? formData.techStack.map(tech => `<span>${tech}</span>`).join('')
                    : '<span>No tech stack specified</span>';

                // Update project interests
                const interestsContainer = document.getElementById('profileInterests');
                interestsContainer.innerHTML = formData.projectInterests.length > 0
                    ? formData.projectInterests.map(interest => `<span>${interest}</span>`).join('')
                    : '<span>No project interests specified</span>';

                // Close the modal
                profileEditModal.style.display = 'none';
                // profileEditModal.classList.remove('show');

                // Show success message
                showToast('Profile updated successfully!', 'success');
            } else {
                alert(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('An error occurred while updating your profile');
        }
    });
});

