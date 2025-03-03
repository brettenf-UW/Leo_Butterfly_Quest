class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // No longer using HTML UI elements - we'll draw everything on canvas
        this.scoreElement = null;
        this.levelElement = null;
        
        // Set canvas dimensions
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Game state
        this.isRunning = false;
        this.currentLevel = 1;
        this.maxLevel = 10; // Reduced back to 10 levels with boss at level 10
        this.score = 0;
        this.butterflies = [];
        this.butterflyImages = [];
        this.backgrounds = {
            field: new Image(),
            cafe: new Image(),
            frenchCountryside: new Image()
        };
        
        // Single wave system (no waves anymore)
        this.currentWave = 0;
        this.maxWaves = 1; // Just 1 wave per level
        this.waveDelay = 0; // No delay needed
        this.waveTimer = 0;
        this.isWaveTransitioning = false;
        this.totalButterfliesPerWave = 40; // Butterflies per level
        
        // Countdown system
        this.countdownActive = false;
        this.countdownTime = 3; // 3 second countdown
        this.hasPlayedInitialCountdown = false; // Track if initial countdown has been shown
        
        // Level transition
        this.isLevelTransitioning = false;
        
        // Game state flags
        this.showingStartScreen = true;
        this.showingInstructions = false;
        this.showingSummaryScreen = false; // Flag for summary screen
        this.showingRecordsModal = false; // Flag for records modal
        this.gameStarted = false; // Track if game has actually started
        
        // Butterfly stats tracking
        this.butterflyCounts = {};
        for (let i = 1; i <= this.maxLevel; i++) {
            this.butterflyCounts[i] = 0;
        }
        
        // Initialize player (net) but don't display on start screen
        this.player = new Player(this);
        
        // Time tracking
        this.lastTimestamp = 0;
        
        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleClick = this.handleClick.bind(this);
        
        // Event listeners
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousemove', (e) => this.player.updatePosition(e));
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.player.updatePosition({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        });
    }
    
    async init() {
        // Load assets
        await this.loadAssets();
        
        // Add debug logging
        console.log("Game initialized, showing start screen");
        
        // Start playing background music immediately when game loads
        try {
            if (this.backgroundMusic) {
                this.backgroundMusic.currentTime = 0;
                this.backgroundMusic.play().catch(e => {
                    console.log('Background music play failed initially:', e);
                    // Try again with user interaction
                    document.addEventListener('click', () => {
                        this.backgroundMusic.play().catch(e2 => console.log('Background music play failed again:', e2));
                    }, { once: true });
                });
            }
        } catch (e) {
            console.log('Error playing background music on init:', e);
        }
        
        // Show start screen (cafe background)
        this.showStartScreen();
        
        // Force first render immediately to ensure something appears
        this.render();
    }
    
    async loadAssets() {
        // Log asset loading status for debugging
        console.log("Starting asset loading...");
        
        // Try-catch for each asset type to prevent blocking on errors
        try {
            console.log("Loading backgrounds...");
            // Load backgrounds
            this.backgrounds.field.src = 'assets/backgrounds/french-grassfield.svg';
            this.backgrounds.cafe.src = 'assets/backgrounds/french-cafe.svg';
            
            // Only try to load the countryside image if we're in the right location
            try {
                // Use a new Image() to test load first
                const testImg = new Image();
                testImg.src = '../assets/images/french-countryside.jpg';
                
                // Set a timeout to avoid waiting forever
                const imagePromise = new Promise((resolve) => {
                    testImg.onload = () => resolve(true);
                    testImg.onerror = () => resolve(false);
                    setTimeout(() => resolve(false), 2000);
                });
                
                const loadSuccess = await imagePromise;
                if (loadSuccess) {
                    this.backgrounds.frenchCountryside.src = '../assets/images/french-countryside.jpg';
                } else {
                    // Fallback to using the field as countryside too
                    this.backgrounds.frenchCountryside.src = 'assets/backgrounds/french-grassfield.svg';
                    console.log("Using fallback for countryside background");
                }
            } catch (e) {
                console.log("Error loading countryside background:", e);
                this.backgrounds.frenchCountryside.src = 'assets/backgrounds/french-grassfield.svg';
            }
        } catch (e) {
            console.log("Error loading backgrounds:", e);
        }
        
        try {
            console.log("Loading butterfly images...");
            // Load butterflies for all levels
            for (let i = 1; i <= this.maxLevel; i++) {
                try {
                    const img = new Image();
                    img.src = `assets/butterflies/butterfly-level${i}.svg`;
                    this.butterflyImages.push(img);
                } catch (e) {
                    console.log(`Error loading butterfly level ${i}:`, e);
                    // Push a placeholder image
                    const placeholderImg = new Image();
                    placeholderImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="orange"/></svg>';
                    this.butterflyImages.push(placeholderImg);
                }
            }
        } catch (e) {
            console.log("Error in butterfly loading loop:", e);
        }
        
        try {
            console.log("Setting up background music...");
            // Create empty Audio element for background music
            this.backgroundMusic = new Audio();
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = 0.4;
            
            // We'll try to load the sounds but set up handlers for failures
            const bgTest = new Audio();
            
            // Try parent directory first
            bgTest.src = '../assets/sounds/Romantic French Cafe Music - Relaxing French Accordion Instrumental Music - Bonjour, Paris [ ezmp3.cc ].mp3';
            
            try {
                await new Promise((resolve) => {
                    bgTest.oncanplaythrough = resolve;
                    bgTest.onerror = resolve; // Also resolve on error to continue
                    setTimeout(resolve, 1000); // Timeout in case events don't fire
                });
                
                if (bgTest.error) {
                    throw new Error("Could not load primary music file");
                }
                
                // If we got here, the music loaded successfully
                this.backgroundMusic.src = bgTest.src;
                console.log("Primary background music loaded");
            } catch (e) {
                console.log("Using fallback background music:", e);
                this.backgroundMusic.src = 'assets/sounds/background-music.mp3';
            }
        } catch (e) {
            console.log("Background music setup error:", e);
            // Create a silent audio as fallback
            this.backgroundMusic = {
                play: () => Promise.resolve(),
                pause: () => {},
                currentTime: 0,
                loop: true,
                volume: 0
            };
        }
        
        try {
            console.log("Setting up sound effects with enhanced reliability...");
            // Create placeholder sound effects - we'll set silent sounds as fallbacks
            const createSilentAudio = () => {
                return {
                    play: () => Promise.resolve(),
                    pause: () => {},
                    currentTime: 0,
                    cloneNode: () => createSilentAudio(),
                    volume: 0
                };
            };
            
            // Helper function to pre-load and cache an audio file with multiple fallbacks
            const preloadAudio = async (paths, baseVolume = 0.9) => {
                // Try each potential path in order
                for (const path of paths) {
                    try {
                        console.log(`Attempting to load sound from: ${path}`);
                        
                        // Create test audio element
                        const audio = new Audio();
                        
                        // Set up a promise to track loading state with timeout
                        const loadPromise = new Promise((resolve) => {
                            // Set handlers first
                            audio.oncanplaythrough = () => resolve({success: true, audio});
                            audio.onerror = () => resolve({success: false, error: audio.error});
                            
                            // Then set source to start loading
                            audio.src = path;
                            
                            // Add timeout to avoid waiting too long (3 seconds)
                            setTimeout(() => resolve({success: false, error: 'timeout'}), 3000);
                        });
                        
                        // Wait for result
                        const result = await loadPromise;
                        
                        if (result.success) {
                            console.log(`Successfully loaded sound from: ${path}`);
                            
                            // Create a fresh audio element with this source
                            const successAudio = new Audio(path);
                            successAudio.volume = baseVolume;
                            
                            // Prime the audio by loading a bit of it
                            try {
                                await successAudio.load();
                            } catch (e) {
                                console.log("Audio priming failed but continuing:", e);
                            }
                            
                            return successAudio;
                        } else {
                            console.log(`Failed to load sound from: ${path}`, result.error);
                        }
                    } catch (e) {
                        console.log(`Error trying to load sound from ${path}:`, e);
                    }
                }
                
                // If we get here, all paths failed
                console.log("All sound paths failed, using silent audio fallback");
                return createSilentAudio();
            };
            
            // Try to load the start sound from multiple potential locations
            try {
                console.log("Loading start sound...");
                this.startSound = await preloadAudio([
                    'assets/sounds/sound-start.m4a',
                    'assets/sounds/start-sound.mp3',
                    '../assets/sounds/Wee Wee.m4a'
                ], 1.0);
                
                // Pre-load a clone to avoid any issues with reusing the same audio element
                this.startSoundClone = this.startSound.cloneNode();
                
                console.log("Start sound loaded successfully");
            } catch (e) {
                console.log("Start sound loading failed completely:", e);
                this.startSound = createSilentAudio();
            }
            
            // Load the level-up sound using the same reliable method
            try {
                console.log("Loading level-up sound...");
                this.levelUpSound = await preloadAudio([
                    'assets/sounds/level-up.mp3'
                ], 0.7);
                console.log("Level-up sound loaded successfully");
            } catch (e) {
                console.log("Level-up sound loading failed:", e);
                this.levelUpSound = createSilentAudio();
            }
            
            // Load the catch sound using the same reliable method
            try {
                console.log("Loading catch sound...");
                this.catchSound = await preloadAudio([
                    'assets/sounds/catch.mp3'
                ], 0.7);
                console.log("Catch sound loaded successfully");
            } catch (e) {
                console.log("Catch sound loading failed:", e);
                this.catchSound = createSilentAudio();
            }
        } catch (e) {
            console.log("Sound effects setup error:", e);
        }
        
        // Wait for all images to load with a timeout
        console.log("Waiting for image loading...");
        try {
            const allImages = [...Object.values(this.backgrounds), ...this.butterflyImages];
            
            // Set a 5-second timeout for all images to load
            const loadImagesWithTimeout = new Promise(resolve => {
                Promise.all(allImages.map(img => {
                    return new Promise(imgResolve => {
                        if (img.complete) {
                            imgResolve();
                            return;
                        }
                        
                        img.onload = imgResolve;
                        img.onerror = () => {
                            console.log(`Error loading image: ${img.src}`);
                            imgResolve(); // Resolve anyway to prevent blocking
                        };
                        
                        // Also resolve after timeout to avoid hanging
                        setTimeout(imgResolve, 2000);
                    });
                })).then(resolve);
                
                // Also resolve after 5 seconds maximum wait
                setTimeout(resolve, 5000);
            });
            
            await loadImagesWithTimeout;
            console.log("All assets loaded or timed out");
        } catch (e) {
            console.log("Error in asset loading:", e);
        }
    }
    
    showStartScreen() {
        this.showingStartScreen = true;
        this.showingInstructions = false;
        
        // Make sure the game is not running before the start button is clicked
        this.isRunning = false;
        
        // Music should already be playing from init, but try again if needed
        if (this.backgroundMusic && this.backgroundMusic.paused) {
            try {
                this.backgroundMusic.currentTime = 0;
                this.backgroundMusic.play().catch(e => console.log('Background music play failed in start screen:', e));
            } catch (e) {
                console.log('Error playing background music in start screen:', e);
            }
        }
        
        // Hide high score panel on start screen
        if (window.highScoreSystem) {
            window.highScoreSystem.toggleDisplay(false);
        }
        
        // Setup start screen click handlers
        const buttonY = this.canvas.height/2 + 20;
        const buttonWidth = 220;
        const buttonHeight = 60;
        const instructionsY = buttonY + 80;
        const highScoreY = instructionsY + 80;
        
        // Add click listener for buttons
        const startScreenClick = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if start button was clicked
            if (x >= this.canvas.width/2 - buttonWidth/2 && 
                x <= this.canvas.width/2 + buttonWidth/2 && 
                y >= buttonY - buttonHeight/2 && 
                y <= buttonY + buttonHeight/2) {
                
                this.canvas.removeEventListener('click', startScreenClick);
                
                // Play the start sound with maximum reliability - using embedded sound backup
                try {
                    console.log("Playing start sound - direct user interaction");
                    
                    // Create a small, embedded sound effect that's guaranteed to work
                    // This is a simple "click" sound encoded in base64
                    const clickSoundBase64 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFCIiIiIiIjAwMDAwMD09PT09PUxMTExMTFlZWVlZWWdnZ2dnZ3V1dXV1dYODg4ODg5GRkZGRkZ+fn5+fn62tra2trbq6urq6usLCwsLCwtDQ0NDQ0NnZ2dnZ2efn5+fn5/X19fX19f////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAUHAQAAAAAAHjMASE1pY3Jvc29mdCBTb3VuZCBGb3JtYXR0ZfD/80DEAAAAA0gAAAAATEFNRTMuMTAwA8MAAAAAAAAAABQgJAUTQQAAgAAAHjOZlIEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80DEUAAAA9gBwRQAABpAAAA//MQXRIE4AFl4AAAIMAACXQAAAAQZP/zEsRFB9YBeRAAAAgAAJdAAAABFT/MQxEAAAABLoAAAAAAAAL+AAAAE';
                    
                    // Try playing the local file first (the asset in the game folder)
                    console.log("Creating and playing new sound instance");
                    
                    // Try multiple file locations and formats to ensure start sound works
                    const soundFiles = [
                        'assets/sounds/sound-start.m4a',
                        'assets/sounds/start-sound.mp3',
                        'assets/sounds/sound-start.mp3',
                        'assets/sounds/start-sound.m4a'
                    ];
                    
                    // Track whether any sound has been played
                    let soundPlayed = false;
                    
                    // Try to play the primary sound with timeout
                    const playPrimarySound = async () => {
                        // Try each sound file in sequence until one works
                        for (const soundPath of soundFiles) {
                            try {
                                console.log(`Trying sound file: ${soundPath}`);
                                const startSound = new Audio(soundPath);
                                startSound.volume = 1.0; // Normal volume - setting to 5.0 breaks audio
                                
                                // Pre-load the sound
                                await new Promise((resolve) => {
                                    startSound.oncanplaythrough = resolve;
                                    startSound.onerror = () => {
                                        console.log(`Error loading sound: ${soundPath}`);
                                        resolve(); // Resolve anyway to try next sound
                                    };
                                    // Timeout after 500ms
                                    setTimeout(resolve, 500);
                                });
                                
                                // If sound loaded successfully, play it
                                if (!startSound.error) {
                                    console.log(`${soundPath} loaded, playing...`);
                                    const playPromise = startSound.play();
                                    
                                    if (playPromise !== undefined) {
                                        await playPromise;
                                        console.log(`${soundPath} playing successfully`);
                                        soundPlayed = true;
                                        return; // Exit the loop if we successfully played a sound
                                    }
                                }
                            } catch (err) {
                                console.log(`Error with sound ${soundPath}:`, err);
                                // Continue to next sound file
                            }
                        }
                        
                        // If we get here, none of the sound files worked
                        console.log("All sound files failed, using fallback");
                        playFallbackSound();
                    };
                    
                    // Fallback to embedded sound if local file fails
                    const playFallbackSound = () => {
                        if (soundPlayed) return; // Don't play if another sound already started
                        
                        try {
                            console.log("Trying fallback embedded sound");
                            const fallbackSound = new Audio(clickSoundBase64);
                            fallbackSound.volume = 0.8; // Slightly quieter for embedded sound since it might be harsh
                            fallbackSound.play().then(() => {
                                console.log("Fallback sound played successfully");
                                soundPlayed = true;
                            }).catch(e => {
                                console.log("Even fallback sound failed:", e);
                            });
                        } catch (e) {
                            console.log("Error creating fallback sound:", e);
                        }
                    };
                    
                    // Start the sound playing process
                    playPrimarySound();
                    
                    // Ensure some sound plays by using a timeout fallback
                    setTimeout(() => {
                        if (!soundPlayed) {
                            console.log("Sound didn't play after timeout, trying fallback");
                            playFallbackSound();
                        }
                    }, 500);
                    
                } catch (e) {
                    console.log('Critical error playing start sound:', e);
                }
                
                // Start the game with a slight delay to let the sound play
                setTimeout(() => {
                    this.start();
                }, 500);
            }
            
            // Check if instructions button was clicked
            if (x >= this.canvas.width/2 - buttonWidth/2 && 
                x <= this.canvas.width/2 + buttonWidth/2 && 
                y >= instructionsY - buttonHeight/2 && 
                y <= instructionsY + buttonHeight/2) {
                
                this.canvas.removeEventListener('click', startScreenClick);
                this.showInstructions();
            }
            
            // Check if high scores button was clicked
            if (x >= this.canvas.width/2 - buttonWidth/2 && 
                x <= this.canvas.width/2 + buttonWidth/2 && 
                y >= highScoreY - buttonHeight/2 && 
                y <= highScoreY + buttonHeight/2) {
                
                // Toggle high score panel
                if (window.highScoreSystem) {
                    // Keep this handler active, just toggle the panel
                    const isVisible = window.highScoreSystem.container && 
                                     window.highScoreSystem.container.style.display === 'block';
                    window.highScoreSystem.toggleDisplay(!isVisible);
                }
            }
        };
        
        this.canvas.addEventListener('click', startScreenClick);
        
        // Start the game loop to show the start screen
        requestAnimationFrame(this.gameLoop);
    }
    
    renderStartScreen() {
        console.log("Drawing start screen content");
        
        // Determine if we're on a small screen
        const isSmallScreen = this.canvas.width < 600 || this.canvas.height < 500;
        
        // Adjust overlay size for small screens
        let overlayWidth = isSmallScreen ? Math.min(400, this.canvas.width * 0.9) : 500;
        let overlayHeight = isSmallScreen ? Math.min(450, this.canvas.height * 0.8) : 500;
        
        // Semi-transparent overlay (centered)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fillRect(
            this.canvas.width/2 - overlayWidth/2, 
            this.canvas.height/3 - 80, 
            overlayWidth, 
            overlayHeight
        );
        
        // Adjust font sizes for small screens
        const titleFontSize = isSmallScreen ? 40 : 54;
        const subtitleFontSize = isSmallScreen ? 20 : 24;
        
        // Game title with fun shadow effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.font = `bold ${titleFontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Le Chasseur de', this.canvas.width/2, this.canvas.height/3 - 20);
        this.ctx.fillText('Papillons', this.canvas.width/2, this.canvas.height/3 + 40);
        
        // Fun subtitle
        this.ctx.fillStyle = '#EF4135';  // French flag red
        this.ctx.font = `italic ${subtitleFontSize}px Arial`;
        this.ctx.fillText("Leo's Butterfly Adventure", this.canvas.width/2, this.canvas.height/3 + 80);
        
        // Adjust button size for small screens
        const buttonWidth = isSmallScreen ? 180 : 220;
        const buttonHeight = isSmallScreen ? 50 : 60;
        const buttonY = this.canvas.height/2 + 20;
        
        // Button background with glow
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.shadowColor = '#FFC72C';  // Golden glow
        this.ctx.shadowBlur = 15;
        this.ctx.fillRect(this.canvas.width/2 - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight);
        this.ctx.shadowBlur = 0;
        
        // Button text
        this.ctx.fillStyle = '#0055A4';  // French flag blue
        this.ctx.font = 'bold 28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Start Game', this.canvas.width/2, buttonY + 10);
        
        // Add instructions button
        const instructionsY = buttonY + 80;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(this.canvas.width/2 - buttonWidth/2, instructionsY - buttonHeight/2, buttonWidth, buttonHeight);
        
        this.ctx.fillStyle = '#0055A4';  // French flag blue
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillText('Instructions', this.canvas.width/2, instructionsY + 10);
        
        // Add high scores button
        const highScoreY = instructionsY + 80;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(this.canvas.width/2 - buttonWidth/2, highScoreY - buttonHeight/2, buttonWidth, buttonHeight);
        
        this.ctx.fillStyle = '#0055A4';  // French flag blue
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillText('High Scores', this.canvas.width/2, highScoreY + 10);
        
        // Add French flag decoration
        const flagWidth = 80;
        const flagHeight = 50;
        const flagX = this.canvas.width/2 - flagWidth/2;
        const flagY = highScoreY + 40;
        
        // Blue part
        this.ctx.fillStyle = '#0055A4';
        this.ctx.fillRect(flagX, flagY, flagWidth/3, flagHeight);
        
        // White part
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(flagX + flagWidth/3, flagY, flagWidth/3, flagHeight);
        
        // Red part
        this.ctx.fillStyle = '#EF4135';
        this.ctx.fillRect(flagX + 2*flagWidth/3, flagY, flagWidth/3, flagHeight);
        
        try {
            // Draw some decorative butterflies around the title
            this.drawDecorativeButterflies();
        } catch (e) {
            console.log("Error drawing decorative butterflies:", e);
        }
    }
    
    drawDecorativeButterflies() {
        // Draw a few decorative butterflies on start screen using images from different levels
        const butterflyPositions = [
            { x: this.canvas.width * 0.15, y: this.canvas.height * 0.2, level: 1, scale: 1.2, rotation: Math.PI * 0.1 },
            { x: this.canvas.width * 0.85, y: this.canvas.height * 0.25, level: 3, scale: 1.0, rotation: -Math.PI * 0.15 },
            { x: this.canvas.width * 0.2, y: this.canvas.height * 0.75, level: 5, scale: 0.9, rotation: Math.PI * 0.2 },
            { x: this.canvas.width * 0.75, y: this.canvas.height * 0.8, level: 7, scale: 1.1, rotation: -Math.PI * 0.1 },
            { x: this.canvas.width * 0.5, y: this.canvas.height * 0.15, level: 9, scale: 1.3, rotation: Math.PI * 0.05 }
        ];
        
        // Draw each butterfly
        for (const pos of butterflyPositions) {
            const imgIndex = Math.min(pos.level - 1, this.butterflyImages.length - 1);
            if (imgIndex >= 0 && imgIndex < this.butterflyImages.length) {
                const img = this.butterflyImages[imgIndex];
                
                if (img && img.complete && img.naturalWidth !== 0) {
                    this.ctx.save();
                    this.ctx.translate(pos.x, pos.y);
                    this.ctx.rotate(pos.rotation);
                    this.ctx.scale(pos.scale, pos.scale);
                    
                    const size = 60;
                    this.ctx.drawImage(img, -size/2, -size/2, size, size);
                    
                    this.ctx.restore();
                }
            }
        }
    }
    
    showInstructions() {
        this.showingStartScreen = false;
        this.showingInstructions = true;
        
        // Make sure the game is not running in instructions screen
        this.isRunning = false;
        
        // Setup instructions click handler
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonY = this.canvas.height/2 + 180;
        
        // Add click listener for back button
        const instructionsClick = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (x >= this.canvas.width/2 - buttonWidth/2 && 
                x <= this.canvas.width/2 + buttonWidth/2 && 
                y >= buttonY - buttonHeight/2 && 
                y <= buttonY + buttonHeight/2) {
                
                this.canvas.removeEventListener('click', instructionsClick);
                this.showStartScreen();
            }
        };
        
        this.canvas.addEventListener('click', instructionsClick);
        
        // Start the game loop to show instructions
        requestAnimationFrame(this.gameLoop);
    }
    
    renderInstructionsScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(this.canvas.width/2 - 300, this.canvas.height/2 - 220, 600, 440);
        
        // Title
        this.ctx.fillStyle = '#0055A4';  // French flag blue
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Instructions', this.canvas.width/2, this.canvas.height/2 - 170);
        
        // Instructions text
        this.ctx.fillStyle = '#333';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        
        const instructionsX = this.canvas.width/2 - 260;
        let instructionsY = this.canvas.height/2 - 120;
        const lineHeight = 30;
        
        this.ctx.fillText('1. Click on butterflies to catch them with your net', instructionsX, instructionsY);
        instructionsY += lineHeight;
        this.ctx.fillText('2. Butterflies from higher levels are smaller and faster', instructionsX, instructionsY);
        instructionsY += lineHeight;
        this.ctx.fillText('3. Complete each level by catching all butterflies', instructionsX, instructionsY);
        instructionsY += lineHeight;
        this.ctx.fillText('4. Each level introduces new, more challenging butterflies', instructionsX, instructionsY);
        instructionsY += lineHeight;
        this.ctx.fillText('5. Earn points based on the butterfly level', instructionsX, instructionsY);
        instructionsY += lineHeight;
        this.ctx.fillText('6. Try to reach level 10 with the Queen Butterfly!', instructionsX, instructionsY);
        instructionsY += lineHeight;
        
        // Fun French phrases
        instructionsY += 20;
        this.ctx.fillStyle = '#EF4135';  // French flag red
        this.ctx.font = 'italic 20px Arial';
        this.ctx.fillText('"Attrape les papillons!"', instructionsX, instructionsY);
        instructionsY += lineHeight;
        this.ctx.fillText('"C\'est magnifique!"', instructionsX + 100, instructionsY);
        
        // Back button
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonY = this.canvas.height/2 + 180;
        
        this.ctx.fillStyle = '#0055A4';  // Blue button
        this.ctx.fillRect(this.canvas.width/2 - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Back to Menu', this.canvas.width/2, buttonY + 8);
    }
    
    start() {
        // Clean game state for a fresh start
        this.butterflies = []; // Clear any existing butterflies
        
        // Update UI state
        this.showingStartScreen = false;
        this.showingInstructions = false;
        this.isRunning = true;
        this.gameStarted = true; // Mark the game as actually started
        
        // Reset all game state values to starting values
        this.currentLevel = 1; // Force start at level 1
        this.currentWave = 0;
        this.score = 0;
        this.levelTimer = 0;
        
        // Reset butterfly counts
        for (let i = 1; i <= this.maxLevel; i++) {
            this.butterflyCounts[i] = 0;
        }
        
        // Add the game-running class to hide cursor
        document.getElementById('game-container').classList.add('game-running');
        
        // Reset all transition flags
        this.isWaveTransitioning = false;
        this.waveTimer = 0;
        this.isLevelTransitioning = false;
        
        // Reset countdown flag for new game
        this.hasPlayedInitialCountdown = false;
        
        // Ensure countdown happens (music already playing)
        this.countdownActive = true;
        this.countdownTime = 3;
        
        // Hide high score panel during gameplay
        if (window.highScoreSystem) {
            window.highScoreSystem.toggleDisplay(false);
        }
        
        console.log("Starting game at level:", this.currentLevel);
        
        // Set timer to handle countdown
        const countdownInterval = setInterval(() => {
            this.countdownTime--;
            console.log("Countdown:", this.countdownTime);
            
            // When countdown reaches zero, spawn butterflies
            if (this.countdownTime <= 0) {
                clearInterval(countdownInterval);
                this.countdownActive = false;
                
                // Reset level timer before spawning butterflies
                this.levelTimer = 0;
                
                // Spawn first wave of butterflies after countdown
                console.log("Spawning level 1 butterflies");
                this.spawnButterflies(0);
            }
        }, 1000);
        
        // Game loop should already be running from init
    }
    
    spawnButterflies(wave = 0) {
        // We already handled the countdown in the start() method
        // For all waves, just spawn butterflies immediately
        this.hasPlayedInitialCountdown = true;
        this.actuallySpawnButterflies(wave);
    }
    
    actuallySpawnButterflies(wave = 0) {
        // Make sure current level is valid (1-10)
        const safeLevel = Math.min(Math.max(this.currentLevel, 1), this.maxLevel);
        
        // Special handling for level 10 (boss level)
        if (safeLevel === 10) {
            // Boss level - single large powerful butterfly plus some regular ones
            console.log("Level 10: BOSS LEVEL - Spawning Queen Butterfly!");
            this.spawnBossButterfly();
            return;
        }
        
        // For regular levels, only spawn butterflies of that level (no mixing)
        console.log(`Level ${safeLevel}: Spawning level ${safeLevel} butterflies`);
        
        // Reduce butterfly count to prevent lag
        const butterflyCount = 15; // Fewer butterflies per level
        
        // Make sure we have a valid butterfly image for this level
        const imageIndex = Math.min(safeLevel - 1, this.butterflyImages.length - 1);
        if (imageIndex < 0 || imageIndex >= this.butterflyImages.length) {
            console.error(`Invalid butterfly image index: ${imageIndex}, max: ${this.butterflyImages.length - 1}`);
            return;
        }
        
        console.log(`  - Spawning ${butterflyCount} butterflies for level ${safeLevel}`);
        
        // Spawn butterflies for this level
        for (let i = 0; i < butterflyCount; i++) {
            const butterfly = new Butterfly(
                this,
                this.butterflyImages[imageIndex],
                safeLevel
            );
            
            // Position butterfly with varied formations for different levels
            const formations = ['line', 'v', 'circle', 'grid', 'random'];
            // Choose formation based on level (cycle through formations)
            const formationIndex = (safeLevel - 1) % formations.length;
            const formation = formations[formationIndex];
            
            this.positionButterflyInFormation(butterfly, formation, i, butterflyCount);
            
            // Add random speed variation to make butterflies fly at different speeds
            // Higher levels get more speed
            const levelSpeedBonus = 1 + ((safeLevel - 1) * 0.1); // 10% faster per level
            const speedVariation = (0.8 + Math.random() * 0.4) * levelSpeedBonus; // 80-120% variation + level bonus
            butterfly.speed *= speedVariation;
            
            // Update velocity based on new speed
            butterfly.vx = Math.cos(butterfly.direction) * butterfly.speed;
            butterfly.vy = Math.sin(butterfly.direction) * butterfly.speed;
            
            // Add butterfly to game with slight staggering to reduce initial lag
            setTimeout(() => {
                this.butterflies.push(butterfly);
            }, i * 50); // Add 50ms delay between each butterfly
        }
        
        console.log(`Total butterflies in level ${safeLevel}: ${butterflyCount}`);
        
        // Start the level timer
        this.levelTimer = 0;
    }
    
    spawnBossButterfly() {
        // Only spawn a single, large, powerful boss butterfly plus some minions
        
        // Boss butterfly (Queen Butterfly) - 3x larger, slower but harder to catch
        const bossButterfly = new Butterfly(
            this,
            this.butterflyImages[9], // Level 10 butterfly image
            10 // Level 10
        );
        
        // Make the boss butterfly special
        bossButterfly.width *= 2.5; // Make it larger
        bossButterfly.height *= 2.5;
        bossButterfly.catchRadius *= 0.7; // Harder to catch
        bossButterfly.speed *= 0.8; // Slightly slower movement
        bossButterfly.health = 5; // Takes multiple clicks to catch
        bossButterfly.isBoss = true; // Mark as boss for special handling
        
        // Position boss butterfly in the center initially and then send to a random edge
        bossButterfly.x = this.canvas.width / 2;
        bossButterfly.y = this.canvas.height / 2;
        
        // Random direction for boss
        bossButterfly.direction = Math.random() * Math.PI * 2;
        bossButterfly.vx = Math.cos(bossButterfly.direction) * bossButterfly.speed;
        bossButterfly.vy = Math.sin(bossButterfly.direction) * bossButterfly.speed;
        
        // Add boss butterfly with a delay
        setTimeout(() => {
            this.butterflies.push(bossButterfly);
        }, 1000);
        
        // Spawn some minion butterflies to accompany the boss
        for (let i = 0; i < 8; i++) {
            const minion = new Butterfly(
                this,
                this.butterflyImages[8], // Level 9 butterfly image
                9 // Level 9 for minions
            );
            
            // Position minions in a circle around where the boss will appear
            const angle = (i / 8) * Math.PI * 2;
            const distance = 150;
            
            minion.x = this.canvas.width / 2 + Math.cos(angle) * distance;
            minion.y = this.canvas.height / 2 + Math.sin(angle) * distance;
            
            // Direction pointing outward from center
            minion.direction = angle;
            minion.vx = Math.cos(minion.direction) * minion.speed;
            minion.vy = Math.sin(minion.direction) * minion.speed;
            
            // Add minion with a delay
            setTimeout(() => {
                this.butterflies.push(minion);
            }, 500 + i * 100);
        }
        
        // Start the level timer with a bit more time for the boss
        this.levelTimer = 0;
    }
    
    getFormationSizeForLevel(formation, baseCount) {
        // Adjust count based on formation type
        switch (formation) {
            case 'line':
                return Math.ceil(baseCount * 1.1); // 10% more
            case 'v':
                return baseCount; // Standard count
            case 'circle':
                return Math.ceil(baseCount * 1.2); // 20% more
            case 'grid':
                return Math.ceil(baseCount * 1.3); // 30% more
            case 'random':
            default:
                return Math.ceil(baseCount * 1.05); // 5% more
        }
    }
    
    getFormationForWave(wave, level) {
        // Define all possible formations
        const formations = [
            'line',   // Butterflies in a horizontal or vertical line
            'v',      // Butterflies in a V or inverted V shape
            'circle', // Butterflies in a circle or arc
            'grid',   // Butterflies in a grid pattern
            'random'  // Butterflies in random positions
        ];
        
        // Higher levels have more complex formations
        if (level <= 3) {
            // Lower levels mostly use line and random
            return formations[Math.floor(Math.random() * 2)];
        } else if (level <= 6) {
            // Mid levels use all formations except grid
            return formations[Math.floor(Math.random() * 4)];
        } else {
            // Higher levels use all formations with preference for complex ones
            const idx = Math.floor(Math.random() * 5);
            return formations[idx >= 3 ? idx : idx + 2]; // Bias toward complex formations
        }
    }
    
    positionButterflyInFormation(butterfly, formation, index, count, spawnSide) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Completely random starting position from any edge, flying through a point on screen
        // Choose which edge to spawn from
        const edge = spawnSide !== undefined ? spawnSide : Math.floor(Math.random() * 4);
        
        // Define a crossing point in the visible area of the screen (where butterfly will pass through)
        const crossingX = width * (0.2 + Math.random() * 0.6); // Between 20% and 80% of width
        const crossingY = height * (0.2 + Math.random() * 0.6); // Between 20% and 80% of height
        
        // Position based on chosen edge
        switch (edge) {
            case 0: // Top edge
                butterfly.x = width * Math.random();
                butterfly.y = -butterfly.height * 2;
                break;
            case 1: // Right edge
                butterfly.x = width + butterfly.width;
                butterfly.y = height * Math.random();
                break;
            case 2: // Bottom edge
                butterfly.x = width * Math.random();
                butterfly.y = height + butterfly.height;
                break;
            case 3: // Left edge
                butterfly.x = -butterfly.width * 2;
                butterfly.y = height * Math.random();
                break;
        }
        
        // Calculate angle to the crossing point
        const dx = crossingX - butterfly.x;
        const dy = crossingY - butterfly.y;
        butterfly.direction = Math.atan2(dy, dx);
        
        // Add slight randomness to direction
        butterfly.direction += (Math.random() - 0.5) * Math.PI / 4; // ±45 degrees
        
        // Set velocity based on direction and speed
        butterfly.vx = Math.cos(butterfly.direction) * butterfly.speed;
        butterfly.vy = Math.sin(butterfly.direction) * butterfly.speed;
        
        // Store the crossing point for drawing debug info (if needed)
        butterfly.crossingPoint = { x: crossingX, y: crossingY };
        
        // Set movement pattern based on level
        butterfly.movementPattern = 'direct'; // Simplify movement to reduce lag
    }
    
    getMovementPatternForFormation(formation, level) {
        // Different movement patterns based on formation and level
        switch (formation) {
            case 'line':
                return level < 5 ? 'linear' : 'wave';
            case 'v':
                return level < 5 ? 'diagonal' : 'figure8';
            case 'circle':
                return level < 5 ? 'circular' : 'spiral';
            case 'grid':
                return level < 5 ? 'bounce' : 'chase';
            case 'random':
            default:
                return level < 5 ? 'zigzag' : 'erratic';
        }
    }
    
    gameLoop(timestamp) {
        // Make sure we always get a valid timestamp
        if (!timestamp) timestamp = performance.now();
        
        // Clear canvas at the start of each frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Handle special UI states
        
        // Check if showing name input popup (highest priority)
        if (this.showingNameInput) {
            // Render the name input popup over everything else
            this.renderNameInputPopup();
            // Continue the game loop
            requestAnimationFrame(this.gameLoop);
            return;
        }
        
        // Check if we're showing the summary screen
        if (this.showingSummaryScreen) {
            // Re-render the summary screen to ensure it stays visible
            this.renderSummaryScreen();
            // Continue the game loop
            requestAnimationFrame(this.gameLoop);
            return;
        }
        
        // Check if we're in level transition animation
        if (this.isLevelTransitioning && this.levelTransitionStartTime) {
            // Handle level transition animation
            const elapsed = Date.now() - this.levelTransitionStartTime;
            const progress = Math.min(1, elapsed / this.levelTransitionDuration);
            
            // If animation is still running, render it
            if (progress < 1) {
                this.renderLevelTransition(elapsed, progress);
                // Continue the game loop
                requestAnimationFrame(this.gameLoop);
                return;
            } else if (this.levelTransitionComplete === false) {
                // Animation just finished
                this.levelTransitionComplete = true;
                this.startNextLevel();
                this.levelTransitionStartTime = null;
                requestAnimationFrame(this.gameLoop);
                return;
            }
        }
        
        // Regular rendering for non-transition screens
        this.render();
        
        // Only handle game logic if game is running and not in transition
        if (this.isRunning && !this.isLevelTransitioning) {
            // Calculate delta time
            const deltaTime = (timestamp - this.lastTimestamp) / 1000;
            this.lastTimestamp = timestamp;
            
            // Update game objects
            this.update(deltaTime);
        } else {
            // Just update timestamp if not running
            this.lastTimestamp = timestamp;
        }
        
        // Continue loop in all cases
        requestAnimationFrame(this.gameLoop);
    }
    
    // Separate method to render level transition animation
    renderLevelTransition(elapsed, progress) {
        // Draw game background
        try {
            if (this.backgrounds.frenchCountryside.complete && this.backgrounds.frenchCountryside.naturalWidth !== 0) {
                this.ctx.drawImage(this.backgrounds.frenchCountryside, 0, 0, this.canvas.width, this.canvas.height);
            } else if (this.backgrounds.field.complete && this.backgrounds.field.naturalWidth !== 0) {
                this.ctx.drawImage(this.backgrounds.field, 0, 0, this.canvas.width, this.canvas.height);
            } else {
                this.ctx.fillStyle = '#7ABD7E'; // Light green
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        } catch (e) {
            this.ctx.fillStyle = '#7ABD7E'; // Light green
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw a semi-transparent overlay for better text visibility
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Create flashing/pulsing effect based on time
        const pulseSize = 1 + 0.2 * Math.sin(elapsed / 50); // Pulsing size
        const alpha = Math.min(1, 2 * (0.5 - Math.abs(progress - 0.5))); // Fade in and out
        
        // Draw a colorful starburst effect behind the text
        this.ctx.save();
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
        this.ctx.scale(pulseSize, pulseSize);
        
        // Draw starburst rays
        const rayCount = 12;
        const innerRadius = 80;
        const outerRadius = 180;
        
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2;
            const hue = (i / rayCount) * 360; // Rainbow effect
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
            this.ctx.lineTo(Math.cos(angle + 0.2) * innerRadius, Math.sin(angle + 0.2) * innerRadius);
            this.ctx.closePath();
            
            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha * 0.7})`;
            this.ctx.fill();
        }
        this.ctx.restore();
        
        // Draw main transition message
        this.ctx.save();
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
        this.ctx.scale(pulseSize, pulseSize);
        
        // Shadow effect for text
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 5;
        this.ctx.shadowOffsetY = 5;
        
        // "Next Level" text
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`Level ${this.currentLevel}!`, 0, -20);
        
        // French flag colors under the level number
        const flagWidth = 200;
        const flagHeight = 10;
        const flagY = 30;
        
        // Blue part
        this.ctx.fillStyle = `rgba(0, 85, 164, ${alpha})`;
        this.ctx.fillRect(-flagWidth/2, flagY, flagWidth/3, flagHeight);
        
        // White part
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        this.ctx.fillRect(-flagWidth/2 + flagWidth/3, flagY, flagWidth/3, flagHeight);
        
        // Red part
        this.ctx.fillStyle = `rgba(239, 65, 53, ${alpha})`;
        this.ctx.fillRect(-flagWidth/2 + 2*flagWidth/3, flagY, flagWidth/3, flagHeight);
        
        this.ctx.restore();
    }
    
    update(deltaTime) {
        // Don't update anything during a level transition
        if (this.isLevelTransitioning) {
            return;
        }
        
        // Don't update during countdown
        if (this.countdownActive) {
            return;
        }
        
        // Update butterflies and remove those flagged for deletion
        for (let i = this.butterflies.length - 1; i >= 0; i--) {
            const butterfly = this.butterflies[i];
            butterfly.update(deltaTime);
            
            // Remove butterflies that have passed through the screen and gone off the edge
            if (butterfly.shouldRemove) {
                this.butterflies.splice(i, 1);
            }
        }
        
        // Ensure level timer is initialized
        if (this.levelTimer === undefined) {
            this.levelTimer = 0;
            console.log("Initializing level timer");
        }
        
        // Increment the level timer - but only when game is fully running (not in countdown)
        this.levelTimer += deltaTime;
        
        // Only allow level progression if we have butterflies or a reasonable amount of time has passed
        // This prevents instant progression
        const allowLevelProgression = this.butterflies.length > 0 || this.levelTimer >= 2; 
        
        if (allowLevelProgression) {
            // Move to next level after 10 seconds
            if (this.levelTimer >= 10 && !this.isLevelTransitioning) {
                console.log(`Level ${this.currentLevel} time limit reached, progressing to next level`);
                this.levelComplete(true);
                this.levelTimer = 0; // Reset timer for next level
                return;
            }
            
            // Also allow progression when all butterflies are caught (but make sure we actually had some)
            if (this.butterflies.length === 0 && !this.isLevelTransitioning) {
                console.log(`All butterflies caught in level ${this.currentLevel}, progressing to next level`);
                this.levelComplete(true);
                this.levelTimer = 0; // Reset timer for next level
            }
        } else {
            if (this.levelTimer < 2) {
                console.log(`Level ${this.currentLevel} startup - waiting for butterflies...`);
            }
        }
        
        // Occasionally spawn extra groups of butterflies for added challenge
        // (only during active gameplay, not during transitions)
        if (!this.isLevelTransitioning && this.butterflies.length < 20 && Math.random() < 0.01) {
            // 1% chance per frame to spawn an extra group (more frequent than before)
            console.log("Spawning additional butterflies!");
            
            // Choose a random formation
            const formations = ['line', 'v', 'circle', 'grid', 'random'];
            const formation = formations[Math.floor(Math.random() * formations.length)];
            
            // Number of butterflies in the formation
            const count = 3 + Math.floor(Math.random() * 3); // Fewer to reduce lag
            
            // Random spawn side
            const spawnSide = Math.floor(Math.random() * 4);
            
            // Use appropriate butterfly for current level
            // For clarity, use the current level's butterflies
            const imageIndex = Math.min(this.currentLevel - 1, this.butterflyImages.length - 1);
            
            // Create the butterflies
            for (let i = 0; i < count; i++) {
                const butterfly = new Butterfly(
                    this,
                    this.butterflyImages[imageIndex],
                    this.currentLevel
                );
                
                // Position butterfly according to formation
                this.positionButterflyInFormation(butterfly, formation, i, count, spawnSide);
                
                // Make them a bit faster than normal
                butterfly.speed *= 1.2;
                butterfly.vx = Math.cos(butterfly.direction) * butterfly.speed;
                butterfly.vy = Math.sin(butterfly.direction) * butterfly.speed;
                
                // Add to game
                this.butterflies.push(butterfly);
            }
        }
    }
    
    render() {
        console.log("Render called. Start screen:", this.showingStartScreen, "Instructions:", this.showingInstructions);
        
        // If showing start screen or instructions, only show that content, not game UI
        if (this.showingStartScreen || this.showingInstructions) {
            // Clear any previous content
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Always draw a fallback color first to ensure something is visible
            this.ctx.fillStyle = '#87CEEB';  // Sky blue
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw appropriate background
            try {
                if (this.backgrounds.frenchCountryside.complete && this.backgrounds.frenchCountryside.naturalWidth !== 0) {
                    console.log("Drawing countryside background");
                    this.ctx.drawImage(this.backgrounds.frenchCountryside, 0, 0, this.canvas.width, this.canvas.height);
                } else if (this.backgrounds.cafe.complete && this.backgrounds.cafe.naturalWidth !== 0) {
                    console.log("Drawing cafe background");
                    this.ctx.drawImage(this.backgrounds.cafe, 0, 0, this.canvas.width, this.canvas.height);
                } else {
                    console.log("Drawing gradient fallback");
                    // Fallback background
                    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                    gradient.addColorStop(0, '#87CEEB');  // Sky blue
                    gradient.addColorStop(1, '#4682B4');  // Steel blue
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                }
            } catch (e) {
                console.log('Error drawing background:', e);
            }
            
            // Call the specific rendering function
            if (this.showingStartScreen) {
                console.log("Rendering start screen");
                this.renderStartScreen();
            } else if (this.showingInstructions) {
                console.log("Rendering instructions screen");
                this.renderInstructionsScreen();
            }
            
            return;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background (using French countryside as main background for gameplay)
        try {
            if (this.backgrounds.frenchCountryside.complete && this.backgrounds.frenchCountryside.naturalWidth !== 0) {
                this.ctx.drawImage(this.backgrounds.frenchCountryside, 0, 0, this.canvas.width, this.canvas.height);
            } else if (this.backgrounds.field.complete && this.backgrounds.field.naturalWidth !== 0) {
                this.ctx.drawImage(this.backgrounds.field, 0, 0, this.canvas.width, this.canvas.height);
            } else {
                // Fallback to a green background
                this.ctx.fillStyle = '#7ABD7E'; // Light green
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        } catch (e) {
            console.log('Error drawing background:', e);
            // Fallback to a green background
            this.ctx.fillStyle = '#7ABD7E'; // Light green
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw butterflies
        for (const butterfly of this.butterflies) {
            butterfly.draw(this.ctx);
        }
        
        // Only draw player/net if game has actually started
        if (this.gameStarted) {
            // Draw player (net) - this will replace the cursor
            this.player.draw(this.ctx);
        }
        
        // Draw level info with nicer styling
        if (this.isRunning && !this.isLevelTransitioning) {
            // Background panel for score and level (left side)
            const panelWidth = 180;
            const panelHeight = 70;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.fillRect(10, 10, panelWidth, panelHeight);
            
            // Add a border
            this.ctx.strokeStyle = '#0055A4';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(10, 10, panelWidth, panelHeight);
            
            // Level text
            this.ctx.fillStyle = '#0055A4';
            this.ctx.font = 'bold 22px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Level: ${this.currentLevel}`, 20, 35);
            
            // Score text
            this.ctx.fillText(`Score: ${this.score}`, 20, 65);
            
            // Display level timer countdown (center top)
            if (this.levelTimer !== undefined) {
                const timeLeft = Math.max(0, Math.ceil(10 - this.levelTimer));
                
                // Timer panel - centered at top
                const timerWidth = 120;
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.fillRect(this.canvas.width/2 - timerWidth/2, 10, timerWidth, 40);
                
                // Add a border
                this.ctx.strokeStyle = '#0055A4';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(this.canvas.width/2 - timerWidth/2, 10, timerWidth, 40);
                
                // Timer text
                this.ctx.fillStyle = timeLeft <= 3 ? '#EF4135' : '#0055A4'; // Red when low time
                this.ctx.font = 'bold 22px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`Time: ${timeLeft}s`, this.canvas.width/2, 35);
            }
            
            // Special indicator for level 10 (final boss level)
            if (this.currentLevel === 10) {
                // Background for boss indicator (bottom right corner)
                const bossIndicatorWidth = 180;
                const bossIndicatorHeight = 70;
                const bossX = this.canvas.width - bossIndicatorWidth - 10; // 10px from right edge
                const bossY = this.canvas.height - bossIndicatorHeight - 10; // 10px from bottom edge
                
                // Reddish background for boss with slight transparency
                this.ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
                this.ctx.fillRect(bossX, bossY, bossIndicatorWidth, bossIndicatorHeight);
                
                // Add a border with glow effect
                this.ctx.save();
                this.ctx.shadowColor = '#FF0000';
                this.ctx.shadowBlur = 10;
                this.ctx.strokeStyle = '#800000'; // Dark red
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(bossX, bossY, bossIndicatorWidth, bossIndicatorHeight);
                this.ctx.restore();
                
                // Boss text
                this.ctx.fillStyle = '#FFFFFF'; // White text
                this.ctx.font = 'bold 22px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('BOSS LEVEL!', bossX + bossIndicatorWidth/2, bossY + 30);
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillText('Catch the Queen!', bossX + bossIndicatorWidth/2, bossY + 55);
            }
        }
        
        // Draw countdown if active
        if (this.countdownActive && this.countdownTime > 0) {
            // Transparent background for readability
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Large countdown number with fun effects
            this.ctx.save();
            
            // Add shadow
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 5;
            this.ctx.shadowOffsetY = 5;
            
            // Countdown number
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 150px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Draw with slight bounce effect
            const bounceOffset = Math.sin(Date.now() / 100) * 5; // Subtle bounce
            this.ctx.fillText(this.countdownTime.toString(), this.canvas.width / 2, this.canvas.height / 2 + bounceOffset);
            
            this.ctx.restore();
            
            // Fun message based on countdown number
            let message = '';
            let color = '';
            switch(this.countdownTime) {
                case 3:
                    message = "Butterflies incoming!";
                    color = '#0055A4'; // Blue
                    break;
                case 2:
                    message = "Get your net ready!";
                    color = '#FFFFFF'; // White
                    break;
                case 1:
                    message = "Catch them all!";
                    color = '#EF4135'; // Red
                    break;
            }
            
            // Message with colorful styling
            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 32px Arial';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 5;
            this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2 + 100);
            this.ctx.shadowBlur = 0;
        }
    }
    
    handleClick(e) {
        // Don't process clicks during level transitions or countdown
        if (this.isLevelTransitioning || this.countdownActive) {
            return;
        }
        
        // If we're in start screen, instructions, or summary screen, we're handling clicks elsewhere
        if (this.showingStartScreen || this.showingInstructions || this.showingSummaryScreen) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check for butterfly catches
        for (let i = this.butterflies.length - 1; i >= 0; i--) {
            const butterfly = this.butterflies[i];
            
            if (butterfly.checkCatch(x, y)) {
                // Award points based on level
                this.score += butterfly.level * 10;
                
                // Increment butterfly catch count for this level type
                this.butterflyCounts[butterfly.level]++;
                
                // Remove caught butterfly
                this.butterflies.splice(i, 1);
                
                // Play catch sound
                try {
                    if (this.catchSound) {
                        // Clone the sound to allow multiple overlapping plays
                        this.catchSound.cloneNode().play().catch(e => console.log('Catch sound play failed:', e));
                    }
                } catch (e) {
                    console.log('Error playing catch sound:', e);
                }
                
                this.updateUI();
                break; // Only catch one butterfly per click
            }
        }
    }
    
    levelComplete(fastTransition = false) {
        // Set level transition flag to prevent multiple level completions
        if (this.isLevelTransitioning) {
            return;
        }
        this.isLevelTransitioning = true;
        
        if (this.currentLevel < this.maxLevel) {
            this.currentLevel++;
            this.updateUI(); // Update any UI elements with new level
            
            // Play level up sound
            try {
                if (this.levelUpSound) {
                    this.levelUpSound.play().catch(e => console.log('Level-up audio play failed:', e));
                }
            } catch (e) {
                console.log('Error playing level-up sound:', e);
            }
            
            // Set up transition animation
            this.levelTransitionStartTime = Date.now();
            this.levelTransitionDuration = 1000; // 1 second animation
            this.levelTransitionComplete = false; // Track if animation has completed
            
            console.log(`Starting level transition to level ${this.currentLevel}`);
            
            // Note: The animation is now handled in the main game loop
            // This ensures it integrates properly with the render cycle
            
        } else {
            // Game completed!
            this.gameComplete();
        }
    }
    
    startNextLevel() {
        console.log(`Starting next level: ${this.currentLevel}`);
        
        // Reset wave counter for the new level
        this.currentWave = 0;
        this.isWaveTransitioning = false;
        this.waveTimer = 0;
        
        // Reset level timer
        this.levelTimer = 0;
        
        // Spawn first wave of butterflies for the new level
        this.spawnButterflies(0);
        
        // Reset level transition flag
        this.isLevelTransitioning = false;
        this.levelTransitionComplete = true; // Mark transition as fully complete
        this.levelTransitionStartTime = null; // Clear transition timing info
    }
    
    gameComplete() {
        this.isRunning = false;
        
        // Keep playing the background music for celebration
        
        // Remove the game-running class to show cursor again
        document.getElementById('game-container').classList.remove('game-running');
        
        // Set a flag to indicate we're showing the summary screen
        this.showingSummaryScreen = true;
        
        // Show summary screen with butterfly statistics
        this.renderSummaryScreen();
        
        // Show high score panel if available
        if (window.highScoreSystem) {
            window.highScoreSystem.toggleDisplay(true);
        }
        
        // Add click listener for play again button and save record buttons
        // This will remain active until the player clicks Play Again
        this.setupSummaryScreenListeners();
    }
    
    renderSummaryScreen() {
        try {
            // Clear canvas first
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw cafe background or countryside fallback
            if (this.backgrounds.cafe.complete && this.backgrounds.cafe.naturalWidth !== 0) {
                this.ctx.drawImage(this.backgrounds.cafe, 0, 0, this.canvas.width, this.canvas.height);
            } else if (this.backgrounds.frenchCountryside.complete && this.backgrounds.frenchCountryside.naturalWidth !== 0) {
                this.ctx.drawImage(this.backgrounds.frenchCountryside, 0, 0, this.canvas.width, this.canvas.height);
            } else {
                // Fallback: blue gradient background
                const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                gradient.addColorStop(0, '#87CEEB');  // Sky blue
                gradient.addColorStop(1, '#4682B4');  // Steel blue
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        } catch (e) {
            console.log('Error drawing completion screen background:', e);
            // Fallback solid color
            this.ctx.fillStyle = '#87CEEB';  // Sky blue
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // If we're showing past records modal, render that instead
        if (this.showingRecordsModal) {
            this.renderRecordsModal();
            return;
        }
        
        // Calculate the required panel size dynamically based on content
        // Get display counts for size calculations
        let totalCaught = 0;
        for (let i = 1; i <= this.maxLevel; i++) {
            totalCaught += this.butterflyCounts[i] || 0;
        }
        
        // Determine if we're on a small screen and need compact layout
        // More aggressive small screen detection to handle more devices
        const isSmallScreen = this.canvas.height < 700 || this.canvas.width < 1000;
        
        // Dynamic sizing constants - adjust based on screen size
        const TITLE_HEIGHT = isSmallScreen ? 40 : 60;
        const SUBTITLE_HEIGHT = isSmallScreen ? 35 : 50;
        const SUMMARY_TEXT_HEIGHT = isSmallScreen ? 30 : 40;
        const SCORE_BOX_HEIGHT = isSmallScreen ? 40 : 60;
        const STATS_HEADER_HEIGHT = isSmallScreen ? 30 : 40;
        const STATS_ROW_HEIGHT = isSmallScreen ? 20 : 25;
        const TOTAL_STATS_HEIGHT = isSmallScreen ? 35 : 50;
        const BUTTON_HEIGHT = isSmallScreen ? 40 : 50;
        const BUTTON_SPACING = isSmallScreen ? 15 : 20;
        
        // Calculate needed heights for each section with margins
        const headerSectionHeight = TITLE_HEIGHT + SUBTITLE_HEIGHT + SUMMARY_TEXT_HEIGHT + 20; 
        const scoreSectionHeight = SCORE_BOX_HEIGHT + 20;
        const statsSectionHeight = STATS_HEADER_HEIGHT + (this.maxLevel * STATS_ROW_HEIGHT) + TOTAL_STATS_HEIGHT + 30;
        const buttonSectionHeight = (BUTTON_HEIGHT * 3) + (BUTTON_SPACING * 2) + 30;
        
        // Calculate total required height and width with compact layout if needed
        const contentHeight = headerSectionHeight + scoreSectionHeight + statsSectionHeight + buttonSectionHeight;
        const minPanelWidth = isSmallScreen ? 500 : 650;
        
        // Set final panel dimensions with safety margins - more compact on small screens
        const panelWidth = Math.min(Math.max(minPanelWidth, this.canvas.width * 0.9), this.canvas.width - 30);
        const panelHeight = Math.min(Math.max(contentHeight + 40, this.canvas.height * 0.9), this.canvas.height - 30);
        
        // Calculate panel position
        const panelX = this.canvas.width / 2 - panelWidth / 2;
        const panelY = this.canvas.height / 2 - panelHeight / 2;
        
        // Draw main panel
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        // Draw inner gold border with shadow
        const borderMargin = isSmallScreen ? 15 : 20;
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 5;
        this.ctx.shadowOffsetY = 5;
        this.ctx.strokeStyle = '#FFC72C'; // Gold
        this.ctx.lineWidth = isSmallScreen ? 3 : 5;
        this.ctx.strokeRect(
            panelX + borderMargin, 
            panelY + borderMargin, 
            panelWidth - (borderMargin * 2), 
            panelHeight - (borderMargin * 2)
        );
        this.ctx.restore();
        
        // ================ IMPROVED LAYOUT ENGINE ================
        // Use a position tracker to place all elements precisely
        let currentY = panelY + (isSmallScreen ? 35 : 50); // Start position with margin from top
        const centerX = this.canvas.width / 2;
        
        // --------- HEADER SECTION ---------
        // "Victoire!" Title
        this.ctx.fillStyle = '#0055A4'; // Blue
        this.ctx.font = `bold ${isSmallScreen ? 36 : 48}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Victoire!', centerX, currentY);
        currentY += TITLE_HEIGHT;
        
        // "Félicitations!" subtitle
        this.ctx.fillStyle = '#EF4135'; // Red
        this.ctx.font = `italic ${isSmallScreen ? 28 : 36}px Arial`;
        this.ctx.fillText('Félicitations!', centerX, currentY);
        currentY += SUBTITLE_HEIGHT;
        
        // "Butterfly Hunting Summary" text
        this.ctx.fillStyle = '#333';
        this.ctx.font = `bold ${isSmallScreen ? 20 : 24}px Arial`;
        this.ctx.fillText('Butterfly Hunting Summary', centerX, currentY);
        currentY += SUMMARY_TEXT_HEIGHT + (isSmallScreen ? 5 : 10); 
        
        // --------- SCORE SECTION ---------
        // Score box
        const scoreBoxWidth = isSmallScreen ? 200 : 240;
        const scoreBoxX = centerX - scoreBoxWidth / 2;
        this.ctx.fillStyle = '#0055A4';
        this.ctx.fillRect(scoreBoxX, currentY, scoreBoxWidth, isSmallScreen ? 30 : 40);
        
        // Score text
        this.ctx.fillStyle = 'white';
        this.ctx.font = `bold ${isSmallScreen ? 22 : 28}px Arial`;
        this.ctx.fillText(`Final Score: ${this.score}`, centerX, currentY + (isSmallScreen ? 22 : 28));
        currentY += SCORE_BOX_HEIGHT;
        
        // --------- STATISTICS SECTION ---------
        // Statistics header with spacing
        currentY += (isSmallScreen ? 10 : 20); // Add space before stats section
        this.ctx.fillStyle = '#333';
        this.ctx.font = `bold ${isSmallScreen ? 18 : 22}px Arial`;
        this.ctx.fillText('Butterflies Caught', centerX, currentY);
        currentY += STATS_HEADER_HEIGHT;
        
        // Determine if we need to collapse some rows to save space
        const displayLevels = isSmallScreen && this.maxLevel > 5 ? 
            [1, 2, 5, 8, 10] : // Show only key levels on small screens
            [...Array(this.maxLevel).keys()].map(i => i + 1); // Show all levels otherwise
        
        // Prepare for statistics rows with adjustments for butterfly images
        const statsMargin = isSmallScreen ? 30 : 40; // Reduced margin for more space
        const statsStartX = panelX + statsMargin;
        const barAreaWidth = panelWidth - (statsMargin * 2);
        const labelWidth = isSmallScreen ? 80 : 100; // Reduced since we're using images now
        const barWidth = barAreaWidth - labelWidth - (isSmallScreen ? 50 : 60);
        const countWidth = isSmallScreen ? 40 : 50;
        
        // Bar metrics
        const barMaxWidth = barWidth - 10;
        const barHeight = isSmallScreen ? 14 : 18;
        
        // Find the maximum count for proper scaling
        const maxCount = Math.max(1, ...Object.values(this.butterflyCounts));
        
        // Draw each butterfly statistic row (only for displayed levels)
        for (let i = 0; i < displayLevels.length; i++) {
            const level = displayLevels[i];
            const count = this.butterflyCounts[level] || 0;
            
            // Get the butterfly image for this level
            const imgIndex = Math.min(level - 1, this.butterflyImages.length - 1);
            const butterflyImg = this.butterflyImages[imgIndex];
            
            // Calculate positions
            const labelX = statsStartX;
            const barX = statsStartX + labelWidth;
            const countX = barX + barWidth + 10;
            
            // Calculate bar width based on count and max count for better proportions
            const barRatio = count / maxCount;
            const actualBarWidth = Math.max(2, Math.floor(barRatio * barMaxWidth));
            
            // Bar background
            this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
            this.ctx.fillRect(barX, currentY - (isSmallScreen ? 12 : 14), barWidth, barHeight);
            
            // Actual count bar with color
            const hue = (level * 36) % 360; // Cycle through colors
            this.ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
            this.ctx.fillRect(barX, currentY - (isSmallScreen ? 12 : 14), actualBarWidth, barHeight);
            
            // Calculate a safe size for the butterfly that won't overlap with other elements
            // Use a smaller size on small screens or if label area is constrained
            const maxAllowedSize = Math.min(labelWidth - 30, isSmallScreen ? 20 : 25);
            const butterflySize = Math.max(15, maxAllowedSize); // Don't go smaller than 15px
            
            if (butterflyImg && butterflyImg.complete && butterflyImg.naturalWidth !== 0) {
                // Create a safe area for the butterfly
                const safeX = labelX + 3; // Small margin from left
                const safeY = currentY - butterflySize/2 - 2; // Vertically centered
                
                // Save context to apply clipping (ensures butterfly stays in its area)
                this.ctx.save();
                
                // Optional: add a subtle background to make butterflies stand out
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(safeX + butterflySize/2, safeY + butterflySize/2, butterflySize/2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw butterfly with vertical centering
                this.ctx.drawImage(
                    butterflyImg, 
                    safeX, 
                    safeY,
                    butterflySize, 
                    butterflySize
                );
                
                this.ctx.restore();
                
                // Add level indicator in a more compact way
                // Calculate a color based on level for visual distinction
                const hue = (level * 36) % 360; // Same as the bar color
                this.ctx.fillStyle = level === 10 ? '#FF4500' : `hsl(${hue}, 60%, 30%)`; // Darker version of bar color
                this.ctx.textAlign = 'center';
                this.ctx.font = `bold ${isSmallScreen ? 10 : 11}px Arial`;
                
                // Position level number at bottom-right of butterfly
                const levelX = safeX + butterflySize - 3;
                const levelY = safeY + butterflySize - 2;
                
                // Draw level number with small white outline for better readability
                this.ctx.save();
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 2;
                this.ctx.strokeText(level.toString(), levelX, levelY);
                this.ctx.fillText(level.toString(), levelX, levelY);
                this.ctx.restore();
                
                // Special crown icon for Queen Butterfly (level 10)
                if (level === 10) {
                    this.ctx.save();
                    this.ctx.fillStyle = 'gold';
                    this.ctx.beginPath();
                    
                    // Simple crown drawing
                    const crownX = safeX;
                    const crownY = safeY;
                    const crownSize = butterflySize / 3;
                    
                    // Draw a small golden crown
                    this.ctx.moveTo(crownX, crownY);
                    this.ctx.lineTo(crownX + crownSize/3, crownY - crownSize/2);
                    this.ctx.lineTo(crownX + crownSize/2, crownY);
                    this.ctx.lineTo(crownX + crownSize*2/3, crownY - crownSize/2);
                    this.ctx.lineTo(crownX + crownSize, crownY);
                    this.ctx.lineTo(crownX + crownSize, crownY + crownSize/3);
                    this.ctx.lineTo(crownX, crownY + crownSize/3);
                    this.ctx.closePath();
                    
                    this.ctx.fill();
                    this.ctx.restore();
                }
            } else {
                // Fallback if image not loaded - simple text
                this.ctx.fillStyle = '#333';
                this.ctx.textAlign = 'center';
                this.ctx.font = `${isSmallScreen ? 13 : 14}px Arial`;
                const levelText = `L${level}`;
                this.ctx.fillText(levelText, labelX + labelWidth/2, currentY);
                
                if (level === 10) {
                    this.ctx.fillStyle = '#FF4500';
                    this.ctx.font = `bold ${isSmallScreen ? 9 : 10}px Arial`;
                    this.ctx.fillText('Queen', labelX + labelWidth/2, currentY + 12);
                }
            }
            
            // Count text (left-aligned)
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`× ${count}`, countX, currentY);
            
            // Advance to next row
            currentY += STATS_ROW_HEIGHT;
        }
        
        // If we skipped some levels, add a note
        if (displayLevels.length < this.maxLevel) {
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#666';
            this.ctx.font = 'italic 12px Arial';
            this.ctx.fillText('(Zoom out to see all your catches)', centerX, currentY);
            currentY += STATS_ROW_HEIGHT;
        }
        
        // Total butterflies caught
        currentY += (isSmallScreen ? 10 : 20); // Add spacing before total
        this.ctx.fillStyle = '#0055A4';
        this.ctx.font = `bold ${isSmallScreen ? 18 : 22}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Total Butterflies Caught: ${totalCaught}`, centerX, currentY);
        currentY += TOTAL_STATS_HEIGHT;
        
        // --------- BUTTONS SECTION ---------
        // Calculate button positions starting from bottom of panel with adaptive spacing
        const buttonWidth = isSmallScreen ? 180 : 220;
        const buttonBottom = panelY + panelHeight - (isSmallScreen ? 30 : 40);
        
        // Position buttons evenly from bottom, with proper spacing
        const numButtons = 3;
        const totalButtonAreaHeight = (numButtons * BUTTON_HEIGHT) + ((numButtons - 1) * BUTTON_SPACING);
        let buttonY = buttonBottom - totalButtonAreaHeight;
        
        // Make sure buttons don't overlap with stats - adjust if needed
        const minYPosition = currentY + 20;
        if (buttonY < minYPosition) {
            buttonY = minYPosition;
        }
        
        // Button style settings
        const buttonGlowSettings = [
            { color: '#FFC72C', buttonColor: '#EF4135', text: 'Play Again' },
            { color: '#0055A4', buttonColor: '#0055A4', text: 'Save Record' },
            { color: '#32CD32', buttonColor: '#32CD32', text: 'View Records' }
        ];
        
        // Store button positions for click handling
        this.summaryButtons = {};
        const buttonTypes = ['playAgain', 'saveRecord', 'viewRecords'];
        
        // Draw each button with proper spacing
        for (let i = 0; i < numButtons; i++) {
            const settings = buttonGlowSettings[i];
            const type = buttonTypes[i];
            
            // Calculate current button position with safety check
            const currentButtonY = buttonY + (i * (BUTTON_HEIGHT + BUTTON_SPACING));
            
            // Skip if button would go off the bottom of the panel
            if (currentButtonY + BUTTON_HEIGHT > panelY + panelHeight - 10) {
                console.log(`Skipping button ${i} as it would go off panel`);
                continue;
            }
            
            // Draw button with glow
            this.ctx.save();
            this.ctx.shadowColor = settings.color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = settings.buttonColor;
            this.ctx.fillRect(centerX - buttonWidth/2, currentButtonY, buttonWidth, BUTTON_HEIGHT);
            this.ctx.restore();
            
            // Button text
            this.ctx.fillStyle = 'white';
            this.ctx.font = `bold ${isSmallScreen ? 20 : 24}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(settings.text, centerX, currentButtonY + BUTTON_HEIGHT/2 + (isSmallScreen ? 7 : 8));
            
            // Store button position
            this.summaryButtons[type] = {
                x: centerX - buttonWidth/2,
                y: currentButtonY,
                width: buttonWidth,
                height: BUTTON_HEIGHT
            };
        }
        
        // Draw decorative butterflies around the victory screen
        this.drawVictoryButterflies();
    }
    
    renderRecordsModal() {
        // Draw semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Responsive modal dimensions - ensure even more space
        const modalWidth = Math.min(700, this.canvas.width - 60);
        const modalHeight = Math.min(500, this.canvas.height - 60);
        const modalX = this.canvas.width/2 - modalWidth/2;
        const modalY = this.canvas.height/2 - modalHeight/2;
        
        // Modal background with improved visual style
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
        
        // Add subtle border
        this.ctx.strokeStyle = '#0055A4';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(modalX + 5, modalY + 5, modalWidth - 10, modalHeight - 10);
        this.ctx.restore();
        
        // --------- IMPROVED MODAL LAYOUT ENGINE ---------
        let currentY = modalY + 50; // Starting Y position with margin
        const centerX = this.canvas.width/2;
        
        // Title with proper spacing
        this.ctx.fillStyle = '#0055A4'; // Blue
        this.ctx.font = 'bold 28px Arial'; // Slightly smaller for less vertical space
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Butterfly Catching Records', centerX, currentY);
        currentY += 50; // Reduced space after title
        
        // Get records from local storage
        let records = [];
        try {
            const savedRecords = localStorage.getItem('butterflyGameRecords');
            if (savedRecords) {
                records = JSON.parse(savedRecords);
            }
        } catch (e) {
            console.log('Error loading records:', e);
        }
        
        if (records.length === 0) {
            // No records message - centered in modal
            const messageY = modalY + modalHeight/2 - 20; 
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'italic 24px Arial';
            this.ctx.fillText('No records saved yet!', centerX, messageY);
            this.ctx.font = '18px Arial';
            this.ctx.fillText('Play the game and save your scores to see them here.', centerX, messageY + 40);
        } else {
            // Calculate table dimensions with more padding
            const tableMargin = 30; // Margin from modal edges
            const tableWidth = modalWidth - (tableMargin * 2);
            const tableX = modalX + tableMargin;
            
            // Improved column widths calculation for better spacing
            const nameColWidth = Math.floor(tableWidth * 0.22); // 22% for name
            const dateColWidth = Math.floor(tableWidth * 0.35); // 35% for date
            const scoreColWidth = Math.floor(tableWidth * 0.18); // 18% for score
            const caughtColWidth = Math.floor(tableWidth * 0.25); // 25% for butterflies caught
            
            // Column positions (left edge of each column)
            const nameX = tableX;
            const dateX = nameX + nameColWidth;
            const scoreX = dateX + dateColWidth;
            const caughtX = scoreX + scoreColWidth;
            
            // Table header row with background
            this.ctx.fillStyle = '#0055A4'; // Blue header background
            this.ctx.fillRect(tableX, currentY - 25, tableWidth, 30);
            
            // Header text
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 16px Arial'; // Slightly smaller font
            this.ctx.textAlign = 'left';
            
            this.ctx.fillText('Player', nameX + 10, currentY - 5);
            this.ctx.fillText('Date', dateX + 10, currentY - 5);
            
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Score', scoreX + (scoreColWidth/2), currentY - 5);
            
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Butterflies', caughtX + (caughtColWidth/2), currentY - 5);
            
            currentY += 15; // Space after header
            
            // Sort records by score (highest first)
            records = records.sort((a, b) => b.score - a.score);
            
            // Determine how many records we can show - more compact rows
            const rowHeight = 30; // Reduced height from 35 to 30
            const tableBodyHeight = modalHeight - 160; // Space for table body
            const maxRows = Math.floor(tableBodyHeight / rowHeight);
            const recordsToShow = Math.min(maxRows, records.length);
            
            // Show records with improved layout
            this.ctx.font = '14px Arial'; // Smaller font for record rows
            
            for (let i = 0; i < recordsToShow; i++) {
                const record = records[i];
                const rowY = currentY + (i * rowHeight);
                
                // Add rank indicator for top 3
                if (i < 3) {
                    const rankColors = ['gold', 'silver', '#CD7F32']; // Gold, Silver, Bronze
                    const rankLabels = ['1st', '2nd', '3rd'];
                    
                    // Draw rank badge
                    this.ctx.save();
                    this.ctx.fillStyle = rankColors[i];
                    this.ctx.beginPath();
                    this.ctx.arc(nameX - 10, rowY + 5, 8, 0, Math.PI * 2); // Moved further left
                    this.ctx.fill();
                    
                    // Rank text
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = 'bold 9px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(rankLabels[i], nameX - 10, rowY + 8);
                    this.ctx.restore();
                }
                
                // Row background (alternating colors)
                if (i % 2 === 0) {
                    this.ctx.fillStyle = 'rgba(240, 248, 255, 0.5)'; // Light blue for even rows
                } else {
                    this.ctx.fillStyle = 'rgba(248, 248, 255, 0.3)'; // Very light blue for odd rows
                }
                this.ctx.fillRect(tableX, rowY - 15, tableWidth, rowHeight);
                
                // Truncate long player names and dates
                const truncateName = (name, maxLength = 12) => {
                    if (!name) return 'Anonymous';
                    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
                };
                
                const truncateDate = (date, maxLength = 20) => {
                    if (!date) return 'Unknown';
                    return date.length > maxLength ? date.substring(0, maxLength) + '...' : date;
                };
                
                // Player name (left-aligned)
                this.ctx.fillStyle = '#333';
                this.ctx.textAlign = 'left';
                this.ctx.font = 'bold 14px Arial';
                const playerName = truncateName(record.playerName);
                this.ctx.fillText(playerName, nameX + 5, rowY + 5);
                
                // Date (left-aligned) - truncated for space
                this.ctx.font = '14px Arial';
                const truncatedDate = truncateDate(record.date);
                this.ctx.fillText(truncatedDate, dateX + 5, rowY + 5);
                
                // Score (center-aligned)
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#0055A4'; // Blue for score
                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillText(record.score, scoreX + (scoreColWidth/2), rowY + 5);
                
                // Total butterflies caught (center-aligned)
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#333';
                this.ctx.font = '14px Arial';
                this.ctx.fillText(record.totalCaught, caughtX + (caughtColWidth/2), rowY + 5);
            }
            
            // Table border
            this.ctx.strokeStyle = '#aaa';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(tableX, currentY - 25, tableWidth, (recordsToShow * rowHeight) + 15);
        }
        
        // Close button - positioned lower at bottom of modal with more space
        const buttonWidth = 150;
        const buttonHeight = 40; // Slightly smaller height
        const buttonY = modalY + modalHeight - 30; // More space from bottom
        
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#0055A4'; // Blue
        this.ctx.fillRect(centerX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight);
        
        // Button border for better visibility
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(centerX - buttonWidth/2 + 2, buttonY - buttonHeight/2 + 2, buttonWidth - 4, buttonHeight - 4);
        this.ctx.restore();
        
        // Button text
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 18px Arial'; // Slightly smaller font
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Close', centerX, buttonY + 6);
        
        // Store button position for click handling
        this.modalCloseButton = {
            x: centerX - buttonWidth/2,
            y: buttonY - buttonHeight/2,
            width: buttonWidth,
            height: buttonHeight
        };
    }
    
    setupSummaryScreenListeners() {
        // Add click listener for buttons on the summary screen
        const summaryScreenClick = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // If we're showing the name input popup, don't handle other clicks
            if (this.showingNameInput) {
                return;
            }
            
            // If we're showing the records modal, handle clicks in the modal
            if (this.showingRecordsModal) {
                // Check if close button was clicked
                if (this.modalCloseButton && 
                    x >= this.modalCloseButton.x && 
                    x <= this.modalCloseButton.x + this.modalCloseButton.width && 
                    y >= this.modalCloseButton.y && 
                    y <= this.modalCloseButton.y + this.modalCloseButton.height) {
                    
                    // Close the modal and show the main summary screen again
                    this.showingRecordsModal = false;
                    this.renderSummaryScreen();
                }
                return;
            }
            
            // Check if Play Again button was clicked
            if (x >= this.summaryButtons.playAgain.x && 
                x <= this.summaryButtons.playAgain.x + this.summaryButtons.playAgain.width && 
                y >= this.summaryButtons.playAgain.y && 
                y <= this.summaryButtons.playAgain.y + this.summaryButtons.playAgain.height) {
                
                // Remove the click listener
                this.canvas.removeEventListener('click', summaryScreenClick);
                
                // Reset the summary screen flag
                this.showingSummaryScreen = false;
                this.showingRecordsModal = false;
                
                // Go back to start screen
                this.showStartScreen();
            }
            
            // Check if Save Record button was clicked
            if (x >= this.summaryButtons.saveRecord.x && 
                x <= this.summaryButtons.saveRecord.x + this.summaryButtons.saveRecord.width && 
                y >= this.summaryButtons.saveRecord.y && 
                y <= this.summaryButtons.saveRecord.y + this.summaryButtons.saveRecord.height) {
                
                // Go directly to high score submission instructions instead of showing name popup
                if (window.highScoreSystem) {
                    window.highScoreSystem.showSubmissionInstructions('', this.score);
                } else {
                    // Fallback to old method if high score system isn't available
                    this.showNameInputPopup();
                }
            }
            
            // Check if View Records button was clicked
            if (x >= this.summaryButtons.viewRecords.x && 
                x <= this.summaryButtons.viewRecords.x + this.summaryButtons.viewRecords.width && 
                y >= this.summaryButtons.viewRecords.y && 
                y <= this.summaryButtons.viewRecords.y + this.summaryButtons.viewRecords.height) {
                
                // Show the high score system instead if available
                if (window.highScoreSystem) {
                    window.highScoreSystem.toggleDisplay(true);
                } else {
                    // Fallback to old system if high score system is not available
                    this.showingRecordsModal = true;
                    this.renderRecordsModal();
                }
            }
        };
        
        this.canvas.addEventListener('click', summaryScreenClick);
    }
    
    showNameInputPopup() {
        // Flag to indicate we're currently showing the name input popup
        this.showingNameInput = true;
        
        // Current input name value (will be updated as user types)
        this.playerNameInput = '';
        
        // Create DOM elements for name input - using a visible interactive input
        this.createNameInputElements();
        
        // Draw the initial popup background
        this.renderNameInputPopupBackground();
        
        // Setup keyboard and mouse event listeners
        this.setupNameInputListeners();
    }
    
    createNameInputElements() {
        // Create a container for the input field that will be positioned over the canvas
        const inputContainer = document.createElement('div');
        inputContainer.id = 'name-input-container';
        inputContainer.style.position = 'absolute';
        inputContainer.style.zIndex = '1000';
        inputContainer.style.display = 'flex';
        inputContainer.style.flexDirection = 'column';
        inputContainer.style.alignItems = 'center';
        inputContainer.style.justifyContent = 'center';
        
        // Calculate position to match where we'll draw the input box on canvas
        const popupWidth = 400;
        const popupHeight = 220;
        const popupX = this.canvas.width/2 - popupWidth/2;
        const popupY = this.canvas.height/2 - popupHeight/2;
        
        // Position the container to match where the input field will be drawn
        const inputWidth = 300;
        const inputHeight = 40;
        const inputX = this.canvas.width/2 - inputWidth/2;
        const inputY = popupY + 80;
        
        const rect = this.canvas.getBoundingClientRect();
        inputContainer.style.top = `${rect.top + inputY}px`;
        inputContainer.style.left = `${rect.left + inputX}px`;
        inputContainer.style.width = `${inputWidth}px`;
        inputContainer.style.height = `${inputHeight}px`;
        
        // Create the visible input field that users can interact with directly
        const visibleInput = document.createElement('input');
        visibleInput.type = 'text';
        visibleInput.id = 'visible-name-input';
        visibleInput.placeholder = 'Type your name...';
        visibleInput.maxLength = 15; // Limit name length
        visibleInput.style.width = '100%';
        visibleInput.style.height = '100%';
        visibleInput.style.padding = '8px 10px';
        visibleInput.style.fontSize = '20px';
        visibleInput.style.border = '1px solid #999';
        visibleInput.style.borderRadius = '4px';
        visibleInput.style.backgroundColor = '#f0f0f0';
        visibleInput.style.outline = 'none';
        
        // Add the input to the container
        inputContainer.appendChild(visibleInput);
        document.body.appendChild(inputContainer);
        
        // Store references
        this.nameInputContainer = inputContainer;
        this.visibleNameInput = visibleInput;
        
        // Focus the input field immediately
        setTimeout(() => {
            try {
                visibleInput.focus();
            } catch (e) {
                console.log('Error focusing visible input:', e);
            }
        }, 50);
    }
    
    setupNameInputListeners() {
        // Handle keyboard input for the visible field
        this.keyboardHandler = (e) => {
            // Update the stored input value from the field
            this.playerNameInput = this.visibleNameInput.value;
            
            // Handle Enter key to submit
            if (e.key === 'Enter') {
                this.submitPlayerName();
                e.preventDefault(); // Prevent default form submission behavior
            }
            
            // Handle Escape key to cancel
            if (e.key === 'Escape') {
                this.cancelNameInput();
                e.preventDefault();
            }
        };
        
        // Listen for all keyboard events
        this.visibleNameInput.addEventListener('input', this.keyboardHandler);
        this.visibleNameInput.addEventListener('keydown', this.keyboardHandler);
        
        // Add click listeners for the submit and cancel buttons
        this.nameInputClickHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if submit button was clicked
            if (this.nameInputSubmitButton && 
                x >= this.nameInputSubmitButton.x && 
                x <= this.nameInputSubmitButton.x + this.nameInputSubmitButton.width && 
                y >= this.nameInputSubmitButton.y && 
                y <= this.nameInputSubmitButton.y + this.nameInputSubmitButton.height) {
                
                this.submitPlayerName();
            }
            
            // Check if cancel button was clicked
            if (this.nameInputCancelButton && 
                x >= this.nameInputCancelButton.x && 
                x <= this.nameInputCancelButton.x + this.nameInputCancelButton.width && 
                y >= this.nameInputCancelButton.y && 
                y <= this.nameInputCancelButton.y + this.nameInputCancelButton.height) {
                
                this.cancelNameInput();
            }
        };
        
        this.canvas.addEventListener('click', this.nameInputClickHandler);
        
        // Add window resize handler to reposition the input field
        this.nameInputResizeHandler = () => {
            if (this.showingNameInput && this.nameInputContainer) {
                // Recalculate position
                const popupWidth = 400;
                const popupHeight = 220;
                const popupY = this.canvas.height/2 - popupHeight/2;
                
                const inputWidth = 300;
                const inputX = this.canvas.width/2 - inputWidth/2;
                const inputY = popupY + 80;
                
                const rect = this.canvas.getBoundingClientRect();
                this.nameInputContainer.style.top = `${rect.top + inputY}px`;
                this.nameInputContainer.style.left = `${rect.left + inputX}px`;
            }
        };
        
        window.addEventListener('resize', this.nameInputResizeHandler);
    }
    
    renderNameInputPopupBackground() {
        // Draw only the popup background and buttons (not the input field)
        const popupWidth = 400;
        const popupHeight = 220;
        const popupX = this.canvas.width/2 - popupWidth/2;
        const popupY = this.canvas.height/2 - popupHeight/2;
        
        // Clear the area where the popup will be drawn
        this.ctx.clearRect(popupX - 20, popupY - 20, popupWidth + 40, popupHeight + 40);
        
        // Draw semi-transparent overlay behind popup
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw popup background with improved shadow
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 3;
        this.ctx.shadowOffsetY = 3;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.fillRect(popupX, popupY, popupWidth, popupHeight);
        this.ctx.restore();
        
        // Add decorative border
        this.ctx.strokeStyle = '#0055A4'; // French blue
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(popupX + 5, popupY + 5, popupWidth - 10, popupHeight - 10);
        
        // Popup title with subtle shadow
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        this.ctx.fillStyle = '#0055A4';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Enter Your Name', this.canvas.width/2, popupY + 40);
        this.ctx.restore();
        
        // Input field background - we just draw the outline since we're using a real input
        const inputWidth = 300;
        const inputHeight = 40;
        const inputX = this.canvas.width/2 - inputWidth/2;
        const inputY = popupY + 80;
        
        // Draw just a subtle hint of the field location (will be covered by real input)
        this.ctx.fillStyle = 'rgba(240, 240, 240, 0.5)';
        this.ctx.fillRect(inputX, inputY, inputWidth, inputHeight);
        
        // Buttons
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonSpacing = 20;
        const buttonsY = popupY + 150;
        
        // Submit button - moved slightly lower to avoid overlap
        const submitX = this.canvas.width/2 - buttonWidth - buttonSpacing/2;
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.fillStyle = '#32CD32'; // Green
        this.ctx.fillRect(submitX, buttonsY, buttonWidth, buttonHeight);
        this.ctx.restore();
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Save', submitX + buttonWidth/2, buttonsY + 27);
        
        // Store submit button position for click handling
        this.nameInputSubmitButton = {
            x: submitX,
            y: buttonsY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Cancel button
        const cancelX = this.canvas.width/2 + buttonSpacing/2;
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.fillStyle = '#FF6347'; // Tomato red
        this.ctx.fillRect(cancelX, buttonsY, buttonWidth, buttonHeight);
        this.ctx.restore();
        
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Cancel', cancelX + buttonWidth/2, buttonsY + 27);
        
        // Store cancel button position for click handling
        this.nameInputCancelButton = {
            x: cancelX,
            y: buttonsY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Help text - positioned below buttons with more space
        this.ctx.fillStyle = '#666';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Press Enter to save or Escape to cancel', this.canvas.width/2, buttonsY + 70);
    }
    
    // Compatibility method for any code that might call the old method name
    renderNameInputPopup() {
        // Update our visible input element with the current value
        if (this.visibleNameInput) {
            this.playerNameInput = this.visibleNameInput.value;
        }
        
        // Only redraw the background
        this.renderNameInputPopupBackground();
    }
    
    submitPlayerName() {
        // Clean up input elements
        this.cleanupNameInput();
        
        // Get the entered name (or use default if empty)
        const playerName = this.playerNameInput.trim() || 'Anonymous';
        
        // Use the legacy method directly - we no longer need the intermediate step
        // since we're going straight to the highscore instructions from the button click
        this.saveGameRecords(playerName);
        
        // Show confirmation
        this.showSaveConfirmation(playerName);
    }
    
    cancelNameInput() {
        // Clean up input elements
        this.cleanupNameInput();
        
        // Redraw the summary screen
        this.renderSummaryScreen();
    }
    
    cleanupNameInput() {
        // Remove the visible input container and element
        if (this.nameInputContainer && this.nameInputContainer.parentNode) {
            this.nameInputContainer.parentNode.removeChild(this.nameInputContainer);
        }
        
        // Remove all event listeners
        if (this.visibleNameInput) {
            this.visibleNameInput.removeEventListener('input', this.keyboardHandler);
            this.visibleNameInput.removeEventListener('keydown', this.keyboardHandler);
        }
        
        if (this.nameInputClickHandler) {
            this.canvas.removeEventListener('click', this.nameInputClickHandler);
        }
        
        if (this.nameInputResizeHandler) {
            window.removeEventListener('resize', this.nameInputResizeHandler);
        }
        
        // Reset all flags and references
        this.showingNameInput = false;
        this.playerNameInput = this.visibleNameInput ? this.visibleNameInput.value : '';
        this.nameInputContainer = null;
        this.visibleNameInput = null;
        this.keyboardHandler = null;
        this.nameInputClickHandler = null;
        this.nameInputResizeHandler = null;
    }
    
    showSaveConfirmation(playerName) {
        // Draw a popup notification on the summary screen
        const notificationWidth = 320;
        const notificationHeight = 100;
        const notificationX = this.canvas.width/2 - notificationWidth/2;
        const notificationY = this.canvas.height/2 - 100;
        
        // Draw notification background with animation
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = 'rgba(50, 205, 50, 0.9)'; // Green with transparency
        this.ctx.fillRect(notificationX, notificationY, notificationWidth, notificationHeight);
        this.ctx.restore();
        
        // Add border
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(notificationX + 5, notificationY + 5, notificationWidth - 10, notificationHeight - 10);
        
        // Add confirmation text
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Record Saved!', this.canvas.width/2, notificationY + 35);
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`${playerName}'s butterfly catches have been recorded`, this.canvas.width/2, notificationY + 60);
        this.ctx.fillText(`Score: ${this.score} points`, this.canvas.width/2, notificationY + 85);
        
        // Automatically fade out notification after 2 seconds
        setTimeout(() => {
            // Redraw the summary screen to remove the notification
            if (this.showingSummaryScreen) {
                this.renderSummaryScreen();
            }
        }, 2500);
    }
    
    saveGameRecords(playerName = 'Anonymous') {
        // Create a record object with player name, date, score, and butterfly counts
        const record = {
            playerName: playerName,
            date: new Date().toLocaleString(),
            score: this.score,
            butterflyCounts: {...this.butterflyCounts},
            totalCaught: Object.values(this.butterflyCounts).reduce((sum, count) => sum + count, 0)
        };
        
        // Get existing records from local storage or create empty array
        let records = [];
        try {
            const savedRecords = localStorage.getItem('butterflyGameRecords');
            if (savedRecords) {
                records = JSON.parse(savedRecords);
            }
        } catch (e) {
            console.log('Error loading existing records:', e);
        }
        
        // Add new record
        records.push(record);
        
        // Keep only the last 10 records
        if (records.length > 10) {
            records = records.slice(records.length - 10);
        }
        
        // Save back to local storage
        try {
            localStorage.setItem('butterflyGameRecords', JSON.stringify(records));
            console.log('Game record saved successfully!');
        } catch (e) {
            console.log('Error saving game record:', e);
        }
        
        // Submit to high score system if available - use the new instruction modal instead
        if (window.highScoreSystem) {
            console.log('Showing high score submission instructions');
            window.highScoreSystem.showSubmissionInstructions(playerName, this.score);
        }
    }
    
    drawVictoryButterflies() {
        console.log("Drawing victory butterflies");
        // Get the bounds of the panel where content is displayed
        const isSmallScreen = this.canvas.height < 700 || this.canvas.width < 1000;
        const panelWidth = Math.min(Math.max(isSmallScreen ? 500 : 650, this.canvas.width * 0.9), this.canvas.width - 30);
        const panelHeight = Math.min(Math.max(isSmallScreen ? 400 : 500, this.canvas.height * 0.9), this.canvas.height - 30);
        const panelX = this.canvas.width / 2 - panelWidth / 2;
        const panelY = this.canvas.height / 2 - panelHeight / 2;
        
        // Place one different butterfly in each corner with wing flapping animation
        const cornerButterflies = [
            // Top-left corner butterfly
            {
                x: Math.max(60, panelX * 0.25),
                y: Math.max(60, panelY * 0.25),
                level: 3, // Orange butterfly
                scale: 1.4,
                rotation: Math.PI / 6
            },
            // Top-right corner butterfly
            {
                x: Math.min(this.canvas.width - 60, panelX + panelWidth + 80),
                y: Math.max(60, panelY * 0.25),
                level: 8, // Purple butterfly
                scale: 1.5,
                rotation: -Math.PI / 8
            },
            // Bottom-left corner butterfly
            {
                x: Math.max(60, panelX * 0.3),
                y: Math.min(this.canvas.height - 60, panelY + panelHeight + 80),
                level: 5, // Pink butterfly
                scale: 1.3,
                rotation: Math.PI / 12
            },
            // Bottom-right corner butterfly
            {
                x: Math.min(this.canvas.width - 60, panelX + panelWidth + 80),
                y: Math.min(this.canvas.height - 60, panelY + panelHeight + 80),
                level: 10, // Queen butterfly
                scale: 1.6,
                rotation: -Math.PI / 12
            }
        ];
        
        // Set fixed positions for small screens to ensure butterflies are visible
        if (isSmallScreen) {
            cornerButterflies[0].x = 80; // Top-left
            cornerButterflies[0].y = 80;
            
            cornerButterflies[1].x = this.canvas.width - 80; // Top-right
            cornerButterflies[1].y = 80;
            
            cornerButterflies[2].x = 80; // Bottom-left
            cornerButterflies[2].y = this.canvas.height - 80;
            
            cornerButterflies[3].x = this.canvas.width - 80; // Bottom-right
            cornerButterflies[3].y = this.canvas.height - 80;
        }
        
        // Get the current time for wing flapping animation
        const now = Date.now() / 1000;
        
        // Draw each corner butterfly
        for (const b of cornerButterflies) {
            // Always draw all butterflies - don't filter them out
            const imgIndex = Math.min(b.level - 1, this.butterflyImages.length - 1);
            if (imgIndex >= 0 && imgIndex < this.butterflyImages.length) {
                const img = this.butterflyImages[imgIndex];
                
                if (img && img.complete && img.naturalWidth !== 0) {
                    this.ctx.save();
                    
                    // Add subtle glow effect based on butterfly level
                    if (b.level === 10) { // Queen butterfly
                        this.ctx.shadowColor = 'rgba(255, 215, 0, 0.6)'; // Gold glow
                        this.ctx.shadowBlur = 15;
                    } else if (b.level === 8) {
                        this.ctx.shadowColor = 'rgba(135, 206, 235, 0.6)'; // Sky blue glow
                        this.ctx.shadowBlur = 12;
                    } else if (b.level === 5) {
                        this.ctx.shadowColor = 'rgba(255, 105, 180, 0.5)'; // Pink glow
                        this.ctx.shadowBlur = 10;
                    } else if (b.level === 3) {
                        this.ctx.shadowColor = 'rgba(255, 165, 0, 0.5)'; // Orange glow
                        this.ctx.shadowBlur = 10;
                    }
                    
                    // Position the butterfly
                    this.ctx.translate(b.x, b.y);
                    this.ctx.rotate(b.rotation);
                    this.ctx.scale(b.scale, b.scale);
                    
                    // Apply wing flapping animation - same technique as in butterfly.js
                    const wingFlapTime = now + (b.level * 0.2); // Different offset for each butterfly
                    const wingFlapSpeed = 0.08 + (b.level * 0.008); // Same formula from butterfly.js
                    const wingFlapState = Math.abs(Math.sin(wingFlapTime / wingFlapSpeed * Math.PI));
                    
                    // Apply the wing flap scale effect
                    const wingScale = 0.8 + (wingFlapState * 0.4);
                    this.ctx.scale(wingScale, 1);
                    
                    // Draw the butterfly
                    const size = 70;
                    this.ctx.drawImage(img, -size/2, -size/2, size, size);
                    
                    this.ctx.restore();
                } else {
                    console.log("Butterfly image not loaded properly");
                }
            } else {
                console.log("Invalid butterfly index:", imgIndex);
            }
        }
    }
    
    updateUI() {
        // Update the HTML elements if they exist
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score;
        }
        if (this.levelElement) {
            this.levelElement.textContent = this.currentLevel;
        }
    }
    
    resizeCanvas() {
        // Simpler approach that doesn't use device pixel ratio scaling 
        // but ensures everything is properly sized and centered
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Log the canvas size for debugging
        console.log(`Canvas resized to: ${this.canvas.width}x${this.canvas.height}`);
        
        // Clear the entire canvas to ensure no artifacts
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw content immediately to prevent flickering
        if (this.showingStartScreen) {
            this.renderStartScreen();
        } else if (this.showingInstructions) {
            this.renderInstructionsScreen();
        } else if (this.showingSummaryScreen) {
            this.renderSummaryScreen();
        }
    }
}

