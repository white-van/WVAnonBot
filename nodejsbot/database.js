var sqlite = require('better-sqlite3');
var db = new sqlite('./dbfile');

function getOrSetEncryptor(bufferIv) {
    // Can only have one encryptor value. Get an existing, or set and return passed
    var stmt = db.prepare('SELECT ivValue FROM encryptor')
    var row = stmt.get();
    if (row) {
        return Buffer.from(row.ivValue, 'hex');
    }
    stmt = db.prepare('INSERT INTO encryptor VALUES (?)');
    stmt.run(bufferIv.toString('hex'));
    return bufferIv;
}

// TODO: Cleanup all this by making this enum based
function setChannelDestinations(colName, channelId) {
    var stmt = db.prepare('UPDATE channelDestinations SET ' + colName + ' = ' + channelId);
    stmt.run();
}

function getChannelDestination(colName) {
    var stmt = db.prepare('SELECT ' + colName + ' AS channelID FROM channelDestinations');
    return stmt.get().channelID;
}

module.exports = {
    getOrSetEncryptor,
    setChannelDestinations,
    getChannelDestination
}

// Initial setup
function initializeTables() {
    // Encryption storage for persistency of IDs
    var stmt = db.prepare('CREATE TABLE IF NOT EXISTS encryptor (ivValue TEXT)');
    stmt.run();
    // Channel storage
    stmt = db.prepare('CREATE TABLE IF NOT EXISTS channelDestinations (anonChannel TEXT, anonLogChannel TEXT)');
    stmt.run();
    stmt = db.prepare('INSERT INTO channelDestinations VALUES (\'\', \'\')');
    stmt.run();
}

initializeTables();