const channels = {
    ANONCHANNEL: 'anonChannel',
    ANONLOGS: 'anonLogChannel',
    DEEPTALKS: 'deepTalksChannel'
};

const blockReason = {
    SLOWMODE: 'slowmode',
    SPAM: 'spamprotection',
    TEMPBAN: 'tempban',
    PERMBAN: 'permban'
};

const permissions = {
    ROLES: ['admin', 'moderator']
};

Object.freeze(channels);
Object.freeze(permissions);

module.exports = {
    channels,
    permissions,
    blockReason
}