let editor;
var width=window.innerWidth
var input = document.getElementById("input")
var output = document.getElementById("output")
var run = document.getElementById("run")
var option =document.getElementById("inlineFormSelectPref")
option.addEventListener("change",function(){
    if(option.value=="Java"){
        editor.setOption("mode","text/x-java")
    }
    else if(option.value=="python"){
        editor.setOption("mode","text/x-python")
    }
    else{
        editor.setOption("mode","text/x-c++src")
    }
})
var code;
run.addEventListener("click",async function(){
    code={
        code:editor.getValue(),
        input:input.value,
        lang:option.value
    }
    var oData=await fetch("http://localhost:8000/compile",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify(code)
    })
    var d=await oData.json()
    output.value=d.output
})


// Initialize variables
// let editor;
let currentChallenge = null;
let timerInterval = null;
let timeLeft = null;

const defaultCode = {
    javascript: '// Write your solution here\nfunction solution(input) {\n    \n}',
    python: '# Write your solution here\ndef solution(input):\n    pass',
    java: 'public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}'
};

const starterCode = {
    python: `def find_maximum(arr):
    # Write your code here
    return max(arr)

# Example usage:
print(find_maximum([1, 3, 2]))    # Output: 3
print(find_maximum([-1, -5, -2])) # Output: -1`,
    
    javascript: `function findMaximum(arr) {
    // Write your code here
    return Math.max(...arr);
}

// Example usage:
console.log(findMaximum([1, 3, 2]));    // Output: 3
console.log(findMaximum([-1, -5, -2])); // Output: -1`,
    
    java: `public int findMaximum(int[] arr) {
    // Write your code here
    int max = arr[0];
    for(int num : arr) {
        if(num > max) {
            max = num;
        }
    }
    return max;
}`,
    
    cpp: `int findMaximum(vector<int>& arr) {
    // Write your code here
    return *max_element(arr.begin(), arr.end());
}`
};

// Puzzle variables
const puzzleManager = new PuzzleManager();
let currentPuzzle = null;
let hintCooldownTimer = null;
let hintDisplayTimer = null;
let hintCooldownActive = false;

