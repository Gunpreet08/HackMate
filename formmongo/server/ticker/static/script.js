document.addEventListener("DOMContentLoaded", function () {
    let tickerList = document.getElementById("hackathon-list");
    
    // Start animation immediately with dummy data
    tickerList.innerHTML = `<li>🔄 Fetching hackathons...</li>
        <li>🎯 Stay tuned for upcoming events!</li>
        <li>🚀 Preparing hackathons list...</li>`; 

    startTickerAnimation(); // Start animation immediately

    // fetch fresh data
    fetch("http://127.0.0.1:5000/api/hackathons")
        .then(response => response.json())
        .then(data => {
            tickerList.innerHTML = ""; //Remove placeholder

            // Create original hackathons list
            let allItems ="";
            data.forEach(hackathon => {
                // Format date (optional: make it more readable)
                let startDate = new Date(hackathon.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "2-digit",
                    year: "numeric"
                });

                allItems += `<li class="colon"><a href="${hackathon.url}" target="_blank">${hackathon.name}</a> -<span class="date">${startDate}</span></li>`;
            });
            // Duplicate the list to create an infinite effect
            tickerList.innerHTML = allItems + allItems;
        })
        .catch(error =>{
            console.error("Error fetching hackathons:", error);
            tickerList.innerHTML = `<li class="error">⚠️ Failed to load hackathons. Please try again.</li>`;
        });
            
});

// Function to start animation dynamically
function startTickerAnimation() {
    let ticker = document.querySelector(".ticker ul");

    if (ticker) {
        let styleSheet = document.createElement("style");
        styleSheet.innerHTML = `
            @keyframes ticker-scroll {
                from { transform: translateY(0%); }
                to { transform: translateY(-50%); }
            }
            .ticker ul {
                display: block;
                animation: ticker-scroll 25s linear infinite;
            }
        `;
        document.head.appendChild(styleSheet);
    }
}

// Function to format time units
function formatTimeUnit(value) {
    return value < 10 ? `0${value}` : value;
}

// Function to calculate time remaining
function getTimeRemaining(endTime) {
    const total = Date.parse(endTime) - Date.parse(new Date());
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    
    return {
        total,
        days: formatTimeUnit(days),
        hours: formatTimeUnit(hours),
        minutes: formatTimeUnit(minutes)
    };
}

// Function to create a hackathon card
function createHackathonCard(hackathon) {
    const card = document.createElement('div');
    card.className = 'hackathon-card';
    
    // Get organization logo or use default
    const logoUrl = hackathon.logo_url || 'default-logo.png';
    
    // Calculate time remaining
    const timeRemaining = getTimeRemaining(hackathon.end_date || hackathon.deadline);
    
    card.innerHTML = `
        <img class="card-image" src="${logoUrl}" alt="${hackathon.name} logo">
        <div class="card-content">
            <div class="hackathon-type">${hackathon.source || 'Hackathon'}</div>
            <h3 class="hackathon-title">${hackathon.name}</h3>
            <div class="participant-count">
                👥 ${hackathon.participants || '0'} Participants
            </div>
            <div class="countdown">
                <div class="countdown-label">ENDS IN</div>
                <div class="countdown-timer">
                    <div class="time-unit">
                        <div class="time-value">${timeRemaining.days}</div>
                        <div class="time-label">DAYS</div>
                    </div>
                    <div class="time-unit">
                        <div class="time-value">${timeRemaining.hours}</div>
                        <div class="time-label">HOURS</div>
                    </div>
                    <div class="time-unit">
                        <div class="time-value">${timeRemaining.minutes}</div>
                        <div class="time-label">MINUTES</div>
                    </div>
                </div>
            </div>
            <a href="${hackathon.url}" target="_blank" class="start-button">START NOW</a>
        </div>
    `;
    
    return card;
}

// Function to update hackathon grid
function updateHackathonGrid(hackathons) {
    const grid = document.getElementById('hackathon-grid');
    grid.innerHTML = ''; // Clear loading state
    
    if (!hackathons || hackathons.length === 0) {
        grid.innerHTML = '<div class="loading-card">No hackathons found</div>';
        return;
    }
    
    hackathons.forEach(hackathon => {
        const card = createHackathonCard(hackathon);
        grid.appendChild(card);
    });
}

// Function to fetch hackathons
async function fetchHackathons() {
    try {
        const response = await fetch('/api/hackathons');
        if (!response.ok) {
            throw new Error('Failed to fetch hackathons');
        }
        const data = await response.json();
        updateHackathonGrid(data);
        
        // Update countdown timers every minute
        setInterval(() => {
            updateHackathonGrid(data);
        }, 60000);
        
    } catch (error) {
        console.error('Error:', error);
        const grid = document.getElementById('hackathon-grid');
        grid.innerHTML = '<div class="loading-card">Failed to load hackathons</div>';
    }
}

// Start fetching hackathons when the page loads
document.addEventListener('DOMContentLoaded', fetchHackathons);
