const express = require('express');
const debug = require('debug')('simple-login');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

const SESSION_COOKIE_KEY = 'SESSIONID';

const SPECIAL_AUTH_PATHS = ['/login', '/submitLogin', '/logout'];

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
    return new Promise((resolve, reject) => {
        bcrypt.compare(candidatePassword, password, (err, isMatch) => {
            if (err) {
                reject(err);
            } else {
                resolve(isMatch);
            }
        });
    });
}

function simpleLogin(config) {
    const defaultConfig = {
        userModelPrimaryKey: 'userId',
        postLoginRedirectPath: '/';
        route: '/',
    };

    const mergedConfig = Object.assign(defaultConfig, config);
    const {
        getUserFn,
        route,
        postLoginRedirectPath,
        userModelPrimaryKey,
    } = mergedConfig;

    const app = express();

    app.use(cookieParser());
    app.use(express.urlencoded({ extended: true }));

    function getUserFromCookie(req, res, next) {
        try {
            const sessionCookie = req.cookies[SESSION_COOKIE_KEY];
            if (sessionCookie) {
                const session = JSON.parse(sessionCookie);
                const user = getUserFn(session[userModelPrimaryKey]);
                req.user = user;
            }
            next();
        } catch (e) {
            next();
        }
    }

    app.use(getUserFromCookie);

    app.use(route, authenticateRoutes);

    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, '/views/login.html'));
    });

    app.get('/logout', (req, res) => {
        res.clearCookie(SESSION_COOKIE_KEY);
        res.redirect('/login');
    });

    app.get('/submitLogin', (req, res) => res.redirect('/login'));

    app.post('/submitLogin', (req, res) => {
        const user = getUserFn(req.body[userModelPrimaryKey]);

        if (!user) {
            res.status(400).json({
                message: 'Invalid Password/Username',
            });
            return;
        }

        comparePassword(req.body.password, user.password)
            .then((isMatch) => {
                if (isMatch) {
                    const sessionJson = JSON.stringify({
                        [userModelPrimaryKey]: user[userModelPrimaryKey],
                    });
                    res.cookie(SESSION_COOKIE_KEY, sessionJson, { httpOnly: true, secure: false });
                    res.redirect(postLoginRedirectPath);
                } else {
                    res.status(400).json({
                        message: 'Invalid Password/Username',
                    });
                }
            })
            .catch((err) => { throw err; });
    });

    debug(`Mounted at ${route}`);
    debug(`Special auth paths: ${JSON.stringify(SPECIAL_AUTH_PATHS)}`);

    return app;
}

module.exports = simpleLogin;
