const channelsInTransaction = new Set();
const monsters = require("../assets/monsters");
class Battle {
  constructor(client, db, userId, channelId) {
    this.client = client;
    this.db = db;
    this.userId = userId;
    this.channelId = channelId;
    this.player;
    this.boss;
    this.startSuccess = false;
  }

  async start() {
    this.player = { level: await this.db.getPlayerLevel(this.userId) };

    const { bossLevel, bossHp } = await this.db.getBoss(this.channelId);
    this.boss = monsters[bossLevel % 50];
    this.boss.level = bossLevel;
    this.boss.hp = bossHp;

    // if (this.player.level / this.boss.level > 100) {
    //   this.reply = "レベルが高すぎて攻撃できない！";
    //   return;
    // }

    if (channelsInTransaction.has(this.channelId)) {
      this.reply = "攻撃失敗。ゆっくりコマンドを打ってね。";
      return;
    }
    channelsInTransaction.add(this.channelId);

    const playerBattle = await this.db.getPlayerBattle(this.userId);
    if (!playerBattle) {
      await this.joinBattle();
      this.startSuccess = true;
      return;
    }

    const battleChannel = this.client.channels.get(playerBattle.channelId);
    // In case the battleChannel has been deleted
    if (!battleChannel) {
      await this.db.removeFromChannel(playerBattle.channelId);
      await this.joinBattle();
      this.startSuccess = true;
      return;
    }

    if (playerBattle.channelId !== this.channelId) {
      const battleField =
        battleChannel.type === "dm" || battleChannel.type === "group"
          ? "プライベートチャンネル"
          : `${battleChannel.guild.name}の#${battleChannel.name}。`;
      this.reply = `<@${this.userId}>は'${battleField}'で既に戦闘中だ。`;
      return;
    }

    if (playerBattle.playerHp === 0) {
      this.reply = `<@${this.userId}>はもうやられている！
（戦いをやり直すには「!!reset」だ）`;
      return;
    }

    this.startSuccess = true;
  }

  async joinBattle() {
    this.playerHp = this.playerLevel * 5 + 50; // player_max_hp
    await this.db.addPlayerIntoBattle(
      this.channelId,
      this.userId,
      this.playerHp
    );
  }

  async playerAttackProcess() {
    this.boss.hp = this.boss.hp - this.playerAttackDamage;
    if (this.playerAttack === 0) {
      this.reply = `<@${this.userId}>の攻撃！${
        this.bossName
      }にかわされてしまった...！！`;
    } else {
      this.reply = `<@${this.userId}>の攻撃！${this.bossName}に\`${
        this.playerAttack
      }\`のダメージを与えた！`;
    }
    if (this.win) {
      await this.winProcess();
      await this.resetBattle(true);
    } else {
      this.updateBossHp();
    }
  }

  get playerAttackDamage() {
    if (!this._playerAttackDamage) {
      if (this.boss.level % monsters.length in [20, 40] && this.rand < 0.1) {
        this._playerAttackDamage = 0;
      } else if (
        this.boss.level % monsters.length in [2, 7, 13, 23, 34] &&
        this.rand < 0.05
      ) {
        this._playerAttackDamage = 0;
      } else if (this.rand < 0.01) {
        this._playerAttackDamage = 0;
      } else if (this.boss.level % monsters.length in [3, 11, 17, 32, 41]) {
        const plus = this.rand < 0.96 ? this.rand / 3 + 0.5 : 3;
        this._playerAttackDamage = Math.round(this.playerLevel * plus + 10);
      } else if (this.boss.level % 5 === 0) {
        const plus = this.rand < 0.96 ? this.rand / 2 + 0.8 : 3;
        this._playerAttackDamage = Math.round(this.playerLevel * plus + 10);
      } else {
        const plus = this.rand < 0.96 ? this.rand / 2 + 1 : 3;
        this._playerAttackDamage = Math.round(this.playerLevel * plus + 10);
      }
    }
    return this._playerAttackDamage;
  }

