const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing
const cors = require('cors');
const session = require('express-session'); // Add session support
const Challenge = require('./models/Challenge');
const Submission = require('./models/Submission');
const User = require('./models/User');
const dailyChallengeRoutes = require('./routes/dailyChallenge');
const challengeRoutes = require('./routes/challengeRoutes');
const app = express();
const { initializeDailyChallengeScheduler } = require('./utils/challengeAutomation');
const { executeCode } = require('./utils/codeExecutor'); // ✅ use the good one


// ====== MOVE MIDDLEWARE TO THE TOP ======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// ====== SESSION AND DEBUG MIDDLEWARE ======
app.use(session({
    secret: 'your_secret_key',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// Debug middleware
app.use((req, res, next) => {
    console.log('Request Debug:', {
        url: req.url,
        method: req.method,
        sessionID: req.sessionID,
        authenticated: req.session?.authenticated,
        userId: req.session?.userId
    });
    next();
});
// Use the daily challenge routes
// app.use('/', dailyChallengeRoutes);
app.use('/api', challengeRoutes);

// Update the /api/run-tests endpoint
app.post('/api/run-tests', async (req, res) => {
    try {
                const { code, language, challengeId } = req.body;
                
                if (!challengeId) {
                    return res.status(400).json({ error: 'Challenge ID is required' });
                }
        
                // Fetch the actual challenge from the database
                const challenge = await Challenge.findById(challengeId);
                if (!challenge) {
                    return res.status(404).json({ error: `Challenge not found with ID: ${challengeId}` });
                }
        
                const results = await Promise.all(
                    challenge.testCases.filter(testCase => !testCase.isHidden).map(async (testCase) => {
                        try {
                            const result = await executeCode(code, language, testCase.input);
                            
                            // Clean up the output and expected values
                            const output = (result.output || '').toString().trim();
                            const expected = testCase.expectedOutput.toString().trim();
                            const passed = output === expected;
                            
                            return {
                                input: testCase.input,
                                expected: expected,
                                output: output,
                                passed: passed,
                                error: result.error || null,
                                explanation: testCase.explanation
                            };
                        } catch (error) {
                            return {
                                input: testCase.input,
                                expected: testCase.expectedOutput,
                                output: '',
                                passed: false,
                                error: error.message,
                                explanation: testCase.explanation
                            };
                        }
                    })
                );
        
                if (results.length === 0) {
                    return res.status(400).json({ error: 'No test cases available for this challenge' });
                }
        
                res.json(results);
            } catch (error) {
                console.error('Error running tests:', error);
                res.status(500).json({ error: error.message || 'Failed to run tests' });
            }
        });
//     try {
//         const { code, language, challengeId } = req.body;
        
//         // Fetch the actual challenge from the database
//         const challenge = await Challenge.findById(challengeId);
//         if (!challenge) {
//             return res.status(404).json({ error: 'Challenge not found' });
//         }

//         const results = await Promise.all(
//             challenge.testCases.filter(test => !test.isHidden).map(async test => {
//                 const startTime = Date.now();
//                 try {
//                     const result = await executeCode(code, language, test.input);
//                     const executionTime = Date.now() - startTime;
                    
//                     // Clean up the output (remove any trailing newlines)
//                     const cleanOutput = (result.output || '').trim();
//                     const cleanExpected = test.expectedOutput.trim();
                    
//                     return {
//                         passed: cleanOutput === cleanExpected,
//                         input: test.input,
//                         expected: cleanExpected,
//                         output: cleanOutput,
//                         executionTime,
//                         error: result.error,
//                         explanation: test.explanation
//                     };
//                 } catch (error) {
//                     return {
//                         passed: false,
//                         input: test.input,
//                         expected: test.expectedOutput,
//                         output: '',
//                         executionTime: Date.now() - startTime,
//                         error: error.message,
//                         explanation: test.explanation
//                     };
//                 }
//             })
//         );

//         res.json(results);
//     } catch (error) {
//         console.error('Error running tests:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// ====== ROUTES ======

// DEV ONLY: Make current session admin
app.get('/make-me-admin', (req, res) => {
    req.session.isAdmin = true;
    res.send('You are now admin for this session!');
});


// --- ADMIN PANEL ENDPOINTS ---
// Middleware for admin check
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin === true) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden: Admins only' });
}

// Get all users (admin only)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'fullName email username techStack projectInterests');
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// Get all teams (admin only)
app.get('/api/admin/teams', requireAdmin, async (req, res) => {
    try {
        const teams = await Team.find({}).populate('members', 'fullName username email');
        res.json({ success: true, teams });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch teams' });
    }
});

// Admin: Create a new hackathon
app.post('/api/admin/hackathons', requireAdmin, async (req, res) => {
    try {
        const { name, startDate, endDate, url } = req.body;
        if (!name || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Name, start date, and end date are required.' });
        }
        const hackathon = new Hackathon({
            name,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            url
        });
        await hackathon.save();
        res.json({ success: true, hackathon });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create hackathon', error: error.message });
    }
});

// Public: Get all hackathons
const axios = require('axios');

app.get('/api/hackathons', async (req, res) => {
    try {
        // Fetch admin-created hackathons from DB
        const dbHackathons = await Hackathon.find().sort({ startDate: 1 });
        const mappedDbHackathons = dbHackathons.map(h => ({
            ...h.toObject(),
            start_date: h.startDate,
            end_date: h.endDate,
            event_status: h.event_status || undefined, // preserve if exists
            url: h.url,
            name: h.name
        }));

        // Fetch API hackathons from Flask server
        let apiHackathons = [];
        try {
            const flaskRes = await axios.get('http://127.0.0.1:5000/api/hackathons');
            apiHackathons = flaskRes.data;
        } catch (err) {
            console.error('Error fetching from Flask:', err.message);
        }

        // Merge both lists
        const allHackathons = [...mappedDbHackathons, ...apiHackathons];
        res.json(allHackathons);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch hackathons' });
    }
});

// --- ADMIN CHALLENGE MANAGEMENT ENDPOINTS ---
// List all challenges
app.get('/api/admin/challenges', requireAdmin, async (req, res) => {
    try {
        const challenges = await Challenge.find().sort({ datePosted: -1 });
        res.json(challenges);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch challenges' });
    }
});

// Create a new challenge
app.post('/api/admin/challenges', requireAdmin, async (req, res) => {
    try {
        const { title, description, difficulty, points, testCases, sampleCode, timeLimit, executionTimeLimit, memoryLimit, isDaily } = req.body;
        if (!title || !description || !difficulty || !points) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }
        const challenge = new Challenge({
            title, description, difficulty, points, testCases, sampleCode, timeLimit, executionTimeLimit, memoryLimit, isDaily
        });
        await challenge.save();
        res.json({ success: true, challenge });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create challenge' });
    }
});

