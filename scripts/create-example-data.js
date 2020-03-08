require('dotenv').config()
const { Client, query: q } = require('faunadb')
const chalk = require('chalk')

const { DATABASE_NAME } = require('./config')

console.log(chalk.cyan(`Adding example data to "${DATABASE_NAME}"\n`))

const createThen = (typeName) => (r) => {
  console.log(chalk.green('+') + ` Created ${typeName}`)
  return r
}

const createCatch = (typeName) => (e) => {
  if (e.message === 'instance already exists') {
    console.log(chalk.blue('o') + ` ${typeName} already exists.  Skipping...`)
  } else if (e.message === 'unauthorized') {
    e.message =
      'unauthorized: missing or invalid fauna_server_secret, or not enough permissions'
    throw e
  } else {
    throw e
  }
}

if (process.env.FAUNADB_ADMIN_KEY) {
  createExampleData(process.env.FAUNADB_ADMIN_KEY)
    .then(() => {
      console.log(chalk.green('\nExample data is created'))
    })
    .catch((e) => console.log(e))
}

async function createExampleData(secret) {
  const adminClient = new Client({
    secret: secret
  })

  let appServerKey

  try {
    // Create a temp key for running this process
    appServerKey = (
      await adminClient
        .query(
          q.CreateKey({
            name: `temp server key for ${DATABASE_NAME}`,
            database: q.Database(DATABASE_NAME),
            role: 'server'
          })
        )
        .then(createThen(`Key "temp server key for ${DATABASE_NAME}"`))
    ).secret

    const appClient = new Client({
      secret: appServerKey
    })

    const userAlice = await appClient
      .query(
        q.Create(q.Collection('User'), {
          credentials: { password: 'secret password' },
          data: {
            email: 'alice@site.example'
          }
        })
      )
      .then(createThen(`User "Alice"`))
      .catch(createCatch(`User "Alice"`))

    const userNancy = await appClient
      .query(
        q.Create(q.Collection('User'), {
          credentials: { password: 'better password' },
          data: {
            email: 'nancy@site.example'
          }
        })
      )
      .then(createThen(`User "Nancy"`))
      .catch(createCatch(`User "Nancy"`))

    const aliceTodoPromise = appClient
      .query(
        q.Map(['Todo 1', 'Todo 2', 'Todo 3'], (title) =>
          q.Create(q.Collection('Todo'), {
            data: {
              title: q.Var('title'),
              completed: false,
              owner: userAlice.ref
            }
          })
        )
      )
      .then(createThen(`Alice Todos`))
      .catch(createCatch(`Alice Todos`))

    const nancyTodoPromise = appClient
      .query(
        q.Map(['Todo 1', 'Todo 2', 'Todo 3'], (title) =>
          q.Create(q.Collection('Todo'), {
            data: {
              title: q.Var('title'),
              completed: false,
              owner: userNancy.ref
            }
          })
        )
      )
      .then(createThen(`Alice Todos`))
      .catch(createCatch(`Alice Todos`))

    return Promise.all([aliceTodoPromise, nancyTodoPromise])
  } finally {
    if (appServerKey) {
      adminClient.query(
        q.Delete(q.Select('ref', q.KeyFromSecret(appServerKey)))
      )
      console.log(
        chalk.red('-') + `Deleted Key "temp server key for ${DATABASE_NAME}"`
      )
    }
  }
}
