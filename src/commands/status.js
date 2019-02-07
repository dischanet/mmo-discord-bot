module.exports = (client, message, db) => {
  const {
    getPlayerExp,
    getPlayerBattle,
    getRank,
    getItems,
    deleteInBattle
  } = require("../db")(db);

  const userId = message.author.id;
  const playerExp = getPlayerExp(userId);
  const playerLevel = Math.round(Math.sqrt(playerExp));
  const rank = getRank(userId);

  let itemComment = "";
  const playerItems = getItems(userId);
  if (playerItems.includes(-10)) itemComment += "【運営の証】を持っている。\n";
  if (playerItems.includes(-9))
    itemComment += "【サポーターの証】を持っている。\n";

  let statusComment = `<@${userId}>のステータス\n
  Lv: ${playerLevel}\n
  HP: ${playerLevel * 5 + 50} \n
  攻撃力: ${playerLevel * 2 + 10}\n
  EXP: ${playerExp}\n
  次のレベルまで ${(playerLevel + 1) ** 2 - playerExp}exp\n
  ${itemComment}\n
  プレイヤーランクは${rank}位だ！`;

  const PlayerInBattle = getPlayerBattle(userId);
  if (PlayerInBattle) {
    const battleChannel = client.channels.get(PlayerInBattle.channelId);
    if (battleChannel) {
      const battleField = battleChannel.name
        ? `${battleChannel.guild.name}の#${battleChannel.name}`
        : "個人チャット";

      statusComment = `<@${userId}>のステータス\n
            Lv: ${playerLevel}\n
            HP: ${PlayerInBattle.playerHp} / ${playerLevel * 5 + 50}\n
            攻撃力: ${playerLevel * 2 + 10}\n
            EXP: ${playerExp}\n
            次のレベルまで ${(playerLevel + 1) ** 2 - playerExp}exp\n
            \n
            ${battleField}で戦闘中！\n
            ${itemComment}\n
            プレイヤーランクは${rank}位だ！`;
    } else {
      deleteInBattle(battleChannel.id);
    }
  }

  message.channel.send(statusComment);
};
