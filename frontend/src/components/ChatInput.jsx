import { useState } from 'react'
import { TextInput, Button, Group } from '@mantine/core'

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')

  function handleSend() {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="border-t bg-white p-3">
      <Group gap="sm" align="center">
        <TextInput
          placeholder="Ask something..."
          className="flex-1"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <Button onClick={handleSend} disabled={disabled}>
          {disabled ? 'Thinking...' : 'Send'}
        </Button>
      </Group>
    </div>
  )
}
