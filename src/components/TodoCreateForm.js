import React from 'react'
import { useMutation } from '@apollo/client'

import { USER_CREATE_TODO } from '../graphql/mutations'
import { GET_ME } from '../graphql/query'
import { useInput } from '../hooks'

export default function TodoCreateForm() {
  const [runUserCreateTodoMutation] = useMutation(USER_CREATE_TODO)

  const title = useInput('')

  const onSubmit = (event) => {
    event.preventDefault()

    const variables = {
      data: {
        title: title.value,
        completed: false
      }
    }
    runUserCreateTodoMutation({
      variables,
      update(cache, { data }) {
        const meCache = cache.readQuery({ query: GET_ME })
        const existingTodos = meCache?.me?.todos?.data
        const newTodo = data?.userCreateTodo
        const newCache = {
          me: {
            ...meCache?.me,
            todos: {
              __typename: 'TodoPage',
              data: [...existingTodos, newTodo]
            }
          }
        }

        cache.writeQuery({ query: GET_ME, data: newCache })
      }
    })
    title.reset()
  }

  return (
    <form className='todo-create-wrapper' onSubmit={onSubmit}>
      <input
        type='text'
        className='todo-create-input'
        placeholder='Add a todo item'
        autoComplete='off'
        {...title.bind}
      />
      <div className='todo-actions'>
        <button className='todo-create-button'>Create todo</button>
      </div>
    </form>
  )
}
