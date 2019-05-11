module.exports = async (client, message, db) => {
  const channels = db.getRanking();
  const servers = {};
  for (const channel of channels) {
    const c = client.channel.get(channel.channel_id);
    if (!c) continue;
    const server = c.server;
    if (!servers[server.id])
      servers[server.id] = [server.name, channel.boss_level];
    if (servers.length > 9) break;
  }
  await message.channel
    .send(
      `\`\`\`上位10サーバーのランキング\n${Object.entries(
        Object.values(servers)
      ).map((i, a) => `${i + 1}位：${a[0]} (Lv${a[1]})`)}\`\`\``
    )
    .join("\n");
};
