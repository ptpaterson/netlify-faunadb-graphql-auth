import React from 'react'
import ReactDOM from 'react-dom'
import './style.css'
import App from './App'

import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloProvider
} from '@apollo/client'

const cache = new InMemoryCache()

const link = new HttpLink({
  uri: '/.netlify/functions/graphql'
})

const client = new ApolloClient({
  cache,
  link
  // resolvers
})

const Root = () => (
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
)

ReactDOM.render(<Root />, document.getElementById('root'))
