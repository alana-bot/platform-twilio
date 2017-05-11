export interface Request {
    MessageSid: string;
    AccountSid: string;
    MessagingServiceSid: string;
    From: string;
    To: string;
    Body: string;
    FromCity?: string;
    FromState?: string;
    FromZip?: string;
    FromCountry?: string;
    ToCity?: string;
    ToState?: string;
    ToZip?: string;
    ToCountry?: string;
    NumMedia: string;
    MediaContentType0?: string;
    MediaUrl0?: string;
    MediaContentType1?: string;
    MediaUrl1?: string;
    MediaContentType2?: string;
    MediaUrl2?: string;
    MediaContentType3?: string;
    MediaUrl3?: string;
}
