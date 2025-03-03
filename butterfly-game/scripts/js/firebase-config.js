// TODO: Replace with your Firebase project details from the Firebase console

// Add error handling for local development
try {
  // Check if Firebase is available
  if (typeof firebase !== 'undefined') {
    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyDwz3U_tBumdOcz8X2c_i0WfbM2t05HyUk",
      authDomain: "game-high-score-1c024.firebaseapp.com",
      databaseURL: "https://game-high-score-1c024-default-rtdb.firebaseio.com",
      projectId: "game-high-score-1c024",
      storageBucket: "game-high-score-1c024.firebasestorage.app",
      messagingSenderId: "626646580015",
      appId: "1:626646580015:web:dbe4850789c30878a67fda",
      measurementId: "G-B7XFKW5HMB"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    const database = firebase.database();
    
    console.log("Firebase initialized successfully");
    
    // Make database available globally
    window.firebaseDatabase = database;
  } else {
    console.warn("Firebase SDK not available - running in offline mode");
    window.firebaseDatabase = null;
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
  // Create a mock database object for offline mode
  window.firebaseDatabase = null;
}