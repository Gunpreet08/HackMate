// Array of puzzle objects
const puzzles = [
    {
        id: 1,
        title: "Find the Best Team Match",
        hint: "Think about what skills are needed for an AI web application",
        description: `You have 5 participants:
            - Alice (Frontend)
            - Bob (Backend)
            - Carol (UI/UX)
            - Dave (ML)
            - Eve (Cybersecurity)
            
            Form a team of 3 with complementary skills for a hackathon on "AI for Web".`,
        options: [
            "Alice, Bob, Carol",
            "Alice, Dave, Bob",
            "Dave, Eve, Carol",
            "Bob, Eve, Carol"
        ],
        correctAnswer: 1,// Index of correct option
        points: 5,
        hintPenalty: 2,
        explanation: "Alice (Frontend), Dave (ML), and Bob (Backend) form the perfect team for an AI for Web project!"
    },
    {
        id: 2,
        title: "Debug the Code",
        hint: "Think about string methods in JavaScript",
        description: `What's wrong with this code?
        let word = "HACK";
        console.log(word.reverse());`,
        options: [
            "word should be in lowercase",
            "String doesn't have reverse() method",
            "Missing semicolon",
            "Nothing is wrong"
        ],
        correctAnswer: 1, // Index of correct option
        points: 5,
        hintPenalty: 2,
        explanation: "Strings don't have a reverse() method. Use word.split('').reverse().join('') instead!"
    },
    {
        id: 3,
        title: "Binary Challenge",
        description: "Convert binary '1010' to decimal.",
        hint: "In binary, each position represents 2^n. From right: 2^0, 2^1, 2^2, 2^3",
        options: [
            "8",
            "10",
            "12",
            "14"
        ],
        correctAnswer: 1, // Index of correct option
        points: 5,
        hintPenalty: 2,
        explanation: "1010 in binary = (1×8) + (0×4) + (1×2) + (0×1) = 10 in decimal"
    },
    {
        id: 4,
        title: "API Response Time",
        description: `If an API takes 100ms to respond and you need to make 3 sequential calls, what's the total time needed?`,
        hint: "Sequential calls wait for each previous call to complete before starting",
        options: [
            "100ms",
            "200ms",
            "300ms",
            "It depends on network conditions"
        ],
        correctAnswer: 2, // Index of correct option
        points: 5,
        hintPenalty: 2,
        explanation: "Sequential API calls add up: 100ms + 100ms + 100ms = 300ms total"
    },
    {
        id: 5,
        title: "Git Branch Puzzle",
        description: `You're on 'main' branch and want to create a new feature branch. Which command sequence is correct?`,
        hint: "The -b flag in git checkout is used to create and switch to a new branch",
        options: [
            "git branch feature",
            "git checkout -b feature",
            "git create feature",
            "git new feature"
        ],
        correctAnswer: 1, // Index of correct option
        points: 5,
        hintPenalty: 2,
        explanation: "'git checkout -b feature' creates and switches to a new branch in one command!"
    },
    {
        id: 6,
        title: "CSS Specificity",
        description: `Which selector has the highest specificity?`,
        hint: "Specificity order: inline > id > class > element",
        options: [
            ".header",
            "#nav",
            "div.header",
            "header"
        ],
        correctAnswer: 1, // Index of correct option
        points: 5,
        hintPenalty: 2,
        explanation: "ID selector (#nav) has higher specificity than classes or elements!"
    },
    {
        id: 7,
        title: "Database Query",
        description: `Which SQL query will return unique values?`,
        hint: "DISTINCT is a standard SQL keyword for removing duplicates",
        options: [
            "SELECT name FROM users",
            "SELECT UNIQUE name FROM users",
            "SELECT DISTINCT name FROM users",
            "SELECT NODUPS name FROM users"
        ],
        correctAnswer: 2, // Index of correct option
        points: 5,
        hintPenalty: 2,
        explanation: "SELECT DISTINCT is the correct SQL keyword for unique values!"
    },
    {
        id: 8,
        title: "React State",
        description: `What's wrong with this React code?
        setState({ count: count + 1 });
        setState({ count: count + 1 });`,
        hint: "React batches state updates for performance. Use functional updates for accuracy",
        options: [
            "Nothing wrong",
            "Missing this keyword",
            "State updates may be batched",
            "count is undefined"
        ],
        correctAnswer: 2, // Index of correct option
        points: 5,
        hintPenalty: 2,
        explanation: "React may batch state updates, use setState(prev => ({count: prev.count + 1})) for accurate updates!"
    },
    {
        id: 9,
        title: "Security Question",
        description: `Which password is most secure?`,
        hint: "Strong passwords have: length, complexity, randomness, and mixed characters",
        options: [
            "Password123!",
            "MyP@ssw0rd",
            "kX9#mP2$vL5",
            "ILoveProgramming"
        ],
        correctAnswer: 2, // Index of correct option
        points: 5,
        hintPenalty: 2,
        explanation: "kX9#mP2$vL5 is most secure: random, mixed case, numbers, and special characters!"
    },
    {
        id: 10,
        title: "Algorithm Complexity",
        description: `What's the time complexity of binary search?`,
        hint: "Binary search divides the search space in half each time",
        options: [
            "O(n)",
            "O(log n)",
            "O(n²)",
            "O(1)"
        ],
        correctAnswer: 1, // Index of correct option
        points: 5,
        hintPenalty: 2,
        explanation: "Binary search has O(log n) complexity as it halves the search space each time!"
    }
];