// Delete a challenge by ID
app.delete('/api/admin/challenges/:id', requireAdmin, async (req, res) => {
    try {
        const challengeId = req.params.id;
        const deleted = await Challenge.findByIdAndDelete(challengeId);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Challenge not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete challenge' });
    }
});

// Delete a hackathon by ID (admin only)
app.delete('/api/admin/hackathons/:id', requireAdmin, async (req, res) => {
    try {
        const hackathonId = req.params.id;
        const deleted = await Hackathon.findByIdAndDelete(hackathonId);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Hackathon not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete hackathon' });
    }
});

// Delete a team by ID (admin only)
app.delete('/api/admin/teams/:id', requireAdmin, async (req, res) => {
    try {
        const teamId = req.params.id;
        await Team.findByIdAndDelete(teamId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete team' });
    }
});

// Delete a user by ID (admin only)
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        await User.findByIdAndDelete(userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});
// --- END ADMIN PANEL ENDPOINTS ---
app.get('/api/test', (req, res) => res.send('API is working!'));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/form.html');
});

// Connect to MongoDB - Use single database
mongoose.connect('mongodb://localhost:27017/hackmateDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

initializeDailyChallengeScheduler();

const Schema = mongoose.Schema;

// User Schema
const userSchema = new Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    techStack: { type: [String], required: true },
    projectInterests: { type: [String], required: true },
    connections: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    chatRooms: [{ type: Schema.Types.ObjectId, ref: 'ChatRoom' }],
    notifications: [{
        type: { type: String },
        message: String,
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }],
    totalPoints: { type: Number, default: 0 }    
});

//const User = mongoose.model('User', userSchema);
// Connection Request Schema
const connectionRequestSchema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const ConnectionRequest = mongoose.model('ConnectionRequest', connectionRequestSchema);

// Chat Room Schema
const chatRoomSchema = new Schema({
    name: { type: String, required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    type: { type: String, enum: ['direct', 'group'], default: 'direct' },
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now }
});

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

