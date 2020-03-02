require('dotenv').config()
const faunadb = require('faunadb')

const q = faunadb.query

const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_KEY
})

const run = async () => {
  try {
    const userAlice = await client.query(
      q.Create(q.Collection('User'), {
        credentials: { password: 'secret password' },
        data: {
          email: 'alice@site.example'
        }
      })
    )
    console.log('Created new user, Alice')
    console.log(userAlice)

    const userNancy = await client.query(
      q.Create(q.Collection('User'), {
        credentials: { password: 'better password' },
        data: {
          email: 'nancy@site.example'
        }
      })
    )
    console.log('Created new user, Nancy')
    console.log(userNancy)

    await client.query(
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

    await client.query(
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
    console.log("Created some Todo's")
  } catch (e) {
    console.error(e)
  }
}
run()
