# Python Loops

## §1 The for loop

A `for` loop repeats a block of code once for each item in a sequence, binding the current item to a variable each time around: `for score in scores: print(score)` runs the body once per score. Python's `for` loop iterates directly over the items of a list, string, tuple, dictionary, or any other iterable—there is no manual index counter to manage. This item-by-item style is the normal way to process a collection in Python and is both readable and hard to get wrong.

## §2 range for counting

When you need to repeat something a fixed number of times, or you need actual index numbers, you loop over `range()`. `range(5)` produces the numbers `0, 1, 2, 3, 4`—it starts at `0` and stops before the given number. `range(2, 6)` produces `2, 3, 4, 5`, and `range(0, 10, 2)` counts in steps of two. Because `range` stops before its end value, `range(len(items))` produces exactly the valid indices of a sequence, though looping over the items directly is usually cleaner.

## §3 The while loop

A `while` loop repeats its body as long as a condition remains `True`, checking the condition before each pass: `while balance > 0:` keeps looping until the balance is used up. Use a `while` loop when you do not know in advance how many iterations are needed—waiting for user input or for a condition to change. The danger is the infinite loop: if nothing inside the body ever makes the condition false, the loop never ends, so every `while` needs something that moves it toward stopping.

## §4 break and continue

Two statements alter a loop's flow. `break` exits the loop immediately, skipping any remaining items, which is how you stop searching once you have found what you wanted. `continue` skips the rest of the current iteration and jumps straight to the next one, which is how you ignore items that do not qualify. Both apply only to the innermost loop that contains them. Used sparingly they clarify intent; overused, they can make a loop's flow hard to trace.

## §5 Looping with an index using enumerate

When you genuinely need both the position and the item, the idiomatic tool is `enumerate`, not a manual counter: `for index, item in enumerate(items):` gives you `0, first_item`, then `1, second_item`, and so on. This is cleaner and less error-prone than incrementing your own variable or indexing with `range(len(items))`. You can start the count elsewhere with `enumerate(items, start=1)` when you want human-friendly numbering that begins at one.

## §6 The loop else and common pitfalls

A `for` or `while` loop may have an `else` block, which runs only if the loop finished normally without hitting a `break`—useful for "searched everything and found nothing" logic. A frequent pitfall is modifying a list while looping over it, which can skip items or raise errors; iterate over a copy, or build a new list instead. Another is the off-by-one error, usually traced back to forgetting that `range` and slicing both exclude their stop value.

## §7 Summary

A `for` loop runs once per item in an iterable and is the normal way to process a collection, while `range()` supplies counting numbers that stop before the end value. A `while` loop repeats as long as its condition holds and must contain something that eventually makes it false. `break` leaves a loop early and `continue` skips to the next iteration, `enumerate` supplies index and item together, and you should avoid changing a collection while iterating over it.
