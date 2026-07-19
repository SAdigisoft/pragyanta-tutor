# Python Variables and Types

## §1 What a variable is

A variable is a name that refers to a value stored in memory. You create one with the assignment operator `=`, writing the name on the left and the value on the right, such as `age = 21`. After that line runs, the name `age` refers to the integer `21`, and you can use `age` anywhere you would use the number itself. A variable is not a box that holds a value; it is a label attached to a value. Assigning again, like `age = 22`, simply moves the label to a new value.

## §2 Names and assignment rules

A variable name may contain letters, digits, and underscores, but it may not begin with a digit, and it may not be a Python keyword such as `if` or `for`. Names are case-sensitive, so `total` and `Total` are two different variables. The convention in Python is `snake_case`: lowercase words joined by underscores, such as `first_name`. A clear name like `student_count` communicates intent far better than a vague name like `x`, and readable names are one of the cheapest ways to make a program easier to maintain.

## §3 The core built-in types

Every value in Python has a type, and the four most common beginner types are `int` for whole numbers like `10`, `float` for decimal numbers like `3.14`, `str` for text like `"hello"`, and `bool` for the truth values `True` and `False`. You can ask any value its type with the built-in function `type(value)`, for example `type(3.14)` returns `<class 'float'>`. Knowing a value's type matters because the type decides what operations are allowed: you can subtract two integers, but subtracting two strings raises a `TypeError`.

## §4 Dynamic typing

Python is dynamically typed, which means a variable does not have a fixed type; the type belongs to the value, not the name. The same name can refer to an integer on one line and a string on the next: `x = 5` then `x = "five"` is perfectly legal. This is flexible, but it places responsibility on the programmer to keep track of what a variable currently holds. Dynamic typing is why a `TypeError` is discovered when the program runs, not before.

## §5 Converting between types

You convert a value from one type to another by calling the type as a function, a process called casting. `int("42")` produces the integer `42`, `str(42)` produces the text `"42"`, and `float("3.5")` produces `3.5`. Conversion creates a new value and never changes the original. A very common real task is converting text typed by a user, which always arrives as a `str`, into a number with `int()` or `float()` before doing arithmetic, because `"2" + "3"` joins text into `"23"` while `2 + 3` adds numbers into `5`.

## §6 None, the absence of a value

Python has a special value `None` that represents "no value" or "nothing here yet." It is its own type, `NoneType`, and it is not the same as `0`, an empty string, or `False`. A common use is a variable that will be filled in later: `result = None` marks the slot as intentionally empty. To test for it, use `if result is None`, using the `is` operator rather than `==`, because there is only ever one `None` object in a running program.

## §7 Summary

A variable is a name bound to a value, created with `=`. Every value has a type—commonly `int`, `float`, `str`, or `bool`—and `type()` reveals it. Python is dynamically typed, so the type travels with the value and can change as names are reassigned. Casting functions like `int()` and `str()` convert between types by making new values, and `None` marks the deliberate absence of a value.
