# Python Errors and Exceptions

## §1 Syntax errors versus exceptions

There are two broad kinds of problems in Python. A syntax error means the code is not valid Python and cannot run at all—a missing colon or unbalanced bracket—and Python reports it before execution begins. An exception is a different thing: the code is valid and starts running, but something goes wrong partway through, such as dividing by zero. Syntax errors are fixed by correcting the text; exceptions are handled while the program runs, which is what this lesson is about.

## §2 What an exception is

When an operation cannot be completed, Python raises an exception: it stops the normal flow and looks for code prepared to deal with the problem. If nothing handles it, the program crashes and prints a traceback showing where the error happened. Each exception has a type that describes the problem—`ValueError`, `TypeError`, `KeyError`, `ZeroDivisionError`, `FileNotFoundError`—and reading that type is the first step in diagnosing any failure. An exception is an event, not a return value.

## §3 Catching exceptions with try and except

You handle an exception by wrapping the risky code in a `try` block and providing an `except` block for the failure: `try: value = int(text) except ValueError: value = 0`. If the `try` body raises the named exception, Python jumps to the matching `except` and continues from there instead of crashing. This lets a program recover gracefully—retrying, using a default, or reporting the problem clearly—rather than stopping at the first bad input.

## §4 Catch specific exceptions

Always catch the narrowest exception type that fits the problem. A bare `except:` or `except Exception:` swallows every error, including ones you did not anticipate and bugs you would rather see, which hides problems and makes debugging painful. Catching `except ValueError:` specifically means you handle only the failure you actually expect and let unrelated errors surface normally. You can handle several types with separate `except` clauses, each addressing one kind of failure appropriately.

## §5 else and finally

A `try` statement can include two more blocks. An `else` block runs only if the `try` body succeeded without raising, which keeps the success path separate from the risky line. A `finally` block runs no matter what—whether an exception occurred or not—and is the right place for cleanup that must always happen, such as closing a file or releasing a resource. Because `finally` always executes, it guarantees that important cleanup is not skipped when an error interrupts the normal flow.

## §6 Raising exceptions and EAFP

Your own code can signal a problem by raising an exception with `raise`, as in `raise ValueError("age cannot be negative")`, which is how a function rejects invalid input clearly instead of returning a misleading value. Python favors a style called EAFP—"easier to ask forgiveness than permission"—where you attempt the operation and catch the exception if it fails, rather than checking every precondition first. Catching a specific exception is often cleaner and less race-prone than a thicket of defensive `if` checks.

## §7 Summary

A syntax error stops code from running at all, while an exception is a runtime event raised when a valid program hits a problem, each carrying a type such as `ValueError` or `KeyError`. You handle exceptions by pairing a `try` block with an `except` that catches a specific type, add an `else` for the success path and a `finally` for cleanup that must always run, and use `raise` to signal problems from your own code. Catch narrowly, and prefer attempting an operation and handling failure over checking every condition in advance.
