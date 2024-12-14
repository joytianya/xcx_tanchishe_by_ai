Page({
  data: {
    userInfo: null,
    stats: {
      totalGames: 0,
      highestScore: 0,
      totalTime: 0
    }
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
    this.calculateStats();
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    } else {
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }
  },

  // 选择新头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    const userInfo = this.data.userInfo;
    userInfo.avatarUrl = avatarUrl;
    
    this.setData({ userInfo });
    wx.setStorageSync('userInfo', userInfo);
    
    wx.showToast({
      title: '头像已更新',
      icon: 'success'
    });
  },

  // 修改昵称
  editNickname() {
    wx.showModal({
      title: '修改昵称',
      content: this.data.userInfo.nickName,
      editable: true,
      placeholderText: '请输入新昵称',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const userInfo = this.data.userInfo;
          userInfo.nickName = res.content.trim();
          
          this.setData({ userInfo });
          wx.setStorageSync('userInfo', userInfo);
          
          wx.showToast({
            title: '已更新',
            icon: 'success'
          });
        }
      }
    });
  },

  calculateStats() {
    const history = wx.getStorageSync('gameHistory') || [];
    const stats = {
      totalGames: history.length,
      highestScore: 0,
      totalTime: 0
    };

    history.forEach(record => {
      stats.highestScore = Math.max(stats.highestScore, record.score);
      stats.totalTime += record.duration;
    });

    stats.totalTime = Math.floor(stats.totalTime / 60);
    this.setData({ stats });
  },

  clearHistory() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有游戏记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('gameHistory');
          this.calculateStats();
          wx.showToast({
            title: '清除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  }
}); 