const util = require("util");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("mmo.db");

db.promiseAll = util.promisify(db.all).bind(db);
db.promiseGet = util.promisify(db.get).bind(db);
db.promiseRun = util.promisify(db.run).bind(db);

db.getPlayerExp = async userId => {
  const player = await db.promiseGet(
    "SELECT experience FROM player WHERE user_id=?",
    [userId]
  );
  if (player) return player.experience;
  db.promiseRun("INSERT INTO player values( ?, ? )", [userId, 1]);
  return 1;
};

db.getPlayerLevel = async userId =>
  Math.floor(Math.sqrt(await db.getPlayerExp(userId)));

db.getPlayerBattle = async userId => {
  const result = await db.promiseGet(
    "SELECT channel_id, player_hp FROM in_battle WHERE user_id=?",
    [userId]
  );
  return result
    ? { channelId: result.channel_id, playerHp: result.player_hp }
    : null;
};

// db.addPlayerExp = async (userId, exp) => {};

db.getPlayerRank = async userId => {
  const { rank } = await db.promiseGet(
    `SELECT (
        SELECT Count(0) FROM player WHERE player.experience > player1.experience
        ) + 1 AS rank 
        FROM player AS player1 WHERE user_id=?`,
    [userId]
  );
  return rank;
};

db.getPlayerItems = async userId => {
  const items = await db.promiseAll(
    "SELECT item_id FROM item WHERE user_id=?",
    [userId]
  );
  return items.map(item => item.item_id);
};

db.deletePlayerFromBattle = channelId =>
  db.promiseAll("DELETE FROM in_battle WHERE channel_id=?", [channelId]);

db.removeFromGuild = async guild => {
  guild.channels.forEach(async channel => {
    await db.promseRun("DELETE FROM in_battle WHERE channel_id=?", [
      channel.id
    ]);
    await db.promseRun("DELETE FROM channel_status WHERE channel_id=?", [
      channel.id
    ]);
  });
};

db.updateBossHp = (channelId, bossHp) =>
  db.promseRun("UPDATE channel_status SET boss_hp=? WHERE channel_id=?", [
    bossHp,
    channelId
  ]);

db.addPlayerIntoBattle = (channelId, userId, playerHp) =>
  db.promseRun("INSERT INTO in_battle values(?,?,?)", {
    channelId,
    userId,
    playerHp
  });

db.removeFromChannel = channelId =>
  db.promseRun("DELETE FROM in_battle WHERE channel_id=?", [channelId]);

db.getMembersInBattle = channelId =>
  db.promseAll("SELECT * FROM in_battle WHERE channel_id=?", [channelId]);

db.getBoss = async channelId => {
  const channelStatus = await db.promiseGet(
    "SELECT boss_level, boss_hp FROM channel_status WHERE channel_id=?",
    [channelId]
  );
  if (channelStatus) {
    return {
      bossLevel: channelStatus.boss_level,
      bossHp: channelStatus.boss_hp
    };
  }
  db.promiseRun("INSERT INTO channel_status values( ?, 1, 50)", [channelId]);
  return { bossLevel: 1, bossHp: 50 };
};

module.exports = db;