const editorSectionContainer = document.getElementById('editor-section-container'); // Get reference to the container

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    
    // First load the challenge
    await loadDailyChallenge();
    
    // Then check timer state
    const savedTimerState = JSON.parse(localStorage.getItem('timerState') || '{}');
    if (savedTimerState.isRunning && savedTimerState.challengeId === currentChallenge.id) {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - savedTimerState.startTimestamp) / 1000);
        timeLeft = Math.max(0, savedTimerState.originalTime - elapsedSeconds);
        
        if (timeLeft > 0) {
            const challengeContainer = document.querySelector('.challenge-container');
            if (challengeContainer) {
                challengeContainer.style.display = 'flex';
            }
            // Show timer controls if timer was running
            const timerControls = document.querySelector('.timer-controls');
            if (timerControls) {
                timerControls.classList.add('show');
            }
            startTimer();
        } else {
            localStorage.removeItem('timerState');
            // Ensure editor is read-only if timer is not running
            if (editor) {
                 editor.setOption('readOnly', true);
                 if (editorSectionContainer) {
                     editorSectionContainer.classList.add('editor-read-only');
                 }
            }
        }
    } else {
         // Ensure editor is read-only if no saved timer state
         if (editor) {
              editor.setOption('readOnly', true);
              if (editorSectionContainer) {
                  editorSectionContainer.classList.add('editor-read-only');
              }
         }
    }
    
    // Initialize editor and other components
    // initializeCodeEditor();
    
    // Add timer control event listeners
    const pauseBtn = document.getElementById('pause-timer');
    const stopBtn = document.getElementById('stop-timer');
    
    if (pauseBtn) {
        pauseBtn.onclick = () => {
            const currentState = pauseBtn.dataset.state;
            if (currentState === 'running') {
                pauseTimer();
            } else {
                resumeTimer();
            }
        };
    }
    
    if (stopBtn) {
        stopBtn.onclick = stopTimer;
    }
    
    // Initialize code editor if elements exist
    const codeEditor = document.getElementById('editor');
    if (codeEditor) {
        console.log('Initializing code editor...');
        editor = CodeMirror.fromTextArea(codeEditor, {
            mode: "text/x-c++src",
            theme: "dracula",
            lineNumbers: true,
            autoCloseBrackets: true,
            readOnly: true
        });
        editor.setSize("100%", "500");
        
        // Initially set the read-only state and add class
        if (editorSectionContainer) {
            editorSectionContainer.classList.add('editor-read-only');
        }
        
        // loadLeaderboard();
        // loadUserSubmissions();
        
        // Add code editor related event listeners
        document.getElementById('inlineFormSelectPref')?.addEventListener('change', handleLanguageChange);
        document.getElementById('run')?.addEventListener('click', runTests);
        document.getElementById('submit-solution')?.addEventListener('click', submitSolution);
        document.getElementById('reset-code')?.addEventListener('click', resetCode);

        // Add event listener for clicks/focus on read-only editor
        const editorWrapper = editor?.getWrapperElement(); // Get the CodeMirror wrapper element
        if (editorWrapper) {
            editorWrapper.addEventListener('click', handleReadOnlyEditorInteraction);
            editorWrapper.addEventListener('focus', handleReadOnlyEditorInteraction);
        }
    }

    // Add Start Now button click handler
    const startButton = document.querySelector('.start-now-btn');
    if (startButton) {
        startButton.addEventListener('click', handleStartNow);
    }

    // Set up periodic refresh for daily challenge (every hour)
    setInterval(loadDailyChallenge, 3600000); // 3600000 ms = 1 hour
    
    // Event Listeners for puzzle functionality
    const puzzleBtn = document.getElementById('puzzle-btn');
    const modal = document.getElementById('puzzle-modal');
    const closeBtn = document.querySelector('.close');

    puzzleBtn?.addEventListener('click', showPuzzle);
    
    // Modify close button listener to use showPopup
    closeBtn?.addEventListener('click', () => {
        // Check if the puzzle is solved before closing
        // Assuming puzzleManager.isSolved() exists and returns boolean
        if (puzzleManager.isSolved()) {
            modal.style.display = 'none';
            // Optionally show a success message
            // showToast('Puzzle solved!', 'success');
        } else {
            // Use showPopup for confirmation
            showPopup({
                title: 'Close Puzzle',
                message: 'You haven\'t solved this puzzle yet. Are you sure you want to close it?',
                confirmText: 'OK',
                cancelText: 'Cancel',
                onConfirm: () => {
                    modal.style.display = 'none';
                }
                // If user cancels, popup simply closes
            });
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
             // Check if the puzzle is solved before closing by clicking outside
             if (puzzleManager.isSolved()) {
                 modal.style.display = 'none';
             } else {
                 // Use showPopup for confirmation when clicking outside
                 showPopup({
                     title: 'Close Puzzle',
                     message: 'You haven\'t solved this puzzle yet. Are you sure you want to close it?',
                     confirmText: 'OK',
                     cancelText: 'Cancel',
                     onConfirm: () => {
                         modal.style.display = 'none';
                     }
                 });
             }
        }
    });

    const themeBtn = document.getElementById('theme-switch');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply saved theme
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    themeBtn?.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', currentTheme);
    });

    // Add event listener for custom test button
    const runCustomTestBtn = document.getElementById('run-custom-test');
    if (runCustomTestBtn) {
        runCustomTestBtn.addEventListener('click', runTests);
    }

    // Add puzzle hint button handlers
    const hintBtn = document.getElementById('show-hint');
    const hintText = document.getElementById('hint-text');
    const resetBtn = document.getElementById('reset-points');

    hintBtn.onclick = () => {
        // Check if hint is on cooldown
        if (hintCooldownActive) return;
        
        // Check if we have a current puzzle
        if (!currentPuzzle) {
            alert('No puzzle selected');
            return;
        }
        
        const result = puzzleManager.showHint();
        if (result.error) {
            alert(result.error);
            return;
        }
        
        // Show points deduction notification
        const notification = document.getElementById('points-notification');
        notification.classList.remove('hidden');
        notification.classList.add('show');
        
        // Hide notification after 2 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 300); // Wait for fade out animation
        }, 2000);
        
        // Update points display
        document.getElementById('total-points').textContent = result.newPoints;
        
        // Show the hint for 15 seconds
        if (result.hint) {
            hintText.textContent = result.hint;
            hintText.classList.remove('hidden');
            
            // Hide hint after 15 seconds
            hintDisplayTimer = setTimeout(() => {
                hintText.classList.add('hidden');
                
                // Start 15 second cooldown timer
                const startTime = Date.now();
                updateHintCooldown(15000); // 15 seconds
                
                hintCooldownTimer = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    const remaining = 15000 - elapsed;
                    
                    if (remaining <= 0) {
                        clearInterval(hintCooldownTimer);
                        updateHintCooldown(0);
                    } else {
                        updateHintCooldown(remaining);
                    }
                }, 1000);
                
            }, 15000);
        }
    };

    resetBtn.onclick = () => {
        // Replace native confirm with showPopup
        showPopup({
            title: 'Reset Progress',
            message: 'Are you sure you want to reset your progress? This will clear all points and solved puzzles.',
            confirmText: 'OK',
            cancelText: 'Cancel',
            onConfirm: () => {
                 // If user confirms, proceed with reset
                puzzleManager.resetPoints();
                document.getElementById('total-points').textContent = '0';
                showPuzzle(); // Show a new puzzle
            }
        });
    };
});

