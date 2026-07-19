# Python Lists and Tuples

## §1 What lists and tuples are

In Python, both lists and tuples are sequences: ordered collections that hold multiple values in a single variable. You create a list with square brackets, such as `scores = [90, 85, 77]`, and a tuple with parentheses, such as `point = (3, 4)`. Both keep their items in order, both can be indexed with `scores[0]`, and both can be looped over with a `for` loop. Because they look so similar at first glance, many beginners assume they are interchangeable. They are not, and the difference matters in real programs.

## §2 The core difference: mutability

A list is mutable, meaning its contents can be changed after creation. A tuple is immutable, meaning its contents cannot be changed after creation. If you write `scores[0] = 95`, Python happily updates the list. If you write `point[0] = 5` on a tuple, Python raises a `TypeError`, because tuples do not support item assignment. This is not a limitation to work around—it is the entire purpose of a tuple. Immutability is a promise: once a tuple is created, its values are fixed for its whole lifetime.

A helpful way to picture it: a list is like a whiteboard, where you can erase and rewrite entries at any time; a tuple is like a printed page, where the content is fixed the moment it comes out of the printer. If you need the whiteboard, use a list. If you need the printed page, use a tuple.

## §3 When to use each

Use a list when the collection is expected to grow, shrink, or change: a shopping cart, a queue of tasks, scores being collected during a game. Lists provide methods like `append()`, `remove()`, and `sort()` precisely because change is their job. Use a tuple when the values belong together and must never change: coordinates like `(3, 4)`, an RGB color like `(255, 128, 0)`, or a date of birth like `(1998, 7, 14)`. Choosing a tuple communicates intent to anyone reading the code: these values are a fixed unit.

## §4 Indexing, slicing, and length

Both types share the sequence operations. Items are numbered from `0`, so `scores[0]` is the first item and `scores[-1]` is the last. Slicing extracts a range with a stop that is excluded, so `scores[0:2]` gives the first two items. `len(scores)` reports how many items there are, and the `in` operator tests membership, so `85 in scores` is `True` or `False`. These operations read from the sequence and, on their own, never change it.

## §5 Growing and changing a list

A list's defining power is that it can change. `scores.append(100)` adds one item to the end; `scores.insert(0, 50)` adds at a position; `scores.remove(77)` deletes the first matching value; and `scores.sort()` orders the items in place. A crucial subtlety is that methods like `append` and `sort` change the list and return `None`, so writing `scores = scores.sort()` is a bug that throws away your data. Call the method for its effect, and do not assign its result.

## §6 A deeper reason: hashability

Because tuples are immutable, they are hashable, which means a tuple can be used as a key in a dictionary or stored in a set. Lists cannot. If you want to map a grid coordinate to a value—for example `visited[(3, 4)] = True`—the key must be a tuple; using a list as a dictionary key raises a `TypeError: unhashable type`. The rule connecting the ideas: dictionary keys must never change, and only immutable values can make that guarantee. This is one of the clearest practical payoffs of immutability.

## §7 Summary

Lists and tuples are both ordered sequences, and the difference between them is mutability. A list can be changed after creation and suits data that evolves, offering methods like `append` and `sort` that modify it in place and return `None`. A tuple cannot be changed after creation, suits data that is fixed, communicates that intent to readers, and—because it is immutable—can serve as a dictionary key. Choosing correctly between them is a statement about how your data is allowed to behave.
