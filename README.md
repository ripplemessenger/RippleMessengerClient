# RippleMessengerClient
 
## Run
1. install nodejs
2. clone the code
3. run
```
npm install
npm run tauri dev
```

## Build
```
npm install
npm run tauri build
```

## Donate
rBoy4AAAAA9qxv7WANSdP5j5y59NP6soJS



## **公告**（**Bulletin**）功能

数据格式如下：
```
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
      "items": { "type": "string" }
    },

    "Quote": {
      "type": "array",
      "minItems": 1,
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
```
数据格式说明如下：
- ObjectType、Sequence、PreHash、Timestamp、PublicKey、Signature等6个属性为基础数据属性，具体作用如下：
  - **ObjectType**用于指明数据的类型；
  - **Sequence**用于说明本条数据是该账号（PublicKey）发布的该类型（ObjectType）数据的序号，从1开始记录，多一条数据加1，这样该账号该类型数据逻辑上就是一条数据链；**PreHash**用于说明该条数据前一条数据的Hash，第一条数据的PreHash为固定值44F8764BCACFF5424D4044B784549A1B，这样配合Sequence属性该账号该类型数据就是一条不可篡改的数据链；
  - **Timestamp**用于说明该条数据的生成时间，且这个生成时间应晚于该条数据所引用的生成时间；
  - **PublicKey**用于说明该条数据的**发布账号**；**Signature**用于签名该条数据，保证数据的完整性、不可伪造（配合**PublicKey**）、不可抵赖（配合**PublicKey**）。

- Content、Tag、Quote、File等4个属性为公告数据的具体属性，作用如下：
  - **Content**用于指明公告数据的内容，需要个人来填写；
  - **Tag**用于指明公告数据的标签，需要个人来填写，后期可供系统来帮助个人进行查询检索；
  - **Quote**用于指明该公告数据引用（或者回复）的其他公告信息（发布账号、序号、hash），从而实现单条数据链与其他数据链的关联，公告数据的跨链互动；
  - **File**用于指明该公告数据发布的文件信息（文件名、大小、hash），公告数据本身不传输文件，但提供了文件hash，可供系统实现文件传输功能。

任何个人或系统在存储一条**公告**前，均至少需要做以下校验：
- 校验数据签名，确认数据完整性、发布账号；
- 校验当前数据链最后一条数据的序号为 **Sequence**-1，确认数据链的下一个序号为 **Sequence**；
- 校验前一条（ **Sequence**-1）数据的Hash是否为**PreHash**，确认可以将该条数据从尾部插入数据链。
