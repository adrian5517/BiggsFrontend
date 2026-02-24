"use client";

import Link from "next/dist/client/link";
import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const KNOWN_BRANCHES = [
  "AYALA-FRN", "BETA", "B-CPOL", "B-SMS", "BIA", "BMC", "BRLN", "BPAG",
  "BGRAN", "BTAB", "CAMALIG", "CNTRO", "DAET", "DAR", "EME", "GOA", 
  "IRIGA", "MAGS", "MAS", "OLA", "PACML", "ROB-FRN", "SANPILI", "SIPOCOT", 
  "SMLGZ-FRN", "SMLIP", "SMNAG", "ROXAS"
];
const KNOWN_BRANCH_SET = new Set(KNOWN_BRANCHES);

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsvTable(csvText: string) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

export default function CombinedFilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [listLimit] = useState(20);
  const [listBranchFilter, setListBranchFilter] = useState("");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [content, setContent] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [modalSearchInput, setModalSearchInput] = useState("");
  const [modalBranchInput, setModalBranchInput] = useState("");
  const [modalPage, setModalPage] = useState(1);
  const modalPageSize = 200;

  async function load() {
    const query = new URLSearchParams({
      page: String(listPage),
      limit: String(listLimit),
    });

    if (listBranchFilter) {
      query.set("branch", listBranchFilter);
    }

    const res = await fetch(`${API_BASE}/api/files/combined?${query.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setTotalFiles(Number(data.total || 0));
    setAvailableBranches(Array.isArray(data.branches) ? data.branches : []);
    setFiles(Array.isArray(data.files) ? data.files : []);
  }

  useEffect(() => {
    load();
  }, [listPage, listLimit, listBranchFilter]);

  useEffect(() => {
    setModalPage(1);
  }, [modalSearchInput, modalBranchInput, selected?.path]);

  async function openPreview(file: any) {
    setSelected(file);
    setModalSearchInput("");
    setModalBranchInput("");
    try { window.dispatchEvent(new CustomEvent('sidebar:set', { detail: { collapsed: true, hideMobile: true } })); } catch (e) {}
    
    const res = await fetch(`${API_BASE}/api/files/combined/view?file=${encodeURIComponent(file.path)}`);
    if (!res.ok) {
      setContent("Failed to load preview");
      setHeaders([]);
      setRows([]);
      return;
    }

    const text = await res.text();
    setContent(text);
    const parsed = parseCsvTable(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
  }

  const normalizedHeaders = headers.map((header) => String(header || "").trim().toLowerCase());
  const branchIndex = normalizedHeaders.findIndex((header) => 
    header === "branch" || header.includes("branch") || header === "branchcode" || header === "branch_code"
  );
  
  // Helper function to clean cell values
  const cleanCell = (cell: any) => String(cell || "").replace(/^"|"$/g, "").trim();
  
  const modalBranchSet = new Set<string>();

  if (branchIndex >= 0) {
    rows.forEach((row) => {
      const value = cleanCell(row[branchIndex]).toUpperCase();
      if (value && value.length > 0) {
        modalBranchSet.add(value);
      }
    });
  }

  // If no branches found from branch column, search in all cells
  if (!modalBranchSet.size) {
    rows.forEach((row) => {
      row.forEach((cell) => {
        const cleaned = cleanCell(cell).toUpperCase();
        if (KNOWN_BRANCH_SET.has(cleaned)) {
          modalBranchSet.add(cleaned);
        }
      });
    });
  }

  // If still no branches found, search content
  if (!modalBranchSet.size && content) {
    KNOWN_BRANCHES.forEach((branchCode) => {
      if (content.toUpperCase().includes(branchCode)) {
        modalBranchSet.add(branchCode);
      }
    });
  }

  const modalBranches = Array.from(modalBranchSet).sort();

  const doesRowMatchBranch = (row: string[], selectedBranch: string) => {
    const normalizedSelected = cleanCell(selectedBranch).toUpperCase();
    if (!normalizedSelected) return true;

    const matchesCell = (cell: any) => {
      const cleaned = cleanCell(cell).toUpperCase();
      if (!cleaned) return false;
      if (cleaned === normalizedSelected) return true;
      if (cleaned.includes(normalizedSelected)) return true;
      const tokens = cleaned.split(/[^A-Z0-9-]+/).filter(Boolean);
      return tokens.includes(normalizedSelected);
    };

    if (branchIndex >= 0) {
      return matchesCell(row[branchIndex]);
    }

    return row.some((cell) => matchesCell(cell));
  };

  const filteredRows = rows.filter((row) => {
    const selectedBranch = cleanCell(modalBranchInput).toUpperCase();
    
    // If no branch selected, include all rows
    if (!selectedBranch) {
      if (!modalSearchInput) return true;
      const needle = modalSearchInput.toLowerCase();
      return row.some((cell) => cleanCell(cell).toLowerCase().includes(needle));
    }

    // Check if row matches selected branch
    const matchesBranch = doesRowMatchBranch(row, selectedBranch);

    if (!matchesBranch) return false;

    // Apply search filter if present
    if (!modalSearchInput) return true;
    const needle = modalSearchInput.toLowerCase();
    return row.some((cell) => cleanCell(cell).toLowerCase().includes(needle));
  });

  const listTotalPages = Math.max(1, Math.ceil(totalFiles / listLimit));
  const listStart = totalFiles === 0 ? 0 : (listPage - 1) * listLimit + 1;
  const listEnd = totalFiles === 0 ? 0 : Math.min(listPage * listLimit, totalFiles);

  const modalTotalPages = Math.max(1, Math.ceil(filteredRows.length / modalPageSize));
  const modalStart = filteredRows.length === 0 ? 0 : (modalPage - 1) * modalPageSize + 1;
  const modalEnd = filteredRows.length === 0 ? 0 : Math.min(modalPage * modalPageSize, filteredRows.length);
  const pagedFilteredRows = filteredRows.slice((modalPage - 1) * modalPageSize, modalPage * modalPageSize);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-start ">
        

        <Link href="/files" className="flex items-center gap-2 text-white bg-sky-500 hover:bg-yellow-500 rounded-lg hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
         View Files
        <svg className="w-6 h-6 text-white-800 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M5 4a2 2 0 0 0-2 2v1h10.968l-1.9-2.28A2 2 0 0 0 10.532 4H5ZM3 19V9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm11.707-7.707a1 1 0 0 0-1.414 1.414l.293.293H8a1 1 0 1 0 0 2h5.586l-.293.293a1 1 0 0 0 1.414 1.414l2-2a1 1 0 0 0 0-1.414l-2-2Z" clipRule="evenodd"/>
        </svg>
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Combined Files</h1>
        <p className="text-sm text-slate-500">Separate page for combiner outputs (different from Masterfile).</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={listBranchFilter}
          onChange={(e) => {
            setListBranchFilter(e.target.value);
            setListPage(1);
          }}
          className="border p-2 rounded w-56 text-sm"
        >
          <option value="">All branches</option>
          {availableBranches.map((branch) => (
            <option key={branch} value={branch}>{branch}</option>
          ))}
        </select>
        <span className="text-sm text-slate-600">
          {totalFiles === 0 ? "No records" : `Showing ${listStart}-${listEnd} of ${totalFiles}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded border text-sm disabled:opacity-40"
            onClick={() => setListPage((previous) => Math.max(1, previous - 1))}
            disabled={listPage <= 1}
          >
            Prev
          </button>
          <span className="text-sm text-slate-600">Page {listPage} / {listTotalPages}</span>
          <button
            type="button"
            className="px-3 py-1 rounded border text-sm disabled:opacity-40"
            onClick={() => setListPage((previous) => Math.min(listTotalPages, previous + 1))}
            disabled={listPage >= listTotalPages}
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="min-w-full table-auto">
          <thead className="text-left bg-yellow-400 text-white ">
            <tr>
              <th className="p-3 text-black">Filename</th>
              <th className="p-3 text-black">Branch</th>
              <th className="p-3 text-black">Size</th>
              <th className="p-3 text-black">Modified</th>
              <th className="p-3 text-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f, idx) => (
              <tr key={f.path} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="p-3 text-sm">{f.filename}</td>
                <td className="p-3 text-sm">{f.branch || "ALL"}</td>
                <td className="p-3 text-sm">{(Number(f.size || 0) / 1024).toFixed(1)} KB</td>
                <td className="p-3 text-sm">{new Date(f.mtime).toLocaleString()}</td>
                <td className="p-3 text-sm">
                  <button
                    className="mr-3 text-sm border border-blue-600 rounded px-2 py-1 bg-sky-500 text-white"
                    onClick={() => openPreview(f)}
                  >
                    Preview Table
                  </button>
                  <a
                    className="text-sm border border-green-600 rounded px-2 py-1 bg-green-500 text-white"
                    href={`${API_BASE}/api/files/combined/download?file=${encodeURIComponent(f.path)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 pt-20">
          <div className="bg-white w-full max-w-6xl rounded shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b h-full w-full bg-red-700 rounded-md bg-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-80 border border-gray-100">
              <div className="text-sm font-semibold text-white z-90">{selected.filename}</div>
              <button onClick={() => setSelected(null)} className="text-sm text-white px-3 py-1 bg-sky-500 border border-red-600 rounded">Close</button>
            </div>

            <div className="px-4 py-3 bg-yellow-500 rounded-md bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-70 border border-gray-100 ">
              <div className="flex gap-2 items-center">
                <input
                  value={modalSearchInput}
                  onChange={(e) => setModalSearchInput(e.target.value)}
                  className="border border-yellow-700 p-2 rounded w-80 bg-slate-100 text-black placeholder:text-yellow-700"
                  placeholder="Search this table"
                />
                <select
                  value={modalBranchInput}
                  onChange={(e) => setModalBranchInput(e.target.value)}
                  className="border p-2 rounded w-56 text-black"
                >
                  <option value="">All branches</option>
                  {(modalBranches.length ? modalBranches : KNOWN_BRANCHES).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <button
                  className="bg-slate-600 text-white px-4 py-2 rounded"
                  onClick={() => {
                    setModalSearchInput("");
                    setModalBranchInput("");
                    setModalPage(1);
                  }}
                >
                  Select All
                </button>
                <div className="ml-auto flex items-center gap-2 text-sm text-slate-700">
                  <span>{filteredRows.length === 0 ? "No rows" : `Showing ${modalStart}-${modalEnd} of ${filteredRows.length}`}</span>
                  <button
                    type="button"
                    className="px-3 py-1 rounded border bg-white disabled:opacity-40"
                    onClick={() => setModalPage((previous) => Math.max(1, previous - 1))}
                    disabled={modalPage <= 1}
                  >
                    Prev
                  </button>
                  <span>Page {modalPage} / {modalTotalPages}</span>
                  <button
                    type="button"
                    className="px-3 py-1 rounded border bg-white disabled:opacity-40"
                    onClick={() => setModalPage((previous) => Math.min(modalTotalPages, previous + 1))}
                    disabled={modalPage >= modalTotalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-auto" style={{ maxHeight: "65vh" }}>
              {!!headers.length ? (
                <table className="min-w-full table-auto text-sm ">
                  <thead className="border-b h-full w-full bg-sky-600 rounded-md bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-70 border border-gray-100 sticky top-0 z-10">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={`${h}-${i}`} className="p-2 text-left text-xs font-semibold text-black border-b">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedFilteredRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        {headers.map((_, colIndex) => (
                          <td key={`${rowIndex}-${colIndex}`} className="p-2 text-xs font-mono text-slate-700 border-b align-top">
                            {row[colIndex] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <pre className="p-3 font-mono text-xs text-slate-700">{content}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
