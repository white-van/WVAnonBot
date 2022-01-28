const discord = require("discord.js");
const moment = require("moment");
const intents = ["GUILD_MEMBERS", "GUILD_MESSAGES", "DIRECT_MESSAGES", "GUILDS"];
const client = new discord.Client({intents: intents, ws:{intents: intents}});
const auth = require("./auth.json");
const encryptor = require("./encryptor.js");
const errors = require("./errors.js");
const database = require("./database.js");
const metadata = require("./metadata.js");
const timerhandler = require("./timerhandler.js");

// Hooks
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("!help");
});

client.on('guildMemberAdd', member => {
  const anonId = encryptor.encrypt(member.id);
  timerhandler.addPurgatoryUser(anonId);
});

client.on("message", (msg) => {
  if (msg.author.bot) {
    return;
  }
  if (msg.channel.type === "dm") {
    // if has_accepted
    submitAnon(msg);
  } else if (
    msg.channel.type === "text" &&
    canConfigure(msg, metadata.permissions.CONFIGURE)
  ) {
    parseArguments(msg);
  }
});

client.on("messageDelete", (msg) => {
  const anonChannelId = database.getChannelDestination(
    metadata.channels.ANONCHANNEL
  );
  const deepChannelId = database.getChannelDestination(
    metadata.channels.DEEPTALKS
  );

  // If an anon message is deleted, make it unrepliable
  if (
    msg.author.id === client.user.id &&
    (msg.channel.id === anonChannelId || msg.channel.id === deepChannelId)
  ) {
    const messageNum = parseInt(msg.embeds[0].footer.text.slice(1));
    database.setMessageAsDeleted(messageNum);
  }
});

// Central functionality
async function submitAnon(msg) {
  const anonLogsChannel = database.getChannelDestination(
    metadata.channels.ANONLOGS
  );
  let destinationChannel = "";

  const anonId = encryptor.encrypt(msg.author.id);

  database.setDmChannel(anonId.toString(), msg.channel.id.toString());

  const params = msg.content.split(" ");
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

  // Is the main channel locked down?
  if (params[0] === "!send" && isLockedDown()) {
    replyTorMessageWithStatus(msg, 3004);
    return;
  }

  // Can the user even post in normal chat?
  if (params[0] !== "!send-deep" && isInPurgatory(anonId)) {
    replyTorMessageWithStatus(msg, 5000);
    return;
  }

  // No message provided to send
  if (params.length < 2) {
    replyTorMessageWithStatus(msg, 2009);
    return;
  }
  let messageToReplyTo = -1;
  let messageToSend;
  let messageToStore;
  switch (params[1]) {
    case "nsfw":
      if (
        params.length > 4 &&
        params[2] === "reply" &&
        isValidReplyNumber(params[3])
      ) {
        messageToReplyTo = isNumeric(params[3])
          ? params[3]
          : params[3].slice(1);
        messageToSend = formatReply(
          messageToReplyTo,
          params.slice(4, params.length),
          true
        );
        if (messageToSend === -1) {
          replyTorMessageWithStatus(msg, 2014);
          return;
        }
        messageToStore =
          "||" + reconstructMessage(params.slice(4, params.length)) + "||";
      } else if (params.length > 2) {
        messageToSend =
          "||" + reconstructMessage(params.slice(2, params.length)) + "||";
        messageToStore = messageToSend;
      } else {
        // incase someone sends a msg saying nsfw only
        messageToSend = reconstructMessage(params.slice(1, params.length));
        messageToStore = messageToSend;
      }
      break;
    case "reply":
      if (params.length > 3 && isValidReplyNumber(params[2])) {
        messageToReplyTo = isNumeric(params[2])
          ? params[2]
          : params[2].slice(1);
        messageToSend = formatReply(
          messageToReplyTo,
          params.slice(3, params.length)
        );
        if (messageToSend === -1) {
          replyTorMessageWithStatus(msg, 2014);
          return;
        }
        messageToStore = reconstructMessage(params.slice(3, params.length));
      } else {
        // in case someone sends a msg saying reply followed by a number only
        messageToSend = reconstructMessage(params.slice(1, params.length));
        messageToStore = messageToSend;
      }
      break;
    default:
      messageToSend = reconstructMessage(params.slice(1, params.length));
      messageToStore = messageToSend;
      break;
  }
  if (anonLogsChannel === "" || destinationChannel === "") {
    msg.reply("The bot first needs to be configured!");
    return;
  }

  const timerError = timerhandler.configureTimersAndCheckIfCanSend(msg);
  if (timerError) {
    replyTorMessageWithStatus(msg, timerError.errorCode, timerError.suffix);
    return;
  }

  const msgId = database.addMessageAndGetNumber(messageToStore.trim());
  database.insertMsgMap(anonId, msgId);

  const msgEmbed = new discord.MessageEmbed()
    .setDescription(messageToSend.trim())
    .setColor(3447003)
    .setFooter("#" + msgId.toString());

  const destinationChannelObj = client.channels.cache.get(destinationChannel);
  const sent = await destinationChannelObj.send(msgEmbed);
  const messageUrl =
    "https://discord.com/channels/" +
    sent.guild.id +
    "/" +
    sent.channel.id +
    "/" +
    sent.id;
  database.updateMessageWithUrl(msgId, messageUrl);

  if (messageToReplyTo === -1) {
    msg.reply("Message sent to " + destinationChannelObj.name);
  } else {
    msg.reply(
      "Reply to message " +
        messageToReplyTo +
        " sent to " +
        destinationChannelObj.name
    );
  }

  msgEmbed.addFields({
    name: "Target channel",
    value: destinationChannelObj.name,
  });
  client.channels.cache.get(anonLogsChannel).send(msgEmbed);
}

