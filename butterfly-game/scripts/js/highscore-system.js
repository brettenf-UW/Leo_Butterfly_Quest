/**
 * High Score System for Leo's Butterfly Quest
 * Supports both global (Firebase-based) and local (localStorage-based) high scores
 * 
 * Firebase Integration:
 * - Stores scores in Firebase Realtime Database when online
 * - Loads scores from Firebase when online
 * - Uses localStorage for offline play
 * - Provides real-time updates when scores change
 */

class HighScoreSystem {
    constructor() {
        this.localScores = [];
        this.globalScores = [];
        this.combinedScores = []; // Array for combined scores
        this.lastSubmissionTime = 0;
        this.submissionCooldown = 3000; // 3 seconds between submissions to avoid Firebase write limits
        this.initialized = false;
        this.container = null;
        this.environment = 'local'; // Default value, will be updated in init()
        this.isFirebaseConnected = false;
        this.realtimeUpdateActive = false;
        this.connectedRef = null;
        
        // Bindings
        this.setupRealtimeScoreUpdates = this.setupRealtimeScoreUpdates.bind(this);
    }

    /**
     * Detect if we're running online or locally
     * @return {string} - 'online', 'local', or 'unknown'
     */
    detectEnvironment() {
        try {
            const isGitHubPages = window.location.hostname.includes('github.io');
            const isLocalFile = window.location.protocol === 'file:';
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            if (isGitHubPages) {
                return 'online';
            } else if (isLocalFile || isLocalhost) {
                return 'local';
            } else {
                return 'unknown';
            }
        } catch (e) {
            console.error('Error detecting environment:', e);
            return 'local'; // Default to local if there's an error
        }
    }

    /**
     * Initialize high score system
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // First, detect environment
            this.environment = this.detectEnvironment();
            console.log('Detected environment:', this.environment);
            
            // Check Firebase connection
            if (this.environment === 'online') {
                this.checkFirebaseConnection();
            }
            
            // Load scores based on environment
            await this.loadHighScores();
            
            // Create UI only if it doesn't exist yet
            if (!document.getElementById('high-scores-container')) {
                this.createScoreUI();
            }
            
            // Setup realtime updates if online
            if (this.environment === 'online') {
                this.setupRealtimeScoreUpdates();
            }
            
            this.initialized = true;
            console.log(`High score system initialized in ${this.environment} mode`);
        } catch (e) {
            console.error('Error initializing high score system:', e);
            // Create a simple fallback UI
            this.createFallbackUI();
        }
    }
    
    /**
     * Check if Firebase is connected
     */
    checkFirebaseConnection() {
        try {
            if (!window.firebaseDatabase) {
                console.warn('Firebase database not initialized - running in offline mode');
                this.isFirebaseConnected = false;
                this.environment = 'local'; // Force local mode if Firebase not available
                
                // Update status in UI
                const statusMessage = document.getElementById('status-message');
                if (statusMessage) {
                    statusMessage.innerHTML = 'Running in offline mode <span class="connection-badge disconnected">●</span>';
                }
                return;
            }
            
            // Monitor connection state
            try {
                this.connectedRef = window.firebaseDatabase.ref('.info/connected');
                this.connectedRef.on('value', (snap) => {
                    this.isFirebaseConnected = (snap.val() === true);
                    console.log('Firebase connection state:', this.isFirebaseConnected ? 'Connected' : 'Disconnected');
                    
                    // Update status in UI
                    const statusMessage = document.getElementById('status-message');
                    if (statusMessage) {
                        if (this.isFirebaseConnected) {
                            statusMessage.innerHTML = 'Connected to online leaderboard <span class="connection-badge connected">●</span>';
                        } else {
                            statusMessage.innerHTML = 'Not connected to online leaderboard <span class="connection-badge disconnected">●</span>';
                        }
                    }
                });
            } catch (connectionError) {
                console.warn('Could not monitor Firebase connection - running in offline mode');
                this.isFirebaseConnected = false;
                
                // Update status in UI
                const statusMessage = document.getElementById('status-message');
                if (statusMessage) {
                    statusMessage.innerHTML = 'Running in offline mode <span class="connection-badge disconnected">●</span>';
                }
            }
        } catch (e) {
            console.error('Error checking Firebase connection:', e);
            this.isFirebaseConnected = false;
            this.environment = 'local'; // Force local mode on error
        }
    }

