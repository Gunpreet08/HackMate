const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: true
    },
    points: {
        type: Number,
        required: true
    },
    testCases: [{
        input: String,
        expectedOutput: String,
        isHidden: {
            type: Boolean,
            default: false
        },
        explanation: String
    }],
    sampleCode: {
        javascript: String,
        python: String,
        java: String,
        cpp: String
    },
    datePosted: {
        type: Date,
        default: Date.now
    },
    timeLimit: {
        type: Number,
        default: 1800, // Default time limit of 30 minutes in seconds
        min: 300,      // Minimum 5 minutes
        max: 7200     // Maximum 2 hours
    },
    executionTimeLimit: {
        type: Number,
        default: 2000 // Execution time limit in milliseconds
    },
    memoryLimit: {
        type: Number,
        default: 256 // Memory limit in MB
    },
    isDaily: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Challenge', challengeSchema);