function isInPurgatory(anonId) {
  return !timerhandler.rescueFromPurgatory(anonId);
}

function isLockedDown() {
  return database.getLockdownStatus() === 1;
}

function isValidReplyNumber(param) {
  return isNumeric(param) || (param[0] === "#" && isNumeric(param.slice(1)));
}

function formatReply(replyNum, msgArray, isNsfw) {
  const targetMessage = database.getMessageByNumber(replyNum);
  const url = database.getMessageUrlByNumber(replyNum);

  if (url === "") {
    return -1;
  }

  const maxChars = 130;
  const maxLines = 3;
  let quoteBlock;

  if (targetMessage.length <= maxChars) {
    quoteBlock = targetMessage;
  } else {
    let addEllipses = true;
    const quotedMessage = targetMessage.slice(0, maxChars);
    const cutoffMessage = targetMessage.slice(maxChars);
    let blockQuoteMessage = quotedMessage;
    let preCutoffSpoilerIndex = -1;
    let preCutoffCodeIndex = -1;

    // Checking for spoiler tags
    const baseSpoilerRegex = /^(?:(?!(\|\|))[\s\S])*((\|\|(?:(?!(\|\|)).)*\|\||`[^`]*`)(?:(?!(\|\||`))[\s\S])*)*/;

    let spoilerRegex = concatRegex(baseSpoilerRegex, /\|\|(?:(?!(\|\|)).)+$/);
    if (
      spoilerRegex.test(quotedMessage) &&
      cutoffMessage.indexOf("||") !== -1
    ) {
      const reverseQuotedMessage = quotedMessage.split("").reverse().join("");
      preCutoffSpoilerIndex =
        quotedMessage.length - 1 - (reverseQuotedMessage.indexOf("||") + 1);
    }

    spoilerRegex = concatRegex(baseSpoilerRegex, /\|\|$/);
    if (
      spoilerRegex.test(quotedMessage) &&
      cutoffMessage.indexOf("||") !== -1 &&
      !cutoffMessage.startsWith("||")
    ) {
      blockQuoteMessage = quotedMessage.slice(0, maxChars - 2);
    }

    spoilerRegex = concatRegex(baseSpoilerRegex, /\|\|(?:(?!(\|\|)).)+\|$/);
    if (spoilerRegex.test(quotedMessage) && cutoffMessage[0] === "|") {
      blockQuoteMessage = quotedMessage + "|";
      addEllipses = cutoffMessage !== "|";
    }

    spoilerRegex = concatRegex(baseSpoilerRegex, /\|$/);
    if (
      spoilerRegex.test(quotedMessage) &&
      cutoffMessage[0] === "|" &&
      !cutoffMessage.startsWith("|||")
    ) {
      blockQuoteMessage = quotedMessage.slice(0, maxChars - 1);
    }

    // Checking for code blocks
    const baseCodeBlockRegex = /^(?:(?!(```)).)*((```(?:(?!(```)).)+[^`]```)|(```.```))*/;

    const codeBlockRegex = concatRegex(
      baseCodeBlockRegex,
      /```(?:(?!(```)).)*/
    );
    if (
      codeBlockRegex.test(blockQuoteMessage) &&
      cutoffMessage.indexOf("```") !== -1 &&
      (!cutoffMessage.startsWith("'''") || cutoffMessage.startsWith("````"))
    ) {
      blockQuoteMessage += "...```";
      addEllipses = false;
    }

    // Checking for inline code tags
    const baseCodeRegex = /^([^`]|\s)*((`[^`]*`|\|\|(?:(?!(\|\|)).)*\|\|)([^`]|\s)*)*/;

    let codeRegex = concatRegex(baseCodeRegex, /`[^`]+$/);
    if (
      codeRegex.test(blockQuoteMessage) &&
      cutoffMessage.indexOf("`") !== -1
    ) {
      const reverseBlockQuoteMessage = blockQuoteMessage
        .split("")
        .reverse()
        .join("");
      preCutoffCodeIndex =
        blockQuoteMessage.length - 1 - reverseBlockQuoteMessage.indexOf("`");
    } else {
      codeRegex = concatRegex(baseCodeRegex, /`$/);
      if (
        codeRegex.test(blockQuoteMessage) &&
        cutoffMessage.indexOf("`") !== -1 &&
        !cutoffMessage.startsWith("`")
      ) {
        blockQuoteMessage = blockQuoteMessage.slice(
          0,
          blockQuoteMessage.length - 1
        );
      }
    }

    if (preCutoffSpoilerIndex !== -1 && preCutoffCodeIndex !== -1) {
      if (preCutoffSpoilerIndex < preCutoffCodeIndex) {
        if (cutoffMessage.indexOf("`") < cutoffMessage.indexOf("||")) {
          blockQuoteMessage += "`||";
        } else {
          blockQuoteMessage += "||";
        }
      } else {
        blockQuoteMessage += "`";
      }
    } else if (preCutoffSpoilerIndex !== -1) {
      blockQuoteMessage += "||";
    } else if (preCutoffCodeIndex !== -1) {
      blockQuoteMessage += "`";
    }

    quoteBlock = blockQuoteMessage;
    if (addEllipses) {
      quoteBlock += "...";
    }
  }

  // Cutting off a message after three newlines
  let newlineInsertSequence = "> ";
  if (quoteBlock.startsWith(">>> ")) {
    newlineInsertSequence = "> > ";
  }

  let totalLines = 1;
  let index = 0;
  let nextNewlineIndex = targetMessage.indexOf("\n");
  while (nextNewlineIndex !== -1 && totalLines <= maxLines) {
    quoteBlock =
      quoteBlock.slice(0, index + nextNewlineIndex + 1) +
      newlineInsertSequence +
      quoteBlock.slice(index + nextNewlineIndex + 1);
    index += nextNewlineIndex + 3;
    nextNewlineIndex = quoteBlock.slice(index).indexOf("\n");
    totalLines += 1;
  }

  if (totalLines === 4) {
    quoteBlock = quoteBlock.slice(0, index) + "...";
  }

  quoteBlock = "> " + quoteBlock;

  let message = reconstructMessage(msgArray);
  if (isNsfw) {
    message = "||" + message + "||";
  }

  return (
    "Replying to [message " +
    replyNum.toString() +
    "](" +
    url +
    ")" +
    "\n" +
    quoteBlock +
    "\n\n" +
    message
  );
}

function createMsgEmbed(title, content) {
  const msg = new discord.MessageEmbed()
    .setColor(3447003)
    .addFields({
      name: title,
      value: content,
    })
    .setTimestamp();
  return msg;
}

function formatBanlist(banlist) {
  const str = "```uid | reason | explanation | date\n";
  const bans = banlist
    .map((ban) => {
      return `${ban.encryptedUserId} | ${ban.reason} | ${ban.explanation} | ${ban.date}`;
    })
    .join("\n");
  const content = str + bans + "```";
  return createMsgEmbed("Banlist", content);
}

async function parseArguments(msg) {
  const params = msg.content.split(" ");

  if (params[0] === "!anon") {
    switch (params[1]) {
      case "help":
        replyTorMessageWithStatus(msg, 0);
        break;
      case "banlist":
        replyTorMessageWithStatus(
          msg,
          null,
          null,
          formatBanlist(database.getBanList())
        );
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
      case "warn":
        handleWarnCommand(params, msg);
        break;
      case "warnlimit":
        handleWarnLimitCommand(params, msg);
        break;
      case "wtd":
        handleSetWarnTempbanDuration(params, msg);
        break;
      case "daysBeforePosting":
        handleSetDaysBeforePosting(params, msg);
        break;
      case "bypassAltRestriction":
        handleBypassAltRestriction(params, msg);
        break;
      case "lockdown":
        handleLockdown(params, msg);
        break;
      default:
        replyTorMessageWithStatus(msg, 2000);
        break;
    }
  }
}

function setChannel(channelId, channel, msg, offset) {
  const validChannelId = msg.channel.guild.channels.cache.has(channelId);
  if (validChannelId) {
    database.setChannelDestinations(channel, channelId);
    replyTorMessageWithStatus(msg, 1000 + offset);
  } else {
    replyTorMessageWithStatus(msg, 2002 + offset);
  }
}

function handleSetCommand(params, msg) {
  if (params.length === 5) {
    const anonChannelId = params[2] ? params[2].replace(/\D/g, "") : "";
    const deepChannelId = params[3] ? params[3].replace(/\D/g, "") : "";
    const logsChannelId = params[4] ? params[4].replace(/\D/g, "") : "";
    setChannel(anonChannelId, metadata.channels.ANONCHANNEL, msg, 1);
    setChannel(deepChannelId, metadata.channels.DEEPTALKS, msg, 2);
    setChannel(logsChannelId, metadata.channels.ANONLOGS, msg, 0);
    return;
  }

  const channelId = params[3] ? params[3].replace(/\D/g, "") : "";
  switch (params[2]) {
    case "log":
      setChannel(channelId, metadata.channels.ANONLOGS, msg, 0);
      break;
    case "anon":
      setChannel(channelId, metadata.channels.ANONCHANNEL, msg, 1);
      break;
    case "deeptalks":
      setChannel(channelId, metadata.channels.DEEPTALKS, msg, 2);
      break;
    default:
      replyTorMessageWithStatus(msg, 2001);
      break;
  }
}

function handleSlowmodeCommand(params, msg) {
  const seconds = params[2];
  if (!isNumeric(seconds)) {
    replyTorMessageWithStatus(msg, 2005);
    return;
  }

  database.deleteAllSlowdowns();
  database.setConfigurationTimer(metadata.configuration.SLOWMODE, seconds);
  replyTorMessageWithStatus(
    msg,
    seconds !== 0 ? 1003 : 1004,
    seconds !== 0
      ? seconds + (seconds !== 1 ? " seconds" : " second(why?)")
      : ""
  );
}

function handleTempBan(msg, anonId, duration, reason, sendLogResponse = true) {
  if (database.isBanned(anonId)) {
    replyTorMessageWithStatus(msg, 2021);
    return;
  }

  let unbanTime = moment().utc();
  unbanTime = moment(unbanTime).add(duration, "d");

  const DMChannelId = database.getDmChannel(anonId);

  database.setMessageBlocker(
    anonId,
    metadata.blockReason.TEMPBAN,
    reason,
    unbanTime.format("DD MM YYYY HH:mm:ss")
  );

  const banMsg =
    reason +
    "\nUnban date on UTC: " +
    unbanTime.format("MMMM Do YYYY, [at] h:mm a");

  if (sendLogResponse) {
    replyTorMessageWithStatus(msg, 1005, banMsg);
  }

  if (DMChannelId) {
    const dm = new discord.DMChannel(client, { id: DMChannelId });
    dm.send(errors.getError(4000, banMsg));
  }
}

function handleBanCommand(params, msg) {
  const typeOfBan = params[1];
  const msgId = params[2];
  const arg3 = params[3]; // Seconds only in tempban, start of reason otherwise

  const anonId = database.getAnonIdFromMsgId(msgId);
  const DMChannelId = database.getDmChannel(anonId);

  let reason = "";
  if (typeOfBan === "tempban") {
    if (!anonId || !arg3 || !isNumeric(arg3) || params.length < 5) {
      replyTorMessageWithStatus(msg, 2006);
      return;
    }

    handleTempBan(
      msg,
      anonId,
      arg3,
      reconstructMessage(params.slice(4, params.length))
    );
    database.clearWarnCount(anonId, metadata.blockReason.TEMPBAN);
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
  database.clearWarnCount(anonId, metadata.blockReason.PERMBAN);

  if (DMChannelId) {
    const dm = new discord.DMChannel(client, { id: DMChannelId });
    dm.send(errors.getError(4001, reason));
  }
}

function handleUnbanCommand(params, msg) {
  const msgId = params[2];
  let anonId = msgId;

  if (msgId.length !== 36) {
    anonId = database.getAnonIdFromMsgId(msgId);
  }

  if (!anonId || params.length < 3) {
    replyTorMessageWithStatus(msg, 2008);
    return;
  }

  database.deleteMessageBlocker(anonId);
  replyTorMessageWithStatus(msg, 1007, anonId);

  const DMChannelId = database.getDmChannel(anonId);

  if (DMChannelId) {
    const dm = new discord.DMChannel(client, { id: DMChannelId });
    dm.send(errors.getError(4002));
  }
}

function handleWarnCommand(params, msg) {
  let reason = reconstructMessage(params.slice(3));
  const msgId = params[2];

  if (reason === "") {
    reason = "No reason given";
  }

  if (params.length < 3 || !isNumeric(msgId)) {
    replyTorMessageWithStatus(msg, 2011);
    return;
  }

  if (
    database.getTempbanWarnLimit() === -1 ||
    database.getPermbanWarnLimit() === -1 ||
    database.getWarnTempbanDuration() === -1
  ) {
    replyTorMessageWithStatus(msg, 2017);
    return;
  }

  const anonId = database.getAnonIdFromMsgId(msgId);

  if (database.isBanned(anonId)) {
    replyTorMessageWithStatus(msg, 2020);
    return;
  }

  const DMChannelId = database.getDmChannel(anonId);
  const warnResult = database.addWarn(msgId);

  if (warnResult === metadata.blockReason.TEMPBAN) {
    const moderationSideBanReason = "Tempban warn limit reached";
    let unbanTime = moment().utc();
    unbanTime = moment(unbanTime).add(database.getWarnTempbanDuration(), "d");

    database.setMessageBlocker(
      anonId,
      metadata.blockReason.TEMPBAN,
      moderationSideBanReason,
      unbanTime.format("DD MM YYYY HH:mm:ss")
    );

    if (DMChannelId) {
      const dm = new discord.DMChannel(client, { id: DMChannelId });
      const anonUserSideBanReason =
        `You are receiving a warning for sending message ${msgId}\n` +
        `Reason: ${reason}\n` +
        `You have now exceeded the limit on the number of warns users can receive ` +
        `before being temporarily banned. Your ban will be lifted in ` +
        `${database.getWarnTempbanDuration()} days.`;
      dm.send(anonUserSideBanReason);
      database.clearWarnCount(anonId, metadata.blockReason.TEMPBAN);
    }

    replyTorMessageWithStatus(msg, 1008, msgId);
    return;
  } else if (warnResult === metadata.blockReason.PERMBAN) {
    const moderationSideBanReason = "Permban warn limit reached";
    database.setMessageBlocker(
      anonId,
      metadata.blockReason.PERMBAN,
      moderationSideBanReason,
      ""
    );

    if (DMChannelId) {
      const dm = new discord.DMChannel(client, { id: DMChannelId });
      const anonUserSideBanReason =
        `You are receiving a warning for sending message ${msgId}\n` +
        `Reason: ${reason}\n` +
        `You have now exceeded the limit on the number of warns users can receive ` +
        `before being permanently banned. You are permanently banned from sending ` +
        `anonymous messages.`;

      dm.send(anonUserSideBanReason);
      database.clearWarnCount(anonId, metadata.blockReason.PERMBAN);
    }

    replyTorMessageWithStatus(msg, 1008, msgId);
    return;
  } else if (warnResult === -1) {
    replyTorMessageWithStatus(msg, 2015);
    return;
  }

  const tempWarnCount = database.getWarnCount(
    anonId,
    metadata.blockReason.TEMPBAN
  );
  const permWarnCount = database.getWarnCount(
    anonId,
    metadata.blockReason.PERMBAN
  );

  if (DMChannelId) {
    const dm = new discord.DMChannel(client, { id: DMChannelId });
    const warnsUntilTempban = database.getTempbanWarnLimit() - tempWarnCount;
    const warnsUntilPermban = database.getPermbanWarnLimit() - permWarnCount;

    let message =
      `You are receiving a warning for sending message ${msgId}\n` +
      `Reason: ${reason}\n`;

    if (warnsUntilPermban > warnsUntilTempban) {
      message +=
        `You have ${warnsUntilTempban} warns left until you are temporarily banned from sending ` +
        `anonymous messages.\n`;
    }

    message +=
      `You have ${warnsUntilPermban} warns left until you are permanently banned from sending anonymous ` +
      `messages.`;

    dm.send(message);
    replyTorMessageWithStatus(msg, 1008, msgId);
  }
}

function handleWarnLimitCommand(params, msg) {
  if (params.length !== 4 || !isNumeric(params[2]) || !isNumeric(params[3])) {
    replyTorMessageWithStatus(msg, 2012);
    return;
  }

  const tempLimit = parseInt(params[2]);
  const permLimit = parseInt(params[3]);

  if (tempLimit === 0 || permLimit === 0) {
    replyTorMessageWithStatus(msg, 2018);
    return;
  }

  database.setWarnLimits(tempLimit, permLimit);
  const message = `Tempban warn limit set  to ${tempLimit}\nPermban warn limit set to ${permLimit}`;
  msg.channel.send(message);

  const warnedUsersInfo = database.getWarnedUsersInfo();

  const warnChangeAnnouncement =
    `The limits on the number of warns users can receive before being temporarily and ` +
    `permanently banned has changed. The warn limit for temporary bans is now ` +
    `${tempLimit} warns and the warn limit for permanent bans is now ${permLimit} ` +
    `warns.\n\n`;

  let DMChannelId;
  let dm;
  let response;
  let anonId;

  for (let i = 0; i < warnedUsersInfo.length; i++) {
    anonId = warnedUsersInfo[i].anon_id;
    DMChannelId = database.getDmChannel(anonId);
    dm = new discord.DMChannel(client, { id: DMChannelId });

    const tempCount = warnedUsersInfo[i].temp_count;
    const permCount = warnedUsersInfo[i].perm_count;

    if (!DMChannelId) {
      continue;
    }

    if (warnedUsersInfo[i].perm_count >= permLimit) {
      database.setMessageBlocker(
        anonId,
        metadata.blockReason.PERMBAN,
        "Permban warn limit reached",
        ""
      );
      database.clearWarnCount(anonId, metadata.blockReason.PERMBAN);

      response =
        warnChangeAnnouncement +
        `Since you have have received a total of ${permCount} warns, you have been permanently banned ` +
        `from sending anonymous messages.`;
    } else if (warnedUsersInfo[i].temp_count >= tempLimit) {
      let unbanTime = moment().utc();
      unbanTime = moment(unbanTime).add(
        database.getWarnTempbanDuration(),
        "days"
      );

      database.setMessageBlocker(
        anonId,
        metadata.blockReason.TEMPBAN,
        "Tempban warn limit reached",
        unbanTime.format("DD MM YYYY HH:mm:ss")
      );
      database.clearWarnCount(anonId, metadata.blockReason.TEMPBAN);

      response =
        warnChangeAnnouncement +
        `Since you have have received ${tempCount} warns since your last temporary ban cycle ` +
        `started, you have been temporarily banned from sending anonymous messages. Your ban will be ` +
        `lifted in ${database.getWarnTempbanDuration()} days.`;
    } else {
      const warnsUntilTempban = tempLimit - tempCount;
      const warnsUntilPermban = permLimit - permCount;

      response = warnChangeAnnouncement + `After these changes:\n`;

      if (warnsUntilPermban > warnsUntilTempban) {
        response +=
          `You have ${warnsUntilTempban} warns left until you are temporarily banned from sending ` +
          `anonymous messages.\n`;
      }

      response +=
        `You have ${warnsUntilPermban} warns left until you are permanently banned from sending ` +
        `anonymous messages.`;
    }
    dm.send(response);
  }
}

function handleSetWarnTempbanDuration(params, msg) {
  if (params.length !== 3 || !isNumeric(params[2])) {
    replyTorMessageWithStatus(msg, 2013);
    return;
  }

  const days = parseInt(params[2]);
  if (days === 0) {
    replyTorMessageWithStatus(msg, 2019);
    return;
  }

  database.setWarnTempbanDuration(days);
  replyTorMessageWithStatus(msg, 1009, `${days} days`);
}

function handleSetDaysBeforePosting(params, msg) {
  if (params.length !== 3
    || !isNumeric(params[2])
    || !(parseInt(params[2]) >= 0 && parseInt(params[2]) <= 90)) {
    replyTorMessageWithStatus(msg, 2022);
    return;
  }
  database.setPurgatoryTimer(parseInt(params[2]));
  replyTorMessageWithStatus(msg, 1010, `${parseInt(params[2])} days`);
}

function handleBypassAltRestriction(params, msg) {
  if (params.length !== 3) {
    replyTorMessageWithStatus(msg, 2023);
    return;
  }
  const anonId = encryptor.encrypt(params[2]);
  const success = database.deleteFromPurgatory(anonId);
  if (success) {
    replyTorMessageWithStatus(msg, 1011);
  }
  else {
    replyTorMessageWithStatus(msg, 2024);
  }
}

function handleLockdown(params, msg) {
  if (params.length !== 2) {
    replyTorMessageWithStatus(msg, 2025);
    return;
  }
  const lockdownStatus = database.swapAndReturnLockdownStatus();
  if (lockdownStatus === 0) {
    replyTorMessageWithStatus(msg, 1013);
  }
  else {
    replyTorMessageWithStatus(msg, 1012);
  }
}

// Helpers

function reconstructMessage(params) {
  return params.join(" ");
}

function concatRegex(regex1, regex2) {
  return new RegExp(regex1.source + regex2.source);
}

function replyTorMessageWithStatus(msg, status, suffix, content) {
  const errorDesc = errors.getError(status);
  // Help message special case. Setting header
  if (status === 0) {
    errorDesc.setAuthor(client.user.username, client.user.avatarURL());
  }

  if (msg.channel && msg.channel.type === "dm") {
    msg.reply(errors.getError(status, suffix));
  } else if (content) {
    msg.channel.messages.channel.send(content);
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
