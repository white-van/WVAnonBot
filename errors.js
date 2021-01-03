const discord = require("discord.js");

const errorMap = {
  // Help message for server
  0: new discord.MessageEmbed()
    .setDescription(
      "WV's custom anon bot designed to allow for maximum admin aboose"
    )
    .setColor(3447003)
    .addFields(
      {
        name: "Setting channel destinations",
        value:
          "!anon set log #channel -> Sets the logger channel for the bot to dump submitted messages with anon IDs\n" +
          "!anon set anon #channel -> Sets the anon channel for the bot to write to\n" +
          "!anon set deeptalks #channel -> Sets the deep talk channel for the bot to write to\n" +
          "!anon set #anon-msgs #deep-talks #anon-logs -> Sets all three channels at once",
      },
      {
        name: "Timers",
        value:
          "!anon slowmode seconds -> Adds a slowmode to the messages sent to the anon chat. 0 seconds turns slowmode off",
      },
      {
        name: "Bans",
        value:
          "!anon tempban msg_id seconds reason -> Temporarily bans a user for some amount of time with a reason\n" +
          "!anon permban msg_id reason -> Permanently bans a user with a reason\n" +
          "!anon unban msg_id -> Unbans a user\n" +
          "NOTE: User will see ban reason when they attempt to send a message to the bot",
      }
    )
    .setTimestamp(),
  // Help message for user
  1: new discord.MessageEmbed()
    .setTitle("User Commands")
    .setColor(3447003)
    .addFields({
      name: "Informational commands",
      value:
        "Please follow the rules when using WVAnon\n" +
        "• !rules -> View the rules",
    })
    .addFields({
      name: "Messaging commands",
      value:
        "Arguments wrapped in [square brackets] are required.\n" +
        'The {nsfw} argument is optional. If "nsfw" is included, the message will be wrapped in spoiler ' +
        "tags.\n\n" +
        "• !send {nsfw} [msg] -> Sends a message to the anonymous chat\n" +
        "• !send-deep {nsfw} [msg] -> Sends a message to the deep-talks channel\n" +
        "• !send/send-deep {nsfw} reply [number] [msg] -> Replies to the message with message number [number]\n\n",
    })
    .setTimestamp(),
  // Rules for user
  2: new discord.MessageEmbed()
    .setDescription("WVAnon")
    .setColor(3447003)
    .addFields({
      name: "Rules",
      value:
        "1. NSFW content must be wrapped in a spoiler tag (use the nsfw argument!)\n" +
        "2. No impersonation\n" +
        "3. All rules in <#534583763217285131> still apply!",
    })
    .addFields({
      name: "Contribution",
      value:
        "Visit https://github.com/white-van/WVAnonBot to view the codebase\n" +
        "Contributions welcome!",
    })
    .setTimestamp(),
  // Success
  1000: "Logs channel configured successfully",
  1001: "Anon channel configured successfully",
  1002: "Deep talks channel configured successfully",
  1003: "Slowmode successfully configured to ",
  1004: "Slowmode turned off",
  1005: "Anon user was temp banned with reason: ",
  1006: "Anon user was perm banned with reason: ",
  1007: "Following anon user was unbanned: ",
  // Input configuration problems
  2000: "Command unrecognized. Run !anon help for all available commands",
  2001: "Nothing provided after set, or the channel target was incorrect. Run !anon help for all available options",
  2002: "Logs channel not found or not provided. Make sure the channel is properly tagged (ex: #logs)",
  2003: "Anon channel not found or not provided. Make sure the channel is properly tagged (ex: #anonymous-messages)",
  2004: "Deep talks channel not found or not provided. Make sure the channel is properly tagged (ex: #deep-talks)",
  2005: "Improper slowmode command provided, or the number is negative. Follow the format of !anon slowmode second",
  2006: "Improper tempban command provided. Follow the format of !anon tempban msgId seconds reason",
  2007: "Improper permban command provided. Follow the format of !anon permban msgId reason",
  2008: "Improper unban command provided. Follow the format of !anon msgId user",
  2009: "Command unrecognized. Type in !help to see everything available to you",
  2010: "Improper msgId value provided. Please try again.",
  2011:
    "Number of the message to reply to is either invalid or belongs to a message that was sent before the " +
    "reply-feature update. Only messages that were sent after the reply-feature update can be replied to.",
  // Message blocks
  3000: "Slowmode is active. Try sending in ",
  3001: "You've send too many messages within a short timeframe. Try again in ",
  3002: "You've been temporarily banned from posting anon messages. Reason: ",
  3003: "You've been permenantly banned from posting anon messages. Reason: ",
};

module.exports = {
  getError: function (err, suffix) {
    // Combining into one will break the help message. Seperate it
    if (suffix) {
      return errorMap[err] + suffix;
    }
    return errorMap[err];
  },
};
