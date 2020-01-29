const express = require('express');
const simpleJwtSessionAuth = require('./simpleJwtSessionAuth');
const getUser = require('./getUser');
const key = require('./key');

const app = express();

app.use(simpleJwtSessionAuth({
    getUserFn: getUser,
    tokenKey: key.tokenKey,
}));

app.get('/app', (req, res) => {
    res.send('<html><body><h1>Hello World!</h1></body></html>');
});

app.get('/', (req, res) => {
    res.redirect('/app');
});

app.listen(8080 || process.env.PORT, () => {
    console.log('Listening on port 8080...');
});
