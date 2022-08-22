const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
      path: path.resolve(__dirname, '../static/mapmemo/js'),
      filename: 'lib.js'
  },
  mode: 'development',
  devtool: 'source-map',
  module: {
      // ローダーの設定
      rules: [
        //CSS 用のローダー
        { 
          //拡張子 .css や .CSS を対象
          test: /\.css$/i,  
          //使用するローダーを指定
          use: ['style-loader', 'css-loader']
        },
      ],
  },
};
