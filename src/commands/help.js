const baseHelp = {
  embed: {
    title: "Botの説明  :question:",
    description: "MMOくんはみんなでボスを倒して行くRPGです。",
    fields: [
      { name: "help", value: "このメッセージを表示する" },
      { name: "attack", value: "モンスターに攻撃する" },
      { name: "status", value: "自分のステータスを確認する" },
      { name: "inquiry", value: "チャンネルのバトルの状態を確認する" },
      { name: "reset", value: "戦いをやり直す" },
      { name: "t", value: "四字熟語トレーニングをする" },
      { name: "q", value: "クイズトレーニングをする" },
      { name: "item", value: "アイテムを使う" },
      { name: "ranking", value: "上位10サーバーのランキングを表示する" }
    ],
    footer: { text: "詳細は 「!!help コマンド名」で表示できます" },
    color: 0xf5a623
  }
};

const commandDetails = {
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

const eachCommandHelp = askedCommand => {
  const embed = {
    title: `${askedCommand}の詳細`,
    description: commandDetails[askedCommand],
    color: 0x50e3c2
  };
  if (askedCommand === "item") {
    embed.fields = itemList;
  }
  return { embed };
};

const help = messageContent => {
  const args = messageContent.split(" ");
  if (args.length < 2) {
    return baseHelp;
  }
  const askedCommand = args[1];
  if (commandDetails.hasOwnProperty(askedCommand)) {
    return eachCommandHelp(askedCommand);
  }
  return `「${askedCommand}」というコマンドは存在しません。
  \`!!help\`で確認してください。`;
};

module.exports = (client, message) =>
  message.channel.send(help(message.content));
