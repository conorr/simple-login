const fs = require('fs');

function getUser(userId) {
    const usersJson = fs.readFileSync('users.json');
    const users = JSON.parse(usersJson);
    const user = users[userId];
    return user;
}

module.exports = getUser;
