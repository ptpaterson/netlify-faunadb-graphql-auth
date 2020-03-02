const { gql } = require('apollo-server-lambda')
const cookie = require('cookie')
const faunadb = require('faunadb')

const q = faunadb.query

const localTypeDefs = gql`
  input LoginInput {
    email: String
    password: String
  }

  type Query {
    loggedIn: Boolean!
  }

  type Mutation {
    login(data: LoginInput): Boolean!
  }
`

const createLocalResolvers = (remoteExecutableSchema) => ({
  Query: {
    loggedIn: async (root, args, context) => {
      let result = false

      if (context.event.headers.cookie) {
        const parsedCookie = cookie.parse(context.event.headers.cookie)
        const cookieSecret = parsedCookie['fauna-token']
        const userClient = new faunadb.Client({
          secret: cookieSecret
        })
        result = await userClient
          .query(q.Get(q.Identity()))
          .then((response) => {
            if (!response.message) return !!response
            return false
          })
          .catch((e) => {
            return false
          })

        if (!result) {
          // kill the cookie
          context.setCookies.push({
            name: 'fauna-token',
            value: '',
            options: {
              httpOnly: true,
              expires: new Date()
            }
          })
        }
      }

      return new Promise((resolve) => {
        setTimeout(resolve, 800)
      }).then(() => result)
    }
  },
  Mutation: {
    login: async (root, args, context, info) => {
      // short circuit if cookie exists
      if (context.event.headers.cookie) {
        const parsedCookie = cookie.parse(context.event.headers.cookie)
        const cookieSecret = parsedCookie['fauna-token']
        const userClient = new faunadb.Client({
          secret: cookieSecret
        })
        const alreadyLoggedIn = await userClient
          .query(q.Get(q.Identity()))
          .then((response) => {
            if (!response.message) {
              if (args.data && args.data.email && args.data.email) {
                // TODO trying to log in as someone else besides cookie holder.
                // should probably log them out first!
                return response.data.email === args.data.email
              } else {
                // did not provide credentials so just use the cookie values
                return true
              }
            }
            return false
          })
          .catch((e) => {
            console.log('error: bad cookie secret', e)
            return false
          })

        if (alreadyLoggedIn) {
          return true
        } else {
          // kill the cookie
          context.setCookies.push({
            name: 'fauna-token',
            value: '',
            options: {
              httpOnly: true,
              expires: new Date()
            }
          })
        }
        return false
      }

      if (!args.data || !args.data.email || !args.data.email) return false

      const result = await info.mergeInfo
        .delegateToSchema({
          schema: remoteExecutableSchema,
          operation: 'mutation',
          fieldName: 'login',
          args,
          context,
          info
        })
        .catch((error) => {
          console.log(error)
        })
      if (result) {
        context.setCookies.push({
          name: 'fauna-token',
          value: result,
          options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
          }
        })
        return true
      }
      return false
    }
  }
})

module.exports = {
  localTypeDefs,
  createLocalResolvers
}