// Message Schema
const messageSchema = new Schema({
    chatRoom: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

const Message = mongoose.model('Message', messageSchema);

// Team Schema
const teamSchema = new Schema({
    name: { type: String, required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

const Team = mongoose.model('Team', teamSchema);

// Team Invitation Schema
const teamInvitationSchema = new Schema({
    team: { type: Schema.Types.ObjectId, ref: 'Team' },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const TeamInvitation = mongoose.model('TeamInvitation', teamInvitationSchema);

// Hackathon Schema
const hackathonSchema = new Schema({
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    url: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const Hackathon = mongoose.model('Hackathon', hackathonSchema);

// const { executeCode } = require('./codeExecutor');
// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`, {
        body: req.body,
        session: req.session,
        userId: req.session?.userId
    });
    next();
});




app.post('/submit', async (req, res) => {
    try {
        console.log(req.body);
        const { fullName, email, username, password, techStack, projectInterests } = req.body;

        // Check if the email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Ensure techStack is an array of strings
        const formattedTechStack = Array.isArray(techStack) 
            ? techStack.map(item => item.trim()).filter(item => item.length > 0)
            : techStack.split(',').map(item => item.trim()).filter(item => item.length > 0);

        // Ensure projectInterests is an array of strings
        const formattedProjectInterests = Array.isArray(projectInterests)
            ? projectInterests.map(item => item.trim()).filter(item => item.length > 0)
            : projectInterests.split(',').map(item => item.trim()).filter(item => item.length > 0);

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            fullName,
            email,
            username,
            password: hashedPassword,
            techStack: formattedTechStack,
            projectInterests: formattedProjectInterests,
        });

        await newUser.save();
        res.json({ success: true, message: 'Form submitted successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error. Please try again." });
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        req.session.userId = user._id;
        req.session.authenticated = true;
        
        await new Promise((resolve, reject) => {
            req.session.save(err => {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ 
            success: true, 
            message: "Login successful",
            redirect: '/public/dashboardfull/dashboard.html'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Dashboard route
app.get('/dashboard', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "No session found" });
        }

        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            techStack: user.techStack || [],
            projectInterests: user.projectInterests || []
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ success: false, message: "Failed to logout" });
        }
        res.json({ success: true, message: "Logged out successfully" });
    });
});

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already exists. Please login." });
        }

        // Hash password and save new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });

        await newUser.save();
        res.json({ success: true, message: "Signup successful! You can now log in." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error. Please try again." });
    }
});

app.get('/check-email', async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.json({ success: false, message: "Email is required." });
    }
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return res.json({ success: false, message: "Email already exists. Please login." });
    } else {
        return res.json({ success: true });
    }
});

// Add hackathons API endpoint


// Add endpoint to get existing chat room
app.get('/api/chat-room/:userId', async (req, res) => {
    try {
        const currentUserId = req.session.userId;
        const otherUserId = req.params.userId;

        // Find chat room between these users
        const chatRoom = await ChatRoom.findOne({
            participants: { 
                $all: [currentUserId, otherUserId] 
            }
        });

        if (!chatRoom) {
            return res.status(404).json({
                success: false,
                message: 'Chat room not found'
            });
        }

        // Get other user's info
        const otherUser = await User.findById(otherUserId, 'fullName');

        res.json({
            success: true,
            chatRoomId: chatRoom._id,
            otherUserName: otherUser.fullName
        });
    } catch (error) {
        console.error('Error finding chat room:', error);
        res.status(500).json({
            success: false,
            message: 'Error finding chat room'
        });
    }
});

