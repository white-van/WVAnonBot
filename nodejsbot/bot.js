const discord = require('discord.js');
const client = new discord.Client();
const auth = require('./auth.json');
const errors = require('./errors.js');

var logChannel = '';
var anonChannel = '';

// Hooks
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.author.bot) {
        return;
    }
    if (msg.channel.type == 'dm') {
        submitAnon(msg);
    }
    else if (msg.channel.type == 'text') {
        parseArguments(msg);
    }
});

// Central functionality
function submitAnon(msg) {
    if (logChannel == '' || anonChannel == '') {
        msg.reply('The bot first needs to be configured!');
        return;
    }

    var msgToSend = { embed: {
        color: 3447003,
        description: msg.content,
        timestamp: new Date()
      }
    };

    var anonChannelDestination = client.channels.cache.get(anonChannel);
    var logChannelDestination = client.channels.cache.get(logChannel);

    if (anonChannelDestination) {
        anonChannelDestination.send(msgToSend);
        msg.reply('Message sent to ' + anonChannelDestination.name);
    }

    if (logChannelDestination) {
        logChannelDestination.send(msgToSend);
    }
}

function parseArguments(msg) {
    var params = msg.content.split(' ');

    if (params[0] == '!anon') {
        switch (params[1]) {
            case 'help':
                replyToServerMessageWithStatus(msg, 0);
                break;
            case 'set':
                handleSetCommand(params, msg);
                break;
            default:
                replyToServerMessageWithStatus(msg, 2000);
                break;
        }
    }
}

function handleSetCommand(params, msg) {
    var channelId = params[3] ? params[3].replace(/\D/g,'') : '';
    var validChannelId = msg.channel.guild.channels.cache.has(channelId);

    switch (params[2]) {
        case 'log':
            if (validChannelId) {
                logChannel = channelId;
                replyToServerMessageWithStatus(msg, 1000);
            }
            else {
                replyToServerMessageWithStatus(msg, 2002);
            }
            break;
        case 'anon':
            if (validChannelId) {
                anonChannel = channelId;
                replyToServerMessageWithStatus(msg, 1001);
            }
            else {
                replyToServerMessageWithStatus(msg, 2003);
            }
            break;
        default:
            replyToServerMessageWithStatus(msg, 2001);
            break;
    }
}

function getHelpString() {
    return 'WV Anon bot commands: \n'
        + '!anon set log #channel -> Sets the logger channel for the bot to dump submitted messages with anon IDs\n'
        + '!anon set anon #channel -> Sets the anon channel for the bot to write to\n'
}

function replyToServerMessageWithStatus(msg, status) {
    msg.channel.messages.channel.send(errors.getError(status));
}

client.login(auth.token);