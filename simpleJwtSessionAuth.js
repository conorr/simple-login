const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

const SESSION_COOKIE_KEY = 'SESSIONID';

const SPECIAL_AUTH_PATHS = ['/login', '/signin', '/logout'];

function isSpecialAuthPath(reqPath) {
    return SPECIAL_AUTH_PATHS.includes(reqPath);
}

function authenticateRoutes(req, res, next) {
    if (isSpecialAuthPath(req.path) || req.user) {
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
    const defaultConfig = {
        userModelPrimaryKey: 'userId',
        route: '/',
    };

    const mergedConfig = Object.assign(defaultConfig, config);
    const {
        getUserFn,
        tokenKey,
        route,
        userModelPrimaryKey,
    } = mergedConfig;

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
    app.use(route, authenticateRoutes);

    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, '/views/login.html'));
    });

    app.get('/logout', (req, res) => {
        res.clearCookie(SESSION_COOKIE_KEY);
        res.redirect('/login');
    });

    app.get('/signin', (req, res) => res.redirect('/login'));

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

    console.log(`[simple-jwt-session-auth]: Registration complete; mounted at ${route}`);
    console.log(`[simple-jwt-session-auth]: Special auth paths: ${JSON.stringify(SPECIAL_AUTH_PATHS)}`);

    return app;
}

module.exports = simpleJwtSessionAuth;
