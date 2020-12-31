// One stop shop for everything timer related that will block a message. Slowmodes, spam, and blocks(temp and perm)
// If returns anything, will only return errors. Null otherwise
const database = require("./database.js");
const metadata = require("./metadata.js");
const encryptor = require("./encryptor.js");
const moment = require("moment");

function configureTimersAndCheckIfCanSend(msg) {
  const encryptedUser = encryptor.encrypt(msg.author.id);
  const record = database.getMessageBlocker(encryptedUser);
  const now = moment().utc();
  const error = {
    errorCode: -1,
    suffix: "",
  };

  if (record) {
    const dateOfUnblock = moment.utc(record.date, "DD MM YYYY HH:mm:ss");
    switch (record.reason) {
      case metadata.blockReason.TEMPBAN:
        if (now.isBefore(dateOfUnblock)) {
          error.errorCode = 3002;
          error.suffix =
            record.explanation +
            "\nBan lifts in " +
            dateOfUnblock.diff(now, "seconds") +
            " seconds";
        } else {
          database.deleteMessageBlocker(encryptedUser);
        }
        break;
      case metadata.blockReason.PERMBAN:
        error.errorCode = 3003;
        error.suffix = record.explanation;
        break;
      case metadata.blockReason.SLOWMODE:
        if (now.isBefore(dateOfUnblock)) {
          error.errorCode = 3000;
          error.suffix = dateOfUnblock.diff(now, "seconds") + " seconds";
        } else {
          database.deleteMessageBlocker(encryptedUser);
        }
        break;
      default:
        break;
    }
  }

  if (error.errorCode !== -1) {
    return error;
  }

  addSlowmodeTimer(msg, encryptedUser);
}

function addSlowmodeTimer(msg, encryptedUser) {
  const slowmodeTimer = database.getConfigurationTimer(
    metadata.configuration.SLOWMODE
  );
  if (slowmodeTimer === 0) {
    return;
  }

  let slowModeDate = moment().utc();
  slowModeDate = moment(slowModeDate).add(slowmodeTimer, "s");

  database.setMessageBlocker(
    encryptedUser,
    metadata.blockReason.SLOWMODE,
    "",
    slowModeDate.format("DD MM YYYY HH:mm:ss")
  );
}

module.exports = {
  configureTimersAndCheckIfCanSend,
};
