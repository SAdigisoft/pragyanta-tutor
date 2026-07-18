# Python Lists and Tuples

## §1 What lists and tuples are

In Python, both lists and tuples are sequences: ordered collections that hold multiple values in a single variable. You create a list with square brackets, such as `scores = [90, 85, 77]`, and a tuple with parentheses, such as `point = (3, 4)`. Both keep their items in order, both can be indexed with `scores[0]`, and both can be looped over with a `for` loop. Because they look so similar at first glance, many beginners assume they are interchangeable. They are not, and the difference matters in real programs.

## §2 The core difference: mutability

A list is mutable, meaning its contents can be changed after creation. A tuple is immutable, meaning its contents cannot be changed after creation. If you write `scores[0] = 95`, Python happily updates the list. If you write `point[0] = 5` on a tuple, Python raises a `TypeError`, because tuples do not support item assignment. This is not a limitation to work around—it is the entire purpose of a tuple. Immutability is a promise: once a tuple is created, its values are fixed for its whole lifetime.

A helpful way to picture it: a list is like a whiteboard, where you can erase and rewrite entries at any time; a tuple is like a printed page, where the content is fixed the moment it comes out of the printer. If you need the whiteboard, use a list. If you need the printed page, use a tuple.

## §3 When to use each

Use a list when the collection is expected to grow, shrink, or change: a shopping cart, a queue of tasks, scores being collected during a game. Lists provide methods like `append()`, `remove()`, and `sort()` precisely because change is their job.

Use a tuple when the values belong together and must never change: coordinates like `(3, 4)`, an RGB color like `(255, 128, 0)`, or a date of birth like `(1998, 7, 14)`. Choosing a tuple communicates intent to anyone reading the code: these values are a fixed unit. If a coordinate could be silently modified somewhere in a large program, bugs would be very hard to find; immutability makes that entire class of bug impossible.

## §4 Performance and memory

Tuples are slightly more memory-efficient than lists and slightly faster to create, because Python can allocate a fixed structure and does not need to reserve room for growth. For small programs the difference is negligible, but the guideline stands: when the data will not change, a tuple is the more efficient and more honest choice.

## §5 Tuple unpacking

Tuples support a convenient pattern called unpacking, where each value is assigned to its own variable in one step: `x, y = (3, 4)` gives `x` the value 3 and `y` the value 4. This is why Python functions that need to return multiple values typically return a tuple: `return width, height` actually returns the tuple `(width, height)`, which the caller can unpack directly. Lists can technically be unpacked too, but tuples are the idiomatic choice for fixed groups of values.

## §6 A deeper reason: hashability

Because tuples are immutable, they are hashable, which means a tuple can be used as a key in a dictionary or stored in a set. Lists cannot. If you want to map a grid coordinate to a value—for example `visited[(3, 4)] = True`—the key must be a tuple; using a list as a dictionary key raises a `TypeError: unhashable type`. The rule connecting the ideas: dictionary keys must never change, and only immutable values can make that guarantee. This is one of the clearest practical payoffs of immutability.

One subtlety for the curious: a tuple is only hashable if everything inside it is also immutable. A tuple containing a list, such as `([1, 2], 3)`, cannot be used as a dictionary key, because its list element could still change.

## §7 Converting between them

You can convert in both directions: `tuple([1, 2, 3])` produces `(1, 2, 3)`, and `list((1, 2, 3))` produces `[1, 2, 3]`. Conversion creates a new object; it does not change the original. A common pattern is to build data up in a list while it is changing, then convert it to a tuple once it is final, locking it against further modification.

## §8 Summary

Lists and tuples are both ordered sequences, and the difference between them is mutability. A list can be changed after creation and suits data that evolves. A tuple cannot be changed after creation and suits data that is fixed, communicating that intent to every reader of the code, enabling use as dictionary keys, and costing slightly less memory. Choosing correctly between them is not a style preference—it is a statement about how your data is allowed to behave.
