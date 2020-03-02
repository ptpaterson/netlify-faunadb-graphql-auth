require('dotenv').config()
const { Client, query: q } = require('faunadb')

const chalk = require('chalk')

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

// Has var. Do the thing
if (process.env.FAUNADB_ADMIN_KEY) {
  createFaunaDB(process.env.FAUNADB_ADMIN_KEY).then(() => {
    console.log(chalk.green('\nFauna Database schema has been created'))
    console.log(
      chalk.green(
        'Claim your fauna database with "netlify addons:auth fauna"\n'
      )
    )
  })
}

async function createFaunaDB(secret) {
  const adminClient = new Client({
    secret: secret
  })

  try {
    // *************************************************************************
    // create a database
    // *************************************************************************
    console.log(chalk.cyan('1) Create database "netlify-auth..."'))
    await adminClient
      .query(q.CreateDatabase({ name: 'auth_example' }))
      .then(() => console.log(chalk.green('+') + ' Created new database'))
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(chalk.blue('o') + ' Database already exists.')
          return
        }
        console.error(e)
      })

    // *************************************************************************
    // Keys
    // *************************************************************************
    // use existing key or create a new one
    console.log(chalk.cyan('\n2) Establish keys..."'))
    const appAdminKey = process.env.FAUNADB_APP_ADMIN_KEY
      ? process.env.FAUNADB_APP_ADMIN_KEY
      : await adminClient
          .query(
            q.CreateKey({
              name: 'Admin key for auth_example',
              database: q.Database('auth_example'),
              role: 'admin'
            })
          )
          .then((res) => {
            console.log(
              chalk.green('+') + ' Created "Admin key for auth_example"'
            )
            return res.secret
          })
          .catch((e) => console.error(e))
    console.log(
      chalk.blue('o') +
        ' Using ' +
        chalk.yellow('FAUNADB_APP_ADMIN_KEY') +
        chalk.cyan(': ') +
        chalk.green(appAdminKey)
    )

    const serverKey = process.env.FAUNADB_SERVER_KEY
      ? process.env.FAUNADB_SERVER_KEY
      : await adminClient
          .query(
            q.CreateKey({
              name: 'Server key for auth_example',
              database: q.Database('auth_example'),
              role: 'server'
            })
          )
          .then((res) => {
            console.log(
              chalk.green('+') + ' Created "Server key for auth_example"'
            )
            return res.secret
          })
          .catch((e) => console.error(e))
    console.log(
      chalk.blue('o') +
        ' Using ' +
        chalk.yellow('FAUNADB_SERVER_KEY') +
        chalk.cyan(': ') +
        chalk.green(serverKey)
    )
    // *************************************************************************
    // Bootstrap new database with given keys
    // *************************************************************************
    /* Now that we have our app-specific database, and keys to access it, now we
     * can create a collection where we can store user documents.
     */
    const appClient = new Client({
      secret: appAdminKey
    })

    // Initialize Users
    console.log(chalk.cyan('\n3) Create "User"...'))

    // Create a collection to store User documents
    await appClient
      .query(
        q.CreateCollection({
          name: 'User',
          history_days: 30,
          ttl_days: null
        })
      )
      .then(() =>
        console.log(chalk.green('+') + ' Created new Collection "User".')
      )
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(chalk.blue('o') + ' Collection "User" already exists.')
          return
        }
        console.error(e)
      })

    // Create a public index for our users
    await appClient
      .query(
        q.CreateIndex({
          name: 'unique_User_email',
          unique: true,
          serialized: true,
          source: q.Collection('User'),
          terms: [{ field: ['data', 'email'] }]
        })
      )
      .then(() =>
        console.log(chalk.green('+') + ' Created Index "unique_User_email".')
      )
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(
            chalk.blue('o') + ' Index "unique_User_email" already exists.'
          )
          return
        }
        console.error(e)
      })

    // Initialize Todos
    console.log(chalk.cyan('\n4) Create "Todo"...'))

    // Create a collection to store Todo documents
    await appClient
      .query(
        q.CreateCollection({ name: 'Todo', history_days: 30, ttl_days: null })
      )
      .then(() => console.log(chalk.green('+') + ' Created Collection "Todo"'))
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(chalk.blue('o') + ' Collection "Todo" already exists.')
          return
        }
        console.error(e)
      })

    // index to get all Todos
    await appClient
      .query(
        q.CreateIndex({
          name: 'all_todos',
          serialized: true,
          source: q.Collection('Todo')
        })
      )
      .then(() => console.log(chalk.green('+') + ' Created Index "all_todos"'))
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(chalk.blue('o') + ' Index "all_todos" already exists.')
          return
        }
        console.error(e)
      })

    // index to get users todos
    await appClient
      .query(
        q.CreateIndex({
          name: 'todo_owner_by_user',
          unique: false,
          serialized: true,
          source: q.Collection('Todo'),
          terms: [{ field: ['data', 'owner'] }]
        })
      )
      .then(() =>
        console.log(chalk.green('+') + ' Created Index "todo_owner_by_user"')
      )
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(
            chalk.blue('o') + ' Index "todo_owner_by_user" already exists.'
          )
          return
        }
        console.error(e)
      })

    // Add Resolver User-Defined-Functions
    console.log(chalk.cyan('\n5) Create User Defined Functions...'))

    // login function
    await appClient
      .query(
        q.CreateFunction({
          name: 'login',
          role: null,
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
      .then(() => console.log(chalk.green('+') + ' Created UDF "login"'))
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(chalk.blue('o') + ' Function "login" already exists.')
          return
        }
        console.error(e)
      })

    // logout function
    await appClient
      .query(
        q.CreateFunction({
          name: 'logout',
          role: null,
          body: q.Query(q.Lambda([], q.Logout(false)))
        })
      )
      .then(() => console.log(chalk.green('+') + ' Created UDF "logout"'))
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(chalk.blue('o') + ' Function "logout" already exists.')
          return
        }
        console.error(e)
      })

    // me function
    await appClient
      .query(
        q.CreateFunction({
          name: 'me',
          role: null,
          body: q.Query(q.Lambda([], q.Get(q.Identity())))
        })
      )
      .then(() => console.log(chalk.green('+') + ' Created UDF "me"'))
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(chalk.blue('o') + ' Function "me" already exists.')
          return
        }
        console.error(e)
      })

    // user_create_todo function
    await appClient
      .query(
        q.CreateFunction({
          name: 'user_create_todo',
          role: null,
          body: q.Query(
            q.Lambda(
              ['data'],
              q.Create(q.Collection('todos'), {
                data: q.Merge(
                  { completed: false, owner: q.Identity() },
                  q.Var('data')
                )
              })
            )
          )
        })
      )
      .then(() =>
        console.log(chalk.green('+') + ' Created UDF "user_create_todo"')
      )
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(
            chalk.blue('o') + ' Function "user_create_todo" already exists.'
          )
          return
        }
        console.error(e)
      })

    // Create new roles
    console.log(chalk.cyan('\n6) Create custom roles...'))

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
      .then(() => console.log(chalk.green('+') + ' Created Role "public"'))
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(chalk.blue('o') + ' Role "public" already exists.')
          return
        }
        console.error(e)
      })

    // Key for public client
    const publicKey = process.env.FAUNADB_PUBLIC_KEY
      ? process.env.FAUNADB_PUBLIC_KEY
      : await appClient
          .query(
            q.CreateKey({
              name: 'Public key for auth_example',
              role: q.Role('public')
            })
          )
          .then((res) => {
            console.log(chalk.green('+') + ' Created new public client key.')
            return res.secret
          })
          .catch((e) => console.error(e))
    if (publicKey) {
      console.log(
        chalk.blue('o') +
          ' Using FAUNADB_PUBLIC_KEY: ' +
          chalk.yellow(publicKey)
      )
    } else {
      console.log(chalk.red('x') + ' failed to create FAUNADB_PUBLIC_KEY')
    }

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
              resource: q.Index('all_todos'),
              actions: {
                read: true
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
      .then(() => console.log(chalk.green('+') + ' Created Role "user"'))
      .catch((e) => {
        if (
          e.requestResult.statusCode === 400 &&
          e.message === 'instance already exists'
        ) {
          console.log(chalk.blue('o') + ' Role "user" already exists.')
          return
        }
        console.error(e)
      })
  } catch (e) {
    console.error(JSON.stringify(e, null, 2))
  }
}
