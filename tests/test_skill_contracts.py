from __future__ import annotations

from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
SKILL_FILES = sorted((REPO_ROOT / "plugins").glob("yaps-*/skills/*/SKILL.md"))
PLUGIN_DIRS = sorted((REPO_ROOT / "plugins").glob("yaps-*"))


class SkillConversationContractTests(unittest.TestCase):
    def test_every_yaps_skill_is_a_friendly_generalist(self) -> None:
        self.assertGreaterEqual(len(SKILL_FILES), 11)

        required_fragments = (
            "## Generalist Yaps mode",
            "## Friendly completion and discovery",
            "## CLI discovery contract",
            "boundary around what it can",
            "same resolved `yaps_cli`",
            "ChatGPT web",
            "https://chatgpt.com/download/",
            "status",
            "settings list|get|set|unset",
            "auth status|usage|billing",
            "features list|dictation|cleanup|reading|subtitles|auto-captions",
            "vault status|list|get|create|update|move|rename|delete",
            "speech synthesize (alias: tts)",
            "srt generate",
            "meeting transcribe|show|correct|assign|rename-speaker|export",
            "captions styles|create|show|correct|replace|split|merge|style|reset|render|verify",
            "media extract-audio|remove-background",
            "audio clean",
            "translate",
            "history-list",
            "usage-local",
            "More with Yaps",
        )

        for skill_file in SKILL_FILES:
            with self.subTest(skill=skill_file):
                contents = " ".join(skill_file.read_text(encoding="utf-8").split())
                for fragment in required_fragments:
                    self.assertIn(" ".join(fragment.split()), contents, msg=f"Missing {fragment!r}")

    def test_every_yaps_plugin_has_private_operational_diagnostics(self) -> None:
        self.assertEqual(len(PLUGIN_DIRS), len(SKILL_FILES))
        for plugin_dir in PLUGIN_DIRS:
            with self.subTest(plugin=plugin_dir.name):
                runner = plugin_dir / "scripts" / "yaps-plugin-runner.mjs"
                self.assertTrue(runner.is_file(), msg=f"Missing {runner}")
                skill = next((plugin_dir / "skills").glob("*/SKILL.md"))
                contents = skill.read_text(encoding="utf-8")
                self.assertIn("## Private operational diagnostics", contents)
                self.assertIn("scripts/yaps-plugin-runner.mjs", contents)
                self.assertIn("must never contain the user's prompt or conversation", contents)
                self.assertIn("Never create or guess an owner marker", contents)
                self.assertNotIn("otherwise prefer the packaged", contents)
                self.assertNotIn("Local App Data", contents)
                self.assertNotIn('rerun it with `--settings-path', contents)
                self.assertNotIn("keep Yaps open and retry", contents)
                self.assertNotIn("Use the packaged `yaps_cli` path directly", contents)

    def test_task_skills_delegate_session_recovery_to_the_runner(self) -> None:
        for skill_file in SKILL_FILES:
            if "yaps-memory" in skill_file.parts:
                continue
            with self.subTest(skill=skill_file):
                contents = " ".join(skill_file.read_text(encoding="utf-8").split())
                self.assertIn(
                    "The runner follows a valid `recommended_settings_path` automatically",
                    contents,
                )
                self.assertIn("safely wakes the verified installed Yaps app", contents)

    def test_every_plugin_ships_the_generated_cli_discovery_runtime(self) -> None:
        shared = (REPO_ROOT / "plugins" / "shared" / "yaps-cli-discovery.mjs").read_bytes()
        reference_runner = (
            REPO_ROOT
            / "plugins"
            / "yaps-memory"
            / "scripts"
            / "yaps-plugin-runner.mjs"
        ).read_bytes()
        for plugin_dir in PLUGIN_DIRS:
            with self.subTest(plugin=plugin_dir.name):
                scripts = plugin_dir / "scripts"
                self.assertEqual(
                    (scripts / "yaps-cli-discovery.mjs").read_bytes(), shared
                )
                self.assertEqual(
                    (scripts / "yaps-plugin-runner.mjs").read_bytes(),
                    reference_runner,
                )

    def test_memory_explains_connector_specific_recovery(self) -> None:
        memory = (
            REPO_ROOT
            / "plugins"
            / "yaps-memory"
            / "skills"
            / "yaps-memory"
            / "SKILL.md"
        ).read_text(encoding="utf-8")
        self.assertIn("private-vault connector is unavailable", memory)
        self.assertIn("Never call that state “CLI missing.”", memory)


if __name__ == "__main__":
    unittest.main()
