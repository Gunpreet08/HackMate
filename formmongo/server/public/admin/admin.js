// Sidebar navigation logic
const sectionNavMap = [
 
    { section: 'user-management', nav: 'nav-users' },
    { section: 'team-management', nav: 'nav-teams' },
    { section: 'hackathon-management', nav: 'nav-hackathons' },
    { section: 'challenge-management', nav: 'nav-challenges' },

];

sectionNavMap.forEach(({section, nav}) => {
    const navEl = document.getElementById(nav);
    const secEl = document.getElementById(section);
    if (navEl && secEl) {
        navEl.addEventListener('click', function(e) {
            e.preventDefault();
            // Hide all admin-section elements robustly
            document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
            // Show only the selected section
            secEl.style.display = 'block';
            console.log('Switched to section:', section);
            // Fetch data for each section
            if(section === 'team-management') fetchTeams();
            if(section === 'user-management') fetchUsers();
            if(section === 'hackathon-management') fetchHackathons();
        });
    }
});
// Show only user-management by default
// Show only 'dashboard' section by default
// sectionNavMap.forEach(({section}) => {
//     const s = document.getElementById(section);
//     if (s) s.style.display = (section === 'dashboard' ? 'block' : 'none');
// });

sectionNavMap.forEach(({section}, idx) => {
    const s = document.getElementById(section);
    if (s) s.style.display = (idx === 0 ? 'block' : 'none');
});

