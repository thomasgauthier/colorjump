import Phaser from 'phaser';

const COLORS = {
  blue: 0x4a90e2,
  yellow: 0xf5d547,
  red: 0xe74c3c
};

const COLOR_ORDER = ['blue', 'yellow', 'red'];
const PLATFORM_WIDTH = 100;
const PLATFORM_HEIGHT = 20;
const PLATFORM_GAP = 140;
const PLATFORM_SPEED = 320;
const GRAVITY = 900;
const JUMP_FORCE = 520;

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Game state
    this.gameOver = false;
    this.elapsedTime = 0;
    this.playerX = 50;
    this.playerY = 350;
    this.velocityY = 0;
    this.isJumping = false;
    this.currentPlatform = null;
    this.platformCounter = 0;
    
    // Create background
    this.add.rectangle(400, 300, 800, 600, 0x1a1a1a);

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

    // Game over text
    this.gameOverText = this.add.text(400, 200, 'GAME OVER', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ff6b6b',
      fontStyle: 'bold',
      align: 'center'
    });
    this.gameOverText.setOrigin(0.5, 0.5);
    this.gameOverText.setVisible(false);

    // Game over time display
    this.gameOverTimeText = this.add.text(400, 280, '', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center'
    });
    this.gameOverTimeText.setOrigin(0.5, 0.5);
    this.gameOverTimeText.setVisible(false);

    // Game over restart text
    this.restartText = this.add.text(400, 340, 'Press R to Restart', {
      fontSize: '18px',
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
    let nextX = 100 + PLATFORM_WIDTH + PLATFORM_GAP;
    for (let i = 1; i < 10; i++) {
      // Ensure some variation in colors for interesting patterns
      const colorIndex = Math.floor(Math.random() * 3);
      this.createPlatform(nextX, 400, colorIndex);
      nextX += PLATFORM_WIDTH + PLATFORM_GAP;
    }
  }

  createPlatform(x, y, colorIndex) {
    const platform = this.add.rectangle(x, y, PLATFORM_WIDTH, PLATFORM_HEIGHT, COLORS[COLOR_ORDER[colorIndex]]);
    platform.setOrigin(0.5, 0.5);
    platform.setStrokeStyle(1, 0xffffff);
    platform.setData('colorIndex', colorIndex);
    platform.setData('color', COLOR_ORDER[colorIndex]);
    this.platforms.add(platform);
    return platform;
  }

  update(_time, delta) {
    if (this.gameOver) return;

    this.elapsedTime += delta / 1000;
    this.updateTimer();

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
        const nextX = lastPlatform.x + PLATFORM_WIDTH + PLATFORM_GAP;
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
      this.endGame();
    }
  }

  checkPlatformCollisions() {
    let onPlatform = false;
    let lowestPlatform = null;
    let lowestDistance = Infinity;

    this.platforms.children.entries.forEach(platform => {
      const dx = Math.abs(this.playerX - platform.x);

      // Check if player is above platform and falling
      const horizontalCollision = dx < (PLATFORM_WIDTH / 2 + 15);
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
      this.endGame();
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

  endGame() {
    this.gameOver = true;
    this.gameOverText.setVisible(true);
    this.gameOverTimeText.setText(`Time: ${this.timerText.text}`);
    this.gameOverTimeText.setVisible(true);
    this.restartText.setVisible(true);
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
