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
      { name: "t", value: "トレーニングをする" },
      { name: "q", value: "トレーニングをする" },
      { name: "item", value: "アイテムを使う" },
      { name: "ranking", value: "上位10サーバーのランキングを表示する" }
    ],
    footer: { text: "詳細は 「!!help コマンド名」で表示できます" },
    color: 0xf5a623
  }
};

const helpList = {
  help: "ヘルプメッセージを表示します。",
  attack: "チャンネル内の敵に攻撃します。敵の反撃を受けます。",
  status: "自分のステータスを確認する。",
  inquiry: "チャンネルのバトルの状態を確認する。",
  reset: "戦いをやり直す。",
  t: "四字熟語の読み方をひらがなで入力し、正解すると経験値がもらえるぞ。",
  q: "クイズに解答し、正解すると経験値がもらえるぞ。",
  item: "itemを使う\nアイテム一覧",
  ranking: "上位10サーバーのランキングを表示する"
};

const itemList = [
  { name: "エリクサー", value: "チャンネルの全員を全回復させる。" },
  { name: "ファイアボールの書", value: "遠隔攻撃する。" },
  { name: "祈りの書", value: "仲間一人を復活させる。" },
  { name: "サポーターの証", value: "MMOくんをサポートしてくれた証だ！" }
];

module.exports = (client, message, db) => {
  const argument = message.content.split(" ");

  if (argument.length === 2) {
    const helpMessage = helpList[argument[1]];

    if (!helpMessage) {
      return message.channel.send(
        `「${
          argument[1]
        }」といったコマンドは存在しません。\n \`!!help\`で確認してください。`
      );
    }

    /*global help*/
    help = {
      embed: {
        title: `${argument[1]}の詳細`,
        description: helpMessage,
        color: 0x50e3c2
      }
    };

    if (argument[1] === "item") {
      help.embed.fields = itemList;
    }

    message.channel.send(help);
  } else {
    message.channel.send(defaultHelp);
  }
};
