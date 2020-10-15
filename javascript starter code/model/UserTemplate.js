const mongo = require('mongoose');

const UserSchema = mongo.Schema({
    UserID:{
      type: String,
      required: 'All users need a UserID',
      unique: true
    },
    karma:{
      type: Number,
        default: 0
    },
    cooldownExpire:{
        type: Date
    }
});

const User = module.exports = mongo.model('User', UserSchema);
