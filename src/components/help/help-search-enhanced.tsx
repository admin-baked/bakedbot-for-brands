'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Filter, ChevronDown } from 'lucide-react';
import { articles } from '@/content/help/_index';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  url: string;
}

interface HelpSearchEnhancedProps {
  userRole?: string;
}

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'getting-started', label: 'Getting Started' },
  { value: 'products', label: 'Products' },
  { value: 'agents', label: 'AI Agents' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'dispensary', label: 'Dispensary Features' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
];

const difficulties = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const sortOptions = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'title', label: 'Title (A-Z)' },
];

export default function HelpSearchEnhanced({ userRole }: HelpSearchEnhancedProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Get all unique tags from articles
  const allTags = Array.from(
    new Set(
      Object.values(articles).flatMap((article) => article.tags)
    )
  ).sort();

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search function with filters
  const performSearch = useCallback(() => {
    if (!query.trim() && selectedCategory === 'all' && selectedDifficulty === 'all' && selectedTags.length === 0) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    // Filter articles based on role permissions
    const accessibleArticles = Object.entries(articles).filter(([key, article]) => {
      // Public articles (empty roles array) are always accessible
      if (article.roles.length === 0) return true;
      // If user has a role, check if it matches
      if (userRole && article.roles.includes(userRole)) return true;
      // Otherwise, not accessible
      return false;
    });

    // Search and filter
    let filtered = accessibleArticles.map(([key, article]) => ({
      id: key,
      title: article.title,
      description: article.description,
      category: article.category,
      tags: article.tags,
      difficulty: article.difficulty,
      url: `/help/${article.category}/${article.slug}`,
      score: 0,
    }));

    // Apply query filter (search in title, description, tags)
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter((article) => {
        const titleMatch = article.title.toLowerCase().includes(searchLower);
        const descMatch = article.description.toLowerCase().includes(searchLower);
        const tagMatch = article.tags.some((tag) => tag.toLowerCase().includes(searchLower));

        // Calculate relevance score
        if (titleMatch) article.score += 10;
        if (descMatch) article.score += 5;
        if (tagMatch) article.score += 3;

        return titleMatch || descMatch || tagMatch;
      });
    } else {
      // If no query, give all articles a base score
      filtered = filtered.map((article) => ({ ...article, score: 1 }));
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((article) => article.category === selectedCategory);
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter((article) => article.difficulty === selectedDifficulty);
    }

    // Apply tag filters (AND logic - must have all selected tags)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((article) =>
        selectedTags.every((tag) => article.tags.includes(tag))
      );
    }

    // Sort results
    if (sortBy === 'relevance') {
      filtered.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'recent') {
      // Would need lastUpdated date in the future
      filtered.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    setResults(filtered);
    setIsLoading(false);
  }, [query, selectedCategory, selectedDifficulty, selectedTags, sortBy, userRole]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [performSearch]);

  // Generate suggestions based on query
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const queryLower = query.toLowerCase();
    const matchingTitles = Object.values(articles)
      .filter((article) => {
        // Check role permissions
        if (article.roles.length === 0) return true;
        if (userRole && article.roles.includes(userRole)) return true;
        return false;
      })
      .filter((article) => article.title.toLowerCase().includes(queryLower))
      .map((article) => article.title)
      .slice(0, 5);

    setSuggestions(matchingTitles);
  }, [query, userRole]);

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    // Search will trigger automatically via useEffect
  };

  const handleResultClick = (url: string) => {
    router.push(url);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setSelectedTags([]);
    setSortBy('relevance');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedDifficulty !== 'all' ||
    selectedTags.length > 0;

  return (
    <div className="w-full">
      {/* Search Input */}
      <div ref={searchRef} className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search help articles..."
            className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded ${
                hasActiveFilters
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                  {[selectedCategory !== 'all' ? 1 : 0, selectedDifficulty !== 'all' ? 1 : 0, selectedTags.length].reduce((a, b) => a + b, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {difficulties.map((diff) => (
                  <option key={diff.value} value={diff.value}>
                    {diff.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tag Filter */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 15).map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {(query || hasActiveFilters) && (
        <div className="mt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-gray-600">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-gray-600">
                {results.length} article{results.length !== 1 ? 's' : ''} found
              </div>
              <div className="space-y-4">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result.url)}
                    className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {result.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {result.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {categories.find((c) => c.value === result.category)?.label || result.category}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        result.difficulty === 'beginner'
                          ? 'bg-green-100 text-green-700'
                          : result.difficulty === 'intermediate'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {result.difficulty}
                      </span>
                      {result.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">No articles found</p>
              <p className="text-sm text-gray-500">
                Try different search terms or filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
