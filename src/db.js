const util = require("util");
module.exports = db => {
  const dbAll = util.promisify(db.all).bind(db);
  const dbGet = util.promisify(db.get).bind(db);
  const dbRun = util.promisify(db.run).bind(db);

  const getPlayerExp = async userId => {
    const player = dbGet("SELECT experience FROM player WHERE user_id=?", [
      userId
    ]);
    if (player) return player.experience;
    dbRun("INSERT INTO player values( ?, ? )", [userId, 1]);
    return 1;
  };
  const getPlayerBattle = async userId => {
    const result = dbGet(
      "SELECT channel_id, player_hp FROM in_battle WHERE user_id=?",
      [userId]
    );
    return result
      ? { channelId: result.channel_id, playerHp: result.player_hp }
      : null;
  };
  const getRank = async userId => {
    const { rank } = dbGet(
      `SELECT (
          SELECT Count(0) FROM player WHERE player.experience > player1.experience
          ) + 1 AS rank 
          FROM player AS player1 WHERE user_id=?`,
      [userId]
    );
    return rank;
  };
  const getItems = async userId => {
    const items = dbAll("SELECT item_id FROM item WHERE user_id=?", [userId]);
    return items.map(item => item.item_id);
  };
  const deleteInBattle = channelId =>
    dbAll("DELETE FROM in_battle WHERE channel_id=?", [channelId]);

  return { getPlayerExp, getPlayerBattle, getRank, getItems, deleteInBattle };
};
