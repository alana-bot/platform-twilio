"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Promise = require("bluebird");
var bodyParser = require("body-parser");
var Express = require("express");
var _ = require("lodash");
var uuid = require("uuid");
var request = require("request-promise");
var Twilio = (function () {
    function Twilio(theBot, fromNumber, accountSid, accountToken, portOrApp, route) {
        if (portOrApp === void 0) { portOrApp = 3000; }
        if (route === void 0) { route = '/webhook'; }
        this.server = null;
        this.fromNumber = null;
        this.accountSid = null;
        this.accountToken = null;
        this.bot = theBot;
        this.bot.addPlatform(this);
        this.fromNumber = fromNumber;
        this.accountSid = accountSid;
        this.accountToken = accountToken;
        this.route = route;
        if (_.isNumber(portOrApp)) {
            this.port = portOrApp;
            this.expressApp = Express();
            this.expressApp.use(bodyParser.json());
            this.expressApp.use(bodyParser.urlencoded({ extended: true }));
        }
        else {
            this.expressApp = portOrApp;
        }
        this.expressApp.post(this.route, this.postHandler.bind(this));
        return this;
    }
    Twilio.prototype.postHandler = function (req, res, next, args) {
        var _this = this;
        if (args === void 0) { args = {}; }
        res.send();
        var incoming = req.body;
        var messages = Twilio.mapExternalToInternal(req.body);
        var user = {
            id: incoming.From,
            platform: 'Twilio',
            _platform: this,
        };
        Promise.mapSeries(messages, function (message) {
            return _this.processMessage(user, message, args);
        });
    };
    Twilio.prototype.processMessage = function (user, message, args) {
        this.bot.processMessage(user, message);
    };
    Twilio.prototype.start = function () {
        var _this = this;
        this.server = this.expressApp.listen(this.port, function () {
            if (_this.bot.debugOn) {
                console.log("Twilio platform listening at http://localhost:" + _this.port + _this.route);
            }
        });
        return Promise.resolve(this);
    };
    Twilio.prototype.stop = function () {
        var _this = this;
        this.server.close(function () {
            if (_this.bot.debugOn) {
                console.log('Twilio platform stopped');
            }
        });
        this.server = null;
        return Promise.resolve(this);
    };
    Twilio.prototype.send = function (user, message) {
        var _this = this;
        var twilioMessage = Twilio.mapInternalToExternal(message);
        twilioMessage.To = user.id;
        twilioMessage.From = this.fromNumber;
        if (twilioMessage === null) {
            return Promise.resolve(this);
        }
        return this.sendToTwilio(twilioMessage, this.accountSid, this.accountToken)
            .then(function () { return _this; });
    };
    Twilio.prototype.sendToTwilio = function (message, accountSid, token) {
        return Promise.resolve(request({
            uri: "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages",
            method: 'POST',
            form: message,
            auth: {
                user: accountSid,
                password: token,
            },
        }))
            .catch(function (err) {
            console.error(err);
        });
    };
    return Twilio;
}());
Twilio.mapInternalToExternal = function (message) {
    var twilioMessage = {};
    switch (message.type) {
        case 'image':
            twilioMessage.MediaUrl = message.url;
            break;
        case 'text':
            twilioMessage.Body = message.text;
            break;
        default:
            return null;
    }
    return twilioMessage;
};
Twilio.mapExternalToInternal = function (message) {
    var messages = [];
    if (parseInt(message.NumMedia, 10) > 0) {
        var attachements = [];
        for (var i = 0; i < parseInt(message.NumMedia, 10); i++) {
            if (message["MediaContentType" + i] === 'image/png' ||
                message["MediaContentType" + i] === 'image/jpeg') {
                attachements.push(message["MediaUrl" + i]);
            }
        }
        messages = messages.concat(attachements.map(function (url) {
            var imageMessage = {
                type: 'image',
                url: url,
                id: uuid.v1(),
                conversation_id: message.MessageSid,
            };
            return imageMessage;
        }));
    }
    if (message.Body !== null) {
        var textMessage = {
            type: 'text',
            text: message.Body,
            id: uuid.v1(),
            conversation_id: message.MessageSid,
        };
        messages.push(textMessage);
    }
    if (messages.length === 0) {
        return null;
    }
    return messages;
};
exports.default = Twilio;
