import React from 'react'
import { useMutation } from '@apollo/client'

import { GET_LOGGED_IN } from '../graphql/query'
import { LOGIN } from '../graphql/mutations'
import { useInput } from '../hooks'

const LoginModal = () => {
  const [runLoginMutation] = useMutation(LOGIN, {
    update(cache, { data }) {
      cache.writeQuery({
        query: GET_LOGGED_IN,
        data: { loggedIn: data.login }
      })
    }
  })

  const email = useInput('')
  const password = useInput('')

  const onSubmit = (event) => {
    event.preventDefault()
    runLoginMutation({
      variables: {
        data: {
          email: email.value,
          password: password.value
        }
      }
    })
  }
  return (
    <div className='login-form'>
      <form onSubmit={onSubmit}>
        <label htmlFor={email.value}>Email:</label>
        <input
          type='text'
          {...email.bind}
          placeholder='email'
          required
        />
        <label htmlFor={password.value}>Password:</label>
        <input
          type='password'
          {...password.bind}
          placeholder='password'
          required
        />
        <button type='submit' className="span-2-2">Login</button>
      </form>
    </div>
  )
}

export default LoginModal
