/**
 * @ripplemessenger/protocol — constants typings
 *
 * Every literal here is copied from the runtime values in `src/constants.js`
 * (verified against RippleMessengerServer/msg_const.js). If you change a code
 * there, change it here too — `scripts/schema-parity.mjs` catches drift.
 */

export declare const Epoch: number;
export declare const GenesisAddress: string;
export declare const GenesisHash: string;
export declare const MasterAddress: string;
export declare const PostAddress: string;
export declare const ListItemMax: number;
export declare const GroupMemberMin: number;
export declare const GroupMemberMax: number;


export declare const ActionCode: {
  readonly Declare: 100;
  readonly AvatarRequest: 200;
  readonly FileRequest: 300;
  readonly BulletinRequest: 400;
  readonly BulletinSubscribe: 401;
  readonly RandomBulletinRequest: 402;
  readonly ServerAddressRequest: 403;
  readonly ReplyBulletinRequest: 404;
  readonly TagBulletinRequest: 405;
  readonly BulletinAddressListRequest: 406;
  readonly PrivateMessageSync: 501;
  readonly GroupSync: 600;
  readonly GroupMessageSync: 601;
  readonly ServerNotify: 800;
  readonly ServerNotifyAckReq: 801;
  readonly ClientAck: 810;
};
export type ActionCodeValue = (typeof ActionCode)[keyof typeof ActionCode];

export declare const ObjectType: {
  readonly Nothing: 100;
  readonly ECDH: 101;
  readonly Avatar: 200;
  readonly AvatarList: 201;
  readonly Bulletin: 400;
  readonly ServerAddressList: 403;
  readonly ReplyBulletinList: 404;
  readonly TagBulletinList: 405;
  readonly RandomBulletinList: 406;
  readonly PrivateMessage: 500;
  readonly GroupCreate: 600;
  readonly GroupDelete: 601;
  readonly GroupList: 602;
  readonly GroupMessage: 603;
  readonly GroupMessageList: 604;
};
export type ObjectTypeValue = (typeof ObjectType)[keyof typeof ObjectType];

export declare const FileRequestType: {
  readonly Avatar: 100;
  readonly File: 101;
  readonly PrivateChatFile: 102;
  readonly GroupChatFile: 103;
};
export type FileRequestTypeValue = (typeof FileRequestType)[keyof typeof FileRequestType];

export declare const MessageObjectType: {
  readonly NotObject: 100;
  readonly Bulletin: 101;
  readonly PrivateChatFile: 102;
  readonly GroupChatFile: 103;
};
export type MessageObjectTypeValue = (typeof MessageObjectType)[keyof typeof MessageObjectType];

export declare const MessageCode: {
  readonly JsonSchemaInvalid: 701;
  readonly SignatureInvalid: 702;
  readonly TimestampInvalid: 703;
  readonly AddressMismatch: 704;
  readonly KickedByNewConn: 710;
  readonly ServerShutdown: 711;
  readonly SyncComplete: 712;
  readonly NotAllowed: 713;
  readonly BulletinCached: 720;
  readonly PrivateMsgCached: 721;
  readonly HandshakeCached: 723;
  readonly FileChunkReceived: 730;
  readonly FileTransferComplete: 731;
  readonly FileTransferFailed: 732;
};
export type MessageCodeValue = (typeof MessageCode)[keyof typeof MessageCode];

export declare const ControlActionCode: {
  readonly ServerNotify: 800;
  readonly ServerNotifyAckReq: 801;
  readonly ClientAck: 810;
};
export type ControlActionCodeValue = (typeof ControlActionCode)[keyof typeof ControlActionCode];

export declare const ErrorMessageMap: Record<number, string>;
