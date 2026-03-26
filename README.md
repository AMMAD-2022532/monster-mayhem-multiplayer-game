# Monster Mayhem Multiplayer Game 🎮

Monster Mayhem is a real-time multiplayer board game developed as part of a Concurrent Systems assignment. The project is built using JavaScript, Node.js, Express, Socket.IO, HTML, and CSS.

In this game, up to 4 players join and compete on a shared board. Each player controls monsters and takes turns to strategically place, move, and attack opponents until only one player remains.

## Project Overview

The game is played on a 10x10 board.

Each player is assigned a specific edge:
- Player 1 → Top
- Player 2 → Right
- Player 3 → Bottom
- Player 4 → Left

Each player can place up to 10 monsters only on their assigned edge.

After placement, players take turns to move their monsters and attack others.

## Monster Types

There are 3 types of monsters:
- Vampire
- Werewolf
- Ghost

### Battle Rules

- Vampire defeats Werewolf
- Werewolf defeats Ghost
- Ghost defeats Vampire
- Same monster types → both are removed

## Features

- 4-player multiplayer gameplay
- Real-time communication using Socket.IO
- Turn-based system
- 10x10 interactive board
- Edge-based monster placement
- Monster movement and attack system
- Combat logic based on monster types
- Player elimination system
- Winner detection
- Game restart functionality
- Player statistics (wins, losses, total games)
- Interactive UI with modals and live updates

## Technologies Used

- JavaScript
- Node.js
- Express
- Socket.IO
- async-mutex
- HTML
- CSS

## Project Structure

monster-mayhem-multiplayer-game/
│── monsterServer.js
│── package.json
│── package-lock.json
│── public/
│   │── index.html
│   │── monsterClient.js
│   │── styles.css
│── README.md

## How to Run the Project

1. Clone the repository:
   git clone <your-repository-link>

2. Open the project folder:
   cd monster-mayhem-multiplayer-game

3. Install dependencies:
   npm install

4. Start the server:
   npm start

5. Open browser and go to:
   http://localhost:3000

## Learning Outcomes

This project helped me to understand:
- Multiplayer game development
- Real-time client-server communication
- Concurrency handling in Node.js
- Turn-based game logic
- Frontend and backend integration

## Author

Ammad Hussain  
Student at CCT College Dublin  

## Note

This project was developed as part of a college assignment for learning purposes.
