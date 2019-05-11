const util = require("util");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("mmo.db");
const monsters = require("./assets/monsters");

db.promiseAll = util.promisify(db.all);
db.promiseGet = util.promisify(db.get);
db.promiseRun = util.promisify(db.run);

db.getRanking = () =>
  db.promiseAll(
    "SELECT channel_id, boss_level FROM channel_status ORDER BY boss_level DESC"
  );

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

db.addPlayerIntoBattle = (channelId, userId, playerHp) =>
  db.promiseRun("INSERT INTO in_battle values(?,?,?)", [
    channelId,
    userId,
    playerHp
  ]);

db.deletePlayerFromBattle = channelId =>
  db.promiseAll("DELETE FROM in_battle WHERE channel_id=?", [channelId]);

db.updatePlayerHp = (userId, playerHp) =>
  db.promiseRun("UPDATE in_battle SET player_hp=? WHERE user_id=?", [
    userId,
    playerHp
  ]);

db.getBattleMembers = async channelId => {
  const members = await db.promiseAll(
    "SELECT * FROM in_battle WHERE channel_id=?",
    [channelId]
  );
  return members.map(m => ({
    userId: m.user_id,
    playerHp: m.player_hp
  }));
};

db.addExp = async (userId, exp) => {
  const currentExp = await db.getPlayerExp(userId);
  const nextExp = currentExp + exp;
  const currentLevel = Math.floor(Math.sqrt(currentExp));
  await db.promiseRun("UPDATE player SET experience=? WHERE user_id=?", [
    nextExp,
    userId
  ]);
  if (nextExp > (currentLevel + 1) ** 2) {
    const nextLevel = Math.floor(Math.sqrt(nextExp));
    return `<@${userId}>はレベルアップした！\`Lv.${currentLevel} -> Lv.${nextLevel}\``;
  }
  return "";
};

db.inBattle = channelId =>
  db.promiseGet("SELECT 0 FROM in_battle WHERE channel_id=?", [channelId]);

db.obtainItem = async (userId, itemId) => {
  const item = await db.promiseGet(
    "SELECT count FROM item WHERE user_id=? and item_id=?",
    [userId, itemId]
  );
  if (item.count) {
    await db.promiseRun(
      "UPDATE item SET count=? WHERE user_id=? and item_id=?",
      [item.count + 1, userId, itemId]
    );
  } else {
    await db.promiseRun("INSERT INTO item VALUES(?,?,1)", [userId, itemId]);
  }
};

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
  await db.promiseRun("INSERT INTO channel_status values( ?, 1, 50)", [
    channelId
  ]);
  return { bossLevel: 1, bossHp: 50 };
};

db.updateBossHp = (channelId, bossHp) =>
  db.promiseRun("UPDATE channel_status SET boss_hp=? WHERE channel_id=?", [
    bossHp,
    channelId
  ]);

db.removeFromGuild = async guild => {
  guild.channels.forEach(async channel => {
    await db.promiseRun("DELETE FROM in_battle WHERE channel_id=?", [
      channel.id
    ]);
    await db.promiseRun("DELETE FROM channel_status WHERE channel_id=?", [
      channel.id
    ]);
  });
};

db.removeFromChannel = channelId =>
  db.promiseRun("DELETE FROM in_battle WHERE channel_id=?", [channelId]);

db.resetBattle = async (channelId, levelUp) => {
  await db.promiseRun("DELETE FROM in_battle WHERE channel_id=?", [channelId]);
  await db.promiseRun(
    levelUp
      ? "UPDATE channel_status SET boss_level=boss_level+1, boss_hp=boss_level*10+60 WHERE channel_id=?"
      : "UPDATE channel_status SET boss_hp=boss_level*10+50 WHERE channel_id=?",
    [channelId]
  );
  const { bossLevel, bossHp } = await db.getBoss(channelId);
  const monster = monsters[bossLevel % monsters.length];
  return `${monster.name}が待ち構えている...！\nLv.${bossLevel}  HP:${bossHp}`;
};

module.exports = db;
