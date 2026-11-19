"""Regenerate isolated JPN-033 technical pilot package and synthetic stroke bytes."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).parent
PACKAGE = ROOT / "package"
ASSETS = ROOT / "stroke-fixtures"
PACKAGE.mkdir(exist_ok=True)
ASSETS.mkdir(exist_ok=True)

# Stroke outlines and arrows below are schematic transport fixtures, not reviewed writing guidance.
SPECS = [
    ("yama", "山", "U+5C71", "núi", [
        ("yama", "山", "やま", "núi", "山が見えます。", "Tôi nhìn thấy núi.", [("山", "やま"), ("が", None), ("見", "み"), ("えます。", None)]),
        ("kazan", "火山", "かざん", "núi lửa", "火山があります。", "Có núi lửa.", [("火山", "かざん"), ("があります。", None)]),
    ], ["M 420 210 L 420 760", "M 250 410 L 250 760", "M 250 760 L 760 760 L 760 410"]),
    ("kawa", "川", "U+5DDD", "sông", [
        ("kawa", "川", "かわ", "sông", "川が流れています。", "Dòng sông đang chảy.", [("川", "かわ"), ("が", None), ("流", "なが"), ("れています。", None)]),
        ("ogawa", "小川", "おがわ", "suối nhỏ", "小川が流れています。", "Con suối nhỏ đang chảy.", [("小川", "おがわ"), ("が", None), ("流", "なが"), ("れています。", None)]),
    ], ["M 280 270 L 280 760", "M 500 220 L 500 790", "M 730 260 L 730 750"]),
    ("hito", "人", "U+4EBA", "người", [
        ("hito", "人", "ひと", "người", "人がいます。", "Có người.", [("人", "ひと"), ("がいます。", None)]),
        ("nihonjin", "日本人", "にほんじん", "người Nhật", "日本人です。", "Là người Nhật.", [("日本人", "にほんじん"), ("です。", None)]),
    ], ["M 510 210 L 280 790", "M 510 210 L 770 790"]),
]

rights, media, items = [], [], []


def add_rights(key):
    rights.append([key, "original", "NichiGo JPN-033 technical pilot", "NichiGo pilot author",
                   "Self-authored technical fixture; production clearance not granted"])


def add_item(key, kind, payload, media_refs=None):
    rights_key = "rights-" + key
    add_rights(rights_key)
    items.append([key, kind, json.dumps(payload, ensure_ascii=False, separators=(",", ":")), rights_key,
                  json.dumps(media_refs, ensure_ascii=False, separators=(",", ":")) if media_refs else ""])


for slug, glyph, codepoint, meaning, words, paths in SPECS:
    kanji_key = "pilot-kanji-" + slug
    media_key = "pilot-stroke-" + slug
    strokes = [{"order": index, "outline": [path], "numberAt": {"x": 70 + index * 80, "y": 70},
                "arrow": {"from": {"x": 140 + index * 80, "y": 120},
                          "to": {"x": 190 + index * 80, "y": 120}}}
               for index, path in enumerate(paths, 1)]
    asset = {"assetVersion": 1, "glyph": glyph, "codepoint": codepoint,
             "viewBox": {"width": 1024, "height": 1024},
             "strokeCount": len(strokes), "strokes": strokes}
    asset_bytes = (json.dumps(asset, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    (ASSETS / f"{slug}.json").write_bytes(asset_bytes)
    media_rights = "rights-" + media_key
    add_rights(media_rights)
    media.append([media_key, "writing", f"pilot/{media_key}.json", hashlib.sha256(asset_bytes).hexdigest(),
                  "application/json", media_rights])
    vocabulary_keys = []
    for word_slug, surface, reading, gloss, sentence, translation, segments in words:
        vocabulary_key = "pilot-vocab-" + word_slug
        example_key = "pilot-example-" + word_slug
        vocabulary_keys.append(vocabulary_key)
        add_item(example_key, "example", {"textJa": sentence, "translationVi": translation,
                 "itemRefs": [vocabulary_key], "segments": [
                     {"text": text, **({"reading": ruby} if ruby else {})} for text, ruby in segments],
                 "kanjiDetailCandidate": "yes"})
        add_item(vocabulary_key, "vocabulary", {"surface": surface, "reading": reading,
                 "glossVi": gloss, "exampleRefs": [example_key]})
    add_item(kanji_key, "kanji", {"glyph": glyph, "meaningVi": meaning,
             "relatedVocabularyRefs": vocabulary_keys},
             [{"position": 1, "role": "stroke-order", "mediaKey": media_key}])

manifest = {"schemaVersion": "1.1", "packageKey": "jpn-033-kanji-content-pilot",
            "packageVersion": "1.0.0", "locale": "vi",
            "author": "NichiGo technical pilot; editorial and Rights review pending",
            "files": [{"path": name, "type": kind} for name, kind in
                      [("rights.csv", "rights"), ("media.csv", "media"), ("items.csv", "items")]]}
(PACKAGE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
for name, header, rows in [
    ("rights.csv", ["key", "originKind", "sourceLabel", "attribution", "permissionBasis"], rights),
    ("media.csv", ["key", "kind", "storageKey", "checksumSha256", "mimeType", "rightsKey"], media),
    ("items.csv", ["key", "kind", "payload", "rightsKey", "mediaRefs"], items),
]:
    with (PACKAGE / name).open("w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file, lineterminator="\n")
        writer.writerow(header)
        writer.writerows(rows)