// Modify find-matches endpoint to include connection status and chat room info
app.get('/api/find-matches', async (req, res) => {
    try {
        const currentUserId = req.session.userId;
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        // Get current user's data
        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Find all other users
        const potentialMatches = await User.find({
            _id: { $ne: currentUserId }
        });

        // Get chat rooms for connected users
        const chatRooms = await ChatRoom.find({
            participants: currentUserId
        });

        const chatRoomMap = new Map();
        chatRooms.forEach(room => {
            const otherUserId = room.participants.find(p => p.toString() !== currentUserId);
            if (otherUserId) {
                chatRoomMap.set(otherUserId.toString(), room._id);
            }
        });

         // Process matches
         const matches = await Promise.all(potentialMatches.map(async user => {
            const isConnected = currentUser.connections.includes(user._id);
            const chatRoomId = chatRoomMap.get(user._id.toString());

            return {
                userId: user._id,
                fullName: user.fullName,
                techStack: user.techStack || [],
                projectInterests: user.projectInterests || [],
                isConnected: isConnected,
                chatRoomId: chatRoomId
            };
        }));

        res.json({ success: true, matches });
    } catch (error) {
        console.error('Error finding matches:', error);
        res.status(500).json({ success: false, message: 'Error finding matches' });
    }
});   


    app.post('/api/send-connection-request', async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = req.session?.userId;

        console.log('Connection request details:', {
            currentUserId,
            targetUserId,
            sessionData: req.session
        });

        if (!currentUserId) {
            console.log('Authentication failed - no currentUserId in session');
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated. Please log in again.' 
            });
        }

        if (!targetUserId) {
            console.log('Missing targetUserId in request');
            return res.status(400).json({ 
                success: false, 
                message: 'Target user ID is required' 
            });
        }

        // Check if users exist
        const [currentUser, targetUser] = await Promise.all([
            User.findById(currentUserId),
            User.findById(targetUserId)
        ]);

        console.log('User lookup results:', {
            currentUserFound: !!currentUser,
            targetUserFound: !!targetUser
        });

        if (!currentUser || !targetUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'One or both users not found' 
            });
        }

        // Check if users are already connected
        if (currentUser.connections.includes(targetUserId)) {
            console.log('Users are already connected');
            return res.status(400).json({
                success: false,
                message: 'Users are already connected'
            });
        }

        // Check if connection request already exists
        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                { sender: currentUserId, receiver: targetUserId },
                { sender: targetUserId, receiver: currentUserId }
            ],
            status: 'pending'
        });

        console.log('Existing request check:', {
            exists: !!existingRequest,
            requestId: existingRequest?._id
        });

        if (existingRequest) {
            return res.status(400).json({ 
                success: false, 
                message: 'Request sent once, please wait for response' 
            });
        }

        // Create new connection request
        const connectionRequest = new ConnectionRequest({
            sender: currentUserId,
            receiver: targetUserId,
            status: 'pending'
        });

        await connectionRequest.save();
        console.log('New connection request created:', connectionRequest._id);

        // Add notification for receiver
        if (!Array.isArray(targetUser.notifications)) {
            targetUser.notifications = [];
        }

        // Add notification for receiver
        targetUser.notifications.push({
            type: 'connection_request',
            message: `You have a new connection request from ${currentUser.fullName}`,
            read: false
        });
        await targetUser.save();
        console.log('Notification added to target user');

        res.json({ 
            success: true, 
            message: 'Connection request sent successfully',
            requestId: connectionRequest._id
        });
    } catch (error) {
        console.error('Error sending connection request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error sending connection request: ' + error.message 
        });
    }
});

// Add endpoint for sending messages
app.post('/api/send-message', async (req, res) => {
    try {
        const { chatRoomId, content } = req.body;
        const senderId = req.session.userId;

        const message = new Message({
            chatRoom: chatRoomId,
            sender: senderId,
            content: content
        });

        await message.save();

        // Update chat room's last activity
        await ChatRoom.findByIdAndUpdate(chatRoomId, {
            lastActivity: new Date()
        });

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Error sending message' });
    }
});

// Add endpoint to get chat messages
app.get('/api/chat-messages/:chatRoomId', async (req, res) => {
    try {
        const { chatRoomId } = req.params;
        const userId = req.session.userId;

        // Verify user is part of the chat room
        const chatRoom = await ChatRoom.findOne({
            _id: chatRoomId,
            participants: userId
        });

        if (!chatRoom) {
            return res.status(403).json({ success: false, message: 'Not authorized to access this chat' });
        }

        const messages = await Message.find({ chatRoom: chatRoomId })
            .populate('sender', 'fullName username')
            .sort({ timestamp: 1 });

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, message: 'Error fetching messages' });
    }
});

// Add pending requests endpoint
app.get('/api/pending-requests', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        // Find all pending requests where current user is the receiver
        const requests = await ConnectionRequest.find({
            receiver: req.session.userId,
            status: 'pending'
        }).populate('sender', 'fullName techStack projectInterests');

        console.log('Found pending requests:', requests); // Debug log

        res.json({ 
            success: true, 
            requests: requests.map(request => ({
                _id: request._id,
                sender: {
                    fullName: request.sender.fullName,
                    techStack: request.sender.techStack || [],
                    projectInterests: request.sender.projectInterests || []
                },
                status: request.status,
                createdAt: request.createdAt
            }))
        });
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching pending requests' 
        });
    }
});

