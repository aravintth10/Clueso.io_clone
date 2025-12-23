'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AnalyticsPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showNewVideoModal, setShowNewVideoModal] = useState(false);

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const storedUsername = localStorage.getItem('username');

        if (!isAuthenticated) {
            router.push('/login');
        } else {
            setUsername(storedUsername || 'User');
            setIsLoading(false);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('username');
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f0f23] flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#1a1a2e] border-r border-gray-800 flex flex-col">
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-white">Clueso</span>
                    </div>
                </div>

                <div className="p-4">
                    <button
                        onClick={() => setShowNewVideoModal(true)}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New video
                    </button>
                </div>

                <nav className="flex-1 px-4 py-2">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors mb-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>Home</span>
                    </Link>

                    <Link href="/projects" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors mb-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span>All Projects</span>
                    </Link>

                    <Link href="/templates" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors mb-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <span>Video Templates</span>
                    </Link>

                    <Link href="/team" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors mb-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>Team</span>
                    </Link>

                    <Link href="/analytics" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-500/10 text-purple-400 border-l-2 border-purple-500 mb-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="font-medium">Analytics</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-gray-800">
                              <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors mb-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </Link>
                    <div className="mt-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Logged in as</span>
                            <button onClick={handleLogout} className="text-xs text-pink-400 hover:text-pink-300 transition-colors">
                                Logout
                            </button>
                        </div>
                        <p className="text-sm font-medium text-white">{username}</p>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <header className="bg-[#1a1a2e] border-b border-gray-800 px-8 py-6">
                    <h1 className="text-3xl font-bold text-white">Analytics</h1>
                </header>

                <div className="p-8">
                    {/* Filters */}
                    <div className="flex gap-4 mb-8">
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                defaultValue="2025-12-08"
                                className="bg-[#1a1a2e] border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                defaultValue="2025-12-22"
                                className="bg-[#1a1a2e] border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <select className="bg-[#1a1a2e] border border-gray-700 text-gray-400 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option>Select Project</option>
                        </select>
                        <button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium px-6 py-2 rounded-lg transition-all">
                            Apply Filters
                        </button>
                    </div>

                    {/* Stats Header */}
                    <div className="mb-8">
                        <h2 className="text-xl text-white mb-4">
                            Your content got <span className="text-purple-400 font-semibold">0 impressions</span> in this period
                        </h2>
                        <p className="text-gray-400 text-sm">
                            This includes data from your view-only links, video embeds, and knowledge base
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-[#1a1a2e] border border-gray-800 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-gray-400 font-medium">Impressions</h3>
                                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-4xl font-bold text-white">0</p>
                            <p className="text-sm text-gray-500 mt-1">impressions</p>
                        </div>

                        <div className="bg-[#1a1a2e] border border-gray-800 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-gray-400 font-medium">Video Plays</h3>
                                <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-4xl font-bold text-white">0</p>
                            <p className="text-sm text-gray-500 mt-1">plays</p>
                        </div>
                    </div>

                    {/* Empty State */}
                    <div className="bg-[#1a1a2e] border border-gray-800 rounded-2xl p-16 text-center">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">No data</h3>
                        <p className="text-gray-400 mb-2">Want to see metrics on your content?</p>
                        <p className="text-gray-500 text-sm">
                            Create a video, and publish it to a view link, embed, or your knowledge base.
                        </p>
                    </div>
                </div>
            </main>

            {/* New Video Modal */}
            {showNewVideoModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewVideoModal(false)}>
                    <div className="bg-[#1a1a2e] border border-gray-700 rounded-2xl max-w-2xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-700">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">New project</h2>
                                <p className="text-gray-400 text-sm">Clueso creates stunning videos and step-by-step guides</p>
                            </div>
                            <button onClick={() => setShowNewVideoModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-3">
                            <button className="w-full bg-[#0f0f23] hover:bg-[#1f1f3a] border border-gray-700 hover:border-purple-500/40 rounded-xl p-4 transition-all duration-200 text-left group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold mb-1">Start blank project</h3>
                                        <p className="text-gray-400 text-sm">Create a new project from scratch.</p>
                                    </div>
                                </div>
                            </button>

                            <button className="w-full bg-gradient-to-r from-pink-900/20 to-purple-900/20 hover:from-pink-900/30 hover:to-purple-900/30 border-2 border-pink-500/40 hover:border-pink-500/60 rounded-xl p-4 transition-all duration-200 text-left group relative">
                                <div className="absolute top-3 right-3">
                                    <span className="px-2 py-1 bg-pink-500 text-white text-xs font-bold rounded">Recommended</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center group-hover:bg-purple-500/40 transition-colors">
                                        <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold mb-1">Capture screen-recording</h3>
                                        <p className="text-gray-300 text-sm">Record any process on your screen.</p>
                                    </div>
                                </div>
                            </button>

                            <button className="w-full bg-[#0f0f23] hover:bg-[#1f1f3a] border border-gray-700 hover:border-purple-500/40 rounded-xl p-4 transition-all duration-200 text-left group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                                        <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold mb-1">Upload a video</h3>
                                        <p className="text-gray-400 text-sm">Upload a screen-recording from your computer.</p>
                                    </div>
                                </div>
                            </button>

                            <button className="w-full bg-[#0f0f23] hover:bg-[#1f1f3a] border border-gray-700 hover:border-purple-500/40 rounded-xl p-4 transition-all duration-200 text-left group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                                        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold mb-1">Upload a slide deck</h3>
                                        <p className="text-gray-400 text-sm">Turn any PDF or PPT into a narrated video.</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
