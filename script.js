// Database integration (FireBase)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
// If you want analytics (optional)
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-analytics.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDsWK2456m7pYvA_BCtLn09SSNOAOmSc44",
  authDomain: "solargame-4c45b.firebaseapp.com",
  projectId: "solargame-4c45b",
  storageBucket: "solargame-4c45b.firebasestorage.app",
  messagingSenderId: "636783831230",
  appId: "1:636783831230:web:f9cbfada1f7a8145e596ef",
  measurementId: "G-XJ2ERV6143"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app); // optional


// =========================
// Element References
// =========================
const mainMenu = document.getElementById('main-menu');
const menuStart = document.getElementById('menu-start');
const menuDifficulty = document.getElementById('menu-difficulty');
const menuSettings = document.getElementById('menu-settings');
const difficultyMenu = document.getElementById('difficulty-menu');
const gameBoard = document.getElementById('game-board');
const timerDisplay = document.getElementById('timer');
const matchModal = document.getElementById('match-modal');
const modalText = document.getElementById('modal-text');
const menuContainer = document.getElementById('menu-container');
const playAgainButton = document.getElementById('play-again-button');
const nameModal = document.getElementById('name-modal');
const nameSubmitButton = document.getElementById('name-submit-button');
const playerNameInput = document.getElementById('player-name');
const backMenuButton = document.getElementById('back-menu-button');


// Difficulty Menu Elements
const diffEasy = document.getElementById('difficulty-easy');
const diffHard = document.getElementById('difficulty-hard');
const diffMonkey = document.getElementById('difficulty-monkey');
const difficultyMessage = document.getElementById('difficulty-message');

// =========================
// Global Variables & Settings
// =========================

// Array of card image filenames
const cardValues = ['sun.jpg', 'earth.jpg', 'neptune.jpg', 'mercury.jpg','venus.jpg'
];
let cards = cardValues.concat(cardValues);

// Ask the player for name input
let playerName = "";


// Difficulty settings
const difficultySettings = {
  easy: {
    previewTime: 3000,    // 5 seconds preview
    totalTime: 60000,     // 60 seconds total game time
    pointsPerMatch: 50,
    mismatchPenalty: 0,
    allowedMismatches: Infinity
  },
  hard: {
    previewTime: 3000,    // 3 seconds preview
    totalTime: 45000,     // 45 seconds total game time
    pointsPerMatch: 70,
    mismatchPenalty: -5,
    allowedMismatches: 3
  },
  monkey: {
    previewTime: 1000,    // 1 second preview
    totalTime: 30000,     // 30 seconds total game time
    pointsPerMatch: 100,
    mismatchPenalty: -20,
    allowedMismatches: 1
  }
};

let currentDifficulty = difficultySettings.easy;
const humorousMessages = {
  'earth.jpg': "Earth: The blue gem where every match is out of this world!",
  'venus.jpg': "Venus: Radiant and enchanting—your allure shines brighter than the morning star!",
  'sun.jpg': "Sun: Blazing hot! Your matching skills are on fire!",
  'mercury.jpg': "Mercury: Quick and elusive, but you caught it in a flash!",
  'neptune.jpg': "Neptune: A quirky match indeed—stellar in every way!"
};
// Add difficulty descriptions
const difficultyDescriptions = {
  easy: "Easy: 60 seconds total game time, 5-second preview (cards are initially face-up), and unlimited mistakes allowed.",
  hard: "Hard: 45 seconds total game time, 3-second preview, and only 3 mistakes allowed (each mistake incurs a -5 point penalty).",
  monkey: "Monkey: 30 seconds total game time, 1-second preview, and only 1 mistake allowed (with a -20 point penalty)."
};

// Game state variables
let timeLeft = 30;
let timerInterval = null;
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let failCount = 0;
let score = 0;
let gameStartTime = 0
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = 'Time Left:' + timeLeft + 's';
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endGame("Time's up! Final Score: " + score);
    }
  }, 1000)
}

// =========================
// Helper Functions
// =========================

// Shuffle function (Fisher-Yates algorithm)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Create the game board with cards
function createBoard() {
  gameBoard.innerHTML = '';
  cards = shuffle(cards);
  
  cards.forEach((value) => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.value = value;
    card.dataset.matched = "false";
    
    const cardInner = document.createElement('div');
    cardInner.classList.add('card-inner');
    
    // Front side: Image
    const cardFront = document.createElement('div');
    cardFront.classList.add('card-front');
    const img = document.createElement('img');
    img.src = 'images/' + value;
    img.alt = 'Card image';
    cardFront.appendChild(img);
    
    // Back side: Text
    const cardBack = document.createElement('div');
    cardBack.classList.add('card-back');
    //cardBack.textContent = 'Match me';
    
    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    card.appendChild(cardInner);
    
    card.classList.add('flipped'); // Preview state
    card.classList.add('shuffle')
    setTimeout(() => {
      card.classList.remove('shuffle');
    }, 800);
    card.addEventListener('click', () => flipCard(card));
    gameBoard.appendChild(card);
  });
}

