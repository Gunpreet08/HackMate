let currentStep = 0;
const formSections = document.querySelectorAll(".form-section");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const submitBtn = document.getElementById("submitBtn");
const progressSteps = document.querySelectorAll(".progress-bar .step");

function showStep(step) {
    formSections.forEach((section, index) => {
        section.classList.toggle("active", index === step);
    });

    progressSteps.forEach((stepEl, index) => {
        stepEl.classList.toggle("active", index === step);
    });

    prevBtn.style.display = step === 0 ? "none" : "inline-block";
    nextBtn.style.display = step === formSections.length - 1 ? "none" : "inline-block";
    submitBtn.style.display = step === formSections.length - 1 ? "inline-block" : "none";
}

function nextPrev(n) {
    currentStep += n;
    showStep(currentStep);
}

// Initialize form
showStep(currentStep);

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("signupForm");
    if (!form) return; // Defensive: do nothing if form not found

    form.addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent page reload

        const formData = new FormData(form);
        const jsonData = Object.fromEntries(formData.entries());

        // Process tech stack and project interests into arrays of strings
        if (jsonData.techStack) {
            jsonData.techStack = jsonData.techStack.split(',').map(tech => tech.trim());
        }
        if (jsonData.projectInterests) {
            jsonData.projectInterests = jsonData.projectInterests.split(',').map(interest => interest.trim());
        }

        console.log("Submitting data:", jsonData); // Debugging log

        try {
            const response = await fetch("http://localhost:5000/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(jsonData)
            });

            const result = await response.json();
            console.log(result);

            if (response.ok) {
                alert("Signup successful! Redirecting to login page...");
                setTimeout(function() {
                    window.location.href = "login.html";
                }, 1500);
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            console.error("Submission failed:", error);
            alert("An error occurred while submitting the form.");
        }
    });
});

async function checkEmailExists() {
    const email = document.getElementById('email').value;
    const emailError = document.getElementById('emailError');

    if (email.length > 3) {  // Avoid checking for empty input
        try{
            const response = await fetch('http://localhost:5000/check-email?email=' + encodeURIComponent(email));
        const data = await response.json();
        if (!data.success) {
            emailError.innerText = data.message;
            emailError.style.display = 'block';
        } else {
            emailError.style.display = 'none';
        }
        }catch (err) {
            emailError.innerText = "Error checking email.";
            emailError.style.display = 'block';
        }      
    }
}


//ticker
document.addEventListener("DOMContentLoaded", function () {
    let tickerList = document.getElementById("hackathon-list");
    
    // ✅ Start animation immediately with dummy data
    tickerList.innerHTML = `<li>🔄 Fetching hackathons...</li>
        <li>🎯 Stay tuned for upcoming events!</li>
        <li>🚀 Preparing hackathons list...</li>`; 

    startTickerAnimation(); // Start animation immediately

    // fetch fresh data
    fetch("/api/hackathons")
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

                allItems += `<li class="colon">
                    <a href="${hackathon.url}" target="_blank">${hackathon.name}</a> -
                    <span class="date">${startDate}</span>
                </li>`;

                /*let listItem = document.createElement("li");
                listItem.innerHTML = `<a href="${hackathon.url}" target="_blank">${hackathon.name}</a>`;
                tickerList.appendChild(listItem);*/
            });
            // ✅ Duplicate the list to create an infinite effect
            tickerList.innerHTML = allItems + allItems;

            // ✅ Start animation only when hackathons are loaded
            startTickerAnimation();
        })
        .catch(error =>{
            console.error("Error fetching hackathons:", error);
            tickerList.innerHTML = `<li class="error">⚠️ Failed to load hackathons. Please try again.</li>`;
        });
            
});

// ✅ Function to start animation dynamically
function startTickerAnimation() {
    let ticker = document.querySelector(".ticker ul");

    if (ticker) {
        let styleSheet = document.createElement("style");
        styleSheet.innerHTML = `
            @keyframes ticker-scroll {
                from { transform: translateY(0%); }
                to { transform: translateY(10%);}
                //to { transform: translateY(-${ticker.scrollWidth}px); }
            }
            .ticker ul {
                display: block;
                animation: ticker-scroll 50s linear infinite;
            }
        `;
        document.head.appendChild(styleSheet);
    }
}
