export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Rabattkoder.no</h1>
        </div>
      </header>
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-3/4 mx-auto" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    </div>
  )
}
