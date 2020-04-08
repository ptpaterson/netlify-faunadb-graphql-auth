import React, { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { Editor, EditorState, ContentState } from 'draft-js'

import { GET_ME } from '../graphql/query'
import { UPDATE_TODO, DELETE_TODO } from '../graphql/mutations'

import { useCheckBox } from '../hooks'

const TodoItem = ({ todo }) => {
  const { _id, title, completed } = todo

  const [runUpdateTodoMutation] = useMutation(UPDATE_TODO)
  const [runDeleteTodoMutation] = useMutation(DELETE_TODO)

  const [editorState, setEditorState] = useState(
    EditorState.createWithContent(ContentState.createFromText(title))
  )

  const onTitleEditorChange = (editorState) => setEditorState(editorState)

  const onTitleEditorBlur = () => {
    const newTitle = editorState.getCurrentContent().getPlainText()
    const variables = {
      data: { title: newTitle, completed },
      id: _id
    }
    runUpdateTodoMutation({
      variables,
      update(cache, { data }) {
        cache.writeFragment({
          _id,
          fragment: gql`
            fragment myTodo on Todo {
              _id
              _ts
              title
              completed
            }
          `,
          data
        })
      }
    })
  }
  const handleUpdate = (newData) => {
    const variables = {
      data: Object.assign({ title, completed }, newData),
      id: _id
    }
    runUpdateTodoMutation({
      variables,
      update(cache, { data }) {
        cache.writeFragment({
          _id,
          fragment: gql`
            fragment myTodo on Todo {
              _id
              _ts
              title
              completed
            }
          `,
          data
        })
      }
    })
  }

  const handleDelete = () => {
    const variables = {
      id: _id
    }
    runDeleteTodoMutation({
      variables,
      update(cache) {
        const meCache = cache.readQuery({ query: GET_ME })
        const existingTodos = meCache?.me?.todos?.data
        const filteredTodos = existingTodos.filter((todo) => todo._id !== _id)

        const newCache = {
          me: {
            ...meCache?.me,
            todos: {
              __typename: 'TodoPage',
              data: filteredTodos
            }
          }
        }

        cache.writeQuery({ query: GET_ME, data: newCache })
      }
    })
  }

  const checkState = useCheckBox(completed, {
    onChange: (checked) => handleUpdate({ completed: checked })
  })

  return (
    <div className={'todo-item' + (completed ? ' todo-checked' : '')}>
      <label>
        <input type='checkbox' {...checkState.bind} />
      </label>
      <div className='todo-item-title'>
        <Editor
          editorState={editorState}
          onChange={onTitleEditorChange}
          onBlur={onTitleEditorBlur}
        ></Editor>
      </div>

      <button className='todo-item-delete btn-danger' onClick={handleDelete}>
        delete
      </button>
    </div>
  )
}

const TodoList = () => {
  const { data: myTodosData, loading: myTodosLoading } = useQuery(GET_ME)

  return (
    <div className='todo-list'>
      {!myTodosLoading && myTodosData ? (
        <ul>
          {myTodosData.me.todos.data.map((todo) => (
            <li key={todo._id}>
              <TodoItem todo={todo} />
            </li>
          ))}
        </ul>
      ) : (
        <p>loading</p>
      )}
    </div>
  )
}

export default TodoList
