const training_set = require("../assets/training.json");

module.exports = async (client, message, db) => {
  const user = message.author;

  const qId = Math.floor(Math.random() * (training_set.length + 1));
  const quiz = training_set[qId];
  const question = quiz[0];
  const answer = quiz[1];

  const exp = db.getPlayerExp(user.id) / 8;

  message.channel.send(`「${question}」の読み方をひらがなで答えなさい。`);

  const guess = await message.channel.awaitMessages(
    msg => user.id === msg.author.id,
    { maxMatches: 1, time: 12000 }
  );

  if (guess) {
    if (guess.first() === answer) {
      let comment = db.addExp(user.id, exp);
      if (Math.random() < 0.005) {
        comment += "\n`エリクサー`を手に入れた！";
        db.obtainItem(user.id, 1);
      }
      if (Math.random() < 0.1) {
        comment += "\n`ファイアボールの書`を手に入れた！";
        db.obtainItem(user.id, 2);
      }
      if (Math.random() < 0.1) {
        comment += "\n`祈りの書`を手に入れた！";
        db.obtainItem(user.id, 3);
      }
      message.channel.send(`正解だ！${exp}の経験値を得た。\n${comment}`);
    } else {
      message.channel.send(`残念！正解は「${answer}」だ。`);
    }
  } else {
    message.channel.send(`時間切れだ。正解は「${answer}」だ。`);
  }
};
