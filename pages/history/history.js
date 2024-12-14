Page({
  data: {
    historyList: []
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    this.loadHistory(); // 每次显示页面时重新加载
  },

  loadHistory() {
    const history = wx.getStorageSync('gameHistory') || [];
    this.setData({
      historyList: history.sort((a, b) => b.timestamp - a.timestamp)
    });
  }
}); 