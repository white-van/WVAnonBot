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

function isBanned(encrypedUser) {
  const stmt = db.prepare(
    "SELECT * FROM messageBlocker WHERE encryptedUserId = ?"
  );
  return typeof stmt.get(encrypedUser) !== "undefined";
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

  stmt = db.prepare("INSERT INTO messages VALUES (?, ?, ?, ?, ?)");
  stmt.run(messageNumber, msg, "", "0", "0");

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
  stmt.run("1", num);
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
  const stmt = db.prepare("SELECT * FROM messages WHERE number = ?");
  const result = stmt.get(num);

  if (typeof result === "undefined") {
    return false;
  }

  // Return false if message has been deleted
  if (result.is_deleted === 1) {
    return false;
  }

  return true;
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

function getDmChannel(anonId) {
  const stmt = db.prepare("SELECT channelId FROM dmChannels WHERE anonId = ?");
  const result = stmt.get(anonId);
  if (!result) {
    return;
  }
  return result.channelId;
}

function setDmChannel(anonId, channelId) {
  // Update if exists, else create
  let stmt = db.prepare("SELECT channelId FROM dmChannels WHERE anonId = ?");
  if (stmt.get(anonId)) {
    stmt = db.prepare("UPDATE dmChannels SET channelId = ? WHERE anonId = ?");
    stmt.run(channelId, anonId);
    return;
  }
  stmt = db.prepare("INSERT INTO dmChannels VALUES (?, ?)");
  stmt.run(channelId, anonId);
}

function addWarn(msgId) {
  if (!isWarnable(msgId)) {
    return -1;
  }

  const anonId = getAnonIdFromMsgId(msgId);
  let stmt = db.prepare("SELECT * FROM warns WHERE anon_id = ?");
  const result = stmt.get(anonId);

  if (typeof result === "undefined") {
    stmt = db.prepare("INSERT INTO warns VALUES(?, ?, ?)");
    stmt.run(anonId, "1", "1");

    stmt = db.prepare("UPDATE messages SET received_warn = 1 WHERE number = ?");
    stmt.run(msgId);

    return;
  }

  stmt = db.prepare(
    "UPDATE warns SET temp_count = temp_count + 1, " +
      "perm_count = perm_count + 1 WHERE anon_id = ?"
  );
  stmt.run(anonId);

  stmt = db.prepare("SELECT temp_count FROM warns WHERE anon_id = ?");
  const tempCount = stmt.get(anonId).temp_count;
  stmt = db.prepare("SELECT perm_count FROM warns WHERE anon_id = ?");
  const permCount = stmt.get(anonId).perm_count;

  stmt = db.prepare("UPDATE messages SET received_warn = 1 WHERE number = ?");
  stmt.run(msgId);

  if (permCount >= getPermbanWarnLimit()) {
    return metadata.blockReason.PERMBAN;
  }

  if (tempCount >= getTempbanWarnLimit()) {
    return metadata.blockReason.TEMPBAN;
  }

  return null;
}

function isWarnable(msgId) {
  const stmt = db.prepare("SELECT * FROM messages WHERE number = ?");
  const result = stmt.get(msgId);

  if (typeof result === "undefined") {
    return false;
  }

  if (result.received_warn === 1) {
    return false;
  }

  return true;
}

function getWarnCount(anonId, banType) {
  let stmt;
  if (banType === metadata.blockReason.TEMPBAN) {
    stmt = db.prepare("SELECT temp_count FROM warns WHERE anon_id = ?");
    return stmt.get(anonId).temp_count;
  } else if (banType === metadata.blockReason.PERMBAN) {
    stmt = db.prepare("SELECT perm_count FROM warns WHERE anon_id = ?");
    return stmt.get(anonId).perm_count;
  }

  return -1;
}

function clearWarnCount(anonId, banType) {
  let stmt;

  if (banType === metadata.blockReason.TEMPBAN) {
    stmt = db.prepare("UPDATE warns SET temp_count = 0 WHERE anon_id = ?");
    stmt.run(anonId);
  } else if (banType === metadata.blockReason.PERMBAN) {
    stmt = db.prepare(
      "UPDATE warns SET temp_count = 0, perm_count = 0 WHERE anon_id = ?"
    );
    stmt.run(anonId);
  }
}

function setWarnLimits(tempLimit, permLimit) {
  const stmt = db.prepare(
    "UPDATE warnSettings SET tempban_limit = ?, permban_limit = ? WHERE rownum = 1"
  );
  stmt.run(tempLimit, permLimit);
}

function setWarnTempbanDuration(duration) {
  const stmt = db.prepare(
    "UPDATE warnSettings SET tempban_duration = ? WHERE rownum = 1"
  );
  stmt.run(duration);
}

function getTempbanWarnLimit() {
  const stmt = db.prepare("SELECT * FROM warnSettings");
  return stmt.get().tempban_limit;
}

function getPermbanWarnLimit() {
  const stmt = db.prepare("SELECT * FROM warnSettings");
  return stmt.get().permban_limit;
}

function getWarnTempbanDuration() {
  const stmt = db.prepare("SELECT * FROM warnSettings");
  return stmt.get().tempban_duration;
}

function getWarnedUsersInfo() {
  const stmt = db.prepare("SELECT * FROM warns");
  return stmt.all();
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
  isBanned,
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
  getDmChannel,
  setDmChannel,
  addWarn,
  isWarnable,
  getWarnCount,
  clearWarnCount,
  setWarnLimits,
  setWarnTempbanDuration,
  getTempbanWarnLimit,
  getPermbanWarnLimit,
  getWarnTempbanDuration,
  getWarnedUsersInfo,
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
      "message_content TEXT NOT NULL, message_url TEXT, is_deleted INTEGER, received_warn INTEGER)"
  );
  stmt.run();
  try {
    stmt = db.prepare("ALTER TABLE messages ADD COLUMN received_warn INTEGER");
    stmt.run();
  } catch (e) {
    // Nothing to upgrade
  }
  // Table for hate speech filter
  stmt = db.prepare("CREATE TABLE IF NOT EXISTS slurs (word TEXT NOT NULL)");
  stmt.run();

  // Table to map dm channel id to anon id
  stmt = db.prepare(
    "CREATE TABLE IF NOT EXISTS dmChannels (channelId TEXT, anonId TEXT)"
  );
  stmt.run();

  // Table for warns
  stmt = db.prepare(
    "CREATE TABLE IF NOT EXISTS warns (anon_id TEXT NOT NULL, " +
      "temp_count INTEGER NOT NULL, perm_count INTEGER NOT NULL)"
  );
  stmt.run();

  // Table for warn settings variables
  stmt = db.prepare(
    "CREATE TABLE IF NOT EXISTS warnSettings (rownum INTEGER, " +
      "tempban_limit INTEGER, permban_limit INTEGER, tempban_duration INTEGER)"
  );
  stmt.run();

  // Initialize with -1's
  stmt = db.prepare("SELECT * FROM warnSettings");
  const result = stmt.get();

  if (typeof result === "undefined") {
    stmt = db.prepare("INSERT INTO warnSettings VALUES (1, -1, -1, -1)");
    stmt.run();
  }
}

initializeTables();
