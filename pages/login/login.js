const app = getApp()

Page({
  data: {
    nickName: ''
  },

  onInputNickname(e) {
    const nickName = e.detail.value;
    this.setData({
      nickName
    });
  },

  startGame() {
    if (!this.data.nickName.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    const userInfo = {
      avatarUrl: '/assets/icons/default-avatar.png',
      nickName: this.data.nickName,
      userId: Date.now().toString()
    };

    // 保存用户信息
    wx.setStorageSync('userInfo', userInfo);

    // 跳转到游戏页面
    wx.switchTab({
      url: '/pages/game/game'
    });
  },

  onLoad() {
    // 检查是否已经登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      wx.switchTab({
        url: '/pages/game/game'
      });
    }
  }
}); 