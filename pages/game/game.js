const GRID_SIZE = 20; // 网格大小
const MOVE_INTERVAL = 200; // 增加移动间隔，使游戏节奏稍慢一些，更容易控制

Page({
  data: {
    score: 0,
    highScore: 0,
    isPlaying: false,
    gameOver: false
  },

  onLoad() {
    // 获取最高分
    const highScore = wx.getStorageSync('highScore') || 0;
    this.setData({ highScore });
    
    // 初始化画布
    this.initCanvas();
  },

  async initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 设置画布大小
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        
        this.canvas = canvas;
        this.ctx = ctx;
        this.canvasWidth = res[0].width;
        this.canvasHeight = res[0].height;
        
        // 初始化游戏数据
        this.initGame();
      });
  },

  initGame() {
    // 初化蛇的位置和方向
    this.snake = [{
      x: Math.floor(this.canvasWidth / (2 * GRID_SIZE)) * GRID_SIZE,
      y: Math.floor(this.canvasHeight / (2 * GRID_SIZE)) * GRID_SIZE
    }];
    this.direction = 'right';
    this.nextDirection = 'right';
    this.generateFood();
    this.setData({ score: 0 });
  },

  generateFood() {
    do {
      this.food = {
        x: Math.floor(Math.random() * (this.canvasWidth / GRID_SIZE)) * GRID_SIZE,
        y: Math.floor(Math.random() * (this.canvasHeight / GRID_SIZE)) * GRID_SIZE
      };
    } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));
  },

  startGame() {
    if (this.data.isPlaying) return;
    
    this.setData({
      isPlaying: true,
      gameOver: false
    });
    this.initGame();
    this.gameLoop();
  },

  gameLoop() {
    if (!this.data.isPlaying) return;

    this.moveSnake();
    this.checkCollision();
    this.draw();

    if (!this.data.gameOver) {
      setTimeout(() => this.gameLoop(), MOVE_INTERVAL);
    }
  },

  moveSnake() {
    this.direction = this.nextDirection;
    const head = { ...this.snake[0] };

    switch (this.direction) {
      case 'up': head.y -= GRID_SIZE; break;
      case 'down': head.y += GRID_SIZE; break;
      case 'left': head.x -= GRID_SIZE; break;
      case 'right': head.x += GRID_SIZE; break;
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.setData({ score: this.data.score + 1 });
      this.generateFood();
    } else {
      this.snake.pop();
    }
  },

  checkCollision() {
    const head = this.snake[0];

    // 检查是否撞墙
    if (head.x < 0 || head.x >= this.canvasWidth ||
        head.y < 0 || head.y >= this.canvasHeight) {
      this.gameOver();
      return;
    }

    // 检查是否撞到自己
    for (let i = 1; i < this.snake.length; i++) {
      if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
        this.gameOver();
        return;
      }
    }
  },

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 画食物
    ctx.fillStyle = 'red';
    ctx.fillRect(this.food.x, this.food.y, GRID_SIZE - 2, GRID_SIZE - 2);

    // 画蛇
    ctx.fillStyle = 'green';
    this.snake.forEach(segment => {
      ctx.fillRect(segment.x, segment.y, GRID_SIZE - 2, GRID_SIZE - 2);
    });
  },

  gameOver() {
    this.setData({ 
      isPlaying: false,
      gameOver: true
    });

    if (this.data.score > this.data.highScore) {
      this.setData({ highScore: this.data.score });
      wx.setStorageSync('highScore', this.data.score);
    }
  },

  // 添加新的属性
  touchStartX: 0,
  touchStartY: 0,
  minSwipeDistance: 30, // 最小滑动距离，可以根据需要调整

  touchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  touchMove(e) {
    e.preventDefault && e.preventDefault();
    if (!this.data.isPlaying) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    const dx = touchX - this.touchStartX;
    const dy = touchY - this.touchStartY;
    
    if (Math.abs(dx) < this.minSwipeDistance && Math.abs(dy) < this.minSwipeDistance) {
      return;
    }

    this.touchStartX = touchX;
    this.touchStartY = touchY;

    // 新的方向判断逻辑
    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平方向
      if (dx > 0) {
        // 如果当前方向是左，先转向上或下
        if (this.direction === 'left') {
          this.nextDirection = dy > 0 ? 'down' : 'up';
        } else {
          this.nextDirection = 'right';
        }
      } else {
        // 如果当前方向是右，先转向上或下
        if (this.direction === 'right') {
          this.nextDirection = dy > 0 ? 'down' : 'up';
        } else {
          this.nextDirection = 'left';
        }
      }
    } else {
      // 垂直方向
      if (dy > 0) {
        // 如果当前方向是上，先转向左或右
        if (this.direction === 'up') {
          this.nextDirection = dx > 0 ? 'right' : 'left';
        } else {
          this.nextDirection = 'down';
        }
      } else {
        // 如果当前方向是下，先转向左或右
        if (this.direction === 'down') {
          this.nextDirection = dx > 0 ? 'right' : 'left';
        } else {
          this.nextDirection = 'up';
        }
      }
    }
  },

  // 移除 touchEnd 方法，因为我们在 touchMove 中已经处理了方向变化
  touchEnd(e) {
    // 可以留空，或者用于处理特殊情况
  }
});
