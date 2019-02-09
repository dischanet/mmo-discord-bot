// eslint-disable-next-line no-unused-vars
module.exports = (client, message, db) => {
  const helpComment = `\`\`\`MMOくんはみんなでボスを倒して行くRPGです。

help    このメッセージを表示します
attack  攻撃する
status  自分のステータスを確認する
inquiry チャンネルのバトルの状態を確認する
reset   戦いをやり直す
t       四字熟語トレーニングをする
q       クイズトレーニングをする
item    アイテムを使う
ranking 上位10サーバーのランキングを表示する\`\`\``;
  message.channel.send(helpComment);
};
