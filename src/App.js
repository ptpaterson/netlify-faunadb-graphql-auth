import React from 'react'

import Emoji from './components/Emoji'
import Header from './components/Header'
import LoginModal from './components/LoginModal'
import Profile from './components/Profile'
import TodoCreateForm from './components/TodoCreateForm'
import TodoList from './components/TodoList'

import { useQuery } from '@apollo/client'

import { GET_LOGGED_IN } from './graphql/query'

const App = () => {
  const { data: loggedInData, loading: loggedInLoading } = useQuery(
    GET_LOGGED_IN
  )

  if (loggedInLoading) return <p>Loading...</p>
  if (!loggedInData?.loggedIn) return <LoginModal />

  return (
    <div>
      <Header />
      <div className='content'>
        <h1>
          Authenticated Todo Application <Emoji symbol='🚀' label='rocket' />
        </h1>
        <Profile />
        <TodoCreateForm />
        <TodoList />
      </div>
    </div>
  )
}

export default App
