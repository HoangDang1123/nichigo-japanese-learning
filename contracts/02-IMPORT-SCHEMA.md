# Content Import Contracts — draft examples

## CSV vocabulary sample
```csv
external_id,level,term,reading,meaning_vi,source_id,license,status
vocab-001,N5,学生,がくせい,học sinh / sinh viên,original-team,original,draft
```

## JSON lesson sample
```json
{
  "schemaVersion": "1.0",
  "source": {"id": "original-team", "license": "original"},
  "lesson": {
    "externalId": "intro-hiragana-a",
    "slug": "hiragana-a-i-u-e-o",
    "titleVi": "Hiragana: あいうえお",
    "stage": "introductory",
    "level": "N5",
    "status": "draft",
    "objectiveVi": "Nhận diện và đọc được 5 ký tự đầu tiên",
    "items": [
      {"type": "kana", "externalId": "kana-a", "order": 1},
      {"type": "kana", "externalId": "kana-i", "order": 2}
    ]
  }
}
```

This is an **illustrative partial lesson**, not publish-ready complete content. Each referenced item must exist and have review/license metadata before publish.

## Validation
- Required stable IDs, supported schemaVersion, no duplicate item order/IDs, valid reference IDs.
- UTF-8 CSV, clear escaped commas/newlines, normalized Unicode and locale fields.
- `status=draft` by default; importing does not auto-publish.
- Validate provenance, license and reviewer status; no silent acceptance of unknown fields in strict mode.
- Dry-run report: `batchId`, total/valid/invalid counts, row-level errors, prospective insert/update counts.
- Import transaction boundaries documented; retries idempotent; audit operator, time and source.
