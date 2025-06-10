const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');

mongoose.connect('mongodb://localhost:27017/hackmate', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const sampleChallenge = {
    title: "Find Maximum Number",
    description: "Write a function that finds the maximum number in an array of integers.",
    difficulty: "Easy",
    points: 10,
    isDaily: true,
    testCases: [
        {
            input: "[1, 3, 2]",
            expectedOutput: "3",
            isHidden: false,
            explanation: "3 is the largest number in the array"
        },
        {
            input: "[-1, -5, -2]",
            expectedOutput: "-1",
            isHidden: false,
            explanation: "-1 is the largest number among negative numbers"
        }
    ],
    sampleCode: {
        javascript: "function findMaximum(arr) {\n    // Write your code here\n    return Math.max(...arr);\n}",
        python: "def find_maximum(arr):\n    # Write your code here\n    return max(arr)",
        java: "public int findMaximum(int[] arr) {\n    // Write your code here\n    int max = arr[0];\n    for(int num : arr) {\n        if(num > max) {\n            max = num;\n        }\n    }\n    return max;\n}",
        cpp: "int findMaximum(vector<int>& arr) {\n    // Write your code here\n    return *max_element(arr.begin(), arr.end());\n}"
    },
    timeLimit: 1800
};

async function createChallenge() {
    try {
        const challenge = new Challenge(sampleChallenge);
        await challenge.save();
        console.log('Challenge created successfully!');
        console.log('Challenge ID:', challenge._id);
    } catch (error) {
        console.error('Error creating challenge:', error);
    } finally {
        mongoose.connection.close();
    }
}

createChallenge(); 