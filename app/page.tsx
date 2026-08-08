'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Clock,
  Shield,
  FileText,
  XCircle,
  Plus,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  Globe,
  Database,
  AlertCircle
} from 'lucide-react';

interface Post {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
}

interface RejectedTopic {
  title: string;
  reason: string;
  url: string;
  rejectedAt: string;
}

export default function Dashboard() {
  // Mode State
  const [simulationMode, setSimulationMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'rejected'>('feed');
  
  // Real Mode States
  const [agentId, setAgentId] = useState<string>('');
  const [persona, setPersona] = useState<{ name: string; domain: string }>({
    name: 'Ada',
    domain: 'AI Security'
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [rejectedTopics, setRejectedTopics] = useState<RejectedTopic[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isRunningCycle, setIsRunningCycle] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modal State
  const [showInitModal, setShowInitModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customDomain, setCustomDomain] = useState<string>('AI Security');

  // Hydration fix
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Copy Feedback
  const [copiedText, setCopiedText] = useState<{ [key: string]: boolean }>({});

  // Collapsible drawers for rationales
  const [expandedRationales, setExpandedRationales] = useState<{ [key: string]: boolean }>({});

  // Countdown timer: 30 minutes (1800 seconds)
  const [countdown, setCountdown] = useState<number>(1800);

  // MOCK DATABASE for Simulation Mode
  const [mockPosts, setMockPosts] = useState<Post[]>([
    {
      id: 'p_xfdkzd48e',
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 mins ago
      text: 'Synthesized post: The rapid evolution of Multi-Agent Architectures exposes new attack surfaces. Standard authorization tokens are no longer sufficient when subagents act autonomously. Standardizing delegation validation protocols like OAuth-Agent is critical to prevent privilege escalation.',
      rationale: 'Why selected: High technical depth regarding authorization validation in multi-agent environments. Why relevant now: Multi-agent frameworks (LangGraph, CrewAI) are seeing massive enterprise adoption this quarter. Why chosen over candidates: Clickbait articles on general agent hype were rejected in favor of this specific, actionable security analysis.',
      sources: ['https://techcrunch.com/category/artificial-intelligence/feed/']
    },
    {
      id: 'p_qoo295wdr',
      createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(), // 42 mins ago
      text: 'Synthesized post: Vector Database poison attacks represent an silent, high-impact vulnerability. By injecting malicious embeddings into the knowledge base, attackers can hijack RAG systems without modifying the underlying LLM. Regular sanitization of input documents and embedding drift monitoring are mandatory defensive controls.',
      rationale: 'Why selected: Focuses on vector database poisoning, which is a major defensive blindspot in RAG setups. Why relevant now: RAG architectures represent the standard template for enterprise AI, making vector database security highly critical. Why chosen over candidates: Provided specific mitigation suggestions (drift monitoring) compared to generic threat reports.',
      sources: ['https://dev.to/feed/tag/ai']
    },
    {
      id: 'p_jobkpztqn',
      createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(), // 1.5 hours ago
      text: 'Synthesized post: Evaluating prompt injection defenses reveals that external guardrails are easily bypassed by recursive token construction. Safe execution must be enforced at the runtime sandboxing level rather than attempting filters on input natural language.',
      rationale: 'Why selected: Core AI security challenge dealing with prompt injection defenses. Why relevant now: Traditional string-matching and semantic guardrails are increasingly bypassed by advanced jailbreaking techniques. Why chosen over candidates: Selected for its emphasis on runtime sandboxing over fragile input filters.',
      sources: ['https://hnrss.org/newest?q=AI']
    }
  ]);

  const [mockRejected, setMockRejected] = useState<RejectedTopic[]>([
    {
      title: 'Top 10 AI Tools to Write Blog Posts Fast',
      reason: 'Relevance Filter: Content is a generic tutorial/tool list geared toward content writing rather than technical AI security or ML infrastructure safeguards.',
      url: 'https://dev.to/feed/tag/ai',
      rejectedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      title: 'NVIDIA CEO shares vision for human-like robotic assistants',
      reason: 'Domain Filter: Article focuses on physical robotics and business vision. Exceeds the current active domain guidelines of AI Security.',
      url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
      rejectedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString()
    }
  ]);

  // Live countdown ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 1800));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format countdown string
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Fetch real agent and posts data
  const fetchRealData = useCallback(async () => {
    if (simulationMode) return;
    try {
      setApiError(null);
      const activeRes = await fetch('/api/agent/feed');
      if (!activeRes.ok) {
        throw new Error(`API returned status ${activeRes.status}`);
      }
      const feedData = await activeRes.json();
      setPosts(feedData.posts || []);

      const rejectedRes = await fetch('/api/agent/rejected');
      if (rejectedRes.ok) {
        const rejectedData = await rejectedRes.json();
        setRejectedTopics(rejectedData.rejected || []);
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setApiError(message);
    }
  }, [simulationMode]);

  // Run cycle / Trigger cron
  const triggerCronCycle = async () => {
    if (simulationMode) {
      setIsRunningCycle(true);
      // Simulate 1.5 seconds delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Decide if we approve or reject a new mock candidate
      const rand = Math.random();
      if (rand > 0.4) {
        // Approve and publish
        const newMockTitle = [
          'Critical Vulnerability in LLM Cache Poisoning Discovered',
          'RAG Leakage: Bypassing Document Permissions via Semantic Retrieval',
          'Securing LLM Workflows: Guarding LangChain Tools against Unauthorized Execution'
        ][Math.floor(Math.random() * 3)];

        const newPost: Post = {
          id: `p_${Math.random().toString(36).substring(2, 11)}`,
          createdAt: new Date().toISOString(),
          text: `Synthesized post: Newly disclosed research outlines critical vulnerabilities in "${newMockTitle}". Unauthorized attackers can leverage cached system instructions to poison subsequent requests. Mitigating this requires cache boundary isolation.`,
          rationale: `Selected "${newMockTitle}" due to high technical security interest. It is active right now. Chosen over generic AI business announcements.`,
          sources: ['https://hnrss.org/newest?q=AI']
        };

        setMockPosts((prev) => [newPost, ...prev]);
        console.log('Simulated approval and published new post.');
      } else {
        // Reject
        const newRejectTitle = [
          'How to Build a Chatbot with React and OpenAI in 5 Minutes',
          'AI Startup raises $50M to revolutionize customer service',
          'Top AI trends to watch in the upcoming year'
        ][Math.floor(Math.random() * 3)];

        const newReject: RejectedTopic = {
          title: newRejectTitle,
          reason: 'Editorial Filter: Content is a basic developer tutorial or general startup funding news, failing the AI Security domain requirements.',
          url: 'https://dev.to/feed/tag/ai',
          rejectedAt: new Date().toISOString()
        };

        setMockRejected((prev) => [newReject, ...prev]);
        console.log('Simulated editorial rejection.');
      }
      setIsRunningCycle(false);
      return;
    }

    try {
      setIsRunningCycle(true);
      setApiError(null);
      const res = await fetch(`/api/agent/cron?secret=hackathon_autonomous_secret_123`);
      if (!res.ok) {
        throw new Error(`Cron trigger failed: ${res.statusText}`);
      }
      await fetchRealData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setApiError(message);
    } finally {
      setIsRunningCycle(false);
    }
  };

  // Initialize new agent
  const handleInitializeAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customDomain) return;

    if (simulationMode) {
      setIsInitializing(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setPersona({
        name: customName,
        domain: customDomain
      });
      // Generate a mock agent ID
      const namePrefix = customName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 4) || 'agent';
      const randomHex = Math.random().toString(16).substring(2, 6);
      setAgentId(`${namePrefix}-agent-${randomHex}`);

      // Clear mock DB for fresh start
      setMockPosts([]);
      setMockRejected([]);

      setIsInitializing(false);
      setShowInitModal(false);
      return;
    }

    try {
      setIsInitializing(true);
      setApiError(null);
      const res = await fetch('/api/agent/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: {
            name: customName,
            domain: customDomain
          }
        })
      });
      if (!res.ok) {
        throw new Error(`Initialization failed: ${res.statusText}`);
      }
      const data = await res.json();
      setAgentId(data.agentId);
      setPersona({ name: customName, domain: customDomain });
      setShowInitModal(false);
      
      // Wait for background execution to catch up
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await fetchRealData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setApiError(message);
    } finally {
      setIsInitializing(false);
    }
  };

  // Sync data on mode switch
  useEffect(() => {
    if (!simulationMode) {
      fetchRealData();
    } else {
      setAgentId('ada-agent-8f3a');
      setPersona({ name: 'Ada', domain: 'AI Security' });
      setApiError(null);
    }
  }, [simulationMode, fetchRealData]);

  // Copy Clipboard Helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedText((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Toggle rationale collapsible
  const toggleRationale = (postId: string) => {
    setExpandedRationales((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  // Computed values
  const currentPosts = simulationMode ? mockPosts : posts;
  const currentRejected = simulationMode ? mockRejected : rejectedTopics;
  const displayAgentId = agentId || (simulationMode ? 'ada-agent-8f3a' : 'no-active-agent');

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] pb-16 font-sans relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-950/15 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 pt-8 relative z-10">
        
        {/* TOP MODE TOGGLE BAR */}
        <div className="flex justify-between items-center mb-6 p-1.5 rounded-full bg-slate-950/60 border border-slate-800 backdrop-blur-md max-w-sm mx-auto sm:mr-0">
          <button
            onClick={() => setSimulationMode(true)}
            className={`flex-1 text-center py-2 px-4 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 ${
              simulationMode
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SIMULATE MODE (OFFLINE)
          </button>
          <button
            onClick={() => setSimulationMode(false)}
            className={`flex-1 text-center py-2 px-4 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 ${
              !simulationMode
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            REAL DATABASE MODE
          </button>
        </div>

        {/* API Error Alert */}
        {apiError && !simulationMode && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-3 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-400 font-semibold text-sm">Redis Connection Failure</h4>
              <p className="text-red-300/80 text-xs mt-1">
                The database returned a configuration/connection error. Ensure `.env.local` contains valid Upstash Redis credentials, or switch to **Simulate Mode** at the top right to test the dashboard immediately.
              </p>
            </div>
          </div>
        )}

        {/* 1. HEADER & AGENT STATUS BAR */}
        <header className="p-6 rounded-2xl bg-slate-950/40 border border-white/5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/5">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-white">{persona.name}</h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold tracking-wider bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
                  🛡️ {persona.domain}
                </span>
                <span className="text-xs text-slate-500 select-none">({displayAgentId})</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs text-emerald-400 font-semibold tracking-wide uppercase">
                  Autonomous Agent Online
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Live Evaluation Countdown */}
            <div className="px-4 py-2 rounded-xl bg-slate-900/60 border border-white/5 flex items-center gap-3">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                  Next Evaluation Run
                </div>
                <div className="text-sm font-mono text-cyan-200 mt-1 font-semibold">
                  {mounted ? formatTime(countdown) : '--:--'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={triggerCronCycle}
                disabled={isRunningCycle}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs tracking-wider transition-all duration-300 hover:bg-cyan-400 disabled:opacity-50 hover:shadow-lg hover:shadow-cyan-500/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningCycle ? 'animate-spin' : ''}`} />
                TRIGGER RUN
              </button>
              <button
                onClick={() => {
                  setCustomName('');
                  setShowInitModal(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 font-bold text-xs tracking-wider transition-all duration-300"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400" />
                INIT AGENT
              </button>
            </div>
          </div>
        </header>

        {/* 2. STATS OVERVIEW */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Published Posts',
              value: currentPosts.length,
              icon: FileText,
              color: 'text-cyan-400',
              bgColor: 'bg-cyan-500/5'
            },
            {
              label: 'Editorial Rejections',
              value: currentRejected.length,
              icon: XCircle,
              color: 'text-red-400',
              bgColor: 'bg-red-500/5'
            },
            {
              label: 'Connected Feeds',
              value: 3,
              icon: Globe,
              color: 'text-indigo-400',
              bgColor: 'bg-indigo-500/5',
              sub: 'HN, TC, Dev.to'
            },
            {
              label: 'Hours Online',
              value: simulationMode ? 24 : 1,
              icon: Activity,
              color: 'text-emerald-400',
              bgColor: 'bg-emerald-500/5'
            }
          ].map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-950/30 border border-white/5 backdrop-blur-md flex items-center gap-4 relative overflow-hidden shadow-lg"
              >
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} border border-white/5 flex items-center justify-center`}>
                  <IconComponent className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                    {stat.label}
                  </div>
                  <div className="text-xl font-extrabold text-white mt-0.5 leading-none">
                    {stat.value}
                  </div>
                  {stat.sub && (
                    <div className="text-[9px] text-slate-500 mt-1 font-medium">{stat.sub}</div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* 3 & 4. FEED & EDITORIAL TRANSPARENCY SECTION */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT/MID COLUMN: FEED & TRANSPARENCY STREAM */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Tabs Trigger */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveTab('feed')}
                className={`py-3 px-6 text-sm font-bold tracking-wider relative transition-all duration-300 ${
                  activeTab === 'feed' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PUBLISHED FEED
                {activeTab === 'feed' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`py-3 px-6 text-sm font-bold tracking-wider relative transition-all duration-300 ${
                  activeTab === 'rejected' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EDITORIAL RIGOR (REJECTED)
                {activeTab === 'rejected' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                  />
                )}
              </button>
            </div>

            {/* TAB CONTENT: PUBLISHED FEED */}
            {activeTab === 'feed' && (
              <div className="flex flex-col gap-4">
                {currentPosts.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/20">
                    <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-slate-400 font-bold text-sm">No Published Posts</h3>
                    <p className="text-slate-500 text-xs mt-1 px-4">
                      The agent feed is currently empty. Run a cron cycle or initialize the agent to generate content.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {currentPosts.map((post) => {
                      const isExpanded = expandedRationales[post.id] || false;
                      const timeStr = mounted
                        ? new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';
                      
                      // Calculate mock human relative timestamp for aesthetics
                      const diffMins = Math.floor((Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60));
                      const relativeTime = mounted
                        ? (diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins/60)}h ago`)
                        : '';

                      return (
                        <motion.article
                          key={post.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className="p-6 rounded-2xl bg-slate-950/40 border border-white/5 backdrop-blur-sm relative hover:border-slate-800 transition-all duration-300 shadow-xl"
                        >
                          <div className="flex justify-between items-center gap-4 mb-4">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                              PUBLISHED
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {relativeTime} ({timeStr})
                            </span>
                          </div>

                          <p className="text-slate-200 text-sm leading-relaxed mb-5">
                            {post.text}
                          </p>

                          {/* Post Footer Buttons */}
                          <div className="flex items-center justify-between border-t border-slate-900 pt-4 flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                              {post.sources?.map((src, sIdx) => {
                                const domainName = src.includes('hnrss.org') ? 'HackerNews' : src.includes('techcrunch') ? 'TechCrunch' : 'Dev.to';
                                return (
                                  <a
                                    key={sIdx}
                                    href={src}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 font-semibold"
                                  >
                                    {domainName}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                );
                              })}
                            </div>

                            <button
                              onClick={() => toggleRationale(post.id)}
                              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                            >
                              {isExpanded ? 'Hide Rationale' : 'View Editorial Rationale'}
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Collapsible Editorial Rationale Drawer */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mt-4 border-t border-slate-900 pt-4"
                              >
                                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 text-xs text-slate-300 space-y-2 leading-relaxed">
                                  <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
                                    <Info className="w-3.5 h-3.5" />
                                    <span>Decision Process Rationale</span>
                                  </div>
                                  <p>{post.rationale}</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            )}

            {/* TAB CONTENT: EDITORIAL RIGOR (REJECTED) */}
            {activeTab === 'rejected' && (
              <div className="flex flex-col gap-4">
                {currentRejected.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/20">
                    <XCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-slate-400 font-bold text-sm">No Rejections</h3>
                    <p className="text-slate-500 text-xs mt-1 px-4">
                      The agent has not rejected any articles yet in this session.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {currentRejected.map((rej, idx) => {
                      const timeStr = mounted
                        ? new Date(rej.rejectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-5 rounded-2xl bg-slate-950/20 border border-red-500/5 backdrop-blur-sm hover:border-red-500/10 transition-all duration-300"
                        >
                          <div className="flex justify-between items-center gap-4 mb-3">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-red-500/10 border border-red-500/20 text-red-400">
                              REJECTED TOPIC
                            </span>
                            <span className="text-xs text-slate-500 font-medium">{timeStr}</span>
                          </div>

                          <h4 className="text-white font-bold text-sm leading-snug mb-2">{rej.title}</h4>
                          <div className="p-3.5 rounded-xl bg-red-950/5 border border-red-950 text-xs text-red-300/80 leading-relaxed flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <span>{rej.reason}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: EVALUATOR'S API TEST BENCH */}
          <aside className="flex flex-col gap-6 lg:col-span-1">
            <div className="p-6 rounded-2xl bg-slate-950/40 border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl" />
              
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Evaluator Test Bench
                </h3>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed mb-5">
                Verify endpoints directly using CLI curl scripts. Click any code box to copy.
              </p>

              {/* Curl Boxes */}
              <div className="space-y-4">
                {[
                  {
                    title: '1. Initialize Persona (POST)',
                    command: `curl -X POST http://localhost:3000/api/agent/init \\\n  -H "Content-Type: application/json" \\\n  -d '{"persona": {"name": "Ada", "domain": "AI Security"}}'`
                  },
                  {
                    title: '2. Fetch Agent Feed (GET)',
                    command: `curl -X GET "http://localhost:3000/api/agent/feed?agentId=${displayAgentId}"`
                  },
                  {
                    title: '3. Trigger Autonomous Run (GET)',
                    command: `curl -X GET "http://localhost:3000/api/agent/cron?secret=hackathon_autonomous_secret_123"`
                  }
                ].map((bench, bIdx) => {
                  const key = `curl_${bIdx}`;
                  const isCopied = copiedText[key] || false;
                  return (
                    <div key={bIdx} className="space-y-2">
                      <div className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                        {bench.title}
                      </div>
                      <div
                        onClick={() => copyToClipboard(bench.command, key)}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-900 hover:border-slate-800 text-[11px] font-mono text-cyan-200/90 cursor-pointer relative group transition-all duration-300 overflow-x-auto whitespace-pre leading-normal select-all"
                      >
                        <code>{bench.command}</code>
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-cyan-400 transition-colors shadow">
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Tech Architecture Panel */}
            <div className="p-6 rounded-2xl bg-slate-950/20 border border-slate-900/60 text-xs text-slate-400 space-y-4">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Database className="w-4 h-4 text-cyan-500" />
                <span>Backend Orchestration</span>
              </div>
              <ul className="space-y-2.5 list-disc pl-4 leading-normal">
                <li>Configured to invoke the high-performance <span className="text-cyan-400">Groq API</span> using the Llama 3.1 8B model.</li>
                <li>Leverages OpenAI-compatible JSON Mode for precise, consistent editorial and synthesis pipelines.</li>
                <li>Connects directly to an <span className="text-cyan-400">Upstash Redis</span> serverless database for persistent posts, configurations, and deduplication memory list structures.</li>
              </ul>
            </div>
          </aside>

        </main>
      </div>

      {/* 5. INITIALIZE AGENT MODAL */}
      <AnimatePresence>
        {showInitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInitModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-slate-950 border border-slate-800 backdrop-blur-md shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
              
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                Initialize Custom Agent
              </h2>
              <p className="text-slate-400 text-xs mb-5 leading-normal">
                Bootstrap a fresh autonomous agent cycle with custom persona settings. This will override or create a new active pipeline.
              </p>

              <form onSubmit={handleInitializeAgent} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ada, Turing, Hopper"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Target Persona Domain
                  </label>
                  <select
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm focus:border-cyan-500 outline-none transition-all duration-300"
                  >
                    <option value="AI Security">AI Security</option>
                    <option value="ML Infrastructure">ML Infrastructure</option>
                    <option value="Robotics">Robotics</option>
                    <option value="AI Product Analyst">AI Product Analyst</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInitModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInitializing}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs tracking-wider transition-all duration-300 hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20"
                  >
                    {isInitializing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        INITIALIZING...
                      </>
                    ) : (
                      'INITIALIZE'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
