# Python Strings

## §1 What a string is

A string is an ordered sequence of characters used to represent text, written between single or double quotes, such as `'hello'` or `"world"`. The two quote styles are interchangeable; you usually pick the one that avoids escaping, so `"it's fine"` needs no backslash. For text that spans several lines you use triple quotes, `"""..."""`. A string, like a number, is one value even though it contains many characters, and it can be stored in a variable and passed around like any other value.

## §2 Strings are immutable

A string cannot be changed after it is created; it is immutable. Operations that appear to modify a string, such as `name.upper()`, do not alter the original—they build and return a brand-new string, leaving the original untouched. This is why `text.replace("a", "b")` has no effect unless you assign the result to something, as in `text = text.replace("a", "b")`. Understanding that string methods return new strings, rather than editing in place, prevents a whole category of beginner bugs.

## §3 Indexing and slicing

Each character in a string has a position, called an index, starting at `0` for the first character, so in `"python"` the expression `word[0]` is `"p"`. Negative indices count from the end, so `word[-1]` is `"n"`. Slicing extracts a substring with `word[start:stop]`, which includes `start` but excludes `stop`, so `word[0:3]` is `"pyt"`. Omitting a bound means "to the edge," so `word[:3]` is the first three characters and `word[3:]` is the rest.

## §4 Concatenation and repetition

You join strings with `+`, so `"foot" + "ball"` is `"football"`, and you repeat a string with `*`, so `"ab" * 3` is `"ababab"`. Both operands of `+` must be strings; writing `"age: " + 30` raises a `TypeError` because you cannot add a number to text. To include a number in a string you must first convert it, for example `"age: " + str(30)`. Building long text by repeated `+` in a loop is inefficient; joining a list of pieces with `"".join(parts)` is the idiomatic and faster approach.

## §5 f-strings for formatting

The clearest way to build a string from values is an f-string: a string prefixed with `f` in which expressions inside curly braces are evaluated and inserted. `f"Hello, {name}!"` inserts the value of `name`, and any expression works, as in `f"Total: {price * quantity}"`. f-strings also support formatting after a colon, so `f"{ratio:.2f}"` shows two decimal places. Because f-strings put the values right where they appear in the text, they are far more readable than gluing pieces together with `+`.

## §6 Common string methods

Strings carry many built-in methods for everyday text work. `len(text)` gives the number of characters; `.strip()` removes leading and trailing whitespace; `.lower()` and `.upper()` change case; `.split(",")` breaks text into a list on a separator; and `.replace(old, new)` substitutes text. You test content with the `in` operator, as in `"@" in email`, and with `.startswith(...)` and `.endswith(...)`. Every one of these methods returns a new value rather than modifying the original string, consistent with immutability.

## §7 Summary

A string is an ordered, immutable sequence of characters written in quotes. You reach characters by zero-based index and extract substrings by slicing with a stop that is excluded. Join text with `+` and repeat it with `*`, but convert numbers to strings first, and prefer f-strings for readable formatting. String methods such as `strip`, `lower`, `split`, and `replace` always return new strings, so you must assign their results to keep them.
