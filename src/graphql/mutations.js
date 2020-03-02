import { gql } from '@apollo/client'

export const LOGIN = gql`
  mutation Login($email: String, $password: String) {
    login(data: { email: $email, password: $password })
  }
`

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`

export const USER_CREATE_TODO = gql`
  mutation UserCreateTodo($data: UserTodoInput!) {
    userCreateTodo(data: $data) {
      _id
      _ts
      title
      completed
    }
  }
`

export const UPDATE_TODO = gql`
  mutation UpdateTodo($id: ID!, $data: TodoInput!) {
    updateTodo(id: $id, data: $data) {
      _id
      _ts
      title
      completed
    }
  }
`

export const DELETE_TODO = gql`
  mutation DeleteTodo($id: ID!) {
    deleteTodo(id: $id) {
      _id
    }
  }
`
