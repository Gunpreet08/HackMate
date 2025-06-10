const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');

// Get daily challenge
router.get('/api/daily-challenge', async (req, res) => {
    try {
        // --- Start Daily Challenge Logic ---

        // TODO: Implement logic here to check if a daily challenge has already been selected for the current day.
        // This would typically involve querying a database for the last selected challenge and its date.

        let dailyChallenge = null;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set time to beginning of the day


        // Use the date string to seed the random selection
        // This ensures the same challenge is returned for all users on the same day
        const challenges = await Challenge.find();
        
        if (challenges.length === 0) {
            return res.status(404).json({ error: 'No challenges found' });
        }

        // Use the date string to generate a deterministic index
        const index = Math.abs(today.toISOString().split('T')[0].split('').reduce((acc, char) => {
            return acc + char.charCodeAt(0);
        }, 0)) % challenges.length;

        dailyChallenge = challenges[index];
        
        res.json({
            title: dailyChallenge.title,
            description: dailyChallenge.description,
            difficulty: dailyChallenge.difficulty,
            points: dailyChallenge.points,
            testCases: dailyChallenge.testCases,
            timeLimit: dailyChallenge.timeLimit || 1800 // Include timeLimit in response
        });
    } catch (error) {
        console.error('Error fetching daily challenge:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 