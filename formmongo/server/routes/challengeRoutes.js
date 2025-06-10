const express = require('express');
const router = express.Router();
const { executeCode } = require('../utils/codeExecutor');
const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');

// Get daily challenge
router.get('/daily-challenge', async (req, res) => {
    try {
        const challenge = await Challenge.findOne({ isDaily: true });
        if (!challenge) {
            // If no daily challenge is set, get the first challenge from the database
            const anyChallenge = await Challenge.findOne();
            if (!anyChallenge) {
                return res.status(404).json({ error: 'No challenges found' });
            }
            // Set this challenge as daily
            anyChallenge.isDaily = true;
            await anyChallenge.save();
            return res.json({
                id: anyChallenge._id,
                title: anyChallenge.title,
                description: anyChallenge.description,
                difficulty: anyChallenge.difficulty,
                points: anyChallenge.points,
                testCases: anyChallenge.testCases,
                timeLimit: anyChallenge.timeLimit || 1800,
                sampleCode: anyChallenge.sampleCode
            });
        }
        
        // Send complete challenge data including ID
        res.json({
            id: challenge._id,
            title: challenge.title,
            description: challenge.description,
            difficulty: challenge.difficulty,
            points: challenge.points,
            testCases: challenge.testCases,
            timeLimit: challenge.timeLimit || 1800,
            sampleCode: challenge.sampleCode
        });
    } catch (error) {
        console.error('Error fetching daily challenge:', error);
        res.status(500).json({ error: 'Failed to fetch daily challenge' });
    }
});

// Run tests for a challenge
// router.post('/run-tests', async (req, res) => {
//     try {
//         const { code, language, challengeId } = req.body;
        
//         if (!challengeId) {
//             return res.status(400).json({ error: 'Challenge ID is required' });
//         }

//         // Fetch the actual challenge from the database
//         const challenge = await Challenge.findById(challengeId);
//         if (!challenge) {
//             return res.status(404).json({ error: `Challenge not found with ID: ${challengeId}` });
//         }

//         const results = await Promise.all(
//             challenge.testCases.filter(testCase => !testCase.isHidden).map(async (testCase) => {
//                 try {
//                     const result = await executeCode(code, language, testCase.input);
                    
//                     // Clean up the output and expected values
//                     const output = (result.output || '').toString().trim();
//                     const expected = testCase.expectedOutput.toString().trim();
//                     const passed = output === expected;
                    
//                     return {
//                         input: testCase.input,
//                         expected: expected,
//                         output: output,
//                         passed: passed,
//                         error: result.error || null,
//                         explanation: testCase.explanation
//                     };
//                 } catch (error) {
//                     return {
//                         input: testCase.input,
//                         expected: testCase.expectedOutput,
//                         output: '',
//                         passed: false,
//                         error: error.message,
//                         explanation: testCase.explanation
//                     };
//                 }
//             })
//         );

//         if (results.length === 0) {
//             return res.status(400).json({ error: 'No test cases available for this challenge' });
//         }

//         res.json(results);
//     } catch (error) {
//         console.error('Error running tests:', error);
//         res.status(500).json({ error: error.message || 'Failed to run tests' });
//     }
// });

// Submit solution
router.post('/submit-solution', async (req, res) => {
    try {
        const { code, language, challengeId } = req.body;
        const userId = req.user._id; // Assuming you have authentication middleware
        const challenge = await Challenge.findById(challengeId);
        
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // Run all test cases including hidden ones
        const results = await Promise.all(
            challenge.testCases.map(async (testCase) => {
                const result = await executeCode(code, language, testCase.input);
                return {
                    passed: result.output.trim() === testCase.expectedOutput.trim()
                };
            })
        );

        const allPassed = results.every(r => r.passed);
        
        // Create submission record
        const submission = new Submission({
            userId,
            challengeId,
            code,
            language,
            status: allPassed ? 'Accepted' : 'Failed',
            score: allPassed ? challenge.points : 0
        });
        
        await submission.save();

        res.json({
            success: true,
            message: allPassed ? 'All test cases passed!' : 'Some test cases failed',
            score: allPassed ? challenge.points : 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit solution' });
    }
});

// Get specific challenge by ID
router.get('/challenges/:id', async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }
        res.json(challenge);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch challenge' });
    }
});

module.exports = router; 