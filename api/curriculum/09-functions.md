# Python Functions

## §1 Defining and calling a function

A function is a named, reusable block of code that performs one task. You define it with `def`, a name, parentheses for parameters, and a colon, then indent the body: `def greet(name): print("Hi", name)`. Defining a function does not run it; the body runs only when you call the function by name with parentheses, as in `greet("Sam")`. Functions let you write a piece of logic once and reuse it everywhere, which is the single most important tool for keeping programs organized.

## §2 Parameters and arguments

A parameter is the name listed in the definition; an argument is the actual value you pass when calling. You can pass arguments by position, matching them left to right, or by keyword, naming them explicitly as in `greet(name="Sam")`, which makes a call self-documenting. Positional arguments must come before keyword arguments in a call. Matching the number and meaning of arguments to the parameters is the contract between the function and its callers.

## §3 Return values

A function sends a result back to its caller with the `return` statement, and that value replaces the call in the surrounding expression, so `total = add(2, 3)` stores the returned value in `total`. A function without a `return`, or with a bare `return`, produces the special value `None`. `return` also ends the function immediately, so any code after it does not run. The distinction between printing a value and returning it is crucial: `print` only shows text, while `return` hands data back so the rest of the program can use it.

## §4 Default parameter values

You can give a parameter a default value in the definition, as in `def greet(name, greeting="Hello"):`, so callers may omit that argument and accept the default. This makes functions flexible without forcing every caller to supply every detail. One important rule: never use a mutable value such as a list or dictionary as a default, because that single default object is shared across all calls and accumulates changes. The safe pattern is to default to `None` and create a fresh list inside the function.

## §5 Scope

Variables created inside a function are local: they exist only while the function runs and are invisible outside it. A function can read variables from the enclosing module (global scope), but assigning to a name inside a function creates a new local variable rather than changing the global one. This isolation is a feature—it means a function's internal names cannot accidentally clobber names elsewhere. Passing data in through parameters and out through `return` is far cleaner than relying on global variables.

## §6 Docstrings and single responsibility

A string written as the first line of a function body is its docstring, documenting what the function does, and tools and the built-in `help()` can display it. A well-designed function does one clearly named thing, takes what it needs as parameters, and returns its result rather than printing it or touching global state. Small, single-purpose functions are easier to name, test, and reuse, and they turn a long script into a set of readable building blocks.

## §7 Summary

A function is defined with `def` and runs only when called; parameters name the inputs and arguments supply them, by position or by keyword. `return` hands a value back and ends the function, and a missing return yields `None`, which is different from printing. Default parameter values add flexibility but must never be mutable objects, variables inside a function are local to it, and small single-responsibility functions with docstrings keep programs readable and reusable.
