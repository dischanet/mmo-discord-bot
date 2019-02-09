const defaultHelp = {
  embed: {
    title: "Botの説明  :question:",
    description: "MMOくんはみんなでボスを倒して行くRPGです。",
    fields: [
      { name: "help", value: "このメッセージを表示する" },
      { name: "attack", value: "モンスターに攻撃する" },
      { name: "status", value: "自分のステータスを確認する" },
      { name: "inquiry", value: "チャンネルのバトルの状態を確認する" },
      { name: "reset", value: "戦いをやり直す" },
      { name: "t\t\t\tq", value: "トレーニングをする"},
      { name: "item", value: "アイテムを使う" },
      { name: "ranking", value: "上位10サーバーのランキングを表示する" }
    ],
    footer: { text: "詳細は 「!!help コマンド名」で表示できます" },
    color: 0xf5a623
  }
};



module.exports = (client, message, db) => {
  const argument = message.content.split(" ");

  if (argument.length === 2) {

  }eles{
    message.channel.send(defaultHelp);
  }
};
