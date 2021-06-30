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
          "• `!anon set log #channel`\n" +
          "Description: Sets the logger channel for the bot to dump submitted messages with anon IDs\n\n" +
          "• `!anon set anon #channel`\n" +
          "Description: Sets the anon channel for the bot to write to\n\n" +
          "• `!anon set deeptalks #channel`\n" +
          "Description: Sets the deep talk channel for the bot to write to\n\n" +
          "• `!anon set #anon-msgs #deep-talks #anon-logs`\n" +
          "Description: Sets all three channels at once",
      },
      {
        name: "Timers",
        value:
          "• `!anon slowmode seconds`\n" +
          "Description: Adds a slowmode to the messages sent to the anon chat. 0 seconds turns slowmode off",
      },
      {
        name: "Bans and warns",
        value:
          "• `!anon tempban msg_id days reason`\n" +
          "Description: Temporarily bans a user for some amount of time with a reason\n\n" +
          "• `!anon permban msg_id reason`\n" +
          "Description: Permanently bans a user with a reason\n\n" +
          "• `!anon unban [msg_id/anon_id]`\n" +
          "Description: Unbans a user\n\n" +
          "• `!anon banlist`\n" +
          "Description: Display all banned users\n" +
          "NOTE: The user will be notified of the ban along with the reason for the ban\n\n" +
          "• `!anon warn msg_id reason`\n" +
          "Description: Warns a user. A reason for the warn may optionally be provided.\n" +
          "NOTE: In order to issue warns, the settings for warnings must first be configured with the `!anon " +
          "warnlimit tempLimit permLimit` command and the `!anon wtd days` command.\n\n" +
          "• `!anon warnlimit tempLimit permLimit`\n" +
          "Description: Sets the number of warns a user can receive before being tempbanned and permbanned, " +
          "respectively.\n\n" +
          "• `!anon wtd days`\n" +
          "Description: Sets the warn tempban duration, which is the number of days a user will be tempbanned for if " +
          "they exceed the tempban warn limit",
      },
      {
        name: "Filters",
        value:
          "• `!anon slur word`\n" +
          "Description: Adds a slur to the block list",
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
        "Please follow the rules when using WVAnon\n\n" +
        "• `!rules\n`" +
        "Description: View the rules\n",
    })
    .addFields({
      name: "Messaging commands",
      value:
        "\nThe nsfw argument is **optional**. If `nsfw` is included, the message will be wrapped in spoiler tags.\n\n" +
        "• `!send (nsfw) your_message`\n" +
        "Description: sends a message to the anonymous chat\n" +
        "Examples:    !send hello, !send nsfw hello\n\n" +
        "• `!send-deep (nsfw) your_message`\n" +
        "Description: sends a message to the deep-talks channel\n" +
        "Examples: !send-deep hello, !send-deep nsfw hello\n\n" +
        "• `!send/send-deep (nsfw) reply msg_number_here your_message`\n" +
        "Description: Replies to the message with the specified message number\n" +
        "Examples: !send reply 123 hello, !send-deep nsfw reply 123 hello\n",
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
  1008: "User was warned for sending message ",
  1009: "Warn tempban duration set to ",
  // Input configuration problems
  2000: "Command unrecognized. Run !anon help for all available commands",
  2001: "Nothing provided after set, or the channel target was incorrect. Run !anon help for all available options",
  2002: "Logs channel not found or not provided. Make sure the channel is properly tagged (ex: #logs)",
  2003: "Anon channel not found or not provided. Make sure the channel is properly tagged (ex: #anonymous-messages)",
  2004: "Deep talks channel not found or not provided. Make sure the channel is properly tagged (ex: #deep-talks)",
  2005: "Improper slowmode command provided, or the number is negative. Follow the format of !anon slowmode second",
  2006: "Improper tempban command provided. Follow the format of !anon tempban msgId days reason",
  2007: "Improper permban command provided. Follow the format of !anon permban msgId reason",
  2008: "Improper unban command provided. Follow the format of !anon msgId user",
  2009: "Command unrecognized. Type in !help to see everything available to you",
  2010: "Improper msgId value provided. Please try again.",
  2011: "Improper warn command provided. Follow the format of !anon warn msgId",
  2012: "Improper warn limit command provided. Follow the format of !anon warnlimit tempbanLimit permbanLimit",
  2013: "Improper warn tempban duration command provided. Follow the format of !anon wtd days",
  2014:
    "The reply could not be sent. Either the message number is invalid, the message has been deleted, or the " +
    "message was sent before the reply command was introduced. As a reminder, the reply command is " +
    "`!send/send-deep (nsfw) reply msg_number_here your_message`. For example, `!send reply 123 hello`, or " +
    "`!send-deep nsfw reply 123 hello`.",
  2015:
    "The message with the specified id is ineligible for warns. Either the message with that id does not exist or " +
    "the user who sent the message has already received a warn for it.",
  2016: "Please do not use WVAnon for hate speech. Rethink your life choices, please.",
  2017:
    "Warns cannot be issued until the settings for warnings have been fully set. To set up warnings, use:\n\n" +
    "• `!anon warnlimit tempLimit permLimit`, where tempLimit is the number of warns a user receives before being " +
    "tempbanned, and permLimit is the number of warns a user receives before being permbanned.\n\n" +
    "• `!anon wtd duration`, where duration is the warnings temban duration, which is the number of days a user will " +
    "tempbanned for after meeting the tempban warn limit.",
  2018: "Improper warn limit settings: warn limits must be greater than zero",
  2019: "The warnings tempban duration must be greater than 0",
  2020: "The user who sent this message is currently banned and consequently cannot receive warns.",
  2021: "User is already banned from sending anonymous messages",
  // Message blocks
  3000: "Slowmode is active. Try sending in ",
  3001: "You've sent too many messages within a short timeframe. Try again in ",
  3002: "You've been temporarily banned from posting anonymous messages.\nReason: ",
  3003: "You've been permenantly banned from posting anonymous messages.\nReason: ",
  // Warn and ban notifications
  4000: "You have been temporarily banned.\nReason: ",
  4001: "You have been permanently banned.\nReason: ",
  4002: "You have been unbanned. Please remember to follow the rules of the server when sending anonymous messages.",
  // Confessions
  10000: "Confessions channel set successfully. Make sure the bot can actually see the channel in discord with its perms! (check the sidebar while in the channel. "
    + "If you see the bot, you're good. If not, give it perms in discord to be able to access it.)",
  11002: "Confessions channel provided is an invalid channel."
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
