import { getDB } from './core'

export const api = {
  async getAllContacts() {
    const dbInstance = await getDB()
    return await dbInstance.select('SELECT * FROM contacts ORDER BY updated_at DESC')
  },

  async getContactByAddress(address) {
    const dbInstance = await getDB()
    const contacts = await dbInstance.select(
      'SELECT * FROM contacts WHERE address = $1 LIMIT 1',
      [address]
    )
    return contacts.length > 0 ? contacts[0] : null
  },

  async addContact(address, nickname, timestamp) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO contacts (address, nickname, updated_at) VALUES ($1, $2, $3)',
      [address, nickname, timestamp]
    )
    return true
  },

  async updateContactNickname(address, nickname, timestamp) {
    const db = await getDB()
    await db.execute(
      'UPDATE contacts SET nickname = $1, updated_at = $2 WHERE address = $3',
      [nickname, timestamp, address]
    )
    return true
  },

  async deleteContactByAddress(address) {
    const db = await getDB()
    await db.execute('DELETE FROM contacts WHERE address = $1', [address])
    return true
  },
}
