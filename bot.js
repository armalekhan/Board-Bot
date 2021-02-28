//"dev": "nodemon ./src/bot.js"
require("dotenv").config();

const config = require("../pollconfig.json");
const Poll = require("./poll.js");
const Discord = require("discord.js");
const Datastore = require("nedb");
const client = new Discord.Client();

const commandSyntaxRegex = new RegExp(
  `^${config.prefix}\\s(((time=\\d+([smhd]?\\s))?("[^"\\n]+"\\s?){1,11})|(help)|(examples)|(end\\s\\d+)|(invite))$`
);

const PREFIX = "$";
const helpEmbed = new Discord.MessageEmbed()
  .setAuthor("Poll Help List")
  .addField("Create a Yes or No Poll", `\`${config.prefix} "Question"\``)
  .addField(
    "Create an Advanced Poll (2-10 options max)",
    `\`${config.prefix} "Question" "Option" "Option" "Option"\` (quotes are required)`
  )
  .addField(
    "Create a Timed Poll",
    `\`${config.prefix} time=X(s|m|h|d)\` (X is the amount of time followed with the unit of time)`
  )
  .addField(
    "End a Poll and View Results",
    `\`${config.prefix} end ID\` (ID is displayed on the poll)`
  )
  .addField("See examples", `\`${config.prefix} examples\``)
  //.addBlankField()
  .setColor("#DDA0DD");
const examplesEmbed = new Discord.MessageEmbed()
  .setAuthor("Examples")
  .addField("Yes or No Poll", `\`${config.prefix} "This is a poll?"\``)
  .addField(
    "Advanced poll",
    `\`${config.prefix} "This is a poll?" "Yes" "No" "Maybe" "Of Course"\``
  )
  .addField("Timed poll", `\`${config.prefix} time=5m "This is a poll?"\``)
  .addField("End Poll / View Results", `\`${config.prefix} end 89754398\``)
  .setColor("#DDA0DD");

let database = new Datastore("database.db");
database.loadDatabase();
database.persistence.setAutocompactionInterval(3600000);

async function finishTimedPolls() {
  const now = Date.now();
  database.find({ isTimed: true, finishTime: { $lte: now } }, (err, dbps) => {
    if (err) console.error(err);

    dbps.forEach((dbp) => {
      const p = Poll.copyConstructor(dbp);

      if (p instanceof Poll && p.isTimed && p.finishTime <= now) {
        p.finish(client);
        database.remove({ id: p.id });
      }
    });
  });
}

async function poll(message, args) {
  const timeToVote = await parseTime(message, args);

  const question = args.shift();
  let answers = [];
  let type;

  switch (args.length) {
    case 0:
      answers = ["", ""];
      type = "yn";
      break;
    case 1:
      message.reply("You cannot create a poll with only one answer");
      return;
    default:
      answers = args;
      type = "default";
      break;
  }

  const p = await new Poll(message, question, answers, timeToVote, type);

  await p.start(message);

  if (p.hasFinished == false) {
    database.insert(p);
  }
}

async function end(message, args) {
  const inputid = Number(args[1]);

  database.findOne({ id: inputid }, (err, dbp) => {
    if (err) {
      console.errror(err);
    }
    if (dbp) {
      const p = Poll.copyConstructor(dbp);
      if (!p.hasFinished && p.guildId === message.guild.id) {
        p.finish(client);
        database.remove({ id: p.id });
      }
    } else {
      message.reply("Cannot find the poll.");
    }
  });
}

function parseTime(message, args) {
  let time = 0;

  //parse the time limit if it exists
  if (args[0].startsWith("time=")) {
    const timeRegex = /\d+/;
    const unitRegex = /s|m|h|d/i;
    let timeString = args.shift();
    let unit = "s";

    let match;

    // check if the time is correct
    match = timeString.match(timeRegex);
    if (match != null) {
      time = parseInt(match.shift());
    } else {
      message.reply("Wrong time syntax!");
      return;
    }

    // check the units of the time
    match = timeString.split("=").pop().match(unitRegex);
    if (match != null) unit = match.shift();

    switch (unit) {
      case "s":
        time *= 1000;
        break;
      case "m":
        time *= 60000;
        break;
      case "h":
        time *= 3600000;
        break;
      case "d":
        time *= 86400000;
        break;
      default:
        time *= 60000;
    }
  }

  if (time > 604800000) return 604800000;
  // no more than a week.
  else return time;
}

