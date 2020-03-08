require('dotenv').config()
const { Client, query: q } = require('faunadb')
const chalk = require('chalk')
const request = require('request')
const fs = require('fs')
const path = require('path')

const { DATABASE_NAME } = require('./config')

console.log(chalk.cyan('Creating your FaunaDB Database...\n'))

// 1. Check for required enviroment variables
if (!process.env.FAUNADB_ADMIN_KEY) {
  console.log(
    chalk.yellow(
      'Required FAUNADB_SERVER_SECRET enviroment variable not found.'
    )
  )
  console.log(
    `Make sure you have created your Fauna databse with "netlify addons:create fauna"`
  )
  console.log(`Then run "npm run bootstrap" to setup your database schema`)

  const insideNetlify = !!process.env.DEPLOY_PRIME_URL
  if (insideNetlify) {
    process.exit(1)
  }
}

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

const updateThen = (typeName) => (r) => {
  console.log(chalk.blue('o') + ` Updated ${typeName}`)
  return r
}

const updateCatch = (e) => {
  if (e.message === 'unauthorized') {
    e.message =
      'unauthorized: missing or invalid fauna_server_secret, or not enough permissions'
    throw e
  } else {
    throw e
  }
}

// Has var. Do the thing
if (process.env.FAUNADB_ADMIN_KEY) {
  createFaunaDB(process.env.FAUNADB_ADMIN_KEY)
    .then(() => {
      console.log(chalk.green('\nFauna Database schema has been created'))
      console.log(
        chalk.green(
          'Claim your fauna database with "netlify addons:auth fauna"\n'
        )
      )
    })
    .catch((e) => console.log(JSON.stringify(e, null, 2)))
}