// Initialize game when window loads
window.addEventListener('load', () => {
    console.log("Window loaded - initializing game");
    
    // Debug element to show progress on screen
    const createDebugElement = (message, isError = false) => {
        const debugDiv = document.createElement('div');
        debugDiv.style.position = 'absolute';
        debugDiv.style.top = isError ? '50px' : '10px';
        debugDiv.style.left = '10px';
        debugDiv.style.color = isError ? 'red' : 'green';
        debugDiv.style.background = 'rgba(0,0,0,0.7)';
        debugDiv.style.padding = '10px';
        debugDiv.style.zIndex = '9999';
        debugDiv.style.fontFamily = 'Arial, sans-serif';
        debugDiv.style.fontSize = '16px';
        debugDiv.textContent = message;
        document.body.appendChild(debugDiv);
        console.log(message);
        return debugDiv;
    };
    
    // Show initialization message
    const initMessage = createDebugElement("Starting game initialization...");
    
    try {
        // Verify canvas exists
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            throw new Error("Canvas element not found!");
        }
        
        // Update debug message
        initMessage.textContent = "Canvas found, creating game instance...";
        
        const game = new Game();
        
        // Add more detailed error handling for async initialization
        game.init()
            .then(() => {
                // Success - remove debug message after successful initialization
                setTimeout(() => {
                    if (initMessage && initMessage.parentNode) {
                        initMessage.parentNode.removeChild(initMessage);
                    }
                }, 2000);
            })
            .catch(e => {
                console.error("Error initializing game:", e);
                initMessage.textContent = "Game initialization failed! See console for details.";
                
                // Emergency fallback if game init fails - show something
                const ctx = canvas.getContext('2d');
                
                // Draw error message on canvas
                ctx.fillStyle = 'blue';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = '30px Arial';
                ctx.textAlign = 'center';
                ctx.fillText("Game loading error. Please refresh.", canvas.width/2, canvas.height/2);
                ctx.font = '18px Arial';
                ctx.fillText("Error: " + e.message, canvas.width/2, canvas.height/2 + 40);
                
                // Display detailed error on screen too
                createDebugElement("Error details: " + e.message, true);
            });
    } catch (e) {
        console.error("Critical error creating game:", e);
        initMessage.textContent = "Critical error: " + e.message;
        
        // Show error on page too
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.color = 'white';
        errorDiv.style.background = 'rgba(255,0,0,0.8)';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '10px';
        errorDiv.style.fontFamily = 'Arial, sans-serif';
        errorDiv.style.textAlign = 'center';
        errorDiv.innerHTML = `
            <h2>Game Failed to Load</h2>
            <p>${e.message}</p>
            <p>Please check browser console for details.</p>
            <button onclick="location.reload()" style="margin-top:10px; padding:5px 10px;">Retry</button>
        `;
        document.body.appendChild(errorDiv);
    }
});