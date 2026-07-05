export { initDB, getDB } from './core'

import { api as serversAPI } from './servers'
import { api as contactsAPI } from './contacts'
import { api as accountsAPI } from './accounts'
import { api as followsAPI } from './follows'
import { api as friendsAPI } from './friends'
import { api as avatarsAPI } from './avatars'
import { api as bulletinsAPI } from './bulletins'
import { api as filesAPI } from './files'
import { api as handshakesAPI } from './handshakes'
import { api as privateMessagesAPI } from './privateMessages'
import { api as groupsAPI } from './groups'

export { serversAPI, contactsAPI, accountsAPI, followsAPI, friendsAPI, avatarsAPI, bulletinsAPI, filesAPI, handshakesAPI, privateMessagesAPI, groupsAPI }

export const dbAPI = {
  ...serversAPI,
  ...contactsAPI,
  ...accountsAPI,
  ...followsAPI,
  ...friendsAPI,
  ...avatarsAPI,
  ...bulletinsAPI,
  ...filesAPI,
  ...handshakesAPI,
  ...privateMessagesAPI,
  ...groupsAPI,
}
