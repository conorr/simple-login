const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

const SESSION_COOKIE_KEY = 'SESSIONID';

function authenticateRoutes(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

function comparePassword(candidatePassword, password) {
    return new Promise((resolve) => {
        bcrypt.compare(candidatePassword, password, (err, isMatch) => {
            if (err) {
                console.log(err);
                resolve(false);
            } else {
                resolve(isMatch);
            }
        });
    });
}

function simpleJwtSessionAuth(config) {
    const { getUserFn, tokenKey, userModelPrimaryKey } = config;

    const app = express();

    function getUserFromToken(req, res, next) {
        try {
            const token = req.cookies[SESSION_COOKIE_KEY];
            jwt.verify(token, tokenKey, (err, payload) => {
                if (payload) {
                    const user = getUserFn(payload[userModelPrimaryKey]);
                    req.user = user;
                    next();
                } else {
                    next();
                }
            });
        } catch (e) {
            next();
        }
    }

    app.use(cookieParser());
    app.use(express.urlencoded({ extended: true }));
    app.use(getUserFromToken);
    app.use('/app', authenticateRoutes);

    app.get('/', (req, res) => {
        res.redirect('/app');
    });

    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, '/views/login.html'));
    });

    app.get('/logout', (req, res) => {
        res.clearCookie(SESSION_COOKIE_KEY);
        res.redirect('/login');
    });

    app.get('/app', (req, res) => {
        res.send('<html><body><h1>Hello World!</h1></body></html>');
    });

    app.post('/signin', (req, res) => {
        const user = getUserFn(req.body[userModelPrimaryKey]);

        if (!user) {
            res.status(400).json({
                message: 'Invalid Password/Username',
            });
            return;
        }

        comparePassword(req.body.password, user.password).then((isMatch) => {
            if (isMatch) {
                const token = jwt.sign({
                    [userModelPrimaryKey]: user[userModelPrimaryKey],
                }, tokenKey);
                res.cookie(SESSION_COOKIE_KEY, token, { httpOnly: true, secure: false });
                res.redirect('/app');
            } else {
                res.status(400).json({
                    message: 'Invalid Password/Username',
                });
            }
        });
    });

    return app;
}

module.exports = simpleJwtSessionAuth;
