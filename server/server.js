const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });

// 游戏房间管理
const gameRooms = new Map();

// 玩家连接管理
const players = new Map();

// 生成随机位置
function generateRandomPosition(width, height, gridSize) {
  return {
    x: Math.floor(Math.random() * (width / gridSize)) * gridSize,
    y: Math.floor(Math.random() * (height / gridSize)) * gridSize
  };
}

// 生成食物
function generateFood(width, height, gridSize, snakes) {
  let food;
  do {
    food = generateRandomPosition(width, height, gridSize);
  } while (snakes.some(snake => 
    snake.some(segment => 
      segment.x === food.x && segment.y === food.y
    )
  ));
  return food;
}

// 创建新房间
function createRoom(player) {
  const roomId = uuidv4().substring(0, 6);
  const room = {
    id: roomId,
    players: [player],
    foods: [],
    gameState: null,
    isPlaying: false
  };
  gameRooms.set(roomId, room);
  return room;
}

// 广播消息给房间内所有玩家
function broadcastToRoom(room, message) {
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  });
}

// 处理玩家连接
wss.on('connection', (ws) => {
  console.log('新玩家连接');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('收到消息:', data);

    switch (data.type) {
      case 'create_room':
        const player = {
          id: data.player.id,
          name: data.player.name,
          avatar: data.player.avatar,
          ws: ws,
          snake: null,
          score: 0
        };
        players.set(ws, player);
        
        const room = createRoom(player);
        ws.send(JSON.stringify({
          type: 'room_created',
          roomId: room.id
        }));
        break;

      case 'join_room':
        const joiningPlayer = {
          id: data.player.id,
          name: data.player.name,
          avatar: data.player.avatar,
          ws: ws,
          snake: null,
          score: 0
        };
        players.set(ws, joiningPlayer);

        const targetRoom = gameRooms.get(data.roomId);
        if (!targetRoom) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '房间不存在'
          }));
          return;
        }

        targetRoom.players.push(joiningPlayer);
        
        // 通知房间内所有玩家
        broadcastToRoom(targetRoom, {
          type: 'player_joined',
          players: targetRoom.players.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar
          }))
        });

        // 如果玩家数达到2人，开始游戏
        if (targetRoom.players.length >= 2) {
          startGame(targetRoom);
        }
        break;

      case 'player_move':
        const movingPlayer = players.get(ws);
        const playerRoom = findPlayerRoom(movingPlayer);
        if (playerRoom && playerRoom.isPlaying) {
          broadcastToRoom(playerRoom, {
            type: 'player_move',
            playerId: data.playerId,
            position: data.position,
            direction: data.direction
          });
        }
        break;

      case 'food_eaten':
        const eatingPlayer = players.get(ws);
        const gameRoom = findPlayerRoom(eatingPlayer);
        if (gameRoom && gameRoom.isPlaying) {
          // 移除被吃掉的食物
          gameRoom.foods.splice(data.foodIndex, 1);
          
          // 生成新食物
          const newFood = generateFood(800, 600, 20, 
            gameRoom.players.map(p => p.snake)
          );
          gameRoom.foods.push(newFood);

          // 通知所有玩家
          broadcastToRoom(gameRoom, {
            type: 'food_eaten',
            playerId: data.playerId,
            foodIndex: data.foodIndex,
            newFood: newFood
          });
        }
        break;

      case 'player_died':
        const deadPlayer = players.get(ws);
        const currentRoom = findPlayerRoom(deadPlayer);
        if (currentRoom) {
          broadcastToRoom(currentRoom, {
            type: 'player_died',
            playerId: data.playerId
          });
        }
        break;
    }
  });

  ws.on('close', () => {
    const player = players.get(ws);
    if (player) {
      const room = findPlayerRoom(player);
      if (room) {
        // 从房间中移除玩家
        room.players = room.players.filter(p => p.id !== player.id);
        
        // 如果房间空了，删除房间
        if (room.players.length === 0) {
          gameRooms.delete(room.id);
        } else {
          // 通知其他玩家
          broadcastToRoom(room, {
            type: 'player_left',
            playerId: player.id
          });
        }
      }
      players.delete(ws);
    }
  });
});

// 查找玩家所在的房间
function findPlayerRoom(player) {
  for (const [roomId, room] of gameRooms) {
    if (room.players.some(p => p.id === player.id)) {
      return room;
    }
  }
  return null;
}

// ��始游戏
function startGame(room) {
  room.isPlaying = true;
  room.foods = [];

  // 为每个玩家初始化蛇的位置
  const startPositions = [
    { x: 100, y: 300 },
    { x: 700, y: 300 },
    { x: 400, y: 100 },
    { x: 400, y: 500 }
  ];

  room.players.forEach((player, index) => {
    const startPos = startPositions[index];
    player.snake = [
      { x: startPos.x, y: startPos.y },
      { x: startPos.x - 20, y: startPos.y },
      { x: startPos.x - 40, y: startPos.y }
    ];
    player.score = 0;
  });

  // 生成初始食物
  for (let i = 0; i < 3; i++) {
    room.foods.push(generateFood(800, 600, 20, 
      room.players.map(p => p.snake)
    ));
  }

  // 通知所有玩家游戏开始
  room.players.forEach((player, index) => {
    const otherPlayers = room.players
      .filter(p => p.id !== player.id)
      .map(p => ({
        id: p.id,
        name: p.name,
        snake: p.snake
      }));

    player.ws.send(JSON.stringify({
      type: 'game_start',
      gameState: {
        playerSnake: player.snake,
        foods: room.foods,
        otherPlayers: otherPlayers
      }
    }));
  });
}

console.log('游戏服务器启动在端口 8080'); 