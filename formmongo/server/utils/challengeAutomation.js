const cron = require('node-cron');
const Challenge = require('../models/Challenge');
const predefinedChallenges = require('../data/predefinedChallenges');

// Keep track of used challenges for fallback
let usedChallenges = new Set();

// Function to select a random predefined challenge
function selectRandomChallenge() {
    if (usedChallenges.size >= predefinedChallenges.length) {
        usedChallenges.clear();
    }

    const availableChallenges = predefinedChallenges.filter(
        challenge => !usedChallenges.has(challenge.title)
    );

    const selectedChallenge = availableChallenges[
        Math.floor(Math.random() * availableChallenges.length)
    ];

    usedChallenges.add(selectedChallenge.title);
    return selectedChallenge;
}

// Function to publish daily challenge
async function publishDailyChallenge() {
    try {
        // Delete previous daily challenges
        await Challenge.deleteMany({});

        // Select and publish new challenge
        const newChallenge = selectRandomChallenge();
        const challenge = new Challenge({
            ...newChallenge,
            isDaily: true,
            timeLimit: newChallenge.timeLimit || 1800 // Ensure timeLimit is included
        });
        await challenge.save();

        console.log(`New challenge published: ${newChallenge.title} with time limit: ${challenge.timeLimit} seconds`);
    } catch (error) {
        console.error('Error publishing daily challenge:', error);
    }
}

// Schedule daily challenge update
function initializeDailyChallengeScheduler() {
    // Publish first challenge immediately
    publishDailyChallenge();

    // Schedule next challenges
    cron.schedule('0 0 * * *', () => {  // Schedule next challenges to run at midnight (00:00) UTC
    // cron.schedule('*/1 * * * *', () => {
        publishDailyChallenge();
    });
}

module.exports = { initializeDailyChallengeScheduler };