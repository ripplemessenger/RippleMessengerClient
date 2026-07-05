import { getDB } from './core'

export const api = {
  async getAllAccounts() {
    const dbInstance = await getDB()
    return await dbInstance.select('SELECT * FROM accounts ORDER BY updated_at DESC')
  },

  async getAccountByAddress(address) {
    const dbInstance = await getDB()
    const accounts = await dbInstance.select(
      'SELECT * FROM accounts WHERE address = $1 LIMIT 1',
      [address]
    )
    return accounts.length > 0 ? accounts[0] : null
  },

  async addAccount(address, salt, cipher_data, timestamp) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO accounts (address, salt, cipher_data, updated_at) VALUES ($1, $2, $3, $4)',
      [address, salt, cipher_data, timestamp]
    )
  },

  async updateAccount(address, salt, cipher_data, timestamp) {
    const db = await getDB()
    await db.execute(
      'UPDATE accounts SET salt = $1, cipher_data = $2, updated_at = $3 WHERE address = $4',
      [salt, cipher_data, timestamp, address]
    )
  },

  async deleteAccountByAddress(address) {
    const db = await getDB()
    await db.execute('DELETE FROM accounts WHERE address = $1', [address])
  },

  async updateAccountUpdatedAt(address, timestamp) {
    const db = await getDB()
    await db.execute(
      'UPDATE accounts SET updated_at = $1 WHERE address = $2',
      [timestamp, address]
    )
  },
}
