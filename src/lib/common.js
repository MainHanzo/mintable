const fs = require('fs')
const _ = require('lodash')
const path = require('path')

const CONFIG_FILE = path.join(__dirname, '../..', 'mintable.config.json')

console.log(`Using config ${CONFIG_FILE}...`)

const DEFAULT_CONFIG = {
  TRANSACTION_COLUMNS: [
    'date',
    'amount',
    'name',
    'account_details.official_name',
    'category.0',
    'category.1',
    'pending'
  ],
  REFERENCE_COLUMNS: ['notes', 'work', 'joint'],
  SHEET_PROVIDER: 'sheets',
  ACCOUNT_PROVIDER: 'plaid',
  CATEGORY_OVERRIDES: [],
  SHEETS_REDIRECT_URI: 'http://localhost:3000/google-sheets-oauth2callback',
  PLAID_ENVIRONMENT: 'development'
}

const getConfigEnv = () => {
  try {
    // Fallback for CI
    let ENV = process.env.MINTABLE_CONFIG
    if (ENV) {
      // CI has picked up this environment variable as a string (Circle default)
      if (typeof ENV === 'string') {
        process.env = {
          ...JSON.parse(ENV)
        }
        return JSON.parse(ENV)
      }
      // CI has picked up this environment variable as an object (Travis default)
      else {
        process.env = {
          ...ENV
        }
        return ENV
      }
    }

    const config = fs.readFileSync(CONFIG_FILE)
    process.env = {
      ...process.env,
      ...JSON.parse(config)
    }
    return JSON.parse(config)
  } catch (e) {
    console.log('Error: Could not read config file. ' + e.message)
    return false
  }
}

const writeConfig = newConfig => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2))
    return getConfigEnv()
  } catch (e) {
    console.log('Error: Could not write config file. ' + e.message)
    return false
  }
}

const writeConfigProperty = (propertyId, value) => {
  const newConfig = {
    ...getConfigEnv(),
    [propertyId]: value
  }

  writeConfig(newConfig)
}

const deleteConfigProperty = propertyId => {
  const newConfig = _.omit(getConfigEnv(), [propertyId])

  writeConfig(newConfig)
}

const maybeWriteDefaultConfig = () => {
  const currentConfig = getConfigEnv()

  if (!_.every(_.keys(DEFAULT_CONFIG), _.partial(_.has, currentConfig))) {
    writeConfig({
      ...DEFAULT_CONFIG,
      ...(currentConfig || {})
    })
    console.log('Wrote default config.')
  }
}

const checkEnv = propertyIds => {
  const values = _.values(_.pick(process.env, propertyIds))
  return values.length === propertyIds.length && _.every(values, v => v.length)
}

const accountsSetupCompleted = () => {
  if (!process.env) {
    return false
  }

  switch (process.env.ACCOUNT_PROVIDER) {
    case 'plaid':
      return checkEnv(['PLAID_CLIENT_ID', 'PLAID_PUBLIC_KEY', 'PLAID_SECRET'])
    default:
      return false
  }
}

const sheetsSetupCompleted = () => {
  if (!process.env) {
    return false
  }

  switch (process.env.SHEET_PROVIDER) {
    case 'sheets':
      return checkEnv([
        'SHEETS_SHEET_ID',
        'SHEETS_CLIENT_ID',
        'SHEETS_CLIENT_SECRET',
        'SHEETS_REDIRECT_URI',
        'SHEETS_ACCESS_TOKEN'
      ])
    default:
      return false
  }
}

module.exports = {
  getConfigEnv,
  writeConfigProperty,
  deleteConfigProperty,
  writeConfig,
  maybeWriteDefaultConfig,
  accountsSetupCompleted,
  sheetsSetupCompleted
}