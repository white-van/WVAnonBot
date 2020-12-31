var sqlite = require("better-sqlite3");
var db = new sqlite("./dbfile");
var metadata = require("./metadata.js");

function getOrSetEncryptor(bufferIv) {
  // Can only have one encryptor value. Get an existing, or set and return passed
  var stmt = db.prepare("SELECT ivValue FROM encryptor");
  var row = stmt.get();
  if (row) {
    return Buffer.from(row.ivValue, "hex");
  }
  stmt = db.prepare("INSERT INTO encryptor VALUES (?)");
  stmt.run(bufferIv.toString("hex"));
  return bufferIv;
}

function setChannelDestinations(colName, channelId) {
  var stmt = db.prepare(
      "UPDATE channelDestinations SET " + colName + " = " + channelId
  );
  stmt.run();
}

function getChannelDestination(colName) {
  var stmt = db.prepare(
      "SELECT " + colName + " AS channelID FROM channelDestinations"
  );
  return stmt.get().channelID;
}

function setConfigurationTimer(colName, seconds) {
  var stmt = db.prepare(
      "UPDATE configuration SET " + colName + " = " + seconds
  );
  stmt.run();
}

function getConfigurationTimer(colName) {
  var stmt = db.prepare("SELECT " + colName + " AS config FROM configuration");
  return stmt.get().config;
}

function setMessageBlocker(encryptedUser, reason, explanation, dateOfUnban) {
  // Update if exists, else create
  var stmt = db.prepare(
      "SELECT reason, explanation, date FROM messageBlocker WHERE encryptedUserId = ?"
  );
  if (stmt.get(encryptedUser)) {
    stmt = db.prepare(
        "UPDATE messageBlocker SET reason = ?, explanation = ?, date = ? WHERE encryptedUserId = ?"
    );
    stmt.run(reason, explanation, dateOfUnban, encryptedUser);
    return;
  }
  stmt = db.prepare("INSERT INTO messageBlocker VALUES (?, ?, ?, ?)");
  stmt.run(encryptedUser, reason, explanation, dateOfUnban);
}

function getMessageBlocker(encryptedUser) {
  var stmt = db.prepare(
      "SELECT reason, explanation, date FROM messageBlocker WHERE encryptedUserId = ?"
  );
  return stmt.get(encryptedUser);
}

function deleteMessageBlocker(encryptedUser) {
  var stmt = db.prepare("DELETE FROM messageBlocker WHERE encryptedUserId = ?");
  stmt.run(encryptedUser);
}

function deleteAllSlowdowns() {
  var stmt = db.prepare("DELETE FROM messageBlocker WHERE reason = ?");
  stmt.run(metadata.blockReason.SLOWMODE);
}

function getAndIncrementMessageCounter() {
  var stmt = db.prepare("SELECT count FROM messageCounter");
  var result = stmt.get();
  if (!result) {
    stmt = db.prepare("INSERT INTO messageCounter VALUES (1)");
    stmt.run();
    return 0;
  }
  stmt = db.prepare("UPDATE messageCounter SET count = count + 1");
  stmt.run();
  return result.count;
}

function addMessageAndGetNumber(msg) {

  stmt = db.prepare("SELECT * FROM messages WHERE number=(SELECT MAX(number) FROM messages)")
  var result = stmt.get()

  var messageNumber;
  if (!result) {

    stmt = db.prepare("SELECT count FROM messageCounter");
    result = stmt.get();

    if (!result) {
      messageNumber = 0
    } else {
      messageNumber = result.count;
    }

  } else {
    messageNumber = result.number + 1;
  }

  stmt = db.prepare("INSERT INTO messages VALUES (?, ?, ?)");
  stmt.run(messageNumber, msg, "");

  return messageNumber;
}

function updateMessageWithUrl(number, url) {
  var stmt = db.prepare("UPDATE messages SET message_url = ? WHERE number = ?");
  stmt.run(url, number);
}

function getMessageByNumber(num) {

  if (!messageNumberIsRepliable(num)) {
    return "";
  }

  stmt = db.prepare("SELECT message_content FROM messages WHERE number = " + num.toString());
  result = stmt.get();
  return result.message_content;
}

