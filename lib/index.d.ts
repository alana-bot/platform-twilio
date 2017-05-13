/// <reference types="express" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
import * as Express from 'express';
import { Message } from '@alana/core/lib/types/bot';
import { IncomingMessage, OutgoingMessage, TextMessage, ImageMessage } from '@alana/core/lib/types/message';
import { PlatformMiddleware } from '@alana/core/lib/types/platform';
import { BasicUser, User } from '@alana/core/lib/types/user';
import Alana from '@alana/core';
import { Request } from './request';
import { Response } from './response';
export { Request, Response };
export default class Twilio implements PlatformMiddleware {
    protected bot: Alana;
    private port;
    private route;
    private expressApp;
    private server;
    private fromNumber;
    private accountSid;
    private accountToken;
    constructor(theBot: Alana, fromNumber: string, accountSid: string, accountToken: string, portOrApp?: number | Express.Express, route?: string);
    postHandler(req: Express.Request, res: Express.Response, next: Express.NextFunction, args?: any): void;
    processMessage(user: BasicUser, message: IncomingMessage, args?: any): void;
    start(): Promise<this>;
    stop(): Promise<this>;
    send<U extends User>(user: U, message: OutgoingMessage): Promise<this>;
    sendToTwilio(message: Response, accountSid: string, token: string): Promise<any>;
    static mapInternalToExternal: (message: Message.OutgoingMessage) => Response;
    static mapExternalToInternal: (message: Request) => (TextMessage | ImageMessage)[];
}
