// Protocol constants.
//
// The canonical values live in @ripplemessenger/protocol. This file is a thin
// re-export so existing `import { ActionCode } from "./MessengerConst"` call
// sites keep working unchanged.
//
// Verified identical to the old local copy by
// packages/protocol/scripts/schema-parity.mjs (8 constant tables, 43 assertions).
export {
  Epoch,
  GenesisAddress,
  GenesisHash,
  MasterAddress,
  PostAddress,
  ListItemMax,
  GroupMemberMin,
  GroupMemberMax,
  ActionCode,
  ObjectType,
  FileRequestType,
  MessageObjectType,
  MessageCode,
  ControlActionCode,
  ErrorMessageMap
} from '@ripplemessenger/protocol'

// Client-side deployment config (not a protocol constant)
export { DefaultServer } from './AppConst'
