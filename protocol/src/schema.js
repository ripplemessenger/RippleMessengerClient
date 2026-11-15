/**
 * @ripplemessenger/protocol - JSON Schemas
 *
 * Unified JSON schemas for RippleMessenger protocol validation.
 * Ported verbatim from RippleMessengerServer/msg_schema.js (v1.0, 1049 lines)
 * which is the most complete copy. Do NOT hand-edit one side only: this file
 * is the single source of truth after migration.
 *
 * Conventions preserved from the original:
 *  - `maxProperties` is used to reject unknown extra fields on most messages.
 *  - `additionalProperties: false` is used only where the original used it.
 *  - Bulletin item shape is shared via `BulletinItemProperties` spread, so
 *    Bulletin / BulletinListItem / Tag list / Random list items stay identical.
 *
 * @version 0.1.0
 */

import { ActionCode, ObjectType, MessageObjectType, MessageCode } from './constants.js';

// ============================================================================
// Declare
// ============================================================================

const DeclareSchema = {
  type: 'object',
  required: ['Action', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 5,
  properties: {
    Action: { type: 'number', const: ActionCode.Declare },
    URL: { type: 'string' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

// ============================================================================
// File
// ============================================================================

const FileRequestSchema = {
  type: 'object',
  properties: {
    Action: { type: 'number', const: ActionCode.FileRequest },
    FileType: { type: 'number' },
    To: { type: 'string' },
    GroupHash: { type: 'string' },
    Hash: { type: 'string' },
    Nonce: { type: 'number' },
    ChunkCursor: { type: 'number' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  },
  allOf: [
    {
      required: [
        'Action',
        'FileType',
        'Hash',
        'Nonce',
        'ChunkCursor',
        'Timestamp',
        'PublicKey',
        'Signature'
      ]
    },
    {
      oneOf: [
        {
          not: {
            anyOf: [{ required: ['To'] }, { required: ['GroupHash'] }]
          }
        },
        { required: ['To'] },
        { required: ['GroupHash'] }
      ]
    }
  ],
  additionalProperties: false
};

// ============================================================================
// Avatar
// ============================================================================

const AvatarRequestSchema = {
  type: 'object',
  required: ['Action', 'List', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 5,
  properties: {
    Action: { type: 'number', const: ActionCode.AvatarRequest },
    List: {
      type: 'array',
      minItems: 1,
      maxItems: 64,
      items: {
        type: 'object',
        required: ['Address', 'SignedAt'],
        maxProperties: 2,
        properties: {
          Address: { type: 'string' },
          SignedAt: { type: 'number' }
        }
      }
    },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const AvatarSchema = {
  type: 'object',
  required: ['ObjectType', 'Hash', 'Size', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 9,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.Avatar },
    Hash: { type: 'string' },
    Size: { type: 'number' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const AvatarListSchema = {
  type: 'object',
  required: ['ObjectType', 'List'],
  maxProperties: 2,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.AvatarList },
    List: {
      type: 'array',
      minItems: 1,
      maxItems: 64,
      items: {
        type: 'object',
        required: ['ObjectType', 'Hash', 'Size', 'Timestamp', 'PublicKey', 'Signature'],
        maxProperties: 6,
        properties: {
          ObjectType: { type: 'number', const: ObjectType.Avatar },
          Hash: { type: 'string' },
          Size: { type: 'number' },
          Timestamp: { type: 'number' },
          PublicKey: { type: 'string' },
          Signature: { type: 'string' }
        }
      }
    }
  }
};

// ============================================================================
// Bulletin
// ============================================================================

// Shared bulletin item shape — used by BulletinSchema, BulletinListItemSchema
// and every list that embeds a bulletin (Tag list, Random list).
const BulletinItemProperties = {
  required: [
    'ObjectType',
    'Sequence',
    'PreHash',
    'Content',
    'Timestamp',
    'PublicKey',
    'Signature'
  ],
  maxProperties: 10,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.Bulletin },
    Sequence: { type: 'number' },
    PreHash: { type: 'string' },
    Content: { type: 'string' },
    Tag: {
      type: 'array',
      minItems: 1,
      maxItems: 16,
      items: { type: 'string' }
    },
    Quote: {
      type: 'array',
      minItems: 1,
      maxItems: 16,
      items: {
        type: 'object',
        required: ['Address', 'Sequence', 'Hash'],
        properties: {
          Address: { type: 'string' },
          Sequence: { type: 'number' },
          Hash: { type: 'string' }
        }
      }
    },
    File: {
      type: 'array',
      minItems: 1,
      maxItems: 16,
      items: {
        type: 'object',
        required: ['Name', 'Ext', 'Size', 'Hash'],
        properties: {
          Name: { type: 'string' },
          Ext: { type: 'string' },
          Size: { type: 'number' },
          Hash: { type: 'string' }
        }
      }
    },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const BulletinSchema = {
  type: 'object',
  ...BulletinItemProperties
};

const BulletinListItemSchema = {
  type: 'object',
  ...BulletinItemProperties
};

const BulletinRequestSchema = {
  type: 'object',
  properties: {
    Action: { type: 'number', const: ActionCode.BulletinRequest },
    Hash: { type: 'string' },
    Address: { type: 'string' },
    Sequence: { type: 'number' },
    To: { type: 'string' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  },
  allOf: [
    { required: ['Action', 'To', 'Timestamp', 'PublicKey', 'Signature'] },
    {
      oneOf: [{ required: ['Hash'] }, { required: ['Address', 'Sequence'] }]
    }
  ],
  additionalProperties: false
};

const BulletinSubscribeSchema = {
  type: 'object',
  required: ['Action', 'List', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 5,
  properties: {
    Action: { type: 'number', const: ActionCode.BulletinSubscribe },
    List: {
      type: 'array',
      minItems: 0,
      maxItems: 64,
      items: { type: 'string' }
    },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const RandomBulletinRequestSchema = {
  type: 'object',
  required: ['Action', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 4,
  properties: {
    Action: { type: 'number', const: ActionCode.RandomBulletinRequest },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const ServerAddressRequestSchema = {
  type: 'object',
  required: ['Action', 'Page', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 6,
  properties: {
    Action: { type: 'number', const: ActionCode.ServerAddressRequest },
    Page: { type: 'number' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

/**
 * Address leaderboard ordered by bulletin count. Identical request shape to
 * ServerAddressRequest (403) — a distinct code so the two can diverge later —
 * and answered with the same ObjectType.ServerAddressList payload.
 */
const BulletinAddressListRequestSchema = {
  type: 'object',
  required: ['Action', 'Page', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 6,
  properties: {
    Action: { type: 'number', const: ActionCode.BulletinAddressListRequest },
    Page: { type: 'number' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const ServerAddressListSchema = {
  type: 'object',
  required: ['ObjectType', 'Page', 'TotalPage', 'List'],
  maxProperties: 4,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.ServerAddressList },
    Page: { type: 'number' },
    TotalPage: { type: 'number' },
    List: {
      type: 'array',
      items: {
        type: 'object',
        required: ['Address', 'Count'],
        maxProperties: 2,
        properties: {
          Address: { type: 'string' },
          Count: { type: 'number' }
        }
      }
    }
  }
};

const ReplyBulletinRequestSchema = {
  type: 'object',
  required: ['Action', 'Hash', 'Page', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 6,
  properties: {
    Action: { type: 'number', const: ActionCode.ReplyBulletinRequest },
    Hash: { type: 'string' },
    Page: { type: 'number' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const ReplyBulletinListSchema = {
  type: 'object',
  required: ['ObjectType', 'Hash', 'Page', 'TotalPage', 'List'],
  maxProperties: 5,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.ReplyBulletinList },
    Hash: { type: 'string' },
    Page: { type: 'number' },
    TotalPage: { type: 'number' },
    List: {
      type: 'array',
      items: BulletinListItemSchema
    }
  }
};

const TagBulletinRequestSchema = {
  type: 'object',
  required: ['Action', 'Tag', 'Page', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 6,
  properties: {
    Action: { type: 'number', const: ActionCode.TagBulletinRequest },
    Tag: {
      type: 'array',
      minItems: 1,
      maxItems: 16,
      items: { type: 'string' }
    },
    Page: { type: 'number' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const TagBulletinListSchema = {
  type: 'object',
  required: ['ObjectType', 'Tag', 'Page', 'TotalPage', 'List'],
  maxProperties: 5,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.TagBulletinList },
    Tag: {
      type: 'array',
      minItems: 1,
      maxItems: 16,
      items: { type: 'string' }
    },
    Page: { type: 'number' },
    TotalPage: { type: 'number' },
    List: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'ObjectType',
          'Sequence',
          'PreHash',
          'Content',
          'Timestamp',
          'PublicKey',
          'Signature'
        ],
        maxProperties: 10,
        properties: {
          ObjectType: { type: 'number', const: ObjectType.Bulletin },
          Sequence: { type: 'number' },
          PreHash: { type: 'string' },
          Content: { type: 'string' },
          Tag: {
            type: 'array',
            minItems: 1,
            maxItems: 16,
            items: { type: 'string' }
          },
          Quote: {
            type: 'array',
            minItems: 1,
            maxItems: 16,
            items: {
              type: 'object',
              required: ['Address', 'Sequence', 'Hash'],
              properties: {
                Address: { type: 'string' },
                Sequence: { type: 'number' },
                Hash: { type: 'string' }
              }
            }
          },
          File: {
            type: 'array',
            minItems: 1,
            maxItems: 16,
            items: {
              type: 'object',
              required: ['Name', 'Ext', 'Size', 'Hash'],
              properties: {
                Name: { type: 'string' },
                Ext: { type: 'string' },
                Size: { type: 'number' },
                Hash: { type: 'string' }
              }
            }
          },
          Timestamp: { type: 'number' },
          PublicKey: { type: 'string' },
          Signature: { type: 'string' }
        }
      }
    }
  }
};

const RandomBulletinListSchema = {
  type: 'object',
  required: ['ObjectType', 'List'],
  maxProperties: 2,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.RandomBulletinList },
    List: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'ObjectType',
          'Sequence',
          'PreHash',
          'Content',
          'Timestamp',
          'PublicKey',
          'Signature'
        ],
        maxProperties: 10,
        properties: {
          ObjectType: { type: 'number', const: ObjectType.Bulletin },
          Sequence: { type: 'number' },
          PreHash: { type: 'string' },
          Content: { type: 'string' },
          Tag: {
            type: 'array',
            minItems: 1,
            maxItems: 16,
            items: { type: 'string' }
          },
          Quote: {
            type: 'array',
            minItems: 1,
            maxItems: 16,
            items: {
              type: 'object',
              required: ['Address', 'Sequence', 'Hash'],
              properties: {
                Address: { type: 'string' },
                Sequence: { type: 'number' },
                Hash: { type: 'string' }
              }
            }
          },
          File: {
            type: 'array',
            minItems: 1,
            maxItems: 16,
            items: {
              type: 'object',
              required: ['Name', 'Ext', 'Size', 'Hash'],
              properties: {
                Name: { type: 'string' },
                Ext: { type: 'string' },
                Size: { type: 'number' },
                Hash: { type: 'string' }
              }
            }
          },
          Timestamp: { type: 'number' },
          PublicKey: { type: 'string' },
          Signature: { type: 'string' }
        }
      }
    }
  }
};

// ============================================================================
// ECDH handshake
// ============================================================================

const ECDHHandshakeSchema = {
  type: 'object',
  required: [
    'ObjectType',
    'Partition',
    'Sequence',
    'Self',
    'Pair',
    'To',
    'Timestamp',
    'PublicKey',
    'Signature'
  ],
  maxProperties: 9,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.ECDH },
    Partition: { type: 'number' },
    Sequence: { type: 'number' },
    Self: { type: 'string' },
    Pair: { type: 'string' },
    To: { type: 'string' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

// ============================================================================
// Private messages
// ============================================================================

const PrivateMessageSchema = {
  type: 'object',
  required: [
    'ObjectType',
    'Sequence',
    'PreHash',
    'Content',
    'To',
    'Timestamp',
    'PublicKey',
    'Signature'
  ],
  maxProperties: 9,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.PrivateMessage },
    Sequence: { type: 'number' },
    PreHash: { type: 'string' },
    Confirm: {
      type: 'object',
      required: ['Sequence', 'Hash'],
      maxProperties: 2,
      properties: {
        Sequence: { type: 'number' },
        Hash: { type: 'string' }
      }
    },
    Content: { type: 'string' },
    To: { type: 'string' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const PrivateMessageSyncSchema = {
  type: 'object',
  required: [
    'Action',
    'To',
    'PairSequence',
    'SelfSequence',
    'Timestamp',
    'PublicKey',
    'Signature'
  ],
  maxProperties: 7,
  properties: {
    Action: { type: 'number', const: ActionCode.PrivateMessageSync },
    To: { type: 'string' },
    PairSequence: { type: 'number' },
    SelfSequence: { type: 'number' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

// ============================================================================
// Group
// ============================================================================

const GroupSyncSchema = {
  type: 'object',
  required: ['Action', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 4,
  properties: {
    Action: { type: 'number', const: ActionCode.GroupSync },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const GroupMessageSyncSchema = {
  type: 'object',
  required: ['Action', 'Hash', 'Address', 'Sequence', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 8,
  properties: {
    Action: { type: 'number', const: ActionCode.GroupMessageSync },
    Hash: { type: 'string' },
    Address: { type: 'string' },
    Sequence: { type: 'number' },
    To: { type: 'string' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const GroupListSchema = {
  type: 'object',
  required: ['ObjectType', 'List'],
  maxProperties: 2,
  properties: {
    ObjectType: {
      type: 'number',
      const: ObjectType.GroupList
    },
    List: {
      type: 'array',
      minItems: 1,
      maxItems: 64,
      items: {
        oneOf: [
          {
            type: 'object',
            required: ['ObjectType', 'Hash', 'Name', 'Member', 'Timestamp', 'PublicKey', 'Signature'],
            maxProperties: 7,
            properties: {
              ObjectType: {
                type: 'number',
                const: ObjectType.GroupCreate
              },
              Hash: { type: 'string' },
              Name: { type: 'string' },
              Member: {
                type: 'array',
                minItems: 2,
                maxItems: 16,
                items: { type: 'string' }
              },
              Timestamp: { type: 'number' },
              PublicKey: { type: 'string' },
              Signature: { type: 'string' }
            }
          },
          {
            type: 'object',
            required: ['ObjectType', 'Hash', 'Timestamp', 'PublicKey', 'Signature'],
            maxProperties: 5,
            properties: {
              ObjectType: { type: 'number', const: ObjectType.GroupDelete },
              Hash: { type: 'string' },
              Timestamp: { type: 'number' },
              PublicKey: { type: 'string' },
              Signature: { type: 'string' }
            }
          }
        ]
      }
    },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const GroupCreateSchema = {
  type: 'object',
  required: ['ObjectType', 'Hash', 'Name', 'Member', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 7,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.GroupCreate },
    Hash: { type: 'string' },
    Name: { type: 'string' },
    Member: {
      type: 'array',
      minItems: 2,
      maxItems: 16,
      items: { type: 'string' }
    },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const GroupDeleteSchema = {
  type: 'object',
  required: ['ObjectType', 'Hash', 'Timestamp', 'PublicKey', 'Signature'],
  maxProperties: 5,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.GroupDelete },
    Hash: { type: 'string' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const GroupMessageSchema = {
  type: 'object',
  required: [
    'ObjectType',
    'GroupHash',
    'Sequence',
    'PreHash',
    'Content',
    'To',
    'Timestamp',
    'PublicKey',
    'Signature'
  ],
  maxProperties: 10,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.GroupMessage },
    GroupHash: { type: 'string' },
    Sequence: { type: 'number' },
    PreHash: { type: 'string' },
    Confirm: {
      type: 'object',
      required: ['Address', 'Sequence', 'Hash'],
      maxProperties: 3,
      properties: {
        Address: { type: 'string' },
        Sequence: { type: 'number' },
        Hash: { type: 'string' }
      }
    },
    Content: { type: 'string' },
    To: { type: 'string' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    Signature: { type: 'string' }
  }
};

const GroupMessageListSchema = {
  type: 'object',
  required: ['ObjectType', 'GroupHash', 'To', 'Timestamp', 'PublicKey', 'List'],
  maxProperties: 6,
  properties: {
    ObjectType: { type: 'number', const: ObjectType.GroupMessageList },
    GroupHash: { type: 'string' },
    To: { type: 'string' },
    Timestamp: { type: 'number' },
    PublicKey: { type: 'string' },
    List: {
      type: 'array',
      minItems: 1,
      maxItems: 64,
      items: {
        type: 'object',
        required: ['Sequence', 'PreHash', 'Content', 'Timestamp', 'PublicKey', 'Signature'],
        maxProperties: 7,
        properties: {
          Sequence: { type: 'number' },
          PreHash: { type: 'string' },
          Confirm: {
            type: 'object',
            required: ['Address', 'Sequence', 'Hash'],
            maxProperties: 3,
            properties: {
              Address: { type: 'string' },
              Sequence: { type: 'number' },
              Hash: { type: 'string' }
            }
          },
          Content: { type: 'string' },
          Timestamp: { type: 'number' },
          PublicKey: { type: 'string' },
          Signature: { type: 'string' }
        }
      }
    }
  }
};

// ============================================================================
// Message objects (embedded references inside a chat message)
// ============================================================================

const MessageObjectBulletinSchema = {
  type: 'object',
  required: ['ObjectType', 'Address', 'Sequence', 'Hash'],
  maxProperties: 4,
  properties: {
    ObjectType: { type: 'number', const: MessageObjectType.Bulletin },
    Address: { type: 'string' },
    Sequence: { type: 'number' },
    Hash: { type: 'string' }
  }
};

const MessageObjectPrivateChatFileSchema = {
  type: 'object',
  required: ['ObjectType', 'Name', 'Ext', 'Size', 'Hash'],
  maxProperties: 7,
  properties: {
    ObjectType: { type: 'number', const: MessageObjectType.PrivateChatFile },
    Name: { type: 'string' },
    Ext: { type: 'string' },
    Size: { type: 'number' },
    Hash: { type: 'string' }
  }
};

const MessageObjectGroupChatFileSchema = {
  type: 'object',
  required: ['ObjectType', 'Name', 'Ext', 'Size', 'Hash'],
  maxProperties: 7,
  properties: {
    ObjectType: { type: 'number', const: MessageObjectType.GroupChatFile },
    Name: { type: 'string' },
    Ext: { type: 'string' },
    Size: { type: 'number' },
    Hash: { type: 'string' }
  }
};

// ============================================================================
// Control plane (unsigned server -> client / client -> server)
// ============================================================================

// Generic error notification: { ActionCode: 800, MessageCode: 701-704, ErrorMessage }
const ServerNotifyErrorSchema = {
  type: 'object',
  required: ['ActionCode', 'MessageCode', 'ErrorMessage'],
  maxProperties: 3,
  properties: {
    ActionCode: { type: 'number', const: ActionCode.ServerNotify },
    MessageCode: {
      type: 'number',
      enum: [
        MessageCode.JsonSchemaInvalid,
        MessageCode.SignatureInvalid,
        MessageCode.TimestampInvalid,
        MessageCode.AddressMismatch
      ]
    },
    ErrorMessage: { type: 'string' }
  }
};

// Generic notification: { ActionCode: 800, MessageCode: 710-712, ...optional fields }
const ServerNotifyInfoSchema = {
  type: 'object',
  required: ['ActionCode', 'MessageCode'],
  properties: {
    ActionCode: { type: 'number', const: ActionCode.ServerNotify },
    MessageCode: {
      type: 'number',
      enum: [
        MessageCode.KickedByNewConn,
        MessageCode.ServerShutdown,
        MessageCode.SyncComplete
      ]
    },
    ErrorMessage: { type: 'string' }
  },
  additionalProperties: false
};

// Cache success confirmation: { ActionCode: 800, MessageCode: 720/721/723 }
const ServerNotifyCacheSchema = {
  type: 'object',
  required: ['ActionCode', 'MessageCode'],
  maxProperties: 2,
  properties: {
    ActionCode: { type: 'number', const: ActionCode.ServerNotify },
    MessageCode: {
      type: 'number',
      enum: [
        MessageCode.BulletinCached,
        MessageCode.PrivateMsgCached,
        MessageCode.HandshakeCached
      ]
    }
  }
};

// File transfer progress: { ActionCode: 800, MessageCode: 730-732, Hash, ProgressInfo }
const ServerNotifyFileProgressSchema = {
  type: 'object',
  required: ['ActionCode', 'MessageCode'],
  properties: {
    ActionCode: { type: 'number', const: ActionCode.ServerNotify },
    MessageCode: {
      type: 'number',
      enum: [
        MessageCode.FileChunkReceived,
        MessageCode.FileTransferComplete,
        MessageCode.FileTransferFailed
      ]
    },
    Hash: { type: 'string' },
    ProgressInfo: {
      type: 'object',
      properties: {
        ReceivedBytes: { type: 'number' },
        TotalBytes: { type: 'number' }
      }
    }
  }
};

// Client ACK: { ActionCode: 810, AckFor }
const ClientAckSchema = {
  type: 'object',
  required: ['ActionCode', 'AckFor'],
  maxProperties: 2,
  properties: {
    ActionCode: { type: 'number', const: ActionCode.ClientAck },
    AckFor: { type: 'number' }
  }
};

// ============================================================================
// Dispatch tables
// ============================================================================

/**
 * ActionCode -> schema. Every ActionCode the server accepts must appear here,
 * otherwise the message is rejected as "unknown Action code".
 */
const ActionSchemas = {
  [ActionCode.Declare]: DeclareSchema,
  [ActionCode.FileRequest]: FileRequestSchema,
  [ActionCode.AvatarRequest]: AvatarRequestSchema,
  [ActionCode.BulletinRequest]: BulletinRequestSchema,
  [ActionCode.BulletinSubscribe]: BulletinSubscribeSchema,
  [ActionCode.RandomBulletinRequest]: RandomBulletinRequestSchema,
  [ActionCode.ServerAddressRequest]: ServerAddressRequestSchema,
  [ActionCode.ReplyBulletinRequest]: ReplyBulletinRequestSchema,
  [ActionCode.TagBulletinRequest]: TagBulletinRequestSchema,
  [ActionCode.BulletinAddressListRequest]: BulletinAddressListRequestSchema,
  [ActionCode.PrivateMessageSync]: PrivateMessageSyncSchema,
  [ActionCode.GroupSync]: GroupSyncSchema,
  [ActionCode.GroupMessageSync]: GroupMessageSyncSchema,
  [ActionCode.ClientAck]: ClientAckSchema
};

/**
 * MessageCode -> schema for ServerNotify (ActionCode 800) messages.
 * ServerNotify schemas all share ActionCode 800 but differ by MessageCode,
 * so dispatch is on MessageCode.
 */
const ServerNotifySchemas = {
  [MessageCode.JsonSchemaInvalid]: ServerNotifyErrorSchema,
  [MessageCode.SignatureInvalid]: ServerNotifyErrorSchema,
  [MessageCode.TimestampInvalid]: ServerNotifyErrorSchema,
  [MessageCode.AddressMismatch]: ServerNotifyErrorSchema,
  [MessageCode.KickedByNewConn]: ServerNotifyInfoSchema,
  [MessageCode.ServerShutdown]: ServerNotifyInfoSchema,
  [MessageCode.SyncComplete]: ServerNotifyInfoSchema,
  [MessageCode.BulletinCached]: ServerNotifyCacheSchema,
  [MessageCode.PrivateMsgCached]: ServerNotifyCacheSchema,
  [MessageCode.HandshakeCached]: ServerNotifyCacheSchema,
  [MessageCode.FileChunkReceived]: ServerNotifyFileProgressSchema,
  [MessageCode.FileTransferComplete]: ServerNotifyFileProgressSchema,
  [MessageCode.FileTransferFailed]: ServerNotifyFileProgressSchema
};

/**
 * ObjectType -> schema. Some ObjectTypes share a schema (GroupList items reuse
 * GroupCreate/GroupDelete; GroupMessageList has no top-level ObjectType entry
 * on the server because it is relayed rather than validated as an object).
 */
const ObjectSchemas = {
  [ObjectType.ECDH]: ECDHHandshakeSchema,
  [ObjectType.Avatar]: AvatarSchema,
  [ObjectType.AvatarList]: AvatarListSchema,
  [ObjectType.Bulletin]: BulletinSchema,
  [ObjectType.ServerAddressList]: ServerAddressListSchema,
  [ObjectType.ReplyBulletinList]: ReplyBulletinListSchema,
  [ObjectType.TagBulletinList]: TagBulletinListSchema,
  [ObjectType.RandomBulletinList]: RandomBulletinListSchema,
  [ObjectType.PrivateMessage]: PrivateMessageSchema,
  [ObjectType.GroupCreate]: GroupCreateSchema,
  [ObjectType.GroupDelete]: GroupDeleteSchema,
  [ObjectType.GroupList]: GroupListSchema,
  [ObjectType.GroupMessage]: GroupMessageSchema,
  [ObjectType.GroupMessageList]: GroupMessageListSchema
};

/**
 * MessageObjectType -> schema (embedded objects, not top-level routed).
 */
const MessageObjectSchemas = {
  [MessageObjectType.Bulletin]: MessageObjectBulletinSchema,
  [MessageObjectType.PrivateChatFile]: MessageObjectPrivateChatFileSchema,
  [MessageObjectType.GroupChatFile]: MessageObjectGroupChatFileSchema
};

export {
  // declare
  DeclareSchema,
  // file
  FileRequestSchema,
  // avatar
  AvatarRequestSchema,
  AvatarSchema,
  AvatarListSchema,
  // bulletin
  BulletinSchema,
  BulletinListItemSchema,
  BulletinRequestSchema,
  BulletinSubscribeSchema,
  RandomBulletinRequestSchema,
  ServerAddressRequestSchema,
  ServerAddressListSchema,
  BulletinAddressListRequestSchema,
  ReplyBulletinRequestSchema,
  ReplyBulletinListSchema,
  TagBulletinRequestSchema,
  TagBulletinListSchema,
  RandomBulletinListSchema,
  // chat handshake
  ECDHHandshakeSchema,
  // private
  PrivateMessageSchema,
  PrivateMessageSyncSchema,
  // group
  GroupSyncSchema,
  GroupMessageSyncSchema,
  GroupListSchema,
  GroupCreateSchema,
  GroupDeleteSchema,
  GroupMessageSchema,
  GroupMessageListSchema,
  // message objects
  MessageObjectBulletinSchema,
  MessageObjectPrivateChatFileSchema,
  MessageObjectGroupChatFileSchema,
  // control plane
  ServerNotifyErrorSchema,
  ServerNotifyInfoSchema,
  ServerNotifyCacheSchema,
  ServerNotifyFileProgressSchema,
  ClientAckSchema,
  // dispatch tables
  ActionSchemas,
  ObjectSchemas,
  ServerNotifySchemas,
  MessageObjectSchemas
};
