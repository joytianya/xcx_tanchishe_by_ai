Page({
  data: {
    rankingList: [],
    userInfo: null
  },

  onLoad() {
    this.loadRankingData();
    
    // 监听更新事件
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel && eventChannel.on) {
      eventChannel.on('updateRanking', () => {
        this.loadRankingData();
      });
    }
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadRankingData();
  },

  loadRankingData() {
    const rankingList = wx.getStorageSync('rankingList') || [];
    const userInfo = wx.getStorageSync('userInfo');
    
    this.setData({
      rankingList,
      userInfo
    });
  }
}); 