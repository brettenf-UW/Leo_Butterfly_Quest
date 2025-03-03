class Butterfly {
    constructor(game, image, level) {
        this.game = game;
        this.image = image;
        this.level = level;
        
        // Butterfly position and size - smaller at higher levels to make them harder to catch
        const baseSize = 50; // Make base size bigger
        const sizeFactor = Math.max(1.2 - (level * 0.05), 0.7); // Size decreases with level
        this.width = baseSize * sizeFactor;
        this.height = baseSize * sizeFactor;
        
        // Initial position will be set by the formation logic
        this.x = 0;
        this.y = 0;
        
        // Movement parameters (butterflies get faster with level)
        this.baseSpeed = 80 + (level * 15); // Increased base speed and level scaling
        this.speed = this.baseSpeed;
        
        // Direction change frequency increases with level (lower interval = more changes)
        this.directionChangeInterval = Math.max(2.5 - (level * 0.2), 0.3); // seconds
        this.timeSinceDirectionChange = 0;
        
        // Default direction - will be set by the formation logic
        this.direction = 0;
        this.vx = 0;
        this.vy = 0;
        
        // Flutter animation - faster wing flaps at higher levels
        this.wingFlapSpeed = 0.08 + (level * 0.008); // seconds per flap cycle
        this.wingFlapTime = 0;
        this.wingFlapState = 0; // 0 to 1, for wing animation
        
        // Movement pattern will be set based on formation and level
        this.movementPattern = 'linear'; // Default, will be overridden
        
        // Catch radius (how close the player needs to be to catch)
        // Make it harder to catch at higher levels
        this.catchRadius = Math.max(40 - (level * 3), 15);
        
        // Track if this butterfly has crossed through the screen (for removal logic)
        this.hasCrossedScreen = false;
        
        // Flag for removal when it goes off screen after crossing
        this.shouldRemove = false;
        
        // Boss butterfly properties
        this.isBoss = false; // Set to true for boss butterfly
        this.health = 1; // Default health is 1 (boss will have more)
    }
    
    setRandomPosition() {
        // Determine which edge to spawn on (0: top, 1: right, 2: bottom, 3: left)
        const edge = Math.floor(Math.random() * 4);
        
        switch (edge) {
            case 0: // Top
                this.x = Math.random() * this.game.canvas.width;
                this.y = -this.height;
                break;
            case 1: // Right
                this.x = this.game.canvas.width + this.width;
                this.y = Math.random() * this.game.canvas.height;
                break;
            case 2: // Bottom
                this.x = Math.random() * this.game.canvas.width;
                this.y = this.game.canvas.height + this.height;
                break;
            case 3: // Left
                this.x = -this.width;
                this.y = Math.random() * this.game.canvas.height;
                break;
        }
    }
    
    setRandomDirection() {
        // Random angle in radians (0 to 2π)
        this.direction = Math.random() * Math.PI * 2;
        
        // Adjust angle slightly to ensure butterfly moves toward the screen
        if (this.x < 0 && (this.direction > Math.PI / 2 && this.direction < Math.PI * 1.5)) {
            this.direction = randomBetween(-Math.PI / 4, Math.PI / 4);
        } else if (this.x > this.game.canvas.width && (this.direction < Math.PI / 2 || this.direction > Math.PI * 1.5)) {
            this.direction = randomBetween(Math.PI * 0.75, Math.PI * 1.25);
        } else if (this.y < 0 && this.direction > Math.PI) {
            this.direction = randomBetween(0, Math.PI);
        } else if (this.y > this.game.canvas.height && this.direction < Math.PI) {
            this.direction = randomBetween(Math.PI, Math.PI * 2);
        }
        
        // Calculate velocity components
        this.vx = Math.cos(this.direction) * this.speed;
        this.vy = Math.sin(this.direction) * this.speed;
    }
    
    getMovementPattern() {
        // Different movement patterns based on butterfly level
        switch (this.level) {
            case 1:
                return 'linear'; // Simple horizontal movement
            case 2:
                return 'zigzag'; // Zigzag pattern
            case 3:
                return 'wave'; // Smooth wave pattern
            case 4:
                return 'circular'; // Circular movement
            case 5:
                return 'bounce'; // Bounces off edges
            case 6:
                return 'direct'; // Fixed for level 6 - just go straight through (faster)
            case 7:
                return 'erratic'; // Random direction changes
            case 8:
                return 'figure8'; // Figure-8 pattern
            case 9:
                return 'spiral'; // Spiral movement
            case 10:
                return 'chase'; // Follows the player somewhat
            case 11:
                return 'zigzag'; // Higher level patterns
            case 12:
                return 'wave';
            case 13:
                return 'circular';
            case 14:
                return 'bounce';
            case 15:
                return 'chase';
            default:
                // For any unexpected levels, combine patterns with higher speed
                const patterns = ['zigzag', 'wave', 'circular', 'bounce', 'direct', 'erratic', 'figure8', 'spiral'];
                return patterns[Math.floor(Math.random() * patterns.length)];
        }
    }
    
    update(deltaTime) {
        // Update wing flap animation
        this.wingFlapTime += deltaTime;
        this.wingFlapState = Math.abs(Math.sin(this.wingFlapTime / this.wingFlapSpeed * Math.PI));
        
        // Simple, direct movement pattern to reduce lag
        if (this.movementPattern === 'direct') {
            // Continue in the same direction with minimal adjustments
            
            // Optional: slight wobble to make movement more natural
            if (Math.random() < 0.05) { // Only 5% chance per frame to change
                // Very small random direction adjustment
                this.direction += (Math.random() - 0.5) * 0.1;
                this.vx = Math.cos(this.direction) * this.speed;
                this.vy = Math.sin(this.direction) * this.speed;
            }
        }
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Define the margin for respawning
        const margin = 100; // Large margin to ensure butterflies go off screen
        
        // Track if butterfly has crossed through the visible screen area
        if (!this.hasCrossedScreen) {
            // Check if butterfly is currently in the visible screen area
            const isVisible = 
                this.x > 0 && 
                this.x < this.game.canvas.width && 
                this.y > 0 && 
                this.y < this.game.canvas.height;
            
            if (isVisible) {
                this.hasCrossedScreen = true;
                
                // Apply a slight boost to ensure it continues through the screen
                this.speed *= 1.05;
                this.vx = Math.cos(this.direction) * this.speed;
                this.vy = Math.sin(this.direction) * this.speed;
            }
        }
        
        // If butterfly goes way off screen, remove it
        // No more respawning - we want them to cross the screen once and be gone
        if (this.x < -margin || 
            this.x > this.game.canvas.width + margin ||
            this.y < -margin || 
            this.y > this.game.canvas.height + margin) {
            
            // Only remove if it's been on screen (crossed through)
            if (this.hasCrossedScreen) {
                // Flag for removal
                this.shouldRemove = true;
            }
        }
    }
    
    draw(ctx) {
        try {
            ctx.save();
            
            // Draw butterfly at its position
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            
            // Rotate in the direction of movement
            const angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            
            // Apply wing flap effect by scaling the width
            const wingScale = 0.8 + (this.wingFlapState * 0.4);
            ctx.scale(wingScale, 1);
            
            // Check if image is valid before drawing
            if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
                // For boss butterfly, add special effects
                if (this.isBoss) {
                    // Add glow effect for boss
                    ctx.shadowColor = 'gold';
                    ctx.shadowBlur = 15;
                    
                    // Draw a crown above the boss butterfly
                    ctx.save();
                    ctx.rotate(-angle); // Counter-rotate to draw crown upright
                    
                    // Gold crown
                    ctx.fillStyle = '#FFD700'; // Gold
                    ctx.beginPath();
                    ctx.moveTo(-this.width/4, -this.height/2 - 15);
                    ctx.lineTo(-this.width/8, -this.height/2 - 25);
                    ctx.lineTo(0, -this.height/2 - 15);
                    ctx.lineTo(this.width/8, -this.height/2 - 25);
                    ctx.lineTo(this.width/4, -this.height/2 - 15);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Reset rotation
                    ctx.restore();
                    
                    // Draw health bar if boss has taken damage
                    if (this.health < 5) {
                        ctx.save();
                        ctx.rotate(-angle); // Counter-rotate for health bar
                        
                        // Health bar background
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                        ctx.fillRect(-this.width/2, -this.height/2 - 10, this.width, 5);
                        
                        // Health remaining
                        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
                        ctx.fillRect(-this.width/2, -this.height/2 - 10, this.width * (this.health / 5), 5);
                        
                        ctx.restore();
                    }
                }
                
                // Draw the butterfly image
                ctx.drawImage(
                    this.image, 
                    -this.width / 2, -this.height / 2, 
                    this.width, this.height
                );
            } else {
                // Fallback: draw a colored circle as butterfly
                ctx.fillStyle = this.getFallbackColor();
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Add simple wings
                ctx.fillStyle = this.getFallbackColor(0.7);
                ctx.beginPath();
                ctx.ellipse(-this.width / 2, 0, this.width / 2, this.height / 3, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.ellipse(this.width / 2, 0, this.width / 2, this.height / 3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        } catch (e) {
            console.log('Error drawing butterfly:', e);
        }
    }
    
    getFallbackColor(alpha = 1) {
        // Different colors based on butterfly level
        const colors = [
            `rgba(255, 255, 0, ${alpha})`,    // Yellow (level 1)
            `rgba(100, 200, 255, ${alpha})`,  // Light blue (level 2)
            `rgba(255, 165, 0, ${alpha})`,    // Orange (level 3)
            `rgba(255, 105, 180, ${alpha})`,  // Pink (level 4)
            `rgba(128, 0, 128, ${alpha})`,    // Purple (level 5)
            `rgba(0, 128, 0, ${alpha})`,      // Green (level 6+)
        ];
        
        return colors[Math.min(this.level - 1, colors.length - 1)];
    }
    
    checkCatch(x, y) {
        // Calculate distance between butterfly center and click/net position
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const dist = distance(centerX, centerY, x, y);
        
        // Check if click is within catch radius
        const isCaught = dist <= this.catchRadius + this.game.player.netRadius;
        
        // For boss butterfly, handle multiple hits
        if (isCaught && this.isBoss && this.health) {
            this.health--;
            
            // Only remove if health is depleted
            if (this.health <= 0) {
                return true;
            } else {
                // Boss was hit but not defeated - flash effect and direction change
                this.speed *= 1.1; // Speed up slightly on each hit
                this.direction = Math.random() * Math.PI * 2; // Change direction
                this.vx = Math.cos(this.direction) * this.speed;
                this.vy = Math.sin(this.direction) * this.speed;
                
                // Return false since boss is not caught yet
                return false;
            }
        }
        
        return isCaught;
    }
}