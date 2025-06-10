
# 💻 HackMate - Your All-in-One Hackathon Companion 🚀

Hackathons are rapidly becoming the breeding ground for innovation, collaboration, and 
practical skill development in the tech world. However, participants often face significant challenges in finding the right team, organizing workflows, and staying updated with event milestones. HackMate aims to bridge these gaps by offering an all-in-one platform designed specifically to streamline the hackathon experience. 
HackMate is a dynamic web-based platform that empowers students, developers, and 
innovators to connect, collaborate, and compete effectively in hackathons.


## 🌟 Features

- 🔐 User Authentication & Profile Dashboard
- 💬 Real-Time Chat System (Socket.io)
- 👥 Team Management (Add, Invite, Remove Members)
- 📅 Hackathon Calendar & Event Ticker (Python)
- 🧠 Chaturbot – AI-powered Help & Idea Generator
- 🧩 Daily Coding Challenges & Puzzle Section
- 📍 Hackathon Roadmap Visualization
- 🧑‍💻 Code Editor for Multiple Languages
- ✅ Code Submission & Evaluation
- 🎯 Matchmaking for Hackathon Teams
- 📱 Fully Responsive UI/UX


## 🎯 Objectives

- Facilitate team-based learning and project building
- Automate team formation and project submission
- Keep participants updated with event milestones
- Encourage skill-building through collaborative coding
- Support innovation through smart idea generation


## 🧱 Modules

- Homepage with Hackathon Ticker
- Login / Signup System
- Personalized User Dashboard
- Team Management Panel
- Daily Challenge & Puzzle Hub
- AI Chatbot – Chaturbot
- Real-Time Chat Integration
- Hackathon Calendar & Event Tracker
- Code Editor & Code Submission Flow


## 🛠 Tech Stack

| Layer        | Technologies Used                        |
|--------------|------------------------------------------|
| **Frontend** | HTML, CSS, JavaScript                    |
| **Backend**  | Node.js, Express.js                      |
| **Database** | MongoDB                                  |
| **AI & Scripting** | Python (Ticker, Chatbot: Chaturbot)     |
| **Real-Time** | Socket.io                                |
| **Tools**    | Git, GitHub, VS Code    |



## 🧪 How to Run the Project Locally
Follow these comprehensive steps to get your HackMate project up and running on your local machine. Ensure you follow the order as some components depend on others.

### Prerequisites

Before you begin, ensure you have the following installed:

-   **Node.js**: Version 14 or higher is recommended. You can download it from [nodejs.org](https://nodejs.org/).
-   **npm** or **yarn**: These package managers come with Node.js.
-   **Python 3**: Make sure Python 3 is installed. You can download it from [python.org](https://www.python.org/downloads/).
-   **pip**: Python's package installer, usually comes with Python 3.9*+
-   **MongoDB**: Make sure MongoDB is installed and running on your system. You can find installation instructions on the [MongoDB website](https://www.mongodb.com/try/download/community).

### Installation and Running Locally
#### 1.  Clone the repository: 
   ```bash
    git clone https://github.com/Gunpreet08/HackMate.git
    cd HackMate
   ```

   
#### 2.  Install dependencies for the main project:
  Navigate to the root of your cloned project and install the top-level Node.js dependencies :
   ```bash
    npm install
   ```


#### 3.  Set up environment variables for backend:
  The main backend server (app.js) and other Node.js components might require environment variables. Create a file named `.env` in the `formmongo/server` directory.

    *Example `.env` content (you'll need to fill in actual values based on your `app.js` or server configuration):*
   ```
    MONGODB_URI=mongodb://localhost:27017/your_database_name
    PORT=5000
    # Add any other environment variables your server uses, e.g., API keys, etc.
   ```


#### 4.  Start the Main Backend server (Node.js):
  This is the primary backend for the application. Navigate to the backend server directory and start the application. Note that `nodemon` is used here, which is listed as a dependency in `package.json` for `formmongo/server`.
   ```bash
    cd formmongo/server
    npm install # Ensure all backend Node.js dependencies are installed
    npm run nodemon 
   ```
  The main server should now be running (e.g., on `http://localhost:5000`). Keep this terminal window open.


#### 5. Start the Ticker Server (Python):
  This server fetches hackathon data using an API. Open a **new terminal window** and navigate to the ticker server directory.
   ```bash
    cd formmongo/server/ticker

    # Start the ticker server
    python server.py
   ```
  Keep this terminal window open.


#### 6. Start the Chatbot Server (Python):
  This server handles the chatbot functionality. Open a **new terminal window** and navigate to the chatbot server directory.

   ```bash
    cd formmongo/server/public/dashboardfull

    # Start the chatbot server
    python main.py
   ```
  Keep this terminal window open.


#### 7. Start the Code Editor Server (Node.js):
  This server is for the code editor functionality. Open a **new terminal window** and navigate to the code editor directory.

   ```bash
    cd formmongo/server/public/code editor
    npm install body-parser compilex express 

    # Start the code editor server using nodemon
    nodemon Api.js
   ```
  Keep this terminal window open.


#### 8. Access the Admin Panel:
  Once the main backend server (step 4) is running, you can access the admin panel:

  a.  Open your web browser and first go to: `http://localhost:5000/make-me-admin`

  b.  **Without closing the tab from step (a)**, open a **new tab** in the same browser and go to: `http://localhost:5000/admin/admin.html`


#### 9.  Access the frontend:
  You can open `indexpink.html` directly in your web browser. Ensure your backend server is running for full functionality.



## 💡 Future Scope
 
🔗 GitHub integration for code collaboration

📹 In-platform video calling

🏆 Leaderboards and rewards system

📊 AI-powered team matchmaking

📱 Mobile app development

☁️ Cloud deployment with analytics

📈 Real-time team stats and project insights

📋 Integrated task boards and whiteboards

🏅 Gamification (XP, streaks, badges)



## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 🏷 Topics/Tags

```bash
hackathons  fullstack  nodejs  mongodb  socket.io  webapp  ai-chatbot  team-collab  hackmate
```

  
## 📬 Contact
 
📧 Email: gunkaur0827@gmail.com