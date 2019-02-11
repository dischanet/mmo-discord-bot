const channelsInTransaction = new Set();

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

  process(){
    if (this.startFailed) {
      return;
    }
      this.playerAttack();
    if (this.won) {
      this.winProcess()
      return;
    }
      this.bossAttack();
  }


  get reply() {
    return "工事中です。"
  }

  start() {
    if (this.playerLevel / this.bossLevel > 100) {
      this.errorMessage = "レベルが高すぎて攻撃できない！";
      return false;
    }

    if (channelsInTransaction.has(this.channelId)) {
      this.errorMessage = "攻撃失敗。ゆっくりコマンドを打ってね。";
      return false;
    }
    channelsInTransaction.add(this.channelId);

    const playerBattle = this.db.getPlayerBattle(this.userId);
    if (!playerBattle) {
      this.joinBattle();
      return true;
    }

    const battleChannel = this.client.channels.get(playerBattle.channelId);
    // In case the battleChannel has been deleted
    if (!battleChannel) {
      this.db.removeFromChannel(playerBattle.channelId);
      this.joinBattle();
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

  joinBattle() {
    this.playerHp = this.playerLevel * 5 + 50; // player_max_hp
    this.db.addPlayerIntoBattle(this.channelId, this.userId, this.playerHp);
  }

  get playerAttackDamage() {
    if (!this._playerAttackDamage) {
      this._playerAttackDamage = 0;
    }
    return this._playerAttackDamage;
    // def get_player_attack(player_level, boss_level):
    // if boss_level % MONSTER_NUM in [20, 40] and rand < 0.1:
    //     player_attack = 0
    // elif boss_level % MONSTER_NUM in [2, 7, 13, 23, 34] and rand < 0.05:
    //     player_attack = 0
    // elif rand < 0.01:
    //     player_attack = 0
    // elif boss_level % MONSTER_NUM in [3, 11, 17, 32, 41]:
    //     plus = rand / 3 + 0.5 if rand < 0.96 else 3
    //     player_attack = int(player_level * plus + 10)
    // elif boss_level % 5 == 0:
    //     plus = rand / 2 + 0.8 if rand < 0.96 else 3
    //     player_attack = int(player_level * plus + 10)
    // else:
    //     plus = rand / 2 + 1 if rand < 0.96 else 3
    //     player_attack = int(player_level * plus + 10)
    // return player_attack
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
    // if is_cicero or boss_level % MONSTER_NUM == 0:
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

  bossAttackProcess() {
    this.playerHp = this.playerHp - this.bossAttackDamage
    if (this.bossAttackDamage == 0) {
      this.bossAttackMessage = "{0}の攻撃！<@{1}>は華麗にかわした！\n - <@{1}>のHP:`{2}`/{3}".format(
        monster_name, user_id, this.playerHp, player_level * 5 + 50)
    }
    else if (this.playerHp <= 0) {
      conn.execute("UPDATE in_battle SET player_hp=0 WHERE user_id=?", (user_id,))
      this.bossAttackMessage = "{0}の攻撃！<@{1}>は`{2}`のダメージを受けた。\n - <@{1}>のHP:`0`/{3}\n<@{1}>はやられてしまった。。。".format(
          monster_name, user_id, this.bossAttackDamage, player_level * 5 + 50)
    }
    else {
      conn.execute("UPDATE in_battle SET player_hp=? WHERE user_id=?", (this.playerHp, user_id,))
      this.bossAttackMessage = "{0}の攻撃！<@{1}>は`{2}`のダメージを受けた。\n - <@{1}>のHP:`{3}`/{4}".format(
          monster_name, user_id, this.bossAttackDamage, this.playerHp, player_level * 5 + 50) 
    }
  }

  get resultMessage() {
    return `${this.attackMessage}
 - ${this.bossName}のHP:\`${this.bossHp}\`/${boss_level * 10 + 50}
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
