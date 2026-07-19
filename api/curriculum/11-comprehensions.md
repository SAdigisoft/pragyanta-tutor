# Python Comprehensions

## §1 What a list comprehension is

A list comprehension is a compact way to build a new list from an existing iterable in a single expression. The form is `[expression for item in iterable]`, so `[n * n for n in range(5)]` produces `[0, 1, 4, 9, 16]`. It replaces the common three-line pattern of creating an empty list, looping, and appending, expressing the same intent as one readable line. A comprehension always produces a new list and never modifies the source it iterates over.

## §2 Filtering with a condition

You can add an `if` clause to keep only some items: `[n for n in numbers if n > 0]` builds a list of just the positive numbers. The condition is a filter—items for which it is `False` are simply left out of the result. This combines naturally with the expression part, so `[n * n for n in numbers if n % 2 == 0]` squares only the even numbers. Reading such a comprehension left to right tells you what is collected and under what condition.

## §3 Keep them simple

The virtue of a comprehension is readability, so it is worth keeping simple. Stacking multiple `for` clauses and conditions into one comprehension quickly becomes dense and hard to follow, at which point an ordinary loop is the better choice. A conditional expression may appear in the value position, as in `["even" if n % 2 == 0 else "odd" for n in numbers]`, but if a comprehension no longer fits comfortably on one line and reads clearly, prefer a plain loop.

## §4 Dictionary and set comprehensions

The same syntax builds dictionaries and sets. A dictionary comprehension uses key–value pairs: `{name: len(name) for name in names}` maps each name to its length. A set comprehension uses the collection form and produces unique values: `{n % 3 for n in numbers}`. Both support the same optional `if` filter as a list comprehension. Choosing the right brackets—square for a list, curly with a colon for a dictionary, curly without for a set—selects which kind of collection you build.

## §5 Generator expressions

Replacing the square brackets with parentheses creates a generator expression, as in `(n * n for n in range(1000000))`. Unlike a list comprehension, it does not build the whole result in memory at once; it produces each value on demand as you iterate. This is far more memory-efficient for large or infinite sequences, and it works seamlessly with functions that consume an iterable, so `sum(n * n for n in range(100))` never materializes the full list. Use a generator when you only need to pass through the values once.

## §6 When a loop is better

Comprehensions are for building a collection from a transformation and a filter—that is their whole job. If your goal is to cause side effects, such as printing each item or writing to a file, a plain `for` loop is the correct and clearer tool; a comprehension built only for its side effects wastes memory on a list you discard. Likewise, when the logic needs several steps, intermediate variables, or exception handling, a loop expresses it more honestly than a strained one-liner.

## §7 Summary

A comprehension builds a new collection from an iterable in one expression: `[expr for item in iterable if condition]` for a list, with curly-brace variants for dictionaries and sets. It replaces the create-empty-loop-append pattern and always produces a new collection. A generator expression, written with parentheses, yields values lazily and saves memory for large sequences. Keep comprehensions simple and reach for an ordinary loop when the logic is complex or the goal is a side effect rather than a collection.
