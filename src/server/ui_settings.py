import json
import re

import attr

from server.config import HOME

# Under $HOME rather than /app: openhost points HOME at the app's persistent data dir, so the
# user's choices survive image rebuilds. Anything written into /app does not.
UI_SETTINGS_PATH = HOME / ".workbench" / "ui.json"

DEFAULT_THEME = "solarized-light"
# Keep in sync with the THEMES map in ui/src/themes.js and the blocks in static/themes.css, where
# the default is the bare :root block rather than an attribute selector.
THEMES = ("dark", "solarized-light", "solarized-dark")

DEFAULT_TERMINAL_FONT_SIZE = 17
TERMINAL_FONT_SIZE_RANGE = (6, 48)
_MAX_FONT_FAMILY_LENGTH = 200
# A font family is a comma-separated list of names, some quoted; nothing else belongs in one, and
# xterm hands it to CSS and the canvas as-is.
_FONT_FAMILY_RE = re.compile(r"""[A-Za-z0-9 ,'"_.-]+""")


# Row height as a percentage of the font size. The bundled fonts declare tall line metrics, made
# for editors, so their natural spacing looks loose in a terminal; the client overrides their
# metrics to hit this exactly. Installed fonts can only be spaced out from their natural height.
DEFAULT_TERMINAL_LINE_HEIGHT = 120
TERMINAL_LINE_HEIGHT_RANGE = (80, 200)
# Extra pixels between characters; xterm takes whole pixels.
DEFAULT_TERMINAL_LETTER_SPACING = 0
TERMINAL_LETTER_SPACING_RANGE = (-3, 10)


def _whole_number_error(name: str, value: object, bounds: tuple[int, int]) -> str | None:
    low, high = bounds
    if not isinstance(value, int) or isinstance(value, bool) or not low <= value <= high:
        return f"{name} must be a whole number from {low} to {high}; got {value!r}"
    return None


def terminal_font_size_error(value: object) -> str | None:
    return _whole_number_error("terminal_font_size", value, TERMINAL_FONT_SIZE_RANGE)


def terminal_line_height_error(value: object) -> str | None:
    return _whole_number_error("terminal_line_height", value, TERMINAL_LINE_HEIGHT_RANGE)


def terminal_letter_spacing_error(value: object) -> str | None:
    return _whole_number_error("terminal_letter_spacing", value, TERMINAL_LETTER_SPACING_RANGE)


def terminal_font_family_error(value: object) -> str | None:
    """None is valid: it means the built-in font stack, so a later change to that stack still applies."""
    if value is None:
        return None
    if (
        not isinstance(value, str)
        or not value.strip()
        or len(value) > _MAX_FONT_FAMILY_LENGTH
        or not _FONT_FAMILY_RE.fullmatch(value)
    ):
        return (
            "terminal_font_family must be null or a CSS font-family list (letters, digits, spaces, commas, "
            f"quotes, - _ .), at most {_MAX_FONT_FAMILY_LENGTH} characters; got {value!r}"
        )
    return None


@attr.s(auto_attribs=True, frozen=True)
class UiSettings:
    side_panel: bool = False
    theme: str = DEFAULT_THEME
    # What the side panel shows. Server-side, unlike the panel's width, so that Claude can point it
    # at a dev server it just started; None until anyone has, and the panel shows its home page.
    side_panel_url: str | None = None
    terminal_font_size: int = DEFAULT_TERMINAL_FONT_SIZE
    # None means the client's built-in font stack.
    terminal_font_family: str | None = None
    terminal_line_height: int = DEFAULT_TERMINAL_LINE_HEIGHT
    terminal_letter_spacing: int = DEFAULT_TERMINAL_LETTER_SPACING

    def to_json(self) -> dict[str, bool | int | str | None]:
        return {
            "side_panel": self.side_panel,
            "theme": self.theme,
            "side_panel_url": self.side_panel_url,
            "terminal_font_size": self.terminal_font_size,
            "terminal_font_family": self.terminal_font_family,
            "terminal_line_height": self.terminal_line_height,
            "terminal_letter_spacing": self.terminal_letter_spacing,
        }

    def validate(self) -> None:
        if self.theme not in THEMES:
            raise ValueError(f"unknown theme {self.theme!r}; expected one of {', '.join(THEMES)}")
        for problem in (
            terminal_font_size_error(self.terminal_font_size),
            terminal_font_family_error(self.terminal_font_family),
            terminal_line_height_error(self.terminal_line_height),
            terminal_letter_spacing_error(self.terminal_letter_spacing),
        ):
            if problem is not None:
                raise ValueError(problem)


def load_ui_settings() -> UiSettings:
    """Read the persisted UI settings, falling back to defaults only when nothing is saved yet.

    A malformed file, or a value this build doesn't accept (an unknown theme, say), raises instead of quietly reverting to
    defaults — a setting that silently forgets what you chose is worse to debug than one that says
    so.
    """
    if not UI_SETTINGS_PATH.exists():
        return UiSettings()
    raw = json.loads(UI_SETTINGS_PATH.read_text())
    # .get() so a file written by an older build (before a setting existed) still loads.
    theme = str(raw.get("theme", DEFAULT_THEME))
    if theme not in THEMES:
        raise ValueError(f"unknown theme {theme!r} in {UI_SETTINGS_PATH}; expected one of {', '.join(THEMES)}")
    url = raw.get("side_panel_url")
    settings = UiSettings(
        side_panel=bool(raw.get("side_panel", False)),
        theme=theme,
        side_panel_url=None if url is None else str(url),
        terminal_font_size=raw.get("terminal_font_size", DEFAULT_TERMINAL_FONT_SIZE),
        terminal_font_family=raw.get("terminal_font_family"),
        terminal_line_height=raw.get("terminal_line_height", DEFAULT_TERMINAL_LINE_HEIGHT),
        terminal_letter_spacing=raw.get("terminal_letter_spacing", DEFAULT_TERMINAL_LETTER_SPACING),
    )
    try:
        settings.validate()
    except ValueError as e:
        raise ValueError(f"{e} (in {UI_SETTINGS_PATH})") from e
    return settings


def save_ui_settings(settings: UiSettings) -> None:
    """Persist settings via a temp file + rename, so an interrupted write can't corrupt the file."""
    settings.validate()
    UI_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = UI_SETTINGS_PATH.with_name(UI_SETTINGS_PATH.name + ".tmp")
    tmp_path.write_text(json.dumps(settings.to_json(), indent=2) + "\n")
    tmp_path.replace(UI_SETTINGS_PATH)
