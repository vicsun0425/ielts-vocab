#!/usr/bin/env python3
"""Generate a PDF with embedded audio attachments using PyMuPDF.

Reads JSON from stdin, writes PDF to stdout.
"""
import fitz
import json
import sys
import os

# Colors
BLACK = (0, 0, 0)
DARK = (0.25, 0.25, 0.25)
GRAY = (0.5, 0.5, 0.5)
LIGHT_GRAY = (0.7, 0.7, 0.7)
BLUE = (0.15, 0.35, 0.75)
BLUE_BG = (0.82, 0.88, 1.0)
GREEN_BG = (0.85, 0.95, 0.85)

# Layout
PAGE_W = 595  # A4
PAGE_H = 842
MARGIN = 72
CARD_X = MARGIN
CARD_Y = 80
CARD_W = PAGE_W - 2 * MARGIN
CARD_H = PAGE_H - CARD_Y - MARGIN
LINE_H = 22


def draw_page_title(page, y, text, size=28, color=BLACK):
    page.insert_text((CARD_X, y), text, fontsize=size, color=color, fontname="helv")
    return y + size + 4


def draw_text(page, x, y, text, size=12, color=BLACK, bold=False, font="helv"):
    fname = "hebo" if bold else font
    page.insert_text((x, y), text, fontsize=size, color=color, fontname=fname)
    return y + LINE_H


CJK_FONT = "/System/Library/Fonts/STHeiti Medium.ttc"
HAS_CJK = os.path.exists(CJK_FONT)

def create_pdf(data):
    words = data.get("words", [])
    title = data.get("title", "IELTS Vocabulary")

    doc = fitz.open()

    # === Title page ===
    page = doc.new_page(width=PAGE_W, height=PAGE_H)
    y = 200
    y = draw_page_title(page, y, "IELTS Vocabulary", size=32, color=BLACK)
    y += 10
    draw_text(page, CARD_X, y, title, size=16, color=GRAY)
    y += 30
    draw_text(page, CARD_X, y, f"{len(words)} words", size=18, color=BLUE, bold=True)
    y += 30
    draw_text(page, CARD_X, y, "Click the speaker icon to hear pronunciation.", size=12, color=GRAY)
    y += 20
    draw_text(page, CARD_X, y, "Generated from IELTS Vocabulary Tool", size=10, color=LIGHT_GRAY)

    # === Word pages ===
    for idx, w in enumerate(words):
        page = doc.new_page(width=PAGE_W, height=PAGE_H)
        y = CARD_Y

        # Number badge
        badge_rect = fitz.Rect(CARD_X, y - 14, CARD_X + 30, y + 6)
        page.draw_rect(badge_rect, color=None, fill=BLUE_BG)
        page.insert_text((CARD_X + 8, y + 2), str(idx + 1), fontsize=12, color=BLUE, fontname="hebo")

        # Word name
        word_x = CARD_X + 40
        y_word = y + 2
        page.insert_text((word_x, y_word), w["word"], fontsize=22, color=BLACK, fontname="hebo")

        # POS tag
        pos = w.get("pos", "")
        if pos:
            pos_x = word_x + fitz.get_text_length(w["word"], fontname="hebo", fontsize=22) + 10
            page.insert_text((pos_x, y_word - 2), pos, fontsize=11, color=GRAY, fontname="helv")

        # Speaker icon + audio attachment
        audio_file = w.get("audioFile", "")
        speaker_x = PAGE_W - MARGIN - 50
        # Draw speaker icon (simple circle + triangle)
        icon_cx = speaker_x + 12
        icon_cy = y_word - 4
        page.draw_circle((icon_cx, icon_cy), 10, color=BLUE, fill=None)
        # Triangle inside
        tri = fitz.Point(icon_cx - 3, icon_cy - 5), fitz.Point(icon_cx - 3, icon_cy + 5), fitz.Point(icon_cx + 5, icon_cy)
        page.draw_polyline(tri, color=BLUE, fill=BLUE)

        if audio_file and os.path.exists(audio_file):
            with open(audio_file, "rb") as f:
                audio_bytes = f.read()
            # Add file attachment annotation at the speaker icon position
            page.add_file_annot((icon_cx, icon_cy), audio_bytes, f"{w['word']}.m4a")

        y = y_word + 20

        # Phonetic
        phonetic = w.get("phoneticUk") or w.get("phonetic", "")
        if phonetic:
            page.insert_text((word_x, y), phonetic, fontsize=13, color=GRAY, fontname="helv")
            y += LINE_H + 4

        # Definition
        definition = w.get("definition", "")
        if definition:
            y = draw_text(page, word_x, y, definition, size=14, color=DARK)

        # Chinese definition
        def_zh = w.get("definitionZh", "")
        if def_zh:
            page.insert_text((word_x, y), def_zh, fontsize=13, color=BLUE,
                           fontfile=CJK_FONT if HAS_CJK else None)
            y += LINE_H + 6

        # Example sentence
        example = w.get("example", "")
        if example:
            y += 4
            # Draw left border line
            line_rect = fitz.Rect(word_x - 6, y - 14, word_x - 4, y + 30)
            page.draw_rect(line_rect, color=LIGHT_GRAY, fill=None)
            page.insert_text((word_x, y), f'"{example}"', fontsize=12, color=GRAY, fontname="helv")
            y += LINE_H + 20

    return doc.tobytes()


def main():
    raw = sys.stdin.read()
    data = json.loads(raw)
    pdf_bytes = create_pdf(data)
    sys.stdout.buffer.write(pdf_bytes)


if __name__ == "__main__":
    main()