async function loadDailyChallenge() {
    console.log('Loading daily challenge...');
    try {
        const response = await fetch('/api/daily-challenge');
        if (!response.ok) {
            throw new Error('Failed to fetch challenge');
        }
        const challenge = await response.json();
        console.log('Raw challenge data:', challenge);
        
        // Store the current challenge with the correct ID
        currentChallenge = {
            ...challenge,
            id: challenge.id || challenge._id // Handle both id and _id
        };
        
        // Get the time limit from the challenge data
        const challengeTimeLimit = currentChallenge.timeLimit ? parseInt(currentChallenge.timeLimit) : null;
        timeLeft = challengeTimeLimit || 1800; // Use challenge time limit or default to 30 minutes
        
        // Update the Problem of the Day section
        const problemTitle = document.getElementById('daily-challenge-title');
        if (problemTitle) {
            problemTitle.textContent = challenge.title || 'Error loading challenge';
        }

        // Update difficulty badge with the challenge's specific time limit
        const difficultyBadge = document.querySelector('.difficulty-badge');
        if (difficultyBadge) {
            const minutes = Math.floor(timeLeft / 60);
            difficultyBadge.className = `difficulty-badge ${challenge.difficulty.toLowerCase()}`;
            difficultyBadge.textContent = `${challenge.difficulty} • ${minutes} min`;
        }

        // Update the challenge interface
        document.getElementById('problem-description').textContent = challenge.description || 'No description available';
        
        // Update timer display immediately
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        // Update example cases
        const examplesEl = document.getElementById('example-cases');
        if (examplesEl && challenge.testCases) {
            const exampleCases = challenge.testCases.filter(test => !test.isHidden);
            if (exampleCases.length === 0) {
                examplesEl.innerHTML = '<p>No example test cases available.</p>';
            } else {
                const examplesHtml = exampleCases
                    .map((test, index) => `
                        <div class="test-case">
                            <h4>Example ${index + 1}:</h4>
                            <pre>Input: ${test.input}</pre>
                            <pre>Expected Output: ${test.expectedOutput}</pre>
                            ${test.explanation ? `<pre>Explanation: ${test.explanation}</pre>` : ''}
                        </div>
                    `).join('');
                examplesEl.innerHTML = examplesHtml;
            }
        }
        
    } catch (error) {
        console.error('Error loading daily challenge:', error);
        const problemTitle = document.getElementById('daily-challenge-title');
        if (problemTitle) {
            problemTitle.textContent = 'Error loading challenge';
        }
    }
}

