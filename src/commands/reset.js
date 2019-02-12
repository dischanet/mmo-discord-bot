module.exports = async (client, message, db) => {
  const channelId = message.channel.id;
  if (!(await db.inBattle(channelId))) {
    return message.channel.send(
      "このチャンネルでは戦いは行われていないようだ。"
    );
  }
  const newBoss = await db.resetBattle(message.channel.id);
  message.channel.send(newBoss);
};
