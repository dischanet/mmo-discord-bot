import random
import sqlite3
import math
import json
from xml.etree import ElementTree

import discord
from discord.ext import commands
import requests

MONSTER_NUM = 50

f = open('/home/centos/discord_bot/mmo/monsters.json', 'r')
monsters = json.load(f)
f = open('training.json', 'r')
training_set = json.load(f)
conn = sqlite3.connect("mmo.db")
bot = commands.Bot(command_prefix='!!', description='MMOくんはみんなでボスを倒して行くRPGです。')


@bot.event
async def on_ready():
    print('Logged in as')
    print(bot.user.name)
    print(bot.user.id)
    print('------')
    return await bot.change_presence(game=discord.Game(name="!!help|ver0.9.0", url="https://discha.net"))


@bot.event
async def on_server_remove(server):
    for channel in server.channels:
        conn.execute("DELETE FROM in_battle WHERE channel_id=?", (channel.id,))
        conn.execute("DELETE FROM channel_status WHERE channel_id=?", (channel.id,))
    conn.commit()


channel_in_transaction = []
special_monster = {}


@bot.command(pass_context=True, description='チャンネル内の敵に攻撃します。敵の反撃を受けます。')
async def attack(ctx):
    """攻撃する"""
    if ctx.message.author.bot: return
    channel_id = ctx.message.channel.id
    if channel_id in channel_in_transaction:
        return await bot.say("`攻撃失敗。ゆっくりコマンドを打ってね。`")
    try:
        channel_in_transaction.append(channel_id)
        await _attack(ctx.message.author.id, channel_id)
        conn.commit()
    finally:
        channel_in_transaction.remove(channel_id)


async def _attack(user_id, channel_id):
    player_hp, error_message = into_battle(user_id, channel_id)
    if error_message: return await bot.say(error_message)
    player_level = get_player_level(user_id)
    boss_level, boss_hp = get_boss_level_and_hp(channel_id)
    if player_level / boss_level > 100: return await bot.say("レベルが高すぎて攻撃できない！")
    rand = random.random()
    player_attack = get_player_attack(player_level, boss_level, rand)
    boss_hp = boss_hp - player_attack
    if channel_id in special_monster:
        monster_name = special_monster[channel_id]["name"]
    else:
        monster_name = monsters[boss_level % MONSTER_NUM]["name"]
    attack_message = get_attack_message(user_id, player_attack, monster_name, rand)
    if boss_hp <= 0:
        win_message = win_process(channel_id, boss_level, monster_name)
        await bot.say("{}\n{}".format(attack_message, win_message))
        await reset_battle(channel_id, level_up=True)
    else:
        conn.execute("UPDATE channel_status SET boss_hp=? WHERE channel_id=?", (boss_hp, channel_id,))
        boss_attack_message = boss_attack_process(user_id, player_hp, player_level, monster_name, boss_level)
        await bot.say("{}\n - {}のHP:`{}`/{}\n\n{}".format(
            attack_message, monster_name, boss_hp, boss_level * 10 + 50, boss_attack_message))


def into_battle(user_id, channel_id):
    error_message = ""
    player_level = get_player_level(user_id)
    in_battle = conn.execute("SELECT channel_id, player_hp FROM in_battle WHERE user_id=?", (user_id,)).fetchone()
    if not in_battle:
        player_hp = player_level * 5 + 50  # player_max_hp
        conn.execute("INSERT INTO in_battle values(?,?,?)", (channel_id, user_id, player_hp))
        return player_hp, error_message
    in_battle_channel_id = str(in_battle[0])
    battle_channel = bot.get_channel(in_battle_channel_id)
    if not battle_channel:  # if deleted the battle_channel
        player_hp = player_level * 5 + 50
        conn.execute("DELETE FROM in_battle WHERE channel_id=?", (in_battle_channel_id,))
        conn.execute("INSERT INTO in_battle values(?,?,?)", (channel_id, user_id, player_hp))
        return player_hp, error_message
    player_hp = in_battle[1]
    if in_battle_channel_id != channel_id:
        battle_field = "プライベートチャンネル" if battle_channel.is_private else "{}の#{}".format(
            battle_channel.server.name, battle_channel.name)
        error_message = "<@{}>は'{}'で既に戦闘中だ。".format(user_id, battle_field)
    elif player_hp == 0:
        error_message = "<@{}>はもうやられている！（戦いをやり直すには「!!reset」だ）".format(user_id, )
    return player_hp, error_message


