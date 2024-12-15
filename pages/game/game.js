const GRID_SIZE = 20; // 网格大小
const MOVE_INTERVAL = 300; // 将移动间隔从200ms改为300ms，使移动更慢

Page({
  data: {
    score: 0,
    highScore: 0,
    isPlaying: false,
    gameOver: false,
    arrowRotation: 0, // 方向箭头的旋转角度
    isMultiplayer: false, // 是否为多人模式
    roomId: '', // 房间ID
    players: [], // 其他玩家信息
    waitingForPlayers: false, // 是否正在等待其他玩家
    playerColors: ['#07c160', '#ff4757', '#5352ed', '#ffa502'] // 不同玩家的颜色
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
      this.initControl(); // 添加控制区域初始化
    }, 100);
    
    // 初始化8个方向的移动增量
    this.directions = {
      'right':      { x: 1,  y: 0 },
      'rightDown':  { x: 1,  y: 1 },
      'down':       { x: 0,  y: 1 },
      'leftDown':   { x: -1, y: 1 },
      'left':       { x: -1, y: 0 },
      'leftUp':     { x: -1, y: -1 },
      'up':         { x: 0,  y: -1 },
      'rightUp':    { x: 1,  y: -1 }
    };

    // 初始化WebSocket连接
    this.initWebSocket();
  },

  // 初始化控制区域
  initControl() {
    wx.createSelectorQuery()
      .select('.control-circle')
      .boundingClientRect(rect => {
        if (rect) {
          this.controlCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          this.controlRadius = rect.width / 2;
          console.log('Control initialized:', this.controlCenter);
        }
      })
      .exec();
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
    // 设置游戏状态
    this.setData({
      isPlaying: true,
      gameOver: false,
      score: 0,
      isMultiplayer: false,
      waitingForPlayers: false,
      roomId: '',
      players: []
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
    
    // 初始化食物数组并生成多个食物
    this.foods = [];
    this.generateFoods(3); // 初始生成3个食物
    
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

    // 检查是否是相反方向
    const opposites = {
      'right': 'left',
      'left': 'right',
      'up': 'down',
      'down': 'up',
      'rightUp': 'leftDown',
      'leftDown': 'rightUp',
      'rightDown': 'leftUp',
      'leftUp': 'rightDown'
    };

    // 如果是相反方向，翻转蛇身
    if (opposites[this.direction] === this.nextDirection) {
      this.snake.reverse();
    }

    // 更新当前方向为下一个方向
    this.direction = this.nextDirection;

    const head = { ...this.snake[0] };
    const direction = this.directions[this.direction];
    
    // 根据方向更新位置
    head.x += direction.x * GRID_SIZE;
    head.y += direction.y * GRID_SIZE;

    // 检查边界碰撞
    if (head.x < 0 || head.x >= this.canvasWidth || 
        head.y < 0 || head.y >= this.canvasHeight) {
      this.endGame();
      return;
    }

    // 移动蛇
    this.snake.unshift(head);

    // 检查是否吃到食物
    let foodEaten = false;
    for (let i = this.foods.length - 1; i >= 0; i--) {
      if (head.x === this.foods[i].x && head.y === this.foods[i].y) {
        this.setData({ score: this.data.score + 1 });
        this.foods.splice(i, 1); // 移除吃掉的食物
        foodEaten = true;
        // 当食物被吃掉时，生成新的食物
        this.generateFoods(1);
        break;
      }
    }

    if (!foodEaten) {
      this.snake.pop();
    }

    // 检查自身碰撞
    for (let i = 1; i < this.snake.length; i++) {
      if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
        this.endGame();
        return;
      }
    }

    this.draw();
  },

  draw() {
    if (!this.ctx) return; // 确保ctx存在

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

    // 绘制所有食物
    if (this.foods && this.foods.length > 0) {
      this.foods.forEach(food => {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(
          food.x + GRID_SIZE/2, 
          food.y + GRID_SIZE/2, 
          GRID_SIZE/2 - 2, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
      });
    }
  },

  // 生成指定数量的食物
  generateFoods(count) {
    const maxX = Math.floor(this.canvasWidth / GRID_SIZE);
    const maxY = Math.floor(this.canvasHeight / GRID_SIZE);
    
    for (let i = 0; i < count; i++) {
      let newFood;
      do {
        newFood = {
          x: Math.floor(Math.random() * maxX) * GRID_SIZE,
          y: Math.floor(Math.random() * maxY) * GRID_SIZE
        };
      } while (
        // 检查是否与蛇身重叠
        this.snake.some(segment => 
          segment.x === newFood.x && segment.y === newFood.y
        ) ||
        // 检查是否与其他食物重叠
        this.foods.some(food =>
          food.x === newFood.x && food.y === newFood.y
        )
      );
      
      this.foods.push(newFood);
    }
  },

  handleTouchStart(e) {
    if (!this.data.isPlaying) return;
    
    const touch = e.touches[0];
    // 重新获取控制区域位置
    wx.createSelectorQuery()
      .select('.control-circle')
      .boundingClientRect(rect => {
        if (rect) {
          this.controlCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          this.controlRadius = rect.width / 2;
          this.updateDirection(touch.clientX, touch.clientY);
        }
      })
      .exec();
  },

  handleTouchMove(e) {
    if (!this.data.isPlaying) return;
    
    const touch = e.touches[0];
    if (this.controlCenter) {
      this.updateDirection(touch.clientX, touch.clientY);
    }
  },

  isValidDirection(newDirection) {
    // 允许所有方向的转向，包括相反方向
    return true;
  },

  updateDirection(touchX, touchY) {
    if (!this.controlCenter) return;

    // 计算触摸点相对于控制中心的向量
    const dx = touchX - this.controlCenter.x;
    const dy = touchY - this.controlCenter.y;
    
    // 计算角度（弧度）
    const angle = Math.atan2(dy, dx);
    // 转换为角度
    const degrees = angle * 180 / Math.PI;
    
    // 更新箭头旋转
    this.setData({
      arrowRotation: degrees + 90
    });
    
    // 将角度转换为0-360范围
    const normalizedDegrees = ((degrees + 360) % 360);
    
    // 根据角度确定8个方向
    let newDirection;
    if (normalizedDegrees >= 337.5 || normalizedDegrees < 22.5) {
      newDirection = 'right';
    } else if (normalizedDegrees >= 22.5 && normalizedDegrees < 67.5) {
      newDirection = 'rightDown';
    } else if (normalizedDegrees >= 67.5 && normalizedDegrees < 112.5) {
      newDirection = 'down';
    } else if (normalizedDegrees >= 112.5 && normalizedDegrees < 157.5) {
      newDirection = 'leftDown';
    } else if (normalizedDegrees >= 157.5 && normalizedDegrees < 202.5) {
      newDirection = 'left';
    } else if (normalizedDegrees >= 202.5 && normalizedDegrees < 247.5) {
      newDirection = 'leftUp';
    } else if (normalizedDegrees >= 247.5 && normalizedDegrees < 292.5) {
      newDirection = 'up';
    } else {
      newDirection = 'rightUp';
    }
    
    // 更新蛇的方向
    if (this.isValidDirection(newDirection)) {
      this.nextDirection = newDirection;
    }
  },

  handleTouchEnd() {
    // 可以选择是否在松手时保持最后的方向
  },

  endGame() {
    clearInterval(this.moveInterval);
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    
    // 创建游戏记录
    const gameRecord = {
      score: this.data.score,
      duration: Math.floor((Date.now() - this.gameStartTime) / 1000),
      date: new Date().toLocaleString(),
      timestamp: Date.now(),
      userId: userInfo.userId || userInfo.phoneNumber,
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl
    };

    // 获取并更新排行榜
    let rankingList = wx.getStorageSync('rankingList') || [];
    rankingList.push(gameRecord);
    rankingList.sort((a, b) => b.score - a.score);
    rankingList = rankingList.slice(0, 100);
    wx.setStorageSync('rankingList', rankingList);

    // 计算当前排名
    const currentRank = rankingList.findIndex(record => 
      record.timestamp === gameRecord.timestamp
    ) + 1;

    // 更新状态
    this.setData({ 
      gameOver: true,
      isPlaying: false,
      currentRank
    });

    // 更新最高分
    if (this.data.score > this.data.highScore) {
      this.setData({ highScore: this.data.score });
      wx.setStorageSync('highScore', this.data.score);
    }

    // 保存到历史记录
    const history = wx.getStorageSync('gameHistory') || [];
    history.push(gameRecord);
    wx.setStorageSync('gameHistory', history);
  },

  restartGame() {
    if (this.data.isMultiplayer) {
      // 如果是多人模式，需要先退出当前房间
      this.setData({
        isMultiplayer: false,
        waitingForPlayers: false,
        roomId: '',
        players: []
      });
      
      // 关闭当前WebSocket连接
      if (this.socket) {
        this.socket.close();
      }
      
      // 重新初始化WebSocket连接
      this.initWebSocket();
    }
    
    // 开始新游戏
    this.startGame();
  },

  goToRanking() {
    wx.switchTab({
      url: '/pages/ranking/ranking'
    });
  },

  createRoom() {
    wx.showToast({
      title: '多人游戏即将上线',
      icon: 'none',
      duration: 2000
    });
  },

  showJoinRoom() {
    wx.showToast({
      title: '多人游戏即将上线',
      icon: 'none',
      duration: 2000
    });
  }
});
