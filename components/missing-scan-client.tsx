"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithAuth, getAccessToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ScanSearch, 
  Calendar, 
  GitBranch, 
  Play, 
  Square, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Settings2,
  ChevronDown,
  ChevronUp,
  FileText,
  Zap
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface LogMessage {
  type: string;
  message?: string;
  jobId?: string;
  body?: any;
  json?: any;
  [key: string]: any;
}

export default function MissingScanClient() {
  const [branches, setBranches] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [positions, setPositions] = useState<string>('1,2');
  const [sampleFile, setSampleFile] = useState<string>('');
  const [autoQueue, setAutoQueue] = useState<boolean>(false);
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const esRef = useRef<EventSource | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/fetch/branches`, { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.branches)) setBranches(data.branches);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleSelectAll = (checked: boolean) => setSelected(checked ? branches.slice() : []);

  const toggleBranch = (branch: string) => {
    setSelected(prev => 
      prev.includes(branch) 
        ? prev.filter(b => b !== branch)
        : [...prev, branch]
    );
  };

  const handleStartScan = async () => {
    const body: any = {};
    if (selected && selected.length) body.branches = selected;
    if (positions) body.positions = positions;
    if (start) body.start = start;
    if (end) body.end = end;
    if (sampleFile) body.sampleFile = sampleFile;
    if (autoQueue) body.autoQueue = true;

    setMessages(prev => [...prev, { type: 'scan-start', body }]);

    const resp = await fetchWithAuth(`${API_BASE}/api/fetch/missing/scan`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    });
    const json = await resp.json();
    if (!resp.ok) {
      setMessages(prev => [...prev, { type: 'error', message: json?.message || 'Scan failed' }]);
      return;
    }

    setScanResult(json);
    setMessages(prev => [...prev, { type: 'scan-result', json }]);

    // if queued, open SSE for jobId
    if (json.queued && json.jobId) {
      setIsRunning(true);
      const token = getAccessToken();
      const tokenQuery = token ? `&token=${encodeURIComponent(token.startsWith('Bearer ') ? token.replace(/^Bearer\s+/, '') : token)}` : '';
      const url = `${API_BASE}/api/fetch/status/stream?jobId=${encodeURIComponent(json.jobId)}${tokenQuery}`;
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      const es = new EventSource(url);
      esRef.current = es;
      es.onmessage = (ev) => {
        try { 
          const d = JSON.parse(ev.data); 
          setMessages(prev => [...prev, d]); 
          if (d.type === 'complete' || d.type === 'error') {
            setIsRunning(false);
            try{es.close()}catch(e){} 
          }
        } catch(e){ 
          setMessages(prev => [...prev, {type:'sse-raw', data:ev.data}]); 
        }
      };
      es.onerror = () => { 
        setMessages(prev => [...prev, {type:'sse-error'}]); 
        setIsRunning(false);
        try{es.close()}catch(e){} 
      };
    }
  };

  const handleStop = () => { 
    if (esRef.current) { 
      esRef.current.close(); 
      esRef.current = null; 
      setIsRunning(false);
      setMessages(prev => [...prev, {type:'stopped', message: 'Stopped by user'}]); 
    } 
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'complete':
      case 'scan-result':
      case 'queued':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case 'error':
      case 'sse-error':
        return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'stopped':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />;
      case 'progress':
      case 'batch':
      case 'scan-start':
        return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
      default:
        return <span className="text-gray-500">●</span>;
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'complete':
      case 'scan-result':
      case 'queued':
        return 'text-green-400';
      case 'error':
      case 'sse-error':
        return 'text-red-400';
      case 'stopped':
        return 'text-yellow-400';
      case 'progress':
      case 'batch':
      case 'scan-start':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#bd202e] to-[#9a1a25] shadow-lg shadow-[#bd202e]/20">
            <ScanSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Missing Scan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Detect missing attendance records</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="py-4 space-y-4">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#bd202e] focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#bd202e] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Positions */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5" />
                  Positions
                </Label>
                <Input
                  value={positions}
                  onChange={(e) => setPositions(e.target.value)}
                  placeholder="1,2"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#bd202e] focus:border-transparent"
                />
              </div>

              {/* Sample File */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Sample File (Optional)
                </Label>
                <Input
                  value={sampleFile}
                  onChange={(e) => setSampleFile(e.target.value)}
                  placeholder="latest/BRANCH/2026-02-01/sample.csv"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#bd202e] focus:border-transparent text-xs"
                />
              </div>

              {/* Branches */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5" />
                    Branches
                  </Label>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-auto p-0 text-[#bd202e] hover:text-[#9a1a25]"
                    onClick={() => toggleSelectAll(selected.length === branches.length ? false : true)}
                  >
                    {selected.length === branches.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  {branches.map((branch) => (
                    <label
                      key={branch}
                      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded transition-colors"
                    >
                      <Checkbox
                        checked={selected.includes(branch)}
                        onCheckedChange={() => toggleBranch(branch)}
                        className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-[#bd202e] data-[state=checked]:border-[#bd202e]"
                      />
                      <span className="truncate text-xs">{branch}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Auto Queue Toggle */}
              <label className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                <Checkbox
                  checked={autoQueue}
                  onCheckedChange={(checked) => setAutoQueue(checked as boolean)}
                  className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-[#bd202e] data-[state=checked]:border-[#bd202e]"
                />
                <span className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Auto-queue missing fetch jobs
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleStartScan}
                  disabled={isRunning}
                  className="flex-1 bg-gradient-to-r from-[#bd202e] to-[#9a1a25] hover:from-[#9a1a25] hover:to-[#7a141c] text-white shadow-lg shadow-[#bd202e]/25 hover:shadow-[#bd202e]/40 transition-all"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Scan
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStop}
                  disabled={!isRunning}
                  className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800 transition-colors"
                >
                  <Square className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal & Results */}
      <div className="flex-1 mt-4 min-h-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Terminal className="w-3.5 h-3.5" />
            Output Console
          </div>
          {isRunning && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-xs text-red-500">Live</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 flex-1 min-h-0">
          {/* Messages Terminal */}
          <div className="flex-1 min-w-0">
            <div
              ref={terminalRef}
              className="h-[200px] overflow-y-auto bg-[#0d1117] dark:bg-[#0d1117] rounded-lg border border-slate-800 p-3 font-mono text-xs"
            >
              {messages.length === 0 ? (
                <div className="text-slate-500 italic">Ready to scan...</div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className="flex gap-2 py-0.5">
                    <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                    {getStatusIcon(m.type)}
                    <span className={getStatusColor(m.type)}>
                      {m.message || m.raw || (m.data ? m.data : JSON.stringify(m, null, 0))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scan Results */}
          <div className="flex-1 min-w-0">
            <div className="h-[200px] overflow-y-auto bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-3 font-mono text-xs">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Scan Results
              </div>
              {scanResult ? (
                <pre className="text-green-600 dark:text-green-400 whitespace-pre-wrap">
                  {JSON.stringify(scanResult, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-400 italic">No results yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
