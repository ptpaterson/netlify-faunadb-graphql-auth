const { buildSchema } = require('graphql')
const {
  ApolloServer,
  mergeSchemas,
  makeRemoteExecutableSchema
} = require('apollo-server-lambda')
const { setContext } = require('apollo-link-context')
const { createHttpLink } = require('apollo-link-http')
const httpHeadersPlugin = require('apollo-server-plugin-http-headers')
const fetch = require('node-fetch')
const cookie = require('cookie')

const http = new createHttpLink({
  uri: 'https://graphql.fauna.com/graphql',
  fetch
})

const link = setContext((request, previousContext) => {
  let token = process.env.FAUNADB_PUBLIC_KEY // public token
  const event = previousContext.graphqlContext.event

  if (event.headers.cookie) {
    const parsedCookie = cookie.parse(event.headers.cookie)
    const cookieSecret = parsedCookie['fauna-token']
    if (cookieSecret) token = cookieSecret
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
}).concat(http)

// using introspectSchema is not a good idea with a AWS lambda function
// schema was downloaded from fauna and saved to local file.
const remoteSchema = buildSchema(require('./graphql/remoteSchema'))
const remoteExecutableSchema = makeRemoteExecutableSchema({
  schema: remoteSchema,
  link
})

const { localTypeDefs, createLocalResolvers } = require('./graphql/localSchema')

const schema = mergeSchemas({
  schemas: [remoteExecutableSchema, localTypeDefs],
  resolvers: createLocalResolvers(remoteExecutableSchema)
})

const server = new ApolloServer({
  schema,
  plugins: [httpHeadersPlugin],
  context: ({ event, context }) => {
    return {
      event,
      context,
      setCookies: [],
      setHeaders: []
    }
  }
})

exports.handler = server.createHandler()
