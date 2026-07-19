# Python Numbers and Arithmetic

## §1 Integers and floats

Python has two everyday number types: `int`, for whole numbers with no fractional part such as `-3`, `0`, and `1000`, and `float`, for numbers with a decimal point such as `3.14` and `-0.5`. Integers in Python have unlimited size and never overflow, so `2 ** 100` produces an exact, very large result. A float, by contrast, stores an approximation and has limited precision, which is why floats are the right choice for measurements and the wrong choice for exact counting.

## §2 The arithmetic operators

The basic operators are `+` for addition, `-` for subtraction, `*` for multiplication, and `**` for exponentiation, so `2 ** 3` is `8`. There are three ways to divide: `/` is true division and always produces a float, so `6 / 2` is `3.0`; `//` is floor division, which discards the fractional part, so `7 // 2` is `3`; and `%` is the modulo operator, which gives the remainder, so `7 % 2` is `1`. Remembering that `/` always yields a float is a frequent source of beginner surprise.

## §3 Operator precedence

Python evaluates arithmetic using the same precedence as ordinary mathematics: exponentiation first, then multiplication, division, and modulo, and finally addition and subtraction. This means `2 + 3 * 4` is `14`, not `20`, because `3 * 4` is computed before the addition. You override precedence with parentheses, so `(2 + 3) * 4` is `20`. When an expression is even slightly complex, adding parentheses makes the intended order explicit and prevents subtle bugs.

## §4 Modulo and floor division in practice

The modulo operator answers "what is left over" and is the standard tool for many everyday tasks. `n % 2 == 0` tests whether `n` is even, because an even number divided by two leaves no remainder. Floor division and modulo work together to break a value apart: `total_seconds // 60` gives whole minutes and `total_seconds % 60` gives the leftover seconds. These two operators appear constantly in real code for grouping, wrapping around, and cycling through positions.

## §5 Floating-point precision

Because floats are stored in binary, some decimal values cannot be represented exactly, which is why `0.1 + 0.2` prints as `0.30000000000000004` rather than `0.3`. This is not a bug in Python; it is a property of how computers store fractions. The practical consequence is that you should never compare floats with `==` for equality when they result from calculation. Instead, check that they are close enough, for example with `abs(a - b) < 1e-9`, or use exact decimal arithmetic when money is involved.

## §6 Useful number functions

Python provides built-in functions for common numeric work: `abs(-5)` gives `5`, `round(3.14159, 2)` gives `3.14`, `min(4, 9, 2)` gives `2`, and `max(4, 9, 2)` gives `9`. `round()` follows banker's rounding, rounding to the nearest even number on a tie, so `round(2.5)` is `2`. For richer mathematics such as square roots and trigonometry you import the `math` module and call functions like `math.sqrt(16)`, which returns `4.0`.

## §7 Summary

Python's two number types are `int` for exact whole numbers of unlimited size and `float` for approximate decimals. The operators `+ - * **` behave as expected, while `/` gives a float, `//` floors to a whole number, and `%` yields the remainder, all following standard precedence that parentheses can override. Floats are approximate, so compare them with a tolerance rather than `==`, and reach for built-ins like `abs`, `round`, `min`, and `max` or the `math` module for common numeric tasks.
