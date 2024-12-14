const app = getApp()

Page({
  data: {
    avatarUrl: '',
    nickName: ''
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl
    });
    
    // 如果已经有昵称了，就可以直接进入游戏
    if (this.data.nickName) {
      this.loginGame();
    }
  },

  onInputNickname(e) {
    const nickName = e.detail.value;
    this.setData({
      nickName
    });
    
    // 如果已经有头像了，就可以直接进入游戏
    if (this.data.avatarUrl) {
      this.loginGame();
    }
  },

  loginGame() {
    if (this.data.avatarUrl && this.data.nickName) {
      const userInfo = {
        avatarUrl: this.data.avatarUrl,
        nickName: this.data.nickName,
        userId: Date.now().toString()
      };

      // 保存用户信息
      wx.setStorageSync('userInfo', userInfo);

      // 跳转到游戏页面
      wx.switchTab({
        url: '/pages/game/game'
      });
    }
  },

  onLoad() {
    // 检查是否已经授权
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      wx.switchTab({
        url: '/pages/game/game'
      });
    }
  }
}); 