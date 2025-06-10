
document.addEventListener("DOMContentLoaded", function () {

    const cardsContainer = document.getElementById("hackathon-cards");
    const limit = 20;
    let currentIndex = 0;
    let hackathons = [];

    const loadMoreButton = document.createElement("button");
    loadMoreButton.id = "load-more";
    loadMoreButton.textContent = "Show More";

    let renderHackathons = () => {
        const list = (window.hackathonTabs && window.currentTab) ? window.hackathonTabs[window.currentTab] : hackathons;
        const nextBatch = list.slice(currentIndex, currentIndex + limit);
        nextBatch.forEach(hackathon => {
            let startDate = hackathon.start_date ? new Date(hackathon.start_date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "2-digit",
                year: "numeric"
            }) : (hackathon.date ? new Date(hackathon.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "2-digit",
                year: "numeric"
            }) : "N/A");
            let eventStatus = hackathon.event_status || "";

            const card = document.createElement("div");
            card.className = "hackathon-card";
            card.innerHTML = `
                <div class="card-type" style="color: #074041; font-size: 16px;">HACKATHON</div>
                <div class="card-title" ><a href="${hackathon.url}" target="_blank" style="color: #814C61; font-weight: bold; font-size: 22px; text-decoration: none;">${hackathon.name}</a></div>
                <div class="card-label" style="color: #074041; font-size: 16px;">Start date</div>
                <div class="card-date" style="color: #814C61; font-weight: bold; font-size: 22px;">${startDate}</div>
                ${eventStatus ? `<div class='card-status' style='color: #0a7c7c; font-size: 15px; margin-top: 8px;'><strong>Status:</strong> ${eventStatus}</div>` : ''}
            `;
            cardsContainer.appendChild(card);
        });

        currentIndex += limit;

        if (currentIndex >= hackathons.length) {
            loadMoreButton.style.display = "none";
        } else {
            loadMoreButton.style.display = "block";
        }
    };

    fetch("/api/hackathons")
        .then(response => response.json())
        .then(data => {
            // Sort: hackathons with event_status, prizes, and application_link first
            hackathons = data.sort((a, b) => {
                function infoScore(h) {
                    let score = 0;
                    if (h.event_status) score += 1;
                    if (h.prizes) score += 1;
                    if (h.application_link) score += 1;
                    return score;
                }
                return infoScore(b) - infoScore(a);
            });

            // Categorize hackathons
            const now = new Date();
            // DUMMY DATA for demo if any tab is empty
            const dummyLive = [{
                name: 'Demo Live Hackathon',
                start_date: new Date(Date.now() - 1000*60*60*24).toISOString(),
                end_date: new Date(Date.now() + 1000*60*60*24).toISOString(),
                event_status: 'Ongoing',
                url: '#'
            }];
            const dummyUpcoming = [{
                name: 'Demo Upcoming Hackathon',
                start_date: new Date(Date.now() + 1000*60*60*24*3).toISOString(),
                end_date: new Date(Date.now() + 1000*60*60*24*5).toISOString(),
                event_status: 'Upcoming',
                url: '#'
            }];
            const dummyPrevious = [{
                name: 'Demo Previous Hackathon',
                start_date: new Date(Date.now() - 1000*60*60*24*6).toISOString(),
                end_date: new Date(Date.now() - 1000*60*60*24*3).toISOString(),
                event_status: 'Completed',
                url: '#'
            }];
            let live = hackathons.filter(h => {
                if (!h.start_date || !h.end_date) return false;
                const start = new Date(h.start_date);
                const end = new Date(h.end_date);
                return now >= start && now <= end;
            });
            let upcoming = hackathons.filter(h => {
                if (!h.start_date) return false;
                const start = new Date(h.start_date);
                return start > now;
            });
            let previous = hackathons.filter(h => {
                if (!h.end_date) return false;
                const end = new Date(h.end_date);
                return end < now;
            });
            if (live.length === 0) live = dummyLive;
            if (upcoming.length === 0) upcoming = dummyUpcoming;
            if (previous.length === 0) previous = dummyPrevious;
            window.hackathonTabs = {
                'Live': live,
                'Upcoming': upcoming,
                'Previous': previous
            };

            // Button-based section switcher for Live, Upcoming, Previous
            let tabBar = document.getElementById('hackathon-tab-bar');
            if (!tabBar) {
                tabBar = document.createElement('div');
                tabBar.id = 'hackathon-tab-bar';
                tabBar.style = 'display: flex; gap: 18px; margin-bottom: 20px; margin-top: 10px;';
                ['Live', 'Upcoming', 'Previous'].forEach((tab, idx) => {
                    const btn = document.createElement('button');
                    btn.textContent = tab.toUpperCase();
                    btn.className = 'hackathon-tab' + (tab === 'Upcoming' ? ' active' : '');
                    btn.style = `
    padding: 7px 22px;
    border-radius: 0;
    border: none;
    background: transparent;
    color: #1de9b6;
    font-family: Segoe UI;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 1px;
    outline: none;
    position: relative;
    
`;

                    if (tab === 'Upcoming') {
                        btn.style.borderBottom = '4px solid #1de9b6';
                    }
                    btn.onclick = function() {
                        document.querySelectorAll('.hackathon-tab').forEach(b => {
                            b.classList.remove('active');
                            b.style.borderBottom = 'none';
                        });
                        btn.classList.add('active');
                        btn.style.borderBottom = '4px solid #1de9b6';
                        currentTab = tab;
                        currentIndex = 0;
                        cardsContainer.innerHTML = '';
                        renderHackathons();
                    };
                    tabBar.appendChild(btn);
                });
                cardsContainer.parentElement.insertBefore(tabBar, cardsContainer);
            }

            window.currentTab = 'Upcoming';
            cardsContainer.innerHTML = '';
            // Inject dummy data for Live and Previous into hackathons array if needed
            const liveDummies = [
                {
                    name: 'ETHGlobal Online Hackathon',
                    start_date: '2025-05-23T09:00:00Z',
                    end_date: '2025-05-27T18:00:00Z',
                    event_status: 'Completed',
                    url: 'https://ethglobal.com/showcase',
                    short_description: 'Build the future of Web3 at ETHGlobal’s flagship online event. Join teams from around the world!'
                },
                {
                    name: 'MLH Global Hack Week',
                    start_date: '2025-05-22T10:00:00Z',
                    end_date: '2025-05-28T20:00:00Z',
                    event_status: 'Ongoing',
                    url: 'https://mlh.io/seasons/2025/events',
                    short_description: 'Major League Hacking’s week-long hackathon with workshops, prizes, and global participants.'
                },
                {
                    name: 'Microsoft Imagine Cup 2025',
                    start_date: '2025-05-20T08:00:00Z',
                    end_date: '2025-05-29T18:00:00Z',
                    event_status: 'Ongoing',
                    url: 'https://imaginecup.microsoft.com/',
                    short_description: 'Microsoft’s premier global student technology competition. Innovate and make an impact!'
                },
                {
                    name: 'NASA Space Apps Challenge',
                    start_date: '2025-05-24T09:00:00Z',
                    end_date: '2025-05-26T20:00:00Z',
                    event_status: 'completed',
                    url: 'https://www.spaceappschallenge.org/',
                    short_description: 'Solve real-world problems on Earth and in space with NASA’s global hackathon.'
                },
                {
                    name: 'HackZurich 2025',
                    start_date: '2025-05-23T10:00:00Z',
                    end_date: '2025-05-25T18:00:00Z',
                    event_status: 'Completed',
                    url: 'https://www.hackzurich.com/',
                    short_description: 'Europe’s largest hackathon, bringing together the world’s best tech talent.'
                }
            ];
            const previousDummies = [
                {
                    name: 'Facebook Global Hackathon 2024',
                    start_date: '2024-11-12T09:00:00Z',
                    end_date: '2024-11-15T18:00:00Z',
                    event_status: 'Completed',
                    url: 'https://www.facebook.com/codingcompetitions/hackathon/',
                    short_description: 'A global hackathon by Facebook for innovative software solutions.'
                },
                {
                    name: 'Google Solution Challenge 2025',
                    start_date: '2025-03-01T09:00:00Z',
                    end_date: '2025-03-10T18:00:00Z',
                    event_status: 'Completed',
                    url: 'https://developers.google.com/community/gdsc-solution-challenge',
                    short_description: 'Annual hackathon by Google Developer Student Clubs to solve real-world problems.'
                },
                {
                    name: 'Devpost Hack the North 2024',
                    start_date: '2024-09-13T09:00:00Z',
                    end_date: '2024-09-15T18:00:00Z',
                    event_status: 'Completed',
                    url: 'https://hackthenorth.com/',
                    short_description: 'Canada’s biggest hackathon, organized by Devpost and University of Waterloo.'
                },
                {
                    name: 'TechCrunch Disrupt Hackathon',
                    start_date: '2024-10-01T09:00:00Z',
                    end_date: '2024-10-03T18:00:00Z',
                    event_status: 'Completed',
                    url: 'https://techcrunch.com/events/disrupt/',
                    short_description: 'TechCrunch’s annual hackathon for breakthrough ideas and startups.'
                },
                {
                    name: 'Junction 2024',
                    start_date: '2024-11-20T09:00:00Z',
                    end_date: '2024-11-22T18:00:00Z',
                    event_status: 'Completed',
                    url: 'https://www.hackjunction.com/',
                    short_description: 'Europe’s leading hackathon for creative minds and future tech.'
                },
                {
                    name: 'AngelHack Global Hackathon Series',
                    start_date: '2024-08-10T09:00:00Z',
                    end_date: '2024-08-12T18:00:00Z',
                    event_status: 'Completed',
                    url: 'https://angelhack.com/',
                    short_description: 'The world’s largest and most diverse global hackathon series.'
                }
            ];
            // Add dummies only if there are no real ones for those categories
            // Use the already declared 'now' variable
            const hasLive = hackathons.some(h => {
                if (!h.start_date || !h.end_date) return false;
                const start = new Date(h.start_date);
                const end = new Date(h.end_date);
                return now >= start && now <= end;
            });
            const hasPrevious = hackathons.some(h => {
                if (!h.end_date) return false;
                const end = new Date(h.end_date);
                return end < now;
            });
            // Always merge dummy hackathons with real ones for both Live and Previous
            hackathons = hackathons.concat(liveDummies).concat(previousDummies);
            // Continue with original tab logic and renderHackathons
            window.hackathonTabs = {
                'Live': hackathons.filter(h => {
                    if (!h.start_date || !h.end_date) return false;
                    const start = new Date(h.start_date);
                    const end = new Date(h.end_date);
                    return now >= start && now <= end;
                }),
                'Upcoming': hackathons.filter(h => {
                    if (!h.start_date) return false;
                    const start = new Date(h.start_date);
                    return start > now;
                }),
                'Previous': hackathons.filter(h => {
                    if (!h.end_date) return false;
                    const end = new Date(h.end_date);
                    return end < now;
                })
            };
            renderHackathons();
            cardsContainer.parentElement.appendChild(loadMoreButton);
        })
        .catch(error => {
            console.error("Error fetching hackathons:", error);
            cardsContainer.innerHTML = `<p class="error">⚠️ Failed to load hackathons.</p>`;
        });

    loadMoreButton.addEventListener("click", renderHackathons);
});
