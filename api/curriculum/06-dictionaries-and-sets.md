# Python Dictionaries and Sets

## §1 What a dictionary is

A dictionary is a collection that maps keys to values, written with curly braces and colons, such as `ages = {"alice": 30, "bob": 25}`. Instead of looking items up by numeric position as a list does, you look them up by key, so `ages["alice"]` returns `30`. This makes a dictionary the right tool whenever data is naturally a set of labelled facts rather than an ordered line of items. Since Python 3.7 dictionaries keep keys in the order they were inserted.

## §2 Keys must be unique and hashable

Each key in a dictionary appears at most once; assigning to an existing key replaces its value rather than adding a duplicate, so `ages["bob"] = 26` updates Bob's entry. Keys must be hashable, which in practice means immutable, so strings, numbers, and tuples can be keys but lists cannot. Values have no such restriction and can be anything, including lists or other dictionaries. This uniqueness of keys is what lets a dictionary answer "what is the value for this key" quickly and unambiguously.

## §3 Reading values safely

Accessing a missing key with square brackets, like `ages["carol"]`, raises a `KeyError`. To avoid crashing, use the `.get()` method, which returns `None` for a missing key, or a default you supply: `ages.get("carol", 0)` returns `0` when Carol is absent. To check whether a key exists before using it, use the `in` operator, as in `if "alice" in ages`. Note that `in` tests keys, not values, which is a common point of confusion.

## §4 Adding, updating, and removing

You add or update an entry simply by assigning to a key: `ages["dave"] = 40` creates the entry if the key is new and overwrites it if the key exists. You remove an entry with `del ages["bob"]` or with `ages.pop("bob")`, which also returns the removed value. Because these operations mutate the dictionary in place, a dictionary is a living structure you build up and change over the life of a program, much like a list.

## §5 Iterating over a dictionary

Looping directly over a dictionary yields its keys, so `for name in ages:` visits each key. To visit values use `for age in ages.values():`, and to visit both together use `for name, age in ages.items():`, which unpacks each key–value pair. The `.items()` form is the idiomatic way to process every entry, because it gives you the key and the value at once without a second lookup. This pattern appears constantly in real Python code.

## §6 Sets

A set is an unordered collection of unique values, written with curly braces like `{1, 2, 3}` or built with `set()`. Its defining feature is that duplicates are automatically discarded, so `set([1, 1, 2])` is `{1, 2}`, which makes a set the fastest way to remove duplicates from a list. Membership testing with `in` is very fast on a set. Sets also support mathematical operations: `a | b` is the union, `a & b` is the intersection, and `a - b` is the difference.

## §7 Summary

A dictionary maps unique, hashable keys to values and is looked up by key rather than position, with `.get()` providing safe access and `.items()` the idiomatic way to loop over pairs. Assigning to a key adds or updates it, and `del` or `.pop()` removes it. A set is an unordered collection of unique values, ideal for deduplication and fast membership tests, and it supports union, intersection, and difference. Both use curly braces, but a dictionary stores key–value pairs while a set stores single values.