// --- Hackathon Management Table (UI + Fetch) ---
const hackathonTableContainer = document.getElementById('hackathon-table-container');
async function fetchHackathons() {
    if (!hackathonTableContainer) return;
    hackathonTableContainer.innerHTML = '<div>Loading hackathons...</div>';
    try {
        const response = await fetch('/api/hackathons', { credentials: 'include' });
        const hackathons = await response.json();
        if (!Array.isArray(hackathons) || hackathons.length === 0) {
            hackathonTableContainer.innerHTML = '<div>No hackathons found.</div>';
            return;
        }
        let html = '<table class="admin-table"><thead><tr><th>Name</th><th>Start Date</th><th>End Date</th><th>URL</th><th>Action</th></tr></thead><tbody>';
        hackathons.forEach(h => {
    const start = h.startDate ? new Date(h.startDate).toLocaleDateString() : '-';
    const end = h.endDate ? new Date(h.endDate).toLocaleDateString() : '-';
    // Only allow delete for admin-created hackathons (with _id)
    const canDelete = h._id;
    html += `<tr>
        <td>${h.name || '-'}</td>
        <td>${start}</td>
        <td>${end}</td>
        <td>${h.url ? `<a href="${h.url}" target="_blank">View</a>` : '-'}</td>
        <td>${canDelete ? `<button class='delete-hackathon-btn' data-id='${h._id}'>Delete</button>` : '<span style="color:#888;">—</span>'}</td>
    </tr>`;
});
        html += '</tbody></table>';
        hackathonTableContainer.innerHTML = html;

        // Add event listeners for delete buttons
        const deleteBtns = document.querySelectorAll('.delete-hackathon-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async function() {
                const hackathonId = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this hackathon?')) {
                    try {
                        const res = await fetch(`/api/admin/hackathons/${hackathonId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        const result = await res.json();
                        if (result.success) {
                            fetchHackathons(); // Refresh table
                        } else {
                            alert('Failed to delete hackathon: ' + (result.message || 'Unknown error'));
                        }
                    } catch (err) {
                        alert('Error deleting hackathon: ' + err.message);
                    }
                }
            });
        });
    } catch (err) {
        hackathonTableContainer.innerHTML = `<div style="color:red;">Failed to load hackathons: ${err.message}</div>`;
    }
}

// --- Hackathon Modal Logic ---
const hackathonModal = document.getElementById('hackathon-modal');
const openHackathonBtn = document.getElementById('generate-hackathon');
const closeHackathonBtn = document.getElementById('close-hackathon-modal');
const cancelHackathonBtn = document.getElementById('cancel-hackathon');
const hackathonForm = document.getElementById('hackathon-form');
const hackathonFormError = document.getElementById('hackathon-form-error');

function openHackathonModal() {
    hackathonForm.reset();
    hackathonFormError.style.display = 'none';
    hackathonFormError.textContent = '';
    hackathonModal.style.display = 'block';
}
function closeHackathonModal() {
    hackathonModal.style.display = 'none';
    hackathonFormError.style.display = 'none';
    hackathonFormError.textContent = '';
    hackathonForm.reset();
}
if (openHackathonBtn) openHackathonBtn.onclick = openHackathonModal;
if (closeHackathonBtn) closeHackathonBtn.onclick = closeHackathonModal;
if (cancelHackathonBtn) cancelHackathonBtn.onclick = closeHackathonModal;
window.addEventListener('click', function(event) {
    if (event.target === hackathonModal) closeHackathonModal();
});

if (hackathonForm) {
    hackathonForm.onsubmit = async function(e) {
        e.preventDefault();
        hackathonFormError.style.display = 'none';
        hackathonFormError.textContent = '';
        const name = document.getElementById('hackathon-name').value.trim();
        const startDate = document.getElementById('hackathon-start').value;
        const endDate = document.getElementById('hackathon-end').value;
        const url = document.getElementById('hackathon-url').value.trim();
        if (!name || !startDate || !endDate) {
            hackathonFormError.textContent = 'Name, start date, and end date are required.';
            hackathonFormError.style.display = 'block';
            return;
        }
        try {
            const res = await fetch('/api/admin/hackathons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, startDate, endDate, url })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                hackathonFormError.textContent = data.message || 'Failed to create hackathon';
                hackathonFormError.style.display = 'block';
                return;
            }
            closeHackathonModal();
            fetchHackathons();
        } catch (err) {
            hackathonFormError.textContent = 'Error: ' + err.message;
            hackathonFormError.style.display = 'block';
        }
    };
}

// --- Placeholder content for other panels ---
function setPlaceholder(sectionId, text) {
    const el = document.getElementById(sectionId);
    if (el) {
        el.innerHTML = `<div style='text-align:center;padding:60px 0;font-size:1.5rem;color:#888;'>${text}</div>`;
    }
}
// --- Challenge Management Table (UI + Fetch) ---
const challengeTableContainer = document.getElementById('challenge-table-container');
async function fetchChallenges() {
    if (!challengeTableContainer) return;
    challengeTableContainer.innerHTML = '<div>Loading challenges...</div>';
    try {
        const response = await fetch('/api/admin/challenges', { credentials: 'include' });
        const challenges = await response.json();
        if (!Array.isArray(challenges) || challenges.length === 0) {
            challengeTableContainer.innerHTML = '<div>No challenges found.</div>';
            return;
        }
        let html = '<table class="admin-table"><thead><tr><th>Title</th><th>Difficulty</th><th>Points</th><th>Date Posted</th><th>Action</th></tr></thead><tbody>';
        challenges.forEach(c => {
            const date = c.datePosted ? new Date(c.datePosted).toLocaleDateString() : '';
            html += `<tr><td>${c.title}</td><td>${c.difficulty}</td><td>${c.points}</td><td>${date}</td><td><button class='delete-challenge-btn' data-id='${c._id}'>Delete</button></td></tr>`;
        });
        html += '</tbody></table>';
        challengeTableContainer.innerHTML = html;

        // Add event listeners for delete buttons
        const deleteBtns = document.querySelectorAll('.delete-challenge-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async function() {
                const challengeId = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this challenge?')) {
                    try {
                        const res = await fetch(`/api/admin/challenges/${challengeId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        const result = await res.json();
                        if (result.success) {
                            fetchChallenges(); // Refresh table
                        } else {
                            alert('Failed to delete challenge: ' + (result.message || 'Unknown error'));
                        }
                    } catch (err) {
                        alert('Error deleting challenge: ' + err.message);
                    }
                }
            });
        });
    } catch (err) {
        challengeTableContainer.innerHTML = `<div style="color:red;">Failed to load challenges: ${err.message}</div>`;
    }
}

