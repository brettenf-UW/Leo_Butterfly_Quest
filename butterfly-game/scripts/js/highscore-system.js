/**
 * High Score System for Leo's Butterfly Quest
 * Supports both global (GitHub-based) and local (localStorage-based) high scores
 */

class HighScoreSystem {
    constructor() {
        this.localScores = [];
        this.globalScores = [];
        this.combinedScores = []; // New array for combined scores
        this.lastSubmissionTime = 0;
        this.submissionCooldown = 10000; // 10 seconds between submissions to avoid API rate limits
        this.initialized = false;
        this.container = null;
        this.environment = 'local'; // Default value, will be updated in init()
        
        // Bindings
        this.exportScores = this.exportScores.bind(this);
        this.importScores = this.importScores.bind(this);
        this.fileInputChange = this.fileInputChange.bind(this);
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
            
            // Load scores based on environment
            await this.loadHighScores();
            
            // Create UI only if it doesn't exist yet
            if (!document.getElementById('high-scores-container')) {
                this.createScoreUI();
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
        
        // Score actions
        const scoreActions = document.createElement('div');
        scoreActions.id = 'score-actions';
        
        const exportBtn = document.createElement('button');
        exportBtn.id = 'export-scores';
        exportBtn.textContent = 'Export Scores';
        exportBtn.addEventListener('click', this.exportScores);
        
        const importBtn = document.createElement('button');
        importBtn.id = 'import-scores';
        importBtn.textContent = 'Import Scores';
        importBtn.addEventListener('click', this.importScores);
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'score-file-input';
        fileInput.style.display = 'none';
        fileInput.accept = '.json';
        fileInput.addEventListener('change', this.fileInputChange);
        
        scoreActions.appendChild(exportBtn);
        scoreActions.appendChild(importBtn);
        scoreActions.appendChild(fileInput);
        
        // Status message
        const statusMessage = document.createElement('div');
        statusMessage.id = 'status-message';
        
        // Assemble container
        this.container.appendChild(header);
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
            
            /* High scores panel styles */
            .high-scores-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 20px;
                border-radius: 10px;
                width: 400px;
                max-width: 80vw;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 1000;
                font-family: Arial, sans-serif;
                border: 2px solid #0055A4;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
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
            #score-actions button {
                background: #0055A4;
                color: white;
                border: none;
                padding: 8px 12px;
                margin-right: 5px;
                cursor: pointer;
                border-radius: 3px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                flex: 1;
            }
            #score-actions button:hover {
                background: #0066CC;
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
     * Load global scores from GitHub
     */
    async loadGlobalScores() {
        try {
            // Use a fixed URL for now to avoid errors with dynamic hostname parsing
            const repoPath = 'LeosButterflyQuest';
            const response = await fetch(`https://raw.githubusercontent.com/user/${repoPath}/main/highscores.json`);
            
            if (!response.ok) {
                console.log(`Failed to fetch global scores with status: ${response.status}`);
                // Just use an empty array rather than throwing
                this.globalScores = [];
                return;
            }
            
            const data = await response.json();
            this.globalScores = data.scores || [];
            
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
        }
        
        // Add local scores if global scores are missing or less than 10
        if (!this.globalScores || this.globalScores.length === 0 || this.globalScores.length < 10) {
            // Only add a divider if we already have global scores
            if (this.globalScores && this.globalScores.length > 0) {
                const divider = document.createElement('hr');
                divider.className = 'score-divider';
                scoresDisplay.appendChild(divider);
            }
            
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
        }
        
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
     * Submit a high score
     * @param {string} playerName - Player name
     * @param {number} score - Score value
     */
    async submitHighScore(playerName, score) {
        // Sanitize player name and validate score
        const sanitizedName = this.sanitizePlayerName(playerName);
        const validScore = this.validateScore(score);
        
        if (!validScore) {
            console.error('Invalid score value:', score);
            return;
        }
        
        // Enforce submission cooldown to prevent API abuse
        const now = Date.now();
        if (now - this.lastSubmissionTime < this.submissionCooldown) {
            console.log('Submission cooldown active, skipping submit');
            return;
        }
        this.lastSubmissionTime = now;
        
        // Create score record
        const scoreRecord = {
            playerName: sanitizedName,
            score: validScore,
            date: new Date().toLocaleString(),
            timestamp: Math.floor(Date.now() / 1000)
        };
        
        // Save locally first
        this.saveLocalHighScore(scoreRecord);
        
        // Always try to submit to GitHub regardless of environment
        // This ensures scores are always uploaded when possible
        try {
            await this.submitScoreToGitHub(scoreRecord);
            this.updateStatus('Score submitted to global leaderboard!');
        } catch (error) {
            console.error('Failed to submit to GitHub:', error);
            if (this.environment === 'online') {
                this.updateStatus('Could not submit to global leaderboard. Score saved locally.');
            } else {
                this.updateStatus('Playing offline - score saved locally.');
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

    /**
     * Submit score to GitHub via issues
     * @param {Object} scoreRecord - Score record
     */
    async submitScoreToGitHub(scoreRecord) {
        try {
            // Create issue title
            const issueTitle = `HIGHSCORE: ${scoreRecord.playerName} - ${scoreRecord.score}`;
            
            // Create issue body with JSON data
            const issueBody = `
## New High Score Submission

Player: ${scoreRecord.playerName}
Score: ${scoreRecord.score}
Date: ${scoreRecord.date}

\`\`\`json
${JSON.stringify(scoreRecord)}
\`\`\`

*Submitted automatically by Leo's Butterfly Quest*
            `;
            
            // Submit via GitHub's API
            const response = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: issueTitle,
                    body: issueBody
                })
            });
            
            if (!response.ok) {
                throw new Error(`GitHub API Error: ${response.status}`);
            }
            
            console.log('Score submitted to GitHub successfully');
            this.updateStatus('Score submitted to global leaderboard!');
            
            // Add to global scores immediately so player sees their score
            this.globalScores.push(scoreRecord);
            this.globalScores.sort((a, b) => b.score - a.score);
            if (this.globalScores.length > 10) {
                this.globalScores = this.globalScores.slice(0, 10);
            }
            
            return true;
        } catch (error) {
            console.error('Error submitting to GitHub:', error);
            throw error;
        }
    }

    /**
     * Export local scores as a downloadable JSON file
     */
    exportScores() {
        try {
            // Show export instructions modal
            this.showExportInstructionsModal();
            
            // Create a JSON blob with local scores
            const scoresData = {
                scores: this.localScores,
                exportDate: new Date().toISOString(),
                source: 'LeosButterflyQuest'
            };
            
            const blob = new Blob([JSON.stringify(scoresData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create a temporary link and click it to download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'butterfly-quest-scores.json';
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.updateStatus('Scores exported successfully!');
        } catch (error) {
            console.error('Error exporting scores:', error);
            this.updateStatus('Failed to export scores');
        }
    }
    
    /**
     * Show export instructions modal
     */
    showExportInstructionsModal() {
        // Create modal background
        const modalBackground = document.createElement('div');
        modalBackground.className = 'modal-background';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'Exporting Your Scores';
        title.style.color = '#0055A4';
        title.style.marginBottom = '15px';
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.className = 'export-instructions';
        instructions.innerHTML = `
            <p>You're about to download your high scores as a JSON file. Here's what you can do with it:</p>
            
            <ol>
                <li><strong>Save your scores</strong> - Back up your achievements in case your browser data gets cleared</li>
                <li><strong>Transfer between devices</strong> - Import your scores on another computer or browser</li>
                <li><strong>Share with friends</strong> - Send your score file to friends so they can see your achievements</li>
            </ol>
            
            <p>Your download will begin automatically. Save the file somewhere you can find it later.</p>
            
            <p><strong>To import scores later:</strong> Click the "Import Scores" button and select this file.</p>
        `;
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Got it!';
        closeBtn.className = 'modal-button';
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modalBackground);
        });
        
        // Assemble modal
        modalContent.appendChild(title);
        modalContent.appendChild(instructions);
        modalContent.appendChild(closeBtn);
        modalBackground.appendChild(modalContent);
        
        // Add to document
        document.body.appendChild(modalBackground);
        
        // Auto-close after 8 seconds
        setTimeout(() => {
            if (document.body.contains(modalBackground)) {
                document.body.removeChild(modalBackground);
            }
        }, 8000);
    }

    /**
     * Start the import scores process
     */
    importScores() {
        // Show import instructions first
        this.showImportInstructionsModal();
    }
    
    /**
     * Show import instructions modal
     */
    showImportInstructionsModal() {
        // Create modal background
        const modalBackground = document.createElement('div');
        modalBackground.className = 'modal-background';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'Importing Scores';
        title.style.color = '#0055A4';
        title.style.marginBottom = '15px';
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.className = 'import-instructions';
        instructions.innerHTML = `
            <p>You can import high scores that were previously exported from Leo's Butterfly Quest.</p>
            
            <p>This allows you to:</p>
            <ul>
                <li>Restore your scores from a backup</li>
                <li>Transfer scores from another device</li>
                <li>See scores shared by friends</li>
            </ul>
            
            <p>The imported scores will be merged with your existing scores, keeping the top 10 highest ones.</p>
            
            <div class="warning-box">
                <p>⚠️ Important: Only import files from trusted sources! ⚠️</p>
            </div>
        `;
        
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
        
        // Select file button
        const selectBtn = document.createElement('button');
        selectBtn.textContent = 'Select Score File';
        selectBtn.className = 'modal-button primary';
        selectBtn.addEventListener('click', () => {
            // Remove the modal
            document.body.removeChild(modalBackground);
            
            // Open file input dialog
            const fileInput = document.getElementById('score-file-input');
            if (fileInput) {
                fileInput.click();
            }
        });
        
        // Assemble modal
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(selectBtn);
        
        modalContent.appendChild(title);
        modalContent.appendChild(instructions);
        modalContent.appendChild(buttonContainer);
        modalBackground.appendChild(modalContent);
        
        // Add to document
        document.body.appendChild(modalBackground);
    }

    /**
     * Handle file input change for score import
     * @param {Event} event - File input change event
     */
    fileInputChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.processImportedScores(data);
            } catch (error) {
                console.error('Error parsing imported scores:', error);
                this.updateStatus('Invalid score file format');
            }
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    /**
     * Process imported scores
     * @param {Object} data - Imported score data
     */
    processImportedScores(data) {
        if (!data || !data.scores || !Array.isArray(data.scores)) {
            this.updateStatus('Invalid score data format');
            return;
        }
        
        try {
            // Validate and sanitize imported scores
            const validScores = data.scores
                .filter(score => typeof score.score === 'number' && score.score >= 0)
                .map(score => ({
                    playerName: this.sanitizePlayerName(score.playerName),
                    score: this.validateScore(score.score),
                    date: score.date || new Date().toLocaleString(),
                    timestamp: score.timestamp || Math.floor(Date.now() / 1000)
                }));
            
            if (validScores.length === 0) {
                this.updateStatus('No valid scores found in import file');
                return;
            }
            
            // Merge with existing scores
            const mergedScores = [...this.localScores, ...validScores];
            
            // Sort by score and keep top 10
            mergedScores.sort((a, b) => b.score - a.score);
            this.localScores = mergedScores.slice(0, 10);
            
            // Save to localStorage
            this.saveLocalScores();
            
            // Update display
            this.displayHighScores();
            
            this.updateStatus(`Imported ${validScores.length} scores successfully!`);
            
            // If online, show modal to ask if they want to submit to global
            if (this.environment === 'online' && validScores.length > 0) {
                this.showImportToGlobalModal(validScores);
            }
        } catch (error) {
            console.error('Error processing imported scores:', error);
            this.updateStatus('Error processing imported scores');
        }
    }

    /**
     * Show modal asking if player wants to submit imported scores to global leaderboard
     * @param {Array} scores - Imported scores
     */
    showImportToGlobalModal(scores) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-background';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Submit to Global Leaderboard?';
        
        const message = document.createElement('div');
        message.textContent = `You've imported ${scores.length} scores. Would you like to submit these to the global leaderboard?`;
        
        const modalButtons = document.createElement('div');
        modalButtons.className = 'modal-buttons';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'No, Keep Local';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Yes, Submit';
        submitBtn.addEventListener('click', async () => {
            document.body.removeChild(modal);
            
            // Submit each score with a delay to avoid rate limits
            let successCount = 0;
            for (const score of scores) {
                try {
                    await this.submitScoreToGitHub(score);
                    successCount++;
                    
                    // Add delay between submissions
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error('Error submitting imported score:', error);
                }
            }
            
            this.updateStatus(`Submitted ${successCount} of ${scores.length} scores to global leaderboard`);
            this.displayHighScores();
        });
        
        modalButtons.appendChild(cancelBtn);
        modalButtons.appendChild(submitBtn);
        
        modalContent.appendChild(title);
        modalContent.appendChild(message);
        modalContent.appendChild(modalButtons);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
    }

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