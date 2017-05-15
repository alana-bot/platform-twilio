import * as Promise from 'bluebird';
import * as bodyParser from 'body-parser';
import * as Express from 'express';
import * as http from 'http';
import * as _ from 'lodash';
import * as util from 'util';
import * as uuid from 'uuid';
import * as request from 'request-promise';

import { Message, IntentGenerator, Intent } from '@alana/core/lib/types/bot';
import * as Bot from '@alana/core/lib/types/bot';
import { GreetingMessage, IncomingMessage, OutgoingMessage, TextMessage, ImageMessage } from '@alana/core/lib/types/message';
import { PlatformMiddleware } from '@alana/core/lib/types/platform';
import { BasicUser, User } from '@alana/core/lib/types/user';

import Alana from '@alana/core';

import { Request } from './request';
import { Response } from './response';
export { Request, Response };

export default class Twilio implements PlatformMiddleware  {
  protected bot: Alana;
  private port: number;
  private route: string;
  private expressApp: Express.Express;
  private server: http.Server = null;
  private fromNumber: string = null;
  private accountSid: string = null;
  private accountToken: string = null;

  constructor(theBot: Alana, fromNumber: string, accountSid: string, accountToken: string, portOrApp: number | Express.Express = 3000, route: string = '/webhook') {
    this.bot = theBot;
    this.bot.addPlatform(this);
    this.fromNumber = fromNumber;
    this.accountSid = accountSid;
    this.accountToken = accountToken;
    this.route = route;
    if (_.isNumber(portOrApp)) {
      this.port = portOrApp as number;
      this.expressApp = Express();
      this.expressApp.use(bodyParser.json());
      this.expressApp.use(bodyParser.urlencoded({ extended: true }));
    } else {
      this.expressApp = portOrApp  as Express.Express;
    }
    this.expressApp.post(this.route, this.postHandler.bind(this));
    return this;
  }

  public postHandler(req: Express.Request, res: Express.Response, next: Express.NextFunction, args: any = {}) {
    res.send();
    const incoming: Request = req.body;
    const messages = Twilio.mapExternalToInternal(req.body);
    const user: BasicUser  = {
      id: incoming.From,
      platform: 'Twilio',
      _platform: this,
    };
    Promise.mapSeries(messages, (message) => {
      return this.processMessage(user, message, args);
    });
  }

  public processMessage(user: BasicUser, message: IncomingMessage, args?: any) {
    this.bot.processMessage(user, message);
  }

  public start() {
    this.server = this.expressApp.listen(this.port, () => {
      if (this.bot.debugOn) {
        console.log(`Twilio platform listening at http://localhost:${this.port}${this.route}`);
      }
    });
    return Promise.resolve(this);
  }

  public stop() {
    this.server.close(() => {
      if (this.bot.debugOn) {
        console.log('Twilio platform stopped');
      }
    });
    this.server = null;
    return Promise.resolve(this);
  }

  public send<U extends User>(user: U, message: OutgoingMessage): Promise<this> {
    const twilioMessage: Response = Twilio.mapInternalToExternal(message);
    if (twilioMessage === null) {
      if (this.bot.debugOn) {
        console.error(`Can't send message type "${message.type}" through twilio`);
      }
      return Promise.resolve(this);
    }

    twilioMessage.To = user.id;
    twilioMessage.From = this.fromNumber;
    return this.sendToTwilio(twilioMessage, this.accountSid, this.accountToken)
      .then(() => this);
  }

  public sendToTwilio(message: Response, accountSid: string, token: string): Promise<any> {
    return Promise.resolve(request({
      uri: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages`,
      method: 'POST',
      form: message,
      auth: {
        user: accountSid,
        password: token,
      },
    }))
    .catch((err) => {
      console.error(err);
    });
  }

  static mapInternalToExternal = (message: OutgoingMessage): Response => {
    const twilioMessage: any = {} as Response;
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
  }


  static mapExternalToInternal = (message: Request): (TextMessage | ImageMessage)[] => {
    let messages: (TextMessage | ImageMessage)[] = [];
    if (parseInt(message.NumMedia, 10) > 0) {
      const attachements = [];
      for (let i = 0; i < parseInt(message.NumMedia, 10); i++) {
        if (message[`MediaContentType${i}`] === 'image/png' ||
            message[`MediaContentType${i}`] === 'image/jpeg') {
              attachements.push(message[`MediaUrl${i}`]);
        }
      }
      messages = messages.concat(attachements.map((url: string) => {
        const imageMessage: ImageMessage = {
          type: 'image',
          url: url,
          id: uuid.v1(),
          conversation_id: message.MessageSid,
        };
        return imageMessage;
      }));
    }
    if (message.Body !== null) {
      const textMessage: TextMessage = {
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
  }
}
