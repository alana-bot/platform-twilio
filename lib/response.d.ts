export declare type Response = FromPhone & (SendingText | SendingImage);
export interface Base {
    To: string;
    StatusCallback?: string;
    ApplicationSid?: string;
    MaxPrice?: string;
    ProvideFeedback?: string;
    ValidityPeriod?: string;
}
export interface FromPhone extends Base {
    From: string;
}
export interface FromService extends Base {
    MessagingServiceSid: string;
}
export interface SendingText {
    Body: string;
}
export interface SendingImage {
    MediaUrl: string;
}
