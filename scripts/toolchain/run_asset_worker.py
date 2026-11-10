"""Run one explicitly authorized DeepSeek asset job, isolated from game integration.

The job directory must already contain a bounded AGENTS.md and TASK.md. Credentials
remain with the existing Codex provider helper. No models, tools or keys are installed.
"""
import argparse
import datetime
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import time
import tomllib


def stop_job_blenders(job):
    """Codex tools may create their own sessions; clean only this job's headless Blender."""
    stopped = []
    for entry in Path("/proc").iterdir():
        if not entry.name.isdigit():
            continue
        try:
            argv = (entry / "cmdline").read_bytes().split(b"\0")
            if not argv or Path(os.fsdecode(argv[0])).name != "blender":
                continue
            if b"--background" not in argv or b"--factory-startup" not in argv:
                continue
            if not (entry / "cwd").resolve(strict=True).is_relative_to(job):
                continue
            os.kill(int(entry.name), signal.SIGKILL)
            stopped.append(int(entry.name))
        except (OSError, ValueError):
            continue
    return stopped


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("job", type=Path)
    parser.add_argument("--revision", action="store_true")
    parser.add_argument("--image", type=Path)
    parser.add_argument("--minutes", type=int, default=15, choices=range(1, 21))
    args = parser.parse_args()
    job = args.job.resolve(strict=True)
    # Never run this authoring harness inside a source checkout or personal scene.
    root = Path.home() / ".local/share/four-lanterns-workers"
    if not job.is_relative_to(root.resolve()) or job == root.resolve():
        parser.error(f"job must be a dedicated directory under {root}")
    for name in ["AGENTS.md", "TASK.md"] + (["REVIEW.md"] if args.revision else []):
        if not (job / name).is_file():
            parser.error(f"missing job contract: {name}")
    if args.image and not args.image.resolve(strict=True).is_relative_to(job):
        parser.error("reference/review image must be inside this job")
    lock = (job / ".worker.lock").open("w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        parser.error("this job already has a worker running")

    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    prefix = job / ("revision-" if args.revision else "run-")
    prefix = Path(str(prefix) + stamp)
    command = [
        "codex", "exec", "--profile", "deepseek", "--ephemeral",
        "--sandbox", "workspace-write", "--skip-git-repo-check", "--cd", str(job),
    ]
    # Disable every locally registered MCP server for this bounded offline
    # authoring job; worker Blender uses its own background process instead.
    servers = set()
    for config in [Path.home() / ".codex/config.toml", Path.home() / ".codex/deepseek.config.toml"]:
        if config.exists():
            servers.update(tomllib.loads(config.read_text()).get("mcp_servers", {}))
    for name in sorted(servers):
        if not re.fullmatch(r"[A-Za-z0-9_-]+", name):
            parser.error("MCP server name needs manual configuration before this runner can disable it")
        command.extend(["-c", f"mcp_servers.{name}.enabled=false"])
    command.extend(["--json", "--output-last-message", str(prefix) + "-final.md"])
    if args.image:
        command.extend(["--image", str(args.image.resolve())])
    instruction = (
        "Read AGENTS.md, TASK.md and REVIEW.md. Revise the existing submission to address the organizer's findings."
        if args.revision else
        "Read AGENTS.md and TASK.md. Complete this bounded asset submission."
    )
    command.extend(["--", instruction + f" Work only in this job directory; no shared MCP scenes, network, installations, Git edits or extra agents. Finish within {args.minutes} minutes. Use bounded Blender commands with kill-after and stop repeated hangs. Keep logs compact; report actual limitations."])
    env = dict(os.environ, OPENBLAS_NUM_THREADS="1", OMP_NUM_THREADS="4")
    started = time.monotonic()
    timed_out = False
    with open(str(prefix) + "-events.jsonl", "w") as out, open(str(prefix) + "-stderr.log", "w") as err:
        process = subprocess.Popen(command, cwd=job, env=env, stdout=out, stderr=err, start_new_session=True)
        try:
            try:
                code = process.wait(timeout=args.minutes * 60)
            except subprocess.TimeoutExpired:
                timed_out = True
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    code = process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    code = process.wait()
        finally:
            # Includes stuck background Blender descendants after Codex finishes.
            # This group was created by us, never a personal Blender/window group.
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            stopped = stop_job_blenders(job)
    report = {"job": str(job), "seconds": round(time.monotonic() - started, 1), "exitCode": code, "timedOut": timed_out, "stoppedBlenders": stopped, "state": "submitted for organizer review" if code == 0 and not timed_out else "incomplete; inspect job logs"}
    Path(str(prefix) + "-run.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))
    return 124 if timed_out else code


if __name__ == "__main__":
    raise SystemExit(main())
