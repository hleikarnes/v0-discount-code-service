import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 text-lg mb-8">Page not found</p>
        <Link href="/no">
          <Button className="bg-green-600 hover:bg-green-700 text-white">Back to home</Button>
        </Link>
      </div>
    </div>
  )
}
