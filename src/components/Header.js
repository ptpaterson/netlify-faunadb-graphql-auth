import React from 'react'
import deployButton from '../assets/deploy-to-netlify.svg'
import logo from '../assets/logo.svg'
import github from '../assets/github.svg'

const AppHeader = () => {
  return (
    <header className='app-header'>
      <div className='app-title-wrapper'>
        <div className='content-stack'>
          <img src={logo} className='app-logo' alt='logo' />
        </div>
        <div className='app-title-text'>
          <h1 className='app-title'>Netlify + Fauna DB w/ Auth</h1>
          <p className='app-intro'>Using FaunaDB & Netlify functions</p>
          <p className='app-intro'>
            Including Account Based Access Controls (ABAC) Using Cookies
          </p>
        </div>
        <div className='content-stack'>
          <a
            target='_blank'
            rel='noopener noreferrer'
            href='https://app.netlify.com/start/deploy?repository=https://github.com/ptpaterson/netlify-faunadb-graphql-auth&stack=fauna'
          >
            <img
              src={deployButton}
              className='deploy-button'
              alt='deploy to netlify'
            />
          </a>
          <div className='view-src'>
            <a
              target='_blank'
              rel='noopener noreferrer'
              href='https://github.com/ptpaterson/netlify-faunadb-graphql-auth'
            >
              <img
                className='github-icon'
                src={github}
                alt='view repo on github'
              />
              Source
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
