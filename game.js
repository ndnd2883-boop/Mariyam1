<template>
  <div class="game-container">
    <canvas 
      ref="gameCanvas"
      @mousemove="handleMouseMove"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @click="handleClick"
      @contextmenu.prevent
    ></canvas>
    
    <div class="info-panel">
      <div class="score">Счёт: {{ score }}</div>
      <div class="controls-info">🎮 Мышь - поворот | 🔴 Левая кнопка - ускорение</div>
    </div>
    
    <!-- Панель скинов (только при Game Over) -->
    <div class="skin-panel" v-if="!gameRunning">
      <div class="skin-title">🎨 ВЫБЕРИ СКИН ДЛЯ НОВОЙ ИГРЫ</div>
      <div class="skins">
        <div class="skin" :style="{background: 'linear-gradient(135deg, #00ff88, #00ccff)'}" @click="selectSkin('default')">
          <div class="skin-check" v-if="selectedSkin === 'default'">✓</div>
        </div>
        <div class="skin" :style="{background: 'linear-gradient(135deg, #ff3366, #ff00cc)'}" @click="selectSkin('pink')">
          <div class="skin-check" v-if="selectedSkin === 'pink'">✓</div>
        </div>
        <div class="skin" :style="{background: 'linear-gradient(135deg, #ffcc00, #ff6600)'}" @click="selectSkin('orange')">
          <div class="skin-check" v-if="selectedSkin === 'orange'">✓</div>
        </div>
        <div class="skin" :style="{background: 'linear-gradient(135deg, #9933ff, #00ffff)'}" @click="selectSkin('purple')">
          <div class="skin-check" v-if="selectedSkin === 'purple'">✓</div>
        </div>
        <div class="skin" :style="{background: 'linear-gradient(135deg, #00ff00, #00cc66)'}" @click="selectSkin('green')">
          <div class="skin-check" v-if="selectedSkin === 'green'">✓</div>
        </div>
        <div class="skin" :style="{background: 'linear-gradient(135deg, #ff0000, #cc0000)'}" @click="selectSkin('red')">
          <div class="skin-check" v-if="selectedSkin === 'red'">✓</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      gameRunning: true,
      score: 0,
      snake: [],
      snakeAngle: 0,
      currentSpeed: 3,
      normalSpeed: 3,
      boostSpeed: 6,
      isBoosting: false,
      mapSize: 5000,
      foods: [],
      bots: [],
      camera: { x: 0, y: 0 },
      canvas: null,
      ctx: null,
      canvasWidth: 0,
      canvasHeight: 0,
      animationId: null,
      selectedSkin: 'default',
      currentSkin: 'default',
      skins: {
        default: ['#00ff88', '#00ccff'],
        pink: ['#ff3366', '#ff00cc'],
        orange: ['#ffcc00', '#ff6600'],
        purple: ['#9933ff', '#00ffff'],
        green: ['#00ff00', '#00cc66'],
        red: ['#ff0000', '#cc0000']
      }
    }
  },
  
  mounted() {
    this.init();
  },
  
  beforeDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
  },
  
  methods: {
    init() {
      this.canvas = this.$refs.gameCanvas;
      this.ctx = this.canvas.getContext('2d');
      
      this.handleResize();
      window.addEventListener('resize', this.handleResize);
      
      this.restartGame();
      this.gameLoop();
    },
    
    selectSkin(skinName) {
      this.selectedSkin = skinName;
    },
    
    handleResize() {
      this.canvasWidth = window.innerWidth;
      this.canvasHeight = window.innerHeight;
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;
    },
    
    restartGame() {
      this.gameRunning = true;
      this.score = 0;
      this.snakeAngle = 0;
      this.currentSpeed = this.normalSpeed;
      this.isBoosting = false;
      this.currentSkin = this.selectedSkin; // Применяем выбранный скин
      
      // Создаем змею
      this.snake = [];
      const startX = this.mapSize / 2;
      const startY = this.mapSize / 2;
      for (let i = 0; i < 5; i++) {
        this.snake.push({
          x: startX - i * 10,
          y: startY
        });
      }
      
      // Создаем еду
      this.foods = [];
      for (let i = 0; i < 200; i++) {
        this.foods.push({
          x: Math.random() * this.mapSize,
          y: Math.random() * this.mapSize,
          color: `hsl(${Math.random() * 360}, 70%, 55%)`,
          size: 6 + Math.random() * 4,
        });
      }
      
      // Создаем ботов
      this.bots = [];
      for (let i = 0; i < 15; i++) {
        const botBody = [];
        let startBX, startBY;
        do {
          startBX = Math.random() * this.mapSize;
          startBY = Math.random() * this.mapSize;
        } while (Math.abs(startBX - startX) < 400 && Math.abs(startBY - startY) < 400);
        
        for (let j = 0; j < 12; j++) {
          botBody.push({ x: startBX - j * 8, y: startBY });
        }
        this.bots.push({
          body: botBody,
          angle: Math.random() * Math.PI * 2,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          timer: Math.random() * 50,
          points: Math.floor(Math.random() * 30) + 10,
        });
      }
      
      this.updateCamera();
    },
    
    updateCamera() {
      if (this.snake.length > 0) {
        this.camera.x = this.snake[0].x - this.canvasWidth / 2;
        this.camera.y = this.snake[0].y - this.canvasHeight / 2;
      }
    },
    
    distance(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    
    die() {
      if (!this.gameRunning) return;
      this.gameRunning = false;
    },
    
    killBot(botIndex) {
      const bot = this.bots[botIndex];
      
      // Создаем кружочки в количестве очков бота
      const pointsCount = bot.points;
      for (let i = 0; i < pointsCount; i++) {
        this.foods.push({
          x: bot.body[0].x + (Math.random() - 0.5) * 100,
          y: bot.body[0].y + (Math.random() - 0.5) * 100,
          color: `hsl(${Math.random() * 360}, 70%, 55%)`,
          size: 5,
        });
      }
      
      // Удаляем бота
      this.bots.splice(botIndex, 1);
      
      // Добавляем нового бота
      setTimeout(() => {
        if (this.bots.length < 12) {
          const newBotBody = [];
          const startBX = Math.random() * this.mapSize;
          const startBY = Math.random() * this.mapSize;
          for (let j = 0; j < 12; j++) {
            newBotBody.push({ x: startBX - j * 8, y: startBY });
          }
          this.bots.push({
            body: newBotBody,
            angle: Math.random() * Math.PI * 2,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            timer: Math.random() * 50,
            points: Math.floor(Math.random() * 30) + 10,
          });
        }
      }, 100);
    },
    
    update() {
      if (!this.gameRunning) return;
      if (this.snake.length === 0) return;
      
      // Движение головы игрока
      const head = this.snake[0];
      const newHead = {
        x: head.x + Math.cos(this.snakeAngle) * this.currentSpeed,
        y: head.y + Math.sin(this.snakeAngle) * this.currentSpeed
      };
      
      // Телепортация через границы
      if (newHead.x < 0) newHead.x = this.mapSize;
      if (newHead.x > this.mapSize) newHead.x = 0;
      if (newHead.y < 0) newHead.y = this.mapSize;
      if (newHead.y > this.mapSize) newHead.y = 0;
      
      this.snake.unshift(newHead);
      
      // Ограничение длины
      const maxLength = 30 + Math.floor(this.score / 2);
      while (this.snake.length > maxLength) this.snake.pop();
      
      // Поедание еды
      for (let i = 0; i < this.foods.length; i++) {
        const food = this.foods[i];
        if (this.distance(this.snake[0], food) < 12) {
          this.score++;
          const last = this.snake[this.snake.length - 1];
          this.snake.push({ x: last.x, y: last.y });
          this.foods[i] = {
            x: Math.random() * this.mapSize,
            y: Math.random() * this.mapSize,
            color: `hsl(${Math.random() * 360}, 70%, 55%)`,
            size: 6 + Math.random() * 4,
          };
          break;
        }
      }
      
      // Движение ботов
      for (const bot of this.bots) {
        bot.timer++;
        if (bot.timer > 40) {
          bot.timer = 0;
          bot.angle += (Math.random() - 0.5) * 0.5;
        }
        
        const botHead = bot.body[0];
        const newBotHead = {
          x: botHead.x + Math.cos(bot.angle) * 1.8,
          y: botHead.y + Math.sin(bot.angle) * 1.8
        };
        
        if (newBotHead.x < 0) newBotHead.x = this.mapSize;
        if (newBotHead.x > this.mapSize) newBotHead.x = 0;
        if (newBotHead.y < 0) newBotHead.y = this.mapSize;
        if (newBotHead.y > this.mapSize) newBotHead.y = 0;
        
        bot.body.unshift(newBotHead);
        if (bot.body.length > 30) bot.body.pop();
      }
      
      // ПРАВИЛЬНАЯ МЕХАНИКА СТОЛКНОВЕНИЙ
      for (let i = 0; i < this.bots.length; i++) {
        const bot = this.bots[i];
        
        // 1. ЕСЛИ МОЯ ГОЛОВА КАСАЕТСЯ КОГО-ТО (ЛЮБОЙ ЧАСТИ БОТА) - Я УМИРАЮ
        const myHead = this.snake[0];
        let playerDied = false;
        
        for (let j = 0; j < bot.body.length; j++) {
          if (this.distance(myHead, bot.body[j]) < 12) {
            playerDied = true;
            break;
          }
        }
        
        if (playerDied) {
          this.die();
          return;
        }
        
        // 2. ЕСЛИ ГОЛОВА БОТА КАСАЕТСЯ МОЕГО ТЕЛА (НЕ ГОЛОВЫ!) - БОТ УМИРАЕТ
        const botHead = bot.body[0];
        let botDied = false;
        
        for (let j = 1; j < this.snake.length; j++) {
          if (this.distance(this.snake[j], botHead) < 12) {
            botDied = true;
            break;
          }
        }
        
        if (botDied) {
          this.killBot(i);
          i--;
        }
      }
      
      this.updateCamera();
    },
    
    draw() {
      if (!this.ctx) return;
      
      // Очистка фона
      this.ctx.fillStyle = '#0a0a0a';
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      
      // Рисуем еду
      for (const food of this.foods) {
        const x = food.x - this.camera.x;
        const y = food.y - this.camera.y;
        if (x > -50 && x < this.canvasWidth + 50 && y > -50 && y < this.canvasHeight + 50) {
          this.ctx.fillStyle = food.color;
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = food.color;
          this.ctx.beginPath();
          this.ctx.arc(x, y, food.size, 0, Math.PI * 2);
          this.ctx.fill();
          
          this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
          this.ctx.beginPath();
          this.ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      
      // Рисуем ботов
      this.ctx.shadowBlur = 5;
      for (const bot of this.bots) {
        this.ctx.strokeStyle = bot.color;
        this.ctx.lineWidth = 11;
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        for (let i = 0; i < bot.body.length; i++) {
          const x = bot.body[i].x - this.camera.x;
          const y = bot.body[i].y - this.camera.y;
          if (i === 0) this.ctx.moveTo(x, y);
          else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
        
        const head = bot.body[0];
        const hx = head.x - this.camera.x;
        const hy = head.y - this.camera.y;
        
        this.ctx.fillStyle = bot.color;
        this.ctx.beginPath();
        this.ctx.arc(hx, hy, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        const angle = bot.angle;
        const ex = Math.cos(angle);
        const ey = Math.sin(angle);
        
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(hx + ex * 5 + ey * 3, hy + ey * 5 - ex * 3, 2.5, 0, Math.PI * 2);
        this.ctx.arc(hx + ex * 5 - ey * 3, hy + ey * 5 + ex * 3, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(hx + ex * 6 + ey * 3, hy + ey * 6 - ex * 3, 1.2, 0, Math.PI * 2);
        this.ctx.arc(hx + ex * 6 - ey * 3, hy + ey * 6 + ex * 3, 1.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.shadowBlur = 3;
        this.ctx.fillText(`${bot.points}`, hx - 12, hy - 12);
      }
      
      // Рисуем игрока с выбранным скином
      if (this.snake.length > 0) {
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00ffcc';
        this.ctx.lineWidth = 12;
        this.ctx.lineCap = 'round';
        
        const skinColors = this.skins[this.currentSkin];
        const gradient = this.ctx.createLinearGradient(
          this.snake[0].x - this.camera.x - 20,
          this.snake[0].y - this.camera.y - 20,
          this.snake[0].x - this.camera.x + 20,
          this.snake[0].y - this.camera.y + 20
        );
        gradient.addColorStop(0, skinColors[0]);
        gradient.addColorStop(1, skinColors[1]);
        this.ctx.strokeStyle = gradient;
        
        this.ctx.beginPath();
        for (let i = 0; i < this.snake.length; i++) {
          const x = this.snake[i].x - this.camera.x;
          const y = this.snake[i].y - this.camera.y;
          if (i === 0) this.ctx.moveTo(x, y);
          else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
        
        const head = this.snake[0];
        const hx = head.x - this.camera.x;
        const hy = head.y - this.camera.y;
        
        this.ctx.fillStyle = skinColors[0];
        this.ctx.beginPath();
        this.ctx.arc(hx, hy, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = skinColors[1];
        this.ctx.beginPath();
        this.ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        const ex = Math.cos(this.snakeAngle);
        const ey = Math.sin(this.snakeAngle);
        
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(hx + ex * 5 + ey * 3, hy + ey * 5 - ex * 3, 3, 0, Math.PI * 2);
        this.ctx.arc(hx + ex * 5 - ey * 3, hy + ey * 5 + ex * 3, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(hx + ex * 6 + ey * 3, hy + ey * 6 - ex * 3, 1.5, 0, Math.PI * 2);
        this.ctx.arc(hx + ex * 6 - ey * 3, hy + ey * 6 + ex * 3, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      this.ctx.shadowBlur = 0;
      
      this.ctx.font = 'bold 36px Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowBlur = 5;
      this.ctx.shadowColor = '#00ffcc';
      this.ctx.fillText(`${this.score}`, 30, 60);
      
      if (this.isBoosting && this.gameRunning) {
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#ff6600';
        this.ctx.fillText('BOOST!', this.canvasWidth - 120, 50);
      }
      
      if (!this.gameRunning) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.95)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        this.ctx.font = 'bold 60px Arial';
        this.ctx.fillStyle = '#ff3366';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvasWidth / 2, this.canvasHeight / 2 - 80);
        
        this.ctx.font = 'bold 40px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`Счёт: ${this.score}`, this.canvasWidth / 2, this.canvasHeight / 2);
        
        this.ctx.font = '28px Arial';
        this.ctx.fillStyle = '#00ffcc';
        this.ctx.fillText('Нажмите ЛЮБУЮ кнопку мыши для рестарта', this.canvasWidth / 2, this.canvasHeight / 2 + 100);
        
        this.ctx.textAlign = 'left';
      }
      
      if (this.gameRunning) {
        this.ctx.fillStyle = '#00ffcc';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(this.canvasWidth / 2, this.canvasHeight / 2, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(this.canvasWidth / 2, this.canvasHeight / 2, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#00ffcc';
        this.ctx.beginPath();
        this.ctx.arc(this.canvasWidth / 2, this.canvasHeight / 2, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    },
    
    handleMouseMove(e) {
      if (!this.gameRunning) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const centerX = this.canvasWidth / 2;
      const centerY = this.canvasHeight / 2;
      
      this.snakeAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
    },
    
    handleMouseDown(e) {
      if (!this.gameRunning) {
        this.restartGame();
        e.preventDefault();
        return;
      }
      
      if (e.button === 0) {
        this.isBoosting = true;
        this.currentSpeed = this.boostSpeed;
        e.preventDefault();
      }
    },
    
    handleMouseUp(e) {
      if (e.button === 0) {
        this.isBoosting = false;
        this.currentSpeed = this.normalSpeed;
        e.preventDefault();
      }
    },
    
    handleClick(e) {
      if (!this.gameRunning) {
        this.restartGame();
        e.preventDefault();
      }
    },
    
    gameLoop() {
      this.update();
      this.draw();
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }
}
</script>

<style scoped>
.game-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  background: #0a0a0a;
}

canvas {
  display: block;
  cursor: none;
  width: 100%;
  height: 100%;
}

.info-panel {
  position: fixed;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  pointer-events: none;
  z-index: 10;
}

.score {
  background: rgba(0,0,0,0.6);
  color: #00ffcc;
  font-size: 24px;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: monospace;
}

.controls-info {
  background: rgba(0,0,0,0.6);
  color: rgba(255,255,255,0.7);
  font-size: 12px;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: Arial;
}

.skin-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 20px;
  z-index: 20;
  border: 2px solid rgba(0,255,204,0.5);
  pointer-events: auto;
  min-width: 300px;
}

.skin-title {
  color: #00ffcc;
  font-size: 18px;
  text-align: center;
  margin-bottom: 15px;
  font-weight: bold;
}

.skins {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.skin {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s, border 0.2s;
  border: 2px solid rgba(255,255,255,0.3);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skin:hover {
  transform: scale(1.15);
  border-color: #00ffcc;
}

.skin-check {
  color: white;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 0 0 5px black;
}
</style>