// Fetch challenges when switching to challenge management
sectionNavMap.forEach(({section, nav}) => {
    const navEl = document.getElementById(nav);
    if (navEl && section === 'challenge-management') {
        navEl.addEventListener('click', fetchChallenges);
    }
});

setPlaceholder('analytics-dashboard', 'Analytics Dashboard Coming Soon!');
setPlaceholder('analytics-dashboard', 'Analytics Dashboard Coming Soon!');


// --- Team Management Table (UI + Fetch) ---
const teamTableContainer = document.getElementById('team-table-container');
async function fetchTeams() {
    try {
        const response = await fetch('/api/admin/teams', { credentials: 'include' });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch teams');
        renderTeamTable(data.teams);
    } catch (err) {
        if (teamTableContainer) teamTableContainer.innerHTML = `<div style="color:red;">Failed to load teams: ${err.message}</div>`;
    }
}
function renderTeamTable(teams) {
    if (!teamTableContainer) return;
    if (!Array.isArray(teams) || teams.length === 0) {
        teamTableContainer.innerHTML = '<div>No teams found.</div>';
        return;
    }
    let html = '<table class="admin-table"><thead><tr><th>Name</th><th>Members</th><th>Action</th></tr></thead><tbody>';
    teams.forEach(team => {
        html += `<tr><td>${team.name}</td><td>${(team.members || []).map(m=>m.fullName||m.username||m.email).join(', ')}</td><td><button class="delete-team-btn" data-id="${team._id}">Delete</button></td></tr>`;
    });
    html += '</tbody></table>';
    teamTableContainer.innerHTML = html;
    // Add delete logic for teams
    document.querySelectorAll('.delete-team-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const teamId = this.getAttribute('data-id');
            if (!confirm('Are you sure you want to delete this team?')) return;
            try {
                const res = await fetch(`/api/admin/teams/${teamId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const result = await res.json();
                if (result.success) {
                    this.closest('tr').remove();
                } else {
                    alert(result.message || 'Failed to delete team');
                }
            } catch (e) {
                alert('Failed to delete team: ' + e.message);
            }
        });
    });
}
// (Removed legacy nav-teams event listener; handled by main sidebar logic)

// --- User Management Table Rendering (with Backend Integration) ---
const userTableBody = document.querySelector('#user-table tbody');

async function fetchUsers() {
    try {
        const response = await fetch('/api/admin/users', { credentials: 'include' });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch users');
        renderUserTable(data.users);
    } catch (err) {
        userTableBody.innerHTML = `<tr><td colspan="6" style="color:red;">Failed to load users: ${err.message}</td></tr>`;
    }
}

function renderUserTable(users) {
    userTableBody.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.fullName}</td>
            <td>${user.email}</td>
            <td>${user.username}</td>
            <td>${(user.projectInterests || []).join(', ')}</td>
            <td>${(user.techStack || []).join(', ')}</td>
            <td><button class="delete-user-btn" data-id="${user._id}">Delete</button></td>
        `;
        userTableBody.appendChild(tr);
    });
    // Add delete button listeners
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const userId = this.getAttribute('data-id');
            if (!confirm('Are you sure you want to delete this user?')) return;
            try {
                const res = await fetch(`/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const result = await res.json();
                if (result.success) {
                    this.closest('tr').remove();
                } else {
                    alert(result.message || 'Failed to delete user');
                }
            } catch (e) {
                alert('Failed to delete user: ' + e.message);
            }
        });
    });
}

// Fetch and render users on load
fetchUsers();

// Analytics chart placeholder
// You will use Chart.js or similar here later
