import { ActionCode, ObjectType, MessageObjectType } from './MessengerConst'

// Action>>>declare
// URL for server declare
const DeclareSchema = {
  "type": "object",
  "required": ["Action", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 5,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.Declare },
    "URL": { "type": "string" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// ***file***
const FileRequestSchema = {
  "type": "object",
  "required": ["Action", "FileType", "Hash", "Nonce", "ChunkCursor", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 9,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.FileRequest },
    "FileType": { "type": "number" },
    "To": { "type": "string" },
    "Hash": { "type": "string" },
    "Nonce": { "type": "number" },
    "ChunkCursor": { "type": "number" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// ***avatar***
const AvatarRequestSchema = {
  "type": "object",
  "required": ["Action", "List", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 5,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.AvatarRequest },
    "List": {
      "type": "array",
      "minItems": 1,
      "maxItems": 64,
      "items": {
        "type": "object",
        "required": ["Address", "SignedAt"],
        "maxProperties": 2,
        "properties": {
          "Address": { "type": "string" },
          "SignedAt": { "type": "number" }
        }
      }
    },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

const AvatarSchema = {
  "type": "object",
  "required": ["ObjectType", "Hash", "Size", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 9,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.Avatar },
    "Hash": { "type": "string" },
    "Size": { "type": "number" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

const AvatarListSchema = {
  "type": "object",
  "required": ["ObjectType", "List"],
  "maxProperties": 2,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.AvatarList },
    "List": {
      "type": "array",
      "minItems": 1,
      "maxItems": 64,
      "items": {
        "type": "object",
        "required": ["ObjectType", "Hash", "Size", "Timestamp", "PublicKey", "Signature"],
        "maxProperties": 6,
        "properties": {
          "ObjectType": { "type": "number", "const": ObjectType.Avatar },
          "Hash": { "type": "string" },
          "Size": { "type": "number" },
          "Timestamp": { "type": "number" },
          "PublicKey": { "type": "string" },
          "Signature": { "type": "string" }
        }
      }
    }
  }
}

// ***bulletin***
// Object>>>Bulletin
const BulletinSchema = {
  "type": "object",
  "required": ["ObjectType", "Sequence", "PreHash", "Content", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 10,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.Bulletin },
    "Sequence": { "type": "number" },
    "PreHash": { "type": "string" },
    "Content": { "type": "string" },
    "Tag": {
      "type": "array",
      "minItems": 1,
      // "maxItems": 8,
      "items": { "type": "string" }
    },
    "Quote": {
      "type": "array",
      "minItems": 1,
      // "maxItems": 8,
      "items": {
        "type": "object",
        "required": ["Address", "Sequence", "Hash"],
        "properties": {
          "Address": { "type": "string" },
          "Sequence": { "type": "number" },
          "Hash": { "type": "string" }
        }
      }
    },
    "File": {
      "type": "array",
      "minItems": 1,
      // "maxItems": 8,
      "items": {
        "type": "object",
        "required": ["Name", "Ext", "Size", "Hash"],
        "properties": {
          "Name": { "type": "string" },
          "Ext": { "type": "string" },
          "Size": { "type": "number" },
          "Hash": { "type": "string" }
        }
      }
    },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Action>>>
// Client <=> Server
const BulletinRequestSchema = {
  "type": "object",
  "properties": {
    "Action": { "type": "number", "const": ActionCode.BulletinRequest },
    "Hash": { "type": "string" },
    "Address": { "type": "string" },
    "Sequence": { "type": "number" },
    "To": { "type": "string" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  },
  "allOf": [
    { "required": ["Action", "To", "Timestamp", "PublicKey", "Signature"] },
    {
      "oneOf": [
        { "required": ["Hash"] },
        { "required": ["Address", "Sequence"] }
      ]
    }
  ],
  "additionalProperties": false
}

// Action>>>
// Client => Server
const BulletinSubscribeSchema = {
  "type": "object",
  "required": ["Action", "List", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 5,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.BulletinSubscribe },
    "List": {
      "type": "array",
      "minItems": 0,
      "maxItems": 64,
      "items": { "type": "string" }
    },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Action>>>
// Client => Server
const BulletinRandomRequestSchema = {
  "type": "object",
  "required": ["Action", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 4,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.BulletinRandomRequest },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Action>>>
// Client => Server
// BulletinCount DESC
const BulletinAddressRequestSchema = {
  "type": "object",
  "required": ["Action", "Page", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 6,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.BulletinAddressRequest },
    "Page": { "type": "number" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Object>>>
// Server => Client
const BulletinAddressListSchema = {
  "type": "object",
  "required": ["ObjectType", "Page", "TotalPage", "List"],
  "maxProperties": 4,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.BulletinAddressList },
    "Page": { "type": "number" },
    "TotalPage": { "type": "number" },
    "List": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["Address", "Count"],
        "maxProperties": 2,
        "properties": {
          "Address": { "type": "string" },
          "Count": { "type": "number" }
        }
      }
    }
  }
}

// Action>>>
// Client => Server
const ReplyBulletinRequestSchema = {
  "type": "object",
  "required": ["Action", "Hash", "Page", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 6,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.ReplyBulletinRequest },
    "Hash": { "type": "string" },
    "Page": { "type": "number" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Object>>>
// Server => Client
// Timestamp ASC
const ReplyBulletinListSchema = {
  "type": "object",
  "required": ["ObjectType", "Hash", "Page", "TotalPage", "List"],
  "maxProperties": 5,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.ReplyBulletinList },
    "Hash": { "type": "string" },
    "Page": { "type": "number" },
    "TotalPage": { "type": "number" },
    "List": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["ObjectType", "Sequence", "PreHash", "Content", "Timestamp", "PublicKey", "Signature"],
        "maxProperties": 10,
        "properties": {
          "ObjectType": { "type": "number", "const": ObjectType.Bulletin },
          "Sequence": { "type": "number" },
          "PreHash": { "type": "string" },
          "Content": { "type": "string" },
          "Tag": {
            "type": "array",
            "minItems": 1,
            // "maxItems": 8,
            "items": { "type": "string" }
          },
          "Quote": {
            "type": "array",
            "minItems": 1,
            // "maxItems": 8,
            "items": {
              "type": "object",
              "required": ["Address", "Sequence", "Hash"],
              "properties": {
                "Address": { "type": "string" },
                "Sequence": { "type": "number" },
                "Hash": { "type": "string" }
              }
            }
          },
          "File": {
            "type": "array",
            "minItems": 1,
            // "maxItems": 8,
            "items": {
              "type": "object",
              "required": ["Name", "Ext", "Size", "Hash"],
              "properties": {
                "Name": { "type": "string" },
                "Ext": { "type": "string" },
                "Size": { "type": "number" },
                "Hash": { "type": "string" }
              }
            }
          },
          "Timestamp": { "type": "number" },
          "PublicKey": { "type": "string" },
          "Signature": { "type": "string" }
        }
      }
    }
  }
}

// Action>>>
// Client => Server
const TagBulletinRequestSchema = {
  "type": "object",
  "required": ["Action", "Tag", "Page", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 6,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.TagBulletinRequest },
    "Tag": {
      "type": "array",
      "minItems": 1,
      // "maxItems": 8,
      "items": { "type": "string" }
    },
    "Page": { "type": "number" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Object>>>
// Server => Client
// Timestamp DESC
const TagBulletinListSchema = {
  "type": "object",
  "required": ["ObjectType", "Tag", "Page", "TotalPage", "List"],
  "maxProperties": 5,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.TagBulletinList },
    "Tag": {
      "type": "array",
      "minItems": 1,
      // "maxItems": 8,
      "items": { "type": "string" }
    },
    "Page": { "type": "number" },
    "TotalPage": { "type": "number" },
    "List": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["ObjectType", "Sequence", "PreHash", "Content", "Timestamp", "PublicKey", "Signature"],
        "maxProperties": 10,
        "properties": {
          "ObjectType": { "type": "number", "const": ObjectType.Bulletin },
          "Sequence": { "type": "number" },
          "PreHash": { "type": "string" },
          "Content": { "type": "string" },
          "Tag": {
            "type": "array",
            "minItems": 1,
            // "maxItems": 8,
            "items": { "type": "string" }
          },
          "Quote": {
            "type": "array",
            "minItems": 1,
            // "maxItems": 8,
            "items": {
              "type": "object",
              "required": ["Address", "Sequence", "Hash"],
              "properties": {
                "Address": { "type": "string" },
                "Sequence": { "type": "number" },
                "Hash": { "type": "string" }
              }
            }
          },
          "File": {
            "type": "array",
            "minItems": 1,
            // "maxItems": 8,
            "items": {
              "type": "object",
              "required": ["Name", "Ext", "Size", "Hash"],
              "properties": {
                "Name": { "type": "string" },
                "Ext": { "type": "string" },
                "Size": { "type": "number" },
                "Hash": { "type": "string" }
              }
            }
          },
          "Timestamp": { "type": "number" },
          "PublicKey": { "type": "string" },
          "Signature": { "type": "string" }
        }
      }
    }
  }
}

// ***chat***
// Object>>>Chat Handshake
const ECDHHandshakeSchema = {
  "type": "object",
  "required": ["ObjectType", "Partition", "Sequence", "Self", "Pair", "To", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 9,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.ECDH },
    "Partition": { "type": "number" },
    "Sequence": { "type": "number" },
    "Self": { "type": "string" },
    "Pair": { "type": "string" },
    "To": { "type": "string" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// ***private***
// Object>>>PrivateMessage
const PrivateMessageSchema = {
  "type": "object",
  "required": ["ObjectType", "Sequence", "PreHash", "Content", "To", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 9,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.PrivateMessage },
    "Sequence": { "type": "number" },
    "PreHash": { "type": "string" },
    "Confirm": {
      "type": "object",
      "required": ["Sequence", "Hash"],
      "maxProperties": 2,
      "properties": {
        "Sequence": { "type": "number" },
        "Hash": { "type": "string" }
      }
    },
    "Content": { "type": "string" },
    "To": { "type": "string" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Action>>>
const PrivateMessageSyncSchema = {
  "type": "object",
  "required": ["Action", "To", "PairSequence", "SelfSequence", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 7,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.PrivateMessageSync },
    "To": { "type": "string" },
    "PairSequence": { "type": "number" },
    "SelfSequence": { "type": "number" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// ***group***
// Action>>>
const GroupSyncSchema = {
  "type": "object",
  "required": ["Action", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 4,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.GroupSync },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

const GroupMessageSyncSchema = {
  "type": "object",
  "required": ["Action", "Hash", "Address", "Sequence", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 8,
  "properties": {
    "Action": { "type": "number", "const": ActionCode.GroupMessageSync },
    "Hash": { "type": "string" },
    "Address": { "type": "string" },
    "Sequence": { "type": "number" },
    "To": { "type": "string" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Object>>>
const GroupListSchema = {
  "type": "object",
  "required": ["ObjectType", "List"],
  "maxProperties": 2,
  "properties": {
    "ObjectType": {
      "type": "number",
      "const": ObjectType.GroupList
    },
    "List": {
      "type": "array",
      "minItems": 1,
      "maxItems": 64,
      "items": {
        "oneOf": [
          {
            "type": "object",
            "required": ["ObjectType", "Hash", "Name", "Member", "Timestamp", "PublicKey", "Signature"],
            "maxProperties": 7,
            "properties": {
              "ObjectType": {
                "type": "number",
                "const": ObjectType.GroupCreate
              },
              "Hash": { "type": "string" },
              "Name": { "type": "string" },
              "Member": {
                "type": "array",
                "minItems": 2,
                "maxItems": 16,
                "items": { "type": "string" }
              },
              "Timestamp": { "type": "number" },
              "PublicKey": { "type": "string" },
              "Signature": { "type": "string" }
            }
          },
          {
            "type": "object",
            "required": ["ObjectType", "Hash", "Timestamp", "PublicKey", "Signature"],
            "maxProperties": 5,
            "properties": {
              "ObjectType": { "type": "number", "const": ObjectType.GroupDelete },
              "Hash": { "type": "string" },
              "Timestamp": { "type": "number" },
              "PublicKey": { "type": "string" },
              "Signature": { "type": "string" }
            }
          }
        ]
      }
    },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Object>>>GroupCreate
const GroupCreateSchema = {
  "type": "object",
  "required": ["ObjectType", "Hash", "Name", "Member", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 7,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.GroupCreate },
    "Hash": { "type": "string" },
    "Name": { "type": "string" },
    "Member": {
      "type": "array",
      "minItems": 2,
      "maxItems": 16,
      "items": { "type": "string" }
    },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Object>>>GroupDelete
const GroupDeleteSchema = {
  "type": "object",
  "required": ["ObjectType", "Hash", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 5,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.GroupDelete },
    "Hash": { "type": "string" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Object>>>GroupMessage
const GroupMessageSchema = {
  "type": "object",
  "required": ["ObjectType", "GroupHash", "Sequence", "PreHash", "Content", "To", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 10,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.GroupMessage },
    "GroupHash": { "type": "string" },
    "Sequence": { "type": "number" },
    "PreHash": { "type": "string" },
    "Confirm": {
      "type": "object",
      "required": ["Address", "Sequence", "Hash"],
      "maxProperties": 2,
      "properties": {
        "Address": { "type": "string" },
        "Sequence": { "type": "number" },
        "Hash": { "type": "string" }
      }
    },
    "Content": { "type": "string" },
    "To": { "type": "string" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "Signature": { "type": "string" }
  }
}

// Object>>>GroupMessageList
const GroupMessageListSchema = {
  "type": "object",
  "required": ["ObjectType", "GroupHash", "To", "Timestamp", "PublicKey", "List"],
  "maxProperties": 6,
  "properties": {
    "ObjectType": { "type": "number", "const": ObjectType.GroupMessageList },
    "GroupHash": { "type": "string" },
    "To": { "type": "string" },
    "Timestamp": { "type": "number" },
    "PublicKey": { "type": "string" },
    "List": {
      "type": "array",
      "minItems": 1,
      "maxItems": 64,
      "items": {
        "type": "object",
        "required": ["Sequence", "PreHash", "Content", "Timestamp", "PublicKey", "Signature"],
        "maxProperties": 7,
        "properties": {
          "Sequence": { "type": "number" },
          "PreHash": { "type": "string" },
          "Confirm": {
            "type": "object",
            "required": ["Address", "Sequence", "Hash"],
            "maxProperties": 3,
            "properties": {
              "Address": { "type": "string" },
              "Sequence": { "type": "number" },
              "Hash": { "type": "string" }
            }
          },
          "Content": { "type": "string" },
          "Timestamp": { "type": "number" },
          "PublicKey": { "type": "string" },
          "Signature": { "type": "string" }
        }
      }
    }
  }
}

// Message Object
const MessageObjectBulletinSchema = {
  "type": "object",
  "required": ["ObjectType", "Address", "Sequence", "Hash"],
  "maxProperties": 4,
  "properties": {
    "ObjectType": { "type": "number", "const": MessageObjectType.Bulletin },
    "Address": { "type": "string" },
    "Sequence": { "type": "number" },
    "Hash": { "type": "string" }
  }
}

const MessageObjectPrivateChatFileSchema = {
  "type": "object",
  "required": ["ObjectType", "Name", "Ext", "Size", "Hash"],
  "maxProperties": 7,
  "properties": {
    "ObjectType": { "type": "number", "const": MessageObjectType.PrivateChatFile },
    "Name": { "type": "string" },
    "Ext": { "type": "string" },
    "Size": { "type": "number" },
    "Hash": { "type": "string" }
  }
}

const MessageObjectGroupChatFileSchema = {
  "type": "object",
  "required": ["ObjectType", "Name", "Ext", "Size", "Hash"],
  "maxProperties": 7,
  "properties": {
    "ObjectType": { "type": "number", "const": MessageObjectType.GroupChatFile },
    "Name": { "type": "string" },
    "Ext": { "type": "string" },
    "Size": { "type": "number" },
    "Hash": { "type": "string" }
  }
}

// Asset
const SendSchema = {
  "type": "object",
  "required": ["ObjectType", "Sequence", "PreHash", "To", "Issuer", "Subject", "Amount", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 10,
  "properties": {
    "ObjectType": {
      "type": "number",
      "const": ObjectType.Send
    },
    "Sequence": {
      "type": "number"
    },
    "PreHash": {
      "type": "string"
    },
    "To": {
      "type": "string"
    },
    "Issuer": {
      "type": "string"
    },
    "Subject": {
      "type": "string"
    },
    "Amount": {
      "type": "string"
    },
    "Timestamp": {
      "type": "number"
    },
    "PublicKey": {
      "type": "string"
    },
    "Signature": {
      "type": "string"
    }
  }
}

const ReceiveSchema = {
  "type": "object",
  "required": ["ObjectType", "Sequence", "PreHash", "SendHash", "SendAddress", "SendSequence", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 9,
  "properties": {
    "ObjectType": {
      "type": "number",
      "const": ObjectType.Receive
    },
    "Sequence": {
      "type": "number"
    },
    "PreHash": {
      "type": "string"
    },
    "SendHash": {
      "type": "string"
    },
    "SendAddress": {
      "type": "string"
    },
    "SendSequence": {
      "type": "number"
    },
    "Timestamp": {
      "type": "number"
    },
    "PublicKey": {
      "type": "string"
    },
    "Signature": {
      "type": "string"
    }
  }
}

const OfferCreateSchema = {
  "type": "object",
  "required": ["ObjectType", "Sequence", "PreHash", "PaySubject", "PayIssuer", "PayAmount", "GetSubject", "GetIssuer", "GetAmount", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 14,
  "properties": {
    "ObjectType": {
      "type": "number",
      "const": ObjectType.OfferCreate
    },
    "Sequence": {
      "type": "number"
    },
    "PreHash": {
      "type": "string"
    },
    "PaySubject": {
      "type": "string"
    },
    "PayIssuer": {
      "type": "string"
    },
    "PayAmount": {
      "type": "number"
    },
    "GetSubject": {
      "type": "string"
    },
    "GetIssuer": {
      "type": "string"
    },
    "GetAmount": {
      "type": "number"
    },
    "To": {
      "type": "string"
    },
    "Shard": {
      "type": "number"
    },
    "Timestamp": {
      "type": "number"
    },
    "PublicKey": {
      "type": "string"
    },
    "Signature": {
      "type": "string"
    }
  }
}

const OfferCancelSchema = {
  "type": "object",
  "required": ["ObjectType", "Sequence", "PreHash", "OfferCreateHash", "OfferCreateSequence", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 8,
  "properties": {
    "ObjectType": {
      "type": "number",
      "const": ObjectType.OfferCreate
    },
    "Sequence": {
      "type": "number"
    },
    "PreHash": {
      "type": "string"
    },
    "OfferCreateHash": {
      "type": "string"
    },
    "OfferCreateSequence": {
      "type": "number"
    },
    "Timestamp": {
      "type": "number"
    },
    "PublicKey": {
      "type": "string"
    },
    "Signature": {
      "type": "string"
    }
  }
}

const OfferTakeSchema = {
  "type": "object",
  "required": ["ObjectType", "Sequence", "PreHash", "OfferCreateHash", "OfferCreateAddress", "OfferCreateSequence", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 10,
  "properties": {
    "ObjectType": {
      "type": "number",
      "const": ObjectType.OfferTake
    },
    "Sequence": {
      "type": "number"
    },
    "PreHash": {
      "type": "string"
    },
    "OfferCreateHash": {
      "type": "string"
    },
    "OfferCreateAddress": {
      "type": "string"
    },
    "OfferCreateSequence": {
      "type": "number"
    },
    "ShardCount": {
      "type": "number"
    },
    "Timestamp": {
      "type": "number"
    },
    "PublicKey": {
      "type": "string"
    },
    "Signature": {
      "type": "string"
    }
  }
}

const OfferTakeConfirmSchema = {
  "type": "object",
  "required": ["ObjectType", "Sequence", "PreHash", "OfferTakeHash", "OfferTakeAddress", "OfferTakeSequence", "Timestamp", "PublicKey", "Signature"],
  "maxProperties": 10,
  "properties": {
    "ObjectType": {
      "type": "number",
      "const": ObjectType.OfferTakeConfirm
    },
    "Sequence": {
      "type": "number"
    },
    "PreHash": {
      "type": "string"
    },
    "OfferTakeHash": {
      "type": "string"
    },
    "OfferTakeAddress": {
      "type": "string"
    },
    "OfferTakeSequence": {
      "type": "number"
    },
    "ShardCount": {
      "type": "number"
    },
    "Timestamp": {
      "type": "number"
    },
    "PublicKey": {
      "type": "string"
    },
    "Signature": {
      "type": "string"
    }
  }
}

export {
  DeclareSchema,
  FileRequestSchema,

  // Avatar
  AvatarRequestSchema,
  AvatarSchema,
  AvatarListSchema,

  // Bulletin
  BulletinSchema,
  BulletinSubscribeSchema,
  BulletinRandomRequestSchema,
  BulletinRequestSchema,
  BulletinAddressRequestSchema,
  BulletinAddressListSchema,
  ReplyBulletinRequestSchema,
  ReplyBulletinListSchema,
  TagBulletinRequestSchema,
  TagBulletinListSchema,

  // Chat Handshake
  ECDHHandshakeSchema,

  // Private
  PrivateMessageSchema,
  PrivateMessageSyncSchema,

  // Group
  GroupSyncSchema,
  GroupMessageSyncSchema,
  GroupListSchema,
  GroupCreateSchema,
  GroupDeleteSchema,
  GroupMessageSchema,
  GroupMessageListSchema,

  // Message Object
  MessageObjectBulletinSchema,
  MessageObjectPrivateChatFileSchema,
  MessageObjectGroupChatFileSchema,
  
  // Asset
  SendSchema,
  ReceiveSchema,
  OfferCreateSchema,
  OfferCancelSchema,
  OfferTakeSchema,
  OfferTakeConfirmSchema
}