module.exports = async (client, message, db) => {
  const userId = message.author.id;
  const playerExp = await db.getPlayerExp(userId);
  const playerLevel = Math.round(Math.sqrt(playerExp));
  const rank = await db.getRank(userId);

  let itemComment = "";
  const playerItems = await db.getItems(userId);
  if (playerItems.includes(-10)) itemComment += "【運営の証】を持っている。\n";
  if (playerItems.includes(-9))
    itemComment += "【サポーターの証】を持っている。\n";

  let statusComment = `<@${userId}>のステータス
Lv: ${playerLevel}
HP: ${playerLevel * 5 + 50}
攻撃力: ${playerLevel * 2 + 10}
EXP: ${playerExp}
次のレベルまで ${(playerLevel + 1) ** 2 - playerExp}exp
${itemComment}
プレイヤーランクは${rank}位だ！`;

  const PlayerInBattle = await db.getPlayerBattle(userId);
  if (PlayerInBattle) {
    const battleChannel = client.channels.get(PlayerInBattle.channelId);
    if (battleChannel) {
      const battleField = battleChannel.name
        ? `${battleChannel.guild.name}の#${battleChannel.name}`
        : "個人チャット";

      statusComment = `<@${userId}>のステータス
Lv: ${playerLevel}
HP: ${PlayerInBattle.playerHp} / ${playerLevel * 5 + 50}
攻撃力: ${playerLevel * 2 + 10}
EXP: ${playerExp}
次のレベルまで ${(playerLevel + 1) ** 2 - playerExp}exp

${battleField}で戦闘中！
${itemComment}
プレイヤーランクは${rank}位だ！`;
    } else {
      // await deleteInBattle(PlayerInBattle.channelId);
    }
  }

  message.channel.send(statusComment);
};
