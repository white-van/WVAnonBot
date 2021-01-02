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
    //if has_accepted
    submitAnon(msg);
  } else if (
      msg.channel.type == "text" &&
      canConfigure(msg, metadata.permissions.CONFIGURE)
  ) {
    parseArguments(msg);
  }
});

// Central functionality
async function submitAnon(msg) {
  var anonLogsChannel = database.getChannelDestination(
      metadata.channels.ANONLOGS
  );
  var destinationChannel = "";

  var params = msg.content.split(" ");
  switch (params[0]) {
    case "!help":
      replyTorMessageWithStatus(msg, 1);
      return;
    case "!rules":
      replyTorMessageWithStatus(msg, 2);
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
  var messageToReplyTo = false;
  var messageToSend;
  var messageToStore;
  switch (params[1]) {
    case "nsfw":
      if (params.length > 4 && params[2] === "reply" && isNumeric(params[3])) {
        messageToReplyTo = params[3];
        messageToSend = formatReply(messageToReplyTo, params.slice(4, params.length), true);
        if(messageToSend === -1) {
          replyTorMessageWithStatus(msg, 2011);
          return;
        }
        messageToStore = "||" + reconstructMessage(params.slice(4, params.length)) + "||";
      }
      else if (params.length > 2) {
        messageToSend =
            "||" + reconstructMessage(params.slice(2, params.length)) + "||";
        messageToStore = messageToSend;
      } else {
        //incase someone sends a msg saying nsfw only
        messageToSend = reconstructMessage(params.slice(1, params.length));
        messageToStore = messageToSend;
      }
      break;
    case "reply":
      if (params.length > 3 && isNumeric(params[2])) {
        messageToReplyTo = params[2];
        messageToSend = formatReply(messageToReplyTo, params.slice(3, params.length));
        if(messageToSend === -1) {
          replyTorMessageWithStatus(msg, 2011);
          return;
        }
        messageToStore = reconstructMessage(params.slice(3, params.length));
      } else {
        //in case someone sends a msg saying reply followed by a number only
        messageToSend = reconstructMessage(params.slice(1, params.length));
        messageToStore = messageToSend;
      }
      break;
    default:
      messageToSend = reconstructMessage(params.slice(1, params.length));
      messageToStore = messageToSend;
      break;
  }
  if (anonLogsChannel == "" || destinationChannel == "") {
    msg.reply("The bot first needs to be configured!");
    return;
  }

  var timerError = timerhandler.configureTimersAndCheckIfCanSend(msg);
  if (timerError) {
    replyTorMessageWithStatus(msg, timerError.errorCode, timerError.suffix);
    return;
  }

  const msg_id = database.addMessageAndGetNumber(messageToStore);
  const anon_id = encryptor.encrypt(msg.author.id);
  database.insertMsgMap(anon_id, msg_id);

  var msgEmbed = new discord.MessageEmbed()
      .setDescription(messageToSend.trim())
      .setColor(3447003)
      .setTimestamp()
      .setFooter("#" + msg_id.toString());

  var destinationChannelObj = client.channels.cache.get(destinationChannel);
  let sent = await destinationChannelObj.send(msgEmbed);
  const messageUrl = "https://discord.com/channels/" + sent.guild.id + "/" + sent.channel.id + "/" + sent.id;
  database.updateMessageWithUrl(msg_id, messageUrl);

  if (messageToReplyTo === false) {
    msg.reply("Message sent to " + destinationChannelObj.name);
  } else {
    msg.reply("Reply to message " + messageToReplyTo + " sent to " + destinationChannelObj.name)
  }

  msgEmbed.addFields({
    name: "Target channel",
    value: destinationChannelObj.name,
  });
  client.channels.cache.get(anonLogsChannel).send(msgEmbed);
}

function formatReply(replyNum, msgArray, isNsfw) {
  const targetMessage = database.getMessageByNumber(replyNum);
  const url = database.getMessageUrlByNumber(replyNum);

  if (url === "") {
    return -1;
  }

  const maxChars = 130;
  var quoteBlock;
  if (targetMessage.length <= maxChars) {
    quoteBlock = "> " + targetMessage;
  } else {
    quoteBlock = "> " + targetMessage.slice(0, maxChars + 1) + "...";
  }

  var message;
  if(isNsfw) {
    message = "||" + reconstructMessage(msgArray) + "||";
  } else {
    message = reconstructMessage(msgArray);
  }

  return "Replying to [message " + replyNum.toString() + "](" + url + ")" + "\n" + quoteBlock +
      "\n\n" + message;
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
  var msgId = params[2];
  var arg3 = params[3]; // Seconds only in tempban, start of reason otherwise

  var anonId = database.getAnonIdFromMsgId(msgId);

  var reason = "";
  if (typeOfBan == "tempban") {
    if (!anonId || !arg3 || !isNumeric(arg3) || params.length < 5) {
      replyTorMessageWithStatus(msg, 2006);
      return;
    }
    reason = reconstructMessage(params.slice(4, params.length));
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
  reason = reconstructMessage(params.slice(3, params.length));
  database.setMessageBlocker(anonId, metadata.blockReason.PERMBAN, reason, "");
  replyTorMessageWithStatus(msg, 1006, reason);
}

function handleUnbanCommand(params, msg) {
  var msgId = params[2];
  var anonId = database.getAnonIdFromMsgId(msgId);

  if (!anonId || params.length < 3) {
    replyTorMessageWithStatus(msg, 2008);
    return;
  }

  database.deleteMessageBlocker(anonId);
  replyTorMessageWithStatus(msg, 1007, anonId);
}

function reconstructMessage(params) {
  return params.join(" ");
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

