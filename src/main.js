import Phaser from 'phaser';

const COLORS = {
  blue: 0x4a90e2,
  yellow: 0xf5d547,
  red: 0xe74c3c
};

const COLOR_ORDER = ['blue', 'yellow', 'red'];
const INITIAL_PLATFORM_WIDTH = 400;
const MIN_PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 20;
const PLATFORM_GAP = 140;
const PLATFORM_SPEED = 320;
const GRAVITY = 900;
const JUMP_FORCE = 400;
const PLATFORM_SHRINK_RATE = 25; // pixels per second

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    // Check if this is the first game session (persisted in localStorage)
    if (typeof GameScene.firstPlay === 'undefined') {
      GameScene.firstPlay = localStorage.getItem('colorRunnerTutorialCompleted') !== 'true';
    }
  }

  create() {
    // Game state
    this.gameOver = false;
    this.elapsedTime = 0;
    this.playerX = 50; // Start at center of first platform
    this.playerY = 400;
    this.velocityY = 0;
    this.isJumping = false;
    this.currentPlatform = null;
    this.platformCounter = 0;
    this.deathReason = null; // Track how the player died
    this.gameOverAnimationPlaying = false;
    this.currentPlatformWidth = INITIAL_PLATFORM_WIDTH;

    // Tutorial state
    this.tutorialMode = GameScene.firstPlay;
    this.tutorialStep = 0;
    this.tutorialCycleCount = 0;
    this.tutorialJumpCount = 0;

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
    this.add.text(150, 540, 'PLATFORM', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5, 0.5);

    // Space control button (combined cycle/jump)
    this.spaceButton = this.add.rectangle(400, 540, 180, 50, 0x666666);
    this.spaceButton.setInteractive({ useHandCursor: true });
    this.spaceButton.on('pointerdown', () => this.cycleCurrentPlatformColor());
    this.spaceButton.setStrokeStyle(2, 0x888888);
    this.add.text(400, 530, 'SPACE', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5, 0.5);
    this.add.text(400, 550, 'Short=CYCLE  Long=JUMP', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5, 0.5);

    // Press duration indicator (circular gauge)
    const gaugeX = 400;
    const gaugeY = 505;
    const gaugeRadius = 8;

    // Background circle
    this.pressGaugeBg = this.add.circle(gaugeX, gaugeY, gaugeRadius, 0x333333);
    this.pressGaugeBg.setStrokeStyle(1, 0x555555);
    this.pressGaugeBg.setVisible(false);

    // Fill circle (grows as you hold)
    this.pressGaugeFill = this.add.circle(gaugeX, gaugeY, 0, 0xf5d547);
    this.pressGaugeFill.setVisible(false);

    // Threshold ring (shows 200ms mark)
    this.pressGaugeThreshold = this.add.circle(gaugeX, gaugeY, gaugeRadius * 0.7, 0x000000, 0);
    this.pressGaugeThreshold.setStrokeStyle(2, 0xe74c3c, 0.6);
    this.pressGaugeThreshold.setVisible(false);

    // High score display
    this.highScore = parseFloat(localStorage.getItem('colorRunnerHighScore') || '0');
    this.highScoreText = this.add.text(760, 30, this.highScore > 0 ? `BEST: ${this.formatTime(this.highScore)}` : '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    this.highScoreText.setOrigin(1, 0);

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

    // Tutorial overlay and text
    this.tutorialOverlay = this.add.rectangle(400, 200, 600, 120, 0x000000, 0.8);
    this.tutorialOverlay.setOrigin(0.5, 0.5);
    this.tutorialOverlay.setStrokeStyle(3, 0x4a9eff);
    this.tutorialOverlay.setVisible(false);

    this.tutorialText = this.add.text(400, 180, '', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold'
    });
    this.tutorialText.setOrigin(0.5, 0.5);
    this.tutorialText.setVisible(false);

    this.tutorialSubtext = this.add.text(400, 220, '', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#cccccc',
      align: 'center'
    });
    this.tutorialSubtext.setOrigin(0.5, 0.5);
    this.tutorialSubtext.setVisible(false);

    // Start tutorial
    if (this.tutorialMode) {
      this.tutorialOverlay.setVisible(true);
      this.tutorialText.setVisible(true);
      this.tutorialSubtext.setVisible(true);
      this.updateTutorialText();
    }

    // Input handling
    this.input.keyboard.on('keydown-R', () => {
      if (this.gameOver) this.scene.restart();
    });

    // Space bar press duration tracking
    this.spacePressStartTime = 0;
    this.spacePressed = false;

    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.spacePressed && !this.gameOver) {
        this.spacePressed = true;
        this.spacePressStartTime = this.time.now;

        // Show gauge
        this.pressGaugeBg.setVisible(true);
        this.pressGaugeFill.setVisible(true);
        this.pressGaugeThreshold.setVisible(true);
      }
    });

    this.input.keyboard.on('keyup-SPACE', () => {
      if (this.spacePressed) {
        this.spacePressed = false;
        const pressDuration = this.time.now - this.spacePressStartTime;

        // Hide gauge
        this.pressGaugeBg.setVisible(false);
        this.pressGaugeFill.setVisible(false);
        this.pressGaugeThreshold.setVisible(false);

        // Short press = cycle color, long press = jump
        if (pressDuration < 200) {
          this.cycleCurrentPlatformColor();
        } else {
          this.attemptJump();
        }
      }
    });

    this.input.keyboard.on('keyup-CTRL', () => {
      this.attemptJump();
    });
  }

  spawnInitialPlatforms() {
    if (this.tutorialMode) {
      // Tutorial: One very long platform
      const tutorialPlatformWidth = 1200;
      const firstPlatform = this.add.rectangle(600, 400, tutorialPlatformWidth, PLATFORM_HEIGHT, COLORS.blue);
      firstPlatform.setOrigin(0.5, 0.5);
      firstPlatform.setStrokeStyle(1, 0xffffff);
      firstPlatform.setData('colorIndex', 0);
      firstPlatform.setData('color', 'blue');
      firstPlatform.setData('isTutorialPlatform', true);
      this.platforms.add(firstPlatform);
      this.currentPlatform = firstPlatform;
    } else {
      // Normal game start
      const firstPlatform = this.createPlatform(250, 400, 0);
      this.currentPlatform = firstPlatform;

      // Subsequent platforms with varied colors
      let nextX = 250 + this.currentPlatformWidth + PLATFORM_GAP;
      for (let i = 1; i < 10; i++) {
        // Ensure some variation in colors for interesting patterns
        const colorIndex = Math.floor(Math.random() * 3);
        this.createPlatform(nextX, 400, colorIndex);
        nextX += this.currentPlatformWidth + PLATFORM_GAP;
      }
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

    // Update press duration gauge
    if (this.spacePressed && this.pressGaugeFill.visible) {
      const pressDuration = this.time.now - this.spacePressStartTime;
      const maxDuration = 400; // Max visual duration (200ms is threshold)
      const progress = Math.min(pressDuration / maxDuration, 1);

      // Scale the fill circle
      const maxRadius = 8;
      this.pressGaugeFill.radius = maxRadius * progress;

      // Change color based on threshold
      if (pressDuration < 200) {
        // Short press - yellow
        this.pressGaugeFill.setFillStyle(0xf5d547);
      } else {
        // Long press - red (jump)
        this.pressGaugeFill.setFillStyle(0xe74c3c);

        // Pulse effect when in jump zone
        const pulse = Math.sin(_time / 100) * 0.1 + 0.9;
        this.pressGaugeFill.setScale(pulse);
      }
    } else {
      // Reset scale when not pressing
      this.pressGaugeFill.setScale(1);
    }

    // Tutorial mode pulsing effect
    if (this.tutorialMode && this.tutorialOverlay.visible) {
      const pulse = Math.sin(_time / 500) * 0.05 + 0.95;
      this.tutorialText.setScale(pulse);
    }

    // Don't update timer or scroll during tutorial
    if (!this.tutorialMode) {
      this.elapsedTime += delta / 1000;
      this.updateTimer();

      // Update platform width based on elapsed time
      this.updatePlatformWidth(delta);

      // Scroll platforms left
      this.platforms.children.entries.forEach(platform => {
        platform.x -= PLATFORM_SPEED * (delta / 1000);
      });
    }

    // Apply gravity and jumping (works in both modes)
    this.velocityY += GRAVITY * (delta / 1000);
    this.playerY += this.velocityY * (delta / 1000);

    // Only remove/spawn platforms when not in tutorial mode
    if (!this.tutorialMode) {
      // Remove off-screen platforms - only when completely off screen (accounting for platform width)
      this.platforms.children.entries.forEach(platform => {
        const platformHalfWidth = platform.width / 2;
        if (platform.x < -platformHalfWidth - 50) { // Extra buffer to ensure it's fully off-screen
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

    // Tutorial tracking
    if (this.tutorialMode) {
      this.tutorialCycleCount++;
      this.updateTutorialProgress();
    }
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
      // In tutorial mode, don't end game - just give feedback
      if (this.tutorialMode) {
        const wrongColor = COLOR_ORDER[platformColorIndex] ? COLOR_ORDER[platformColorIndex].toUpperCase() : 'UNKNOWN';
        this.tutorialText.setText(`Can't jump on ${wrongColor}!`);
        this.tutorialSubtext.setText('Cycle to RED first');

        // Flash the platform
        this.tweens.add({
          targets: this.currentPlatform,
          alpha: { from: 1, to: 0.3 },
          yoyo: true,
          duration: 100,
          repeat: 2
        });
        return;
      } else {
        const wrongColor = COLOR_ORDER[platformColorIndex] ? COLOR_ORDER[platformColorIndex].toUpperCase() : 'UNKNOWN';
        this.endGame(`JUMPED ON ${wrongColor}!`);
        return;
      }
    }

    this.velocityY = -JUMP_FORCE;
    this.isJumping = true;

    // Tutorial tracking
    if (this.tutorialMode) {
      this.tutorialJumpCount++;
      this.updateTutorialProgress();
    }
  }

  updateTimer() {
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = this.elapsedTime % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds.toFixed(2)).padStart(5, '0')}`;
    this.timerText.setText(timeStr);
  }

  formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds.toFixed(2)).padStart(5, '0')}`;
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

    // Check for new high score
    if (this.elapsedTime > this.highScore) {
      this.highScore = this.elapsedTime;
      localStorage.setItem('colorRunnerHighScore', this.highScore.toString());
      this.highScoreText.setText(`BEST: ${this.formatTime(this.highScore)}`);
    }

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

  updateTutorialText() {
    switch (this.tutorialStep) {
      case 0:
        this.tutorialText.setText('Welcome to Color Runner!');
        this.tutorialSubtext.setText('Short press SPACE to cycle platform color');
        break;
      case 1:
        this.tutorialText.setText('Great! Keep cycling...');
        this.tutorialSubtext.setText(`${this.tutorialCycleCount}/3 cycles - Watch the colors change!`);
        break;
      case 2:
        this.tutorialText.setText('Now try jumping!');
        this.tutorialSubtext.setText('Cycle to RED, then HOLD SPACE to jump');
        break;
      case 3:
        this.tutorialText.setText('Perfect! Practice a bit more...');
        this.tutorialSubtext.setText(`${this.tutorialJumpCount}/3 jumps completed`);
        break;
      case 4:
        this.tutorialText.setText('Ready for the real game!');
        this.tutorialSubtext.setText('Get ready...');
        break;
    }
  }

  updateTutorialProgress() {
    switch (this.tutorialStep) {
      case 0:
        // Wait for first cycle
        if (this.tutorialCycleCount >= 1) {
          this.tutorialStep = 1;
          this.updateTutorialText();
        }
        break;
      case 1:
        // Wait for 3 cycles
        this.updateTutorialText();
        if (this.tutorialCycleCount >= 3) {
          this.tutorialStep = 2;
          this.updateTutorialText();
        }
        break;
      case 2:
        // Wait for first jump
        if (this.tutorialJumpCount >= 1) {
          this.tutorialStep = 3;
          this.updateTutorialText();
        }
        break;
      case 3:
        // Wait for 3 jumps
        this.updateTutorialText();
        if (this.tutorialJumpCount >= 3) {
          this.tutorialStep = 4;
          this.updateTutorialText();

          // End tutorial after delay
          this.time.delayedCall(2000, () => {
            this.endTutorial();
            // Mark that tutorial has been completed
            GameScene.firstPlay = false;
            localStorage.setItem('colorRunnerTutorialCompleted', 'true');
          });
        }
        break;
    }
  }

  endTutorial() {
    // Fade out tutorial UI
    this.tweens.add({
      targets: [this.tutorialOverlay, this.tutorialText, this.tutorialSubtext],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.tutorialOverlay.setVisible(false);
        this.tutorialText.setVisible(false);
        this.tutorialSubtext.setVisible(false);
      }
    });

    // Clear tutorial platform and spawn normal platforms
    this.time.delayedCall(500, () => {
      this.tutorialMode = false;

      // Clear tutorial platform
      this.platforms.clear(true, true);

      // Reset platform width
      this.currentPlatformWidth = INITIAL_PLATFORM_WIDTH;

      // Spawn normal game platforms
      this.spawnInitialPlatforms();

      // Reset timer
      this.elapsedTime = 0;
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
