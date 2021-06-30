const channels = {
  ANONCHANNEL: "anonChannel",
  ANONLOGS: "anonLogChannel",
  DEEPTALKS: "deepTalksChannel",
  CONFESSIONS: "confessionsChannel",
};

const blockReason = {
  SLOWMODE: "slowmode",
  SPAM: "spamprotection",
  TEMPBAN: "tempban",
  PERMBAN: "permban",
  RULES: "RULES",
};

const configuration = {
  SLOWMODE: "slowmode",
  SPAMPROC: "spamprotection",
};

const permissions = {
  CONFIGURE: ["admin", "moderator"],
  DEEPTALKS: ["admin", "moderator", "lets-talk"],
};

Object.freeze(channels);
Object.freeze(permissions);
Object.freeze(configuration);

module.exports = {
  channels,
  permissions,
  blockReason,
  configuration,
};