def get_attack_message(user_id, player_attack, monster_name, rand):
    if player_attack == 0:
        return "<@{}>の攻撃！{}にかわされてしまった...！！".format(user_id, monster_name, )
    else:
        kaishin = "会心の一撃！" if rand > 0.96 else ""
        return "<@{}>の攻撃！{}{}に`{}`のダメージを与えた！".format(user_id, kaishin, monster_name, player_attack)


def win_process(channel_id, boss_level, monster_name):
    battle_members = [m for m in
                      conn.execute("SELECT * FROM in_battle WHERE channel_id=?", (channel_id,)).fetchall()]
    level_up_comments = []
    members = ""
    fire_members = ""
    elixir_members = ""
    pray_members = ""
    is_cicero = channel_id in special_monster
    if is_cicero or boss_level % MONSTER_NUM == 0:
        exp = boss_level * 5
    else:
        exp = boss_level
    for battle_member in battle_members:
        member_id = battle_member[1]
        level_up_comments.append(experiment(member_id, exp))
        members += "<@{}> ".format(member_id)
        p = min(0.02 * boss_level * boss_level / get_player_exp(member_id), 0.1)
        if (boss_level % 50 == 0 or is_cicero) and random.random() < p:
            elixir_members += "<@{}> ".format(member_id)
            obtain_an_item(member_id, 1)
        if random.random() < p or is_cicero:
            fire_members += "<@{}> ".format(member_id)
            obtain_an_item(member_id, 2)
        if random.random() < p * 2 or is_cicero:
            pray_members += "<@{}> ".format(member_id)
            obtain_an_item(member_id, 3)
    if fire_members:
        fire_members += "は`ファイアボールの書`を手に入れた！"
    if elixir_members:
        elixir_members += "は`エリクサー`を手に入れた！"
    if pray_members:
        pray_members += "は`祈りの書`を手に入れた！"
    level_up_comment = "\n".join([c for c in level_up_comments if c])
    item_get = "\n".join(c for c in [elixir_members, fire_members, pray_members] if c)
    return "{0}を倒した！\n\n{1}は`{2}`の経験値を得た。{3}\n{4}".format(monster_name, members, exp, level_up_comment, item_get)


def boss_attack_process(user_id, player_hp, player_level, monster_name, boss_level):
    boss_attack = get_boss_attack(boss_level)
    player_hp = player_hp - boss_attack
    if boss_attack == 0:
        return "{0}の攻撃！<@{1}>は華麗にかわした！\n - <@{1}>のHP:`{2}`/{3}".format(
            monster_name, user_id, player_hp, player_level * 5 + 50)
    elif player_hp <= 0:
        conn.execute("UPDATE in_battle SET player_hp=0 WHERE user_id=?", (user_id,))
        return "{0}の攻撃！<@{1}>は`{2}`のダメージを受けた。\n - <@{1}>のHP:`0`/{3}\n<@{1}>はやられてしまった。。。".format(
            monster_name, user_id, boss_attack, player_level * 5 + 50)
    else:
        conn.execute("UPDATE in_battle SET player_hp=? WHERE user_id=?", (player_hp, user_id,))
        return "{0}の攻撃！<@{1}>は`{2}`のダメージを受けた。\n - <@{1}>のHP:`{3}`/{4}".format(
            monster_name, user_id, boss_attack, player_hp, player_level * 5 + 50)


def get_player_attack(player_level, boss_level, rand):
    if boss_level % MONSTER_NUM in [20, 40] and rand < 0.1:
        player_attack = 0
    elif boss_level % MONSTER_NUM in [2, 7, 13, 23, 34] and rand < 0.05:
        player_attack = 0
    elif rand < 0.01:
        player_attack = 0
    elif boss_level % MONSTER_NUM in [3, 11, 17, 32, 41]:
        plus = rand / 3 + 0.5 if rand < 0.96 else 3
        player_attack = int(player_level * plus + 10)
    elif boss_level % 5 == 0:
        plus = rand / 2 + 0.8 if rand < 0.96 else 3
        player_attack = int(player_level * plus + 10)
    else:
        plus = rand / 2 + 1 if rand < 0.96 else 3
        player_attack = int(player_level * plus + 10)
    return player_attack