// Timer Functions
function handleStartNow() {
    if (!currentChallenge) {
        console.error('No challenge loaded');
        return;
    }

    // Show the challenge container
    const challengeContainer = document.querySelector('.challenge-container');
    if (challengeContainer) {
        challengeContainer.style.display = 'flex';
    }

    // Show timer controls
    const timerControls = document.querySelector('.timer-controls');
    if (timerControls) {
        timerControls.classList.add('show');
    }

    // Only set timeLeft if timer isn't already running
    const savedTimerState = JSON.parse(localStorage.getItem('timerState') || '{}');
    if (!savedTimerState.isRunning) {
        timeLeft = currentChallenge.timeLimit || 1800;
        
        // Save initial timer state with timestamp and challenge ID
        const timerState = {
            isRunning: true,
            startTimestamp: Date.now(),
            originalTime: timeLeft,
            challengeId: currentChallenge.id,
            isPaused: false
        };
        localStorage.setItem('timerState', JSON.stringify(timerState));
    }

    startTimer();

    // Make the editor writable and remove the read-only class
    if (editor) {
        editor.setOption('readOnly', false);
        if (editorSectionContainer) {
            editorSectionContainer.classList.remove('editor-read-only');
        }
    }
}

function startTimer() {
    // Clear any existing interval
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // Update timer display immediately
    updateTimerDisplay();

    // Ensure pause button is in running state
    const pauseBtn = document.getElementById('pause-timer');
    if (pauseBtn) {
        pauseBtn.dataset.state = 'running';
    }

    // Start the timer interval
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();

            // Update localStorage with current state
            const savedTimerState = JSON.parse(localStorage.getItem('timerState') || '{}');
            if (savedTimerState.isRunning) {
                localStorage.setItem('timerState', JSON.stringify({
                    ...savedTimerState,
                    originalTime: savedTimerState.originalTime,
                    startTimestamp: savedTimerState.startTimestamp,
                    isPaused: false
                }));
            }

            // Handle time warnings
            const questionTimer = document.getElementById('question-timer');
            if (questionTimer) {
                const totalTime = currentChallenge.timeLimit || 1800;
                const warningThreshold = Math.floor(totalTime * 0.25);
                const dangerThreshold = Math.floor(totalTime * 0.1);

                if (timeLeft <= dangerThreshold) {
                    questionTimer.classList.remove('warning');
                    questionTimer.classList.add('danger');
                } else if (timeLeft <= warningThreshold) {
                    questionTimer.classList.add('warning');
                }
            }
        } else {
            clearInterval(timerInterval);
            localStorage.removeItem('timerState');
            showTimeUpMessage();
        }
    }, 1000);
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;

        // Update localStorage to remember pause state
        const savedTimerState = JSON.parse(localStorage.getItem('timerState') || '{}');
        if (savedTimerState.isRunning) {
            localStorage.setItem('timerState', JSON.stringify({
                ...savedTimerState,
                isPaused: true,
                pausedAt: Date.now(),
                timeLeftWhenPaused: timeLeft
            }));
        }

        // Update pause button state
        const pauseBtn = document.getElementById('pause-timer');
        if (pauseBtn) {
            pauseBtn.dataset.state = 'paused';
        }
    }
}

