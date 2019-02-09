const training_set = requier("training.json");
const dbjs = requier("../db.js");

module.exports = async (client, message, db) => {
  const user = message.author;

  const mmo_db = dbjs(db);

  const q_id = Math.floor(Math.random() * (619 + 1));
  const quiz = training_set[q_id];
  const question = quiz[0];
  const answer = quiz[1];

  const exp = mmo_db.getPlayerExp(user.id) / 8;

  message.channel.send(`「${question}」の読み方をひらがなで答えなさい。`);

  const response_msg = await message.channel.awaitMessages(
    answer_msg => user.id === answer_msg.author.id,
    { max: 1, time: 12000 }
  );

  if (response_msg) {
    if (answer === resizeBy.first().content) {

    }
  } else {
    message.channel.send(`時間切れだ。正解は「${answer}」だ。`);
  }
};