def get_boss_attack(boss_level):
    if random.random() < 0.01:
        return 0
    if boss_level % 50 == 0:
        return int(boss_level * random.random() * 256)
    elif boss_level % 50 in [37, 46, 47, 48, 49]:
        return int(boss_level * random.random())
    elif boss_level % 5 == 0:
        return int(boss_level * (1 + random.random()) * 3)
    else:
        return int(boss_level * (2 + random.random()) + 5)


@bot.command(pass_context=True, description='自分のステータスを確認する')
async def status(ctx):
    """自分のステータスを確認する"""
    if ctx.message.author.bot: return
    user_id = ctx.message.author.id
    player_exp = get_player_exp(user_id)
    in_battle = conn.execute("SELECT channel_id, player_hp FROM in_battle WHERE user_id=?", (user_id,)).fetchone()
    rank = conn.execute("""SELECT 
            (SELECT Count(0) FROM player WHERE player.experience > player1.experience) + 1 AS rank 
             FROM player AS player1 WHERE user_id=?""", (user_id,)).fetchone()[0]
    item_comment = ""
    for my_item in conn.execute("SELECT item_id FROM item WHERE user_id=?", (user_id,)).fetchall():
        if my_item[0] == -10:
            item_comment += "【運営の証】を持っている。\n"
        if my_item[0] == -9:
            item_comment += "【サポーターの証】を持っている。\n"
    player_level = int(math.sqrt(player_exp))
    status_comment = "<@{0}>のステータス\nLv: {1}\nHP: {2} \n攻撃力: {3}\nEXP: {4}\n次のレベルまで {5}exp\n{6}\nプレイヤーランクは{7}位だ！".format(
        user_id, player_level, player_level * 5 + 50, player_level * 2 + 10,
        player_exp, (player_level + 1) ** 2 - player_exp, item_comment, rank
    )
    if in_battle:
        battle_channel = bot.get_channel(str(in_battle[0]))
        if not battle_channel:  # if deleted the battle_channel
            conn.execute("DELETE FROM in_battle WHERE channel_id=?", (str(in_battle[0]),))
        else:
            battle_field = "{0.server.name}の#{0.name}".format(battle_channel) if battle_channel.name else "個人チャット"
            status_comment = "<@{}>のステータス\nLv: {}\nHP: {} / {}\n攻撃力: {}\nEXP: {}\n次のレベルまで {}exp\n\n{}で戦闘中！\n{}\nプレイヤーランクは{}位だ！".format(
                user_id, player_level, in_battle[1], player_level * 5 + 50, player_level * 2 + 10,
                player_exp, (player_level + 1) ** 2 - player_exp, battle_field, item_comment, rank
            )
    await bot.say(status_comment)


@bot.command(pass_context=True, description='チャンネルのバトルの状態を確認する')
async def inquiry(ctx):
    """チャンネルのバトルの状態を確認する"""
    channel_id = ctx.message.channel.id
    boss_level, boss_hp = get_boss_level_and_hp(channel_id)
    if channel_id in special_monster:
        monster = special_monster[channel_id]
    else:
        monster = monsters[boss_level % MONSTER_NUM]
    em = discord.Embed()
    em.set_image(url="https://discha.net/static/forbot/{}".format(monster["img"]))
    in_battles = conn.execute("""SELECT in_battle.user_id, player.experience, in_battle.player_hp 
    FROM in_battle, player WHERE in_battle.channel_id=? AND player.user_id=in_battle.user_id""",
                              (channel_id,)).fetchall()
    rank = conn.execute("""SELECT 
        (SELECT Count(0) FROM channel_status WHERE channel_status.boss_level > channel_status1.boss_level) + 1 AS rank 
         FROM channel_status AS channel_status1 WHERE channel_id=?""", (ctx.message.channel.id,)).fetchone()[0]
    rank_say = 'このチャンネルの世界ランキングは「{}位」だ！'.format(rank)
    if in_battles:
        members = "\n ".join("<@{}> Lv.{} 残りHP: {}".format(
            in_battle[0], int(math.sqrt(in_battle[1])), in_battle[2]) for in_battle in in_battles)
        await bot.say(
            "{0}\n\nLv:{1}の{2}と戦闘中だ！\n{2}のHP:{3}/{4}\n\n戦闘中のメンバー:\n{5}".format(
                rank_say, boss_level, monster["name"], boss_hp, boss_level * 10 + 50, members), embed=em)
    else:
        await bot.say("{0}\n\nLv: {1}の{2}が待ち構えている。\n{2}のHP:{3}\n".format(
            rank_say, boss_level, monster["name"], boss_level * 10 + 50), embed=em)


