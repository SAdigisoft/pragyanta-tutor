# Python Classes and Objects

## §1 Classes and objects

A class is a blueprint that defines a new type by bundling data and the functions that operate on it. An object, or instance, is a concrete thing built from that blueprint, so `Dog` might be a class and `my_dog = Dog()` an object of it. The class describes what every dog has and can do; each object holds its own particular values. Classes let you model the things in your problem—accounts, orders, players—as first-class types rather than loose collections of variables.

## §2 The __init__ method and self

The `__init__` method is the initializer, run automatically when you create an object, and it sets up the object's starting data. Its first parameter, by convention `self`, refers to the specific object being created, so `self.name = name` stores a name on that object. You never pass `self` yourself—Python supplies it—so calling `Dog("Rex")` runs `__init__` with `self` bound to the new dog and `name` set to `"Rex"`. Every method that operates on an instance takes `self` as its first parameter.

## §3 Instance attributes and methods

Attributes are the data stored on an object, such as `self.name`, and you read them through the object with dot notation, as in `my_dog.name`. Methods are functions defined inside the class that act on the object, and they too receive `self` so they can use and change the object's attributes: `def bark(self): print(self.name, "says woof")`. Calling `my_dog.bark()` automatically passes `my_dog` as `self`. Attributes hold the state; methods define the behavior that uses and updates that state.

## §4 Class attributes versus instance attributes

An attribute assigned directly in the class body, outside any method, is a class attribute shared by every instance, whereas one assigned through `self` is unique to each object. A class attribute is useful for a value common to all instances, such as `species = "Canis familiaris"`. The distinction matters: changing an instance attribute affects only that object, while changing a class attribute affects all instances that have not overridden it. Mutable class attributes are a common source of surprising shared-state bugs.

## §5 Dunder methods

Methods whose names begin and end with double underscores—called dunder or special methods—let your objects work with Python's built-in syntax. Defining `__str__` controls what `print(obj)` shows, `__repr__` gives an unambiguous developer-facing string, and `__eq__` defines what `==` means for your type. Because Python calls these methods behind familiar operators and functions, implementing them makes your objects feel like native types rather than opaque containers, which is part of what makes Python's object model so expressive.

## §6 Inheritance

Inheritance lets a class build on another, reusing and extending its behavior. Writing `class Puppy(Dog):` makes `Puppy` a subclass that automatically has everything `Dog` defines, and it can add new methods or override existing ones. A subclass calls the parent's version with `super()`, so `super().__init__(name)` runs the parent initializer before adding subclass-specific setup. Inheritance models an "is-a" relationship; when two classes merely share some data, composition—holding one object inside another—is often the cleaner design.

## §7 Summary

A class defines a new type by bundling data and behavior, and an object is a specific instance of it. The `__init__` method initializes each new object, `self` refers to the current instance, and every method takes `self` to reach the object's attributes. Attributes on `self` are per-object while attributes in the class body are shared, dunder methods like `__str__` and `__eq__` integrate objects with Python's syntax, and inheritance with `super()` lets one class extend another to model an "is-a" relationship.
