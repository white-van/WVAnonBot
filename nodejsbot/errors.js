const errorMap = {
    // Help message
    0 : 'WV Anon bot commands: \n'
        + '!anon set log #channel -> Sets the logger channel for the bot to dump submitted messages with anon IDs\n'
        + '!anon set anon #channel -> Sets the anon channel for the bot to write to\n',
    // Success
    1000 : 'Logs channel configured successfully',
    1001 : 'Anon channel configured successfully',
    // Input configuration problems
    2000 : 'Command unrecognized. Run !anon help for all available commands',
    2001 : 'Nothing provided after set. Run !anon help for all available options',
    2002 : 'Logs channel not found or not provided. Make sure the channel is properly tagged (ex: #logs)',
    2003 : 'Anon channel not found or not provided. Make sure the channel is properly tagged (ex: #anonymous-messages)'
}

module.exports = {
    getError : function(err) {
        return errorMap[err];
    }
 }