@bot.command(pass_context=True, description='戦いをやり直す')
async def reset(ctx):
    """戦いをやり直す"""
    if conn.execute("SELECT 0 FROM in_battle WHERE channel_id=?", (ctx.message.channel.id,)).fetchone():
        await reset_battle(ctx.message.channel.id, False)
    else:
        await bot.say("このチャンネルでは戦いは行われていないようだ。")


@bot.command(pass_context=True, description='四字熟語の読み方をひらがなで入力し、正解すると経験値がもらえるぞ。')
async def t(ctx):
    """トレーニングをする"""
    user = ctx.message.author
    if user.bot: return
    q_id = random.randint(0, 619)
    await bot.say("「{}」の読み方をひらがなで答えなさい。".format(training_set[q_id][0]))
    answer = training_set[q_id][1]
    exp = math.ceil(get_player_level(user.id) / 8)
    guess = await bot.wait_for_message(timeout=12.0, author=user)
    if guess is None:
        await bot.say('時間切れだ。正解は「{}」だ。'.format(answer))
        return
    if guess.content == answer:
        comment = experiment(user.id, exp)
        if random.random() < 0.005:
            comment += "\n`エリクサー`を手に入れた！"
            obtain_an_item(user.id, 1)
        if random.random() < 0.1:
            comment += "\n`ファイアボールの書`を手に入れた！"
            obtain_an_item(user.id, 2)
        if random.random() < 0.1:
            comment += "\n`祈りの書`を手に入れた！"
            obtain_an_item(user.id, 3)
        conn.commit()
        await bot.say('正解だ！{}の経験値を得た。\n{}'.format(exp, comment))
    else:
        await bot.say('残念！正解は「{}」だ。'.format(answer))


@bot.command(pass_context=True, description='クイズに解答し、正解すると経験値がもらえるぞ。')
async def q(ctx):
    """トレーニングをする"""
    user = ctx.message.author
    if user.bot: return
    resp = requests.get(url='http://24th.jp/test/quiz/api_quiz.php')
    quiz_xml = ElementTree.fromstring(resp.text.encode('utf-8'))[1]
    quiz_set = [quiz_xml[2].text, quiz_xml[3].text, quiz_xml[4].text, quiz_xml[5].text]
    random.shuffle(quiz_set)
    await bot.say("Q. {}\n 1. {}\n 2. {}\n 3. {}\n 4. {}".format(quiz_xml[1].text, *quiz_set))
    answer_num = quiz_set.index(quiz_xml[2].text) + 1
    exp = math.ceil(get_player_level(user.id) / 10)
    guess = await bot.wait_for_message(timeout=10.0, author=user)
    if guess is None:
        await bot.say('時間切れだ。正解は「{}」だ。'.format(quiz_xml[2].text))
        return
    if guess.content.isdigit() and int(guess.content) == answer_num:
        comment = experiment(user.id, exp)
        if random.random() < 0.005:
            comment += "\n`エリクサー`を手に入れた！"
            obtain_an_item(user.id, 1)
        if random.random() < 0.1:
            comment += "\n`ファイアボールの書`を手に入れた！"
            obtain_an_item(user.id, 2)
        if random.random() < 0.1:
            comment += "\n`祈りの書`を手に入れた！"
            obtain_an_item(user.id, 3)
        conn.commit()
        await bot.say('正解だ！{}の経験値を得た。\n{}'.format(exp, comment))
    else:
        await bot.say('残念！正解は「{}」だ。'.format(quiz_xml[2].text))


items = {-10: "運営の証", -9: "サポーターの証", 1: "エリクサー", 2: "ファイアボールの書", 3: "祈りの書", }
item_description = """アイテムの説明
エリクサー:チャンネルの全員を全回復させる。
ファイアボールの書:遠隔攻撃する。
祈りの書:仲間一人を復活させる。
サポーターの証:MMOくんをサポートしてくれた証だ！
"""


