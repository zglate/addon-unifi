#!/usr/bin/env python3
"""Extract release notes for a UniFi Network Application version from the
Ubiquiti Community RSS feed and emit clean markdown.

Usage: release_notes.py <version> [--full]
"""
import re
import sys
import urllib.request
from html.parser import HTMLParser

FEED_URL = (
    "https://community.ui.com/rss/releases/UniFi-Network-Controller/"
    "e6712595-81bb-4829-8e42-9e2630fabcfe"
)


def fetch_feed() -> str:
    req = urllib.request.Request(FEED_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def find_item(feed: str, version: str) -> tuple[str, str, str | None] | None:
    """Return (title, description_html, link) for the given version."""
    for m in re.finditer(r"<item>(.*?)</item>", feed, re.DOTALL):
        item = m.group(1)
        title_match = re.search(
            r"<title><!\[CDATA\[(UniFi Network Application "
            + re.escape(version)
            + r")\]\]></title>",
            item,
        )
        if not title_match:
            continue
        desc_match = re.search(
            r"<description><!\[CDATA\[(.*?)\]\]></description>", item, re.DOTALL
        )
        link_match = re.search(r"<link>([^<]+)</link>", item)
        if not desc_match:
            return None
        return (
            title_match.group(1),
            desc_match.group(1),
            link_match.group(1) if link_match else None,
        )
    return None


class _MarkdownConverter(HTMLParser):
    """Walk the parsed HTML tree and emit markdown via a frame stack.

    Every structural tag (block or inline) opens a frame; on close, the
    frame's content is rendered with the appropriate wrapper. Frames whose
    content is empty after stripping produce nothing, so spacer markup like
    ``<strong>&nbsp;</strong>`` or stray empty paragraphs vanish on their
    own without explicit cleanup passes.
    """

    BLOCK_TAGS = {"h2", "h3", "p", "li"}
    INLINE_TAGS = {"strong", "b", "em", "i", "code", "a"}
    SKIP_TAGS = {"pre", "script", "style"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._frames: list[tuple[str, list[str], dict]] = []
        self._skip_depth = 0
        self._top: list[str] = []

    def _emit(self, text: str) -> None:
        if self._skip_depth:
            return
        if self._frames:
            self._frames[-1][1].append(text)
        else:
            self._top.append(text)

    def _wrap(self, tag: str, content: str, attrs: dict) -> str:
        cls = attrs.get("class", "")
        indent = "  " if "ql-indent-1" in cls else ""
        if tag == "h2":
            return f"\n\n## {content}\n\n"
        if tag == "h3":
            return f"\n\n### {content}\n\n"
        if tag == "p":
            return f"\n\n{content}\n"
        if tag == "li":
            return f"\n{indent}- {content}"
        if tag in ("strong", "b"):
            return f"**{content}**"
        if tag in ("em", "i"):
            return f"_{content}_"
        if tag == "code":
            return f"`{content}`"
        if tag == "a":
            href = attrs.get("href", "")
            return f"[{content}]({href})" if href else content
        return content

    def handle_starttag(self, tag: str, attrs_list) -> None:
        attrs = dict(attrs_list)
        if tag in self.SKIP_TAGS:
            self._skip_depth += 1
            return
        if tag in self.BLOCK_TAGS or tag in self.INLINE_TAGS:
            self._frames.append((tag, [], attrs))
            return
        if tag == "br":
            self._emit("\n")
            return
        if tag in ("ul", "ol"):
            self._emit("\n")
            return

    def handle_endtag(self, tag: str) -> None:
        if tag in self.SKIP_TAGS:
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        # Pop matching frame even if intermediate frames are still open
        # (defensive against malformed source).
        for i in range(len(self._frames) - 1, -1, -1):
            if self._frames[i][0] == tag:
                # Close any inner frames first by treating their content as raw.
                while len(self._frames) > i + 1:
                    inner_tag, inner_buf, inner_attrs = self._frames.pop()
                    inner_content = "".join(inner_buf).strip()
                    if inner_content:
                        wrapped = self._wrap(inner_tag, inner_content, inner_attrs)
                        self._frames[-1][1].append(wrapped)
                close_tag, buf, attrs = self._frames.pop()
                content = "".join(buf).strip()
                if not content:
                    return
                wrapped = self._wrap(close_tag, content, attrs)
                self._emit(wrapped)
                return
        # No matching frame; ignore.
        if tag in ("ul", "ol"):
            self._emit("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        # Non-breaking spaces (from &nbsp;) become regular spaces.
        self._emit(data.replace("\xa0", " "))

    def render(self) -> str:
        # Anything left in the stack means malformed source: flush it.
        while self._frames:
            tag, buf, attrs = self._frames.pop()
            content = "".join(buf).strip()
            if content:
                self._top.append(self._wrap(tag, content, attrs))
        text = "".join(self._top)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = "\n".join(line.rstrip() for line in text.splitlines())
        return text.strip()


def html_to_markdown(html_str: str) -> str:
    # Drop the trailing "Additional information" boilerplate the feed appends:
    # it's marketing text (UniFi OS Server promotion, package compatibility
    # notes), not changes worth surfacing in a per-version changelog.
    html_str = re.sub(
        r"<h2>\s*Additional information\s*</h2>.*",
        "",
        html_str,
        flags=re.DOTALL,
    )
    p = _MarkdownConverter()
    p.feed(html_str)
    p.close()
    return p.render()


def summarize(md: str) -> str:
    """Keep the Overview section (highlights), append counts of the rest."""
    sections: dict[str, str] = {}
    current: str | None = None
    buf: list[str] = []
    for line in md.splitlines():
        m = re.match(r"^## (.+)$", line)
        if m:
            if current is not None:
                sections[current] = "\n".join(buf).strip()
            current = m.group(1).strip()
            buf = []
        else:
            buf.append(line)
    if current is not None:
        sections[current] = "\n".join(buf).strip()

    overview = sections.get("Overview")
    if not overview:
        # Some entries have no Overview heading; use everything before the
        # first heading as the lead.
        lead_match = re.match(r"\A(.*?)(?=^## )", md, flags=re.DOTALL | re.MULTILINE)
        if lead_match:
            overview = lead_match.group(1).strip()

    out: list[str] = []
    if overview:
        out.append(overview)

    singular = {"Improvements": "improvement", "Bugfixes": "bugfix"}
    counts: list[str] = []
    for name in ("Improvements", "Bugfixes"):
        body = sections.get(name)
        if body:
            n = sum(1 for line in body.splitlines() if line.lstrip().startswith("-"))
            if n:
                word = singular[name] if n == 1 else name.lower()
                counts.append(f"{n} {word}")
    if counts:
        out.append(f"_{' and '.join(counts)}; see release notes for the full list._")

    return "\n\n".join(out).strip()


def main() -> int:
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <version> [--full]", file=sys.stderr)
        return 2
    version = sys.argv[1]
    full = "--full" in sys.argv[2:]

    feed = fetch_feed()
    item = find_item(feed, version)
    if item is None:
        print(f"No entry found for version {version}", file=sys.stderr)
        return 1
    title, desc_html, url = item
    md = html_to_markdown(desc_html)

    print(f"# {title}\n")
    print(md if full else summarize(md))
    if url:
        print(f"\n[Full release notes]({url})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
