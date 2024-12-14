const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    defaultAvatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
  },

  onLoad() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
    }
  },

  // 生成随机昵称
  generateNickname() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let nickname = 'Player_';
    for (let i = 0; i < 6; i++) {
      nickname += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nickname;
  },

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve({
            nickName: res.userInfo.nickName,
            avatarUrl: res.userInfo.avatarUrl
          });
        },
        fail: () => {
          // 如果用户拒绝或失败，使用随机昵称和默认头像
          resolve({
            nickName: this.generateNickname(),
            avatarUrl: this.data.defaultAvatarUrl
          });
        }
      });
    });
  },

  // 获取手机号
  async getPhoneNumber(e) {
    console.log('getPhoneNumber', e.detail.errMsg);
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 尝试获取用��信息
      const userProfile = await this.getUserProfile();
      
      // 实际开发中需要发送到服务器解密
      const mockPhoneNumber = '138****8888';
      
      const userInfo = {
        phoneNumber: mockPhoneNumber,
        avatarUrl: this.data.defaultAvatarUrl,
        nickName: this.generateNickname()
      };

      // 保存用户信息
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.userInfo = userInfo;

      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });

      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500,
        success: () => {
          setTimeout(() => {
            this.startGame();
          }, 1500);
        }
      });
    } else {
      wx.showToast({
        title: '请允许授权手机号',
        icon: 'none'
      });
    }
  },

  startGame() {
    if (this.data.isLoggedIn) {
      wx.switchTab({
        url: '/pages/game/game'
      });
    }
  }
}) 