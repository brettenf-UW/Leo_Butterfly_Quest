class Player {
    constructor(game) {
        this.game = game;
        
        // Player's position
        this.x = game.canvas.width / 2;
        this.y = game.canvas.height / 2;
        
        // Character dimensions - increased to make character bigger
        this.characterWidth = 100;
        this.characterHeight = 150;
        
        // Set the character's catch radius (for butterfly catching)
        this.netRadius = 40; // This is now representing how close butterflies need to be to the character
        
        // Load character image
        this.characterImage = new Image();
        this.characterImage.src = 'assets/sprites/character.svg';
        this.characterImage.onerror = () => {
            console.log('Failed to load character image');
        };
    }
    
    updatePosition(e) {
        const rect = this.game.canvas.getBoundingClientRect();
        this.x = e.clientX - rect.left;
        this.y = e.clientY - rect.top;
    }
    
    draw(ctx) {
        try {
            ctx.save();
            
            // Center the character on the cursor position
            const characterX = this.x - this.characterWidth / 2;
            const characterY = this.y - this.characterHeight / 2;
            
            // Draw character if image is loaded, otherwise draw simplified character
            if (this.characterImage && this.characterImage.complete && this.characterImage.naturalWidth !== 0) {
                ctx.drawImage(this.characterImage, characterX, characterY, this.characterWidth, this.characterHeight);
            } else {
                // Draw a simplified character
                this.drawSimplifiedCharacter(ctx, characterX, characterY);
            }
            
            // Draw hit area indicator (debug only - remove or comment out in final version)
            // ctx.beginPath();
            // ctx.arc(this.x, this.y, this.netRadius, 0, Math.PI * 2);
            // ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            // ctx.lineWidth = 2;
            // ctx.stroke();
            
            ctx.restore();
        } catch (e) {
            console.log('Error drawing player:', e);
        }
    }
    
    drawSimplifiedCharacter(ctx, x, y) {
        const width = this.characterWidth;
        const height = this.characterHeight;
        
        // Body (blue and white striped shirt)
        ctx.fillStyle = 'white';
        ctx.fillRect(x + width * 0.35, y + height * 0.33, width * 0.3, height * 0.4);
        
        // Stripes
        ctx.fillStyle = '#3333FF';
        ctx.fillRect(x + width * 0.35, y + height * 0.33, width * 0.3, height * 0.08);
        ctx.fillRect(x + width * 0.35, y + height * 0.49, width * 0.3, height * 0.08);
        ctx.fillRect(x + width * 0.35, y + height * 0.65, width * 0.3, height * 0.08);
        
        // Head
        ctx.fillStyle = '#FFE0BD'; // Skin tone
        ctx.fillRect(x + width * 0.3, y + height * 0.05, width * 0.4, height * 0.28);
        
        // Beret
        ctx.fillStyle = '#D22B2B'; // Red
        ctx.fillRect(x + width * 0.25, y, width * 0.5, height * 0.05);
        
        // Face features
        ctx.fillStyle = 'black';
        ctx.fillRect(x + width * 0.35, y + height * 0.15, width * 0.05, height * 0.05); // Left eye
        ctx.fillRect(x + width * 0.6, y + height * 0.15, width * 0.05, height * 0.05); // Right eye
        ctx.fillRect(x + width * 0.4, y + height * 0.25, width * 0.2, height * 0.02); // Mustache
        
        // Arms
        ctx.fillStyle = 'white';
        ctx.fillRect(x + width * 0.2, y + height * 0.33, width * 0.15, height * 0.08); // Left arm
        ctx.fillRect(x + width * 0.65, y + height * 0.33, width * 0.15, height * 0.08); // Right arm
        
        // Legs
        ctx.fillStyle = '#0000AA';
        ctx.fillRect(x + width * 0.4, y + height * 0.73, width * 0.08, height * 0.17); // Left leg
        ctx.fillRect(x + width * 0.53, y + height * 0.73, width * 0.08, height * 0.17); // Right leg
        
        // Butterfly net (held in right hand)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x + width * 0.8, y + height * 0.33, width * 0.05, height * 0.3); // Net handle
        
        // Net frame
        ctx.beginPath();
        ctx.moveTo(x + width * 0.85, y + height * 0.33);
        ctx.lineTo(x + width * 0.95, y + height * 0.2);
        ctx.lineTo(x + width * 1.1, y + height * 0.33);
        ctx.lineTo(x + width * 0.95, y + height * 0.46);
        ctx.closePath();
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Net mesh
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }
}