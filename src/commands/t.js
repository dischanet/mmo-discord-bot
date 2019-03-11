const training_set = require("training.json");
const dbjs = require("../db.js");

module.exports = async (client, message, db) => {
  const user = message.author;

  const mmoDb = dbjs(db);

  const qId = Math.floor(Math.random() * (619 + 1));
  const quiz = training_set[qId];
  const question = quiz[0];
  const answer = quiz[1];

  const exp = mmoDb.getPlayerExp(user.id) / 8;

  message.channel.send(`「${question}」の読み方をひらがなで答えなさい。`);

  const responseMsg = await message.channel.awaitMessages(
    answer_msg => user.id === answer_msg.author.id,
    { max: 1, time: 12000 }
  );

  if (responseMsg) {
    if (answer === resizeBy.first().content) {
    }
  } else {
    message.channel.send(`時間切れだ。正解は「${answer}」だ。`);
  }
};
