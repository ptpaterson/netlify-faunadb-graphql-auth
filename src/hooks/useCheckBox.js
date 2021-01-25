import { useState } from 'react'

export const useCheckBox = (initialValue, options) => {
  const [checked, setValue] = useState(initialValue)

  return {
    checked,
    setValue,
    reset: () => setValue(''),
    bind: {
      checked,
      onChange: (event) => {
        setValue(event.target.checked)
        if (options?.onChange) options.onChange(event.target.checked)
      },
    },
  }
}
