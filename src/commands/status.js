const getItemMessage = async (db, userId) => {
  let result = "";
  const playerItems = await db.getPlayerItems(userId);
  if (playerItems.includes(-10)) result += "【運営の証】を持っている。\n";
  if (playerItems.includes(-9)) result += "【サポーターの証】を持っている。\n";
  return result;
};

const getButtleData = async (client, db, userId, maxHp) => {
  let currentHp = maxHp;
  let battleField = "-";
  const PlayerInBattle = await db.getPlayerBattle(userId);
  if (PlayerInBattle) {
    const battleChannel = client.channels.get(PlayerInBattle.channelId);
    if (!battleChannel) {
      // await deleteInBattle(PlayerInBattle.channelId);
    } else {
      currentHp = PlayerInBattle.playerHp;
      battleField = battleChannel.name
        ? `${battleChannel.guild.name}の#${battleChannel.name}`
        : "個人チャット";
    }
  }
  return { currentHp, battleField };
};

const statusMessage = async (client, message, db) => {
  const userId = message.author.id;
  const playerExp = await db.getPlayerExp(userId);
  const playerLevel = Math.round(Math.sqrt(playerExp));
  const rank = await db.getPlayerRank(userId);
  const itemMessage = await getItemMessage(db, userId);
  const maxHp = playerLevel * 5 + 50;
  const { currentHp, battleField } = await getButtleData(
    client,
    db,
    userId,
    maxHp
  );

  return {
    embed: {
      title: `${message.author}のステータス`,
      url: message.author.avatarURL,
      color: 7506394,
      timestamp: new Date(),
      thumbnail: { url: message.author.avatarURL },
      fields: [
        { name: "Lv:", value: playerLevel, inline: true },
        { name: "HP:", value: `${currentHp}/${maxHp}`, inline: true },
        { name: "攻撃力:", value: playerLevel * 2 + 10, inline: true },
        { name: "所持アイテム:", value: itemMessage, inline: true },
        { name: "戦闘場所:", value: battleField, inline: true },
        {
          name: "次のレベルまで",
          value: `${(playerLevel + 1) ** 2 - playerExp}exp`,
          inline: true
        },
        { name: "プレイヤーランク", value: `${rank}位だ！`, inline: true }
      ]
    }
  };
};

module.exports = async (client, message, db) =>
  message.channel.send(await statusMessage(client, message, db));