function parseToArgs(message) {
  let args = message.content
    .slice(config.prefix.length)
    .trim()
    .split('"')
    .filter((phrase) => phrase.trim() !== "");
  for (let i = 0; i < args.length; i++) args[i] = args[i].trim();
  if (args[0].startsWith("end")) {
    let aux = args[0].split(" ");
    args[0] = aux[0];
    args.push(aux[1]);
  }
  return args;
}

function cleanDatabase() {
  console.log("Cleaning the database...");
  const aWeekAgo = Date.now() - 604800000;
  database.remove({ createdOn: { $lt: aWeekAgo } }, { multi: true }, (err, n) =>
    console.log(n + " entries removed.")
  );
}

client.on("ready", () => {
  console.log(`${client.user.tag} has logged in.`);
  client.user.setActivity(`${config.prefix} help`);

  setInterval(finishTimedPolls, 10000); // 10s
  setInterval(cleanDatabase, 86400000); // 24h

  setInterval(
    () => console.log("The bot is in " + client.guilds.size + " guild(s)"),
    1800000
  ); // logging info
});

client.on("message", async (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith(PREFIX)) {
    const [CMD_NAME, ...args] = message.content
      .trim()
      .substring(PREFIX.length)
      .split(/\s+/);
    if (CMD_NAME === "kick") {
      if (!message.member.hasPermission("KICK_MEMBERS"))
        return message.reply("You cannot use that command");
      if (args.length === 0) return message.reply("Please prove user ID");
      const member = message.guild.members.cache.get(args[0]);
      if (member) {
        member
          .kick()
          .then((member) => message.channel.send(`${member} was kicked`))
          .catch((err) => message.channel.send("I cannot kick the user"));
      } else {
        message.channel.send("Member not found");
      }
    }
  }
  if (message.content.startsWith(config.prefix) && !message.author.bot) {
    // if its a guild, check permissions
    let isDM = false,
      dmChannel;
    if (message.channel.type === "text" || message.channel.type === "news") {
      let role;
      let roleid = -1;
      try {
        role = await message.member.roles.cache.some(
          (r) => r.name === "Poll Creator"
        );
        if (role) roleid = role.id;
      } catch (error) {
        console.error(error);
      }

      if (
        !(
          message.member.hasPermission("ADMINISTRATOR") ||
          message.member.roles.cache.some(roleid)
        )
      ) {
        message.reply(
          'You don\'t have permision to do that. Only administrators or users with a role named "Poll Creator"'
        );
        console.log(
          `${message.author.tag} on ${message.guild.name} tried to create a poll without permission"`
        );
        return;
      }
    } else {
      isDM = true;
    }

    if (message.content.match(commandSyntaxRegex)) {
      let args = parseToArgs(message);
      if (args.length > 0) {
        console.log(
          `${args[0]} executed in ${
            message.guild
              ? message.guild.name
              : message.author.username + "'s DMs"
          } by ${message.author.tag}`
        );
        switch (args[0]) {
          case "help":
            message.channel.send(helpEmbed);
            //dmChannel = await message.author.createDM();
            //await dmChannel.send({ embed: helpEmbed });
            //dmChannel.send(helpmessage);
            break;
          case "examples":
            message.channel.send(examplesEmbed);
            //dmChannel = await message.author.createDM();
            //dmChannel.send({ embed: examplesEmbed });
            //dmChannel.send(examplemessage);
            break;
          case "end":
            if (!isDM) {
              end(message, args);
            }
            break;
          case "invite":
            if (config.link) {
              message.reply(
                `This is the link to invite me to another server! ${config.link}`
              );
            } else {
              message.reply("The link is not available in this moment.");
            }
            break;
          default:
            if (!isDM) {
              poll(message, args);
            }
            break;
        }
      } else {
        message.reply("Sorry, give me more at least a question");
      }
    } else {
      message.reply(
        `Wrong command syntax. Learn how to do it correctly with \`${config.prefix} help\``
      );
    }
  }
});

client.login(process.env.BOT_TOKEN);
