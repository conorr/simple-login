const debug = require('debug')('simple-login:server');
const express = require('express');
const simpleLogin = require('./simpleLogin');
const getUser = require('./getUser');
const key = require('./key');

const app = express();

app.use(simpleLogin({
    getUserFn: getUser,
    tokenKey: key.tokenKey,
}));

app.get('/', (req, res) => {
    res.send('<html><body><h1>Hello World!</h1></body></html>');
});

app.listen(8080 || process.env.PORT, () => {
    debug('Listening on port 8080...');
});