class PuzzleManager {
    constructor() {
        this.currentPuzzle = null;
        this.userPoints = parseInt(localStorage.getItem('puzzlePoints')) || 0;
        this.solvedPuzzles = JSON.parse(localStorage.getItem('solvedPuzzles')) || [];
        this.hintsUsed = JSON.parse(localStorage.getItem('hintsUsed')) || [];
        this.lastHintTime = parseInt(localStorage.getItem('lastHintTime')) || 0;
        this.HINT_COOLDOWN = 15000; // 15 seconds cooldown
    }

    resetPoints() {
        this.userPoints = 0;
        this.solvedPuzzles = [];
        this.hintsUsed = [];
        this.lastHintTime = 0;
        localStorage.setItem('puzzlePoints', 0);
        localStorage.setItem('solvedPuzzles', JSON.stringify([]));
        localStorage.setItem('hintsUsed', JSON.stringify([]));
        localStorage.setItem('lastHintTime', 0);
    }

    showHint() {
        if (!this.currentPuzzle) return { error: 'No puzzle selected' };
        if (!this.currentPuzzle.hint) return { error: 'No hint available for this puzzle' };

        // Apply point penalty
        const penalty = this.currentPuzzle.hintPenalty || 2;
        this.userPoints = Math.max(0, this.userPoints - penalty);
        localStorage.setItem('puzzlePoints', this.userPoints);

        // Track hint usage
        if (!this.hintsUsed.includes(this.currentPuzzle.id)) {
            this.hintsUsed.push(this.currentPuzzle.id);
            localStorage.setItem('hintsUsed', JSON.stringify(this.hintsUsed));
        }

        return {
            hint: this.currentPuzzle.hint,
            penalty: penalty,
            newPoints: this.userPoints
        };
    }

    getRandomPuzzle() {
        const unsolvedPuzzles = puzzles.filter(p => !this.solvedPuzzles.includes(p.id));
        if (unsolvedPuzzles.length === 0) {
            return null;
        }
        const puzzle = unsolvedPuzzles[Math.floor(Math.random() * unsolvedPuzzles.length)];
        this.currentPuzzle = puzzle; // Set currentPuzzle when getting a new puzzle
        return puzzle;
    }

    checkAnswer(index) {
        if (!this.currentPuzzle) return false;
        
        // No need for Number conversion since index is already a number from array iteration
        const isCorrect = index === this.currentPuzzle.correctAnswer;
        
        if (isCorrect) {
            this.userPoints += this.currentPuzzle.points;
            this.solvedPuzzles.push(this.currentPuzzle.id);
            localStorage.setItem('puzzlePoints', this.userPoints);
            localStorage.setItem('solvedPuzzles', JSON.stringify(this.solvedPuzzles));
        }
        return {
            isCorrect,
            points: isCorrect ? this.currentPuzzle.points : 0,
            explanation: this.currentPuzzle.explanation
        };
    }
}