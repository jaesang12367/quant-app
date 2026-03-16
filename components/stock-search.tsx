"use client"

import { useState, useRef, useEffect } from "react"
import { Search } from "lucide-react"

interface StockSearchProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

export function StockSearch({ onSearch, isLoading }: StockSearchProps) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
          <Search 
            className={`w-5 h-5 transition-colors duration-300 ${
              query ? 'text-foreground' : 'text-muted-foreground'
            }`} 
          />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="삼성전자, 애플, 테슬라..."
          disabled={isLoading}
          className="w-full py-4 pl-14 pr-5 text-lg bg-muted/50 border-0 rounded-2xl 
                     placeholder:text-muted-foreground/60
                     focus:outline-none focus:ring-2 focus:ring-foreground/10
                     transition-all duration-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {query && (
          <button
            type="submit"
            disabled={isLoading}
            className="absolute inset-y-2 right-2 px-5 bg-foreground text-background 
                       rounded-xl font-medium text-sm
                       hover:bg-foreground/90 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "분석 중..." : "분석"}
          </button>
        )}
      </div>
    </form>
  )
}
