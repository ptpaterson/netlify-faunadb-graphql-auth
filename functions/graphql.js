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
  introspectSchema,
  mergeSchemas,
  makeExecutableSchema,
  makeRemoteExecutableSchema,
  transformSchema
} = require('apollo-server-lambda')
const { setContext } = require('apollo-link-context')
const { HttpLink } = require('apollo-link-http')
const httpHeadersPlugin = require('apollo-server-plugin-http-headers')
const fetch = require('node-fetch')
const cookie = require('cookie')

// HTTP link will be what does the talking with the FaunaDB native API
const httpLink = new HttpLink({
  uri: 'https://graphql.fauna.com/graphql',
  fetch
})

// setContext links runs before any remote request by `delegateToSchema`
const contextlink = setContext((_, previousContext) => {
  let token = process.env.FAUNADB_PUBLIC_KEY // public token

  if (previousContext && previousContext.graphqlContext) {
    const event = previousContext.graphqlContext.event
    if (event.headers.cookie) {
      const parsedCookie = cookie.parse(event.headers.cookie)
      const cookieSecret = parsedCookie['fauna-token']
      if (cookieSecret) token = cookieSecret
    }
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
})

// chain the links
const link = contextlink.concat(httpLink)

// create a yet undefined handler, so that we can define it during the first req
let handler

const getHandler = async () => {
  if (handler) return handler

  console.log('getHandler: creating new server')

  // *****************************************************************************
  // 1) Create the remote schema
  // *****************************************************************************
  // using introspectSchema is an okay method in a lambda function, but not if you
  // are constantly polling, like in Apollo Gateway.

  // schema was downloaded from fauna and saved to local file.
  // const { remoteTypeDefs } = require('./graphql/remoteSchema')
  const remoteExecutableSchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(link),
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
  handler = server.createHandler()

  return handler
}

exports.handler = (event, context, callback) => {
  getHandler().then((handler) => handler(event, context, callback))
}
