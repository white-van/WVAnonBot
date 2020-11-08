// One stop shop for everything timer related. Slowmodes, spam, and blocks(temp and perm)
// If returns anything, will only return errors. Null otherwise
const database = require('./database.js');
const metadata = require('./metadata.js');
const encryptor = require('./encryptor.js');
const moment = require('moment');  

function configureTimersAndCheckIfCanSend(msg) {
    var encryptedUser = encryptor.encrypt(msg.author.id);
    var record = database.getMessageBlocker(encryptedUser);
    var now = moment().utc();
    var error = {
        errorCode : -1,
        suffix : ''
    }

    if (record) {
        var dateOfUnblock = moment.utc(record.date, 'DD MM YYYY HH:mm:ss');
        switch (record.reason) {
            case metadata.blockReason.SLOWMODE:
                if (now.isBefore(dateOfUnblock)) {
                    error.errorCode = 3000;
                    error.suffix = dateOfUnblock.diff(now, 'seconds') + ' seconds';
                }
                else {
                    database.deleteMessageBlocker(encryptedUser);
                }
                break;
            default:
                break;
        }

    }

    if (error.errorCode != -1) {
        return error;
    }

    addSlowmodeTimer(msg, encryptedUser);
}

function addSlowmodeTimer(msg, encryptedUser) {
    var slowmodeTimer = database.getConfigurationTimer(metadata.configuration.SLOWMODE);
    if (slowmodeTimer == 0) {
        return;
    }

    var slowModeDate = moment().utc();
    slowModeDate = slowModeDate.seconds(slowModeDate.seconds() + slowmodeTimer);
    database.setMessageBlocker(encryptedUser, metadata.blockReason.SLOWMODE, slowModeDate.format('DD MM YYYY HH:mm:ss'));
}

module.exports = {
    configureTimersAndCheckIfCanSend
}