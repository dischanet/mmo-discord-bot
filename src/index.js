const Discord = require("discord.js");
const client = new Discord.Client();

const db = require("./db");

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("!!help|discha.net");
});

const attack = require("./commands/attack.js");
const status = require("./commands/status.js");
const inquiry = require("./commands/inquiry.js");
const reset = require("./commands/reset.js");
const t = require("./commands/t.js");
const q = require("./commands/q.js");
const item = require("./commands/item.js");
const ranking = require("./commands/ranking.js");
const help = require("./commands/help.js");
const prefix = "!!";

client.on("message", message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  const command = message.content.split(" ")[0];
  switch (command) {
    case "!!attack":
      attack(client, message, db);
      break;
    case "!!status":
      status(client, message, db);
      break;
    case "!!inquiry":
      inquiry(client, message, db);
      break;
    case "!!reset":
      reset(client, message, db);
      break;
    case "!!t":
      t(client, message, db);
      break;
    case "!!q":
      q(client, message, db);
      break;
    case "!!item":
      item(client, message, db);
      break;
    case "!!ranking":
      ranking(client, message, db);
      break;
    case "!!help":
      help(client, message, db);
      break;
    default:
      break;
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
