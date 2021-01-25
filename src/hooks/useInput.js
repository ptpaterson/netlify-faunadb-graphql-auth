import { useState } from 'react'

export const useInput = (initialValue, options) => {
  const [value, setValue] = useState(initialValue)

  return {
    value,
    setValue,
    reset: () => setValue(''),
    bind: {
      value,
      onChange: (event) => {
        setValue(event.target.value)
        if (options?.onChange) options.onChange(event.target.value)
      },
    },
  }
}