async function createFaunaDB(secret) {
  const adminClient = new Client({
    secret: secret
  })

  let appAdminKey

  try {
    // *************************************************************************
    // create a database
    // *************************************************************************
    console.log(chalk.cyan(`1) Create database "${DATABASE_NAME}"`))
    await adminClient
      .query(q.CreateDatabase({ name: DATABASE_NAME }))
      .then(createThen(`Database "${DATABASE_NAME}"`))
      .catch(createCatch(`Database "${DATABASE_NAME}"`))

    // *************************************************************************
    // Keys
    // *************************************************************************
    // Create a temp key for running this process
    console.log(chalk.cyan('\n2) Creating temporary key"'))
    appAdminKey = (
      await adminClient
        .query(
          q.CreateKey({
            name: `temp admin key for ${DATABASE_NAME}`,
            database: q.Database(DATABASE_NAME),
            role: 'admin'
          })
        )
        .then(createThen(`Key "temp admin key for ${DATABASE_NAME}"`))
    ).secret

    // *************************************************************************
    // Bootstrap new database with temp key
    // *************************************************************************
    /* Now that we have our app-specific database, and keys to access it, now we
     * can create a collection where we can store user documents.
     */
    const appClient = new Client({
      secret: appAdminKey
    })

    console.log(chalk.cyan('\n3) Uploading Graphql Schema..."'))

    await new Promise((resolve, reject) => {
      fs.createReadStream(path.join(__dirname, 'faunaSchema.graphql')).pipe(
        request.post(
          {
            type: 'application/octet-stream',
            headers: {
              Authorization: `Bearer ${appAdminKey}`
            },
            url: 'https://graphql.fauna.com/import'
          },
          (err, res, body) => {
            if (err) reject(err)
            resolve(body)
          }
        )
      )
    }).then(() => console.log(chalk.blue('o') + ` GraphQL schema imported`))

    console.log(chalk.cyan('\n4) Update generated User Defined Functions..."'))

    await appClient
      .query(
        q.Update(q.Function('login'), {
          body: q.Query(
            q.Lambda(
              ['input'],
              q.Select(
                'secret',
                q.Login(
                  q.Match(
                    q.Index('unique_User_email'),
                    q.Select('email', q.Var('input'))
                  ),
                  {
                    password: q.Select('password', q.Var('input'))
                  }
                )
              )
            )
          )
        })
      )
      .then(updateThen('Function "login"'))
      .catch((e) => {
        console.log(JSON.stringify(e, null, 2))
        updateCatch(e)
      })

    // logout function
    await appClient
      .query(
        q.Update(q.Function('logout'), {
          body: q.Query(q.Lambda([], q.Logout(false)))
        })
      )
      .then(updateThen('Function "logout"'))
      .catch(updateCatch)

    // me function
    await appClient
      .query(
        q.Update(q.Function('me'), {
          body: q.Query(q.Lambda([], q.Get(q.Identity())))
        })
      )
      .then(updateThen('Function "me"'))
      .catch(updateCatch)

    // user_create_todo function
    await appClient
      .query(
        q.Update(q.Function('user_create_todo'), {
          body: q.Query(
            q.Lambda(
              ['data'],
              q.Create(q.Collection('Todo'), {
                data: q.Merge(
                  { completed: false, owner: q.Identity() },
                  q.Var('data')
                )
              })
            )
          )
        })
      )
      .then(updateThen('Function "user_create_todo"'))
      .catch(updateCatch)

    // Create new roles
    console.log(chalk.cyan('\n5) Create custom roles...'))

    // Public role for logging in
    await appClient
      .query(
        q.CreateRole({
          name: 'public',
          privileges: [
            {
              resource: q.Function('login'),
              actions: {
                call: true
              }
            },
            {
              resource: q.Index('unique_User_email'),
              actions: {
                read: true
              }
            }
          ]
        })
      )
      .then(createThen(`Role "public"`))
      .catch(createCatch(`Role "public"`))

    // Key for public client
    const publicKey = (
      await appClient
        .query(
          q.CreateKey({
            name: `Public key for ${DATABASE_NAME}`,
            role: q.Role('public')
          })
        )
        .then(createThen(`Key "Public key for ${DATABASE_NAME}"`))
    ).secret
    console.log(
      chalk.yellow('!') + ' Public client key: ' + chalk.yellow(publicKey)
    )

    // Regular user.  All users can read their own todos
    await appClient
      .query(
        q.CreateRole({
          name: 'user',
          membership: [
            {
              resource: q.Collection('User')
            }
          ],
          privileges: [
            {
              resource: q.Collection('Todo'),
              actions: {
                create: q.Query(
                  q.Lambda(
                    'todo',
                    q.Equals(
                      q.Identity(),
                      q.Select(['data', 'owner'], q.Var('todo'))
                    )
                  )
                ),
                delete: q.Query(
                  q.Lambda(
                    'todo',
                    q.Equals(
                      q.Identity(),
                      q.Select(['data', 'owner'], q.Get(q.Var('todo')))
                    )
                  )
                ),
                read: q.Query(
                  q.Lambda(
                    'ref',
                    q.Equals(
                      q.Identity(),
                      q.Select(['data', 'owner'], q.Get(q.Var('ref')))
                    )
                  )
                ),
                write: q.Query(
                  q.Lambda(
                    ['oldData', 'newData'],
                    q.And(
                      q.Equals(
                        q.Identity(),
                        q.Select(['data', 'owner'], q.Var('oldData'))
                      ),
                      q.Equals(
                        q.Select(['data', 'owner'], q.Var('oldData')),
                        q.Select(['data', 'owner'], q.Var('newData'))
                      )
                    )
                  )
                )
              }
            },
            {
              resource: q.Collection('User'),
              actions: {
                read: q.Query(
                  q.Lambda('ref', q.Equals(q.Identity(), q.Var('ref')))
                )
              }
            },
            {
              resource: q.Index('todo_owner_by_user'),
              actions: {
                read: q.Query(
                  q.Lambda('terms', q.Equals(q.Var('terms'), [q.Identity()]))
                )
              }
            },
            {
              resource: q.Function('me'),
              actions: {
                call: true
              }
            },
            {
              resource: q.Function('logout'),
              actions: {
                call: true
              }
            },
            {
              resource: q.Function('user_create_todo'),
              actions: {
                call: true
              }
            }
          ]
        })
      )
      .then(createThen(`Role "user"`))
      .catch(createCatch(`Role "user"`))
  } finally {
    if (appAdminKey) {
      adminClient.query(q.Delete(q.Select('ref', q.KeyFromSecret(appAdminKey))))
      console.log(
        chalk.red('-') + `Deleted Key "temp admin key for ${DATABASE_NAME}"`
      )
    }
  }
}
