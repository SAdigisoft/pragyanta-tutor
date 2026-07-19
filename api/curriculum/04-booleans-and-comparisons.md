# Python Booleans and Comparisons

## §1 The boolean type

A boolean is a value that is either `True` or `False`, and it is the type Python uses to represent the outcome of a yes-or-no question. Both words are capitalized and are keywords, not strings. Booleans are the foundation of every decision a program makes: an `if` statement runs its body only when a boolean is `True`. Internally `True` behaves like `1` and `False` like `0`, so `True + True` is `2`, though relying on that is rarely good style.

## §2 Comparison operators

Comparisons ask how two values relate and always produce a boolean. The operators are `==` for equal, `!=` for not equal, `<` and `>` for less-than and greater-than, and `<=` and `>=` for the "or equal" versions. A frequent beginner mistake is confusing `=`, which assigns a value, with `==`, which compares two values; `x = 5` stores `5` in `x`, while `x == 5` asks whether `x` already equals `5`. Comparisons work on numbers, strings, and many other types, comparing strings in dictionary order.

## §3 Combining conditions with and, or, not

You build compound conditions with the logical operators `and`, `or`, and `not`. `a and b` is `True` only when both sides are true; `a or b` is `True` when at least one side is true; and `not a` flips a boolean to its opposite. These read almost like English, so `age >= 13 and age <= 19` tests the teenage range. Python also allows chained comparisons, so the same test can be written more naturally as `13 <= age <= 19`.

## §4 Truthiness

Every value in Python can be treated as a boolean when used in a condition, a property called truthiness. Most values are truthy, but a specific set is falsy: `False`, `None`, the number `0`, and every empty container—`""`, `[]`, `{}`, and `()`. This lets you write `if items:` to mean "if the list is not empty" instead of the longer `if len(items) > 0:`. Knowing the falsy values is important, because `if count:` is `False` when `count` is `0`, which is sometimes exactly what you want and sometimes a bug.

## §5 Short-circuit evaluation

The operators `and` and `or` stop evaluating as soon as the answer is known, a behavior called short-circuiting. In `a and b`, if `a` is falsy the whole expression is already false, so `b` is never evaluated; in `a or b`, if `a` is truthy the result is already true, so `b` is skipped. This is not just an optimization—it is a safety tool. Writing `if data and data[0] == 1:` is safe because the second test is skipped when `data` is empty, avoiding an error on `data[0]`.

## §6 Identity versus equality

Two different questions can be asked about values. Equality, tested with `==`, asks whether two values are considered equal; identity, tested with `is`, asks whether two names refer to the exact same object in memory. For ordinary comparisons you almost always want `==`. The `is` operator is reserved for comparing against the singletons `None`, `True`, and `False`, so the correct check for absence is `if value is None`, never `if value == None`.

## §7 Summary

Booleans are the `True`/`False` values that drive every decision, produced by comparison operators such as `==`, `!=`, `<`, and `>=` and combined with `and`, `or`, and `not`. Take care to use `==` for comparison and `=` for assignment. Every value has a truthiness, with `False`, `None`, `0`, and empty containers being falsy, and `and`/`or` short-circuit to avoid unnecessary or unsafe evaluation. Use `==` to compare values and reserve `is` for identity checks against `None`.
