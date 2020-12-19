const crypto = require('crypto');
const database = require('./database.js');

const algorithm = 'aes-256-ctr';
const secretKey = 'aDZE1wauzAFgKABfGq1Hkgf12poVmkj6';
var iv = null;

const encrypt = (text) => {
    if (!iv) {
        iv = database.getOrSetEncryptor(crypto.randomBytes(16));
    }

    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return encrypted.toString('hex');
};

module.exports = {
    encrypt
};