  async winProcess() {
    const levelUpComments = [];
    let members = "";
    let fireMembers = "";
    let elixirMembers = "";
    let prayMembers = "";
    const exp =
      this.boss.level % monsters.length == 0
        ? this.boss.level * 5
        : this.boss.level;

    (await this.db.getBattleMembers()).forEach(memberId => {
      levelUpComments.append(this.db.experience(memberId, exp));
      members += "<@{}> ".format(memberId);
      const p = Math.min(
        (0.02 * this.boss.level * this.boss.level) /
          this.db.getPlayerLevel(memberId),
        0.1
      );
      if (this.boss.level % 50 === 0 && Math.random() < p) {
        elixirMembers += "<@{}> ".format(memberId);
        this.db.obtainItem(memberId, 1);
      }
      if (Math.random() < p) {
        this.db.obtainItem(memberId, 2);
        fireMembers += "<@{}> ".format(memberId);
      }
      if (Math.random() < p * 2) {
        prayMembers += "<@{}> ".format(memberId);
        this.db.obtainItem(memberId, 3);
      }
    });

    if (fireMembers) {
      fireMembers += "は`ファイアボールの書`を手に入れた！";
    }
    if (elixirMembers) {
      elixirMembers += "は`エリクサー`を手に入れた！";
    }
    if (prayMembers) {
      prayMembers += "は`祈りの書`を手に入れた！";
    }
    const LevelUpComment = levelUpComments.join("\n");
    return `${this.monsterName}を倒した！
${members}は\`${exp}\`の経験値を得た。
${LevelUpComment}
${fireMembers}
${prayMembers}
${elixirMembers}
`;
  }

  get win() {
    return this.boss.hp <= 0;
  }

  async bossAttackProcess() {
    this.reply += `
- ${this.bossName}のHP:\`${this.boss.hp}\`/${this.boss.level * 10 + 50}`;
    this.playerHp = this.playerHp - this.bossAttackDamage;
    if (this.bossAttackDamage === 0) {
      this.reply += `${this.monsterName}の攻撃！<@${
        this.userId
      }>は華麗にかわした！
 - <@${this.userId}>のHP:\`${this.playerHp}\`/${this.playerLevel * 5 + 50}`;
    } else if (this.playerHp <= 0) {
      await this.db.updatePlayerHp(this.userId, 0);
      this.reply += `${this.monsterName}の攻撃！<@${this.userId}>は\`${
        this.bossAttackDamage
      }\`のダメージを受けた。
 - <@${this.userId}>のHP:\`0\`/${this.playerLevel * 5 + 50}
 <@${this.userId}>はやられてしまった。。。`;
    } else {
      await this.db.updatePlayerHp(this.userId, this.playerHp);
      this.reply += `${this.monsterName}の攻撃！<@${this.userId}>は\`${
        this.bossAttackDamage
      }\`のダメージを受けた。
 - <@${this.userId}>のHP:\`${this.playerHp}\`/${this.playerLevel * 5 + 50}`;
    }
  }

  get bossAttackDamage() {
    if (!this._bossAttackDamage) {
      const r = Math.random();
      if (r < 0.01) {
        this._bossAttackDamage = 0;
      }
      if (this.boss.level % 50 === 0) {
        this._bossAttackDamage = Math.round(this.boss.level * r * 256);
      }
      if (this.boss.level % 50 in [37, 46, 47, 48, 49]) {
        this._bossAttackDamage = Math.round(this.boss.level * r);
      }
      if (this.boss.level % 5 === 0) {
        this._bossAttackDamage = Math.round(this.boss.level * (1 + r) * 3);
      }
      this._bossAttackDamage = Math.round(this.boss.level * (2 + r) + 5);
    }
    return this._bossAttackDamage;
  }

  end() {
    channelsInTransaction.delete(this.channelId);
  }
}

module.exports = async (client, message, db) => {
  const battle = new Battle(client, db, message.author.id, message.channel.id);
  try {
    await battle.start();
    if (battle.startSuccess) {
      await battle.playerAttackProcess();
      if (!battle.win) {
        await battle.bossAttackProcess();
      }
    }
  } finally {
    await battle.end();
  }
  message.channel.send(battle.reply);
};
