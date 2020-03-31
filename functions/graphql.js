const {
  ApolloServer,

  /* This stuff all comes from graphql-tools
   * Check out these links!
   *   https://www.apollographql.com/docs/graphql-tools/schema-stitching/
   *   https://www.apollographql.com/docs/graphql-tools/remote-schemas/
   * Yes, stitching is depcricated in favor of Federation, but that does not
   * work with FaunaDB yet.
   */
  FilterRootFields,
  mergeSchemas,
  makeExecutableSchema,
  makeRemoteExecutableSchema,
  transformSchema
} = require('apollo-server-lambda')
const { setContext } = require('apollo-link-context')
const { createHttpLink } = require('apollo-link-http')
const httpHeadersPlugin = require('apollo-server-plugin-http-headers')
const fetch = require('node-fetch')
const cookie = require('cookie')

const httpLink = new createHttpLink({
  uri: 'https://graphql.fauna.com/graphql',
  fetch
})

// setContext links runs before any remote request by `delegateToSchema`
const contextlink = setContext((_, previousContext) => {
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
})

const link = contextlink.concat(httpLink)

// *****************************************************************************
// 1) Create the remote schema
// *****************************************************************************


// using introspectSchema is not a good idea with a AWS lambda function
// schema was downloaded from fauna and saved to local file.
const { remoteTypeDefs } = require('./graphql/remoteSchema')
const remoteExecutableSchema = makeRemoteExecutableSchema({
  schema: remoteTypeDefs,
  link
})

// remove root fields that we don't want available to the client
const transformedRemoteSchema = transformSchema(remoteExecutableSchema, [
  new FilterRootFields(
    (operation, rootField) =>
      !['createTodo', 'createUser', 'deleteUser', 'findUserByID'].includes(
        rootField
      )
  )
])

// *****************************************************************************
// 2) Create a schema for resolvers that are not in the remote schema
// *****************************************************************************

const { localTypeDefs, localResolvers } = require('./graphql/localSchema')
const localExecutableSchema = makeExecutableSchema({
  typeDefs: localTypeDefs,
  resolvers: localResolvers
})

// *****************************************************************************
// 3) create typedefs and resolvers that override
// *****************************************************************************

const {
  overrideTypeDefs,
  createOverrideResolvers
} = require('./graphql/overrideSchema')

// *****************************************************************************
// 4) put it all together
// *****************************************************************************

const schema = mergeSchemas({
  schemas: [overrideTypeDefs, localExecutableSchema, transformedRemoteSchema],
  resolvers: createOverrideResolvers(remoteExecutableSchema)
})

// *****************************************************************************
// 5) Run the server
// *****************************************************************************

const server = new ApolloServer({
  schema,
  plugins: [httpHeadersPlugin],
  context: ({ event, context }) => {
    // console.log(event)

    return {
      event,
      context,
      setCookies: [],
      setHeaders: []
    }
  }
})

exports.handler = server.createHandler()
