import { gql } from '@apollo/client'

export const GET_LOGGED_IN = gql`
  query GetLoggedIn {
    loggedIn
  }
`

export const GET_ME = gql`
  query GetMyTodos {
    me {
      _id
      _ts
      email
      todos {
        data {
          _id
          _ts
          title
          completed
        }
      }
    }
  }
`
