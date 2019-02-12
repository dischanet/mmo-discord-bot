const channelsInTransaction = new Set();
const monsters = require("../assets/monsters");
class Battle {
  constructor(client, db, userId, channelId) {
    this.client = client;
    this.db = db;
    this.userId = userId;
    this.channelId = channelId;
    this.errorMessage = "ERROR";
    this.playerLevel = db.getPlayerLevel(userId);
    this.playerHp = undefined;
    const { bossLevel, bossHp } = db.getBoss(channelId);
    this.bossLevel = bossLevel;
    this.bossHp = bossHp;
    this.bossName;
  }

  process() {
    if (this.startFailed) {
      return;
    }
    this.playerAttack();
    if (this.won) {
      this.winProcess();
      return;
    }
    this.bossAttack();
  }

  get reply() {
    return "工事中です。";
  }

  async start() {
    if (this.playerLevel / this.bossLevel > 100) {
      this.errorMessage = "レベルが高すぎて攻撃できない！";
      return false;
    }

    if (channelsInTransaction.has(this.channelId)) {
      this.errorMessage = "攻撃失敗。ゆっくりコマンドを打ってね。";
      return false;
    }
    channelsInTransaction.add(this.channelId);

    const playerBattle = await this.db.getPlayerBattle(this.userId);
    if (!playerBattle) {
      await this.joinBattle();
      return true;
    }

    const battleChannel = this.client.channels.get(playerBattle.channelId);
    // In case the battleChannel has been deleted
    if (!battleChannel) {
      await this.db.removeFromChannel(playerBattle.channelId);
      await this.joinBattle();
      return true;
    }

    if (playerBattle.channelId !== this.channelId) {
      const battleField = battleChannel.is_private
        ? "プライベートチャンネル"
        : `${battleChannel.guild.name}の#${battleChannel.name}。`;
      this.errorMessage = `<@${this.userId}>は'${battleField}'で既に戦闘中だ。`;
      return false;
    }

    if (playerBattle.playerHp === 0) {
      this.errorMessage = `<@${this.userId}>はもうやられている！
（戦いをやり直すには「!!reset」だ）`;
      return false;
    }
  }

  end() {
    channelsInTransaction.delete(this.channelId);
  }

  async joinBattle() {
    this.playerHp = this.playerLevel * 5 + 50; // player_max_hp
    await this.db.addPlayerIntoBattle(
      this.channelId,
      this.userId,
      this.playerHp
    );
  }

  get playerAttackDamage() {
    if (!this._playerAttackDamage) {
      if (this.bossLevel % monsters.length in [20, 40] && this.rand < 0.1) {
        this._playerAttackDamage = 0;
      } else if (
        this.bossLevel % monsters.length in [2, 7, 13, 23, 34] &&
        this.rand < 0.05
      ) {
        this._playerAttackDamage = 0;
      } else if (this.rand < 0.01) {
        this._playerAttackDamage = 0;
      } else if (this.bossLevel % monsters.length in [3, 11, 17, 32, 41]) {
        const plus = this.rand < 0.96 ? this.rand / 3 + 0.5 : 3;
        this._playerAttackDamage = Math.round(this.playerLevel * plus + 10);
      } else if (this.bossLevel % 5 === 0) {
        const plus = this.rand < 0.96 ? this.rand / 2 + 0.8 : 3;
        this._playerAttackDamage = Math.round(this.playerLevel * plus + 10);
      } else {
        const plus = this.rand < 0.96 ? this.rand / 2 + 1 : 3;
        this._playerAttackDamage = Math.round(this.playerLevel * plus + 10);
      }
    }
    return this._playerAttackDamage;
  }

  playerAttackProcess() {
    this.bossHp = this.bossHp - this.playerAttackDamage;
    this.attackMessage;
    if (this.playerAttack === 0) {
      this.attackMessage = `<@${this.userId}>の攻撃！${
        this.bossName
      }にかわされてしまった...！！`;
    } else {
      return `<@${this.userId}>の攻撃！${this.bossName}に\`${
        this.playerAttack
      }\`のダメージを与えた！`;
    }
    if (this.won) {
      // win_message = win_process(channel_id, boss_level, monster_name)
      //   await bot.say("{}\n{}".format(attack_message, win_message))
      //   await reset_battle(channel_id, level_up=True)
    } else {
      this.updateBossHp(this.bossHp, this.channelId);
    }
  }

