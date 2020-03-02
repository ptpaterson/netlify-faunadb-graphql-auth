import React from 'react'
import { useQuery, useMutation } from '@apollo/client'

import { GET_ME, GET_LOGGED_IN } from '../graphql/query'
import { LOGOUT } from '../graphql/mutations'

const Profile = () => {
  const { data } = useQuery(GET_ME)
  const [runLogoutMutation] = useMutation(LOGOUT)

  const handleLogout = () => {
    runLogoutMutation({
      update(cache) {
        cache.writeQuery({ query: GET_LOGGED_IN, data: { loggedIn: false } })
        cache.writeQuery({ query: GET_ME, data: { me: null } })
      }
    })
  }

  if (!data?.me?.email) return null

  return (
    <div className='profile'>
      Welcome {data.me.email}
      <button onClick={handleLogout}>logout</button>
    </div>
  )
}

export default Profile
