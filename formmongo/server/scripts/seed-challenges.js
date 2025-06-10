const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');

mongoose.connect('mongodb://localhost:27017/hackmateDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const challenges = [
    {
        title: "Two Sum",
        description: "Given an array of integers nums and an integer target, return indices of the two numbers in nums such that they add up to target.",
        difficulty: "Easy",
        points: 10,
        testCases: [
            { input: "[2,7,11,15], target=9", expectedOutput: "[0,1]" },
            { input: "[3,2,4], target=6", expectedOutput: "[1,2]" }
        ],
        sampleCode: `function twoSum(nums, target) {
    // Your code here
}`,
        timeLimit: 2000,
        memoryLimit: 50000000
    },
    {
        title: "Valid Parentheses",
        description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
        difficulty: "Medium",
        points: 20,
        testCases: [
            { input: "()", expectedOutput: "true" },
            { input: "()[]{}", expectedOutput: "true" },
            { input: "(]", expectedOutput: "false" }
        ],
        sampleCode: `function isValid(s) {
    // Your code here
}`,
        timeLimit: 2000,
        memoryLimit: 50000000
    },
    {
        title: "Merge K Sorted Lists",
        description: "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
        difficulty: "Hard",
        points: 30,
        testCases: [
            { input: "[[1,4,5],[1,3,4],[2,6]]", expectedOutput: "[1,1,2,3,4,4,5,6]" },
            { input: "[]", expectedOutput: "[]" }
        ],
        sampleCode: `function mergeKLists(lists) {
    // Your code here
}`,
        timeLimit: 3000,
        memoryLimit: 50000000
    }
];

async function seedChallenges() {
    try {
        // Clear existing challenges
        await Challenge.deleteMany({});
        
        // Insert new challenges
        await Challenge.insertMany(challenges);
        
        console.log('Successfully seeded challenges!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding challenges:', error);
        process.exit(1);
    }
}

seedChallenges();