  winProcess() {
    // battle_members = [m for m in
    //                   conn.execute("SELECT * FROM in_battle WHERE channel_id=?", (channel_id,)).fetchall()]
    // level_up_comments = []
    // members = ""
    // fire_members = ""
    // elixir_members = ""
    // pray_members = ""
    // is_cicero = channel_id in special_monster
    // if is_cicero or boss_level % monsters.length == 0:
    //     exp = boss_level * 5
    // else:
    //     exp = boss_level
    // for battle_member in battle_members:
    //     member_id = battle_member[1]
    //     level_up_comments.append(experiment(member_id, exp))
    //     members += "<@{}> ".format(member_id)
    //     p = min(0.02 * boss_level * boss_level / get_player_exp(member_id), 0.1)
    //     if (boss_level % 50 == 0 or is_cicero) and random.random() < p:
    //         elixir_members += "<@{}> ".format(member_id)
    //         obtain_an_item(member_id, 1)
    //     if random.random() < p or is_cicero:
    //         fire_members += "<@{}> ".format(member_id)
    //         obtain_an_item(member_id, 2)
    //     if random.random() < p * 2 or is_cicero:
    //         pray_members += "<@{}> ".format(member_id)
    //         obtain_an_item(member_id, 3)
    // if fire_members:
    //     fire_members += "は`ファイアボールの書`を手に入れた！"
    // if elixir_members:
    //     elixir_members += "は`エリクサー`を手に入れた！"
    // if pray_members:
    //     pray_members += "は`祈りの書`を手に入れた！"
    // level_up_comment = "\n".join([c for c in level_up_comments if c])
    // item_get = "\n".join(c for c in [elixir_members, fire_members, pray_members] if c)
    // return "{0}を倒した！\n\n{1}は`{2}`の経験値を得た。{3}\n{4}".format(monster_name, members, exp, level_up_comment, item_get)
  }

  get won() {
    return this.bossHp <= 0;
  }

  get winMessage() {
    return "";
  }

  get bossAttackDamage() {
    if (!this._bossAttackDamage) {
      this._bossAttackDamage = 0;
    }
    return this._bossAttackDamage;
    //     if random.random() < 0.01:
    //     return 0
    // if boss_level % 50 == 0:
    //     return int(boss_level * random.random() * 256)
    // elif boss_level % 50 in [37, 46, 47, 48, 49]:
    //     return int(boss_level * random.random())
    // elif boss_level % 5 == 0:
    //     return int(boss_level * (1 + random.random()) * 3)
    // else:
    //     return int(boss_level * (2 + random.random()) + 5)
  }

  async bossAttackProcess() {
    this.playerHp = this.playerHp - this.bossAttackDamage;
    if (this.bossAttackDamage === 0) {
      this.bossAttackMessage = `${this.monsterName}の攻撃！<@${
        this.userId
      }>は華麗にかわした！
 - <@${this.userId}>のHP:\`${this.playerHp}\`/${this.playerLevel * 5 + 50}`;
    } else if (this.playerHp <= 0) {
      await this.db.updatePlayerHp(this.userId, 0);
      this.bossAttackMessage = `${this.monsterName}の攻撃！<@${
        this.userId
      }>は\`${this.bossAttackDamage}\`のダメージを受けた。
 - <@${this.userId}>のHP:\`0\`/${this.playerLevel * 5 + 50}
 <@${this.userId}>はやられてしまった。。。`;
    } else {
      await this.db.updatePlayerHp(this.userId, this.playerHp);
      this.bossAttackMessage = `${this.monsterName}の攻撃！<@${
        this.userId
      }>は\`${this.bossAttackDamage}\`のダメージを受けた。
 - <@${this.userId}>のHP:\`${this.playerHp}\`/${this.playerLevel * 5 + 50}`;
    }
  }

  get resultMessage() {
    return `${this.attackMessage}
 - ${this.bossName}のHP:\`${this.bossHp}\`/${this.bossLevel * 10 + 50}
 ${this.bossAttackMessage}`;
  }
}

module.exports = async (client, message, db) => {
  const battle = new Battle(client, db, message.author.id, message.channel.id);
  try {
    await battle.start();
    await battle.process();
  } finally {
    await battle.end();
  }
  message.channel.send(battle.reply);
};