// Handle card flipping
function flipCard(card) {
  if (lockBoard) return;
  if (card.dataset.matched === "true") return;
  if (card.classList.contains('flipped')) return;
  
  card.classList.add('flipped');
  
  if (!firstCard) {
    firstCard = card;
  } else if (!secondCard) {
    secondCard = card;
    checkForMatch();
  }
}

// Show modal with a custom message
function showModal(message, pauseTimer = false, autoClose = true) {
  if (pauseTimer) {
    clearInterval(timerInterval); // pause the timer if needed
  }
  modalText.textContent = message;
  matchModal.style.display = 'flex';
  
  // If we're not auto-closing (i.e., final overview), show the Play Again button
  if (!autoClose) {
    playAgainButton.style.display = 'block';
  } else {
    playAgainButton.style.display = 'none';
    setTimeout(() => {
      matchModal.style.display = 'none';
      if (pauseTimer) {
        startTimer(); // resume timer after auto-close
      }
    }, 2000);
  }
}

// Check if two selected cards match
function checkForMatch() {
  const isMatch = firstCard.dataset.value === secondCard.dataset.value;
  
  if (isMatch) {
    firstCard.dataset.matched = "true";
    secondCard.dataset.matched = "true";
    score += currentDifficulty.pointsPerMatch;
  
    setTimeout(() => {
      // Check if all non-placeholder cards are matched
      const allCards = document.querySelectorAll('.card:not(.placeholder)');
      let win = true;
      allCards.forEach(card => {
        if (card.dataset.matched !== "true") {
          win = false;
        }
      });
      
      if (win) {
        // Calculate bonus points: 1 second left = 10 points
        const bonusPoints = timeLeft * 10;
        score += bonusPoints;
        endGame("Congratulations, You Won! Bonus Points: " + bonusPoints);
      } else {
        const cardValue = firstCard.dataset.value;
        const message = humorousMessages[cardValue] || "Match found!";
        showModal(message + " (+ " + currentDifficulty.pointsPerMatch + " points)", true);
      }
      
      resetTurn();
    }, 500);
  } else {
    failCount++;
    score += currentDifficulty.mismatchPenalty;
    
    if (failCount >= currentDifficulty.allowedMismatches) {
      setTimeout(() => {
        endGame("Game Over! You made too many mistakes. Final Score: " + score);
      }, 800);
    } else {
      lockBoard = true;
      setTimeout(() => {
        firstCard.classList.remove('flipped');
        secondCard.classList.remove('flipped');
        resetTurn();
      }, 1000);
    }
  }
  console.log("checkForMatch for:", firstCard.dataset.value, secondCard.dataset.value);
}
// Reset selected cards
function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

// End game: disable clicks and display final score
async function endGame(customMessage) {
  clearInterval(timerInterval);
  timerDisplay.style.display = 'none';
  document.querySelectorAll('.card').forEach(card => {
    card.style.pointerEvents = 'none';
  });
  
  // Calculate the time taken in seconds
  let timeTaken = ((Date.now() - gameStartTime) / 1000).toFixed(1);
  
  // Build an overview message including a custom message (if any) plus stats
  let overviewMessage = (customMessage ? customMessage + "\n\n" : "") +
                        "Game Overview:\n" +
                        "Time Taken: " + timeTaken + " seconds\n" +
                        "Number of Mistakes: " + failCount + "\n" +
                        "Final Score: " + score;
  
  //Save the score to Firestore
  try {
    await addDoc(collection(db, "scores"), {
      name: playerName,
      score: score,
      timeTaken: timeTaken,
      difficulty: Object.keys(difficultySettings).find(key => difficultySettings[key] === currentDifficulty),
      timestamp: serverTimestamp()
    });
    console.log("Score saved successfully!");
  } catch (error) {
    console.error("Error saving score: ", error);
  }
  
  
  // Show the modal without auto-closing so that the button appears
  showModal(overviewMessage, false, false);
  playAgainButton.style.display = 'block';    // Hide "Play Again"
  backMenuButton.style.display = 'block';    // Show "Main Menu"

}



// Initialize and reset game
function resetGame() {
  firstCard = null;
  secondCard = null;
  lockBoard = false
  failCount = 0;
  score = 0;
  timeLeft = currentDifficulty.totalTime / 1000;
  timerDisplay.textContent = "Time Left: " + timeLeft + "s";
  timerDisplay.style.display = 'block';
  timerDisplay.classList.add('active-timer');
  createBoard();
  
  // Reset pointer events for all cards
  document.querySelectorAll('.card').forEach(card => {
    card.style.pointerEvents = '';
  });
  
  
  // Show preview for the duration defined by difficulty settings
  setTimeout(() => {
    document.querySelectorAll('.card').forEach(card => {
      if (!card.classList.contains('placeholder')) {
        card.classList.remove('flipped');
      }
    });
  }, currentDifficulty.previewTime);
  
  clearInterval(timerInterval);
  // Record game start time
  gameStartTime = Date.now();  // NEW: Start time tracking
  startTimer(); // Starts the timer using our dedicated function
}