// Add endpoint to get user's connections
app.get('/api/connections', async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId).populate('connections', 'fullName username');
        
        res.json({ success: true, connections: user.connections });
    } catch (error) {
        console.error('Error fetching connections:', error);
        res.status(500).json({ success: false, message: 'Error fetching connections' });
    }
});

app.post('/api/accept-connection-request/:requestId', async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const userId = req.session.userId;
        const action = req.body.action;

        console.log('Processing connection request:', { requestId, userId, action });

        const request = await ConnectionRequest.findById(requestId)
            .populate('sender', 'fullName')
            .populate('receiver', 'fullName');

        if (!request) {
            console.log('Request not found:', requestId);
            return res.status(404).json({ 
                success: false, 
                message: 'Request not found' 
            });
        }

        if (request.receiver._id.toString() !== userId) {
            console.log('Unauthorized request:', { 
                requestReceiver: request.receiver._id, 
                currentUser: userId 
            });
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized to handle this request' 
            });
        }

        if (request.status !== 'pending') {
            console.log('Request already processed:', request.status);
            return res.status(400).json({ 
                success: false, 
                message: 'This request has already been processed' 
            });
        }

        // Update request status
        request.status = action === 'accept' ? 'accepted' : 'rejected';
        await request.save();
        console.log('Request status updated:', request.status);

        if (action === 'accept') {
            // Create a chat room for the accepted connection
            const chatRoom = new ChatRoom({
                name: `Chat between ${request.sender.fullName} and ${request.receiver.fullName}`,
                participants: [request.sender._id, request.receiver._id],
                type: 'direct'
            });
            await chatRoom.save();
            console.log('Chat room created:', chatRoom._id);

            // Add users to each other's connections and add chat room
            await Promise.all([
                User.findByIdAndUpdate(request.sender._id, {
                    $addToSet: { 
                        connections: request.receiver._id,
                        chatRooms: chatRoom._id
                    }
                }),
                User.findByIdAndUpdate(request.receiver._id, {
                    $addToSet: { 
                        connections: request.sender._id,
                        chatRooms: chatRoom._id
                    }
                })
            ]);
            console.log('User connections and chat rooms updated');

            res.json({ 
                success: true, 
                message: 'Connection request accepted',
                userId: request.sender._id,
                userName: request.sender.fullName,
                chatRoomId: chatRoom._id
            });
        } else {
            res.json({ 
                success: true, 
                message: 'Connection request declined' 
            });
        }
    } catch (error) {
        console.error('Error handling connection request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing request' 
        });
    }
});

// Team creation endpoint
app.post('/api/connection-request', async (req, res) => {
    try {
        const { receiverId, requestType, teamName } = req.body;
        const senderId = req.session.userId;

        if (!senderId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        if (requestType === 'team') {
            // Validate team name
            if (!teamName || typeof teamName !== 'string' || teamName.trim().length === 0) {
                return res.status(400).json({ success: false, message: 'Invalid team name' });
            }

            // Check if receiver exists
            const receiver = await User.findById(receiverId);
            if (!receiver) {
                return res.status(404).json({ success: false, message: 'Receiver not found' });
            }

            // Create a new team
            const team = new Team({
                name: teamName.trim(),
                creator: senderId,
                members: [senderId]
            });
            await team.save();

            // Create team invitation
            const invitation = new TeamInvitation({
                team: team._id,
                sender: senderId,
                receiver: receiverId
            });
            await invitation.save();

            // Add notification for receiver (ONLY ONCE)
            await User.findByIdAndUpdate(receiverId, {
                $push: {
                    notifications: {
                        type: 'team_invitation',
                        message: `You have been invited to join team ${teamName}`,
                        teamId: team._id,
                        invitationId: invitation._id,
                        teamName: teamName,
                        read: false
                    }
                }
            });

            res.json({ 
                success: true, 
                message: 'Team invitation sent successfully',
                teamId: team._id
            });
        } else {
            // Handle regular connection request
            const request = new ConnectionRequest({
                sender: senderId,
                receiver: receiverId
            });
            await request.save();

            res.json({ success: true, message: 'Connection request sent successfully' });
        }
    } catch (error) {
        console.error('Error creating team/connection request:', error);
        res.status(500).json({ success: false, message: 'Error creating request: ' + error.message });
    }
});

// Team invitation response endpoint
app.post('/api/team-invitation/:invitationId', async (req, res) => {
    try {
        const { invitationId } = req.params;
        const { action } = req.body;
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }

        // Find the invitation and populate team details
        const invitation = await TeamInvitation.findById(invitationId)
            .populate('team')
            .populate('sender');

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'Invitation not found'
            });
        }

        // Check if the current user is the receiver
        if (invitation.receiver.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to handle this invitation'
            });
        }

        // Check if invitation is still pending
        if (invitation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Invitation has already been processed'
            });
        }

        // Update invitation status
        invitation.status = action === 'accept' ? 'accepted' : 'rejected';
        await invitation.save();

        if (action === 'accept') {
            // Add user to team members
            await Team.findByIdAndUpdate(invitation.team._id, {
                $addToSet: { members: userId }
            });

            // Add notification for team creator
            await User.findByIdAndUpdate(invitation.sender._id, {
                $push: {
                    notifications: {
                        type: 'team_invitation_accepted',
                        message: `Your team invitation for ${invitation.team.name} has been accepted!`,
                        read: false
                    }
                }
            });
        } else if (action === 'reject') {
            // Add notification for team creator when invitation is rejected
            await User.findByIdAndUpdate(invitation.sender._id, {
                $push: {
                    notifications: {
                        type: 'team_invitation_rejected',
                        message: `Your team invitation for ${invitation.team.name} was declined.`,
                        read: false
                    }
                }
            });
        }

        res.json({
            success: true,
            message: `Team invitation ${action}ed successfully`,
            teamName: invitation.team.name
        });

    } catch (error) {
        console.error('Error handling team invitation:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing team invitation'
        });
    }
});

