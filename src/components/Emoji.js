import React from 'react'

const Emoji = ({ symbol, label }) => (
  <span role='img' aria-label={label}>
    {symbol}
  </span>
)

export default Emoji
