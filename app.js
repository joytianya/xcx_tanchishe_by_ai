// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },

  // 添加登录方法
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            // 获取到登录凭证code
            this.globalData.code = res.code;
            resolve(res.code);
          } else {
            reject('登录失败：' + res.errMsg);
          }
        },
        fail: (err) => {
          reject('登录失败：' + err.errMsg);
        }
      });
    });
  },
  
  globalData: {
    userInfo: null,
    code: null
  }
})
