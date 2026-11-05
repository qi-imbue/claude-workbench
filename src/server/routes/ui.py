from typing import Any

from litestar import Request
from litestar import Response
from litestar import get
from litestar import post

from server.editor.settings import apply_theme
from server.routes.common import JsonDict
from server.routes.common import error
from server.routes.common import json_body
from server.ui_settings import THEMES
from server.ui_settings import UiSettings
from server.ui_settings import load_ui_settings
from server.ui_settings import save_ui_settings
from server.ui_settings import terminal_font_family_error
from server.ui_settings import terminal_font_size_error
from server.ui_settings import terminal_letter_spacing_error
from server.ui_settings import terminal_line_height_error


def _is_panel_url(value: object) -> bool:
    # Anything else in an iframe's src -- `javascript:` above all -- has no business there.
    if not isinstance(value, str):
        return False
    return (value.startswith("/") and not value.startswith("//")) or value.startswith(("http://", "https://"))


@get("/api/ui/settings", sync_to_thread=False)
def get_ui_settings() -> JsonDict:
    return load_ui_settings().to_json()


@post("/api/ui/settings", status_code=200)
async def update_ui_settings(request: Request[Any, Any, Any]) -> Response[JsonDict]:
    """Update UI settings. Keys left out keep their current value.

    Open pages poll these, so `side_panel` and `side_panel_url` reach them within a few seconds;
    `theme` and the terminal font are applied live by the client that set them, and reach other pages
    on their next load. `side_panel_url` is null for the panel's home page, a path on this origin (eg
    `/proxy/3000/`), or an http(s) URL. `terminal_font_family` is null for the built-in font stack;
    `terminal_line_height` is a percentage of the font size and `terminal_letter_spacing` is in pixels.
    """
    data = await json_body(request)
    known = {
        "side_panel",
        "theme",
        "side_panel_url",
        "terminal_font_size",
        "terminal_font_family",
        "terminal_line_height",
        "terminal_letter_spacing",
    }
    if not known & data.keys():
        return error(400, error=f"expected at least one of: {', '.join(sorted(known))}")

    current = load_ui_settings()
    theme = str(data.get("theme", current.theme))
    if theme not in THEMES:
        return error(400, error=f"unknown theme {theme!r}; expected one of: {', '.join(THEMES)}")

    url = data.get("side_panel_url", current.side_panel_url)
    if url is not None and not _is_panel_url(url):
        return error(400, error=f"side_panel_url must be null, a path starting with /, or an http(s) URL; got {url!r}")

    font_size = data.get("terminal_font_size", current.terminal_font_size)
    font_family = data.get("terminal_font_family", current.terminal_font_family)
    line_height = data.get("terminal_line_height", current.terminal_line_height)
    letter_spacing = data.get("terminal_letter_spacing", current.terminal_letter_spacing)
    for problem in (
        terminal_font_size_error(font_size),
        terminal_font_family_error(font_family),
        terminal_line_height_error(line_height),
        terminal_letter_spacing_error(letter_spacing),
    ):
        if problem is not None:
            return error(400, error=problem)

    settings = UiSettings(
        side_panel=bool(data.get("side_panel", current.side_panel)),
        theme=theme,
        side_panel_url=url,
        terminal_font_size=font_size,
        terminal_font_family=font_family.strip() if font_family is not None else None,
        terminal_line_height=line_height,
        terminal_letter_spacing=letter_spacing,
    )
    save_ui_settings(settings)
    # The editor reads its theme from the shared settings file, which running instances watch, so
    # this recolours any open editor panel without a reload.
    apply_theme(settings.theme)
    return Response(content=settings.to_json())