function resumeTimer() {
    const savedTimerState = JSON.parse(localStorage.getItem('timerState') || '{}');
    if (savedTimerState.isPaused) {
        // Calculate any time adjustments if needed
        const pauseDuration = Math.floor((Date.now() - savedTimerState.pausedAt) / 1000);
        savedTimerState.startTimestamp += pauseDuration * 1000;
        
        localStorage.setItem('timerState', JSON.stringify({
            ...savedTimerState,
            isPaused: false
        }));
    }

    // Update pause button state before starting timer
    const pauseBtn = document.getElementById('pause-timer');
    if (pauseBtn) {
        pauseBtn.dataset.state = 'running';
    }

    startTimer();
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Reset to challenge time limit instead of 0
    timeLeft = currentChallenge.timeLimit || 1800; // Default to 30 minutes if no time limit set
    
    // Update localStorage
    localStorage.removeItem('timerState');
    
    // Update timer display
    updateTimerDisplay();
    
    // Reset pause button state
    const pauseBtn = document.getElementById('pause-timer');
    if (pauseBtn) {
        pauseBtn.dataset.state = 'running';
    }
    
    // Hide timer controls
    const timerControls = document.querySelector('.timer-controls');
    if (timerControls) {
        timerControls.classList.remove('show');
    }
    
    // Remove any warning/danger classes
    const questionTimer = document.getElementById('question-timer');
    if (questionTimer) {
        questionTimer.classList.remove('warning', 'danger');
    }
    
    // Show notification
    const notification = document.createElement('div');
    notification.className = 'timer-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="material-icons">timer_off</i>
            <p>Timer stopped and reset to initial time.</p>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);

    // Make the editor non-writable and add the read-only class
    if (editor) {
        editor.setOption('readOnly', true);
        if (editorSectionContainer) {
            editorSectionContainer.classList.add('editor-read-only');
        }
    }
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function showTimeUpMessage() {
    const notification = document.createElement('div');
    notification.className = 'time-up-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="material-icons" style="color: #f44336;">alarm_off</i>
            <span>Time's up! You can continue working on your solution.</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="margin-left: 10px; padding: 5px 10px; border: none; 
                           background: #f44336; color: white; border-radius: 4px; 
                           cursor: pointer;">
                Dismiss
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// Add this after your existing code
// const puzzleManager = new PuzzleManager();
const modal = document.getElementById('puzzle-modal');
const closeBtn = document.querySelector('.close');
const puzzleBtn = document.getElementById('puzzle-btn');

// let currentPuzzle = null;
// let hintCooldownTimer = null;
// let hintDisplayTimer = null;
// let hintCooldownActive = false;

// Puzzle Functions
function showPuzzle() {
    // Only get new puzzle if we don't have a current one or if it's been solved
    if (!currentPuzzle || puzzleManager.solvedPuzzles.includes(currentPuzzle.id)) {
        const puzzle = puzzleManager.getRandomPuzzle();
        if (!puzzle) {
            alert('You have solved all available puzzles! Check back tomorrow for more.');
            return;
        }
        
        // Set both the PuzzleManager's currentPuzzle and our local currentPuzzle
        currentPuzzle = puzzle;
        puzzleManager.currentPuzzle = puzzle;
    }
    
    document.getElementById('puzzle-title').textContent = currentPuzzle.title;
    document.getElementById('puzzle-description').textContent = currentPuzzle.description;
    
    const optionsContainer = document.getElementById('puzzle-options');
    optionsContainer.innerHTML = '';
    
    currentPuzzle.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'puzzle-option';
        button.textContent = option;
        button.onclick = () => checkAnswer(index);
        optionsContainer.appendChild(button);
    });
    
    // Reset result and hint state
    document.getElementById('puzzle-result').classList.add('hidden');
    document.getElementById('result-message').textContent = '';
    document.getElementById('next-puzzle').style.display = 'none';
    document.getElementById('hint-text').classList.add('hidden');
    
    // Reset hint button
    const hintBtn = document.getElementById('show-hint');
    hintBtn.disabled = false;
    hintBtn.textContent = 'Show Hint';
    
    // Clear any existing timers
    if (hintDisplayTimer) {
        clearTimeout(hintDisplayTimer);
    }
    if (hintCooldownTimer) {
        clearInterval(hintCooldownTimer);
    }
    
    modal.style.display = 'block';
}

function resetHintState() {
    // Clear timers
    if (hintDisplayTimer) {
        clearTimeout(hintDisplayTimer);
        hintDisplayTimer = null;
    }
    if (hintCooldownTimer) {
        clearInterval(hintCooldownTimer);
        hintCooldownTimer = null;
    }
    
    // Reset UI
    document.getElementById('hint-text').classList.add('hidden');
    document.getElementById('show-hint').disabled = false;
    document.getElementById('show-hint').textContent = 'Show Hint';
    hintCooldownActive = false;
}

function updateHintCooldown(timeLeft) {
    if (timeLeft > 0) {
        document.getElementById('show-hint').disabled = true;
        document.getElementById('show-hint').textContent = `Wait ${Math.ceil(timeLeft/1000)}s`;
        hintCooldownActive = true;
    } else {
        document.getElementById('show-hint').disabled = false;
        document.getElementById('show-hint').textContent = 'Show Hint';
        hintCooldownActive = false;
    }
}

