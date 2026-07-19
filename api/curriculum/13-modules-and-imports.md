# Python Modules and Imports

## §1 What a module is

A module is simply a Python file containing definitions—functions, classes, and variables—that other files can reuse. Splitting a program across modules keeps each file focused and lets you share code between projects. The standard library ships hundreds of ready-made modules, such as `math`, `random`, `json`, and `datetime`, so a great deal of common work is already written and tested for you. Importing a module is how you bring that code into the file you are writing.

## §2 The import statement

The basic form `import math` makes the whole module available under its name, and you then reach its contents through the dot, as in `math.sqrt(16)`. This form keeps the origin of every name visible, so a reader can see that `sqrt` came from `math`. You can rename a module on import with `as`, as in `import numpy as np`, which is standard for libraries with long names. Importing runs the module's top-level code once and caches it, so repeated imports do not re-execute it.

## §3 from-import

The form `from math import sqrt` pulls a specific name directly into your file so you can call `sqrt(16)` without the module prefix. This is convenient for names you use often, but it hides where the name came from and can cause collisions if two modules export the same name. Importing several names is fine, but `from math import *`, which imports everything, is discouraged because it floods your namespace with unknown names and makes the code hard to read and debug.

## §4 How Python finds modules

When you import a name, Python searches a list of locations: the directory of the running script first, then installed packages, then the standard library. A frequent beginner trap is naming your own file the same as a standard module—for example creating `random.py`—which causes your file to shadow the real one and produces confusing errors. Keeping your filenames distinct from standard modules avoids this whole class of problem.

## §5 Packages

A package is a directory of modules, letting you organize a larger project into a tree, such as `myapp/utils/text.py`. You import from within a package using dotted paths, as in `from myapp.utils import text`. Historically a package needed an `__init__.py` file to mark the directory, which may be empty or may expose selected names. Packages let a project grow from a single file into an organized structure without every module living in one folder.

## §6 The __name__ guard

Every module has a built-in variable `__name__`. When a file is run directly, its `__name__` is the string `"__main__"`; when it is imported, `__name__` is the module's own name instead. This is why the common idiom `if __name__ == "__main__":` guards code that should run only when the file is executed as a script, not when it is imported. Placing your program's entry point under this guard lets the same file serve both as a reusable module and as a runnable script.

## §7 Summary

A module is a Python file of reusable definitions, and the standard library provides many ready to import. `import math` brings in the whole module for prefixed access, `from math import sqrt` brings in a specific name directly, and `import ... as` renames it, while `from module import *` is best avoided. Python searches the script directory first, so avoid naming files after standard modules; packages are directories of modules; and `if __name__ == "__main__":` runs code only when the file is executed directly rather than imported.
