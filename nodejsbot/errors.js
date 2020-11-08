const discord = require('discord.js');

const errorMap = {
    // Help message
    0 : new discord.MessageEmbed()
        .setDescription('WV\'s custom anon bot designed to allow for maximum admin aboose')
        .setColor(3447003)
        .addFields({
            name: 'Setting channel destinations',
            value: '!anon set log #channel -> Sets the logger channel for the bot to dump submitted messages with anon IDs\n'
                + '!anon set anon #channel -> Sets the anon channel for the bot to write to\n'
                + '!anon set deeptalks #channel -> Sets the deep talk channel for the bot to write to'
            },
            {
                name: 'Timers',
                value: '!anon slowmode seconds -> Adds a slowmode to the messages sent to the anon chat. 0 seconds turns slowmode off'
            })
        .setTimestamp(),
    // Success
    1000 : 'Logs channel configured successfully',
    1001 : 'Anon channel configured successfully',
    1002 : 'Deep talks channel configured successfully',
    1003 : 'Slowmode successfully configured to ',
    1004 : 'Slowmode turned off',
    // Input configuration problems
    2000 : 'Command unrecognized. Run !anon help for all available commands',
    2001 : 'Nothing provided after set. Run !anon help for all available options',
    2002 : 'Logs channel not found or not provided. Make sure the channel is properly tagged (ex: #logs)',
    2003 : 'Anon channel not found or not provided. Make sure the channel is properly tagged (ex: #anonymous-messages)',
    2004 : 'Deep talks channel not found or not provided. Make sure the channel is properly tagged (ex: #deep-talks)',
    2005 : 'Improper slowmode command provided, or the number is negative. Follow the format of !anon slowmode second',
    // Message blocks
    3000 : 'Slowmode is active. Try sending in ',
    3001 : 'You\'ve send too many messages within a short timeframe. Try again in ',
    3002 : 'You\'ve been temporarily banned from posting anon messages. Reason and date for unban: ',
    3003 : 'You\'ve been permenantly banned from posting anon messages. Reason: ',
}

module.exports = {
    getError : function(err, suffix) {
        // Combining into one will break the help message. Seperate it
        if (suffix) {
            return errorMap[err] + suffix;
        }
        return errorMap[err];
    }
}