    /**
     * Create a fallback UI in case of errors
     */
    createFallbackUI() {
        // If we already created something, don't recreate
        if (this.container) return;
        
        // Create a simple container
        this.container = document.createElement('div');
        this.container.id = 'high-scores-container';
        this.container.className = 'high-scores-panel';
        this.container.style.display = 'none';
        
        // Simple header with close button
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = '10px';
        
        const title = document.createElement('h2');
        title.textContent = 'High Scores';
        title.style.margin = '0';
        title.style.padding = '0';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = 'white';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', () => {
            this.container.style.display = 'none';
        });
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Simple message
        const message = document.createElement('p');
        message.textContent = 'Local scores are currently available in game. Online scores require internet connection.';
        
        this.container.appendChild(header);
        this.container.appendChild(message);
        
        // Basic styling
        this.container.style.position = 'fixed';
        this.container.style.top = '20px';
        this.container.style.right = '20px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.container.style.color = 'white';
        this.container.style.padding = '20px';
        this.container.style.borderRadius = '10px';
        this.container.style.width = '400px';
        this.container.style.maxWidth = '80vw';
        this.container.style.zIndex = '1000';
        this.container.style.fontFamily = 'Arial, sans-serif';
        
        document.body.appendChild(this.container);
    }

    /**
     * Create high score UI
     */
    createScoreUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'high-scores-container';
        this.container.className = 'high-scores-panel';
        
        // Header with title and close button
        const header = document.createElement('div');
        header.className = 'highscore-header';
        
        const title = document.createElement('h2');
        title.textContent = 'High Scores';
        title.className = 'highscore-title';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;'; // × character
        closeBtn.className = 'close-button';
        closeBtn.title = 'Close high scores';
        closeBtn.addEventListener('click', () => this.toggleDisplay(false));
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Scores display
        const scoresDisplay = document.createElement('div');
        scoresDisplay.id = 'scores-display';
        
        // Create empty score actions div (export/import buttons removed)
        const scoreActions = document.createElement('div');
        scoreActions.id = 'score-actions';
        
        // Status message
        const statusMessage = document.createElement('div');
        statusMessage.id = 'status-message';
        
        // Assemble container
        // Live update indicator
        const liveUpdateIndicator = document.createElement('div');
        liveUpdateIndicator.id = 'live-update-indicator';
        liveUpdateIndicator.className = 'live-update-indicator';
        liveUpdateIndicator.textContent = 'LIVE';
        
        this.container.appendChild(header);
        this.container.appendChild(liveUpdateIndicator);
        this.container.appendChild(scoresDisplay);
        this.container.appendChild(scoreActions);
        this.container.appendChild(statusMessage);
        
        // Add styles
        this.addStyles();
        
        // Hide by default until there's something to show
        this.container.style.display = 'none';
        
        // Add to document
        document.body.appendChild(this.container);
        
        // Show appropriate scores
        this.displayHighScores();
    }

    /**
     * Add CSS styles for high score UI
     */
    addStyles() {
        if (document.getElementById('highscore-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'highscore-styles';
        style.textContent = `
            /* Connection status styles */
            .connection-badge {
                display: inline-block;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                margin-left: 5px;
                vertical-align: middle;
            }
            .connection-badge.connected {
                background-color: #4CAF50;
                box-shadow: 0 0 5px #4CAF50;
            }
            .connection-badge.disconnected {
                background-color: #F44336;
                box-shadow: 0 0 5px #F44336;
            }
            .live-update-indicator {
                position: absolute;
                top: 5px;
                right: 40px;
                font-size: 0.7em;
                padding: 3px 8px;
                background-color: #4CAF50;
                color: white;
                border-radius: 10px;
                animation: pulse 2s infinite;
                opacity: 0.8;
                display: none;
            }
            @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
            }
            /* Modal styles for instructions */
            .modal-background {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 2000;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: Arial, sans-serif;
            }
            .modal-content {
                background: white;
                padding: 25px;
                border-radius: 10px;
                max-width: 500px;
                width: 90%;
                color: #333;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
                max-height: 90vh;
                overflow-y: auto;
            }
            
            /* Responsive modal styles for smaller screens */
            @media (max-width: 600px) {
                .modal-content {
                    padding: 15px;
                    width: 95%;
                    max-height: 95vh;
                }
                
                .modal-content h2 {
                    font-size: 20px;
                    margin-top: 0;
                    margin-bottom: 10px;
                }
                
                .modal-content p, .modal-content ul, .modal-content ol {
                    font-size: 14px;
                    line-height: 1.4;
                    margin-bottom: 10px;
                }
                
                .modal-button {
                    padding: 8px 15px;
                    font-size: 14px;
                }
            }
            .modal-content h2 {
                margin-top: 0;
                border-bottom: 2px solid #0055A4;
                padding-bottom: 10px;
                font-family: Arial, sans-serif;
            }
            .modal-content p, .modal-content ul, .modal-content ol {
                line-height: 1.5;
                margin-bottom: 15px;
                font-family: Arial, sans-serif;
            }
            .modal-content ul, .modal-content ol {
                padding-left: 25px;
            }
            .modal-content li {
                margin-bottom: 8px;
            }
            .modal-buttons {
                display: flex;
                justify-content: flex-end;
                margin-top: 20px;
            }
            .modal-button {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-family: Arial, sans-serif;
                font-size: 16px;
                margin-left: 10px;
            }
            .modal-button.primary {
                background: #0055A4;
                color: white;
            }
            .modal-button.cancel {
                background: #f0f0f0;
                color: #333;
            }
            .warning-box {
                background: #fff9e6;
                border-left: 4px solid #ffc107;
                padding: 10px 15px;
                margin: 15px 0;
                border-radius: 0 5px 5px 0;
            }
            .warning-box p {
                margin: 0;
                color: #856404;
            }
            .info-box {
                background: #e6f7ff;
                border-left: 4px solid #1890ff;
                padding: 10px 15px;
                margin: 15px 0;
                border-radius: 0 5px 5px 0;
            }
            .info-box p {
                margin: 0;
                color: #0c53b7;
            }
            
            /* High scores panel styles - simplified for better compatibility */
            .high-scores-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 15px;
                border-radius: 10px;
                width: 80%;
                max-width: 400px;
                height: auto;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 1000;
                font-family: Arial, sans-serif;
                border: 2px solid #0055A4;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            }
            
            /* Media queries for better mobile experience */
            @media (max-width: 600px) {
                .high-scores-panel {
                    width: 90%;
                    top: 10px;
                    right: 5%;
                    padding: 10px;
                    max-height: 90vh;
                }
                
                .score-divider {
                    margin: 8px 0;
                }
                
                .refresh-button {
                    padding: 6px 10px;
                    margin-bottom: 8px;
                    font-size: 13px;
                }
                
                .highscore-title {
                    font-size: 18px;
                }
                
                #score-actions button {
                    padding: 5px;
                    font-size: 12px;
                }
                
                .score-item {
                    padding: 3px 0;
                    font-size: 13px;
                }
            }
            .highscore-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #555;
                padding-bottom: 8px;
            }
            .highscore-title {
                margin: 0;
                padding: 0;
                font-size: 22px;
                color: #FFC72C;
                font-family: Arial, sans-serif;
            }
            .close-button {
                background: none;
                border: none;
                color: #ccc;
                font-size: 24px;
                cursor: pointer;
                padding: 0 5px;
                margin: 0;
                height: 24px;
                line-height: 24px;
                border-radius: 3px;
            }
            .close-button:hover {
                color: white;
                background: rgba(255, 255, 255, 0.1);
            }
            #scores-display {
                margin: 10px 0;
                font-family: Arial, sans-serif;
                max-height: 350px;
                overflow-y: auto;
                padding-right: 5px;
            }
            .score-section-header {
                padding: 8px 0;
                margin-bottom: 5px;
                font-weight: bold;
                font-size: 14px;
            }
            .score-divider {
                border: 0;
                height: 1px;
                background-image: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0));
                margin: 15px 0;
            }
            .scores-list {
                margin-bottom: 15px;
            }
            .score-item {
                padding: 5px 0;
                border-bottom: 1px solid #444;
                font-family: Arial, sans-serif;
                position: relative;
            }
            .score-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            .score-item .rank {
                display: inline-block;
                width: 25px;
                font-weight: bold;
                color: #FFC72C;
            }
            .score-item .score {
                font-weight: bold;
                color: #0055A4;
            }
            .score-item .name {
                color: white;
            }
            .score-item .date {
                font-size: 0.8em;
                color: #aaa;
                display: block;
                margin-left: 25px;
            }
            .score-item .caught {
                color: #8BC34A;
            }
            .source-badge {
                font-size: 0.8em;
                opacity: 0.8;
            }
            .source-badge.global {
                color: #32CD32;
            }
            .source-badge.local {
                color: #FFA500;
            }
            #score-actions {
                margin-top: 15px;
                display: flex;
                justify-content: space-between;
            }
            #status-message {
                margin-top: 10px;
                font-style: italic;
                font-size: 0.9em;
                color: #aaa;
                font-family: Arial, sans-serif;
                text-align: center;
            }
            .environment-badge {
                font-size: 0.7em;
                padding: 2px 5px;
                border-radius: 3px;
                margin-right: 5px;
                vertical-align: middle;
                font-family: Arial, sans-serif;
                font-weight: bold;
            }
            .badge-online {
                background: #32CD32;
                color: white;
            }
            .badge-local {
                background: #FFA500;
                color: white;
            }
            .refresh-button {
                display: block;
                width: 100%;
                background: #333;
                color: white;
                border: none;
                padding: 8px 15px;
                margin-bottom: 15px;
                cursor: pointer;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                transition: background-color 0.3s;
            }
            .refresh-button:hover {
                background: #444;
            }
            .refresh-button:disabled {
                opacity: 0.7;
                cursor: default;
            }
            .no-scores-message {
                text-align: center;
                padding: 10px;
                margin: 10px 0;
                font-style: italic;
                color: #aaa;
            }
            .no-scores-message p {
                margin: 5px 0;
            }
            .no-scores-message .note {
                font-size: 0.8em;
                color: #888;
                margin-top: 10px;
            }
            .modal-background {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 2000;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: Arial, sans-serif;
            }
            .modal-content {
                background: white;
                padding: 20px;
                border-radius: 10px;
                max-width: 500px;
                color: #333;
                font-family: Arial, sans-serif;
            }
            .modal-title {
                font-size: 1.5em;
                margin-bottom: 15px;
                color: #0055A4;
                font-family: Arial, sans-serif;
            }
            .modal-buttons {
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
            }
            .modal-buttons button {
                background: #0055A4;
                color: white;
                border: none;
                padding: 8px 15px;
                margin-left: 10px;
                cursor: pointer;
                border-radius: 5px;
                font-family: Arial, sans-serif;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Toggle between global and local score tabs
     * @param {string} tab - 'global' or 'local'
     */
    // Removed toggleTab method as we no longer have tabs

    /**
     * Load high scores from appropriate sources
     */
    async loadHighScores() {
        // Always load local scores
        this.loadLocalScores();
        
        // Load global scores if online
        if (this.environment === 'online' || this.environment === 'unknown') {
            try {
                await this.loadGlobalScores();
            } catch (error) {
                console.error('Failed to load global scores:', error);
                this.updateStatus('Could not load global scores. Using local scores only.');
            }
        }
    }
    
    /**
     * Save score to Firebase
     * @param {Object} scoreRecord - Score record to save
     * @returns {Promise<boolean>} - Success status
     */
    async saveScoreToFirebase(scoreRecord) {
        try {
            if (!window.firebaseDatabase) {
                console.warn('Firebase not available - cannot save score online');
                return false;
            }
            
            if (!this.isFirebaseConnected) {
                console.warn('Firebase not connected - cannot save score online');
                return false;
            }
            
            // Create a reference to the high scores collection
            const scoresRef = window.firebaseDatabase.ref('highScores');
            
            // Push a new score entry with a unique ID
            let newScoreRef;
            try {
                newScoreRef = scoresRef.push();
            } catch (pushError) {
                console.error('Error creating reference in Firebase:', pushError);
                return false;
            }
            
            // Set the score data with timeout
            try {
                const setPromise = newScoreRef.set({
                    playerName: scoreRecord.playerName,
                    score: scoreRecord.score,
                    date: scoreRecord.date,
                    timestamp: scoreRecord.timestamp,
                    totalCaught: scoreRecord.totalCaught || 0
                });
                
                // Add a timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase operation timed out')), 5000)
                );
                
                await Promise.race([setPromise, timeoutPromise]);
                console.log('Score saved to Firebase successfully');
                return true;
            } catch (setError) {
                console.error('Error setting data in Firebase:', setError);
                return false;
            }
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            return false;
        }
    }
    
    /**
     * Load scores from Firebase
     * @returns {Promise<Array>} - Array of score records
     */
    async loadScoresFromFirebase() {
        try {
            if (!window.firebaseDatabase) {
                console.warn('Firebase database not initialized - cannot load online scores');
                return [];
            }
            
            if (!this.isFirebaseConnected) {
                console.warn('Firebase not connected - cannot load online scores');
                return [];
            }
            
            // Get a reference to the high scores in the database
            const scoresRef = window.firebaseDatabase.ref('highScores');
            
            // Create a promise with timeout to prevent hanging
            try {
                const fetchPromise = scoresRef.orderByChild('score')
                                             .limitToLast(10)
                                             .once('value');
                
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase operation timed out')), 5000)
                );
                
                // Race between the fetch and the timeout
                const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
                
                const scores = [];
                
                // Loop through the results (Firebase returns them in order by key, so we need to sort later)
                snapshot.forEach((childSnapshot) => {
                    scores.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                
                // Sort by score (highest first)
                return scores.sort((a, b) => b.score - a.score);
            } catch (fetchError) {
                console.error('Error fetching data from Firebase:', fetchError);
                return [];
            }
        } catch (error) {
            console.error('Error loading from Firebase:', error);
            return [];
        }
    }
    
    /**
     * Setup realtime score updates from Firebase
     */
    setupRealtimeScoreUpdates() {
        // Skip setup if not applicable
        if (this.realtimeUpdateActive) {
            return;
        }
        
        if (this.environment !== 'online') {
            console.log('Not in online environment - skipping realtime updates');
            return;
        }
        
        if (!window.firebaseDatabase) {
            console.warn('Firebase not available - skipping realtime updates');
            return;
        }
        
        if (!this.isFirebaseConnected) {
            console.warn('Firebase not connected - will try realtime updates when connection is established');
            // We'll still attempt to set up, as the connection might be established later
        }
        
        try {
            const scoresRef = window.firebaseDatabase.ref('highScores');
            
            // Listen for changes to scores with error handling
            const onValueCallback = (snapshot) => {
                try {
                    const scores = [];
                    
                    snapshot.forEach((childSnapshot) => {
                        scores.push({
                            id: childSnapshot.key,
                            ...childSnapshot.val()
                        });
                    });
                    
                    // Sort and update global scores
                    this.globalScores = scores.sort((a, b) => b.score - a.score);
                    
                    // Update the UI
                    this.displayHighScores();
                    
                    // Show live update indicator briefly
                    const liveIndicator = document.getElementById('live-update-indicator');
                    if (liveIndicator) {
                        liveIndicator.style.display = 'block';
                        setTimeout(() => {
                            liveIndicator.style.display = 'none';
                        }, 3000);
                    }
                } catch (callbackError) {
                    console.error('Error in realtime update callback:', callbackError);
                }
            };
            
            // Handle errors in the subscription
            const onErrorCallback = (error) => {
                console.error('Realtime updates error:', error);
                this.realtimeUpdateActive = false;
            };
            
            // Set up the listener
            scoresRef.orderByChild('score')
                   .limitToLast(10)
                   .on('value', onValueCallback, onErrorCallback);
            
            this.realtimeUpdateActive = true;
            console.log('Realtime score updates activated');
        } catch (error) {
            console.error('Error setting up realtime updates:', error);
            this.realtimeUpdateActive = false;
        }
    }

    /**
     * Load local scores from localStorage
     */
    loadLocalScores() {
        try {
            const savedScores = localStorage.getItem('butterflyGameHighScores');
            if (savedScores) {
                this.localScores = JSON.parse(savedScores);
                
                // Ensure scores are sorted by score descending
                this.localScores.sort((a, b) => b.score - a.score);
                
                // Limit to top 10
                if (this.localScores.length > 10) {
                    this.localScores = this.localScores.slice(0, 10);
                }
            } else {
                // Try to migrate from previous format
                const legacyScores = localStorage.getItem('butterflyGameRecords');
                if (legacyScores) {
                    const oldRecords = JSON.parse(legacyScores);
                    
                    // Convert old format to new format
                    this.localScores = oldRecords.map(record => ({
                        playerName: record.playerName || 'Anonymous',
                        score: record.score || 0,
                        date: record.date || new Date().toLocaleString(),
                        timestamp: record.timestamp || Math.floor(Date.now() / 1000)
                    }));
                    
                    // Sort and limit
                    this.localScores.sort((a, b) => b.score - a.score);
                    if (this.localScores.length > 10) {
                        this.localScores = this.localScores.slice(0, 10);
                    }
                    
                    // Save in new format
                    this.saveLocalScores();
                }
            }
        } catch (error) {
            console.error('Error loading local scores:', error);
            this.localScores = [];
        }
    }

    /**
     * Load global scores from Firebase
     */
    async loadGlobalScores() {
        try {
            console.log("Loading global scores from Firebase...");
            
            // Check if Firebase is available
            if (!window.firebaseDatabase) {
                console.error('Firebase database not initialized');
                this.globalScores = [];
                return;
            }
            
            // Attempt to load scores from Firebase
            const scores = await this.loadScoresFromFirebase();
            
            if (scores && scores.length > 0) {
                console.log(`Loaded ${scores.length} scores from Firebase`);
                this.globalScores = scores;
            } else {
                console.log('No scores found in Firebase, checking for legacy JSON file');
                
                // Try loading from the legacy JSON file as fallback
                try {
                    const response = await fetch('/highscores.json', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache'
                        },
                        cache: 'no-store'
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log("Legacy scores loaded:", data);
                        this.globalScores = data.scores || [];
                        
                        // If we have legacy scores and Firebase is connected, migrate them
                        if (this.globalScores.length > 0 && this.isFirebaseConnected) {
                            console.log('Migrating legacy scores to Firebase');
                            for (const score of this.globalScores) {
                                await this.saveScoreToFirebase(score);
                            }
                        }
                    } else {
                        console.log('No legacy scores found, using empty array');
                        this.globalScores = [];
                    }
                } catch (fallbackError) {
                    console.error('Error loading legacy scores:', fallbackError);
                    this.globalScores = [];
                }
            }
            
            // Always show the scores panel if we have container
            if (this.container) {
                this.container.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading global scores:', error);
            this.globalScores = [];
            // Don't throw, just use empty scores
        }
    }

    /**
     * Display high scores in the UI
     */
    displayHighScores() {
        if (!this.container) return;
        
        const scoresDisplay = document.getElementById('scores-display');
        if (!scoresDisplay) return;
        
        // Update status message
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            if (this.environment === 'online') {
                statusMessage.textContent = 'Showing top scores from around the world and your device';
            } else {
                statusMessage.textContent = 'Playing offline - showing scores saved on your device';
            }
        }
        
        // Clear previous content
        scoresDisplay.innerHTML = '';
        
        // Add refresh scores button
        const refreshButton = document.createElement('button');
        refreshButton.textContent = '🔄 Refresh Scores';
        refreshButton.className = 'refresh-button';
        refreshButton.addEventListener('click', async () => {
            refreshButton.textContent = '⌛ Refreshing...';
            refreshButton.disabled = true;
            
            try {
                // Force a reload of global scores
                await this.loadGlobalScores();
                refreshButton.textContent = '✅ Refreshed!';
                setTimeout(() => {
                    refreshButton.textContent = '🔄 Refresh Scores';
                    refreshButton.disabled = false;
                }, 1500);
                
                // Redisplay scores
                this.displayHighScores();
            } catch (error) {
                console.error('Error refreshing scores:', error);
                refreshButton.textContent = '❌ Refresh Failed';
                setTimeout(() => {
                    refreshButton.textContent = '🔄 Refresh Scores';
                    refreshButton.disabled = false;
                }, 1500);
            }
        });
        
        scoresDisplay.appendChild(refreshButton);
        
        // Combine global and local scores
        this.combinedScores = [];
        
        // Add global scores first (if available)
        if (this.globalScores && this.globalScores.length > 0) {
            // Create global scores badge
            const globalBadge = document.createElement('div');
            globalBadge.className = 'score-section-header';
            
            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'environment-badge badge-online';
            badgeSpan.textContent = 'GLOBAL';
            
            globalBadge.appendChild(badgeSpan);
            globalBadge.appendChild(document.createTextNode(' Online Leaderboard'));
            
            scoresDisplay.appendChild(globalBadge);
            
            // Add global scores to the combined list with a source flag
            this.globalScores.forEach(score => {
                this.combinedScores.push({
                    ...score,
                    source: 'global'
                });
            });
            
            // Create scores list for global scores
            this.renderScoresList(scoresDisplay, this.globalScores, 'global');
        } else {
            // Add message when no global scores are available
            const noGlobalMessage = document.createElement('div');
            noGlobalMessage.className = 'no-scores-message';
            noGlobalMessage.innerHTML = `
                <p>No global scores available yet.</p>
                <p>Be the first to get on the global leaderboard!</p>
                <p class="note">Note: Global scores can take a few minutes to update after submission.</p>
            `;
            scoresDisplay.appendChild(noGlobalMessage);
        }
        
        // Always show the divider and local scores
        const divider = document.createElement('hr');
        divider.className = 'score-divider';
        scoresDisplay.appendChild(divider);
        
        // Create local scores badge
        const localBadge = document.createElement('div');
        localBadge.className = 'score-section-header';
        
        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'environment-badge badge-local';
        badgeSpan.textContent = 'LOCAL';
        
        localBadge.appendChild(badgeSpan);
        localBadge.appendChild(document.createTextNode(' Your Personal Scores'));
        
        scoresDisplay.appendChild(localBadge);
        
        // Add local scores to the combined list with a source flag
        this.localScores.forEach(score => {
            this.combinedScores.push({
                ...score,
                source: 'local'
            });
        });
        
        // Create scores list for local scores
        this.renderScoresList(scoresDisplay, this.localScores, 'local');
        
        // If both lists are empty, show a message
        if (this.combinedScores.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.padding = '15px 0';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.innerHTML = 'No scores recorded yet!<br>Play the game to see your scores here.';
            scoresDisplay.appendChild(emptyMessage);
        }
        
        // Show container now that we have content
        this.container.style.display = 'block';
    }
    
    /**
     * Render a list of scores
     * @param {HTMLElement} container - Container element
     * @param {Array} scores - Array of scores to render
     * @param {string} source - 'global' or 'local'
     */
    renderScoresList(container, scores, source) {
        // Handle empty scores
        if (!scores || scores.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.padding = '10px 0';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.fontStyle = 'italic';
            
            if (source === 'global') {
                emptyMessage.textContent = 'No global scores available yet';
            } else {
                emptyMessage.textContent = 'No local scores recorded yet';
            }
            
            container.appendChild(emptyMessage);
            return;
        }
        
        // Create scores list container
        const scoresList = document.createElement('div');
        scoresList.className = `scores-list ${source}-scores`;
        
        // Create scores list
        scores.forEach((score, index) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            
            let rankSpan;
            // Add medal icons for top 3
            if (index < 3) {
                const medals = ['🥇', '🥈', '🥉'];
                rankSpan = document.createElement('span');
                rankSpan.className = 'rank';
                rankSpan.textContent = medals[index];
            } else {
                // Rank
                rankSpan = document.createElement('span');
                rankSpan.className = 'rank';
                rankSpan.textContent = `${index + 1}.`;
            }
            
            // Score value
            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'score';
            scoreSpan.textContent = ` ${score.score} pts `;
            
            // Player name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = score.playerName || 'Anonymous';
            
            // Source badge for clarification
            if (source === 'global') {
                const sourceBadge = document.createElement('span');
                sourceBadge.className = 'source-badge global';
                sourceBadge.textContent = '🌐';
                sourceBadge.title = 'Global Score';
                nameSpan.appendChild(document.createTextNode(' '));
                nameSpan.appendChild(sourceBadge);
            } else {
                const sourceBadge = document.createElement('span');
                sourceBadge.className = 'source-badge local';
                sourceBadge.textContent = '💻';
                sourceBadge.title = 'Local Score';
                nameSpan.appendChild(document.createTextNode(' '));
                nameSpan.appendChild(sourceBadge);
            }
            
            // Date
            const dateSpan = document.createElement('span');
            dateSpan.className = 'date';
            dateSpan.textContent = score.date || new Date(score.timestamp * 1000).toLocaleString();
            
            // Add butterfly count if available
            if (score.totalCaught) {
                const caughtSpan = document.createElement('span');
                caughtSpan.className = 'caught';
                caughtSpan.textContent = `🦋 ${score.totalCaught} caught`;
                dateSpan.appendChild(document.createElement('br'));
                dateSpan.appendChild(caughtSpan);
            }
            
            // Assemble score item
            scoreItem.appendChild(rankSpan);
            scoreItem.appendChild(scoreSpan);
            scoreItem.appendChild(nameSpan);
            scoreItem.appendChild(dateSpan);
            
            scoresList.appendChild(scoreItem);
        });
        
        container.appendChild(scoresList);
    }

    /**
     * Show clear instructions before submitting a high score
     * @param {string} playerName - Player name
     * @param {number} score - Score value 
     * @param {number} totalCaught - Optional total butterflies caught
     */
    showSubmissionInstructions(playerName, score, totalCaught = 0) {
        // Check if we're on a very small screen and adjust content accordingly
        const isVerySmallScreen = window.innerWidth < 450 || window.innerHeight < 600;
        try {
            // Create modal background
            const modalBackground = document.createElement('div');
            modalBackground.className = 'modal-background';
            
            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            // Title
            const title = document.createElement('h2');
            title.textContent = this.environment === 'online' ? 'Global Score Submission' : 'Local Score Submission';
            title.style.color = '#0055A4';
            title.style.marginBottom = '15px';
            
            // Instructions
            const instructions = document.createElement('div');
            instructions.className = 'submission-instructions';

            // Different content based on environment and screen size
            if (this.environment === 'online' && window.firebaseDatabase && this.isFirebaseConnected) {
                if (isVerySmallScreen) {
                    // Simplified content for very small screens
                    instructions.innerHTML = `
                        <p>Your score: <strong>${score} points</strong></p>
                        <p>Will be saved locally and online.</p>
                        <div class="warning-box">
                            <p>⚠️ Your name and score will be visible to all players.</p>
                        </div>
                    `;
                } else {
                    // Full content for normal screens
                    instructions.innerHTML = `
                        <p>Your score of <strong>${score} points</strong> will be:</p>
                        
                        <ol>
                            <li><strong>Saved locally</strong> on this device (available even offline)</li>
                            <li><strong>Submitted globally</strong> to the online leaderboard</li>
                        </ol>
                        
                        <div class="warning-box">
                            <p>⚠️ Global submission details:</p>
                            <ul>
                                <li>Your name and score will be publicly visible to all players</li>
                                <li>The score is submitted to Firebase in real-time</li>
                                <li>Global scores will appear instantly on the leaderboard for all players</li>
                                <li>Other players will see your score immediately with a "LIVE" update indicator</li>
                            </ul>
                        </div>
                    `;
                }
            } else {
                if (isVerySmallScreen) {
                    // Simplified content for very small screens
                    instructions.innerHTML = `
                        <p>Your score: <strong>${score} points</strong></p>
                        <p>Will be saved locally only.</p>
                        <div class="info-box">
                            <p>ℹ️ Playing offline</p>
                        </div>
                    `;
                } else {
                    // Full content for normal screens
                    instructions.innerHTML = `
                        <p>Your score of <strong>${score} points</strong> will be saved locally on this device.</p>
                        
                        <div class="info-box">
                            <p>ℹ️ You're currently playing offline:</p>
                            <ul>
                                <li>Your score will be saved to this device only</li>
                                <li>Scores will persist between game sessions</li>
                                <li>You can export your scores using the export button</li>
                            </ul>
                        </div>
                    `;
                }
            }

            instructions.innerHTML += `<p><strong>Enter your name to continue:</strong></p>`;
            
            // Name input field
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = playerName || '';
            nameInput.placeholder = 'Enter your name';
            nameInput.maxLength = 20;
            nameInput.style.width = '100%';
            nameInput.style.padding = '10px';
            nameInput.style.fontSize = '18px';
            nameInput.style.marginTop = '10px';
            nameInput.style.marginBottom = '20px';
            nameInput.style.borderRadius = '5px';
            nameInput.style.border = '1px solid #ccc';
            
            // Button container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'modal-buttons';
            
            // Cancel button
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'modal-button cancel';
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modalBackground);
            });
            
            // Submit button
            const submitBtn = document.createElement('button');
            submitBtn.textContent = 'Submit Score';
            submitBtn.className = 'modal-button primary';
            submitBtn.addEventListener('click', () => {
                try {
                    const finalName = nameInput.value.trim() || 'Anonymous';
                    document.body.removeChild(modalBackground);
                    // Use try/catch instead of Promise.resolve to avoid errors
                    try {
                        // When running locally, Firebase methods might not be available
                        // so we need to handle this specially
                        if (this.environment === 'local' || !window.firebaseDatabase) {
                            // Just save locally without trying Firebase
                            this.saveLocalHighScore({
                                playerName: finalName,
                                score: score,
                                date: new Date().toLocaleString(),
                                timestamp: Math.floor(Date.now() / 1000),
                                totalCaught: totalCaught || 0
                            });
                            this.updateStatus('Score saved locally only (offline mode)');
                            this.displayHighScores();
                        } else {
                            // Normal flow for online mode
                            this.submitHighScore(finalName, score, totalCaught);
                        }
                    } catch (submitError) {
                        console.error('Error submitting score:', submitError);
                        // Fallback to just local storage
                        this.saveLocalHighScore({
                            playerName: finalName,
                            score: score,
                            date: new Date().toLocaleString(),
                            timestamp: Math.floor(Date.now() / 1000),
                            totalCaught: totalCaught || 0
                        });
                        this.updateStatus('Error saving online. Score saved locally.');
                        this.displayHighScores();
                    }
                } catch (clickError) {
                    console.error('Error in submit button click handler:', clickError);
                    // Try to recover
                    if (document.body.contains(modalBackground)) {
                        document.body.removeChild(modalBackground);
                    }
                    this.saveLocalHighScore({
                        playerName: nameInput.value.trim() || 'Anonymous',
                        score: score,
                        date: new Date().toLocaleString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        totalCaught: totalCaught || 0
                    });
                    this.updateStatus('Score saved locally due to an error.');
                }
            });
            
            // Handle enter key in input
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    submitBtn.click();
                }
            });
            
            // Assemble modal
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(submitBtn);
            
            modalContent.appendChild(title);
            modalContent.appendChild(instructions);
            modalContent.appendChild(nameInput);
            modalContent.appendChild(buttonContainer);
            modalBackground.appendChild(modalContent);
            
            // Add to document and focus input
            document.body.appendChild(modalBackground);
            setTimeout(() => nameInput.focus(), 100);
        } catch (error) {
            console.error('Error showing submission instructions:', error);
            // Emergency fallback - just save locally
            this.saveLocalHighScore({
                playerName: playerName || 'Anonymous',
                score: score,
                date: new Date().toLocaleString(),
                timestamp: Math.floor(Date.now() / 1000),
                totalCaught: totalCaught || 0
            });
            this.updateStatus('Score saved locally due to an error.');
        }
    }

    /**
     * Submit a high score
     * @param {string} playerName - Player name
     * @param {number} score - Score value
     * @param {number} totalCaught - Optional total butterflies caught
     */
    async submitHighScore(playerName, score, totalCaught = 0) {
        // Sanitize player name and validate score
        const sanitizedName = this.sanitizePlayerName(playerName);
        const validScore = this.validateScore(score);
        
        if (!validScore) {
            console.error('Invalid score value:', score);
            return;
        }
        
        // Implement rate limiting to prevent spam
        const now = Date.now();
        if (now - this.lastSubmissionTime < this.submissionCooldown) {
            console.log('Submission cooldown active, skipping submit');
            this.updateStatus('Please wait a moment before submitting another score');
            return;
        }
        this.lastSubmissionTime = now;
        
        // Create score record
        const scoreRecord = {
            playerName: sanitizedName,
            score: validScore,
            date: new Date().toLocaleString(),
            timestamp: Math.floor(Date.now() / 1000),
            totalCaught: totalCaught || 0
        };
        
        // Save locally first (always works regardless of connection)
        this.saveLocalHighScore(scoreRecord);
        
        // Try to submit to Firebase if online
        if (this.environment === 'online' && window.firebaseDatabase) {
            try {
                // Check for duplicate submission (same player, same score, within 1 minute)
                const isDuplicate = this.globalScores.some(existingScore => 
                    existingScore.playerName === sanitizedName && 
                    existingScore.score === validScore && 
                    Math.abs(existingScore.timestamp - scoreRecord.timestamp) < 60 // Within 1 minute
                );
                
                if (isDuplicate) {
                    console.log('Duplicate score detected, not submitting to Firebase');
                    this.updateStatus('Score already submitted. Saved locally.');
                    return;
                }
                
                // Save to Firebase
                const saveResult = await this.saveScoreToFirebase(scoreRecord);
                
                if (saveResult) {
                    this.updateStatus('Score submitted to global leaderboard!');
                    
                    // Show live update indicator to illustrate real-time functionality
                    const liveIndicator = document.getElementById('live-update-indicator');
                    if (liveIndicator) {
                        liveIndicator.style.display = 'block';
                        setTimeout(() => {
                            liveIndicator.style.display = 'none';
                        }, 3000);
                    }
                } else {
                    this.updateStatus('Could not connect to global leaderboard. Score saved locally.');
                }
            } catch (error) {
                console.error('Failed to submit to Firebase:', error);
                this.updateStatus('Error submitting to global leaderboard. Score saved locally.');
            }
        } else {
            this.updateStatus('Playing offline - score saved locally only.');
        }
        
        // Add to global scores immediately so player sees their score
        // (will be overwritten by real-time updates if connected)
        if (this.environment === 'online') {
            this.globalScores.push(scoreRecord);
            this.globalScores.sort((a, b) => b.score - a.score);
            if (this.globalScores.length > 10) {
                this.globalScores = this.globalScores.slice(0, 10);
            }
        }
        
        // Update display
        this.displayHighScores();
    }

    /**
     * Save a score to localStorage
     * @param {Object} scoreRecord - Score record
     */
    saveLocalHighScore(scoreRecord) {
        try {
            // Add to local scores
            this.localScores.push(scoreRecord);
            
            // Sort by score (highest first)
            this.localScores.sort((a, b) => b.score - a.score);
            
            // Keep only top 10
            if (this.localScores.length > 10) {
                this.localScores = this.localScores.slice(0, 10);
            }
            
            // Save to localStorage
            this.saveLocalScores();
            
            console.log('Score saved locally:', scoreRecord);
        } catch (error) {
            console.error('Error saving local score:', error);
        }
    }

    /**
     * Save local scores to localStorage
     */
    saveLocalScores() {
        try {
            localStorage.setItem('butterflyGameHighScores', JSON.stringify(this.localScores));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // GitHub submission method removed in favor of Firebase implementation

    // Export and import methods have been removed

    /**
     * Update status message
     * @param {string} message - Status message
     */
    updateStatus(message) {
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = message;
        }
    }

    /**
     * Sanitize player name to prevent injection attacks
     * @param {string} name - Player name
     * @return {string} - Sanitized name
     */
    sanitizePlayerName(name) {
        if (!name) return 'Anonymous';
        
        // Remove any HTML/script tags and limit length
        return name
            .toString()
            .replace(/<\/?[^>]+(>|$)/g, '')
            .trim()
            .slice(0, 20) || 'Anonymous';
    }

    /**
     * Validate score to ensure it's a realistic value
     * @param {any} score - Score to validate
     * @return {number} - Validated score
     */
    validateScore(score) {
        // Convert to number if possible
        const numScore = Number(score);
        
        // Check if it's a valid number
        if (isNaN(numScore)) return 0;
        
        // Ensure it's a positive integer within reasonable bounds
        return Math.max(0, Math.min(Math.floor(numScore), 999999));
    }

    /**
     * Toggle high score panel visibility
     * @param {boolean} show - Whether to show or hide
     */
    toggleDisplay(show) {
        if (this.container) {
            this.container.style.display = show ? 'block' : 'none';
        }
    }
}

// Create global instance
window.highScoreSystem = new HighScoreSystem();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize high score system
    setTimeout(() => {
        window.highScoreSystem.init().catch(error => {
            console.error('Error initializing high score system:', error);
        });
    }, 500); // Delay initialization to let game load first
});