function checkAnswer(index) {
    if (!currentPuzzle) return;
    
    const result = puzzleManager.checkAnswer(index);
    const resultDiv = document.getElementById('puzzle-result');
    const messageDiv = document.getElementById('result-message');
    const optionsContainer = document.getElementById('puzzle-options');
    
    resultDiv.classList.remove('hidden');
    resultDiv.className = `puzzle-result ${result.isCorrect ? 'correct' : 'incorrect'}`;
    
    // Update the message with the explanation
    messageDiv.innerHTML = result.isCorrect ? 
        `Correct! You earned ${result.points} points.<br>${currentPuzzle.explanation}` :
        'Incorrect. Try again!';
    
    if (result.isCorrect) {
        // Reset hint state when answer is correct
        resetHintState();
        
        // Update points display
        document.getElementById('total-points').textContent = puzzleManager.userPoints;
        
        // Show next puzzle button
        document.getElementById('next-puzzle').style.display = 'block';
        
        // Disable all buttons
        const buttons = optionsContainer.getElementsByClassName('puzzle-option');
        for (let button of buttons) {
            button.disabled = true;
        }
    }
}

function handleLanguageChange(event) {
    const language = event.target.value;
    const modes = {
        javascript: 'javascript',
        python: 'python',
        java: 'text/x-java',
        cpp: 'text/x-c++src'
    };
    editor.setOption('mode', modes[language]);
    resetCode();
}

function resetCode() {
    // Clear editor content and reset to default for the selected language
    if (editor) {
        // const defaultLang = document.getElementById('inlineFormSelectPref').value.toLowerCase();
        editor.setValue('');
        // Editor remains read-only unless the timer is started
        // editor.setOption('readOnly', false);
        // if (editorSectionContainer) {
        //     editorSectionContainer.classList.remove('editor-read-only');
        // }
    }
    // Clear console/output and test results
    clearConsole();
    // clearResults();
}

function clearConsole() {
    const consoleOutput = document.getElementById('console-output');
    if (consoleOutput) {
        consoleOutput.innerHTML = '';
    }
    // Also clear the input textarea
    const inputTextArea = document.getElementById('input');
    if (inputTextArea) {
        inputTextArea.value = '';
    }
    // Clear the output textarea
    const outputTextArea = document.getElementById('output');
    if (outputTextArea) {
        outputTextArea.value = '';
    }
}

function displayTestResults(results) {
    const resultsDiv = document.querySelector('.results-container');
    resultsDiv.innerHTML = '';
    
    // Check if results is an array and is not empty
    if (!Array.isArray(results) || results.length === 0) {
        displayError('No test results available or received.');
        // Also hide the output section if there are no results
        document.querySelector('.output-section').classList.remove('show');
        return;
    }

    results.forEach((test, index) => {
        const testDiv = document.createElement('div');
        testDiv.className = `test-result ${test.passed ? 'success' : 'failure'}`;
        
        const inputOutputDiv = document.createElement('div');
        inputOutputDiv.className = 'input-output';
        
        const inputDiv = document.createElement('div');
        inputDiv.className = 'input';
        inputDiv.innerHTML = `<h4>Input:</h4><pre>${formatTestValue(test.input)}</pre>`;
        
        const outputDiv = document.createElement('div');
        outputDiv.className = 'output';
        outputDiv.innerHTML = `
            <h4>Expected Output:</h4>
            <pre>${formatTestValue(test.expectedOutput)}</pre>
            <h4>Your Output:</h4>
            <pre>${formatTestValue(test.actualOutput)}</pre>
        `;
        
        inputOutputDiv.appendChild(inputDiv);
        inputOutputDiv.appendChild(outputDiv);
        
        testDiv.appendChild(inputOutputDiv);
        
        // Display error if test failed AND backend returned an error message
        if (!test.passed && test.error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = `Error: ${test.error}`; // Display the backend error
            testDiv.appendChild(errorDiv);
        } else if (!test.passed) {
             const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = 'Test failed (Wrong Answer)'; // Generic failed message
            testDiv.appendChild(errorDiv);
        }
        
        resultsDiv.appendChild(testDiv);
    });
    
    // Show the output section
    document.querySelector('.output-section').classList.add('show');
}

