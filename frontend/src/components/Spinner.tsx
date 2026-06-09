export default function Spinner({ text = "載入中…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      <span className="text-sm text-gray-400">{text}</span>
    </div>
  )
}
