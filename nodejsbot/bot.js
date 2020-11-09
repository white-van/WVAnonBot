const discord = require("discord.js");
const moment = require("moment");
const client = new discord.Client();
const auth = require("./auth.json");
const encryptor = require("./encryptor.js");
const errors = require("./errors.js");
const database = require("./database.js");
const metadata = require("./metadata.js");
const timerhandler = require("./timerhandler.js");

// Hooks
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", (msg) => {
  if (msg.author.bot) {
    return;
  }
  if (msg.channel.type == "dm") {
    submitAnon(msg);
  } else if (
    msg.channel.type == "text" &&
    canConfigure(msg, metadata.permissions.CONFIGURE)
  ) {
    parseArguments(msg);
  }
});

// Central functionality
function submitAnon(msg) {
  var anonLogsChannel = database.getChannelDestination(
    metadata.channels.ANONLOGS
  );
  var destinationChannel = "";

  var params = msg.content.split(" ");
  switch (params[0]) {
    case "!help":
      replyTorMessageWithStatus(msg, 1);
      return;
    case "!send":
      destinationChannel = database.getChannelDestination(
        metadata.channels.ANONCHANNEL
      );
      break;
    case "!send-deep":
      destinationChannel = database.getChannelDestination(
        metadata.channels.DEEPTALKS
      );
      break;
    default:
      replyTorMessageWithStatus(msg, 2009);
      return;
  }

  // No message provided to send
  if (params.length < 2) {
    replyTorMessageWithStatus(msg, 2009);
    return;
  }
  var sliceIndex = 1;
  var isNSFW = false;
  if (params.length > 2 && params[2] === "nsfw") {
    sliceIndex = 3;
    isNSFW = true;
  }
  var messageToSend = reconstructMessage(
    params.slice(sliceIndex, params.length),
    isNSFW
  );
  if (anonLogsChannel == "" || destinationChannel == "") {
    msg.reply("The bot first needs to be configured!");
    return;
  }

  var timerError = timerhandler.configureTimersAndCheckIfCanSend(msg);
  if (timerError) {
    replyTorMessageWithStatus(msg, timerError.errorCode, timerError.suffix);
    return;
  }

  var msgEmbed = new discord.MessageEmbed()
    .setDescription(messageToSend.trim())
    .setColor(3447003)
    .setTimestamp();

  destinationChannelObj = client.channels.cache.get(destinationChannel);
  destinationChannelObj.send(msgEmbed);
  msg.reply("Message sent to " + destinationChannelObj.name);

  msgEmbed.addFields(
    {
      name: "Anon ID",
      value: encryptor.encrypt(msg.author.id),
    },
    {
      name: "Target channel",
      value: destinationChannelObj.name,
    }
  );
  client.channels.cache.get(anonLogsChannel).send(msgEmbed);
}

function parseArguments(msg) {
  var params = msg.content.split(" ");

  if (params[0] == "!anon") {
    switch (params[1]) {
      case "help":
        replyTorMessageWithStatus(msg, 0);
        break;
      case "set":
        handleSetCommand(params, msg);
        break;
      case "slowmode":
        handleSlowmodeCommand(params, msg);
        break;
      case "tempban":
      case "permban":
        handleBanCommand(params, msg);
        break;
      case "unban":
        handleUnbanCommand(params, msg);
        break;
      default:
        replyTorMessageWithStatus(msg, 2000);
        break;
    }
  }
}

function handleSetCommand(params, msg) {
  var channelId = params[3] ? params[3].replace(/\D/g, "") : "";
  var validChannelId = msg.channel.guild.channels.cache.has(channelId);

  switch (params[2]) {
    case "log":
      if (validChannelId) {
        database.setChannelDestinations(metadata.channels.ANONLOGS, channelId);
        replyTorMessageWithStatus(msg, 1000);
      } else {
        replyTorMessageWithStatus(msg, 2002);
      }
      break;
    case "anon":
      if (validChannelId) {
        database.setChannelDestinations(
          metadata.channels.ANONCHANNEL,
          channelId
        );
        replyTorMessageWithStatus(msg, 1001);
      } else {
        replyTorMessageWithStatus(msg, 2003);
      }
      break;
    case "deeptalks":
      if (validChannelId) {
        database.setChannelDestinations(metadata.channels.DEEPTALKS, channelId);
        replyTorMessageWithStatus(msg, 1002);
      } else {
        replyTorMessageWithStatus(msg, 2004);
      }
      break;
    default:
      replyTorMessageWithStatus(msg, 2001);
      break;
  }
}

function handleSlowmodeCommand(params, msg) {
  var seconds = params[2];
  if (!isNumeric(seconds)) {
    replyTorMessageWithStatus(msg, 2005);
    return;
  }

  database.deleteAllSlowdowns();
  database.setConfigurationTimer(metadata.configuration.SLOWMODE, seconds);
  replyTorMessageWithStatus(
    msg,
    seconds != 0 ? 1003 : 1004,
    seconds != 0 ? seconds + (seconds != 1 ? " seconds" : " second(why?)") : ""
  );
}

function handleBanCommand(params, msg) {
  var typeOfBan = params[1];
  var anonId = params[2];
  var arg3 = params[3]; // Seconds only in tempban, start of reason otherwise

  var reason = "";
  if (typeOfBan == "tempban") {
    if (!anonId || !arg3 || !isNumeric(arg3) || params.length < 5) {
      replyTorMessageWithStatus(msg, 2006);
      return;
    }
    reason = reconstructMessage(params.slice(4, params.length), false);
    var unbanTime = moment().utc();
    unbanTime = moment(unbanTime).add(arg3, "s");

    database.setMessageBlocker(
      anonId,
      metadata.blockReason.TEMPBAN,
      reason,
      unbanTime.format("DD MM YYYY HH:mm:ss")
    );
    replyTorMessageWithStatus(
      msg,
      1005,
      reason + "\nUnban date in UTC: " + unbanTime.format("DD MM YYYY HH:mm:ss")
    );
    return;
  }
  // Permaban
  if (!anonId || params.length < 4) {
    replyTorMessageWithStatus(msg, 2007);
    return;
  }
  reason = reconstructMessage(params.slice(3, params.length), false);
  database.setMessageBlocker(anonId, metadata.blockReason.PERMBAN, reason, "");
  replyTorMessageWithStatus(msg, 1006, reason);
}

function handleUnbanCommand(params, msg) {
  var anonId = params[2];
  if (!anonId || params.length < 3) {
    replyTorMessageWithStatus(msg, 2008);
    return;
  }

  database.deleteMessageBlocker(anonId);
  replyTorMessageWithStatus(msg, 1007, anonId);
}

function reconstructMessage(params, isNSFW) {
  s = params.join(" ");
  if (!isNSFW) {
    return s;
  }
  return "||" + s + "||";
}

function replyTorMessageWithStatus(msg, status, suffix) {
  var errorDesc = errors.getError(status);
  // Help message special case. Setting header
  if (status == 0) {
    errorDesc.setAuthor(client.user.username, client.user.avatarURL());
  }
  if (msg.channel.type == "dm") {
    msg.reply(errors.getError(status, suffix));
  } else {
    msg.channel.messages.channel.send(errors.getError(status, suffix));
  }
}

function canConfigure(msg, allowedRoles) {
  return msg.member.roles.cache.find((role) =>
    allowedRoles.includes(role.name)
  );
}

// Why doesn't js have an inbuilt function for this?
function isNumeric(value) {
  return /^\d+$/.test(value);
}

client.login(auth.token);