// Add member to team by sending an invitation
app.post('/api/team-invite/add-member', async (req, res) => {
    try {
        const { teamId, userIdentifier } = req.body;
        const senderId = req.session.userId;
        if (!senderId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        if (!teamId || !userIdentifier) {
            return res.status(400).json({ success: false, message: 'Missing teamId or userIdentifier' });
        }
        // Find the user by email or username
        const receiver = await User.findOne({ $or: [ { email: userIdentifier }, { username: userIdentifier } ] });
        if (!receiver) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Check if already a member
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }
        if (team.members.includes(receiver._id)) {
            return res.status(400).json({ success: false, message: 'User is already a team member' });
        }
        // Check if already invited
        const existingInvite = await TeamInvitation.findOne({ team: teamId, receiver: receiver._id, status: 'pending' });
        if (existingInvite) {
            return res.status(400).json({ success: false, message: 'User already has a pending invitation' });
        }
        // Create invitation
        const invitation = new TeamInvitation({
            team: teamId,
            sender: senderId,
            receiver: receiver._id,
            status: 'pending'
        });
        await invitation.save();
        // Add notification for receiver (ONLY ONCE)
        await User.findByIdAndUpdate(receiver._id, {
            $push: {
                notifications: {
                    type: 'team_invitation',
                    message: `You have been invited to join team ${team.name}`,
                    teamId: team._id,
                    invitationId: invitation._id,
                    teamName: team.name,
                    read: false
                }
            }
        });
        res.json({ success: true, message: 'Invitation sent successfully' });
    } catch (error) {
        console.error('Error inviting member to team:', error);
        res.status(500).json({ success: false, message: 'Error inviting member to team: ' + error.message });
    }
});

// Add notifications endpoint
app.get('/api/notifications', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        // Get user with notifications and populate team info
        const user = await User.findById(userId)
            .select('notifications')
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get pending team invitations
        const teamInvitations = await TeamInvitation.find({
            receiver: userId,
            status: 'pending'
        })
        .populate('team', 'name')
        .populate('sender', 'fullName')
        .lean();

        // Get pending connection requests
        const connectionRequests = await ConnectionRequest.find({
            receiver: userId,
            status: 'pending'
        })
        .populate('sender', 'fullName techStack projectInterests')
        .lean();

        // Combine all notifications
        const notifications = [
            ...teamInvitations.map(inv => ({
                id: inv._id,
                type: 'team_invitation',
                message: `${inv.sender.fullName} has invited you to join team ${inv.team.name}`,
                teamId: inv.team._id,
                teamName: inv.team.name,
                sender: inv.sender,
                createdAt: inv.createdAt,
                invitationId: inv._id // Ensure invitationId is present for Accept/Decline
            })),
            ...connectionRequests.map(req => ({
                id: req._id,
                type: 'connection_request',
                message: `${req.sender.fullName} wants to connect with you`,
                sender: req.sender,
                createdAt: req.createdAt
            })),
            ...(user.notifications || []).map(notif => ({
                ...notif,
                id: notif._id,
                invitationId: notif.type === 'team_invitation' && notif.invitationId ? notif.invitationId : undefined
            }))
        ].sort((a, b) => b.createdAt - a.createdAt);

        res.json({
            success: true,
            notifications
        });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications: ' + error.message
        });
    }
});

