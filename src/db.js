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

module.exports = db;
