const defaultHelp = `MMOくんはみんなでボスを倒して行くRPGです。

help    このメッセージを表示します
attack  攻撃する
status  自分のステータスを確認する
inquiry チャンネルのバトルの状態を確認する
reset   戦いをやり直す
t       四字熟語トレーニングをする
q       クイズトレーニングをする
item    アイテムを使う
ranking 上位10サーバーのランキングを表示する`;
const helpHelp = `ヘルプメッセージを表示します。`;
const attackHelp = `チャンネル内の敵に攻撃します。敵の反撃を受けます。`;
const statusHelp = `自分のステータスを確認する。`;
const inquiryHelp = `チャンネルのバトルの状態を確認する。`;
const resetHelp = `戦いをやり直す。`;
const tHelp = `四字熟語の読み方をひらがなで入力し、正解すると経験値がもらえるぞ。`;
const qHelp = `クイズに解答し、正解すると経験値がもらえるぞ。`;
const itemHelp = `**アイテムの説明**
    エリクサー:チャンネルの全員を全回復させる。
    ファイアボールの書:遠隔攻撃する。
    祈りの書:仲間一人を復活させる。
    サポーターの証:MMOくんをサポートしてくれた証だ！`;
const rankingHelp = `上位10サーバーのランキングを表示する。`;
// eslint-disable-next-line no-unused-vars
module.exports = (client, message, db) => {
  const argument = message.content.split(" ");
  if (argument.length === 2) {
    let helpContent;
    switch (argument[1]) {
      case "help":
        helpContent = helpHelp;
        break;
      case "attack":
        helpContent = attackHelp;
        break;
      case "status":
        helpContent = statusHelp;
        break;
      case "inquiry":
        helpContent = inquiryHelp;
        break;
      case "reset":
        helpContent = resetHelp;
        break;
      case "t":
        helpContent = tHelp;
        break;
      case "q":
        helpContent = qHelp;
        break;
      case "item":
        helpContent = itemHelp;
        break;
      case "ranking":
        helpContent = rankingHelp;
        break;
      default:
        helpContent = "このコマンドは存在しません。";
        break;
    }
    const helpComment = `\`\`\`!!${argument[1]}
  ${helpContent}\`\`\``;
    message.channel.send(helpComment);
  } else {
    message.channel.send(defaultHelp);
  }
};
