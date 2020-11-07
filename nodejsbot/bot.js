const discord = require('discord.js');
const client = new discord.Client();
const auth = require('./auth.json');
const encryptor = require('./encryptor.js');
const errors = require('./errors.js');
const database = require('./database.js');
const metadata = require('./metadata.js');

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
    var msgStripped = msg.content.replace(/^(!deeptalks)/,"");
    var anonChannel = database.getChannelDestination(metadata.channels.ANONCHANNEL);
    var anonLogsChannel = database.getChannelDestination(metadata.channels.ANONLOGS);
    var deepTalksChannel = database.getChannelDestination(metadata.channels.DEEPTALKS);

    if (anonLogsChannel == '' || anonChannel == '' || deepTalksChannel == '') {
        msg.reply('The bot first needs to be configured!');
        return;
    }
    else if (msgStripped.replace(' ', '') == '') {
        msg.reply('Give me something proper!');
        return;
    }

    var msgToSend = new discord.MessageEmbed()
        .setDescription(msgStripped.trim())
        .setColor(3447003)
        .setTimestamp();

    var anonChannelDestination = client.channels.cache.get(anonChannel);
    var deepTalkChannelDestination = client.channels.cache.get(deepTalksChannel);
    var logChannelDestination = client.channels.cache.get(anonLogsChannel);

    if (msg.content.startsWith('!deeptalks ')) {
        deepTalkChannelDestination.send(msgToSend);
        msg.reply('Message sent to ' + deepTalkChannelDestination.name);
    }
    else {
        anonChannelDestination.send(msgToSend);
        msg.reply('Message sent to ' + anonChannelDestination.name);
    }

    msgToSend.addFields({
        name: 'Anon ID',
        value: encryptor.encrypt(msg.author.id)
    },
    {
        name: 'Target channel',
        value: msg.content.startsWith('!deeptalks ') ? deepTalkChannelDestination.name : anonChannelDestination.name
    });
    logChannelDestination.send(msgToSend);
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
                database.setChannelDestinations(metadata.channels.ANONLOGS, channelId);
                replyToServerMessageWithStatus(msg, 1000);
            }
            else {
                replyToServerMessageWithStatus(msg, 2002);
            }
            break;
        case 'anon':
            if (validChannelId) {
                database.setChannelDestinations(metadata.channels.ANONCHANNEL, channelId);
                replyToServerMessageWithStatus(msg, 1001);
            }
            else {
                replyToServerMessageWithStatus(msg, 2003);
            }
            break;
        case 'deeptalks':
            if (validChannelId) {
                database.setChannelDestinations(metadata.channels.DEEPTALKS, channelId);
                replyToServerMessageWithStatus(msg, 1002);
            }
            else {
                replyToServerMessageWithStatus(msg, 2004);
            }
            break;
        default:
            replyToServerMessageWithStatus(msg, 2001);
            break;
    }
}

function replyToServerMessageWithStatus(msg, status) {
    var errorDesc = errors.getError(status);
    // Help message special case. Setting header
    if (status == 0) {
        errorDesc.setAuthor(client.user.username, client.user.avatarURL());
    }
    msg.channel.messages.channel.send(errors.getError(status));
}

client.login(auth.token);