/* eslint-disable new-cap */
const sqlite = require("better-sqlite3");
const db = new sqlite("./dbfile");
const metadata = require("./metadata.js");

function getOrSetEncryptor(bufferIv) {
  // Can only have one encryptor value. Get an existing, or set and return passed
  let stmt = db.prepare("SELECT ivValue FROM encryptor");
  const row = stmt.get();
  if (row) {
    return Buffer.from(row.ivValue, "hex");
  }
  stmt = db.prepare("INSERT INTO encryptor VALUES (?)");
  stmt.run(bufferIv.toString("hex"));
  return bufferIv;
}

function setChannelDestinations(colName, channelId) {
  const stmt = db.prepare(
    "UPDATE channelDestinations SET " + colName + " = " + channelId
  );
  stmt.run();
}

function getChannelDestination(colName) {
  const stmt = db.prepare(
    "SELECT " + colName + " AS channelID FROM channelDestinations"
  );
  return stmt.get().channelID;
}

function setConfigurationTimer(colName, seconds) {
  const stmt = db.prepare(
    "UPDATE configuration SET " + colName + " = " + seconds
  );
  stmt.run();
}

function getConfigurationTimer(colName) {
  const stmt = db.prepare(
    "SELECT " + colName + " AS config FROM configuration"
  );
  return stmt.get().config;
}

function getBanList() {
  const statement = db.prepare(
    "SELECT * FROM messageBlocker WHERE reason != ?"
  );
  return statement.all(metadata.blockReason.SLOWMODE);
}

function setMessageBlocker(encryptedUser, reason, explanation, dateOfUnban) {
  // Update if exists, else create
  let stmt = db.prepare(
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
  const stmt = db.prepare(
    "SELECT reason, explanation, date FROM messageBlocker WHERE encryptedUserId = ?"
  );
  return stmt.get(encryptedUser);
}

function deleteMessageBlocker(encryptedUser) {
  const stmt = db.prepare(
    "DELETE FROM messageBlocker WHERE encryptedUserId = ?"
  );
  stmt.run(encryptedUser);
}

function deleteAllSlowdowns() {
  const stmt = db.prepare("DELETE FROM messageBlocker WHERE reason = ?");
  stmt.run(metadata.blockReason.SLOWMODE);
}

// The getAndIncrementMessageCounter function was deleted, and was removed from module.exports

function addMessageAndGetNumber(msg) {
  let stmt = db.prepare(
    "SELECT * FROM messages WHERE number=(SELECT MAX(number) FROM messages)"
  );
  let result = stmt.get();

  let messageNumber;
  if (!result) {
    stmt = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='messageCounter'"
    );
    result = stmt.get();
    if (typeof result === "undefined") {
      messageNumber = 0;
    } else {
      stmt = db.prepare("SELECT count FROM messageCounter");
      result = stmt.get();
      if (!result) {
        messageNumber = 0;
      } else {
        messageNumber = result.count;
      }
    }
  } else {
    messageNumber = result.number + 1;
  }

  stmt = db.prepare("INSERT INTO messages VALUES (?, ?, ?, ?)");
  stmt.run(messageNumber, msg, "", 0);

  return messageNumber;
}

function updateMessageWithUrl(number, url) {
  const stmt = db.prepare(
    "UPDATE messages SET message_url = ? WHERE number = ?"
  );
  stmt.run(url, number);
}

function setMessageAsDeleted(num) {
  const stmt = db.prepare(
      "UPDATE messages SET is_deleted = ? WHERE number = ?"
  );
  stmt.run(1, num);
}

function getMessageByNumber(num) {
  if (!messageNumberIsRepliable(num)) {
    return "";
  }

  const stmt = db.prepare(
    "SELECT message_content FROM messages WHERE number = " + num.toString()
  );
  const result = stmt.get();
  return result.message_content;
}

function getMessageUrlByNumber(num) {
  if (!messageNumberIsRepliable(num)) {
    return "";
  }

  const stmt = db.prepare(
    "SELECT message_url FROM messages WHERE number = " + num.toString()
  );
  const result = stmt.get();
  return result.message_url;
}

function messageNumberIsRepliable(num) {
  let stmt = db.prepare(
    "SELECT * FROM messages WHERE number=(SELECT MIN(number) from messages)"
  );
  let result = stmt.get();
  if (!result) {
    return "";
  }
  const firstRepliableMessageNumber = result.number;

  stmt = db.prepare(
    "SELECT * FROM messages WHERE number=(SELECT MAX(number) from messages)"
  );
  result = stmt.get();
  const lastRepliableMessageNumber = result.number;

  const sentAfterUpdate = num >= firstRepliableMessageNumber && num <= lastRepliableMessageNumber;


  stmt = db.prepare("SELECT * FROM messages WHERE number= ?");
  result = stmt.get(num);
  const isDeleted = result.isDeleted === 1;


  return sentAfterUpdate && !isDeleted;

}

function getAnonIdFromMsgId(msgId) {
  const stmt = db.prepare("SELECT anon_id FROM msgMap WHERE msg_id = ?");
  const result = stmt.get(msgId);
  if (!result) {
    return;
  }
  return result.anon_id;
}

function insertMsgMap(anonId, msgId) {
  // Update if exists, else create
  let stmt = db.prepare("SELECT anon_id FROM msgMap WHERE msg_id = ?");
  if (stmt.get(msgId)) {
    stmt = db.prepare(
      "UPDATE msgMap SET anon_id = ? WHERE encryptedUserId = ?"
    );
    stmt.run(anonId, msgId);
    return;
  }
  stmt = db.prepare("INSERT INTO msgMap VALUES (?, ?)");
  stmt.run(msgId, anonId);
}

function getSlurs() {
  const stmt = db.prepare("SELECT * FROM slurs");
  const results = stmt.all();
  if (!results) {
    return;
  }
  return results;
}

function insertSlur(word) {
  // Create if it does not exist
  let stmt = db.prepare("SELECT word FROM slurs WHERE word = ?");
  if (stmt.get(word)) {
    console.log(stmt.get(word));
    return;
  }
  stmt = db.prepare("INSERT INTO slurs VALUES (?)");
  stmt.run(word);
}

module.exports = {
  getOrSetEncryptor,
  setChannelDestinations,
  getChannelDestination,
  setConfigurationTimer,
  getConfigurationTimer,
  setMessageBlocker,
  getMessageBlocker,
  getBanList,
  deleteMessageBlocker,
  deleteAllSlowdowns,
  addMessageAndGetNumber,
  getMessageByNumber,
  getMessageUrlByNumber,
  updateMessageWithUrl,
  setMessageAsDeleted,
  getAnonIdFromMsgId,
  insertMsgMap,
  getSlurs,
  insertSlur,
};

// Initial setup
function initializeTables() {
  // Encryption storage for persistency of IDs
  let stmt = db.prepare("CREATE TABLE IF NOT EXISTS encryptor (ivValue TEXT)");
  stmt.run();

  // anon_id to msg_id table
  stmt = db.prepare(
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

  // The code that created the messageCounter table if it didn't already exist was deleted

  // Message number, content, and url
  stmt = db.prepare(
    "CREATE TABLE IF NOT EXISTS messages (number INTEGER PRIMARY KEY, " +
      "message_content TEXT NOT NULL, message_url TEXT, is_deleted INTEGER)"
  );
  stmt.run();
  // Table for hate speech filter
  stmt = db.prepare("CREATE TABLE IF NOT EXISTS slurs (word TEXT NOT NULL)");
  stmt.run();
}

initializeTables();
