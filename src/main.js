import Phaser from 'phaser';

const COLORS = {
  blue: 0x4a90e2,
  yellow: 0xf5d547,
  red: 0xe74c3c
};

const COLOR_ORDER = ['blue', 'yellow', 'red'];
const INITIAL_PLATFORM_WIDTH = 200;
const MIN_PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 20;
const PLATFORM_GAP = 140;
const PLATFORM_SPEED = 320;
const GRAVITY = 900;
const JUMP_FORCE = 400;
const PLATFORM_SHRINK_RATE = 8; // pixels per second

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Game state
    this.gameOver = false;
    this.elapsedTime = 0;
    this.playerX = 40;
    this.playerY = 400;
    this.velocityY = 0;
    this.isJumping = false;
    this.currentPlatform = null;
    this.platformCounter = 0;
    this.deathReason = null; // Track how the player died
    this.gameOverAnimationPlaying = false;
    this.currentPlatformWidth = INITIAL_PLATFORM_WIDTH;
    
    // Create background
    this.backgroundRect = this.add.rectangle(400, 300, 800, 600, 0x1a1a1a);

    // Create platforms group
    this.platforms = this.add.group();
    
    // Spawn initial platforms - player starts on blue platform
    this.spawnInitialPlatforms();

    // Create player
    this.player = this.add.rectangle(this.playerX, this.playerY, 24, 32, 0xffffff);
    this.player.setOrigin(0.5, 0.5);

    // UI Panel background
    this.uiPanel = this.add.rectangle(400, 540, 800, 120, 0x1a1a1a);
    this.uiPanel.setOrigin(0.5, 0.5);
    this.uiPanel.setStrokeStyle(2, 0x444444);

    // Current platform color display
    this.platformColorDisplay = this.add.rectangle(150, 540, 120, 50, COLORS.blue);
    this.platformColorDisplay.setOrigin(0.5, 0.5);
    this.platformColorDisplay.setStrokeStyle(2, 0x888888);
    this.add.text(150, 560, 'PLATFORM', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5, 0);

    // Color button (cycle platform color)
    this.colorButton = this.add.rectangle(300, 540, 100, 50, 0x666666);
    this.colorButton.setInteractive({ useHandCursor: true });
    this.colorButton.on('pointerdown', () => this.cycleCurrentPlatformColor());
    this.colorButton.setStrokeStyle(2, 0x888888);
    this.add.text(300, 540, 'CYCLE', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#000000',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5, 0.5);

    // Jump button
    this.jumpButton = this.add.rectangle(500, 540, 100, 50, 0xff6b6b);
    this.jumpButton.setInteractive({ useHandCursor: true });
    this.jumpButton.on('pointerdown', () => this.attemptJump());
    this.jumpButton.setStrokeStyle(2, 0xffaaaa);
    this.add.text(500, 540, 'JUMP', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5, 0.5);

    // Timer display
    this.timerText = this.add.text(650, 520, '00.00', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#4a9eff',
      fontStyle: 'bold'
    });

    // Platform width indicator
    this.widthLabel = this.add.text(650, 560, 'WIDTH', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#888888',
      align: 'center'
    }).setOrigin(0.5, 0);

    this.widthBar = this.add.rectangle(650, 580, 100, 8, 0x444444);
    this.widthBar.setOrigin(0.5, 0.5);
    
    this.widthFill = this.add.rectangle(650, 580, 100, 8, 0x4a90e2);
    this.widthFill.setOrigin(0.5, 0.5);

    // Game over overlay (dark fade)
    this.gameOverOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0);
    this.gameOverOverlay.setVisible(false);

    // Game over text
    this.gameOverText = this.add.text(400, 180, 'GAME OVER', {
      fontSize: '64px',
      fontFamily: 'Arial',
      color: '#ff6b6b',
      fontStyle: 'bold',
      align: 'center'
    });
    this.gameOverText.setOrigin(0.5, 0.5);
    this.gameOverText.setVisible(false);
    this.gameOverText.setScale(0);

    // Death reason text
    this.deathReasonText = this.add.text(400, 250, '', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffaaaa',
      align: 'center'
    });
    this.deathReasonText.setOrigin(0.5, 0.5);
    this.deathReasonText.setVisible(false);

    // Game over time display
    this.gameOverTimeText = this.add.text(400, 310, '', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#4a9eff',
      align: 'center',
      fontStyle: 'bold'
    });
    this.gameOverTimeText.setOrigin(0.5, 0.5);
    this.gameOverTimeText.setVisible(false);

    // Game over time label
    this.timeLabel = this.add.text(400, 290, 'SURVIVED', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888888',
      align: 'center'
    });
    this.timeLabel.setOrigin(0.5, 0.5);
    this.timeLabel.setVisible(false);

    // Game over restart text
    this.restartText = this.add.text(400, 380, 'Press R to Restart', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#cccccc',
      align: 'center'
    });
    this.restartText.setOrigin(0.5, 0.5);
    this.restartText.setVisible(false);

    // Input handling
    this.input.keyboard.on('keydown-R', () => {
      if (this.gameOver) this.scene.restart();
    });
    
    this.input.keyboard.on('keydown-SPACE', () => {
      this.attemptJump();
    });

    this.input.keyboard.on('keydown-C', () => {
      this.cycleCurrentPlatformColor();
    });
  }

  spawnInitialPlatforms() {
    // First platform at game start (blue)
    const firstPlatform = this.createPlatform(100, 400, 0);
    this.currentPlatform = firstPlatform;

    // Subsequent platforms with varied colors
    let nextX = 100 + this.currentPlatformWidth + PLATFORM_GAP;
    for (let i = 1; i < 10; i++) {
      // Ensure some variation in colors for interesting patterns
      const colorIndex = Math.floor(Math.random() * 3);
      this.createPlatform(nextX, 400, colorIndex);
      nextX += this.currentPlatformWidth + PLATFORM_GAP;
    }
  }

  createPlatform(x, y, colorIndex) {
    // Ensure colorIndex is valid
    const validColorIndex = Math.max(0, Math.min(2, colorIndex));
    const color = COLOR_ORDER[validColorIndex];
    
    const platform = this.add.rectangle(x, y, this.currentPlatformWidth, PLATFORM_HEIGHT, COLORS[color]);
    platform.setOrigin(0.5, 0.5);
    platform.setStrokeStyle(1, 0xffffff);
    platform.setData('colorIndex', validColorIndex);
    platform.setData('color', color);
    this.platforms.add(platform);
    return platform;
  }

  update(_time, delta) {
    if (this.gameOver) {
      // Animate restart text pulsing
      if (this.restartText.visible) {
        const pulse = Math.sin(_time / 300) * 0.1 + 0.9;
        this.restartText.setScale(pulse);
      }
      return;
    }

    this.elapsedTime += delta / 1000;
    this.updateTimer();

    // Update platform width based on elapsed time
    this.updatePlatformWidth(delta);

    // Apply gravity and jumping
    this.velocityY += GRAVITY * (delta / 1000);
    this.playerY += this.velocityY * (delta / 1000);

    // Scroll platforms left
    this.platforms.children.entries.forEach(platform => {
      platform.x -= PLATFORM_SPEED * (delta / 1000);
    });

    // Remove off-screen platforms
    this.platforms.children.entries.forEach(platform => {
      if (platform.x < -100) {
        this.platforms.remove(platform);
        platform.destroy();
      }
    });

    // Spawn new platforms
    this.platformCounter += delta / 1000;
    if (this.platformCounter > 0.6) {
      this.platformCounter = 0;
      const children = this.platforms.getChildren();
      if (children.length > 0) {
        const lastPlatform = children[children.length - 1];
        const nextX = lastPlatform.x + this.currentPlatformWidth + PLATFORM_GAP;
        const randomColor = Math.floor(Math.random() * 3);
        this.createPlatform(nextX, 400, randomColor);
      }
    }

    // Check collisions with platforms
    this.checkPlatformCollisions();

    // Update player position
    this.player.y = this.playerY;

    // Game over condition - fell off screen
    if (this.playerY > 600) {
      this.endGame('FELL INTO THE VOID');
    }
  }

  checkPlatformCollisions() {
    let onPlatform = false;
    let lowestPlatform = null;
    let lowestDistance = Infinity;

    this.platforms.children.entries.forEach(platform => {
      const dx = Math.abs(this.playerX - platform.x);

      // Check if player is above platform and falling
      const platformWidth = platform.width;
      const horizontalCollision = dx < (platformWidth / 2 + 15);
      const verticalCollision = this.playerY >= platform.y - PLATFORM_HEIGHT / 2 - 20 && 
                               this.playerY <= platform.y + PLATFORM_HEIGHT / 2 + 10 &&
                               this.velocityY >= 0;

      if (horizontalCollision && verticalCollision) {
        const distanceToPlatform = platform.y - this.playerY;
        if (distanceToPlatform < lowestDistance) {
          lowestDistance = distanceToPlatform;
          lowestPlatform = platform;
          onPlatform = true;
        }
      }
    });

    if (onPlatform && lowestPlatform) {
      this.playerY = lowestPlatform.y - PLATFORM_HEIGHT / 2 - 16;
      this.velocityY = 0;
      this.isJumping = false;
      this.currentPlatform = lowestPlatform;
      this.updatePlatformColorDisplay();
    }
  }

  cycleCurrentPlatformColor() {
    if (!this.currentPlatform || this.isJumping || this.gameOver) return;

    const currentIndex = this.currentPlatform.getData('colorIndex');
    const nextIndex = (currentIndex + 1) % 3;
    const nextColor = COLOR_ORDER[nextIndex];

    this.currentPlatform.setData('colorIndex', nextIndex);
    this.currentPlatform.setData('color', nextColor);
    this.currentPlatform.setFillStyle(COLORS[nextColor]);

    this.updatePlatformColorDisplay();
  }

  updatePlatformColorDisplay() {
    if (this.currentPlatform) {
      const colorIndex = this.currentPlatform.getData('colorIndex');
      this.platformColorDisplay.setFillStyle(COLORS[COLOR_ORDER[colorIndex]]);
    }
  }

  attemptJump() {
    if (this.isJumping || this.gameOver || !this.currentPlatform) return;

    // Check if platform is red (colorIndex 2)
    const platformColorIndex = this.currentPlatform.getData('colorIndex');
    if (platformColorIndex !== 2) {
      const wrongColor = COLOR_ORDER[platformColorIndex] ? COLOR_ORDER[platformColorIndex].toUpperCase() : 'UNKNOWN';
      this.endGame(`JUMPED ON ${wrongColor}!`);
      return;
    }

    this.velocityY = -JUMP_FORCE;
    this.isJumping = true;
  }

  updateTimer() {
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = this.elapsedTime % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds.toFixed(2)).padStart(5, '0')}`;
    this.timerText.setText(timeStr);
  }

  updatePlatformWidth(delta) {
    // Gradually shrink platforms over time
    const shrinkAmount = PLATFORM_SHRINK_RATE * (delta / 1000);
    this.currentPlatformWidth = Math.max(MIN_PLATFORM_WIDTH, this.currentPlatformWidth - shrinkAmount);
    
    // Update width indicator
    const widthPercentage = (this.currentPlatformWidth - MIN_PLATFORM_WIDTH) / (INITIAL_PLATFORM_WIDTH - MIN_PLATFORM_WIDTH);
    this.widthFill.width = 100 * widthPercentage;
    
    // Change color as platforms get smaller
    if (widthPercentage > 0.6) {
      this.widthFill.setFillStyle(0x4a90e2); // Blue - safe
    } else if (widthPercentage > 0.3) {
      this.widthFill.setFillStyle(0xf5d547); // Yellow - warning
    } else {
      this.widthFill.setFillStyle(0xe74c3c); // Red - danger
    }
  }

  endGame(reason) {
    if (this.gameOverAnimationPlaying) return;
    
    this.gameOver = true;
    this.gameOverAnimationPlaying = true;
    this.deathReason = reason;

    // Screen shake effect
    this.cameras.main.shake(300, 0.01);

    // Flash the current platform if player died on it
    if (this.currentPlatform && reason.includes('JUMPED')) {
      this.tweens.add({
        targets: this.currentPlatform,
        alpha: { from: 1, to: 0 },
        yoyo: true,
        repeat: 3,
        duration: 100
      });
    }

    // Player death animation - explode into particles
    this.createDeathParticles();
    
    // Hide player
    this.tweens.add({
      targets: this.player,
      alpha: 0,
      scale: 0,
      duration: 300,
      ease: 'Power2'
    });

    // Show game over screen with delay
    this.time.delayedCall(500, () => {
      this.showGameOverScreen();
    });
  }

  createDeathParticles() {
    // Create particle effect from player position
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 150 + Math.random() * 100;
      const particle = this.add.rectangle(
        this.player.x, 
        this.player.y, 
        6, 
        6, 
        0xffffff
      );
      
      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed + 100,
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 0 },
        duration: 800,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  showGameOverScreen() {
    // Show dark overlay
    this.gameOverOverlay.setVisible(true);
    this.tweens.add({
      targets: this.gameOverOverlay,
      alpha: 0.85,
      duration: 400,
      ease: 'Power2'
    });

    // Animate "GAME OVER" text with impact
    this.gameOverText.setVisible(true);
    this.cameras.main.flash(200, 255, 50, 50);
    this.tweens.add({
      targets: this.gameOverText,
      scale: { from: 0, to: 1.1 },
      duration: 400,
      ease: 'Back.easeOut',
      delay: 200,
      onComplete: () => {
        this.tweens.add({
          targets: this.gameOverText,
          scale: 1,
          duration: 200,
          ease: 'Power2'
        });
      }
    });

    // Show death reason
    this.time.delayedCall(600, () => {
      this.deathReasonText.setText(this.deathReason);
      this.deathReasonText.setVisible(true);
      this.deathReasonText.setAlpha(0);
      this.tweens.add({
        targets: this.deathReasonText,
        alpha: 1,
        duration: 300
      });
    });

    // Show time survived
    this.time.delayedCall(900, () => {
      this.timeLabel.setVisible(true);
      this.gameOverTimeText.setText(this.timerText.text);
      this.gameOverTimeText.setVisible(true);
      
      this.timeLabel.setAlpha(0);
      this.gameOverTimeText.setAlpha(0);
      
      this.tweens.add({
        targets: [this.timeLabel, this.gameOverTimeText],
        alpha: 1,
        duration: 400
      });
    });

    // Show restart prompt with pulse animation
    this.time.delayedCall(1300, () => {
      this.restartText.setVisible(true);
      this.restartText.setAlpha(0);
      this.tweens.add({
        targets: this.restartText,
        alpha: 1,
        duration: 400
      });
    });
  }
}

// Phaser game configuration
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: GameScene,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  render: {
    antialias: true,
    backgroundColor: '#1a1a1a'
  }
};

new Phaser.Game(config);
