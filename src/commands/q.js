const request = require("request");
const parseString = require("xml2js").parseString;
const options = {
  url: "http://24th.jp/test/quiz/api_quiz.php",
  method: "GET"
};
module.exports = (client, message, db) => {
  const user = message.author;
  request(options, (error, response, body) => {
    parseString(body, (err, result) => {
      const quiz = result.Result.quiz;
      let quizSet = [quiz.ans1, quiz.ans2, quiz.ans3, quiz.ans4];
      for (let i = quizSet.length - 1; i >= 0; i--) {
        const rand = Math.floor(Math.random() * (i + 1));
        [quizSet[i], quizSet[rand]] = [quizSet[rand], quizSet[i]]
      }
      const qContent = `Q. ${quiz.quession}
 1. ${quizSet[0]}
 2. ${quizSet[0]}
 3. ${quizSet[0]}
 4. ${quizSet[0]}`;
      message.channel.send(qContent);
      const answerNum = quizSet.indexOf(quiz.ans1) + 1;
      //      const exp = math.ceil(getPlayerLevel(message.user.id) / 10);
      const filter = m => m.author === user;
      message.channel.awaitMessages(filter, { maxMatches: 1, time: 10000, errors: ["time"] })
        .then(guess => {
          if (isFinite(guess.content) && Number(guess) === answerNum) {
            //            let comment = experiment(user.id, exp)
            if (Math.random() < 0.005) {
              comment += "\n`エリクサー`を手に入れた！";
              //              obtainAnItem(user.id, 1);
            }
            if (Math.random() < 0.1) {
              comment += "\n`ファイアボールの書`を手に入れた！";
              //              obtainAnItem(user.id, 2);
            }
            if (Math.random() < 0.1) {
              comment += "\n`祈りの書`を手に入れた！";
              //              obtainAnItem(user.id, 3);
            }
            message.channel.send(`正解だ！${exp}の経験値を得た。\n` + comment)
          } else {
            message.channel.send(`残念！正解は「${quiz.ans1}」だ。`)
          }
        })
        .catch(() => message.channel.send(`時間切れだ。正解は「${quiz.ans1}」だ。`));
    });
  });
};