// Mark notification as read
app.post('/api/notifications/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        await User.updateOne(
            { _id: userId, 'notifications._id': notificationId },
            { $set: { 'notifications.$.read': true } }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking notification as read: ' + error.message
        });
    }
});

// Create team and send invitation
app.post('/api/connection-request', async (req, res) => {
    try {
        const { receiverId, requestType, teamName } = req.body;
        const senderId = req.session.userId;

        if (!senderId) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        if (!receiverId || !requestType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: 'Receiver not found'
            });
        }

        if (requestType === 'team') {
            if (!teamName || typeof teamName !== 'string' || teamName.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid team name'
                });
            }

            // Create new team
            const team = new Team({
                name: teamName.trim(),
                creator: senderId,
                members: [senderId] // Creator is the first member
            });
            await team.save();

            // Create team invitation
            const invitation = new TeamInvitation({
                team: team._id,
                sender: senderId,
                receiver: receiverId,
                status: 'pending'
            });
            await invitation.save();

            // Add notification for the receiver
            await User.findByIdAndUpdate(receiverId, {
                $push: {
                    notifications: {
                        type: 'team_invitation',
                        message: `You have been invited to join team ${teamName}`,
                        read: false,
                        teamId: team._id,
                        teamName: teamName,
                        senderId: senderId,
                        invitationId: invitation._id // Always include invitationId
                    }
                }
            });

            res.json({
                success: true,
                message: 'Team created and invitation sent',
                teamId: team._id
            });
        } else if (requestType === 'connection') {
            // Handle connection request
            const existingRequest = await ConnectionRequest.findOne({
                sender: senderId,
                receiver: receiverId,
                status: 'pending'
            });

            if (existingRequest) {
                return res.status(400).json({
                    success: false,
                    message: 'Connection request already pending'
                });
            }

            const request = new ConnectionRequest({
                sender: senderId,
                receiver: receiverId
            });
            await request.save();

            // Add notification for the receiver
            await User.findByIdAndUpdate(receiverId, {
                $push: {
                    notifications: {
                        type: 'connection_request',
                        message: 'New connection request',
                        read: false,
                        requestId: request._id,
                        senderId: senderId
                    }
                }
            });

            res.json({
                success: true,
                message: 'Connection request sent'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid request type'
            });
        }
    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating request: ' + error.message
        });
    }
});

// Get notifications endpoint
app.get('/api/notifications', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        // Get user with notifications
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get unread notifications
        const notifications = user.notifications.map(notification => ({
            id: notification._id,
            type: notification.type,
            message: notification.message,
            read: notification.read,
            createdAt: notification.createdAt,
            teamId: notification.teamId,
            teamName: notification.teamName,
            senderId: notification.senderId,
            requestId: notification.requestId
        }));

        res.json({
            success: true,
            notifications
        });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications: ' + error.message
        });
    }
});

// Delete notification by ID
app.delete('/api/notifications/:notificationId', async (req, res) => {
    try {
        const userId = req.session.userId;
        const { notificationId } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        // Remove the notification from the user's notifications array
        const result = await User.updateOne(
            { _id: userId },
            { $pull: { notifications: { _id: notificationId } } }
        );
        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ success: false, message: 'Error deleting notification: ' + error.message });
    }
});

// Get all teams for the logged-in user
app.get('/api/my-teams', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        const teams = await Team.find({ members: userId })
            .populate('members', 'fullName username email')
            .lean();
        res.json({ success: true, teams });
    } catch (error) {
        console.error('Error fetching user teams:', error);
        res.status(500).json({ success: false, message: 'Error fetching teams' });
    }
});

// Leave Team Endpoint
app.post('/api/leave-team', async (req, res) => {
    try {
        const userId = req.session.userId;
        const { teamId } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        if (!teamId) {
            return res.status(400).json({ success: false, message: 'Missing teamId' });
        }
        // Remove user from team members
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }
        // Only remove if user is a member
        if (!team.members.includes(userId)) {
            return res.status(400).json({ success: false, message: 'User is not a member of the team' });
        }
        team.members = team.members.filter(memberId => memberId.toString() !== userId.toString());
        await team.save();
        res.json({ success: true, message: 'You have left the team.' });
    } catch (error) {
        console.error('Error leaving team:', error);
        res.status(500).json({ success: false, message: 'Error leaving team: ' + error.message });
    }
});



