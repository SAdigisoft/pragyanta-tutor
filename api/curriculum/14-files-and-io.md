# Python Files and Input/Output

## §1 Opening a file

To work with a file on disk you first open it with the built-in `open(path, mode)`, which returns a file object you read from or write to. The mode string states your intent: `"r"` reads an existing file, `"w"` writes a new file or truncates an existing one, and `"a"` appends to the end without erasing what is there. Choosing the mode carefully matters because `"w"` silently discards the entire previous contents of the file the moment it opens.

## §2 The with statement

The right way to open a file is inside a `with` block: `with open("data.txt") as f:`. The `with` statement guarantees that the file is closed automatically when the block ends, even if an exception is raised inside it, so you never leak an open file handle. Forgetting to close files—or having an error skip the close—can lose data that is still buffered and unwritten. Using `with` makes correct cleanup automatic, which is why it is the standard idiom for file handling.

## §3 Reading a file

Once a file is open for reading you have several options. `f.read()` returns the entire contents as one string, `f.readlines()` returns a list of lines, and iterating with `for line in f:` yields one line at a time. The line-by-line loop is the memory-friendly choice for large files, because it never loads the whole file at once. Lines read this way keep their trailing newline character, so `line.strip()` is commonly used to remove it before processing.

## §4 Writing a file

Opening in `"w"` or `"a"` mode lets you write with `f.write(text)`, which—unlike `print`—does not add a newline, so you include `"\n"` yourself where you want line breaks. `f.write` expects a string, so numbers and other values must be converted first, for example with an f-string. Remember that `"w"` starts from an empty file while `"a"` preserves and extends the existing contents; picking the wrong one is a common way to accidentally destroy a file's data.

## §5 Text versus binary and encoding

By default files open in text mode and Python decodes bytes into strings using a character encoding, which you should state explicitly as `encoding="utf-8"` to avoid platform-dependent surprises. For non-text data such as images, you open in binary mode with a `"b"` in the mode, like `"rb"` or `"wb"`, and read and write raw `bytes` rather than `str`. Mismatched encodings are a frequent cause of garbled text or a `UnicodeDecodeError`, so being explicit about `utf-8` prevents a whole class of bugs.

## §6 Paths and structured formats

File paths differ across operating systems, so the modern approach uses `pathlib.Path`, which joins paths safely with the `/` operator, as in `Path("data") / "scores.txt"`, and offers helpers like `.exists()` and `.read_text()`. For structured data, prefer a dedicated format over ad-hoc parsing: the `json` module turns Python dictionaries and lists into text with `json.dump` and back with `json.load`, and the `csv` module handles tabular data. These libraries handle the tricky edge cases of quoting and escaping for you.

## §7 Summary

You access a file with `open(path, mode)`, choosing `"r"` to read, `"w"` to overwrite, or `"a"` to append, and you should always use a `with` block so the file closes automatically even on error. Read a whole file with `.read()` or line by line by iterating, and write with `f.write`, which adds no newline of its own. Specify `encoding="utf-8"` for text, use binary mode for non-text data, and reach for `pathlib`, `json`, and `csv` to handle paths and structured formats safely.
