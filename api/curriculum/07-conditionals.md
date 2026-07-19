# Python Conditionals

## §1 The if statement

A conditional lets a program choose whether to run a block of code based on a condition. The `if` statement evaluates a boolean expression and runs its indented body only when that expression is `True`, as in `if temperature > 30: print("hot")`. The colon ends the condition, and the indented lines beneath it form the body. If the condition is `False`, the body is skipped entirely and the program continues after it.

## §2 else and elif

An `else` block gives an alternative to run when the `if` condition is `False`, so exactly one of the two blocks always runs. When there are more than two possibilities, `elif` (short for "else if") chains additional conditions: Python checks each in order and runs the body of the first one that is `True`, skipping all the rest. A final `else` catches every remaining case. Because only the first matching branch runs, the order of the conditions matters.

## §3 Indentation defines blocks

Unlike many languages that use braces, Python uses indentation to decide which lines belong to a block. Every line in the body of an `if` must be indented by the same amount, conventionally four spaces. Mixing tabs and spaces, or indenting inconsistently, raises an `IndentationError`. This rule is not decoration—indentation is the actual syntax, so the shape of the code on the page is the same as its logical structure, which is part of why Python reads so cleanly.

## §4 Comparisons and combined conditions

The condition in an `if` is any expression that produces a boolean, so comparison operators and the logical operators `and`, `or`, and `not` all appear here. `if age >= 18 and has_ticket:` runs its body only when both parts are true. Because Python treats empty containers and `0` as falsy, you can also write conditions on truthiness directly, such as `if errors:` to mean "if there are any errors." Clear conditions make the branching logic easy to follow.

## §5 Nested and guard-style conditionals

An `if` can appear inside another `if`, called nesting, to express decisions that depend on earlier decisions. Deep nesting quickly becomes hard to read, so a common improvement is the guard clause: handle the exceptional case early and return, leaving the main logic un-indented. For example, checking `if not user: return` at the top of a function removes one level of nesting from everything that follows. Flatter conditional code is generally easier to reason about and to maintain.

## §6 The conditional expression

For the simple case of choosing between two values, Python offers a one-line conditional expression, sometimes called the ternary operator: `status = "adult" if age >= 18 else "minor"`. It reads in plain English—the value before `if` is used when the condition is true, otherwise the value after `else`. This is meant for short value selection, not for running blocks of statements; when logic grows beyond choosing a value, a full `if`/`else` statement is clearer.

## §7 Summary

Conditionals let a program branch: `if` runs a block when its condition is true, `elif` adds ordered alternatives, and `else` catches the rest, with only the first matching branch executing. Blocks are defined by consistent indentation rather than braces, and conditions are boolean expressions that can combine comparisons with `and`, `or`, and `not` or rely on truthiness. Guard clauses keep deeply nested logic flat, and the one-line `value if condition else other` expression handles simple two-way value selection.
