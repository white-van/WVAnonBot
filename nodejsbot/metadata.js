const channels = {
    ANONCHANNEL: 'anonChannel',
    ANONLOGS: 'anonLogChannel',
    DEEPTALKS: 'deepTalksChannel'
};

const permissions = {
    ROLES: ['admin', 'moderator']
};

Object.freeze(channels);

module.exports = {
    channels,
    permissions
}