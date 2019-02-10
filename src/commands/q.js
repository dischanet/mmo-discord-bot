const util = require("util");
const parseString = util.promisify(require("xml2js").parseString);
const axios = require("axios");
const quizApiUrl = "http://24th.jp/test/quiz/api_quiz.php";

const shuffle = list => {
  let i = 4;
  while (i) {
    const rand = Math.floor(Math.random() * i--);
    [list[i], list[rand]] = [list[rand], list[i]];
  }
};

const getQuiz = async () => {
  const response = await axios.get(quizApiUrl);
  const quiz = (await parseString(response.data)).Result.quiz;
  const quizList = [quiz.ans1, quiz.ans2, quiz.ans3, quiz.ans4];
  shuffle(quizList);
  return {
    quiz: `Q. ${quiz.quession}
    1. ${quizList[0]}
    2. ${quizList[1]}
    3. ${quizList[2]}
    4. ${quizList[3]}`,
    answerNumber: quizList.indexOf(quiz.ans1) + 1,
    answer: quiz.ans1
  };
};

module.exports = async (client, message, db) => {
  const { quiz, answerNumber, answer } = await getQuiz();
  message.channel.send(quiz);
  const user = message.author;
  const exp = Math.ceil(db.getPlayerLevel(user.id) / 10);
  const filter = m => m.author === user;
  message.channel
    .awaitMessages(filter, { maxMatches: 1, time: 10000, errors: ["time"] })
    .then(guess => {
      if (Number(guess.content) === answerNumber) {
        // db.addPlayerExp(user.id, exp)
        message.channel.send(`正解だ！${exp}の経験値を得た。`);
      } else {
        message.channel.send(`残念！正解は「${answer}」だ。`);
      }
    })
    .catch(() => message.channel.send(`時間切れだ。正解は「${answer}」だ。`));
};
