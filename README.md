# BiggsFrontend — local notes

POS fallback config
- `POS_LIST_FALLBACK_FILES`: JSON array of fallback filenames or full URLs used when the remote POS list is empty or unavailable.
- `POS_FILE_URL_TEMPLATE`: template used to construct full download URLs from filenames. Use `{filename}` as the placeholder.

Examples

```
POS_LIST_FALLBACK_FILES=["sample.csv"]
POS_FILE_URL_TEMPLATE=https://biggsph.com/pos_files/{filename}
```

Notes
- These values are read by the backend; set them in the backend `.env` (project root) or your deployment environment. The frontend's `.env.local` may remain focused on client-only values like `NEXT_PUBLIC_API_URL`.