function getMessageUrlByNumber(num) {

  if (!messageNumberIsRepliable(num)) {
    return "";
  }

  stmt = db.prepare("SELECT message_url FROM messages WHERE number = " + num.toString());
  result = stmt.get();
  return result.message_url;
}

function messageNumberIsRepliable(num) {
  var stmt = db.prepare("SELECT * FROM messages WHERE number=(SELECT MIN(number) from messages)");
  var result = stmt.get();
  if(!result) {
    return "";
  }
  const firstRepliableMessageNumber = result.number;

  stmt = db.prepare("SELECT * FROM messages WHERE number=(SELECT MAX(number) from messages)")
  result = stmt.get();
  const lastRepliableMessageNumber = result.number;

  return num >= firstRepliableMessageNumber && num <= lastRepliableMessageNumber;
}

function getAnonIdFromMsgId(msgId) {
  var stmt = db.prepare("SELECT anon_id FROM msgMap WHERE msg_id = ?");
  const result = stmt.get(msgId);
  if (!result) {
    return;
  }
  return result.anon_id;
}

function insertMsgMap(anon_id, msg_id) {
  // Update if exists, else create
  var stmt = db.prepare("SELECT anon_id FROM msgMap WHERE msg_id = ?");
  if (stmt.get(msg_id)) {
    stmt = db.prepare(
        "UPDATE msgMap SET anon_id = ? WHERE encryptedUserId = ?"
    );
    stmt.run(anon_id, msg_id);
    return;
  }
  stmt = db.prepare("INSERT INTO msgMap VALUES (?, ?)");
  stmt.run(msg_id, anon_id);
}

module.exports = {
  getOrSetEncryptor,
  setChannelDestinations,
  getChannelDestination,
  setConfigurationTimer,
  getConfigurationTimer,
  setMessageBlocker,
  getMessageBlocker,
  deleteMessageBlocker,
  deleteAllSlowdowns,
  getAndIncrementMessageCounter,
  addMessageAndGetNumber,
  getMessageByNumber,
  getMessageUrlByNumber,
  updateMessageWithUrl,
  getAnonIdFromMsgId,
  insertMsgMap,
};

// Initial setup
function initializeTables() {
  // Encryption storage for persistency of IDs
  var stmt = db.prepare("CREATE TABLE IF NOT EXISTS encryptor (ivValue TEXT)");
  stmt.run();

  // anon_id to msg_id table
  var stmt = db.prepare(
      "CREATE TABLE IF NOT EXISTS msgMap ( msg_id INTEGER PRIMARY KEY, anon_id TEXT NOT NULL )"
  );
  stmt.run();

  // Channel storage
  stmt = db.prepare(
      "CREATE TABLE IF NOT EXISTS channelDestinations (" +
      Object.values(metadata.channels).join(" TEXT, ") +
      " TEXT)"
  );
  stmt.run();
  stmt = db.prepare("INSERT INTO channelDestinations VALUES ('', '', '')");
  stmt.run();

  // Configuration settings
  stmt = db.prepare(
      "CREATE TABLE IF NOT EXISTS configuration (" +
      Object.values(metadata.configuration).join(" INTEGER, ") +
      " TEXT)"
  );
  stmt.run();
  stmt = db.prepare("INSERT INTO configuration VALUES (0, 0)");
  stmt.run();

  // Message blockers
  stmt = db.prepare(
      "CREATE TABLE IF NOT EXISTS messageBlocker (encryptedUserId TEXT, reason TEXT, explanation TEXT, date TEXT)"
  );
  stmt.run();

  // Message counter
  stmt = db.prepare(
      "CREATE TABLE IF NOT EXISTS messageCounter (count INTEGER)"
  );
  stmt.run();

  // Message number, content, and url
  stmt = db.prepare(
      "CREATE TABLE IF NOT EXISTS messages (number INTEGER PRIMARY KEY, " +
      "message_content TEXT NOT NULL, message_url TEXT)"
  );
  stmt.run();
}

initializeTables();