@bot.command(pass_context=True, description=item_description)
async def item(ctx, item_name=""):
    """アイテムを使う"""
    if ctx.message.author.bot: return
    channel_id = ctx.message.channel.id
    if channel_id in channel_in_transaction:
        return await bot.say("`アイテム使用失敗。ゆっくりコマンドを打ってね。`")
    try:
        channel_in_transaction.append(channel_id)
        await _item(ctx.message.author.id, channel_id, item_name, ctx.message.mentions)
        conn.commit()
    finally:
        channel_in_transaction.remove(channel_id)


async def _item(user_id, channel_id, item_name, mentions):
    if not item_name:
        my_items = conn.execute("SELECT item_id, count FROM item WHERE user_id=? ORDER BY item_id",
                                (user_id,)).fetchall()
        item_list = "\n".join("{} : {}個".format(items[i[0]], i[1]) for i in my_items)
        return await bot.say("""<@{}>が所有するアイテム：\n{}""".format(user_id, item_list))
    if item_name == "エリクサー":
        return await bot.say(elixir(user_id, channel_id))
    elif item_name == "ファイアボールの書":
        return await fireball(user_id, channel_id)
    elif item_name == "祈りの書":
        return await bot.say(pray(user_id, channel_id, mentions))


def elixir(user_id, channel_id):
    if not consume_an_item(user_id, 1):
        return "<@{}>はエリクサーを持っていない！".format(user_id)
    in_battles = conn.execute(
        "SELECT player.user_id, player.experience FROM in_battle, player WHERE in_battle.channel_id=? AND player.user_id=in_battle.user_id",
        (channel_id,)).fetchall()
    for in_battle in in_battles:
        full_hp = int(math.sqrt(in_battle[1])) * 5 + 50
        conn.execute("UPDATE in_battle SET player_hp=? WHERE user_id=?", (full_hp, in_battle[0],))
    return "<@{}>はエリクサーを使った！このチャンネルの仲間全員が全回復した！".format(user_id)


async def fireball(user_id, channel_id):
    player_hp, error_message = into_battle(user_id, channel_id)
    if error_message: return await bot.say(error_message)
    if not consume_an_item(user_id, 2):
        return await bot.say("<@{}>はファイアボールの書を持っていない！".format(user_id))
    player_level = get_player_level(user_id)
    boss_level, boss_hp = get_boss_level_and_hp(channel_id)
    player_attack = int(player_level * (1 + random.random()) / 10)
    boss_hp = boss_hp - player_attack
    if channel_id in special_monster:
        monster_name = special_monster[channel_id]["name"]
    else:
        monster_name = monsters[boss_level % MONSTER_NUM]["name"]
    attack_message = "ファイアボール！<@{}>は{}に`{}`のダメージを与えた！".format(user_id, monster_name, player_attack)
    if boss_hp <= 0:
        win_message = win_process(channel_id, boss_level, monster_name)
        await bot.say("{}\n{}".format(attack_message, win_message))
        await reset_battle(channel_id, level_up=True)
    else:
        conn.execute("UPDATE channel_status SET boss_hp=? WHERE channel_id=?", (boss_hp, channel_id,))
        await bot.say("{}\n{}のHP:`{}`/{}".format(attack_message, monster_name, boss_hp, boss_level * 10 + 50))


def pray(user_id, channel_id, mentions):
    if not mentions:
        return "祈りの書は仲間を復活させます。祈る相手を指定して使います。\n例)!!item 祈りの書 @ユーザー名".format(user_id)
    prayed_user_id = mentions[0].id
    prayed_user = conn.execute("SELECT player_hp FROM in_battle WHERE channel_id=? and user_id=?",
                               (channel_id, prayed_user_id,)).fetchone()
    if not prayed_user:
        return "<@{}>は戦闘に参加していない！".format(prayed_user_id)
    if prayed_user[0] != 0:
        return "<@{}>はまだ生きている！".format(prayed_user_id)
    player_hp, error_message = into_battle(user_id, channel_id)
    if error_message: return error_message
    if not consume_an_item(user_id, 3):
        return "<@{}>は祈りの書を持っていない！".format(user_id)
    conn.execute("UPDATE in_battle SET player_hp=1 WHERE user_id=?", (prayed_user_id,))
    return "<@{0}>は祈りを捧げ、<@{1}>は復活した！\n<@{1}> 残りHP: 1".format(user_id, prayed_user_id, )


