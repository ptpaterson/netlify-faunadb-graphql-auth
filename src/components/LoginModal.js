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
        email: email.value,
        password: password.value
      }
    })
  }
  return (
    <form onSubmit={onSubmit}>
      <div>
        <label>
          Email:
          <input type='text' {...email.bind} placeholder='email' required />
        </label>
      </div>
      <div>
        <label>
          Password:
          <input
            type='password'
            {...password.bind}
            placeholder='password'
            required
          />
        </label>
      </div>
      <button type='submit'>Login</button>
    </form>
  )
}

export default LoginModal
