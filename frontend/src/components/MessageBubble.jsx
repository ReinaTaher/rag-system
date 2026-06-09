export default function MessageBubble({ role, content }) {
  const isUser = role === "user"

  return (
    <div className={`flex my-2 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`px-4 py-2 rounded-xl text-sm max-w-[75%] ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        {content}
      </div>
    </div>
  )
}