// =========================
// Main Menu Event Listeners
// =========================

// Start Game: hide main menu, show game board, and start game

menuStart.addEventListener('click', () => {
  // Instead of jumping straight to the game, show the name prompt first:
  if (!playerName){
    nameModal.style.display = 'flex';
    playerNameInput.focus();
  } else {
    menuContainer.style.display = 'none';
    gameBoard.style.display = 'grid';
    resetGame();
  }
});



nameSubmitButton.addEventListener('click', () => {
  const enteredName = playerNameInput.value.trim();

  if (enteredName) {
    // Store globally
    playerName = enteredName;
    
    // Hide the name modal
    nameModal.style.display = 'none';
    
    // Now hide the menu container and show the game board
    menuContainer.style.display = 'none'; 
    gameBoard.style.display = 'grid';

    // Finally, start the game
    resetGame();
  } else {
    alert("Please enter a valid name!");
  }
});


// Difficulty: hide main menu and show difficulty menu
menuDifficulty.addEventListener('click', () => {
  menuContainer.style.display = 'none';  // Hide main menu and leaderboard container
  difficultyMenu.style.display = 'flex';   // Show the difficulty menu
});

// =========================
// Difficulty Menu Event Listeners
// =========================

// Set difficulty without alert; show message instead
// Show message on hover

//Easy

diffEasy.addEventListener('mouseenter', () => {
  difficultyMessage.textContent = difficultyDescriptions.easy;
  difficultyMessage.style.opacity = 1;
});
diffEasy.addEventListener('mouseleave', () => {
  difficultyMessage.style.opacity = 0;
});

diffEasy.addEventListener('click', () => {
  currentDifficulty = difficultySettings.easy;
  // Automatically hide difficulty menu and show main menu after a short delay
  setTimeout(() => {
    difficultyMenu.style.display = 'none';
    menuContainer.style.display = 'flex';
    loadLeaderboard();
    // Optionally clear the difficulty message immediately
    difficultyMessage.textContent = "";
    difficultyMessage.style.opacity = 0;
  }, 100);
});

//Hard

diffHard.addEventListener('mouseenter', () => {
  difficultyMessage.textContent = difficultyDescriptions.hard;
  difficultyMessage.style.opacity = 1;
});
diffHard.addEventListener('mouseleave', () => {
  difficultyMessage.style.opacity = 0;
});

diffHard.addEventListener('click', () => {
  currentDifficulty = difficultySettings.hard;
  setTimeout(() => {
    difficultyMenu.style.display = 'none';
    menuContainer.style.display = 'flex';
    difficultyMessage.textContent = "";
    difficultyMessage.style.opacity = 0;
  }, 100);
});

//Monkey

diffMonkey.addEventListener('mouseenter', () => {
  difficultyMessage.textContent = difficultyDescriptions.monkey;
  difficultyMessage.style.opacity = 1;
});
diffMonkey.addEventListener('mouseleave', () => {
  difficultyMessage.style.opacity = 0;
});

diffMonkey.addEventListener('click', () => {
  currentDifficulty = difficultySettings.monkey;
  setTimeout(() => {
    difficultyMenu.style.display = 'none';
    menuContainer.style.display = 'flex';
    difficultyMessage.textContent = "";
    difficultyMessage.style.opacity = 0;
  }, 100);
});

function loadLeaderboard() {
  const leaderboardDiv = document.getElementById('leaderboard');
  
  // Clear and re-inject a header
  leaderboardDiv.innerHTML = '<h2>Leaderboard</h2>';
  
  // Fetch top 5 scores in descending order
  const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(5));
  
  getDocs(q)
    .then((querySnapshot) => {
      let rank = 1;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // For example: data = { name: "Alice", score: 300, ... }
        const entry = document.createElement('p');
        entry.textContent = `${rank}. ${data.name} - ${data.score}`;
        leaderboardDiv.appendChild(entry);
        rank++;
      });
    })
    .catch((error) => {
      console.error("Error fetching leaderboard: ", error);
      leaderboardDiv.innerHTML += "<p>Error loading leaderboard.</p>";
    });
}


// Play again button
playAgainButton.addEventListener('click', () => {
  matchModal.style.display = 'none';
  // Optionally, reset the game state and start a new game
  backMenuButton.style.display = 'none'
  resetGame();
});

// Main menu utton
backMenuButton.addEventListener('click', ()=>{
  matchModal.style.display = 'none';
  gameBoard.style.display = 'none';
  menuContainer.style.display = 'flex';
  backMenuButton.style.display = 'none'
  loadLeaderboard();
});
