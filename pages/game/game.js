const GRID_SIZE = 20; // 网格大小
const MOVE_INTERVAL = 300; // 将移动间隔从200ms改为300ms，使移动更慢

Page({
  data: {
    score: 0,
    highScore: 0,
    isPlaying: false,
    gameOver: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    
    const highScore = wx.getStorageSync('highScore') || 0;
    this.setData({ highScore });
    
    // 延迟初始化canvas，确保页面已经完全加载
    setTimeout(() => {
      this.initCanvas();
    }, 100);
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
          console.error('Canvas not found');
          return;
        }
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 获取系统信息
        const systemInfo = wx.getSystemInfoSync();
        const screenWidth = systemInfo.windowWidth;
        const screenHeight = systemInfo.windowHeight * 0.9;
        
        // 确保网格能够完整显示
        this.canvasWidth = Math.floor(screenWidth / GRID_SIZE) * GRID_SIZE;
        this.canvasHeight = Math.floor(screenHeight / GRID_SIZE) * GRID_SIZE;
        
        // 设置画布大小
        const dpr = systemInfo.pixelRatio;
        canvas.width = this.canvasWidth * dpr;
        canvas.height = this.canvasHeight * dpr;
        ctx.scale(dpr, dpr);
        
        this.canvas = canvas;
        this.ctx = ctx;
        
        console.log('Canvas initialized:', this.canvasWidth, this.canvasHeight);
        
        // 移除自动开始游戏
        this.setData({
          isPlaying: false,
          gameOver: false,
          score: 0
        });
      });
  },

  startGame() {
    this.setData({
      isPlaying: true,
      gameOver: false,
      score: 0
    });
    
    // 初始化蛇的位置
    const startX = Math.floor(this.canvasWidth / (2 * GRID_SIZE)) * GRID_SIZE;
    const startY = Math.floor(this.canvasHeight / (2 * GRID_SIZE)) * GRID_SIZE;
    
    this.snake = [
      { x: startX, y: startY },
      { x: startX - GRID_SIZE, y: startY },
      { x: startX - GRID_SIZE * 2, y: startY }
    ];
    
    this.direction = 'right';
    this.nextDirection = 'right';
    this.gameStartTime = Date.now();
    
    // 生成食物
    this.generateFood();
    
    // 开始移动
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
    }
    this.moveInterval = setInterval(() => {
      this.moveSnake();
    }, MOVE_INTERVAL);
    
    // 开始渲染
    this.draw();
  },

  moveSnake() {
    if (this.data.gameOver) return;

    // 根据方向计算新的头部位置
    const head = { ...this.snake[0] };
    switch (this.direction) {
      case 'up':    head.y -= GRID_SIZE; break;
      case 'down':  head.y += GRID_SIZE; break;
      case 'left':  head.x -= GRID_SIZE; break;
      case 'right': head.x += GRID_SIZE; break;
    }

    // 检查是否撞墙
    if (head.x < 0 || head.x >= this.canvasWidth || 
        head.y < 0 || head.y >= this.canvasHeight) {
      this.endGame();
      return;
    }

    // 检查是否撞到自己
    for (let i = 0; i < this.snake.length; i++) {
      if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
        this.endGame();
        return;
      }
    }

    // 检查是否吃到食物
    if (head.x === this.food.x && head.y === this.food.y) {
      this.snake.unshift(head);
      this.setData({ score: this.data.score + 1 });
      this.generateFood();
    } else {
      this.snake.unshift(head);
      this.snake.pop();
    }

    // 更新方向
    this.direction = this.nextDirection;
    
    // 重新绘制
    this.draw();
  },

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 绘制蛇
    this.snake.forEach((segment, index) => {
      if (index === 0) {
        // 蛇头
        ctx.fillStyle = '#07c160';
        ctx.beginPath();
        ctx.arc(
          segment.x + GRID_SIZE/2, 
          segment.y + GRID_SIZE/2, 
          GRID_SIZE/2, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
      } else {
        // 蛇身
        ctx.fillStyle = index === this.snake.length - 1 ? '#95e1b7' : '#07c160';
        ctx.fillRect(segment.x, segment.y, GRID_SIZE - 1, GRID_SIZE - 1);
      }
    });

    // 绘制食物
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(
      this.food.x + GRID_SIZE/2, 
      this.food.y + GRID_SIZE/2, 
      GRID_SIZE/2 - 2, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
  },

  generateFood() {
    const maxX = Math.floor(this.canvasWidth / GRID_SIZE);
    const maxY = Math.floor(this.canvasHeight / GRID_SIZE);
    
    do {
      this.food = {
        x: Math.floor(Math.random() * maxX) * GRID_SIZE,
        y: Math.floor(Math.random() * maxY) * GRID_SIZE
      };
    } while (this.snake.some(segment => 
      segment.x === this.food.x && segment.y === this.food.y
    ));
  },

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  handleTouchMove(e) {
    if (!this.touchStartX || !this.touchStartY || !this.data.isPlaying) return;

    const dx = e.touches[0].clientX - this.touchStartX;
    const dy = e.touches[0].clientY - this.touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && this.direction !== 'left') {
        this.nextDirection = 'right';
      } else if (dx < 0 && this.direction !== 'right') {
        this.nextDirection = 'left';
      }
    } else {
      if (dy > 0 && this.direction !== 'up') {
        this.nextDirection = 'down';
      } else if (dy < 0 && this.direction !== 'down') {
        this.nextDirection = 'up';
      }
    }

    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  handleTouchEnd() {
    this.touchStartX = null;
    this.touchStartY = null;
  },

  endGame() {
    clearInterval(this.moveInterval);
    this.setData({ 
      gameOver: true,
      isPlaying: false
    });

    if (this.data.score > this.data.highScore) {
      this.setData({ highScore: this.data.score });
      wx.setStorageSync('highScore', this.data.score);
    }

    // 更新排行榜
    const userInfo = wx.getStorageSync('userInfo');
    const gameRecord = {
      score: this.data.score,
      duration: Math.floor((Date.now() - this.gameStartTime) / 1000),
      date: new Date().toLocaleString(),
      timestamp: Date.now(),
      userId: userInfo.userId || userInfo.phoneNumber,
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl
    };

    let rankingList = wx.getStorageSync('rankingList') || [];
    rankingList.push(gameRecord);
    rankingList.sort((a, b) => b.score - a.score);
    rankingList = rankingList.slice(0, 100);
    wx.setStorageSync('rankingList', rankingList);

    wx.showModal({
      title: '游戏结束',
      content: `得分：${this.data.score}`,
      confirmText: '重新开始',
      cancelText: '查看排行',
      success: (res) => {
        if (res.confirm) {
          this.startGame();
        } else {
          wx.switchTab({
            url: '/pages/ranking/ranking'
          });
        }
      }
    });
  },

  restartGame() {
    this.startGame();
  }
});
