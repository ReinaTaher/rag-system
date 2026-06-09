import { Title, Group } from '@mantine/core'

export default function Header() {
  return (
    <Group justify="space-between" p="md" className="border-b">
      <Title order={4}>RAG Chat System</Title>
    </Group>
  )
}