function formatTestValue(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
}

function displayError(message) {
    const resultsDiv = document.querySelector('.results-container');
    resultsDiv.innerHTML = `<div class="test-result failure">
        <div class="error">${message}</div>
    </div>`;
    document.querySelector('.output-section').classList.add('show');
}

function clearResults() {
    const resultsDiv = document.querySelector('.results-container');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
    }
    document.querySelector('.output-section').classList.remove('show');
}

async function runTests() {
    if (!editor || !currentChallenge) return;
    
    const code = editor.getValue();
    const language = document.getElementById('language-select').value;
    
    try {
        const response = await fetch('/api/run-tests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code,
                language,
                challengeId: currentChallenge.id
            })
        });
        
        const results = await response.json();
        console.log('Results received from backend:', results); // Add this line
        displayTestResults(results);
        
    } catch (error) {
        console.error('Error running tests:', error);
        displayError(`Error running tests: ${error.message}`);
    }
}

async function submitSolution() {
    if (!editor || !currentChallenge) return;
    
    try {
        const code = editor.getValue();
        const language = document.getElementById('language-select').value;
        
        const response = await fetch('/api/submit-solution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code,
                language,
                challengeId: currentChallenge.id
            })
        });
        
        const result = await response.json();
        if (result.success) {
            // Clear timer state and interval on successful submission
            localStorage.removeItem('timerState');
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            alert('Solution submitted successfully!');
        } else {
            alert('Solution submission failed: ' + result.message);
        }
        
    } catch (error) {
        console.error('Error submitting solution:', error);
        alert('Error submitting solution: ' + error.message);
    }
}

// Update next puzzle button click handler
document.getElementById('next-puzzle').onclick = () => {
    if (!currentPuzzle || !puzzleManager.solvedPuzzles.includes(currentPuzzle.id)) {
        alert('Please solve the current puzzle first!');
        return;
    }
    showPuzzle();
};

// Update close button handler
closeBtn.onclick = () => {
    if (!currentPuzzle || puzzleManager.solvedPuzzles.includes(currentPuzzle.id)) {
        modal.style.display = 'none';
    } else {
        // Replace native confirm with showPopup
        showPopup({
            title: 'Close Puzzle',
            message: 'You haven\'t solved this puzzle yet. Are you sure you want to close it?',
            confirmText: 'OK',
            cancelText: 'Cancel',
            onConfirm: () => {
                modal.style.display = 'none';
            }
        });
    }
};

puzzleBtn.onclick = showPuzzle;
window.onclick = (e) => {
    if (e.target === modal) {
         // Check if the puzzle is solved before closing by clicking outside
         if (puzzleManager.isSolved()) {
             modal.style.display = 'none';
         } else {
             // Replace native confirm with showPopup for clicking outside
             showPopup({
                 title: 'Close Puzzle',
                 message: 'You haven\'t solved this puzzle yet. Are you sure you want to close it?',
                 confirmText: 'OK',
                 cancelText: 'Cancel',
                 onConfirm: () => {
                     modal.style.display = 'none';
                 }
             });
         }
    }
};

// Function to show the temporary notification
function showReadOnlyMessage() {
    const message = "Editor is read-only. Click 'Start Now' to begin.";
    
    // Remove any existing read-only notifications
    const existingNotification = document.querySelector('.read-only-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'timer-notification read-only-notification'; // Reuse timer notification styles
    notification.innerHTML = `
        <div class="notification-content">
            <i class="material-icons">info_outline</i>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(notification);

    // Hide notification after 3 seconds
    setTimeout(() => notification.remove(), 3000);
}

// Event handler for read-only editor interaction
function handleReadOnlyEditorInteraction(event) {
    if (editor && editor.getOption('readOnly')) {
        showReadOnlyMessage();
        editor.display.input.blur(); // Remove focus from the editor
    }
}


