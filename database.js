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

function getAndIncrementMessageCounter() {
  let stmt = db.prepare("SELECT count FROM messageCounter");
  const result = stmt.get();
  if (!result) {
    stmt = db.prepare("INSERT INTO messageCounter VALUES (1)");
    stmt.run();
    return 0;
  }
  stmt = db.prepare("UPDATE messageCounter SET count = count + 1");
  stmt.run();
  return result.count;
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
  getAnonIdFromMsgId,
  insertMsgMap,
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

  // Message counter
  stmt = db.prepare(
    "CREATE TABLE IF NOT EXISTS messageCounter (count INTEGER)"
  );
  stmt.run();
}

initializeTables();
