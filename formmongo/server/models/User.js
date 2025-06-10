const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    techStack: { type: [String], required: true },
    projectInterests: { type: [String], required: true },
    totalPoints: { type: Number, default: 0 },
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }]
});

module.exports = mongoose.model('User', userSchema);