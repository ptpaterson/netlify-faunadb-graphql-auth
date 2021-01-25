const { gql } = require('apollo-server-lambda')
const cookie = require('cookie')
const faunadb = require('faunadb')

const q = faunadb.query

const overrideTypeDefs = gql`
  input LoginInput {
    email: String!
    password: String!
  }

  type Mutation {
    login(data: LoginInput): Boolean!
  }
`

const createOverrideResolvers = (remoteExecutableSchema) => ({
  Mutation: {
    login: async (root, args, context, info) => {
      console.log('*** OVERRIDE mutation login')

      // short circuit if cookie exists
      if (context.event.headers.cookie) {
        const parsedCookie = cookie.parse(context.event.headers.cookie)
        const cookieSecret = parsedCookie['fauna-token']
        const userClient = new faunadb.Client({
          secret: cookieSecret,
        })
        const alreadyLoggedIn = await userClient
          .query(q.Get(q.CurrentIdentity()))
          .then((response) => {
            if (!response.message) {
              if (args.data && args.data.email && response.data.email) {
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
            console.log('error: bad cookie secret')
            console.trace(e)
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
              expires: new Date(),
            },
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
          info,
        })
        .catch(console.trace)
      if (result) {
        context.setCookies.push({
          name: 'fauna-token',
          value: result,
          options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
          },
        })
        return true
      }
      return false
    },
    logout: async (root, args, context, info) => {
      console.log('*** OVERRIDE mutation logout')

      // short circuit if NO cookie exists
      if (!context.event.headers.cookie) {
        return true
      }

      await info.mergeInfo
        .delegateToSchema({
          schema: remoteExecutableSchema,
          operation: 'mutation',
          fieldName: 'logout',
          args,
          context,
          info,
        })
        .catch(console.trace)

      // kill the cookie
      context.setCookies.push({
        name: 'fauna-token',
        value: '',
        options: {
          httpOnly: true,
          expires: new Date(),
        },
      })

      return true
    },
  },
})

module.exports = {
  overrideTypeDefs,
  createOverrideResolvers,
}