@bot.command(description='上位10サーバーのランキングを表示する')
async def ranking():
    """上位10サーバーのランキングを表示する"""
    channels = conn.execute("SELECT channel_id, boss_level FROM channel_status ORDER BY boss_level DESC").fetchall()
    servers = {}
    for channel in channels:
        c = bot.get_channel(str(channel[0]))
        if not c: continue
        server = c.server
        if not server.id in servers:
            servers[server.id] = [server.name, channel[1]]
        if len(servers) > 9: break
    await bot.say(
        "```上位10サーバーのランキング\n{}```".format(
            "\n".join("{}位：{} (Lv{})".format(i + 1, a[0], a[1]) for i, a in enumerate(servers.values()))))


def get_player_exp(user_id):
    player = conn.execute("SELECT experience FROM player WHERE user_id=?", (user_id,)).fetchone()
    if not player:
        conn.execute("INSERT INTO player values( ?, ? )", (user_id, 1))
        player = [1, ]
    return player[0]


def get_player_level(user_id, player_exp=None):
    if player_exp:
        return int(math.sqrt(player_exp))
    player = conn.execute("SELECT experience FROM player WHERE user_id=?", (user_id,)).fetchone()
    if not player:
        conn.execute("INSERT INTO player values( ?, ? )", (user_id, 1))
        player = [1, ]
    return int(math.sqrt(player[0]))


def get_boss_level_and_hp(channel_id):
    channel_status = conn.execute("SELECT boss_level, boss_hp FROM channel_status WHERE channel_id=?",
                                  (channel_id,)).fetchone()
    if not channel_status:
        conn.execute("INSERT INTO channel_status values( ?, ?, ?)", (channel_id, 1, 50))
        channel_status = [1, 50]
    return channel_status[0], channel_status[1]


def experiment(user_id, exp):
    player_exp = get_player_exp(user_id)
    next_exp = player_exp + exp
    current_level = int(math.sqrt(player_exp))
    conn.execute("UPDATE player SET experience=? WHERE user_id=?", (next_exp, user_id,))
    if next_exp > (current_level + 1) ** 2:
        next_level = int(math.sqrt(next_exp))
        return "<@{}>はレベルアップした！`Lv.{} -> Lv.{}`".format(user_id, current_level, next_level)
    return ""


def obtain_an_item(user_id, item_id):
    item_count = conn.execute("SELECT count FROM item WHERE user_id=? and item_id=?", (user_id, item_id)).fetchone()
    if item_count:
        conn.execute("UPDATE item SET count=? WHERE user_id=? and item_id=?", (item_count[0] + 1, user_id, item_id,))
    else:
        conn.execute("INSERT INTO item VALUES(?,?,1)", (user_id, item_id,))


def consume_an_item(user_id, item_id):
    current_count = conn.execute("SELECT count FROM item WHERE user_id=? and item_id=?", (user_id, item_id)).fetchone()
    if not current_count:
        return False
    if current_count[0] <= 1:
        conn.execute("DELETE FROM item WHERE user_id=? and item_id=?", (user_id, item_id))
    else:
        conn.execute("UPDATE item SET count=? WHERE user_id=? and item_id=?", (current_count[0] - 1, user_id, item_id))
    return True


async def reset_battle(channel_id, level_up=False):
    conn.execute("DELETE FROM in_battle WHERE channel_id=?", (channel_id,))
    # boss_max_hp
    query = "UPDATE channel_status SET {} WHERE channel_id=?".format(
        "boss_level=boss_level+1, boss_hp=boss_level*10+60" if level_up else "boss_hp=boss_level*10+50"
    )
    conn.execute(query, (channel_id,))
    boss_level, _ = get_boss_level_and_hp(channel_id)
    if level_up and boss_level % MONSTER_NUM in [
        1, 4, 6, 8, 9, 12, 14, 16, 18, 19, 21, 22, 24, 26, 27, 28, 29, 31, 33, 36, 38, 39, 42, 43, 44
    ] and random.random() < 0.05:
        monster = monsters[50]
        special_monster[channel_id] = monster
    else:
        monster = monsters[boss_level % MONSTER_NUM]
        if channel_id in special_monster: del special_monster[channel_id]
    em = discord.Embed()
    em.set_image(url="https://discha.net/static/forbot/{}".format(monster["img"]))
    await bot.say("{}が待ち構えている...！\nLv.{}  HP:{}".format(monster["name"], boss_level, boss_level * 10 + 50), embed=em)


f = open('setting.json', 'r')
setting = json.load(f)
bot.run(setting['token'])