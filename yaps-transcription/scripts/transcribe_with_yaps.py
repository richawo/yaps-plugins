#!/usr/bin/env python3
"""Create a plain-text transcript through the installed Yaps CLI."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def resolve_cli_session(explicit: str | None) -> tuple[Path, dict[str, object]]:
    discovery = Path(__file__).with_name("yaps-cli-discovery.mjs")
    command = ["node", str(discovery), "--resolve-session"]
    if explicit:
        command.extend(["--override", explicit])
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=35,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise RuntimeError(
            "Yaps CLI discovery could not run. Use the plugin runner from a local "
            "ChatGPT, Codex, or Claude Code session and retry."
        ) from error
    if completed.returncode != 0:
        raise RuntimeError(
            completed.stderr.strip()
            or "The Yaps CLI could not be found or validated. Update Yaps and retry."
        )
    try:
        payload = json.loads(completed.stdout)
        resolved = payload["path"]
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise RuntimeError("Yaps CLI discovery returned an unexpected response.") from error
    if not isinstance(resolved, str) or not resolved:
        raise RuntimeError("Yaps CLI discovery returned an unexpected response.")
    if not isinstance(payload, dict):
        raise RuntimeError("Yaps CLI discovery returned an unexpected response.")
    return Path(resolved), payload


def resolve_cli(explicit: str | None) -> Path:
    return resolve_cli_session(explicit)[0]


class YapsCliError(RuntimeError):
    def __init__(self, message: str, exit_code: int = 1) -> None:
        super().__init__(message)
        self.exit_code = exit_code


def cli_failure_detail(completed: subprocess.CompletedProcess[str], fallback: str) -> str:
    # Current Yaps prints {"error", "error_code"} on stdout (plus an
    # "Error: ..." line on stderr); older builds print plain text on stderr
    # with an empty stdout. Progress lines (YAPS_CLI_PROGRESS=json) are NDJSON
    # on stderr and never an explanation.
    try:
        payload = json.loads(completed.stdout)
    except (json.JSONDecodeError, TypeError):
        payload = None
    if isinstance(payload, dict):
        message = payload.get("error")
        if isinstance(message, str) and message.strip():
            return message.strip()
    if completed.returncode == 130:
        return "The Yaps run was cancelled before it finished. No output was saved."
    lines = [
        line
        for line in (completed.stderr or "").splitlines()
        if line.strip() and not line.lstrip().startswith("{")
    ]
    return "\n".join(lines).strip() or (completed.stdout or "").strip() or fallback


def run_json(command: list[str], failure_message: str) -> dict[str, object]:
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        raise YapsCliError(
            cli_failure_detail(completed, failure_message),
            130 if completed.returncode == 130 else 1,
        )
    try:
        result = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Yaps returned invalid JSON: {error}") from error
    if not isinstance(result, dict):
        raise RuntimeError("Yaps returned an unexpected response.")
    return result


def cli_command(
    cli: Path, *args: str, settings_path: Path | None = None
) -> list[str]:
    command = [str(cli)]
    if settings_path is not None:
        command.extend(["--settings-path", str(settings_path)])
    command.extend(["--pretty", *args])
    return command


def ensure_active_account(
    cli: Path, resolved_session: dict[str, object] | None = None
) -> Path | None:
    if resolved_session is None:
        _, resolved_session = resolve_cli_session(str(cli))
    status = {
        "authenticated": resolved_session.get("authenticated") is True,
        "status": resolved_session.get("account_status"),
        "diagnostic_code": resolved_session.get("diagnostic_code"),
        "account_code": resolved_session.get("account_code"),
        "account_message": resolved_session.get("account_message"),
        "auth_status_safety": resolved_session.get("auth_status_safety"),
    }
    selected = resolved_session.get("settings_path")
    if isinstance(selected, str) and selected.strip():
        status["selected_settings_path"] = selected
    if status.get("authenticated") is True and status.get("status") == "active":
        selected = status.get("selected_settings_path")
        return Path(selected) if isinstance(selected, str) else None

    account_message = status.get("account_message")
    if isinstance(account_message, str) and account_message.strip():
        raise RuntimeError(account_message.strip())

    state = str(status.get("status") or "unauthenticated")
    diagnostic = str(status.get("diagnostic_code") or "")
    if state == "credential_unavailable" or diagnostic == "keychain_unavailable":
        raise RuntimeError(
            "This Yaps helper uses an old credential-based status check. Update "
            "Yaps, keep it open, and retry. Do not approve a Keychain prompt or "
            "create another account; the ChatGPT and Yaps emails do not need to match."
        )
    if state == "credential_missing" or diagnostic == "credential_missing":
        raise RuntimeError(
            "Yaps found local account details but no reusable sign-in credential. "
            "Open Yaps and let it refresh the account; if it stays stuck, sign out "
            "and back in inside Yaps, then retry. The ChatGPT email is unrelated."
        )
    if state in {"cached_offline", "verification_unavailable"} or diagnostic in {
        "account_cache_incomplete",
        "refresh_failed",
        "profile_lookup_failed",
    }:
        raise RuntimeError(
            "Yaps found the sign-in, but could not validate it. Check the internet "
            "connection, keep Yaps open, and retry before changing accounts."
        )
    if state in {"unauthenticated", "settings_path_mismatch"}:
        raise RuntimeError(
            "Open Yaps and sign in first. Yaps has no free tier; after sign-in, "
            "start an available free trial or activate Yaps Pro inside the app. "
            "The ChatGPT and Yaps emails do not need to match."
        )

    next_step = "review the trial or Yaps Pro options on the account screen"
    if state == "platform_mismatch":
        next_step = "activate desktop-compatible Yaps access inside Yaps"
    raise RuntimeError(
        f"Yaps account access is not active ({state}). Open Yaps and {next_step}, "
        "then retry."
    )


STAGING_PREFIX = "yaps-transcription-"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Transcribe an audio or video file to plain text through Yaps."
    )
    parser.add_argument(
        "media", type=Path, nargs="?", help="Audio or video file to transcribe"
    )
    parser.add_argument("--output", type=Path, help="Destination .txt path")
    parser.add_argument("--yaps-cli", help="Explicit path to yaps or yaps_cli")
    parser.add_argument(
        "--force", action="store_true", help="Replace an existing output file"
    )
    parser.add_argument(
        "--detach",
        action="store_true",
        help="Queue the transcription as a Yaps background job and print its id",
    )
    parser.add_argument(
        "--collect",
        metavar="JOB_ID",
        help="Wait for a job queued with --detach and save its transcript to --output",
    )
    parser.add_argument(
        "--wait-secs",
        type=int,
        default=300,
        help="With --collect: how long to wait before reporting the job still running",
    )
    args = parser.parse_args()
    if args.collect and args.detach:
        parser.error("use either --detach or --collect")
    if args.collect and not args.output:
        parser.error("--collect needs --output")
    if not args.collect and args.media is None:
        parser.error("the media file is required")
    return args


def resolve_output(args: argparse.Namespace, media: Path | None) -> Path:
    if args.output:
        output = args.output.expanduser().resolve()
    else:
        assert media is not None
        output = media.with_name(f"{media.stem} Transcript.txt").resolve()
    if output.exists() and not args.force:
        raise RuntimeError(f"Output already exists: {output}. Use --force to replace it.")
    output.parent.mkdir(parents=True, exist_ok=True)
    return output


def write_transcript(result: dict[str, object], output: Path, media: object) -> int:
    transcript = str(result.get("transcript", "")).strip()
    if not transcript:
        raise RuntimeError("Yaps returned no speech for this file.")
    output.write_text(f"{transcript}\n", encoding="utf-8")
    summary = {
        "source_media": media,
        "output_path": str(output),
        "engine": result.get("engine"),
        "duration_secs": result.get("duration_secs"),
        "word_count": result.get("word_count"),
    }
    print(json.dumps(summary, indent=2))
    return 0


def detach(cli: Path, media: Path, output: Path, settings_path: Path | None) -> int:
    # The staging directory must outlive this process: the queued job writes
    # its SRT there, and --collect removes it once the transcript is saved.
    staging = Path(tempfile.mkdtemp(prefix=STAGING_PREFIX))
    command = cli_command(
        cli,
        "srt",
        "generate",
        str(media),
        "--output",
        str(staging / "transcript.srt"),
        "--detach",
        "--job-label",
        "transcription",
        settings_path=settings_path,
    )
    try:
        queued = run_json(command, "Yaps could not queue the transcription.")
    except YapsCliError as error:
        shutil.rmtree(staging, ignore_errors=True)
        if "--detach" in str(error):
            raise YapsCliError(
                "This Yaps version cannot queue background jobs. Update Yaps, or run "
                "the transcription without --detach.",
                2,
            ) from error
        raise
    job_id = queued.get("job_id")
    if not isinstance(job_id, str) or not job_id:
        shutil.rmtree(staging, ignore_errors=True)
        raise RuntimeError("Yaps did not return a job id for the queued transcription.")
    print(
        json.dumps(
            {
                "job_id": job_id,
                "status": queued.get("status", "queued"),
                "source_media": str(media),
                "output_path": str(output),
                "next": f"--collect {job_id} --output <the same output path>",
            },
            indent=2,
        )
    )
    return 0


def remove_staging(job: dict[str, object]) -> None:
    argv = job.get("argv")
    if not isinstance(argv, list) or "--output" not in argv:
        return
    index = argv.index("--output") + 1
    if index >= len(argv) or not isinstance(argv[index], str):
        return
    staging = Path(argv[index]).parent
    temp_root = Path(tempfile.gettempdir()).resolve()
    if staging.name.startswith(STAGING_PREFIX) and staging.resolve().parent == temp_root:
        shutil.rmtree(staging, ignore_errors=True)


def collect(
    cli: Path, job_id: str, output: Path, wait_secs: int, settings_path: Path | None
) -> int:
    completed = subprocess.run(
        cli_command(
            cli,
            "jobs",
            "wait",
            job_id,
            "--timeout-secs",
            str(max(1, wait_secs)),
            settings_path=settings_path,
        ),
        capture_output=True,
        text=True,
        check=False,
    )
    try:
        waited = json.loads(completed.stdout)
    except json.JSONDecodeError:
        waited = None
    jobs = waited.get("jobs") if isinstance(waited, dict) else None
    job = jobs[0] if isinstance(jobs, list) and jobs and isinstance(jobs[0], dict) else None
    if job is None:
        raise YapsCliError(cli_failure_detail(completed, "Yaps could not find that job."))
    if waited.get("timed_out") is True or job.get("status") in {"queued", "running"}:
        # Not a failure: the job keeps running in Yaps. Collect again later.
        print(json.dumps({"job_id": job_id, "status": job.get("status"), "done": False}, indent=2))
        return 0
    if job.get("status") != "succeeded":
        remove_staging(job)
        error = job.get("error")
        message = error.get("message") if isinstance(error, dict) else None
        raise YapsCliError(
            str(message or f"The transcription job ended as {job.get('status')}."),
            130 if job.get("status") == "cancelled" else 1,
        )
    result = run_json(
        cli_command(cli, "jobs", "result", job_id, settings_path=settings_path),
        "Yaps could not read the finished transcription.",
    )
    try:
        return write_transcript(result, output, result.get("media_path"))
    finally:
        remove_staging(job)


def main() -> int:
    args = parse_args()
    if args.collect:
        output = resolve_output(args, None)
        cli, resolved_session = resolve_cli_session(args.yaps_cli)
        selected = resolved_session.get("settings_path")
        settings_path = Path(selected) if isinstance(selected, str) and selected else None
        return collect(cli, args.collect, output, args.wait_secs, settings_path)

    media = args.media.expanduser().resolve()
    if not media.is_file():
        raise RuntimeError(f"Media file not found: {media}")
    output = resolve_output(args, media)

    cli, resolved_session = resolve_cli_session(args.yaps_cli)
    settings_path = ensure_active_account(cli, resolved_session)
    if args.detach:
        return detach(cli, media, output, settings_path)
    with tempfile.TemporaryDirectory(prefix=STAGING_PREFIX) as temp_dir:
        temporary_srt = Path(temp_dir) / "transcript.srt"
        command = cli_command(
            cli,
            "srt",
            "generate",
            str(media),
            "--output",
            str(temporary_srt),
            settings_path=settings_path,
        )
        result = run_json(command, "Yaps transcription failed.")
    return write_transcript(result, output, str(media))


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(getattr(error, "exit_code", 1))
