"""Hold a just-launched Chrome to a few cores of this machine: a job CPU cap.

``scripts/browser_runner.mjs`` runs this once per browser it launches::

    python scripts/browser_cpu_cap.py <node pid> <cores> [--skip <pid> ...]

It finds the Chrome (or Edge) processes ``<node pid>`` started and has not
already capped, puts them in a new Windows job whose CPU rate is hard-capped at
``<cores>`` of this machine's logical processors, and prints the top browser
process's pid (the runner kills that tree if it is ever left open at exit).
Everything the browser starts afterwards -- renderers, a restarted GPU process --
is born in the same job, so the cap holds for the browser's whole life.

WHY A JOB AND NOT AFFINITY. Affinity is inherited, which looked like the
smaller tool, and Chrome undoes it: once its GPU code starts, the process that
hosts it (the GPU process, or the browser with ``--in-process-gpu``) sets its
own affinity back to every core, and every renderer it starts after that
inherits all of them. Measured 2026-10-21 -- runner at mask 0xF, its Chrome at
0xFFFFFFFF, 6.5 cores busy. A process cannot widen the limits of a job it is in.

Nested inside whatever job already holds the browser (dispatch's slot and
session jobs), which Windows 8 and later allow; the outer jobs still kill the
tree. The job outlives this process: it is gone when its last process is.

stdlib only (ctypes), Windows only; elsewhere it prints nothing and exits 0.
"""
from __future__ import annotations

import argparse
import ctypes
import os
import sys
from ctypes import wintypes

BROWSER_EXES = ("chrome.exe", "msedge.exe")

TH32CS_SNAPPROCESS = 0x2
PROCESS_SET_QUOTA = 0x0100
PROCESS_TERMINATE = 0x0001
JOB_OBJECT_CPU_RATE_CONTROL_INFORMATION = 15
JOB_OBJECT_CPU_RATE_CONTROL_ENABLE = 0x1
JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP = 0x4
# CpuRate is in 1/100ths of a percent of the whole machine.
FULL_RATE = 10000


class PROCESSENTRY32W(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD),
        ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD),
        ("th32DefaultHeapID", ctypes.c_size_t),
        ("th32ModuleID", wintypes.DWORD),
        ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD),
        ("pcPriClassBase", ctypes.c_long),
        ("dwFlags", wintypes.DWORD),
        ("szExeFile", ctypes.c_wchar * 260),
    ]


class CPU_RATE(ctypes.Structure):
    _fields_ = [("ControlFlags", wintypes.DWORD), ("CpuRate", wintypes.DWORD)]


def processes(kernel32) -> list[tuple[int, int, str]]:
    """Every process as ``(pid, parent pid, exe name)``."""
    snap = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    out = []
    try:
        entry = PROCESSENTRY32W()
        entry.dwSize = ctypes.sizeof(entry)
        ok = kernel32.Process32FirstW(snap, ctypes.byref(entry))
        while ok:
            out.append((entry.th32ProcessID, entry.th32ParentProcessID,
                        entry.szExeFile.lower()))
            ok = kernel32.Process32NextW(snap, ctypes.byref(entry))
    finally:
        kernel32.CloseHandle(snap)
    return out


def browser_tree(rows, parent: int, skip: set[int]) -> tuple[list[int], list[int]]:
    """The browser processes ``parent`` started (not in ``skip``), and every
    browser process below them."""
    tops = [pid for pid, ppid, exe in rows
            if ppid == parent and exe in BROWSER_EXES and pid not in skip]
    tree, frontier = list(tops), set(tops)
    while frontier:
        frontier = {pid for pid, ppid, exe in rows
                    if ppid in frontier and exe in BROWSER_EXES and pid not in tree}
        tree.extend(frontier)
    return tops, tree


def cap(top: int, pids: list[int], cores: int, kernel32) -> str | None:
    """A new job, hard-capped at ``cores`` of this machine, holding ``pids``.
    Returns why the top process is not in it, or None.

    Only ``top`` refusing is a failure. One of Chrome's utility processes is
    started inside a job of Chrome's own that cannot be nested, so it refuses
    with ERROR_ACCESS_DENIED every time (measured 2026-10-21); it rasterises
    nothing, and the processes that do -- the GPU process, the renderers, which
    the browser starts after this runs -- are in. The measured CPU is the
    evidence the cap holds (the lesson for handoff browser_runners_take_the_
    slot_and_free_the_box records it); this return only says when it cannot.
    """
    rate = max(1, min(FULL_RATE, FULL_RATE * cores // (os.cpu_count() or 1)))
    job = kernel32.CreateJobObjectW(None, None)
    if not job:
        return f"CreateJobObject failed ({ctypes.get_last_error()})"
    info = CPU_RATE(JOB_OBJECT_CPU_RATE_CONTROL_ENABLE | JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP,
                    rate)
    if not kernel32.SetInformationJobObject(job, JOB_OBJECT_CPU_RATE_CONTROL_INFORMATION,
                                            ctypes.byref(info), ctypes.sizeof(info)):
        return f"SetInformationJobObject failed ({ctypes.get_last_error()})"
    for pid in pids:
        handle = kernel32.OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, False, pid)
        if not handle:
            continue                       # already gone
        try:
            if not kernel32.AssignProcessToJobObject(job, handle) and pid == top:
                return f"AssignProcessToJobObject({pid}) failed ({ctypes.get_last_error()})"
        finally:
            kernel32.CloseHandle(handle)
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("parent", type=int, help="the pid that launched the browser")
    parser.add_argument("cores", type=int, help="how many of this machine's cores it may use")
    parser.add_argument("--skip", type=int, nargs="*", default=[],
                        help="top browser pids already capped")
    args = parser.parse_args(argv)
    if sys.platform != "win32":
        return 0
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    kernel32.CreateJobObjectW.restype = wintypes.HANDLE
    kernel32.OpenProcess.restype = wintypes.HANDLE
    tops, tree = browser_tree(processes(kernel32), args.parent, set(args.skip))
    if not tops:
        print(f"no browser process under pid {args.parent}", file=sys.stderr)
        return 1
    why = cap(tops[0], tree, args.cores, kernel32)
    print(tops[0])
    if why:
        print(why, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