// app.post('/api/submissions', async (req, res) => {
//     try {
//         if (!req.session.userId) {
//             return res.status(401).json({ message: 'Please login first' });
//         }

//         const { code, language, challengeId } = req.body;
        
//         // Get the challenge
//         const challenge = await Challenge.findById(challengeId);
//         if (!challenge) {
//             return res.status(404).json({ message: 'Challenge not found' });
//         }

//         // Create new submission
//         const submission = new Submission({
//             user: req.session.userId,
//             challenge: challengeId,
//             code,
//             language,
//             status: 'Accepted',
//             score: challenge.points
//         });

//         await submission.save();

//         // Update user's total points
//         const updatedUser = await User.findByIdAndUpdate(
//             req.session.userId,
//             { $inc: { totalPoints: challenge.points } },
//             { new: true }
//         );

//         res.json({ 
//             success: true, 
//             message: 'Solution submitted successfully',
//             submission,
//             totalPoints: updatedUser.totalPoints
//         });
//     } catch (error) {
//         console.error('Error submitting solution:', error);
//         res.status(500).json({ message: 'Error submitting solution' });
//     }
// });
// app.get('/api/leaderboard', async (req, res) => {
//     try {
//         const leaderboard = await User.find()
//             .select('username totalPoints')
//             .sort('-totalPoints')
//             .limit(10);

//         res.json(leaderboard.map(user => ({
//             username: user.username,
//             points: user.totalPoints || 0
//         })));
//     } catch (error) {
//         console.error('Error fetching leaderboard:', error);
//         res.status(500).json({ message: 'Error fetching leaderboard' });
//     }
// });

// app.get('/api/user/submissions', async (req, res) => {
//     try {
//         if (!req.session.userId) {
//             return res.status(401).json({ message: 'Please login first' });
//         }

//         const submissions = await Submission.find({ user: req.session.userId })
//             .populate('challenge', 'title')
//             .sort('-submittedAt')
//             .limit(10);

//         res.json(submissions.map(sub => ({
//             challengeTitle: sub.challenge?.title || 'Unknown Challenge',
//             status: sub.status,
//             language: sub.language,
//             score: sub.score,
//             submittedAt: sub.submittedAt
//         })));
//     } catch (error) {
//         console.error('Error fetching submissions:', error);
//         res.status(500).json({ message: 'Error fetching submissions' });
//     }
// });

// Daily Challenge endpoint
app.get('/api/daily-challenge', async (req, res) => {
    try {
        // Get today's date in UTC
        const today = new Date();
        const dateString = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
        
        // Get all challenges
        const challenges = await Challenge.find();
        
        if (!challenges || challenges.length === 0) {
            console.error('No challenges found in database');
            return res.status(404).json({ error: 'No challenges found' });
        }

        // Use the date string to generate a deterministic index
        const index = Math.abs(dateString.split('').reduce((acc, char) => {
            return acc + char.charCodeAt(0);
        }, 0)) % challenges.length;

        const dailyChallenge = challenges[index];
        console.log('Selected daily challenge:', dailyChallenge.title);
        
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

app.post('/run-code', async (req, res) => {
  const { code, language, input } = req.body;

  try {
    const result = await executeCode(code, language, input);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.json({ output: result.output });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Update profile route
app.post('/update-profile', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "No session found" });
        }

        const { fullName, username, email, techStack, projectInterests } = req.body;

        // Check if username is already taken by another user
        const existingUser = await User.findOne({ 
            username: username,
            _id: { $ne: req.session.userId }
        });

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "Username is already taken" 
            });
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            req.session.userId,
            {
                fullName,
                username,
                email,
                techStack,
                projectInterests
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                fullName: updatedUser.fullName,
                username: updatedUser.username,
                email: updatedUser.email,
                techStack: updatedUser.techStack,
                projectInterests: updatedUser.projectInterests
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Server error while updating profile" 
        });
    }
});

// app.post('/api/run-tests', async (req, res) => {
//   const { code, language, customInput } = req.body;

//   try {
//     const result = await executeCode(code, language, customInput || "");
//     if (result.error) {
//       return res.status(400).json({ error: result.error });
//     }

//     res.json({ output: result.output });
//   } catch (err) {
//     console.error('Error executing code:', err);
//     res.status(500).json({ error: 'Server error during code execution' });
//   }
// });




const port = 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

