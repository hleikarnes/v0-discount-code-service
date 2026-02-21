"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Job } from "@/lib/types"

export function LiveAdmin() {
  const [storeDomain, setStoreDomain] = useState("")
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleStartJob = async () => {
    if (!storeDomain) {
      setMessage("Please enter a store domain")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/jobs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_domain: storeDomain, reason: "admin_trigger" }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ Job ${data.job_id} queued for worker`)
        setStoreDomain("")
        fetchJobs()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setMessage("Failed to create job")
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/jobs/list")
      const data = await response.json()
      if (response.ok) {
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch jobs:", error)
    }
  }

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Job Trigger */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-neutral-900">Trigger Worker Job</h2>
        <div className="flex gap-3">
          <Input
            placeholder="example.com"
            value={storeDomain}
            onChange={(e) => setStoreDomain(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleStartJob} disabled={loading} className="bg-green-600 hover:bg-green-700">
            Start Job
          </Button>
        </div>
        {message && <div className="mt-3 rounded bg-neutral-100 p-3 text-sm">{message}</div>}
      </Card>

      {/* Jobs List */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-neutral-900">Recent Jobs</h2>
        <div className="space-y-3">
          {jobs.length === 0 && <p className="text-neutral-600">No jobs yet</p>}
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between rounded border border-neutral-200 p-4">
              <div>
                <div className="font-semibold">{job.store_domain}</div>
                <div className="text-sm text-neutral-600">
                  {job.mode} • {new Date(job.created_at).toLocaleString()}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  job.status === "done"
                    ? "bg-green-100 text-green-800"
                    : job.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : job.status === "running"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-neutral-100 text-neutral-800"
                }`}
              >
                {job.status}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
