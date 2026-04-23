#!/usr/bin/env python3
"""Generate a PDF with embedded audio attachments using PyMuPDF.

Reads JSON from stdin, writes PDF to stdout.

Layout: 3 word cards per page with speaker icons that link to embedded audio.
Chinese text uses embedded CJK font.
"""
import fitz
import json
import sys
import os

# Colors
BLACK = (0, 0, 0)
DARK = (0.2, 0.2, 0.2)
GRAY = (0.5, 0.5, 0.5)
LIGHT_GRAY = (0.85, 0.85, 0.85)
VERY_LIGHT_GRAY = (0.96, 0.96, 0.97)
BLUE = (0.15, 0.35, 0.75)
BLUE_BG = (0.85, 0.9, 0.97)
BLUE_BORDER = (0.7, 0.8, 0.95)
EXAMPLE_BORDER = (0.85, 0.85, 0.9)
BORDER = (0.9, 0.9, 0.9)

# Layout
PAGE_W = 595  # A4
PAGE_H = 842
MARGIN = 60
CARD_PAD = 16          # inner padding of card
CARD_MARGIN = 12       # gap between cards
CARD_W = PAGE_W - 2 * MARGIN
HEADER_H = 50          # height for card header (word + phonetic)
DEFINITION_H = 28      # definition line
ZH_H = 22              # Chinese line
EXAMPLE_H = 36         # example block
SPEAKER_SIZE = 24      # speaker icon size
CARD_MIN_H = HEADER_H + DEFINITION_H + ZH_H + EXAMPLE_H + 2 * CARD_PAD

CJK_FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"
HAS_CJK = os.path.exists(CJK_FONT)


def card_height(w):
    """Calculate the height needed for a word card."""
    h = HEADER_H + 2 * CARD_PAD  # word + phonetic
    if w.get("definition"):
        h += DEFINITION_H
    if w.get("definitionZh"):
        h += ZH_H
    if w.get("example"):
        h += EXAMPLE_H
    return max(h, CARD_MIN_H)


def draw_card(page, x, y, h, idx, w):
    """Draw a single word card with audio attachment."""
    # Card background and border
    card_rect = fitz.Rect(x, y, x + CARD_W, y + h)
    page.draw_rect(card_rect, color=BORDER, fill=VERY_LIGHT_GRAY)

    cx = x + CARD_PAD
    content_x = cx + 30  # after number badge
    cy = y + CARD_PAD

    # Number badge
    badge_rect = fitz.Rect(cx, cy, cx + 26, cy + 22)
    page.draw_rect(badge_rect, color=None, fill=BLUE_BG)
    page.insert_text((cx + 8, cy + 16), str(idx + 1), fontsize=11, color=BLUE, fontname="hebo")

    # Word name (bold)
    page.insert_text((content_x, cy + 18), w["word"], fontsize=20, color=BLACK, fontname="hebo")

    # POS tag
    pos = w.get("pos", "")
    if pos:
        pos_x = content_x + fitz.get_text_length(w["word"], fontname="hebo", fontsize=20) + 8
        page.insert_text((pos_x, cy + 14), pos, fontsize=10, color=GRAY, fontname="helv")

    # Speaker icon + audio attachment on the right side
    audio_file = w.get("audioFile", "")
    icon_x = x + CARD_W - MARGIN + 10  # right side of card
    icon_y = cy + 6

    # Draw speaker icon (circle + triangle, larger and more visible)
    page.draw_circle((icon_x, icon_y + SPEAKER_SIZE // 2), SPEAKER_SIZE // 2, color=BLUE, width=1.5)
    # Play triangle
    tx = icon_x - 4
    ty = icon_y + SPEAKER_SIZE // 2
    tri = [
        (tx - 2, ty - 5),
        (tx - 2, ty + 5),
        (tx + 5, ty),
    ]
    page.draw_polyline(tri, color=BLUE, fill=BLUE, width=0.5)

    # Add hint text below icon
    page.insert_text((icon_x - 12, icon_y + SPEAKER_SIZE + 10), "double-click", fontsize=7, color=GRAY, fontname="helv")

    # Embed audio file attachment
    if audio_file and os.path.exists(audio_file):
        with open(audio_file, "rb") as f:
            audio_bytes = f.read()
        page.add_file_annot((icon_x, icon_y + SPEAKER_SIZE // 2), audio_bytes, f"{w['word']}.m4a")

    cy += 30

    # Phonetic
    phonetic = w.get("phoneticUk") or w.get("phonetic", "")
    if phonetic:
        page.insert_text((content_x, cy), phonetic, fontsize=12, color=GRAY, fontname="helv")
        cy += 18

    # Definition
    definition = w.get("definition", "")
    if definition:
        page.insert_text((content_x, cy), definition, fontsize=13, color=DARK, fontname="helv")
        cy += 16

    # Chinese definition
    def_zh = w.get("definitionZh", "")
    if def_zh and HAS_CJK:
        page.insert_text((content_x, cy), def_zh, fontsize=13, color=BLUE, fontname="cjk", fontfile=CJK_FONT)
        cy += 16

    # Example sentence
    example = w.get("example", "")
    if example:
        # Left border line
        line_rect = fitz.Rect(content_x - 5, cy - 2, content_x - 3, cy + 22)
        page.draw_rect(line_rect, color=None, fill=EXAMPLE_BORDER)
        page.insert_text((content_x, cy), f'"{example}"', fontsize=11, color=GRAY, fontname="helv")


def create_pdf(data):
    words = data.get("words", [])
    title = data.get("title", "IELTS Vocabulary")

    doc = fitz.open()

    # === Title page ===
    page = doc.new_page(width=PAGE_W, height=PAGE_H)
    y = 250
    page.insert_text((MARGIN, y), "IELTS Vocabulary", fontsize=36, color=BLACK, fontname="hebo")
    y += 40
    page.insert_text((MARGIN, y), title, fontsize=16, color=GRAY, fontname="helv")
    y += 30
    page.insert_text((MARGIN, y), f"{len(words)} words", fontsize=20, color=BLUE, fontname="hebo")
    y += 30
    page.insert_text((MARGIN, y), "Double-click the speaker icon to hear pronunciation.", fontsize=12, color=GRAY, fontname="helv")
    y += 20
    page.insert_text((MARGIN, y), "Audio is embedded — works offline.", fontsize=12, color=GRAY, fontname="helv")
    y += 40
    page.insert_text((MARGIN, y), "Generated from IELTS Vocabulary Tool", fontsize=10, color=LIGHT_GRAY, fontname="helv")

    # === Word cards — 3 per page ===
    y = MARGIN
    for idx, w in enumerate(words):
        h = card_height(w)

        # If card doesn't fit on current page, start new page
        if y + h > PAGE_H - MARGIN and idx > 0:
            page = doc.new_page(width=PAGE_W, height=PAGE_H)
            y = MARGIN

        # If first word and page is empty, add a mini header
        if y == MARGIN and idx > 0:
            y += 10

        draw_card(page, MARGIN, y, h, idx, w)
        y += h + CARD_MARGIN

    return doc.tobytes()


def main():
    raw = sys.stdin.read()
    data = json.loads(raw)
    pdf_bytes = create_pdf(data)
    sys.stdout.buffer.write(pdf_bytes)


if __name__ == "__main__":
    main()
